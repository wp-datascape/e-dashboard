export interface CustomerMetricsTrendPoint {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  gp_tier1: number
  gp_tier2: number
  gp_tier3: number
  top_gp_customer_id: number | null
  top_gp_customer_name: string | null
  top_gp_revenue: number
  top_gp_pct: number
  is_gp_concentrated: boolean
  high_margin_ratio: number
  repeat_order_rate: number
  expansion_rate: number
  up_rate: number
  flat_down_rate: number
  // M3 enrichment
  active_existing_count: number
  active_new_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
  is_concentrated: boolean
  // Task006 — kontribusi revenue High Margin bulan itu (tooltip hover M3)
  hm_revenue: number
}

// ── M3 Revenue Drill-down ───────────────────────────────────────────────────────

export interface RevenueBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  revenue: number
  revenue_pct: number
  tier: 'Atas' | 'Tengah' | 'Bawah'
  // Task006 follow-up — revenue High Margin milik customer ini + persentase relatif
  // ke total_revenue keseluruhan (denominator sama dengan revenue_pct di atas)
  hm_revenue: number
  hm_pct: number
}

export interface RevenueBreakdownData {
  period_end: string
  total_revenue: number
  median_threshold: number
  total_existing: number
  // Task006 — total revenue produk yang terdaftar di high_margin_products,
  // dalam populasi & window yang sama dengan total_revenue di atas.
  hm_revenue: number
  rows: RevenueBreakdownRow[]
}

// ── M7 Expansion Drill-down ─────────────────────────────────────────────────────

export interface ExpansionBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  cur_revenue: number
  prev_revenue: number
  change_pct: number | null
  status: 'up' | 'flat_down'
}

export interface ExpansionBreakdownData {
  period_end: string
  up_count: number
  total_existing: number
  rows: ExpansionBreakdownRow[]
}

// ── M4 Drill-down ─────────────────────────────────────────────────────────────

export interface GpBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  gp: number
  gp_pct: number
  tier: 'Atas' | 'Tengah' | 'Bawah'
}

export interface GpBreakdownData {
  period_end: string
  total_gp: number
  median_threshold: number
  total_existing: number
  rows: GpBreakdownRow[]
}

// ── M5 HM Drill-down ──────────────────────────────────────────────────────────

export interface HmBreakdownRow {
  ranking: number
  customer_name: string
  customer_code: string | null
  hm_revenue: number
  hm_pct: number
}

export interface HmBreakdownData {
  period_end: string
  total_hm_revenue: number
  hm_buyer_count: number
  total_existing: number
  rows: HmBreakdownRow[]
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────

export interface RorBreakdownRow {
  ranking: number
  customer_name: string
  customer_code: string | null
  invoice_count: number
  total_revenue: number
}

export interface RorBreakdownData {
  period_end: string
  repeat_count: number
  total_existing: number
  rows: RorBreakdownRow[]
}

// ── M8–M10 Dormant Customer ───────────────────────────────────────────────────

export interface DormantTrendRow {
  month: string
  total_customers: number
  dormant_count: number
  dormant_rate: number
  prev_dormant_count: number
  reactivated_count: number
  reactivation_rate: number
}

export interface DormantValueRow {
  customer_id: number
  customer_name: string
  customer_code: string | null
  // company_name (task025 lanjutan §8/§9, 2026-08-07): template tabel §7
  // "SATU template untuk semua menu/halaman" WAJIB kolom Perusahaan sebagai
  // kolom pertama — sebelumnya tidak ada di query ini, ditambah (murni
  // penarikan data, bukan perubahan aturan bisnis).
  company_name: string
  last_invoice_date: string
  months_dormant: number
  avg_monthly_revenue: number
  estimated_lost_value: number
}

export interface ReactivatedCustomerRow {
  customer_id: number
  customer_name: string
  customer_code: string | null
  company_name: string
  // Tanggal transaksi terakhir SEBELUM customer dormant (kapan dia "hilang")
  previous_last_invoice_date: string
  // Tanggal transaksi PERTAMA setelah dormant, dalam window bulan berjalan
  // (kapan dia "kembali")
  reactivation_date: string
  months_was_dormant: number
}

export interface DormantMetricsData {
  trend: DormantTrendRow[]
  value_ranking: DormantValueRow[]
  dormant_rate_current: {
    value: number
    dormant_count: number
    total_customers: number
    alert_pct: number
    // comparison_value (task025 lanjutan, 2026-08-07): nilai dormant_rate
    // pada tanggal YANG SAMA setahun lalu — dipakai KpiSummaryStrip di
    // frontend (pola "apple to apple" dgn halaman Revenue/Retention).
    // Dihitung dari fetchDormantTrend KEDUA dgn filterDate digeser -1 tahun,
    // BUKAN perubahan business rule apa pun (threshold dormant tetap sama).
    comparison_value: number
  }
  reactivation_current: {
    value: number
    target_low: number
    target_high: number
    comparison_value: number
  }
  // Total estimated_lost_value dari top-20 ranking, current vs setahun lalu
  // (top-20 dihitung ULANG di tanggal pembanding, bukan snapshot ranking yang
  // sama) — dipakai KpiSummaryStrip halaman Nilai Hilang (KPI9).
  value_ranking_total_current: number
  value_ranking_total_comparison: number
  // Daftar customer yang reaktivasi di bulan berjalan (KPI10 tabel, top 20
  // by tanggal reaktivasi terbaru) — konsisten dgn perhitungan
  // reactivation_current (bulan sama, definisi sama persis).
  reactivated_customers: ReactivatedCustomerRow[]
}

export interface CustomerMetricsData {
  trend: CustomerMetricsTrendPoint[]
  detail: unknown[]
  high_margin_current: {
    bought_pct: number
    not_bought_pct: number
  }
  repeat_order_current: {
    value: number
    target_pct: number
  }
}

// ── M1, M1.1, M2 — Cross Selling ──────────────────────────────────────────────

export interface CrossSellingTrendRow {
  month: string
  total_active: number
  multi_product: number
  ratio: number
  avg_category: number
}

export interface CrossSellingDetailRow {
  customer_id: number
  customer_code: string | null
  customer_name: string
  category_count: number
  has_unit: boolean
  has_consumable: boolean
  has_sparepart: boolean
  total_revenue: number
}

export interface CrossSellingHeatmapRow {
  customer: string
  customer_id: number
  values: Record<string, number>
  revenues: Record<string, number>
  total_revenue: number
}

export interface CrossSellingMetricsData {
  period: { start: string; end: string; active_months: number }
  kpi1: { multi_cat_count: number; active_count: number; rate: number }
  kpi2: { avg_categories: number; total_distinct_cats: number }
  trend: CrossSellingTrendRow[]
  detail: CrossSellingDetailRow[]
  heatmap: CrossSellingHeatmapRow[]
  categories: string[]
}

// ── 3.3 Product Trend (avg-category) ──────────────────────────────────────────

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
