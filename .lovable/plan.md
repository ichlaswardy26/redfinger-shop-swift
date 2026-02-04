

# Category Image & Store UI Polish Implementation Plan

## Overview
Plan untuk menyelesaikan 2 masalah:
1. Menambah padding pada category tabs di halaman `/store`
2. Mengubah sistem icon kategori dari predefined icons menjadi custom image URL dengan responsive sizing

---

## Issue Analysis

### Issue 1: Category Tabs Padding
**Current State:**
- Container di `Store.tsx` line 369: `py-4 sm:py-5 space-y-3`
- Parent categories row line 371: `mb-1`
- Buttons gap: `gap-1.5 sm:gap-2`

**Solution:**
- Increase vertical padding: `py-5 sm:py-6 space-y-4`
- Add more bottom margin to parent row: `mb-2`
- Increase button gaps: `gap-2 sm:gap-2.5`

### Issue 2: Custom Image Icons for Categories
**Current State:**
- Database column `icon` menyimpan string seperti "package", "folder", "tag", "layers"
- `CategoryManager.tsx` menggunakan button selector dengan predefined icons
- `Store.tsx` `getCategoryIcon()` function maps string ke Lucide icon components
- Tidak ada storage bucket untuk category images

**Solution:**
1. **Database**: Rename/repurpose column `icon` menjadi `image_url` atau tambah kolom baru `image_url`
2. **Storage**: Buat bucket baru `category-images` untuk upload gambar
3. **CategoryManager**: Ganti icon selector dengan:
   - Input URL untuk link gambar external
   - Upload button untuk gambar baru
4. **Store.tsx**: Ganti `getCategoryIcon()` untuk render `<img>` dengan responsive sizing
5. **Responsive sizing**: Mobile `h-4 w-4`, Desktop `h-5 w-5` dengan fallback icon jika tidak ada gambar

---

## Implementation Plan

### Phase 1: Create Storage Bucket

**SQL Migration:**
```sql
-- Create bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('category-images', 'category-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- RLS Policy: Anyone can view
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- RLS Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can update/delete their uploads
CREATE POLICY "Authenticated users can manage category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');
```

### Phase 2: Add image_url Column to Categories

**SQL Migration:**
```sql
-- Add image_url column for custom category images
ALTER TABLE product_categories 
ADD COLUMN image_url TEXT;

-- Add comment
COMMENT ON COLUMN product_categories.image_url IS 'URL to custom category image (external URL or storage path)';
```

### Phase 3: Update CategoryManager.tsx

**Changes:**
1. Add file upload state and handler
2. Replace icon button selector with:
   - Image preview (if exists)
   - URL input field
   - Upload button with loading state
3. Handle both external URLs and uploaded files

**New Form Structure:**
```tsx
// State
const [uploading, setUploading] = useState(false);
const [form, setForm] = useState({ 
  name: "", 
  description: "", 
  image_url: "", 
  parent_id: "" 
});

// Upload handler
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setUploading(true);
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('category-images')
    .upload(fileName, file);
  
  if (error) {
    toast({ title: "Upload failed", variant: "destructive" });
  } else {
    const { data: urlData } = supabase.storage
      .from('category-images')
      .getPublicUrl(fileName);
    setForm({ ...form, image_url: urlData.publicUrl });
  }
  setUploading(false);
};

// UI - Replace icon selector with:
<div>
  <Label>Category Image (Optional)</Label>
  <div className="space-y-3 mt-2">
    {/* Preview */}
    {form.image_url && (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-md border-2 border-border overflow-hidden bg-muted">
          <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>
          <X className="h-4 w-4" /> Remove
        </Button>
      </div>
    )}
    
    {/* URL Input */}
    <Input
      placeholder="Image URL (or upload below)"
      value={form.image_url}
      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
    />
    
    {/* Upload Button */}
    <div className="flex items-center gap-2">
      <Input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={uploading}
        className="text-xs"
      />
      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
    <p className="text-xs text-muted-foreground">Max 2MB. Supports JPG, PNG, WebP, SVG</p>
  </div>
</div>
```

### Phase 4: Update Store.tsx Category Rendering

**Changes to getCategoryIcon:**
```tsx
// Old:
const getCategoryIcon = (iconName: string | null) => {
  switch (iconName) {
    case "smartphone": return <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
    // ...
    default: return <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  }
};

// New:
const getCategoryImage = (imageUrl: string | null) => {
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt="" 
        className="h-4 w-4 sm:h-5 sm:w-5 object-cover rounded-sm"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
};
```

**Update Category interface:**
```tsx
interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;      // Keep for backward compat
  image_url: string | null; // New field
  is_active: boolean;
  parent_id: string | null;
}
```

**Update category buttons:**
```tsx
// Line 389 - Change from getCategoryIcon(category.icon) to:
{getCategoryImage(category.image_url)}

// Line 417 - Same change for child categories
{getCategoryImage(child.image_url)}
```

### Phase 5: Increase Category Tabs Padding

**File: `src/pages/Store.tsx`**

```tsx
// Line 369 - Increase container padding
<div className="sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border">
  <div className="container mx-auto px-4 py-5 sm:py-6 space-y-4">

// Line 371 - Increase parent row margin
<div className="overflow-x-auto -mx-4 px-4 scrollbar-hide mb-2">
  <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
```

---

## Files to Modify

| File | Changes |
|------|---------|
| SQL Migration | Create `category-images` bucket + add `image_url` column |
| `src/components/CategoryManager.tsx` | Replace icon selector with image URL/upload |
| `src/pages/Store.tsx` | Update getCategoryIcon to getCategoryImage, increase padding |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |

---

## Database Changes

### New Storage Bucket
- **Name**: `category-images`
- **Public**: Yes (untuk display di frontend)
- **Size limit**: 2MB
- **Allowed types**: JPEG, PNG, WebP, SVG

### Schema Change
```text
product_categories:
├── id (uuid)
├── name (text)
├── description (text | null)
├── icon (text | null) ← Keep for backward compat
├── image_url (text | null) ← NEW
├── display_order (int)
├── is_active (boolean)
├── parent_id (uuid | null)
└── timestamps
```

---

## UI Changes Summary

### Category Tabs (Before → After)
- Container: `py-4 sm:py-5` → `py-5 sm:py-6`
- Row spacing: `space-y-3` → `space-y-4`
- Parent row margin: `mb-1` → `mb-2`
- Button gaps: `gap-1.5 sm:gap-2` → `gap-2 sm:gap-2.5`

### Category Manager (Before → After)
**Before:**
- 4 predefined icon buttons (Package, Folder, Tag, Layers)

**After:**
- Image preview with remove button
- URL input field for external images
- File upload for new images
- Supports JPG, PNG, WebP, SVG up to 2MB

### Store Category Buttons (Before → After)
**Before:**
- Lucide icons `h-3.5 sm:h-4`

**After:**
- Custom images `h-4 sm:h-5 object-cover rounded-sm`
- Fallback to Layers icon if no image

---

## Estimated Changes
- **SQL Migration**: 2 statements
- **CategoryManager.tsx**: ~60 lines modified
- **Store.tsx**: ~20 lines modified

**Total**: ~80 lines of changes + database migration

