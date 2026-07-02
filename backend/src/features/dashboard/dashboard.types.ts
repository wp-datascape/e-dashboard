export interface MonthlyTrendPoint {
  month: string
  value: number
}

export interface MetricSummary {
  current_value: number
  previous_value: number
  change_percent: number
  trend: 'up' | 'down' | 'stable'
}

export interface MetricCard {
  metric_key: string
  title: string
  subtitle: string
  link: string
  format: 'percent' | 'number' | 'currency'
  summary: MetricSummary
  monthly_trend: MonthlyTrendPoint[]
  color: string
}

export interface DashboardData {
  period_month: string
  active_window: number
  metrics: MetricCard[]
}
