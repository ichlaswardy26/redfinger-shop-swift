
# Bulk Voucher Generation for Promotional Campaigns

## Overview

Implementing a comprehensive bulk voucher generation system that allows admins to create multiple vouchers at once with auto-generated unique codes. This is essential for running promotional campaigns, influencer partnerships, and marketing initiatives.

---

## 1. Features

### Code Generation Options

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  BULK VOUCHER GENERATION                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Code Format Options:                                                    │
│                                                                          │
│  1. PREFIX + RANDOM                                                      │
│     Example: PROMO-X7K9M2, PROMO-A3B5C8                                 │
│     Pattern: {PREFIX}-{RANDOM_ALPHANUMERIC}                             │
│                                                                          │
│  2. SEQUENTIAL                                                           │
│     Example: CAMPAIGN001, CAMPAIGN002, CAMPAIGN003                      │
│     Pattern: {PREFIX}{SEQUENCE_NUMBER}                                  │
│                                                                          │
│  3. FULL RANDOM                                                          │
│     Example: K7X9M2P4, A3B5C8D1                                         │
│     Pattern: {RANDOM_8_CHARS}                                           │
│                                                                          │
│  4. CUSTOM PATTERN                                                       │
│     Example: 2024-FEB-XXXXX (X = random)                                │
│     Pattern: User-defined with placeholders                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Generation Configuration

- **Quantity**: 1 to 1000 vouchers per batch
- **Code Length**: 6-12 characters
- **Character Set**: Alphanumeric (excluding confusing chars like 0/O, 1/I/L)
- **Prefix**: Optional campaign identifier
- **Campaign Name**: Group identifier for tracking

---

## 2. Database Changes

### Add Campaign Tracking to Vouchers

```sql
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS campaign_id text;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS batch_id uuid;
```

These columns allow:
- **campaign_id**: Group vouchers by marketing campaign (e.g., "FEB2024_SALE")
- **batch_id**: Track which vouchers were created together in a bulk operation

---

## 3. Component Structure

### A. BulkVoucherGeneratorDialog

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  BULK VOUCHER GENERATOR DIALOG                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  Campaign Settings                                                 │  │
│  │  ─────────────────                                                 │  │
│  │                                                                    │  │
│  │  Campaign Name *               Number of Vouchers *                │  │
│  │  ┌────────────────────────┐   ┌────────────────────────┐          │  │
│  │  │ February Sale 2024     │   │ 100                    │          │  │
│  │  └────────────────────────┘   └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────── Code Format ───────────────                      │  │
│  │                                                                    │  │
│  │  Code Pattern                  Code Length                         │  │
│  │  ┌────────────────────────┐   ┌────────────────────────┐          │  │
│  │  │ ◉ Prefix + Random      │   │ 8 characters           │          │  │
│  │  │ ○ Sequential           │   └────────────────────────┘          │  │
│  │  │ ○ Full Random          │                                       │  │
│  │  └────────────────────────┘                                       │  │
│  │                                                                    │  │
│  │  Prefix (optional)             Preview:                            │  │
│  │  ┌────────────────────────┐   ┌────────────────────────┐          │  │
│  │  │ FEB24                  │   │ FEB24-K7X9M2           │ ◄──Live   │  │
│  │  └────────────────────────┘   │ FEB24-A3B5C8           │    preview│  │
│  │                               │ FEB24-P4Q2R7           │          │  │
│  │                               └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────── Discount Settings ───────────────                │  │
│  │                                                                    │  │
│  │  Discount Type                 Discount Value                      │  │
│  │  ┌────────────────────────┐   ┌────────────────────────┐          │  │
│  │  │ ◉ Percentage           │   │ 20                     │ %        │  │
│  │  │ ○ Fixed Amount         │   └────────────────────────┘          │  │
│  │  └────────────────────────┘                                       │  │
│  │                                                                    │  │
│  │  Min. Order    │  Max Discount  │  Per User Limit                 │  │
│  │  ┌───────────┐ │ ┌───────────┐  │ ┌───────────┐                   │  │
│  │  │ 0         │ │ │ 50000     │  │ │ 1         │                   │  │
│  │  └───────────┘ │ └───────────┘  │ └───────────┘                   │  │
│  │                                                                    │  │
│  │  ─────────────── Validity Period ───────────────                  │  │
│  │                                                                    │  │
│  │  Valid From                    Valid Until                         │  │
│  │  ┌────────────────────────┐   ┌────────────────────────┐          │  │
│  │  │ 📅 2024-02-01          │   │ 📅 2024-02-28          │          │  │
│  │  └────────────────────────┘   └────────────────────────┘          │  │
│  │                                                                    │  │
│  │  ─────────────── Options ───────────────                          │  │
│  │                                                                    │  │
│  │  [✓] Active (start immediately)                                   │  │
│  │  [ ] First Order Only                                              │  │
│  │  [ ] Each code is single-use (usage_limit = 1)                    │  │
│  │                                                                    │  │
│  │                 [Cancel]  [Generate 100 Vouchers]                  │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### B. Generation Progress UI

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  GENERATION PROGRESS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │           🔄 Generating Vouchers...                               │  │
│  │                                                                    │  │
│  │           ████████████████████████░░░░░░░░ 75%                    │  │
│  │                                                                    │  │
│  │           75 of 100 vouchers created                              │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### C. Generation Complete / Export

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  GENERATION COMPLETE                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │           ✅ Successfully Generated 100 Vouchers!                 │  │
│  │                                                                    │  │
│  │           Campaign: February Sale 2024                            │  │
│  │           Discount: 20% off                                        │  │
│  │           Valid: Feb 1 - Feb 28, 2024                             │  │
│  │                                                                    │  │
│  │           ┌────────────────────────────────────────────────────┐  │  │
│  │           │  Download Options                                   │  │
│  │           │                                                     │  │
│  │           │  [📥 Download CSV]  [📋 Copy All Codes]            │  │
│  │           │                                                     │  │
│  │           └────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │           Preview (first 10):                                     │  │
│  │           ┌────────────────────────────────────────────────────┐  │  │
│  │           │  FEB24-K7X9M2   FEB24-A3B5C8   FEB24-P4Q2R7        │  │  │
│  │           │  FEB24-B8C3D4   FEB24-E5F6G7   FEB24-H2J3K4        │  │  │
│  │           │  FEB24-L5M6N7   FEB24-P8Q9R0   FEB24-S2T3U4        │  │  │
│  │           │  FEB24-V5W6X7   ...and 90 more                     │  │  │
│  │           └────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │                              [Close]                              │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Code Generation Algorithm

