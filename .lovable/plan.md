
# Fix: Modal Checkout Confirmation Responsiveness

## Masalah
Modal `OrderConfirmationDialog` dan `QRPaymentDialog` tidak dapat di-scroll pada layar mobile karena tidak ada constraint `max-height` dan `overflow` pada `DialogContent`.

## Penyebab Root
File `src/components/ui/dialog.tsx` line 44-46:
```css
fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]
```
Dialog di-center secara absolut, tetapi tidak ada batasan tinggi maksimum atau overflow handling.

## Solusi

### 1. Update DialogContent Component
**File:** `src/components/ui/dialog.tsx`

Tambahkan responsive constraints:
```text
max-h-[90vh]          /* Batasi tinggi max 90% viewport */
overflow-y-auto       /* Aktifkan vertical scroll */
my-4                  /* Margin vertikal untuk safe area */
```

**Perubahan Spesifik (line 44-46):**
```diff
- "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] ..."
+ "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] ..."
```

### 2. Update OrderConfirmationDialog
**File:** `src/components/OrderConfirmationDialog.tsx`

Tambahkan custom class untuk mobile:
```text
<DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
```

### 3. Update QRPaymentDialog
**File:** `src/components/QRPaymentDialog.tsx`

Tambahkan class yang sama:
```text
<DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
```

## Detail Teknis

### Mengapa 85vh/90vh?
- 85vh memberikan ruang 15% untuk browser UI (address bar, navigation)
- Pada mobile Safari/Chrome, address bar dapat menyusut/expand
- Safe area untuk notch dan rounded corners

### Overflow Behavior
- `overflow-y-auto` hanya menampilkan scrollbar saat diperlukan
- Tidak mengganggu UX pada layar besar
- Touch scrolling otomatis aktif pada mobile

## Files yang Akan Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/components/ui/dialog.tsx` | Tambah `max-h-[90vh] overflow-y-auto` di DialogContent |
| `src/components/OrderConfirmationDialog.tsx` | Tambah `max-h-[85vh] overflow-y-auto` di className |
| `src/components/QRPaymentDialog.tsx` | Tambah `max-h-[85vh] overflow-y-auto` di className |

## Testing Checklist
- [ ] Test pada viewport 360x640 (Android kecil)
- [ ] Test pada viewport 375x812 (iPhone X/11/12)
- [ ] Test scroll behavior pada konten panjang
- [ ] Verify close button tetap accessible
- [ ] Test dengan QRIS enabled (konten lebih panjang)
