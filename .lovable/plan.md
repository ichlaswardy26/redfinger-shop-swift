

# Admin/Staff Sidebar Navigation Implementation

## Overview

Replace the horizontal tab navigation in Admin.tsx and Staff.tsx with a modern grouped vertical sidebar using the existing Shadcn sidebar components. This will improve navigation, especially on desktop, while maintaining mobile accessibility through a collapsible drawer.

---

## Current State Analysis

### Admin.tsx (1273 lines)
- Uses horizontal `Tabs` with 10 tab triggers
- TabsList is cramped on mobile (requires horizontal scroll)
- No visual grouping of related functions
- All content sections embedded in one large component

### Staff.tsx (524 lines)  
- Similar horizontal tabs approach with 4 tabs
- Same mobile usability issues
- No descriptive empty states

### Available Sidebar Components
The project already has a full `src/components/ui/sidebar.tsx` with:
- `SidebarProvider` - Context and state management
- `Sidebar` - Main container with mobile Sheet support
- `SidebarTrigger` - Toggle button
- `SidebarHeader/Footer/Content` - Layout sections
- `SidebarGroup/GroupLabel/GroupContent` - Grouping
- `SidebarMenu/MenuItem/MenuButton` - Navigation items
- `useSidebar` hook - Access sidebar state

---

## Implementation Plan

### Phase 1: Create AdminSidebar Component

**New File: `src/components/AdminSidebar.tsx`**

Features:
- Grouped navigation by category (Ikhtisar, Produk, Operasional, Sistem)
- Active state highlighting with visual indicator
- Notification badges for pending items (orders, tickets)
- Uses existing Shadcn sidebar primitives
- Indonesian labels from translations.ts

```text
Structure:
┌─────────────────┐
│  Site Logo      │
├─────────────────┤
│  IKHTISAR       │
│  ├ Dasbor       │
│  └ Analitik     │
│                 │
│  PRODUK         │
│  ├ Produk       │
│  ├ Kategori     │
│  ├ Kode         │
│  └ Voucher      │
│                 │
│  OPERASIONAL    │
│  ├ Pesanan (12) │ ← Badge for pending
│  ├ Tiket (5)    │ ← Badge for open
│  └ Ulasan       │
│                 │
│  SISTEM         │
│  ├ Pengguna     │
│  └ Pengaturan   │
├─────────────────┤
│  Collapse       │
└─────────────────┘
```

Props interface:
```typescript
interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  pendingOrdersCount: number;
  openTicketsCount: number;
}
```

### Phase 2: Create StaffSidebar Component

**New File: `src/components/StaffSidebar.tsx`**

Simpler version with limited menu items:
- Tiket (with open count badge)
- Pesanan (with pending count badge)
- Ulasan
- Stok Produk

Same pattern as AdminSidebar but fewer groups.

### Phase 3: Refactor Admin.tsx Layout

**File: `src/pages/Admin.tsx`**

Changes:
1. Replace `Tabs` with `SidebarProvider` layout
2. Add state: `activeSection` to control which content shows
3. Desktop: Fixed sidebar (256px) + scrollable content
4. Mobile: Sheet drawer triggered by hamburger menu
5. Remove TabsList/TabsTrigger - replace with sidebar navigation
6. Convert TabsContent sections to conditional rendering based on activeSection

Layout structure:
```tsx
<SidebarProvider>
  <div className="flex min-h-screen w-full">
    <AdminSidebar 
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      pendingOrdersCount={stats.pendingPayments}
      openTicketsCount={openTicketsCount}
    />
    <main className="flex-1">
      <header className="...">
        <SidebarTrigger /> {/* Mobile toggle */}
        <h1>{t.admin.title}</h1>
      </header>
      <div className="p-6">
        {activeSection === 'dashboard' && <DashboardContent />}
        {activeSection === 'orders' && <OrdersContent />}
        {/* ... other sections */}
      </div>
    </main>
  </div>
</SidebarProvider>
```

### Phase 4: Refactor Staff.tsx Layout

**File: `src/pages/Staff.tsx`**

