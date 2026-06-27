export interface CustomerMetricsTrendPoint {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  gp_tier1: number
  gp_tier2: number
  gp_tier3: number
  high_margin_ratio: number
  repeat_order_rate: number
  expansion_rate: number
  up_rate: number
  flat_down_rate: number
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
  }
}
