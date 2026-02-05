

# Comprehensive Enhancement Plan

This plan implements three major improvements in a structured sequence: voucher feature refinements, admin/staff UI refactoring with modern sidebar navigation, and complete Indonesian language translation with enhanced UI/UX throughout.

---

## Phase 1: Voucher Suggestions Refinements

### 1.1 Add Empty State to AvailableVouchersList

**File: `src/components/AvailableVouchersList.tsx`**

Current behavior returns `null` when no vouchers. Add a friendly empty state:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  EMPTY STATE DESIGN                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🏷️ Voucher                                                       │  │
│  │                                                                    │  │
│  │      ┌─────────────────────────────────────────────────────────┐  │  │
│  │      │      [ Tag Icon with dashed border ]                     │  │  │
│  │      │                                                          │  │  │
│  │      │   Belum ada voucher yang tersedia                        │  │  │
│  │      │   untuk pesanan ini saat ini.                            │  │  │
│  │      │                                                          │  │  │
│  │      │   Cek promo kami secara berkala!                         │  │  │
│  │      └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Add Caching to useAvailableVouchers

**File: `src/hooks/useAvailableVouchers.ts`**

Add response caching with 30-second TTL and skip refetch if order amount change is less than 5%:

- Add `lastFetchParams` ref to track previous fetch parameters
- Add `cachedResponse` ref with timestamp
- Skip API call if cache is valid (within 30 seconds) and parameters are similar
- Only refetch when order amount changes by more than 5%

---

## Phase 2: Admin/Staff UI Refactoring

### 2.1 New Sidebar Navigation Component

**New File: `src/components/AdminSidebar.tsx`**

Create a grouped sidebar navigation replacing the horizontal tabs:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMIN SIDEBAR LAYOUT (Desktop)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │                 │  │                                                │ │
│  │  ┌───────────┐  │  │  Main Content Area                            │ │
│  │  │ Site Name │  │  │                                                │ │
│  │  └───────────┘  │  │  Dashboard / Orders / Products / etc.         │ │
│  │                 │  │                                                │ │
│  │  IKHTISAR       │  │                                                │ │
│  │  ────────────   │  │                                                │ │
│  │  ◉ Dasbor       │  │                                                │ │
│  │  ○ Analitik     │  │                                                │ │
│  │                 │  │                                                │ │
│  │  PRODUK         │  │                                                │ │
│  │  ────────────   │  │                                                │ │
│  │  ○ Produk       │  │                                                │ │
│  │  ○ Kategori     │  │                                                │ │
│  │  ○ Kode         │  │                                                │ │
│  │  ○ Voucher      │  │                                                │ │
│  │                 │  │                                                │ │
│  │  OPERASIONAL    │  │                                                │ │
│  │  ────────────   │  │                                                │ │
│  │  ○ Pesanan (12) │  │                                                │ │
│  │  ○ Tiket (5)    │  │                                                │ │
│  │  ○ Ulasan       │  │                                                │ │
│  │                 │  │                                                │ │
│  │  SISTEM         │  │                                                │ │
│  │  ────────────   │  │                                                │ │
│  │  ○ Pengguna     │  │                                                │ │
│  │  ○ Pengaturan   │  │                                                │ │
│  │                 │  │                                                │ │
│  └─────────────────┘  └───────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

Features:
- Grouped navigation by category (Ikhtisar, Produk, Operasional, Sistem)
- Active state highlighting with left border accent
- Notification badges for pending items (orders, tickets)
- Collapsible for mobile using Sheet component
- Animated transitions using framer-motion
- Sticky positioning with glass effect

### 2.2 Staff Sidebar Component

**New File: `src/components/StaffSidebar.tsx`**

Simpler version for staff with limited menu items:
- Tiket (with open count badge)
- Pesanan (with pending count badge)
- Ulasan
- Stok Produk

### 2.3 Refactor Admin.tsx

**File: `src/pages/Admin.tsx`**

