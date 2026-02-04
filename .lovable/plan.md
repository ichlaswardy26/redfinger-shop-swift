
# Refactor Design Style: Shop Page & Ticket Conversation Modal

## Ringkasan

Melakukan refactoring design style pada dua komponen utama untuk meningkatkan visual appeal, interaktivitas, dan konsistensi dengan Neo-Brutalism Glassmorphism design system yang sudah ada.

---

## 1. Shop Page Refactor

### A. Header Section Enhancement

**Current Issues:**
- Header cukup bagus tapi bisa lebih impactful
- Quick stats cards bisa lebih integrated dengan design

**Refactoring:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  HEADER SECTION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🛒  Our Products                                         │  │
│  │      Premium cloud phone services                         │  │
│  │                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │  │
│  │  │  24     │  │  5      │  │  ⚡     │  ◄── Stat Cards   │  │
│  │  │Products │  │ Categories│ │In Stock │      with icons   │  │
│  │  └─────────┘  └─────────┘  └─────────┘                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Perubahan:**
- Tambah stat ketiga: "In Stock" count
- Stat cards dengan icon (Package, Layers, CheckCircle)
- Gradient overlay yang lebih subtle
- Responsive spacing improvements

### B. Category Filter Bar

**Current Issues:**
- Category buttons standar
- Child categories bisa lebih distinctive

**Refactoring:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  STICKY CATEGORY BAR                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [All ●24]  [Cloud ●12]  [Redmi ●8]  [Gaming ●4]        │   │
│  │                                                          │   │
│  │  ↳ Sub: [All Cloud] [Daily] [Weekly] [Monthly]          │   │
│  │                                                          │   │
│  │                    ✕ Clear filter                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Perubahan:                                                     │
│  - Pills dengan backdrop-blur glass effect                      │
│  - Active state dengan ring glow                                │
│  - Smooth transition animations                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Perubahan:**
- Glass effect pada bar container
- Active category dengan ring-2 ring-primary glow
- Badge count dengan bg-primary/20 styling
- Child categories dengan pills yang lebih kecil

### C. Product Grid Improvements

**Perubahan:**
- Grid gap yang lebih consistent
- Better empty state dengan ilustrasi
- Product count text lebih prominent
- Load more button dengan better styling

### D. File Changes untuk Store.tsx

**Line 466-520 (Header):**
- Tambah stat ketiga
- Icons untuk stats
- Better responsive classes

**Line 522-606 (Category Bar):**
- Glass effect container
- Ring glow untuk active state
- Smoother animations

---

## 2. Ticket Conversation Chat Modal Refactor

### A. Current Issues
- Basic chat bubbles tanpa visual polish
- Input area kurang engaging
- Missing avatar/initials
- Header bisa lebih informative

### B. New Design

```text
┌─────────────────────────────────────────────────────────────────┐
│  TICKET CONVERSATION MODAL                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ╔════════════════════════════════════════════════════╗ │   │
│  │  ║  📎 Original Attachment (if any)                   ║ │   │
│  │  ║  [Image Preview]                                   ║ │   │
│  │  ╚════════════════════════════════════════════════════╝ │   │
│  │                                                          │   │
│  │  ┌──── Messages Container with Glass Effect ─────────┐  │   │
│  │  │                                                    │  │   │
│  │  │     ┌────────────────────┐                        │  │   │
│  │  │     │  Staff Message     │ ◄── Left aligned       │  │   │
│  │  │     │  with avatar       │     with border-l-4    │  │   │
│  │  │     └────────────────────┘                        │  │   │
│  │  │                                                    │  │   │
│  │  │              ┌────────────────────┐               │  │   │
│  │  │              │  Your Message      │ ◄── Right     │  │   │
│  │  │              │  with gradient bg  │     aligned   │  │   │
│  │  │              └────────────────────┘               │  │   │
│  │  │                                                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  [Avatar] ┌──────────────────────────────┐ [Send] │  │   │
│  │  │           │ Type your message...          │        │  │   │
│  │  │           └──────────────────────────────┘        │  │   │
│  │  │  Enter to send • Shift+Enter for new line         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### C. Detailed Changes

#### Message Bubbles
```text
BEFORE:
- Basic rounded-xl
- Simple bg-primary atau bg-card

AFTER:
- Left messages: border-l-4 border-primary dengan bg-card
- Right messages: gradient bg-gradient-to-r from-primary to-primary/80
- Shadow-brutal-sm untuk depth
- Avatar circle dengan initials
- Message tail untuk direction indicator
```

#### Messages Container
```text
BEFORE:
- bg-muted/30 rounded-lg border

AFTER:
- bg-gradient-to-b from-muted/20 to-muted/40
- backdrop-blur-sm untuk glass effect
- border-2 border-border/30
- shadow-inner untuk depth
- Rounded-xl untuk softer look
```

#### Input Area
```text
BEFORE:
- Basic textarea + button

AFTER:
- Avatar circle di kiri
- Textarea dengan shadow-brutal-sm
- Send button dengan gradient primary
- Hover effects pada button
- Better disabled state
```

#### Empty State
```text
BEFORE:
- Plain text "No messages yet"

AFTER:
- Icon MessageSquare besar
- Engaging copy
- Subtle animation
```

### D. File Changes

#### TicketConversation.tsx (Lines 143-248)

**Attachment Preview (Lines 145-151):**
- Better card styling dengan shadow-brutal-sm
- Icon dengan background circle

**Messages Container (Lines 153-208):**
- Glass effect background
- Better empty state dengan icon
- Refined message bubble styling
- Avatar initials
- Border-l accent untuk left messages
- Gradient untuk right messages

**Input Area (Lines 210-247):**
- Avatar dengan initials
- Better textarea styling
- Gradient send button
- Improved disabled state for closed tickets

---

## 3. Transactions Page Dialog Update

### DialogContent untuk Ticket Conversation

**Current (Line 422):**
```tsx
<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
```

**Updated:**
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
```

**Changes:**
- Remove padding (`p-0`) untuk full-bleed design
- Inner container akan handle padding
- Better conversation area coverage

---

## Files yang Akan Dimodifikasi

| File | Aksi | Scope |
|------|------|-------|
| `src/pages/Store.tsx` | Modify | Lines 466-606 - Header & Category bar styling |
| `src/components/TicketConversation.tsx` | Modify | Lines 143-248 - Complete chat UI overhaul |
| `src/pages/Transactions.tsx` | Modify | Lines 419-446 - Dialog container styling |

---

## Design Tokens Used

**Shadows:**
- `shadow-brutal-sm` - Message bubbles, input
- `shadow-brutal` - Cards, buttons
- `shadow-inner` - Messages container

**Colors:**
- `bg-gradient-to-r from-primary to-primary/80` - Sent messages
- `border-l-4 border-primary` - Received messages accent
- `bg-muted/30 backdrop-blur-sm` - Glass containers

**Typography:**
- `font-bold` - Names
- `text-xs` - Timestamps, hints
- `text-sm` - Message content

**Spacing:**
- `gap-3` - Between messages
- `p-4` - Container padding
- `rounded-2xl` - Softer message bubbles
