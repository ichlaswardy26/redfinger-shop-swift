
# Complete Indonesian Translation Implementation

## Overview

This plan covers the translation of all remaining pages and components to Indonesian using the centralized `src/lib/translations.ts` file. The translation file already contains comprehensive Indonesian translations - we now need to apply them consistently across all UI.

---

## Current Translation Status

### Already Translated (Previously Completed)
- `src/pages/SignIn.tsx` - Auth translations applied
- `src/pages/SignUp.tsx` - Auth translations applied
- `src/pages/ForgotPassword.tsx` - Auth translations applied
- `src/pages/ResetPassword.tsx` - Auth translations applied
- `src/pages/NotFound.tsx` - UI translations applied
- `src/components/CopyButton.tsx` - Action translations applied
- `src/components/VoucherInput.tsx` - Voucher translations applied
- `src/components/AvailableVouchersList.tsx` - Voucher suggestions translated

### Still Using English (Needs Translation)
- **Pages**: Index.tsx, Store.tsx, Transactions.tsx, Analytics.tsx
- **Components**: ProductCard.tsx, OrderCard.tsx, OrderConfirmationDialog.tsx, TrustIndicators.tsx, FAQSection.tsx, FloatingChatButton.tsx, TicketDialog.tsx, RatingDialog.tsx, Navbar.tsx, and others

---

## Implementation Plan

### Phase 1: Core Public Pages

#### 1.1 Update Index.tsx (Landing Page)
Add import and translate all hardcoded English text:

| Current English | Indonesian Translation |
|-----------------|------------------------|
| "Our Plans" | settings.products.title (from web_settings) |
| "days" | `{t.products.daysValidity}` |
| "Instant Digital Delivery" | `{t.products.instantDelivery}` |
| "24/7 Support" | `{t.trust.support24_7}` |
| "/day" | `{t.products.perDay}` |
| "View All Plans" | `{t.store.title}` (Lihat Semua Paket) |
| "BEST" (ribbon) | `{t.products.bestSeller}` |

**Note**: Most landing page content comes from `web_settings` database, which admin can customize. Only fallback defaults need translation.

#### 1.2 Update Store.tsx (Shop Page)
```typescript
// Add import
import { t } from "@/lib/translations";

// Translations needed:
"All" → t.ui.all
"Products" → t.store.products
"Total Products" → t.store.stats.totalProducts
"Categories" → t.store.stats.categories
"Happy Customers" → t.store.stats.happyCustomers
"All Products" → t.store.allProducts
"Load More" → t.store.loadMore
"Showing X of Y" → `${t.store.showing} ${count} ${t.store.of} ${total}`
"Authentication required" → (add to translations)
"Please sign in to purchase" → (add to translations)
"Insufficient stock" → t.status.lowStock
"Out of stock" → t.status.outOfStock
"Order created successfully!" → t.checkout.orderCreated
```

#### 1.3 Update Transactions.tsx (My Orders Page)
```typescript
// Translations needed:
"My Dashboard" → t.transactions.myDashboard
"My Support Tickets" → t.tickets.myTickets
"View and track your support requests" → t.tickets.viewTrack
"Created:" → t.tickets.created
"Resolved:" → t.tickets.resolved
"My Orders" → t.transactions.title
"View and manage your orders" → t.transactions.subtitle
"Search by product or status..." → t.transactions.searchPlaceholder
"Show:" → t.transactions.show
"No orders yet..." → t.transactions.noOrdersDesc
"No orders match your search" → t.transactions.noOrdersMatch
"First" → t.table.first
"Last" → t.table.last
"Page X of Y" → `${t.ui.page} ${page} ${t.ui.ofPages} ${total}`
"Upload Payment Proof" → t.transactions.uploadPaymentProof
"Payment Proof Image" → t.transactions.paymentProofImage
"Upload Proof" → t.transactions.uploadProofButton
"Success" → t.toasts.success
"Payment proof uploaded successfully" → t.transactions.proofUploadedSuccess
"Order cancelled" → t.transactions.orderCancelled
"Are you sure you want to cancel this order?" → t.transactions.confirmCancelOrder
```