- Replace horizontal `Tabs` with `SidebarProvider` layout
- Use new `AdminSidebar` component
- Split into sidebar + main content area
- State-based content rendering instead of TabsContent
- Mobile: Sheet drawer for navigation
- Add breadcrumb for current section

### 2.4 Refactor Staff.tsx

**File: `src/pages/Staff.tsx`**

- Apply similar sidebar treatment
- Add descriptive empty states with icons
- Improve mobile navigation with Sheet drawer
- Add role-based messaging in header

---

## Phase 3: Indonesian Language Translation

### 3.1 Create Centralized Translation File

**New File: `src/lib/translations.ts`**

Comprehensive Indonesian translation object covering all UI text:

```typescript
export const t = {
  // Navigation
  nav: {
    home: "Beranda",
    store: "Toko",
    myOrders: "Pesanan Saya",
    admin: "Admin",
    staff: "Staf",
    signIn: "Masuk",
    signUp: "Daftar",
    signOut: "Keluar",
  },
  
  // Common Actions
  actions: {
    apply: "Terapkan",
    cancel: "Batal",
    save: "Simpan",
    delete: "Hapus",
    edit: "Ubah",
    create: "Buat",
    add: "Tambah",
    upload: "Unggah",
    download: "Unduh",
    search: "Cari",
    filter: "Filter",
    export: "Ekspor",
    verify: "Verifikasi",
    reject: "Tolak",
    close: "Tutup",
    confirm: "Konfirmasi",
    back: "Kembali",
    next: "Selanjutnya",
    previous: "Sebelumnya",
    loading: "Memuat...",
    submit: "Kirim",
    copy: "Salin",
    copied: "Tersalin!",
    toggle: "Ubah",
    view: "Lihat",
    preview: "Pratinjau",
    refresh: "Segarkan",
    reset: "Reset",
    clear: "Hapus",
    select: "Pilih",
    selectAll: "Pilih Semua",
    generate: "Buat",
    activate: "Aktifkan",
    deactivate: "Nonaktifkan",
  },
  
  // Status Labels
  status: {
    pending: "Menunggu",
    verified: "Terverifikasi",
    rejected: "Ditolak",
    active: "Aktif",
    inactive: "Nonaktif",
    open: "Buka",
    inProgress: "Diproses",
    resolved: "Selesai",
    closed: "Ditutup",
    cancelled: "Dibatalkan",
    expired: "Kedaluwarsa",
    used: "Terpakai",
    available: "Tersedia",
    outOfStock: "Habis",
    lowStock: "Stok Rendah",
  },
  
  // Auth pages
  auth: {
    signIn: "Masuk",
    signUp: "Daftar",
    signOut: "Keluar",
    email: "Email",
    password: "Kata Sandi",
    confirmPassword: "Konfirmasi Kata Sandi",
    fullName: "Nama Lengkap",
    forgotPassword: "Lupa kata sandi?",
    resetPassword: "Atur Ulang Kata Sandi",
    welcomeBack: "Selamat datang kembali!",
    createAccount: "Buat Akun",
    signInSuccess: "Anda berhasil masuk.",
    signOutSuccess: "Anda berhasil keluar.",
    signInDescription: "Selamat datang kembali! Masuk ke akun Anda untuk melanjutkan.",
    signUpDescription: "Buat akun baru untuk mulai berbelanja.",
    noAccount: "Belum punya akun?",
    hasAccount: "Sudah punya akun?",
    backToStore: "Kembali ke toko",
    termsAgree: "Saya setuju dengan",
    termsOfService: "Syarat Layanan",
    and: "dan",
    privacyPolicy: "Kebijakan Privasi",
    passwordRequirements: {
      title: "Kata sandi harus memiliki:",
      length: "Minimal 6 karakter",
      uppercase: "Minimal 1 huruf besar",
      lowercase: "Minimal 1 huruf kecil",
      number: "Minimal 1 angka",
    },
    errors: {
      invalidEmail: "Alamat email tidak valid",
      passwordTooShort: "Kata sandi minimal 6 karakter",
      passwordMismatch: "Kata sandi tidak cocok",
      invalidCredentials: "Email atau kata sandi salah",
      emailRequired: "Email diperlukan",
      passwordRequired: "Kata sandi diperlukan",
    },
    resetPasswordSent: "Link reset kata sandi telah dikirim ke email Anda.",
    newPassword: "Kata Sandi Baru",
    updatePassword: "Perbarui Kata Sandi",
    passwordUpdated: "Kata sandi berhasil diperbarui!",
  },
  
  // Admin sections
  admin: {
    title: "Panel Admin",
    subtitle: "Kelola toko dan pengguna Anda",
    sections: {
      dashboard: "Dasbor",
      analytics: "Analitik",
      orders: "Pesanan",
      products: "Produk",
      categories: "Kategori",
      codeInventory: "Inventaris Kode",
      vouchers: "Voucher",
      users: "Pengguna",
      tickets: "Tiket",
      ratings: "Ulasan",
      settings: "Pengaturan",
    },
    groups: {
      overview: "Ikhtisar",
      productManagement: "Manajemen Produk",
      operations: "Operasional",
      system: "Sistem",
    },
    stats: {
      totalOrders: "Total Pesanan",
      pendingPayments: "Menunggu Pembayaran",
      verifiedOrders: "Pesanan Terverifikasi",
      totalUsers: "Total Pengguna",
      totalRevenue: "Total Pendapatan",
    },
    bulkVerify: "Verifikasi Massal",
    recentActivity: "Aktivitas Terbaru",
    latestOrders: "Pesanan terbaru",
  },
  
  // Staff sections
  staff: {
    title: "Panel Staf",
    subtitle: "Kelola tiket dan pesanan yang ditugaskan",
    assignedTickets: "Tiket yang Ditugaskan",
    assignedOrders: "Pesanan Terkait",
    noAssignedTasks: "Belum ada tugas yang ditugaskan kepada Anda",
    noAssignedTasksDesc: "Tugas akan muncul di sini saat Anda ditugaskan untuk menangani tiket atau pesanan.",
  },
  
  // Orders
  orders: {
    title: "Manajemen Pesanan",
    subtitle: "Verifikasi pembayaran dan terbitkan kode redeem",
    orderDetails: "Detail Pesanan",
    paymentProof: "Bukti Pembayaran",
    redeemCodes: "Kode Redeem",
    adminNotes: "Catatan Admin",
    verifyPayment: "Verifikasi Pembayaran",
    rejectPayment: "Tolak Pembayaran",
    rejectionReason: "Alasan Penolakan",
    orderCreated: "Pesanan Dibuat",
    orderVerified: "Pesanan Diverifikasi",
    quantity: "Jumlah",
    totalAmount: "Total",
    finalAmount: "Jumlah Akhir",
    discountAmount: "Diskon",
    noOrdersFound: "Tidak ada pesanan ditemukan",
    searchPlaceholder: "Cari pesanan...",
  },
  
  // Products
  products: {
    title: "Manajemen Produk",
    subtitle: "Tambah, edit, atau hapus produk",
    addProduct: "Tambah Produk",
    editProduct: "Edit Produk",
    productName: "Nama Produk",
    description: "Deskripsi",
    price: "Harga",
    duration: "Durasi (Hari)",
    stock: "Stok",
    category: "Kategori",
    manageStock: "Kelola Stok",
    stockHistory: "Riwayat Stok",
    noProductsFound: "Tidak ada produk ditemukan",
    perDay: "per hari",
    instantDelivery: "Pengiriman Digital Instan",
    fullSupport: "Dukungan Pelanggan Penuh",
    securePurchase: "Pembelian Aman",
    bestSeller: "Terlaris",
    new: "Baru",
    popular: "Populer",
    limitedStock: "Stok Terbatas",
    onlyLeft: "Tersisa",
    outOfStock: "Habis",
    savePercent: "Hemat",
  },
  
  // Categories
  categories: {
    title: "Manajemen Kategori",
    subtitle: "Kelola kategori produk",
    addCategory: "Tambah Kategori",
    editCategory: "Edit Kategori",
    categoryName: "Nama Kategori",
    parentCategory: "Kategori Induk",
    displayOrder: "Urutan Tampilan",
    noParent: "Tanpa Induk",
    noCategoriesFound: "Tidak ada kategori ditemukan",
  },
  
  // Code Inventory
  codeInventory: {
    title: "Inventaris Kode",
    subtitle: "Kelola kode redeem untuk produk",
    addCodes: "Tambah Kode",
    importCodes: "Impor Kode",
    availableCodes: "Kode Tersedia",
    usedCodes: "Kode Terpakai",
    code: "Kode",
    usedAt: "Digunakan Pada",
    usedBy: "Digunakan Oleh",
    noCodesFound: "Tidak ada kode ditemukan",
  },
  
  // Vouchers
  vouchers: {
    title: "Manajemen Voucher",
    subtitle: "Buat dan kelola voucher diskon",
    management: "Manajemen",
    analytics: "Analitik",
    addVoucher: "Buat Voucher",
    editVoucher: "Edit Voucher",
    bulkGenerate: "Buat Massal",
    voucherCode: "Kode Voucher",
    voucherName: "Nama Voucher",
    discountType: "Tipe Diskon",
    discountValue: "Nilai Diskon",
    percentage: "Persentase",
    fixed: "Nominal Tetap",
    minOrder: "Minimum Pesanan",
    maxDiscount: "Maksimum Diskon",
    usageLimit: "Batas Penggunaan",
    perUserLimit: "Batas Per Pengguna",
    validFrom: "Berlaku Dari",
    validUntil: "Berlaku Hingga",
    appliesTo: "Berlaku Untuk",
    allProducts: "Semua Produk",
    specificProduct: "Produk Tertentu",
    specificCategory: "Kategori Tertentu",
    firstOrderOnly: "Hanya Pesanan Pertama",
    usageCount: "Penggunaan",
    campaign: "Kampanye",
    noVouchersFound: "Tidak ada voucher ditemukan",
    suggestions: {
      title: "Voucher tersedia untuk Anda",
      loading: "Memuat voucher tersedia...",
      empty: "Belum ada voucher yang tersedia untuk pesanan ini saat ini.",
      emptyHint: "Cek promo kami secara berkala!",
      bestValue: "Nilai Terbaik",
      expiresIn: "berakhir dalam",
      expiresInDays: "hari lagi",
      expiresToday: "Berakhir hari ini",
      save: "Hemat",
      apply: "Terapkan",
    },
    bulk: {
      title: "Buat Voucher Massal",
      campaignName: "Nama Kampanye",
      numberOfVouchers: "Jumlah Voucher",
      codePattern: "Pola Kode",
      prefixRandom: "Awalan + Acak",
      sequential: "Berurutan",
      fullRandom: "Acak Penuh",
      codeLength: "Panjang Kode",
      prefix: "Awalan",
      preview: "Pratinjau",
      singleUse: "Setiap kode sekali pakai",
      generating: "Membuat Voucher...",
      generated: "voucher dibuat",
      downloadCSV: "Unduh CSV",
      copyAllCodes: "Salin Semua Kode",
      generationComplete: "Pembuatan Selesai!",
    },
    analyticsLabels: {
      totalRedemptions: "Total Penukaran",
      totalSavings: "Total Penghematan",
      conversionRate: "Tingkat Konversi",
      avgDiscount: "Rata-rata Diskon",
      usageTrends: "Tren Penggunaan",
      topPerforming: "Voucher Terbaik",
      campaignPerformance: "Performa Kampanye",
      discountDistribution: "Distribusi Diskon",
      ordersComparison: "Perbandingan Pesanan",
      withVoucher: "Dengan Voucher",
      withoutVoucher: "Tanpa Voucher",
      avgOrderValue: "Rata-rata Nilai Pesanan",
      dateRange: "Rentang Tanggal",
      last7Days: "7 Hari Terakhir",
      last30Days: "30 Hari Terakhir",
      last90Days: "90 Hari Terakhir",
      allTime: "Semua Waktu",
      noDataAvailable: "Belum ada data voucher",
      noDataHint: "Mulai buat voucher dan promosikan untuk melihat analitik di sini.",
    },
  },
  
  // Users
  users: {
    title: "Manajemen Pengguna",
    subtitle: "Kelola akun pengguna dan peran",
    fullName: "Nama Lengkap",
    email: "Email",
    role: "Peran",
    roles: {
      admin: "Admin",
      staff: "Staf",
      customer: "Pelanggan",
    },
    toggleRole: "Ubah Peran",
    toggleStatus: "Ubah Status",
    deleteUser: "Hapus Pengguna",
    confirmDelete: "Apakah Anda yakin ingin menghapus pengguna ini?",
    noUsersFound: "Tidak ada pengguna ditemukan",
  },
  
  // Tickets
  tickets: {
    title: "Tiket Dukungan",
    subtitle: "Kelola tiket dukungan pelanggan",
    createTicket: "Buat Tiket",
    subject: "Subjek",
    description: "Deskripsi",
    status: "Status",
    attachment: "Lampiran",
    conversation: "Percakapan",
    reply: "Balas",
    sendReply: "Kirim Balasan",
    noTicketsFound: "Tidak ada tiket ditemukan",
    ticketCreated: "Tiket berhasil dibuat",
    replyPlaceholder: "Tulis balasan Anda...",
    statuses: {
      open: "Buka",
      in_progress: "Diproses",
      resolved: "Selesai",
      closed: "Ditutup",
    },
  },
  
  // Ratings
  ratings: {
    title: "Ulasan Produk",
    subtitle: "Kelola ulasan pelanggan",
    rating: "Penilaian",
    review: "Ulasan",
    visible: "Terlihat",
    hidden: "Tersembunyi",
    toggleVisibility: "Ubah Visibilitas",
    noRatingsFound: "Tidak ada ulasan ditemukan",
    rateProduct: "Beri Penilaian",
    yourRating: "Penilaian Anda",
    writeReview: "Tulis ulasan (opsional)",
    submitRating: "Kirim Penilaian",
    thankYou: "Terima kasih atas penilaian Anda!",
  },
  
  // Settings
  settings: {
    title: "Pengaturan",
    subtitle: "Konfigurasi pengaturan toko",
    webSettings: "Pengaturan Web",
    businessRules: "Aturan Bisnis",
    siteIdentity: "Identitas Situs",
    siteName: "Nama Situs",
    siteTagline: "Tagline",
    siteDescription: "Deskripsi",
    headerSettings: "Pengaturan Header",
    heroSection: "Bagian Hero",
    featuresSection: "Bagian Fitur",
    contactInfo: "Informasi Kontak",
    socialMedia: "Media Sosial",
    footerSettings: "Pengaturan Footer",
    faqSettings: "Pengaturan FAQ",
    saveSettings: "Simpan Pengaturan",
    settingsSaved: "Pengaturan berhasil disimpan",
  },
  
  // Store
  store: {
    title: "Toko",
    allProducts: "Semua Produk",
    filterByCategory: "Filter berdasarkan kategori",
    noProductsFound: "Tidak ada produk ditemukan",
    loadMore: "Muat Lebih Banyak",
    showing: "Menampilkan",
    of: "dari",
    products: "produk",
    sortBy: "Urutkan",
    priceLowest: "Harga Terendah",
    priceHighest: "Harga Tertinggi",
    newest: "Terbaru",
    popular: "Populer",
    stats: {
      totalProducts: "Total Produk",
      categories: "Kategori",
      happyCustomers: "Pelanggan Puas",
    },
  },
  
  // Checkout / Order Confirmation
  checkout: {
    title: "Konfirmasi Pesanan",
    orderSummary: "Ringkasan Pesanan",
    product: "Produk",
    quantity: "Jumlah",
    unitPrice: "Harga Satuan",
    subtotal: "Subtotal",
    discount: "Diskon",
    total: "Total",
    paymentMethod: "Metode Pembayaran",
    qris: "QRIS",
    manualTransfer: "Transfer Manual",
    uploadPaymentProof: "Unggah Bukti Pembayaran",
    proceedToPayment: "Lanjutkan ke Pembayaran",
    placeOrder: "Buat Pesanan",
    creatingOrder: "Membuat pesanan...",
    orderCreated: "Pesanan berhasil dibuat!",
    orderCreatedDesc: "Silakan selesaikan pembayaran Anda.",
    scanQR: "Pindai kode QR untuk membayar",
    paymentDeadline: "Batas waktu pembayaran",
    checkPaymentStatus: "Cek Status Pembayaran",
    paymentVerified: "Pembayaran Terverifikasi!",
    waitingForPayment: "Menunggu Pembayaran",
    uploadProof: "Unggah Bukti",
    proofUploaded: "Bukti Diunggah",
    waitingVerification: "Menunggu verifikasi dari admin",
  },
  
  // Transactions / My Orders
  transactions: {
    title: "Pesanan Saya",
    subtitle: "Lihat riwayat pesanan dan status Anda",
    noOrders: "Belum ada pesanan",
    noOrdersDesc: "Anda belum membuat pesanan apapun.",
    browseStore: "Jelajahi Toko",
    orderDetails: "Detail Pesanan",
    viewRedeemCodes: "Lihat Kode Redeem",
    goToRedeemSite: "Kunjungi Situs Redeem",
    createSupportTicket: "Buat Tiket Dukungan",
    ticketLinked: "Tiket Terhubung",
    rateProduct: "Beri Penilaian",
    cancelOrder: "Batalkan Pesanan",
    confirmPayment: "Konfirmasi Pembayaran",
    paymentStatuses: {
      pending: "Menunggu Pembayaran",
      verified: "Terverifikasi",
      rejected: "Ditolak",
    },
    orderStatuses: {
      active: "Aktif",
      expired: "Kedaluwarsa",
      cancelled: "Dibatalkan",
      rejected: "Ditolak",
    },
  },
  
  // Common UI elements
  ui: {
    loading: "Memuat...",
    error: "Terjadi kesalahan",
    retry: "Coba Lagi",
    noData: "Tidak ada data",
    noResults: "Tidak ada hasil",
    searchPlaceholder: "Cari...",
    selectOption: "Pilih opsi",
    optional: "opsional",
    required: "wajib",
    all: "Semua",
    none: "Tidak Ada",
    yes: "Ya",
    no: "Tidak",
    or: "atau",
    and: "dan",
    from: "dari",
    to: "ke",
    date: "Tanggal",
    time: "Waktu",
    dateRange: "Rentang Tanggal",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Akhir",
    page: "Halaman",
    ofPages: "dari",
    rowsPerPage: "Baris per halaman",
    showingResults: "Menampilkan",
    results: "hasil",
    items: "item",
    accessDenied: "Akses Ditolak",
    accessDeniedDesc: "Anda tidak memiliki izin untuk mengakses halaman ini",
    pageNotFound: "Halaman Tidak Ditemukan",
    pageNotFoundDesc: "Halaman yang Anda cari tidak ada.",
    goHome: "Kembali ke Beranda",
  },
  
  // Toast messages
  toasts: {
    success: "Berhasil",
    error: "Kesalahan",
    warning: "Peringatan",
    info: "Informasi",
    saved: "Tersimpan",
    deleted: "Terhapus",
    updated: "Diperbarui",
    created: "Dibuat",
    copied: "Tersalin ke clipboard",
    uploadSuccess: "File berhasil diunggah",
    uploadError: "Gagal mengunggah file",
    networkError: "Kesalahan jaringan. Silakan coba lagi.",
    sessionExpired: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  },
  
  // Data tables
  table: {
    search: "Cari",
    filter: "Filter",
    export: "Ekspor",
    reset: "Reset Filter",
    noResults: "Tidak ada hasil ditemukan",
    actions: "Aksi",
    status: "Status",
    date: "Tanggal",
    createdAt: "Dibuat",
    updatedAt: "Diperbarui",
    customer: "Pelanggan",
    product: "Produk",
    amount: "Jumlah",
    showing: "Menampilkan",
    of: "dari",
    entries: "entri",
    first: "Pertama",
    last: "Terakhir",
    next: "Berikutnya",
    previous: "Sebelumnya",
    activeFilters: "filter aktif",
  },
  
  // FAQ Section
  faq: {
    title: "Pertanyaan yang Sering Diajukan",
    subtitle: "Temukan jawaban untuk pertanyaan umum",
  },
  
  // Trust indicators
  trust: {
    securePayment: "Pembayaran Aman",
    securePaymentDesc: "Transaksi Anda dilindungi dengan enkripsi SSL",
    instantDelivery: "Pengiriman Instan",
    instantDeliveryDesc: "Kode redeem Anda akan langsung tersedia",
    support24_7: "Dukungan 24/7",
    support24_7Desc: "Tim kami siap membantu kapan saja",
    moneyBack: "Garansi Uang Kembali",
    moneyBackDesc: "Tidak puas? Kami kembalikan uang Anda",
  },
  
  // Footer
  footer: {
    copyright: "Hak Cipta",
    allRightsReserved: "Semua hak dilindungi.",
    termsOfService: "Syarat Layanan",
    privacyPolicy: "Kebijakan Privasi",
    contact: "Kontak",
  },
  
  // Floating chat
  chat: {
    needHelp: "Butuh bantuan?",
    chatWithUs: "Chat dengan kami",
  },
};
```

