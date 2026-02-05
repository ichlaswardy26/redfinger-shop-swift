
# Add Available Voucher Suggestions in Checkout

## Overview

Add a feature to display applicable vouchers that users can use during checkout. This enhances the user experience by showing available discounts they might not know about, encouraging voucher usage and improving conversion rates.

---

## 1. Current State Analysis

### Existing Components
- **VoucherInput.tsx**: Manual voucher code entry with validation
- **OrderConfirmationDialog.tsx**: Checkout dialog with VoucherInput integrated
- **useVoucher.ts**: Hook for validating voucher codes via edge function
- **useBusinessRules.ts**: Contains `voucher.show_available_vouchers` toggle (already exists!)

### Business Rules Already Support This
The `show_available_vouchers` setting already exists in business rules - we just need to implement the UI component that respects this setting.

---

## 2. Feature Design

### User Experience Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VOUCHER INPUT WITH SUGGESTIONS                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Voucher Code                                                            │
│  ┌──────────────────────────────────┐  ┌─────────────┐                  │
│  │  Enter voucher code...           │  │   Apply     │                  │
│  └──────────────────────────────────┘  └─────────────┘                  │
│                                                                          │
│  Available vouchers for you:                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  🏷️ WELCOME10                                    [Apply]   │  │    │
│  │  │  Welcome discount - 10% off                               │  │    │
│  │  │  Min order: Rp 50,000                                     │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  🏷️ SAVE20                                       [Apply]   │  │    │
│  │  │  Save 20% - Max Rp 50,000                                 │  │    │
│  │  │  ✓ Applicable to this product                             │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Voucher Eligibility Checks (Client-side Pre-filter)

Display vouchers that are:
1. Active (`is_active = true`)
2. Within validity period (`valid_from <= now <= valid_until`)
3. Not at usage limit (`usage_count < usage_limit`)
4. Applicable to current product/category (or applies_to = 'all')
5. Order amount meets minimum (`order_amount >= min_order_amount`)

Note: Per-user limits and first-order-only checks require authenticated queries or edge function validation.

---

## 3. Implementation Approach

### New Edge Function: `get-available-vouchers`

Create a new edge function to fetch available vouchers for a specific order context. This handles:
- User-specific eligibility (per-user limit, first-order-only)
- Product/category targeting
- Order amount filtering
- Calculate potential discount for each voucher

**Request:**
```json
{
  "order_amount": 150000,
  "product_id": "uuid",
  "category_id": "uuid"
}
```

**Response:**
```json
{
  "vouchers": [
    {
      "id": "uuid",
      "code": "SAVE20",
      "name": "Save 20%",
      "description": "Get 20% off your order",
      "discount_type": "percentage",
      "discount_value": 20,
      "max_discount_amount": 50000,
      "min_order_amount": 100000,
      "potential_discount": 30000,
      "first_order_only": false,
      "valid_until": "2024-02-28T23:59:59Z"
    }
  ]
}
```

### New Hook: `useAvailableVouchers`

```typescript
interface AvailableVoucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  potential_discount: number;
  first_order_only: boolean;
  valid_until: string;
}

const useAvailableVouchers = (
  orderAmount: number,
  productId: string,
  categoryId?: string
) => {
  // Fetch available vouchers from edge function
  // Return loading, error, and vouchers array
}
```

### New Component: `AvailableVouchersList`

A collapsible/expandable component that:
- Shows loading skeleton while fetching
- Displays list of applicable vouchers
- Each voucher shows: code, name, discount info, potential savings
- "Apply" button that auto-fills the code and triggers validation
- Respects `show_available_vouchers` business rule

### Update VoucherInput Component

Integrate the suggestions below the manual input:
- Fetch available vouchers when component mounts
- Show suggestions if `show_available_vouchers` is enabled
- Hide suggestions when a voucher is already applied
- Allow one-click application from suggestions

---

## 4. Component Structure

```text
VoucherInput (updated)
├── Manual Input Section
│   ├── Input field
│   └── Apply button
│
└── AvailableVouchersList (new - conditional)
    ├── Loading skeleton
    ├── Voucher cards (collapsible)
    │   ├── Code badge
    │   ├── Name & description
    │   ├── Discount info
    │   ├── Potential savings
    │   └── Quick apply button
    └── Empty state (no vouchers available)
```

---

## 5. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/get-available-vouchers/index.ts` | Create | New edge function to fetch eligible vouchers |
| `src/hooks/useAvailableVouchers.ts` | Create | Hook to fetch and manage available vouchers |
| `src/components/AvailableVouchersList.tsx` | Create | Component to display voucher suggestions |
| `src/components/VoucherInput.tsx` | Modify | Integrate voucher suggestions below input |

---

## 6. Edge Function Logic

### `get-available-vouchers/index.ts`

```text
1. Authenticate user
2. Fetch all active vouchers where:
   - is_active = true
   - valid_from <= now <= valid_until
   - usage_count < usage_limit (or usage_limit is null)
   
3. For each voucher, check:
   - Product/category targeting matches
   - Order amount >= min_order_amount
   - User hasn't exceeded per_user_limit
   - First order check if first_order_only = true
   
4. Calculate potential discount for each eligible voucher

5. Return sorted list (best discount first)
```

---

## 7. UI/UX Considerations

### Design Elements
- Collapsible section to save space (expandable by default on first checkout)
- Visual indicator for best deal (e.g., "Best Value" badge)
- Clear savings display (e.g., "Save Rp 30,000")
- Expiry warning for vouchers ending soon
- Smooth animations when applying voucher from suggestions

### Mobile Responsiveness
- Stack voucher cards vertically on mobile
- Full-width apply buttons for touch targets
- Scrollable list if many vouchers available

### Empty States
- "No vouchers available" message with encouragement
- Link to where users can find voucher codes (optional)

---

## 8. Security Considerations

1. **Server-side validation remains required** - Suggestions are just hints; actual validation happens via `validate-voucher` edge function
2. **Rate limiting** - Limit calls to `get-available-vouchers` to prevent abuse
3. **No sensitive data exposed** - Only show necessary voucher info, not internal IDs or admin notes
4. **User-specific data** - Voucher eligibility checked against authenticated user

---

## 9. Performance Optimizations

1. **Caching** - Cache voucher list for short period (30 seconds) to avoid repeated calls
2. **Lazy loading** - Only fetch suggestions when checkout dialog opens
3. **Debouncing** - If order amount changes, debounce the refresh
4. **Limit results** - Show max 5 best vouchers to avoid overwhelming users

---

## 10. Technical Implementation Order

1. Create `get-available-vouchers` edge function
2. Create `useAvailableVouchers` hook
3. Create `AvailableVouchersList` component
4. Update `VoucherInput` to integrate suggestions
5. Add business rules check for `show_available_vouchers` toggle
6. Test end-to-end with various voucher configurations
