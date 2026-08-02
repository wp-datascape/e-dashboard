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
