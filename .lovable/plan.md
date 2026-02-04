
# Integrasi Payment Gateway Otomatis (Tokopay QRIS)

## Ringkasan

Menambahkan opsi pembayaran otomatis menggunakan Tokopay QRIS sebagai alternatif dari pembayaran manual (transfer bank + upload bukti). Integrasi ini memungkinkan verifikasi pembayaran real-time melalui webhook dan auto-delivery kode redeem.

---

## Analisa Dokumentasi Tokopay QRIS

Berdasarkan dokumentasi Tokopay (https://docs.tokopay.id/persiapan-awal/metode-pembayaran), berikut adalah detail teknis untuk integrasi QRIS:

### API Endpoints
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `https://api.tokopay.id/v1/order` | GET | Membuat transaksi QRIS baru |
| `https://api.tokopay.id/v1/order/check` | GET | Cek status pembayaran |
| Callback URL (konfigurasi dashboard) | POST | Webhook notifikasi pembayaran |

### Parameter Create Order (QRIS)
```text
merchant    = MERCHANT_ID
secret      = SECRET_KEY  
ref_id      = Order ID (unique reference)
nominal     = Jumlah pembayaran (Rupiah)
metode      = QRIS
```

### Response Success
```json
{
  "status": "Success",
  "data": {
    "trx_id": "TPY123456789",
    "ref_id": "ORDER-001",
    "qr_link": "https://api.tokopay.id/qrcode/...",
    "qr_string": "00020101021126...",
    "pay_url": "https://order.tokopay.id/...",
    "nominal": 50000,
    "expired_time": "2024-01-15 12:00:00"
  }
}
```

### Callback Webhook Data
```json
{
  "status": "Paid",
  "trx_id": "TPY123456789",
  "ref_id": "ORDER-001",
  "amount": 50000,
  "signature": "md5(MERCHANT_ID:SECRET:ref_id)"
}
```

---

## Kondisi Sistem Saat Ini

### Alur Pembayaran Manual (Existing)
```text
Customer → Pilih Produk → Create Order → Upload Bukti Transfer 
→ Admin Verifikasi Manual → Assign Redeem Code → Customer Terima Kode
```

### Komponen yang Terlibat
- `src/pages/Store.tsx` - Halaman toko & checkout
- `src/components/OrderConfirmationDialog.tsx` - Dialog konfirmasi order
- `src/components/OrderCard.tsx` - Card order di halaman transaksi
- `src/pages/Transactions.tsx` - Halaman transaksi customer
- `src/components/BusinessRulesEditor.tsx` - Pengaturan admin
- `src/pages/Admin.tsx` - Dashboard admin
- Tabel `orders` - payment_status: pending/verified/rejected

---

## Arsitektur Solusi

### A. Perubahan Database Schema

```sql
-- Tambah kolom pada tabel orders
ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'manual';
ALTER TABLE orders ADD COLUMN gateway_trx_id text;
ALTER TABLE orders ADD COLUMN payment_url text;
ALTER TABLE orders ADD COLUMN qr_link text;
ALTER TABLE orders ADD COLUMN gateway_expired_at timestamptz;

-- Tambah key untuk konfigurasi payment gateway di business_rules
INSERT INTO business_rules (key, value, description) VALUES 
('payment_gateway', '{
  "enabled": false,
  "provider": "tokopay",
  "merchant_id": "",
  "qris_enabled": true,
  "auto_delivery": true
}', 'Payment gateway configuration');
```

### B. Secrets Management (Edge Function)
- `TOKOPAY_MERCHANT_ID` - Merchant ID dari Tokopay
- `TOKOPAY_SECRET_KEY` - Secret Key untuk generate signature

### C. Edge Functions Baru

#### 1. `create-tokopay-payment/index.ts`
```text
Fungsi:
- Menerima order_id dan amount dari frontend
- Generate signature MD5(MERCHANT_ID:SECRET:ref_id)
- Hit API Tokopay create order QRIS
- Update tabel orders dengan gateway_trx_id, qr_link, payment_url
- Return QR code data ke frontend

Security:
- Validasi JWT token
- Validasi order milik user
- Validasi order masih pending
```

#### 2. `tokopay-callback/index.ts`
```text
Fungsi:
- Terima webhook dari Tokopay
- Validasi signature dari Tokopay
- Jika status = "Paid":
  - Update orders.payment_status = 'verified'
  - Update orders.status = 'active'
  - Auto-assign redeem codes dari inventory (jika tersedia)
  - Kurangi stock produk
  - Kirim email notifikasi

Security:
- Validasi signature MD5
- Endpoint public (tanpa JWT) karena dipanggil Tokopay
```

#### 3. `check-payment-status/index.ts`
```text
Fungsi:
- Polling manual untuk cek status pembayaran
- Digunakan jika webhook gagal
- Hit API Tokopay check status
```

---

## Flow Pembayaran QRIS (Baru)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER CHECKOUT FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Customer pilih produk & klik "Buy Now"                         │
│                        ▼                                            │
│  2. Dialog konfirmasi muncul dengan 2 opsi:                        │
│     ┌─────────────────┐  ┌─────────────────┐                       │
│     │  Bank Transfer  │  │   QRIS (Auto)   │                       │
│     │    (Manual)     │  │   ✓ Instant     │                       │
│     └─────────────────┘  └─────────────────┘                       │
│                                                                     │
│  ══════════════ JIKA PILIH QRIS ══════════════                     │
│                        ▼                                            │
│  3. Frontend call Edge Function "create-tokopay-payment"           │
│                        ▼                                            │
│  4. Edge Function → API Tokopay → Return QR Code                   │
│                        ▼                                            │
│  5. Tampilkan QR Code di dialog (gambar + pay_url)                 │
│     - Customer scan QR dengan e-wallet                              │
│     - Timer countdown expiry                                        │
│                        ▼                                            │
│  6. Customer bayar via e-wallet                                     │
│                        ▼                                            │
│  7. Tokopay kirim webhook ke "tokopay-callback"                    │
│                        ▼                                            │
│  8. Webhook handler:                                                │
│     - Validasi signature                                            │
│     - Update payment_status = 'verified'                           │
│     - Auto-assign redeem codes                                      │
│     - Kirim email notifikasi                                        │
│                        ▼                                            │
│  9. Customer refresh halaman → Lihat kode redeem                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementasi Detail

### 1. Perubahan UI - Checkout Flow

**File: `src/components/OrderConfirmationDialog.tsx`**

Tambahkan:
- Radio button pilihan metode pembayaran (Manual / QRIS)
- State `paymentMethod` dan `isCreatingPayment`
- Jika QRIS dipilih, tampilkan loading → QR Code
- Timer countdown untuk expiry QRIS
- Tombol "Sudah Bayar? Cek Status"

**File: `src/pages/Store.tsx`**

Update `handleConfirmOrder`:
- Terima parameter payment_method
- Jika QRIS: panggil edge function, simpan QR data ke state
- Jika Manual: flow existing (create order → redirect transaksi)

### 2. Perubahan UI - Transaction Page

**File: `src/components/OrderCard.tsx`**

Tambahkan:
- Deteksi `payment_method === 'qris'` dan `payment_status === 'pending'`
- Tampilkan tombol "Bayar Sekarang" → Modal QR Code
- Tampilkan status "Menunggu Pembayaran QRIS"
- Tombol "Cek Status Pembayaran"

### 3. Pengaturan Admin

**File: `src/components/BusinessRulesEditor.tsx`**

Tambahkan tab baru "Payment Gateway":
```text
┌─────────────────────────────────────────────────────────┐
│  Payment Gateway Settings                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Enable Payment Gateway    [Toggle Switch]              │
│                                                         │
│  Provider                                               │
│  ┌──────────────────────────────────────┐              │
│  │ Tokopay                           ▼ │              │
│  └──────────────────────────────────────┘              │
│                                                         │
│  Merchant ID                                            │
│  ┌──────────────────────────────────────┐              │
│  │ M12345                               │              │
│  └──────────────────────────────────────┘              │
│  ⚠️ Secret Key dikelola via Secrets                    │
│                                                         │
│  Methods                                                │
│  ☑ QRIS                                                │
│                                                         │
│  Auto Delivery                                          │
│  ☑ Kirim kode otomatis setelah pembayaran             │
│                                                         │
│  [Save Payment Gateway Settings]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. Edge Functions

**File: `supabase/functions/create-tokopay-payment/index.ts`**

```typescript
// Pseudocode structure
- Validate JWT & get user
- Fetch order by ID, validate ownership & pending status
- Fetch payment_gateway settings from business_rules
- Generate signature: MD5(MERCHANT_ID:SECRET:order_id)
- Call Tokopay API: GET /v1/order?merchant=...&secret=...
- Parse response, extract qr_link, pay_url, trx_id
- Update orders table with gateway data
- Return QR data to frontend
```

**File: `supabase/functions/tokopay-callback/index.ts`**

```typescript
// Pseudocode structure
- Parse POST body from Tokopay
- Validate signature: MD5(MERCHANT_ID:SECRET:ref_id)
- If status === "Paid":
  - Fetch order by ref_id
  - Update payment_status = 'verified', status = 'active'
  - If auto_delivery enabled:
    - Fetch available codes from redeem_code_inventory
    - Assign to order, mark codes as used
    - Reduce product stock
  - Call send-notification function
- Return success response
```

### 5. Hook & State Management

**File: `src/hooks/usePaymentGateway.ts` (Baru)**

```typescript
export const usePaymentGateway = () => {
  // Fetch payment gateway settings
  // Check if QRIS enabled
  // Create payment function
  // Check payment status function
}
```

---

## File yang Akan Dimodifikasi/Dibuat

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/components/OrderConfirmationDialog.tsx` | Modify | Tambah pilihan metode pembayaran & QR display |
| `src/components/OrderCard.tsx` | Modify | Tampilkan status QRIS & tombol bayar |
| `src/pages/Store.tsx` | Modify | Handle payment method selection |
| `src/components/BusinessRulesEditor.tsx` | Modify | Tambah tab Payment Gateway settings |
| `src/hooks/useBusinessRules.ts` | Modify | Tambah interface payment_gateway |
| `src/hooks/usePaymentGateway.ts` | Create | Hook untuk payment gateway operations |
| `src/components/QRPaymentDialog.tsx` | Create | Modal tampilan QR Code + timer |
| `supabase/functions/create-tokopay-payment/index.ts` | Create | Edge function create payment |
| `supabase/functions/tokopay-callback/index.ts` | Create | Webhook handler |
| `supabase/functions/check-payment-status/index.ts` | Create | Manual status check |
| Database migration | Create | Tambah kolom payment gateway di orders |

---

## Langkah Implementasi

### Phase 1: Database & Backend Setup
1. Buat migration untuk kolom baru di tabel `orders`
2. Tambah konfigurasi `payment_gateway` di `business_rules`
3. Request secrets `TOKOPAY_MERCHANT_ID` dan `TOKOPAY_SECRET_KEY`
4. Buat edge function `create-tokopay-payment`
5. Buat edge function `tokopay-callback`

### Phase 2: Admin Settings
6. Update `BusinessRulesEditor.tsx` dengan tab Payment Gateway
7. Update `useBusinessRules.ts` untuk include payment_gateway config

### Phase 3: Customer UI
8. Buat komponen `QRPaymentDialog.tsx`
9. Update `OrderConfirmationDialog.tsx` dengan pilihan metode
10. Update `Store.tsx` untuk handle payment method
11. Update `OrderCard.tsx` untuk tampilan QRIS pending
12. Buat hook `usePaymentGateway.ts`

### Phase 4: Testing & Polish
13. Test end-to-end flow dengan sandbox Tokopay
14. Handle edge cases (expired, failed, duplicate callback)
15. Add proper error messages & loading states

---

## Keamanan

1. **Secret Key tidak pernah diexpose ke frontend** - Semua operasi yang membutuhkan secret key dilakukan di Edge Function
2. **Signature Validation** - Setiap callback dari Tokopay divalidasi dengan MD5 signature
3. **Order Ownership Validation** - User hanya bisa create payment untuk order miliknya sendiri
4. **Idempotency** - Callback handler mencegah duplicate processing
5. **RLS Policies** - Kolom baru mengikuti RLS existing pada tabel orders

---

## Catatan Penting

1. **Webhook URL**: Setelah deploy, admin perlu mengkonfigurasi callback URL di dashboard Tokopay:
   ```
   https://jstzgqmqwcjtffefwcxj.supabase.co/functions/v1/tokopay-callback
   ```

2. **Testing Mode**: Tokopay menyediakan sandbox environment untuk testing sebelum go-live

3. **Backward Compatibility**: Sistem pembayaran manual tetap berfungsi, QRIS adalah opsi tambahan

4. **Auto-Delivery**: Jika inventory kosong saat pembayaran verified, order tetap verified tapi redeem_codes kosong (admin perlu assign manual)
