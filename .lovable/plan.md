
# Implementasi Sistem Voucher/Diskon - Canggih & Lengkap

## Overview

Membangun sistem voucher dan potongan harga yang canggih dengan fitur-fitur modern seperti:
- Multiple discount types (percentage, fixed, free shipping)
- Usage limits & validity periods
- Product/category targeting
- Stacking rules
- Real-time analytics & tracking
- Full admin control panel

---

## 1. Database Schema

### Tabel: `vouchers`

```text
┌────────────────────────────────────────────────────────────────────────┐
│  VOUCHERS TABLE                                                         │
├─────────────────────┬───────────────────────┬──────────────────────────┤
│ Column              │ Type                  │ Description              │
├─────────────────────┼───────────────────────┼──────────────────────────┤
│ id                  │ uuid (PK)             │ Primary key              │
│ code                │ text (unique)         │ Voucher code (SAVE20)    │
│ name                │ text                  │ Display name             │
│ description         │ text                  │ Admin notes              │
│ discount_type       │ text                  │ 'percentage' / 'fixed'   │
│ discount_value      │ numeric               │ Amount (20 = 20% or Rp)  │
│ min_order_amount    │ numeric               │ Minimum order to apply   │
│ max_discount_amount │ numeric               │ Cap for % discounts      │
│ usage_limit         │ integer               │ Total uses allowed       │
│ usage_count         │ integer (default 0)   │ Current usage count      │
│ per_user_limit      │ integer               │ Uses per user (default 1)│
│ valid_from          │ timestamptz           │ Start validity           │
│ valid_until         │ timestamptz           │ End validity             │
│ is_active           │ boolean               │ Enable/disable toggle    │
│ applies_to          │ text                  │ 'all'/'products'/'cats'  │
│ product_ids         │ uuid[]                │ Target product IDs       │
│ category_ids        │ uuid[]                │ Target category IDs      │
│ stackable           │ boolean               │ Can combine with others  │
│ first_order_only    │ boolean               │ New customer exclusive   │
│ created_at          │ timestamptz           │ Creation timestamp       │
│ created_by          │ uuid                  │ Admin who created        │
│ updated_at          │ timestamptz           │ Last update              │
└─────────────────────┴───────────────────────┴──────────────────────────┘
```

### Tabel: `voucher_usage`

```text
┌────────────────────────────────────────────────────────────────────────┐
│  VOUCHER_USAGE TABLE (Tracking)                                         │
├─────────────────────┬───────────────────────┬──────────────────────────┤
│ Column              │ Type                  │ Description              │
├─────────────────────┼───────────────────────┼──────────────────────────┤
│ id                  │ uuid (PK)             │ Primary key              │
│ voucher_id          │ uuid (FK)             │ Reference to voucher     │
│ order_id            │ uuid (FK)             │ Reference to order       │
│ user_id             │ uuid                  │ User who used it         │
│ discount_applied    │ numeric               │ Actual discount amount   │
│ original_amount     │ numeric               │ Order total before       │
│ created_at          │ timestamptz           │ Usage timestamp          │
└─────────────────────┴───────────────────────┴──────────────────────────┘
```

### Update Tabel: `orders`

Tambah kolom:
- `voucher_id` (uuid, nullable) - FK ke vouchers
- `voucher_code` (text, nullable) - Snapshot kode voucher
- `discount_amount` (numeric, default 0) - Potongan yang diberikan
- `original_amount` (numeric) - Total sebelum diskon
- `final_amount` (numeric) - Total setelah diskon

---

## 2. Business Rules Integration

### Update `useBusinessRules.ts`

Tambah section baru:

```typescript
voucher: {
  enabled: boolean;           // Master toggle
  max_stackable: number;      // Max vouchers per order (1-3)
  min_order_for_voucher: number; // Global minimum
  allow_first_order_discount: boolean;
  show_available_vouchers: boolean; // Show applicable vouchers in checkout
}
```

### Update `BusinessRulesEditor.tsx`

Tambah tab baru "Vouchers" dengan kontrol:
- Enable/disable voucher system
- Max stackable vouchers
- Minimum order amount
- First order discount toggle
- Show available vouchers toggle

---