### 3.2 Files to Update with Indonesian Translation

The following files will be updated to use the centralized translations:

**Pages:**
1. `src/pages/Index.tsx` - Landing page content
2. `src/pages/Store.tsx` - Store labels and messages
3. `src/pages/SignIn.tsx` - Auth text
4. `src/pages/SignUp.tsx` - Auth text
5. `src/pages/ForgotPassword.tsx` - Password reset text
6. `src/pages/ResetPassword.tsx` - Password reset text
7. `src/pages/Transactions.tsx` - Order history labels
8. `src/pages/Admin.tsx` - Admin panel text
9. `src/pages/Staff.tsx` - Staff panel text
10. `src/pages/Analytics.tsx` - Analytics labels
11. `src/pages/NotFound.tsx` - 404 page text

**Components:**
1. `src/components/Navbar.tsx` - Navigation labels
2. `src/components/ProductCard.tsx` - Product labels
3. `src/components/OrderCard.tsx` - Order status labels
4. `src/components/OrderConfirmationDialog.tsx` - Checkout text
5. `src/components/VoucherInput.tsx` - Voucher labels
6. `src/components/AvailableVouchersList.tsx` - Voucher suggestions
7. `src/components/VoucherManager.tsx` - Voucher management
8. `src/components/VoucherAnalytics.tsx` - Analytics labels
9. `src/components/BulkVoucherGeneratorDialog.tsx` - Bulk generation
10. `src/components/FAQSection.tsx` - FAQ section
11. `src/components/TicketDialog.tsx` - Ticket creation
12. `src/components/TicketConversation.tsx` - Ticket chat
13. `src/components/RatingDialog.tsx` - Rating form
14. `src/components/CategoryManager.tsx` - Category labels
15. `src/components/CodeInventoryManager.tsx` - Code inventory
16. `src/components/StockManagement.tsx` - Stock labels
17. `src/components/BusinessRulesEditor.tsx` - Settings labels
18. `src/components/WebSettingsEditor.tsx` - Web settings
19. `src/components/DataTableFilters.tsx` - Filter labels
20. `src/components/DataTablePagination.tsx` - Pagination labels
21. `src/components/TrustIndicators.tsx` - Trust badges
22. `src/components/CopyButton.tsx` - Copy labels
23. `src/components/FloatingChatButton.tsx` - Chat prompt

