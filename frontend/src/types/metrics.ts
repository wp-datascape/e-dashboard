// src/types/metrics.ts
// ─── Tipe data untuk semua endpoint /metrics/* ────────────────────────────────

// ── Cross Selling (M1, M1.1, M2) ─────────────────────────────────────────────

export interface CrossSellingTrendPoint {
  // Nama field TETAP `month` tapi isinya sekarang period_key sesuai granularitas
  // request (task029.md §30, 2026-08-20) — 'YYYY-MM' default (monthly), atau
  // 'YYYY-QN'/'YYYY-SN'/'YYYY' kalau period_type diisi quarter/semester/annual.
  month: string;
  total_active: number;
  multi_product: number;
  ratio: number;
  avg_category: number;
}

export interface CrossSellingDetailRow {
  customer_id: number;
  customer_code: string | null;
  customer_name: string;
  category_count: number;
  has_unit: boolean;
  has_consumable: boolean;
  has_sparepart: boolean;
  total_revenue: number;
  // Branch/Division/Channel (task029.md §28.10, 2026-08-21) — dari invoice
  // TERBARU customer itu DI DALAM periode laporan.
  branch: string | null;
  division: string | null;
  channel: string | null;
  // Map dinamis, key = item_type asli ('unit'/'card'/'accesories'/dst — apa pun
  // yang ada di data company itu, TIDAK di-hardcode 3 tipe lagi, 2026-08-21).
  type_breakdown: Record<string, { qty: number; revenue: number }>;
}

export interface HeatmapRow {
  customer: string;
  customer_id: number;
  values: Record<string, number>;
  revenues: Record<string, number>;
  total_revenue: number;
}

export interface CrossSellingData {
  // type/key (task029.md §30) — granularitas & period_key yang BENAR-BENAR
  // dipakai backend, buat cross-check label FE tanpa hitung ulang.
  period: { start: string; end: string; active_months: number; type: string; key: string };
  kpi1: { multi_cat_count: number; active_count: number; rate: number };
  kpi2: { avg_categories: number; total_distinct_cats: number };
  trend: CrossSellingTrendPoint[];
  detail: CrossSellingDetailRow[];
  heatmap: HeatmapRow[];
  categories: string[];
  // categories = scope heatmap (top-30 customer). detail_categories = SEMUA
  // customer (tabel Breakdown) — sengaja beda, 2026-08-21 (lihat backend
  // metrics.types.ts).
  detail_categories: string[];
}

// ── M3 Revenue Drill-down ───────────────────────────────────────────────────────

export interface RevenueBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  revenue: number;
  revenue_pct: number;
  tier: 'Atas' | 'Tengah' | 'Bawah';
  hm_revenue: number;
  hm_pct: number;
}

export interface RevenueBreakdownData {
  period_end: string;
  total_revenue: number;
  median_threshold: number;
  total_existing: number;
  hm_revenue: number;
  rows: RevenueBreakdownRow[];
}

// ── M7 Expansion Drill-down ───────────────────────────────────────────────────

export interface ExpansionBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  branch: string | null;
  division: string | null;
  channel: string | null;
  cur_revenue: number;
  prev_revenue: number;
  change_pct: number | null;
  // 4-way (2026-08-21, koreksi user "datamu tidak valid jika tanpa
  // transaksi kamu beri label stabil") — 'inactive' (cur=prev=0, tidak
  // ada transaksi sama sekali) dipisah dari 'flat' (cur=prev DAN > 0).
  status: 'up' | 'flat' | 'inactive' | 'down';
}

export interface ExpansionBreakdownData {
  period_end: string;
  up_count: number;
  flat_count: number;
  inactive_count: number;
  down_count: number;
  total_existing: number;
  rows: ExpansionBreakdownRow[];
}

// ── M4 GP Drill-down ─────────────────────────────────────────────────────────

export interface GpBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  gp: number;
  gp_pct: number;
  tier: 'Atas' | 'Tengah' | 'Bawah';
}

export interface GpBreakdownData {
  period_end: string;
  total_gp: number;
  median_threshold: number;
  total_existing: number;
  rows: GpBreakdownRow[];
}