### Unique Code Generator

```typescript
const CHAR_SET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Excluded: 0/O, 1/I/L

function generateRandomCode(length: number): string {
  let code = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    code += CHAR_SET[array[i] % CHAR_SET.length];
  }
  return code;
}

function generateBulkCodes(
  quantity: number,
  pattern: "prefix-random" | "sequential" | "random",
  options: {
    prefix?: string;
    codeLength: number;
  }
): string[] {
  const codes = new Set<string>();
  
  while (codes.size < quantity) {
    let code: string;
    
    switch (pattern) {
      case "prefix-random":
        code = `${options.prefix}-${generateRandomCode(options.codeLength)}`;
        break;
      case "sequential":
        code = `${options.prefix}${String(codes.size + 1).padStart(4, "0")}`;
        break;
      case "random":
        code = generateRandomCode(options.codeLength);
        break;
    }
    
    codes.add(code);
  }
  
  return Array.from(codes);
}
```

### Collision Prevention

- Use Set to ensure uniqueness within batch
- Check against existing codes in database before insertion
- Regenerate if collision detected

---

## 5. Integration with VoucherManager

### Updated VoucherManager Header

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VOUCHER MANAGER HEADER                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Voucher Management                                                      │
│  Create and manage discount vouchers                                     │
│                                                                          │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ [+ Create Voucher]             │  │ [📦 Bulk Generate]             │ │
│  │    Create single voucher       │  │    Generate multiple for       │ │
│  │    with custom code            │  │    promotional campaigns       │ │
│  └────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Campaign Filter

Add ability to filter vouchers by campaign:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  CAMPAIGN FILTER                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Filter by Campaign:                                                     │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  All Campaigns ▼                                           │         │
│  │  ────────────────────────────────────────────────────────  │         │
│  │  All Campaigns                                             │         │
│  │  February Sale 2024 (100 vouchers)                         │         │
│  │  Influencer Codes (50 vouchers)                            │         │
│  │  Valentine Special (25 vouchers)                           │         │
│  │  (Single vouchers)                                         │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Export Features

### CSV Export Format

```csv
code,name,discount_type,discount_value,valid_from,valid_until,campaign
FEB24-K7X9M2,February Sale 20%,percentage,20,2024-02-01,2024-02-28,February Sale 2024
FEB24-A3B5C8,February Sale 20%,percentage,20,2024-02-01,2024-02-28,February Sale 2024
...
```

### Copy All Codes

Copy as newline-separated list for easy distribution:

```text
FEB24-K7X9M2
FEB24-A3B5C8
FEB24-P4Q2R7
...
```

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_voucher_campaign.sql` | Create | Add campaign_id and batch_id columns |
| `src/components/BulkVoucherGeneratorDialog.tsx` | Create | Main bulk generation dialog |
| `src/components/VoucherManager.tsx` | Modify | Add bulk generate button and campaign filter |
| `src/lib/voucherCodeGenerator.ts` | Create | Code generation utilities |

---

## 8. Implementation Flow

1. **Database Migration**: Add campaign tracking columns
2. **Code Generator Utility**: Create secure random code generation functions
3. **BulkVoucherGeneratorDialog**: Build the complete dialog with all configuration options
4. **VoucherManager Update**: Integrate bulk generate button and campaign filtering
5. **Export Functions**: CSV download and copy-all functionality
6. **Progress Tracking**: Real-time progress for large batch generations

---

## 9. Advanced Features

### Batch Size Optimization

For large batches (100+ vouchers):
- Insert in chunks of 50 to prevent timeouts
- Show progress bar during generation
- Allow cancellation mid-process

### Duplicate Detection

Before inserting:
```sql
SELECT code FROM vouchers WHERE code = ANY($1)
```

If duplicates found, regenerate those codes and retry.

### Campaign Analytics

After implementation, admins can:
- View usage stats by campaign
- See which campaigns perform best
- Track redemption rates per campaign
