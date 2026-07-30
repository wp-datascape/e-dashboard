// task016 §5/§9 — threshold penurunan revenue/margin per company, company-scoped
// (BUKAN global seperti business_configs biasa)
export type ParetoPeriodType = 'quarter' | 'semester' | 'annual'
export type ParetoMetric = 'revenue' | 'margin'

export interface ParetoThresholdRow {
  id: number
  company_id: number
  company_name: string | null
  period_type: ParetoPeriodType
  metric: ParetoMetric
  drop_percent: string // numeric dari drizzle datang sebagai string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpsertParetoThresholdPayload {
  company_id: number
  period_type: ParetoPeriodType
  metric: ParetoMetric
  drop_percent: number
  is_active?: boolean
}

export interface ListParetoThresholdsParams {
  company_id: number | 'all'
}