---

### Phase 2: Key UI Components

#### 2.1 Update ProductCard.tsx
```typescript
// Add import
import { t } from "@/lib/translations";

// Translations:
"Best Seller" / "Top" → t.products.bestSeller
"New" → t.products.new
"Save X%" → `${t.products.savePercent} ${percent}%`
"Available" / "Out of Stock" → t.status.available / t.status.outOfStock
"days validity" → t.products.daysValidity
"Digital Redeem Code" → t.products.digitalRedeemCode
"Instant Delivery" → t.products.instantDelivery
"Only X left!" → `${t.products.onlyLeft} ${count}!`
"Low stock - X remaining" → `${t.status.lowStock} - ${count} ${t.stockManagement.inStock}`
"/day" → t.products.perDay
"Sign In to Purchase" → t.products.signInToPurchase
"Out of Stock" → t.products.outOfStock
"Purchase Now" / "Purchase (xN)" → t.products.purchaseNow
```

#### 2.2 Update OrderCard.tsx
```typescript
// Translations:
"Quantity:" → `${t.orders.quantity}:`
"days" → (use duration_days directly)
"Order Date" → t.orders.orderCreated
"Expires" → t.status.expired
"Redeem Codes:" → `${t.orders.redeemCodes}:`
"Download TXT" → t.actions.download
"codes available..." → `{count} ${t.codeInventory.code.toLowerCase()} ${t.status.available.toLowerCase()}`
"Rejection Reason:" → `${t.orders.rejectionReason}:`
"Support Ticket" → t.tickets.title
"QRIS Expired" → "QRIS Kedaluwarsa"
"Waiting for QRIS Payment" → "Menunggu Pembayaran QRIS"
"Expires" → t.status.expired
"Rate" → t.ratings.rateProduct
"Redeem" → "Redeem" (keep as-is, brand name)
"Upload" → t.actions.upload
"Cancel" → t.actions.cancel
"Pay Now" → "Bayar Sekarang"
"Check" → "Cek"
"New QR" → "QR Baru"
"Create Ticket" → t.tickets.createTicket
```

#### 2.3 Update OrderConfirmationDialog.tsx
```typescript
// Translations:
"Confirm Your Order" → t.checkout.title
"Review your order details..." → (add to translations)
"Product:" → `${t.checkout.product}:`
"Duration:" → `${t.products.duration}:`
"Quantity:" → `${t.checkout.quantity}:`
"Price per item:" → `${t.checkout.unitPrice}:`
"Subtotal:" → `${t.checkout.subtotal}:`
"Discount" → `${t.checkout.discount}`
"Total:" → `${t.checkout.total}:`
"Payment Method" → t.checkout.paymentMethod
"Bank Transfer (Manual)" → "Transfer Bank (Manual)"
"Transfer and upload payment proof..." → "Transfer dan unggah bukti pembayaran untuk verifikasi"
"QRIS (Instant)" → "QRIS (Instan)"
"Recommended" → "Disarankan"
"Pay with any e-wallet..." → "Bayar dengan e-wallet apapun (GoPay, OVO, DANA, dll.)"
"Next Steps:" → "Langkah Selanjutnya:"
(step instructions) → Full Indonesian translation
"Cancel" → t.actions.cancel
"Creating Order..." → t.checkout.creatingOrder
"Pay Rp X" → `Bayar Rp ${amount}`
"Confirm Order - Rp X" → `${t.actions.confirm} ${t.orders.title} - Rp ${amount}`
```

#### 2.4 Update TrustIndicators.tsx
```typescript
// Translations:
"Happy Customers" → t.store.stats.happyCustomers
"Orders Completed" → "Pesanan Selesai"
"Average Rating" → "Rata-rata Penilaian"
"Success Rate" → "Tingkat Keberhasilan"
```

