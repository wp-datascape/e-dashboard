import type { ParetoPeriodType } from './paretoThresholds'

export type AnalisisComparisonMode = 'qoq' | 'yoy' | 'both'

export interface AnalisisMetricComparison {
  period_key: string
  revenue: number
  margin: number
  revenue_change_pct: number | null
  margin_change_pct: number | null
  revenue_alert: boolean
  margin_alert: boolean
}

export interface AnalisisRow {
  customer_id: number
  company_id: number
  company_name: string | null
  customer_name: string
  customer_code: string | null
  // true = customer ini di-flag Pareto (Settings/ParetoCustomers) — diprioritaskan
  // tampil duluan, ditandai chip. Laporan menampilkan SEMUA customer di scope,
  // bukan cuma yang di-flag (mirror pola High Margin di Product Ledger).
  is_pareto: boolean
  period_type: ParetoPeriodType
  period_key: string
  current: { revenue: number; margin: number }
  previous: AnalisisMetricComparison | null
  yoy: AnalisisMetricComparison | null
}

export type AnalisisSortBy = 'default' | 'revenue'
export type AnalisisSortDir = 'asc' | 'desc'

export interface AnalisisParams {
  company_id: number | 'all'
  period_type: ParetoPeriodType
  period_key?: string
  comparison: AnalisisComparisonMode
  search?: string
  // Toggle "Hanya Pareto" — mirror `high_margin_only` di Product Ledger.
  only_pareto?: boolean
  // Toggle "Exclude Intercompany" — mirror ExcludeIntercompanyToggle.
  exclude_intercompany?: boolean
  sort_by?: AnalisisSortBy
  sort_dir?: AnalisisSortDir
  page: number
  per_page: number
}