---

## Phase 4: UI/UX Enhancements Throughout

### 4.1 Enhanced Empty States

Add illustrated empty states across all data tables and lists:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ENHANCED EMPTY STATE PATTERN                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                   ┌─────────────────────────────┐                       │
│                   │                              │                       │
│                   │      [ Icon with           │                       │
│                   │        subtle animation ]   │                       │
│                   │                              │                       │
│                   │   Tidak ada pesanan         │                       │
│                   │   ditemukan                  │                       │
│                   │                              │                       │
│                   │   Pesanan akan muncul       │                       │
│                   │   di sini setelah dibuat.   │                       │
│                   │                              │                       │
│                   │   [ Primary Action Button ] │                       │
│                   │                              │                       │
│                   └─────────────────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Improved Loading States

Add skeleton loaders matching content structure:

- Card skeletons for dashboard stats
- Table row skeletons for data tables
- Content area skeletons for sections

### 4.3 Enhanced Mobile Responsiveness

- Touch-optimized button sizes (min 44px)
- Swipeable navigation on mobile
- Sticky action buttons at bottom on mobile
- Full-width dialogs on small screens
- Improved table horizontal scroll indicators

### 4.4 Visual Feedback Improvements

- Add micro-animations for state changes
- Pulse effects on notification badges
- Success/error state animations
- Hover state transitions (0.2s ease)
- Active state visual feedback