#### 2.5 Update FAQSection.tsx
```typescript
// Translations for default FAQs:
"What is a Cloud Phone?" → "Apa itu Cloud Phone?"
"How do I redeem my code?" → "Bagaimana cara menukarkan kode saya?"
"What payment methods..." → "Metode pembayaran apa yang diterima?"
(all default FAQ content translated to Indonesian)
```

#### 2.6 Update FloatingChatButton.tsx
```typescript
// Translations:
"Chat with us" → t.chat.chatWithUs
```

#### 2.7 Update TicketDialog.tsx
```typescript
// Translations:
"Create Support Ticket" → t.tickets.createTicket
"Describe your issue..." → "Jelaskan masalah Anda dan kami akan membantu menyelesaikannya"
"Subject" → t.tickets.subject
"Brief description of the issue" → "Deskripsi singkat masalah"
"characters" → "karakter"
"Description" → t.tickets.description
"Please provide detailed..." → "Mohon berikan informasi detail tentang masalah Anda"
"Attachment (optional)" → `${t.tickets.attachment} (${t.ui.optional})`
"Supported: JPG, PNG..." → "Didukung: JPG, PNG, MP4, WebM, MOV, PDF (maks 10MB)"
"Choose file" → "Pilih file"
"Cancel" → t.actions.cancel
"Submitting..." → "Mengirim..."
"Submit Ticket" → t.actions.submit
"Ticket created" → t.tickets.ticketCreated
"Your support ticket has been submitted..." → "Tiket dukungan Anda berhasil dikirim"
"Rate Limit Exceeded" → "Batas Pengiriman Tercapai"
"You can only create 5 tickets per hour..." → "Anda hanya dapat membuat 5 tiket per jam. Silakan coba lagi nanti."
```

#### 2.8 Update RatingDialog.tsx
```typescript
// Translations:
"Your Rating" → t.ratings.yourRating
"Rate {productName}" → `${t.ratings.rateProduct} ${productName}`
"You have already rated..." → "Anda sudah memberikan penilaian untuk produk ini. Penilaian tidak dapat diubah."
"Share your experience..." → "Bagikan pengalaman Anda dengan produk ini"
"Review (optional)" → `${t.ratings.review} (${t.ui.optional})`
"Tell us about your experience..." → "Ceritakan pengalaman Anda..."
"characters" → "karakter"
"Close" → t.actions.close
"Submitting..." → "Mengirim..."
"Submit Rating" → t.ratings.submitRating
"Please select a rating" → "Silakan pilih penilaian"
"You have already rated..." → "Anda sudah memberikan penilaian untuk produk ini."
"You must be logged in..." → "Anda harus masuk untuk memberikan penilaian"
"Thank you for your rating!" → t.ratings.thankYou
"Failed to submit rating" → "Gagal mengirim penilaian"
```

#### 2.9 Update Navbar.tsx
```typescript
// Translations:
"Store" → t.nav.store
"My Orders" → t.nav.myOrders
"Staff" → t.nav.staff
"Admin" → t.nav.admin
"Sign In" → t.nav.signIn
"Sign Up" → t.nav.signUp
"Sign Out" → t.nav.signOut
```

---

### Phase 3: Additional Components

#### 3.1 DataTableFilters.tsx
- Search placeholder → t.table.search
- Filter labels → t.table.filter
- Reset → t.table.reset
- Export → t.table.export
- Active filters → t.table.activeFilters

#### 3.2 DataTablePagination.tsx
- "Showing X of Y entries" → `${t.table.showing} ${start}-${end} ${t.table.of} ${total} ${t.table.entries}`
- First/Last/Previous/Next → t.table.first/last/previous/next

