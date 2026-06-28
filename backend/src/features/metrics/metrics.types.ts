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
  active_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
  is_concentrated: boolean
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
  month: string
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
  month: string
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
  month: string
  repeat_count: number
  total_existing: number
  rows: RorBreakdownRow[]
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
