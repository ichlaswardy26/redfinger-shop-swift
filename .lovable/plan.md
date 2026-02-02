
# Fix All Identified Issues

## Issues to Fix

| Issue | Location | Problem |
|-------|----------|---------|
| 1. Hardcoded Public URL | `Admin.tsx` line 606 | Ticket attachment uses public storage URL instead of signed URL |
| 2. Direct Table Query | `Index.tsx` lines 205-234 | Queries `product_ratings` directly, exposing `user_id` |
| 3. Auth Page Styling | `SignIn.tsx`, `SignUp.tsx` | Missing Neo-Brutalism Glassmorphism theme |

---

## Fix 1: Admin.tsx - Replace Hardcoded URL with PaymentProofLink

**File:** `src/pages/Admin.tsx` (lines 602-609)

**Current Code:**
```tsx
{
  id: "attachment",
  header: "Attachment",
  cell: ({ row }) => row.original.image_proof ? (
    <Button variant="ghost" size="sm" onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${row.original.image_proof}`, '_blank')}>
      <Eye className="h-4 w-4" />
    </Button>
  ) : <span className="text-muted-foreground">-</span>,
},
```

**Fixed Code:**
```tsx
{
  id: "attachment",
  header: "Attachment",
  cell: ({ row }) => <PaymentProofLink filePath={row.original.image_proof || ""} />,
},
```

This uses the existing `PaymentProofLink` component that properly generates signed URLs.

---

## Fix 2: Index.tsx - Use Secure public_product_ratings View

**File:** `src/pages/Index.tsx` (lines 205-234)

**Current Code:**
```tsx
const fetchRatings = async () => {
  try {
    const { data, error } = await supabase
      .from("product_ratings")
      .select("id, rating, review, created_at, user_id, product_id")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });
    // ... complex enrichment with user_id exposure
  }
};
```

**Fixed Code:**
```tsx
const fetchRatings = async () => {
  try {
    // Use the secure public_product_ratings view instead of product_ratings table
    const { data, error } = await supabase
      .from("public_product_ratings")
      .select("id, rating, review, created_at, product_id, reviewer_name, product_name")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    // Transform to match expected format
    const enrichedRatings = (data || []).map(rating => ({
      ...rating,
      profiles: { full_name: rating.reviewer_name || null },
      products: { name: rating.product_name || "" }
    }));

    setRatings(enrichedRatings);
  } catch (error) {
    console.error("Error fetching ratings:", error);
  }
};
```

This mirrors the secure implementation already used in `Store.tsx`.

---

## Fix 3: SignIn.tsx - Apply Neo-Brutalism Theme

**File:** `src/pages/SignIn.tsx`

**Changes:**
- Add decorative background shapes (matching Auth.tsx pattern)
- Update Card with brutalist border styling
- Add branded header with store name badge
- Use `variant="hero"` on submit button
- Make labels bold

---

## Fix 4: SignUp.tsx - Apply Neo-Brutalism Theme

**File:** `src/pages/SignUp.tsx`

**Changes:**
- Same decorative background as SignIn
- Brutalist card styling
- Branded header with store badge
- Hero button variant
- Bold labels

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Replace hardcoded URL with PaymentProofLink component |
| `src/pages/Index.tsx` | Use public_product_ratings view instead of direct table query |
| `src/pages/SignIn.tsx` | Complete Neo-Brutalism Glassmorphism theme update |
| `src/pages/SignUp.tsx` | Complete Neo-Brutalism Glassmorphism theme update |

---

## Technical Notes

- The `PaymentProofLink` component already exists and handles signed URLs correctly
- The `public_product_ratings` view excludes sensitive fields (`user_id`, `order_id`) and only shows visible ratings
- The Auth.tsx page already has the correct Neo-Brutalism styling that we'll replicate to SignIn and SignUp pages
- No database changes required - all fixes are frontend code updates
