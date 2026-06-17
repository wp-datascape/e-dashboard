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
  high_margin_ratio: number;
  repeat_order_rate: number;
  expansion_rate: number;
  up_rate: number;
  flat_down_rate: number;
}

export interface HighMarginCurrent {
  bought_pct: number;
  not_bought_pct: number;
}

export interface RepeatOrderCurrent {
  value: number;
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
