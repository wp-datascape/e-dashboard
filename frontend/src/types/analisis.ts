import type { ParetoPeriodType } from './paretoThresholds'

// Laporan Analisis punya opsi "ytd" tambahan yang TIDAK berlaku untuk Settings
// Threshold — YTD tetap laporan on-demand saja, tidak dievaluasi scheduler
// (task016 §18) — jadi tipe ini sengaja dipisah dari `ParetoPeriodType`.
// ('monthly' sendiri SUDAH ikut di `ParetoPeriodType` sejak §18.)
export type AnalisisPeriodType = ParetoPeriodType | 'ytd'

// Filter "Pembanding" — basis comparison yang dipilih user (revisi UI/UX
// review 2026-07-31): 'last_year' (default, YoY) atau 'previous_period'
// (periode sejenis sebelumnya, mis. Q2 vs Q1). Dirancang generik supaya
// gampang ditambah opsi baru (Budget/Target/Forecast) tanpa ubah struktur UI.
export type AnalisisComparisonBasis = 'last_year' | 'previous_period'

export interface AnalisisMetricComparison {
  period_key: string
  revenue: number
  margin: number
  // Growth Value (Current - Previous) — indikator UTAMA (Metric Comparison
  // Standard, task016 §18), Growth % pendukung. Selalu terisi, beda dari
  // *_change_pct yang bisa null kalau previous = 0 ("New Business").
  revenue_change_value: number
  margin_change_value: number
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
  period_type: AnalisisPeriodType
  period_key: string
  current: { revenue: number; margin: number }
  comparison: AnalisisMetricComparison
}

export type AnalisisSortBy = 'default' | 'revenue'
export type AnalisisSortDir = 'asc' | 'desc'

export interface AnalisisParams {
  company_id: number | 'all'
  period_type: AnalisisPeriodType
  period_key?: string
  comparison?: AnalisisComparisonBasis
  // Filter langsung by customer_id — dipakai popup detail notifikasi (lihat
  // NotificationDetailDialog) buat ambil baris comparison PERSIS customer
  // yang disebut di entity_ref, tanpa perlu search by name.
  customer_id?: number
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
