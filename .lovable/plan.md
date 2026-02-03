
# Landing Page Product Cards & Store Page Refactoring Plan

## Overview
Memperbaiki dua masalah responsivitas yang ditemukan:
1. **Landing Page "Our Plans"** - Product cards tidak responsive di mobile
2. **Store Page** - Perlu refactoring untuk fokus pada product list dengan child categories dan responsivitas yang lebih baik

---

## Current Issues Analysis

### Issue 1: Landing Page Product Cards (path: "/")
**Problem:**
- Section "Our Plans" di `Index.tsx` menggunakan inline Card components
- Pada mobile, cards terlihat cramped dengan padding yang kurang optimal
- Font sizes tidak scaled down dengan baik untuk layar kecil
- Grid layout sudah ada (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) tetapi card content belum optimal

**Location:** Lines 382-508 di `src/pages/Index.tsx`

### Issue 2: Store Page Layout (path: "/store")
**Problem:**
- Halaman Store terlalu banyak section (hero, features, products, testimonials)
- Seharusnya fokus pada product list saja
- Hero section dan features section tidak diperlukan di Store (sudah ada di Landing)
- Category tabs bisa diperbaiki untuk mendukung nested categories

**Current Store Structure:**
- Hero Section (lines 374-420) - REMOVE
- Features Section (lines 422-456) - REMOVE
- Products Section (lines 458-573) - KEEP & IMPROVE
- Testimonials Section (lines 576-638) - OPTIONAL/MOVE

---

## Implementation Plan

### Phase 1: Fix Landing Page Product Cards

**File: `src/pages/Index.tsx`**

Create a new reusable component `LandingProductCard` dengan:
- Responsive padding: `p-3 sm:p-4 md:p-6`
- Responsive font sizes: `text-lg sm:text-xl md:text-2xl` for title
- Responsive price: `text-xl sm:text-2xl md:text-3xl`
- Compact badges for mobile
- Better spacing between elements

**Changes:**
```text
Current CardContent (line 390):
className="p-4 sm:pt-6 space-y-3 sm:space-y-4"

Updated:
className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4"

Current price (line 396):
className="text-xl sm:text-2xl md:text-3xl font-black text-primary"

Updated (make more compact on mobile):
className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-primary"
```

Also update:
- Badge sizes: Make smaller on mobile with `text-[10px] sm:text-xs`
- Button sizes: `text-xs sm:text-sm`
- Duration text: Smaller on mobile

### Phase 2: Refactor Store Page - Remove Unnecessary Sections

**File: `src/pages/Store.tsx`**

**Changes:**
1. **Remove Hero Section** (lines 374-420) - Already on landing page
2. **Remove Features Section** (lines 422-456) - Already on landing page
3. **Remove Testimonials Section** (lines 576-638) - Keep on landing page only
4. **Keep Products Section** with improvements

**New Store Page Structure:**
```text
<div className="min-h-screen bg-background">
  <SEOHead />
  <Navbar />
  
  <!-- Simple Header with title -->
  <div className="container mx-auto px-4 pt-6 pb-4">
    <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
  </div>
  
  <!-- Category Filters -->
  <div className="sticky top-16 bg-background/95 backdrop-blur z-10">
    <!-- Nested category tabs -->
  </div>
  
  <!-- Product Grid -->
  <div className="container mx-auto px-4 py-6">
    <!-- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 -->
  </div>
</div>
```

### Phase 3: Improve ProductCard Responsiveness

**File: `src/components/ProductCard.tsx`**

**Current Issues:**
- Fixed `text-2xl` for CardTitle (too big on mobile)
- Fixed `text-3xl` for price (too big on mobile)
- Badge text "Best Seller" too long on mobile

**Improvements:**
```text
CardTitle (line 92):
Before: className="text-2xl"
After:  className="text-lg sm:text-xl md:text-2xl"

Price (line 133):
Before: className="text-3xl font-black text-primary"
After:  className="text-xl sm:text-2xl md:text-3xl font-black text-primary"

Badges (lines 71-87):
- Add responsive text: "text-[10px] sm:text-xs"
- Use icons only on mobile for longer badges
```

### Phase 4: Nested Category System

**Current State:**
- `parent_id` column sudah ada di database
- Hanya ada 1 category "General" tanpa children
- Nested UI sudah diimplementasi di Store.tsx

**No database changes needed** - system already supports nested categories.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Make product cards more responsive with smaller fonts/padding on mobile |
| `src/pages/Store.tsx` | Remove hero, features, testimonials sections. Keep only product list |
| `src/components/ProductCard.tsx` | Add responsive font sizes and compact mobile layout |

---

## Visual Changes Summary

### Landing Page Product Cards (Mobile)
- Smaller padding: `p-3` instead of `p-4`
- Smaller title: `text-lg` instead of `text-xl`
- Smaller price: `text-xl` instead of `text-2xl`
- Compact badges with smaller text

### Store Page (Mobile)
- Clean, minimal header
- Sticky category filter bar
- Full-width product cards
- No hero/features/testimonials

---

## Technical Details

### Responsive Breakpoints Used
- `sm:` = 640px+
- `md:` = 768px+
- `lg:` = 1024px+

### Product Card Mobile Optimizations
```tsx
// Title
<CardTitle className="text-lg sm:text-xl md:text-2xl">{name}</CardTitle>

// Price
<div className="text-xl sm:text-2xl md:text-3xl font-black text-primary">
  Rp {price.toLocaleString('id-ID')}
</div>

// Badges
<Badge className="text-[10px] sm:text-xs shadow-brutal-sm">
  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">Best Seller</span>
  <span className="sm:hidden">Top</span>
</Badge>
```

---

## Estimated Changes
- **Index.tsx**: ~40 lines modified
- **Store.tsx**: ~150 lines removed/modified
- **ProductCard.tsx**: ~25 lines modified

**Total**: ~215 lines of changes
