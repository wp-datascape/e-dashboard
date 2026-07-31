// task016 §5/§9 — threshold penurunan revenue/margin per company, company-scoped
// (BUKAN global seperti business_configs biasa). 'monthly' ditambah §18 (Aturan
// 2 "Report/Alert Monitoring" bulanan) — 'ytd' SENGAJA tidak ikut di sini, YTD
// tetap laporan on-demand saja, tidak dievaluasi scheduler (lihat AnalisisPeriodType).
export type ParetoPeriodType = 'monthly' | 'quarter' | 'semester' | 'annual'
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

// Toggle on/off SCHEDULER alert per company (task016 §19) — TERPISAH dari
// threshold di atas (angka persentase). Lihat komentar lengkap di
// schema-transaction.ts (tabel pareto_alert_settings, backend).
export interface ParetoAlertSettingRow {
  id: number
  company_id: number
  company_name: string | null
  scheduler_enabled: boolean
  updated_at: string
}

export interface UpsertParetoAlertSettingPayload {
  company_id: number
  scheduler_enabled: boolean
}

export interface ListParetoAlertSettingsParams {
  company_id: number | 'all'
}