Apply same sidebar treatment:
1. Replace Tabs with SidebarProvider
2. Use StaffSidebar component
3. Add descriptive empty states with icons
4. Mobile sheet drawer navigation

### Phase 5: Apply Indonesian Translations

Both Admin.tsx and Staff.tsx will use labels from `t.admin.sections` and `t.staff`:
- All sidebar labels in Indonesian
- All content headings translated
- Status badges translated
- Toast messages translated

---

## Component Structure

### AdminSidebar.tsx

```tsx
// Key sections with icons and badges
const menuGroups = [
  {
    label: t.admin.groups.overview,
    items: [
      { id: 'dashboard', label: t.admin.sections.dashboard, icon: LayoutDashboard },
      { id: 'analytics', label: t.admin.sections.analytics, icon: BarChart3, href: '/admin/analytics' },
    ]
  },
  {
    label: t.admin.groups.productManagement,
    items: [
      { id: 'products', label: t.admin.sections.products, icon: Package },
      { id: 'categories', label: t.admin.sections.categories, icon: Layers },
      { id: 'code-inventory', label: t.admin.sections.codeInventory, icon: Code },
      { id: 'vouchers', label: t.admin.sections.vouchers, icon: Tag },
    ]
  },
  {
    label: t.admin.groups.operations,
    items: [
      { id: 'orders', label: t.admin.sections.orders, icon: ShoppingCart, badge: pendingOrdersCount },
      { id: 'tickets', label: t.admin.sections.tickets, icon: Ticket, badge: openTicketsCount },
      { id: 'ratings', label: t.admin.sections.ratings, icon: Star },
    ]
  },
  {
    label: t.admin.groups.system,
    items: [
      { id: 'users', label: t.admin.sections.users, icon: Users },
      { id: 'settings', label: t.admin.sections.settings, icon: Cog },
    ]
  }
];
```

### Visual Design

- Neo-brutalism glassmorphism style matching app theme
- Border-2 border-border on sidebar
- Glass effect background: bg-background/70 backdrop-blur
- Active item: bg-primary text-primary-foreground with left border accent
- Hover: bg-accent transition-colors
- Badge: animate-pulse for urgent items

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/AdminSidebar.tsx` | Create | New grouped sidebar navigation for Admin |
| `src/components/StaffSidebar.tsx` | Create | Simplified sidebar for Staff |
| `src/pages/Admin.tsx` | Modify | Replace Tabs with SidebarProvider layout, use AdminSidebar, translate all text |
| `src/pages/Staff.tsx` | Modify | Replace Tabs with SidebarProvider layout, use StaffSidebar, translate all text |

---

## Mobile Experience

### Mobile Navigation Flow
1. User sees hamburger icon (SidebarTrigger) in header
2. Tap opens Sheet from left side
3. Same grouped menu structure
4. Tap menu item → closes sheet + navigates to section
5. Content area takes full width

### Touch Optimizations
- Menu items: min-height 44px for touch targets
- Adequate padding (p-3) for finger taps
- Visual feedback on touch (active state)

---

## Accessibility Considerations

1. Keyboard navigation support via sidebar primitives
2. Screen reader labels for all menu items
3. Proper focus management when sidebar opens/closes
4. ARIA attributes for active state indication
5. High contrast notification badges

---

## Implementation Order

1. **Create AdminSidebar.tsx** - Build the sidebar component with all groups and menu items
2. **Refactor Admin.tsx** - Integrate sidebar, replace tabs with state-based rendering, translate UI
3. **Create StaffSidebar.tsx** - Build simplified staff version
4. **Refactor Staff.tsx** - Same treatment as Admin
5. **Test mobile responsiveness** - Verify sheet behavior and touch targets

---

## Technical Notes

### State Management
- `activeSection` state replaces tabs' internal state
- Sidebar state (expanded/collapsed) managed by SidebarProvider
- Mobile state (openMobile) handled automatically by Sidebar component

### Performance
- Content sections can be lazy-loaded with React.lazy if needed
- Badge counts already fetched via existing realtime subscriptions
- No additional API calls required

### Backward Compatibility
- URL paths remain unchanged
- Analytics link still navigates to `/admin/analytics`
- All existing functionality preserved

