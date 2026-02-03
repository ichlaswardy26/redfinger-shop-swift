

# Fix Error di Halaman Kelola Produk Admin

## Problem

Error terjadi di halaman Admin Products karena penggunaan `SelectItem` dengan `value=""` (empty string) pada komponen kategori. Radix UI Select tidak mengizinkan value kosong - ini akan menyebabkan runtime error saat komponen di-render.

**Lokasi Error:** `src/pages/Admin.tsx` line 919

```tsx
<SelectItem value="">No Category</SelectItem>  // ❌ Error: empty string tidak valid
```

---

## Solution

Ubah strategi untuk menangani "No Category" option:

### Option 1: Gunakan value placeholder (Recommended)
Gunakan value khusus seperti `"none"` atau `"uncategorized"` kemudian handle di submit handler.

### Option 2: Gunakan Button terpisah untuk clear
Tambahkan button "Clear Category" di luar Select component.

---

## Implementation

**File: `src/pages/Admin.tsx`**

### Change 1: Update SelectItem value
Line 919:
```tsx
// Before:
<SelectItem value="">No Category</SelectItem>

// After:
<SelectItem value="none">No Category</SelectItem>
```

### Change 2: Update onValueChange handler
Line 914:
```tsx
// Before:
onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}

// After:
onValueChange={(value) => setProductForm({ ...productForm, category_id: value === "none" ? "" : value })}
```

### Change 3: Update Select value binding
Line 914:
```tsx
// Before:
<Select value={productForm.category_id} ...>

// After:
<Select value={productForm.category_id || "none"} ...>
```

---

## Summary

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Fix SelectItem empty value error (3 lines) |

Dengan perubahan ini, ketika user memilih "No Category", value akan di-convert ke empty string dan disimpan dengan benar ke database.

