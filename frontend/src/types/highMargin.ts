export interface HighMarginMapping {
  id: number
  company_id: number
  company_name: string | null
  product_id: number | null
  product_name: string | null
  product_category_id: number | null
  category_name: string | null
  effective_from: string       // YYYY-MM-DD
  effective_until: string | null
  note: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  // task017 — divisi fokus KPI yang di-assign ke mapping ini (wajib >=1, exclude Intercompany)
  division_ids: number[]
  division_names: string[]
}

export interface CreateHighMarginPayload {
  company_id: number
  product_id?: number
  product_category_id?: number
  effective_from: string
  effective_until?: string
  note?: string
  division_ids: number[]
}

export interface UpdateHighMarginPayload {
  effective_until: string | null
  note?: string
  division_ids: number[]
}

export interface HighMarginListParams {
  company_id: number | 'all'
  period?: string       // YYYY-MM
  active_only?: boolean
}

export interface ProductOption {
  id: number
  name: string
  type: 'product' | 'category'
}

// ─── Bulk Import (task036, 2026-08-31) ─────────────────────────────────────

export interface HighMarginImportConflictInfo {
  id: number
  effective_from: string
  effective_until: string | null
  division_names: string[]
  note: string | null
}

export interface HighMarginImportPreviewRow {
  row: number
  type: 'product' | 'category' | null
  name: string
  target_id: number | null
  division_names: string[]
  division_ids: number[]
  effective_from: string
  effective_until?: string
  note?: string
  status: 'success' | 'conflict' | 'error'
  error_message?: string
  conflict?: HighMarginImportConflictInfo
}

export interface HighMarginImportPreviewResult {
  rows: HighMarginImportPreviewRow[]
  success_count: number
  conflict_count: number
  error_count: number
}

export interface HighMarginImportCommitRow {
  type: 'product' | 'category'
  target_id: number
  division_ids: number[]
  effective_from: string
  effective_until?: string
  note?: string
  /** Terisi kalau baris ini konflik dan user pilih "Pakai yang Baru" —
   * mapping lama (id ini) otomatis dinonaktifkan di backend. */
  supersede_id?: number
}

export interface HighMarginImportCommitPayload {
  company_id: number
  rows: HighMarginImportCommitRow[]
}

export interface HighMarginImportCommitResult {
  added: number
  superseded: number
  errors: Array<{ row: number; message: string }>
}