// ── M5 HM Drill-down ─────────────────────────────────────────────────────────

export interface HmBreakdownRow {
  ranking: number;
  customer_name: string;
  customer_code: string | null;
  hm_revenue: number;
  hm_pct: number;
}

export interface HmBreakdownData {
  period_end: string;
  total_hm_revenue: number;
  hm_buyer_count: number;
  total_existing: number;
  rows: HmBreakdownRow[];
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────

export interface RorBreakdownRow {
  ranking: number;
  customer_name: string;
  customer_code: string | null;
  invoice_count: number;
  total_revenue: number;
}

export interface RorBreakdownData {
  period_end: string;
  repeat_count: number;
  total_existing: number;
  rows: RorBreakdownRow[];
}

// ── Customer Metrics (M3–M7) ──────────────────────────────────────────────────

export interface CustomerMetricsTrendPoint {
  month: string;
  existing_customers: number;
  total_revenue_existing: number;
  avg_revenue: number;
  avg_gross_profit: number;
  gp_tier1: number;
  gp_tier2: number;
  gp_tier3: number;
  top_gp_customer_id: number | null;
  top_gp_customer_name: string | null;
  top_gp_revenue: number;
  top_gp_pct: number;
  is_gp_concentrated: boolean;
  high_margin_ratio: number;
  repeat_order_rate: number;
  expansion_rate: number;
  up_rate: number;
  flat_down_rate: number;
  // 4-way split (existing customer naik/stabil/tidak-aktif/turun spend vs
  // periode sebelumnya, eksak, bukan didekati) — dipakai chart diverging
  // M7Expansion. inactive_rate (2026-08-21, koreksi user "datamu tidak
  // valid jika tanpa transaksi kamu beri label stabil") dipisah dari
  // flat_rate — flat_rate sekarang cuma cur=prev DAN cur>0 (genuinely
  // tidak berubah), inactive_rate = cur=prev=0 (tidak ada transaksi sama
  // sekali di kedua window).
  flat_rate: number;
  inactive_rate: number;
  down_rate: number;
  // Jumlah customer mentah per kategori (2026-08-22, user: "Aku butuh
  // data jumlah nya selain dari persentase") — pasangan raw-count dari
  // up_rate/flat_rate/inactive_rate/down_rate di atas.
  up_count: number;
  flat_count: number;
  inactive_count: number;
  down_count: number;
  // M3 enrichment
  active_existing_count: number;
  active_new_count: number;
  median_revenue: number;
  top_customer_id: number | null;
  top_customer_name: string | null;
  top_customer_revenue: number;
  top_customer_pct: number;
  is_concentrated: boolean;
  hm_revenue: number;
}

export interface HighMarginCurrent {
  bought_pct: number;
  not_bought_pct: number;
}

export interface RepeatOrderCurrent {
  value: number;
  target_pct: number;
}

export interface CustomerMetricsData {
  trend: CustomerMetricsTrendPoint[];
  detail: unknown[];
  high_margin_current: HighMarginCurrent;
  repeat_order_current: RepeatOrderCurrent;
}

// ── Dormant Customer (M8–M10) ─────────────────────────────────────────────────

export interface DormantTrendPoint {
  month: string;
  total_customers: number;
  dormant_count: number;
  dormant_rate: number;
  prev_dormant_count: number;
  reactivated_count: number;
  reactivation_rate: number;
}

export interface DormantValueRankingRow {
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  last_invoice_date: string;
  months_dormant: number;
  avg_monthly_revenue: number;
  estimated_lost_value: number;
}

export interface DormantRateCurrent {
  value: number;
  dormant_count: number;
  total_customers: number;
  alert_pct: number;
}

export interface ReactivationCurrent {
  value: number;
  target_low: number;
  target_high: number;
}

export interface DormantData {
  trend: DormantTrendPoint[];
  value_ranking: DormantValueRankingRow[];
  dormant_rate_current: DormantRateCurrent;
  reactivation_current: ReactivationCurrent;
}