## 3. Edge Function: `validate-voucher`

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VALIDATE-VOUCHER EDGE FUNCTION                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Input:                                                                  │
│  {                                                                       │
│    code: string,                                                         │
│    order_amount: number,                                                 │
│    product_id: string,                                                   │
│    category_id?: string,                                                 │
│    user_id: string                                                       │
│  }                                                                       │
│                                                                          │
│  Validations:                                                            │
│  1. Check voucher exists & is_active                                     │
│  2. Check validity period (valid_from <= now <= valid_until)            │
│  3. Check usage_limit not exceeded                                       │
│  4. Check per_user_limit for this user                                  │
│  5. Check min_order_amount                                               │
│  6. Check product/category targeting                                     │
│  7. Check first_order_only if applicable                                │
│                                                                          │
│  Output (Success):                                                       │
│  {                                                                       │
│    valid: true,                                                          │
│    voucher: { id, name, discount_type, discount_value, ... },           │
│    discount_amount: number,                                              │
│    final_amount: number                                                  │
│  }                                                                       │
│                                                                          │
│  Output (Error):                                                         │
│  {                                                                       │
│    valid: false,                                                         │
│    error: "Voucher expired" | "Usage limit reached" | ...               │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend Components

### A. VoucherInput Component

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VOUCHER INPUT (Checkout Dialog)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  🏷️ Have a voucher code?                                        │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────┐  ┌─────────────┐          │    │
│  │  │  Enter voucher code...           │  │   Apply     │          │    │
│  │  └──────────────────────────────────┘  └─────────────┘          │    │
│  │                                                                  │    │
│  │  ✓ SAVE20 applied! -Rp 30,000                                   │    │
│  │    [Remove]                                                      │    │
│  │                                                                  │    │
│  │  ─────────────────────────────────────────────────────────────  │    │
│  │                                                                  │    │
│  │  Available vouchers for you:          ◄── Optional feature      │    │
│  │  ┌───────────────┐  ┌───────────────┐                           │    │
│  │  │  WELCOME10    │  │  BULKBUY15    │                           │    │
│  │  │  10% off      │  │  15% off      │                           │    │
│  │  │  [Apply]      │  │  Min Rp 500k  │                           │    │
│  │  └───────────────┘  └───────────────┘                           │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### B. VoucherManager (Admin)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VOUCHER MANAGER (Admin Panel)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Vouchers                               [+ Create Voucher]        │  │
│  │                                                                    │  │
│  │  Stats:                                                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │  │
│  │  │  12     │  │  5      │  │  156    │  │ Rp 4.2M │              │  │
│  │  │ Active  │  │ Expired │  │ Total   │  │ Savings │              │  │
│  │  │         │  │         │  │ Used    │  │  Given  │              │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘              │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Code    │ Name      │ Type │ Value│ Used│ Limit│ Status │Act │  │  │
│  │  ├─────────┼───────────┼──────┼──────┼─────┼──────┼────────┼────┤  │  │
│  │  │ SAVE20  │ 20% Off   │  %   │ 20%  │ 45  │ 100  │ Active │ ⚙️ │  │  │
│  │  │ WELCOME │ New User  │  %   │ 10%  │ 12  │ ∞    │ Active │ ⚙️ │  │  │
│  │  │ FLASH50K│ Flash Sale│Fixed │ 50K  │ 100 │ 100  │ Ended  │ ⚙️ │  │  │
│  │  └─────────┴───────────┴──────┴──────┴─────┴──────┴────────┴────┘  │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### C. VoucherFormDialog

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  CREATE/EDIT VOUCHER DIALOG                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Voucher Details                                                   │  │
│  │                                                                    │  │
│  │  Code *                        Name *                              │  │
│  │  ┌────────────────────┐       ┌────────────────────────┐          │  │
│  │  │ SAVE20             │       │ Save 20% on orders     │          │  │
│  │  └────────────────────┘       └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  Discount Type                 Discount Value                      │  │
│  │  ┌────────────────────┐       ┌────────────────────────┐          │  │
│  │  │ ◉ Percentage       │       │ 20                     │ %        │  │
│  │  │ ○ Fixed Amount     │       └────────────────────────┘          │  │
│  │  └────────────────────┘                                            │  │
│  │                                                                    │  │
│  │  Min. Order Amount             Max Discount (for %)                │  │
│  │  ┌────────────────────┐       ┌────────────────────────┐          │  │
│  │  │ 100000             │       │ 50000                  │          │  │
│  │  └────────────────────┘       └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────────── Usage Limits ─────────────────────           │  │
│  │                                                                    │  │
│  │  Total Usage Limit             Per User Limit                      │  │
│  │  ┌────────────────────┐       ┌────────────────────────┐          │  │
│  │  │ 100                │       │ 1                      │          │  │
│  │  └────────────────────┘       └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────────── Validity Period ─────────────────            │  │
│  │                                                                    │  │
│  │  Valid From                    Valid Until                         │  │
│  │  ┌────────────────────┐       ┌────────────────────────┐          │  │
│  │  │ 📅 2024-02-01      │       │ 📅 2024-02-28          │          │  │
│  │  └────────────────────┘       └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────────── Targeting ───────────────────────            │  │
│  │                                                                    │  │
│  │  Applies To:                                                       │  │
│  │  ◉ All Products                                                    │  │
│  │  ○ Specific Products  [Select products...]                        │  │
│  │  ○ Specific Categories [Select categories...]                     │  │
│  │                                                                    │  │
│  │  ─────────────────── Options ─────────────────────────            │  │
│  │                                                                    │  │
│  │  [✓] Active                                                        │  │
│  │  [ ] First Order Only (new customers)                              │  │
│  │  [ ] Stackable (can combine with other vouchers)                   │  │
│  │                                                                    │  │
│  │                           [Cancel]  [Save Voucher]                 │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Update Order Flow

### OrderConfirmationDialog Updates

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  UPDATED ORDER CONFIRMATION                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Product: Cloud Phone 30 Days                                            │
│  Duration: 30 days                                                       │
│  Quantity: 2                                                             │
│  Price per item: Rp 150,000                                              │
│  ─────────────────────────────────────────────────────────────────────  │
│  Subtotal: Rp 300,000                                                    │
│                                                                          │
│  🏷️ Voucher Code                                                        │
│  ┌──────────────────────────────┐  ┌─────────┐                          │
│  │ SAVE20                       │  │  Apply  │                          │
│  └──────────────────────────────┘  └─────────┘                          │
│                                                                          │
│  ✓ Voucher Applied: SAVE20 (-20%)                                       │
│  Discount: -Rp 50,000 (max Rp 50,000)                                   │
│  ─────────────────────────────────────────────────────────────────────  │
│  Total: Rp 250,000  ◄── Updated with discount                           │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Payment Method                                                          │
│  ○ Bank Transfer (Manual)                                                │
│  ◉ QRIS (Instant) [Recommended]                                         │
│                                                                          │
│                            [Cancel]  [Confirm Order]                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. RLS Policies

### Vouchers Table

```sql
-- Anyone can view active vouchers (for suggestions)
CREATE POLICY "Anyone can view active vouchers"
ON vouchers FOR SELECT
USING (is_active = true AND valid_until >= now());

-- Admins can manage all vouchers
CREATE POLICY "Admins can manage vouchers"
ON vouchers FOR ALL
USING (has_role(auth.uid(), 'admin'));
```

### Voucher Usage Table

```sql
-- Users can view own voucher usage
CREATE POLICY "Users can view own voucher usage"
ON voucher_usage FOR SELECT
USING (user_id = auth.uid());

-- System inserts usage (via edge function with service role)
-- No direct user INSERT policy - handled server-side
```

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_create_vouchers.sql` | Create | Database tables & policies |
| `supabase/functions/validate-voucher/index.ts` | Create | Voucher validation logic |
| `src/hooks/useVoucher.ts` | Create | Voucher validation hook |
| `src/hooks/useBusinessRules.ts` | Modify | Add voucher section |
| `src/components/VoucherInput.tsx` | Create | Voucher input for checkout |
| `src/components/VoucherManager.tsx` | Create | Admin voucher management |
| `src/components/VoucherFormDialog.tsx` | Create | Create/edit voucher form |
| `src/components/BusinessRulesEditor.tsx` | Modify | Add Vouchers tab |
| `src/components/OrderConfirmationDialog.tsx` | Modify | Integrate voucher input |
| `src/pages/Admin.tsx` | Modify | Add Vouchers tab |
| `src/pages/Store.tsx` | Modify | Pass voucher to order flow |

---

## 8. Voucher Analytics (Admin Dashboard)

Dashboard menampilkan:
- Total vouchers aktif/expired/disabled
- Total penggunaan hari ini/minggu/bulan
- Total discount yang diberikan
- Top performing vouchers
- Conversion rate (voucher applied vs completed orders)
- Usage trend chart

---

## 9. Advanced Features

### Auto-suggest Vouchers
Saat checkout, sistem akan menampilkan voucher yang applicable untuk order tersebut berdasarkan:
- Product/category match
- Order amount threshold
- User eligibility (first order, usage limit)

### Voucher Status Badges
- 🟢 Active - Currently usable
- 🟡 Scheduled - Will be active in future
- 🔴 Expired - Past valid_until date
- ⚫ Disabled - Manually disabled
- 🟠 Depleted - Usage limit reached

### Copy to Clipboard
Setiap voucher code memiliki button copy untuk easy sharing.

---

## 10. Security Considerations

1. **Server-side validation** - Semua validasi dilakukan di edge function, bukan client
2. **Race condition prevention** - Usage count increment atomic dengan transaction
3. **Rate limiting** - Limit voucher validation attempts per user
4. **Audit trail** - Semua usage tercatat di voucher_usage table
5. **Input sanitization** - Voucher codes di-uppercase dan trimmed

---

## Technical Implementation Order

1. Database migration (tables + RLS)
2. Edge function validate-voucher
3. useVoucher hook
4. Business rules update
5. VoucherInput component
6. OrderConfirmationDialog update
7. VoucherManager admin component
8. VoucherFormDialog
9. Admin.tsx integration
10. Analytics dashboard
