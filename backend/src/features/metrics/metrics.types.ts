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
  // 3-way split (koreksi user 2026-08-10) — flat_down_rate TETAP ada
  // (dipakai M7Expansion.tsx chart tren kanan, 2-way), flat_rate/down_rate
  // BARU utk cards+chart kiri CustomerExpansion/index.tsx yang butuh pisah
  // Flat (cur==prev) vs Turun (cur<prev) eksak.
  //
  // 4-way (koreksi user 2026-08-21, "datamu tidak valid jika tanpa
  // transaksi kamu beri label stabil") — flat_rate sekarang HANYA cur=prev
  // DAN cur>0 (genuinely tidak berubah, customer masih order). Customer
  // yang cur=prev=0 (tidak ada transaksi sama sekali di kedua window)
  // dipisah ke inactive_rate, BUKAN lagi bagian dari flat_rate.
  flat_rate: number
  inactive_rate: number
  down_rate: number
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
  // Branch/Division/Channel (2026-08-21, samakan §28.10 — kolom sama yang
  // dipunya M1/M3-M6/M8-M10) — dari invoice TERBARU customer itu DI DALAM
  // window "current", pola sama persis `latest_inv` M1 (m1.repository.ts).
  branch: string | null
  division: string | null
  channel: string | null
  cur_revenue: number
  prev_revenue: number
  change_pct: number | null
  // 4-way (koreksi user 2026-08-10 lalu direvisi 2026-08-21) — dulu
  // 'up' | 'flat_down', lalu 'up' | 'flat' | 'down', sekarang 'inactive'
  // (cur_revenue === prev_revenue === 0, tidak ada transaksi sama sekali)
  // dipisah dari 'flat' (cur_revenue === prev_revenue DAN > 0) — user:
  // "datamu tidak valid jika tanpa transaksi kamu beri label stabil".
  status: 'up' | 'flat' | 'inactive' | 'down'
}

export interface ExpansionBreakdownData {
  period_end: string
  up_count: number
  flat_count: number
  inactive_count: number
  down_count: number
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
  /** Total revenue customer ini dalam window aktif — ditambah 2026-08-09
   * (mockup "Revenue 30D") supaya margin_pct bisa dihitung, bukan cuma gp. */
  revenue: number
  /** gp/revenue*100 — BEDA dari gp_pct (gp/total_gp*100, porsi thd total GP
   * semua existing customer). margin_pct = margin kotor customer ybs sendiri. */
  margin_pct: number
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
  // Severity split (koreksi user 2026-08-10, opsi A: 4 kartu Total/Aktif/
  // Dormant Ringan/Dormant Kronis) — active_count + dormant_light_count +
  // dormant_severe_count SELALU persis total_customers; dormant_light_count
  // + dormant_severe_count SELALU persis dormant_count (angka lama).
  active_count: number
  dormant_light_count: number
  dormant_severe_count: number
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

export interface DormantValueTrendPoint {
  month: string
  value: number
}

export interface DormantMetricsData {
  trend: DormantTrendRow[]
  value_ranking: DormantValueRow[]
  // Tren 12-bulan estimasi total nilai hilang dari SELURUH customer dormant
  // (bukan cuma top-20 seperti value_ranking) — task025 §18/§19, 2026-08-07.
  // Reuse fetchDormantValueTrend (sebelumnya cuma dipakai Dashboard) supaya
  // KPI9 bisa pakai averageLastMonths yang sama dgn KPI8/KPI10, BUKAN
  // perhitungan baru — formula & threshold dormant PERSIS sama dgn
  // value_ranking (avg_monthly_revenue × months_dormant, dormantMonths dari
  // business_configs).
  value_trend: DormantValueTrendPoint[]
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
    // Severity split (koreksi user 2026-08-10, opsi A) — snapshot current +
    // comparison (setahun lalu), pola SAMA persis dgn dormant_count/
    // comparison_value di atas.
    active_count: number
    dormant_light_count: number
    dormant_severe_count: number
    active_count_comparison: number
    dormant_light_count_comparison: number
    dormant_severe_count_comparison: number
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
  // Nama field TETAP `month` (hindari rename massal di FE) tapi ISI-nya sekarang
  // period_key sesuai granularitas request (task029.md §30, 2026-08-20) —
  // 'YYYY-MM' utk monthly (default, backward compatible), 'YYYY-QN'/'YYYY-SN'/
  // 'YYYY' utk quarter/semester/annual.
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
  // Branch/Division/Channel (task029.md §28.10, 2026-08-21) — dari invoice
  // TERBARU customer itu DI DALAM periode laporan (bukan all-time), null
  // kalau customer tidak py invoice ter-mapping channel_divisions.
  branch: string | null
  division: string | null
  channel: string | null
  // Breakdown per tipe produk (task029.md §28.10, koreksi 2026-08-21 — SEBELUMNYA
  // 6 field hardcode unit/consumable/sparepart, TERNYATA item_type per company
  // bervariasi (KNT 6 tipe termasuk 'card' Rp43.8M yang sebelumnya hilang dari
  // tabel). Sekarang map dinamis, key = item_type asli (bisa 'unit', 'card',
  // 'accesories', dst — apa pun yang ada di data), qty = SUM(quantity) asli
  // invoice_items (bukan COUNT(*) baris kayak heatmap M1.1, yang ambigu).
  type_breakdown: Record<string, { qty: number; revenue: number }>
}

export interface CrossSellingHeatmapRow {
  customer: string
  customer_id: number
  values: Record<string, number>
  revenues: Record<string, number>
  total_revenue: number
}

export interface CrossSellingMetricsData {
  // type/key (task029.md §30, 2026-08-20) — granularitas & period_key yang
  // BENAR-BENAR dipakai (bukan cuma echo param request), berguna FE cross-check
  // label tanpa hitung ulang periodKey sendiri.
  period: { start: string; end: string; active_months: number; type: string; key: string }
  kpi1: { multi_cat_count: number; active_count: number; rate: number }
  kpi2: { avg_categories: number; total_distinct_cats: number }
  trend: CrossSellingTrendRow[]
  detail: CrossSellingDetailRow[]
  // categories (heatmap) discovered dari top-30-customer scope heatmap SAJA —
  // detail_categories dari SEMUA customer (fetchCrossSellingDetail) — sengaja
  // 2 field terpisah (2026-08-21), supaya tabel breakdown tidak kehilangan tipe
  // produk yang cuma dibeli customer di luar top-30 heatmap.
  heatmap: CrossSellingHeatmapRow[]
  categories: string[]
  detail_categories: string[]
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
