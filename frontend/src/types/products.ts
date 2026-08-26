// frontend/src/types/products.ts

// ─── 3.1 Category Performance ────────────────────────────────────────────────
export interface CategoryPerformanceRow {
  id: number
  category_id: number
  category_name: string
  is_high_margin: boolean
  is_service: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  last_sold_month: string | null
}

export interface CategoryPerformanceParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: number
  period_month?: string
  active_window?: number
  search?: string
  high_margin_only?: boolean
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
  sort_by?: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sort_dir?: 'asc' | 'desc'
}

// ─── 3.1c Product Performance (flat list produk, halaman /products) ──────────
export interface ProductPerformanceRow {
  id: number
  product_id: number
  product_name: string
  category_id: number | null
  category_name: string | null
  is_high_margin: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  last_sold_month: string | null
}

export interface ProductCategoryOption {
  id: number
  name: string
}

export interface ProductPerformanceParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: number
  item_type?: string // key dinamis per company (task011)
  category_id?: number
  period_month?: string
  active_window?: number
  search?: string
  high_margin_only?: boolean
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
  sort_by?: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sort_dir?: 'asc' | 'desc'
}

// ─── 3.1b Category Products (drawer detail) ──────────────────────────────────
export interface CategoryProductRow {
  id: number
  product_id: number
  product_name: string
  is_high_margin: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  assign_to: AssignToDivision[]
}

export interface CategoryProductsParams {
  company_id?: number | 'all'
  category_id: number
  branch_id?: number
  division?: number
  period_month?: string
  active_window?: number
  exclude_intercompany?: boolean
  // Task008 — batasi ke produk yang benar-benar ditandai high margin (bukan
  // semua produk kategori). Dipakai tab "Penetrasi Kategori" saja.
  high_margin_only?: boolean
  page?: number
  per_page?: number
}

// task017 — divisi yang di-assign fokus KPI, sudah RBAC-scoped di backend
// (divisi di luar akses viewer tidak pernah ikut terkirim).
export interface AssignToDivision {
  id: number
  label: string
}

// ─── 3.2 High Margin Push List ────────────────────────────────────────────────
export interface HighMarginCategoryRow {
  id: number
  category_id: number
  category_name: string
  is_high_margin: boolean
  customer_count: number
  total_active_customers: number
  penetration_rate: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  assign_to: AssignToDivision[]
}

export interface HighMarginDetailParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: number
  exclude_intercompany?: boolean
  period_month?: string
  active_window?: number
  page?: number
  per_page?: number
}

// task017 lanjutan — view flat per-produk (VIEW DEFAULT baru, high margin
// adalah flag per-produk, bukan per-kategori — lihat komentar backend di
// fetchHmProductDetail()). category_id/category_name cuma konteks tampilan.
export interface HighMarginProductRow {
  id: number
  product_id: number
  product_name: string
  category_id: number
  category_name: string
  is_high_margin: boolean
  customer_count: number
  total_active_customers: number
  penetration_rate: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  assign_to: AssignToDivision[]
}

export interface CategoryRef {
  id: number
  name: string
}

// ─── task017: Drill-down "Customer Pembeli" + "Capaian per Divisi" ────────────
export interface HmCustomersParams {
  company_id?: number | 'all'
  target_type: 'category' | 'product'
  target_id: number
  branch_id?: number
  division?: number
  exclude_intercompany?: boolean
  period_month?: string
  active_window?: number
  page?: number
  per_page?: number
}

export interface HmCustomerRow {
  id: string
  customer_id: number
  customer_code: string | null
  customer_name: string
  division_id: number | null
  division_label: string | null
  total_revenue: number
  total_gp: number
  invoice_count: number
  last_invoice_date: string
}

export interface HmDivisionBreakdown {
  division_id: number | null
  division_label: string | null
  total_revenue: number
  total_gp: number
  customer_count: number
}

// UpsellMissingCategory (2026-08-26, task031.md §4 — GANTI dari CategoryRef
// polos) — tiap kategori HM yang belum dibeli sekarang bawa affinity_pct
// sendiri ("68% pelanggan divisi X beli kategori ini"), bukan cuma id/nama.
export interface UpsellMissingCategory extends CategoryRef {
  affinity_pct: number
}

export interface UpsellTargetRow {
  id: number
  customer_code: string
  customer_name: string
  // division_label (2026-08-26, task031.md §4 — GANTI dari business_unit
  // legacy) — nama Divisi DOMINAN customer (transaksi terbanyak dalam
  // activeWindow), sistem SAMA dgn filter Divisi KPI lain, bukan lagi
  // divisi channel transaksi terakhir saja.
  division_label: string | null
  last_invoice_date: string
  avg_monthly_revenue: number
  categories_bought: CategoryRef[]
  missing_high_margin_categories: UpsellMissingCategory[]
}

// ─── Customer Products (purchase history drawer) ──────────────────────────────
export interface CustomerProductRow {
  id: number
  product_id: number
  product_name: string
  category_id: number
  category_name: string
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
}

export interface CustomerProductsParams {
  company_id?: number | 'all'
  customer_id: number
  category_id?: number
  item_type?: string
  branch_id?: number
  division?: number
  period_month?: string
  active_window?: number
  // Rentang tanggal eksplisit, INKLUSIF kedua ujung — dipakai M1 heatmap
  // drill-down (2026-08-22, bug: dialog dulu SELALU pakai active_window,
  // tidak terkait filter granularitas Bulanan/Kuartalan/Semesteran/Tahunan
  // di halaman) — kalau diisi, backend pakai INI, bukan period_month+
  // active_window. UpsellCustomerDialog.tsx (Products High Margin) TETAP
  // pakai period_month/active_window, TIDAK diubah.
  period_start?: string
  period_end?: string
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
}

export interface UpsellTargetParams {
  company_id?: number | 'all'
  branch_id?: number
  period_month?: string
  active_window?: number
  // division (2026-08-26, task031.md §4 — GANTI dari business_unit legacy).
  division?: number
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
}

// ─── 3.3 Product Trend (reuse M2 avg-category) ───────────────────────────────
export interface AvgCategoryTrendPoint {
  month: string
  avg_category: number
}

export interface ProductTrendData {
  company_id: number | 'all'
  period_month: string
  trend: AvgCategoryTrendPoint[]
  current_avg: number
  prev_avg: number | null
  change_pct: number | null
}

export interface ProductTrendParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: number
  period_month?: string
  active_window?: number
  exclude_intercompany?: boolean
}