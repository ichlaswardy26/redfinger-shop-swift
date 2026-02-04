
# Bug Fix: Bulk Order Verification - Codes & Duplicate Detection

## Problem Analysis

### Issue 1: Codes Per Line Not Properly Validated
**Current behavior:**
- Line 170: `codes.length < order.quantity` - only checks minimum, not exact match
- Allows more codes than required (e.g., 5 codes for quantity 2)
- Does not enforce strict 1:1 code-to-quantity ratio

### Issue 2: No Duplicate Code Detection
**Current behavior:**
- No duplicate detection within a single order
- No duplicate detection across all selected orders in bulk verification
- `OrderVerificationDialog.tsx` has proper validation (lines 191-200), but `BulkOrderVerification.tsx` lacks it

---

## Solution

### 1. Add Comprehensive Validation Function

Create a new validation function that checks:
1. Exact code count matches order quantity
2. No duplicates within each order
3. No duplicates across all selected orders
4. Empty/whitespace-only codes rejected

```tsx
const validateAllCodes = (): { valid: boolean; error?: string } => {
  const allCodes: string[] = [];
  
  for (const orderId of selectedOrders) {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) continue;
    
    const rawCodes = redeemCodes[orderId]?.trim() || '';
    const codes = rawCodes.split('\n').map(c => c.trim()).filter(c => c.length > 0);
    
    // Check exact count
    if (codes.length !== order.quantity) {
      const productName = order.product_name;
      return { 
        valid: false, 
        error: `Order "${productName}" requires exactly ${order.quantity} code(s), but ${codes.length} provided` 
      };
    }
    
    // Check duplicates within this order
    const uniqueInOrder = new Set(codes.map(c => c.toLowerCase()));
    if (uniqueInOrder.size !== codes.length) {
      return { 
        valid: false, 
        error: `Duplicate codes found within order for "${order.product_name}"` 
      };
    }
    
    // Collect for cross-order duplicate check
    allCodes.push(...codes.map(c => c.toLowerCase()));
  }
  
  // Check duplicates across all orders
  const uniqueAcrossAll = new Set(allCodes);
  if (uniqueAcrossAll.size !== allCodes.length) {
    // Find which codes are duplicated
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const code of allCodes) {
      if (seen.has(code)) {
        duplicates.push(code);
      }
      seen.add(code);
    }
    return { 
      valid: false, 
      error: `Duplicate code(s) found across orders: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}` 
    };
  }
  
  return { valid: true };
};
```

### 2. Update handleVerifyClick Function

Replace the current simple validation with the comprehensive validator:

```tsx
const handleVerifyClick = () => {
  if (selectedOrders.length === 0) {
    toast({ title: "No orders selected", variant: "destructive" });
    return;
  }

  // Comprehensive code validation
  const validation = validateAllCodes();
  if (!validation.valid) {
    toast({ 
      title: "Code Validation Error", 
      description: validation.error,
      variant: "destructive" 
    });
    return;
  }

  // ... rest of stock calculation logic unchanged
};
```

### 3. Visual Feedback for Code Count

Add inline validation indicator next to textarea showing:
- ✅ Green check when code count matches quantity
- ⚠️ Warning when count is wrong
- ❌ Error when duplicates detected

```tsx
{/* Code count indicator */}
{redeemCodes[order.id] && (
  <div className="flex items-center gap-2 text-sm mt-1">
    {(() => {
      const codes = redeemCodes[order.id].split('\n').filter(c => c.trim());
      const uniqueCodes = new Set(codes.map(c => c.trim().toLowerCase()));
      const hasDuplicates = uniqueCodes.size !== codes.length;
      const countCorrect = codes.length === order.quantity;
      
      if (hasDuplicates) {
        return (
          <span className="text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Duplicate codes detected
          </span>
        );
      }
      if (!countCorrect) {
        return (
          <span className="text-amber-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {codes.length}/{order.quantity} codes
          </span>
        );
      }
      return (
        <span className="text-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {codes.length}/{order.quantity} codes
        </span>
      );
    })()}
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/BulkOrderVerification.tsx` | Add `validateAllCodes()` function, update `handleVerifyClick()`, add visual code count indicators |

---

## Technical Details

### Validation Flow
```text
handleVerifyClick()
    │
    ├── Check selectedOrders.length > 0
    │
    ├── validateAllCodes()
    │   ├── For each selected order:
    │   │   ├── Split codes by newline
    │   │   ├── Trim and filter empty lines
    │   │   ├── Check exact count = order.quantity
    │   │   └── Check no duplicates within order
    │   │
    │   └── Check no duplicates across all orders
    │
    ├── If validation fails → Show toast error
    │
    └── If validation passes → Continue to stock confirmation
```

### Edge Cases Handled
1. **Empty lines** - Filtered out via `.filter(c => c.trim())`
2. **Whitespace codes** - Trimmed before comparison
3. **Case-insensitive duplicates** - `"ABC123"` and `"abc123"` treated as duplicates
4. **More codes than needed** - Error: exact match required
5. **Fewer codes than needed** - Error: exact match required
6. **Same code in different orders** - Cross-order duplicate detection

---

## UI Improvements

### Before (Current)
- Textarea with no validation feedback
- Only shows error on submit

### After (Enhanced)
- Real-time code count indicator
- Duplicate warning shown immediately
- Clear error messages identifying which order has issues

---

## Expected Outcomes

1. **Exact Code Count**: Each order gets exactly the number of codes matching its quantity
2. **No Duplicates**: Prevents same code being assigned to multiple orders
3. **Clear Feedback**: Admin sees validation status before clicking verify
4. **Consistent Behavior**: Matches validation logic from `OrderVerificationDialog.tsx`