### 4.5 Accessibility Enhancements

- Proper focus indicators
- Screen reader labels
- Keyboard navigation support
- Color contrast compliance
- Error message association

---

## Implementation Summary

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | 2 files | Voucher refinements (empty state, caching) |
| 2 | 4 files | Admin/Staff sidebar navigation |
| 3 | 1 new + 23 updates | Indonesian translations |
| 4 | Integrated | UI/UX enhancements throughout |

### Files to Create:
- `src/lib/translations.ts`
- `src/components/AdminSidebar.tsx`
- `src/components/StaffSidebar.tsx`

### Files to Modify:
- `src/components/AvailableVouchersList.tsx`
- `src/hooks/useAvailableVouchers.ts`
- `src/pages/Admin.tsx`
- `src/pages/Staff.tsx`
- `src/pages/Index.tsx`
- `src/pages/Store.tsx`
- `src/pages/SignIn.tsx`
- `src/pages/SignUp.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/Transactions.tsx`
- `src/pages/Analytics.tsx`
- `src/pages/NotFound.tsx`
- `src/components/Navbar.tsx`
- `src/components/ProductCard.tsx`
- `src/components/OrderCard.tsx`
- `src/components/OrderConfirmationDialog.tsx`
- `src/components/VoucherInput.tsx`
- `src/components/VoucherManager.tsx`
- `src/components/VoucherAnalytics.tsx`
- `src/components/BulkVoucherGeneratorDialog.tsx`
- `src/components/FAQSection.tsx`
- `src/components/TicketDialog.tsx`
- `src/components/RatingDialog.tsx`
- `src/components/CategoryManager.tsx`
- `src/components/CodeInventoryManager.tsx`
- `src/components/DataTableFilters.tsx`
- `src/components/DataTablePagination.tsx`
- `src/components/TrustIndicators.tsx`
- `src/components/CopyButton.tsx`
- `src/components/FloatingChatButton.tsx`

