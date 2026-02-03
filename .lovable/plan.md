
# Mobile Responsiveness & Branding Sync Polish Plan

## Overview
This plan addresses mobile responsiveness issues and synchronizes all hardcoded "Redfinger Store" text with the dynamic site name from web_settings database.

---

## Issues Identified

### Critical: Hardcoded Brand Names (11 files, 92 occurrences)
Multiple pages and components contain hardcoded "Redfinger Store" or "Redfinger" text instead of using the dynamic `useSiteSettings` hook.

### Minor: Hero Section Navigation
The "Sign In" button in the hero section uses `onClick={() => navigate()}` which works but should be verified.

### Good: Mobile Layout Foundation
- Tables use horizontal scroll (`overflow-x-auto`)
- Tabs use horizontal scroll on mobile
- Cards stack properly
- Navbar hamburger menu functional

---

## Implementation Steps

### Phase 1: Sync All Pages with Dynamic Site Name

**1.1 Update Store.tsx**
- Import `useSiteSettings` hook
- Replace hardcoded "Redfinger Cloud Phone" in hero with dynamic name
- Update SEOHead to use dynamic site name

**1.2 Update Admin.tsx**
- Import `useSiteSettings` hook
- Update SEOHead title to use dynamic site name

**1.3 Update Staff.tsx**
- Import `useSiteSettings` hook
- Update SEOHead title to use dynamic site name

**1.4 Update Transactions.tsx**
- Import `useSiteSettings` hook
- Update SEOHead title to use dynamic site name

**1.5 Update ForgotPassword.tsx**
- Import `useSiteSettings` hook
- Add dynamic site name display if needed

**1.6 Update ResetPassword.tsx**
- Import `useSiteSettings` hook
- Ensure consistent branding

### Phase 2: Update Components with Dynamic Branding

**2.1 Update FAQSection.tsx**
- Make default FAQ content use more generic terms
- Or fetch FAQ content that includes dynamic site name

**2.2 Update OrderCard.tsx**
- Keep redfinger.com links as these are the actual product service URLs (not brand name)
- These are functional links, not branding

**2.3 Update SEOHead.tsx**
- Already has fallback, but ensure it uses settings properly

**2.4 Update WebSettingsEditor.tsx**
- Default settings are for admin preview, acceptable to keep

### Phase 3: Update Default Fallbacks

**3.1 Update useSiteSettings.ts**
- Change default fallback from "Redfinger Store" to a more generic placeholder
- Consider using "Cloud Phone Store" as neutral default

**3.2 Update Index.tsx Default Settings**
- Update default hero title, subtitle to be more generic
- Database values will override these anyway

### Phase 4: Edge Function Update

**4.1 Update send-notification Edge Function**
- Fetch site name from web_settings
- Use dynamic site name in email sender field

---

## Technical Details

### Files to Modify:
1. `src/pages/Store.tsx` - Add useSiteSettings, update hero and SEOHead
2. `src/pages/Admin.tsx` - Add useSiteSettings, update SEOHead
3. `src/pages/Staff.tsx` - Add useSiteSettings, update SEOHead  
4. `src/pages/Transactions.tsx` - Add useSiteSettings, update SEOHead
5. `src/pages/ForgotPassword.tsx` - Add useSiteSettings if title needed
6. `src/pages/ResetPassword.tsx` - Add useSiteSettings if title needed
7. `src/hooks/useSiteSettings.ts` - Update default to generic name
8. `src/pages/Index.tsx` - Update default settings text
9. `supabase/functions/send-notification/index.ts` - Fetch dynamic site name

### Pattern to Follow:
```typescript
// Import at top
import { useSiteSettings } from "@/hooks/useSiteSettings";

// In component
const { settings: siteSettings } = useSiteSettings();

// Use in JSX
<SEOHead title={`Page Title - ${siteSettings.name}`} />
```

---

## Summary

| Category | Items | Priority |
|----------|-------|----------|
| Branding Sync | 9 files | High |
| Edge Function | 1 file | Medium |
| Mobile Layout | Already good | N/A |

**Estimated Changes**: ~50-80 lines of code modifications across 9-10 files
