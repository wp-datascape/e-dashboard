export interface HighMarginMapping {
  id: number
  company_id: number
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
}

export interface CreateHighMarginPayload {
  company_id: number
  product_id?: number
  product_category_id?: number
  effective_from: string
  effective_until?: string
  note?: string
}

export interface UpdateHighMarginPayload {
  effective_until: string | null
  note?: string
}

export interface HighMarginListParams {
  company_id: number
  period?: string       // YYYY-MM
  active_only?: boolean
}

export interface ProductOption {
  id: number
  name: string
  type: 'product' | 'category'
}
