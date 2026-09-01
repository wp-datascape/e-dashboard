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
  // Terisi HANYA dari hasil commit alur review (task037/EDASHBOARD-588) —
  // jumlah invoice konflik yang user pilih "Lewati", tidak disentuh sama
  // sekali. undefined utk hasil import langsung (tanpa tahap review).
  skipped_invoices?: number
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

// ─── Review Import Faktur (task037/EDASHBOARD-588) ──────────────────────────
// Alur 2 tahap seperti High Margin (task036): preview (parse+deteksi konflik
// per invoice, TANPA tulis DB) lalu commit (invoice hasil preview yang mau
// disimpan, dgn pilihan per baris konflik: Timpa/Lewati) — lihat
// docs-v2/task/task037.md.

export interface FakturImportItem {
  product_category: string
  item_name?: string
  quantity?: number
  unit_price?: number
  revenue: number
  gross_profit: number
}

export type FakturImportRowStatus = 'new' | 'conflict' | 'error'

export interface FakturImportPreviewRow {
  invoice_number: string
  invoice_date: string
  customer_code: string
  customer_name: string
  branch_name?: string
  channel_name?: string
  item_count: number
  total_revenue: number
  total_gp: number
  status: FakturImportRowStatus
  error_message?: string
  // Terisi kalau status='conflict' — data invoice AKTIF yang bentrok.
  conflict?: {
    total_revenue: number
    updated_at: string
  }
  items: FakturImportItem[]
}

export interface FakturImportPreviewResult {
  invoices: FakturImportPreviewRow[]
  summary: { new: number; conflict: number; error: number }
  raw_row_count: number
  filename: string
}

export interface FakturImportCommitInvoice {
  invoice_number: string
  action: 'create' | 'update' | 'skip'
  invoice_date: string
  customer_code: string
  customer_name: string
  branch_name?: string
  channel_name?: string
  items: FakturImportItem[]
}

export interface FakturImportCommitPayload {
  company_id: number
  period_month: string
  filename: string
  invoices: FakturImportCommitInvoice[]
}
