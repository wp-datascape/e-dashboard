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
  id: number;
  customer_code: string;
  customer_name: string;
  hardware: boolean;
  consumable: boolean;
  service: boolean;
  category_count: number;
  total_revenue: number;
}

export interface HeatmapRow {
  customer: string;
  values: Record<string, number>;
}

export interface CrossSellingData {
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
  month: string;
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
  month: string;
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
  month: string;
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
  active_count: number;
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
  total_existing: number;
  dormant_count: number;
  dormant_rate: number;
  reactivated: number;
  reactivation_rate: number;
}

export interface DormantValueRankingRow {
  customer_name: string;
  estimated_lost_value: number;
  months_dormant: number;
}

export interface ReactivationCurrent {
  value: number;
  target_low: number;
  target_high: number;
}

export interface DormantData {
  trend: DormantTrendPoint[];
  detail: unknown[];
  value_ranking: DormantValueRankingRow[];
  reactivation_current: ReactivationCurrent;
}