#### 3.3 QRPaymentDialog.tsx
- Payment instructions → Indonesian
- "Scan QR code..." → "Pindai kode QR untuk membayar"
- Payment deadline labels → Indonesian

#### 3.4 BulkVoucherGeneratorDialog.tsx
- All voucher generation labels → t.vouchers.bulk.*

#### 3.5 VoucherManager.tsx
- Management labels → t.vouchers.*
- Form fields → Indonesian

#### 3.6 VoucherAnalytics.tsx
- Analytics labels → t.vouchers.analyticsLabels.*

---

### Phase 4: Update translations.ts with Missing Keys

Add any missing translation keys discovered during implementation:

```typescript
// Add to auth section
auth: {
  ...existing,
  authRequired: "Autentikasi diperlukan",
  pleaseSignIn: "Silakan masuk untuk melanjutkan",
}

// Add to store section
store: {
  ...existing,
  viewAllPlans: "Lihat Semua Paket",
}

// Add to transactions section
transactions: {
  ...existing,
  myDashboard: "Dasbor Saya",
  noOrdersMatch: "Tidak ada pesanan yang cocok dengan pencarian Anda.",
  searchPlaceholder: "Cari berdasarkan produk atau status...",
  show: "Tampilkan",
  page: "Halaman",
  first: "Pertama",
  last: "Terakhir",
}

// Add to checkout section
checkout: {
  ...existing,
  reviewDetails: "Tinjau detail pesanan Anda sebelum melanjutkan ke pembayaran",
  nextSteps: "Langkah Selanjutnya",
  recommended: "Disarankan",
  payNow: "Bayar Sekarang",
  confirmOrderAmount: "Konfirmasi Pesanan",
}

// Add to trust section
trust: {
  ...existing,
  ordersCompleted: "Pesanan Selesai",
  averageRating: "Rata-rata Penilaian",
  successRate: "Tingkat Keberhasilan",
}
```

---

## Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `src/lib/translations.ts` | Add missing keys | High |
| `src/pages/Index.tsx` | Apply translations | High |
| `src/pages/Store.tsx` | Apply translations | High |
| `src/pages/Transactions.tsx` | Apply translations | High |
| `src/components/ProductCard.tsx` | Apply translations | High |
| `src/components/OrderCard.tsx` | Apply translations | High |
| `src/components/OrderConfirmationDialog.tsx` | Apply translations | High |
| `src/components/TrustIndicators.tsx` | Apply translations | Medium |
| `src/components/FAQSection.tsx` | Apply translations (defaults) | Medium |
| `src/components/FloatingChatButton.tsx` | Apply translations | Medium |
| `src/components/TicketDialog.tsx` | Apply translations | Medium |
| `src/components/RatingDialog.tsx` | Apply translations | Medium |
| `src/components/Navbar.tsx` | Apply translations | High |
| `src/components/DataTableFilters.tsx` | Apply translations | Medium |
| `src/components/DataTablePagination.tsx` | Apply translations | Medium |
| `src/components/QRPaymentDialog.tsx` | Apply translations | Medium |
| `src/components/VoucherManager.tsx` | Apply translations | Low |
| `src/components/VoucherAnalytics.tsx` | Apply translations | Low |
| `src/components/BulkVoucherGeneratorDialog.tsx` | Apply translations | Low |

---

## Implementation Order

1. **First**: Update `translations.ts` with all missing keys
2. **Second**: Translate core pages (Index, Store, Transactions)
3. **Third**: Translate key components (ProductCard, OrderCard, OrderConfirmationDialog, Navbar)
4. **Fourth**: Translate secondary components (TrustIndicators, FAQSection, dialogs)
5. **Fifth**: Translate admin/staff components (VoucherManager, analytics)

---

## Estimated Changes

- **translations.ts**: ~50 new translation keys
- **Pages**: 3 files (~300 string replacements)
- **Components**: 15+ files (~400 string replacements)
- **Total**: ~700 hardcoded English strings → Indonesian
