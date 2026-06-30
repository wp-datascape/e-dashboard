// src/types/metrics.ts
// ─── Tipe data untuk semua endpoint /metrics/* ────────────────────────────────

// ── Cross Selling (M1, M1.1, M2) ─────────────────────────────────────────────

export interface CrossSellingTrendPoint {
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
}

export interface HeatmapRow {
  customer: string;
  values: Record<string, number>;
}

export interface CrossSellingData {
  period: { start: string; end: string };
  kpi1: { multi_cat_count: number; active_count: number; rate: number };
  kpi2: { avg_categories: number; total_distinct_cats: number };
  trend: CrossSellingTrendPoint[];
  detail: CrossSellingDetailRow[];
  heatmap: HeatmapRow[];
  categories: string[];
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
  // M3 enrichment
  active_existing_count: number;
  active_new_count: number;
  median_revenue: number;
  top_customer_id: number | null;
  top_customer_name: string | null;
  top_customer_revenue: number;
  top_customer_pct: number;
  is_concentrated: boolean;
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
