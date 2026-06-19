// src/types/import.ts

export type ImportSource = 'file' | 'accurate'
export type ImportStatus = 'success' | 'partial' | 'failed'

export interface ImportLog {
  id: number
  company: { id: number; name: string }
  source: ImportSource
  filename: string | null
  period_month: string
  status: ImportStatus
  total_invoices: number
  success_invoices: number
  error_rows: number
  imported_by: { id: number; name: string }
  created_at: string
}

export interface ImportResult {
  import_log_id: number
  status: ImportStatus
  total_invoices: number
  success_invoices: number
  error_rows: number
  error_summary: string | null
}

export interface ImportErrorRow {
  id: number
  row_number: number
  raw_data: string
  error_message: string
}

export interface ImportFilePayload {
  file: File
  company_id: number
  period_month: string
}

export interface ImportAccuratePayload {
  company_id: number
  period_month: string
}
