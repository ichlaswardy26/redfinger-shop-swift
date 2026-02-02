

# Fix Storage Access Issues

## Problem Identified

The `TicketConversation.tsx` component has a broken `getFilePreview` function (lines 139-204) that constructs hardcoded public URLs for the `payment-proofs` bucket. Since this bucket was recently made private for security, these URLs no longer work.

## Solution

Replace the broken inline `getFilePreview` function with the existing `FilePreview` component that already uses signed URLs properly.

## Implementation

### 1. Update TicketConversation.tsx

**Changes:**
- Import the `FilePreview` component
- Remove the broken `getFilePreview` function (lines 139-204)
- Replace the inline preview rendering with the `FilePreview` component
- Remove unused icon imports (FileImage, FileVideo, FileText, ExternalLink)

**Before:**
```tsx
const getFilePreview = (filePath: string) => {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${filePath}`;
  // ... broken public URL usage
};
```

**After:**
```tsx
import { FilePreview } from "@/components/FilePreview";
// Use FilePreview component which handles signed URLs
```

### 2. Files to Modify

| File | Change |
|------|--------|
| `src/components/TicketConversation.tsx` | Replace hardcoded URL function with FilePreview component |

## Technical Notes

- The `FilePreview` component already correctly uses the `useSignedUrl` hook
- Signed URLs expire after 1 hour (configurable) and are generated on-demand
- This ensures only authenticated users can view private files
- No bucket changes needed - the `payment-proofs` bucket is already properly configured as private

