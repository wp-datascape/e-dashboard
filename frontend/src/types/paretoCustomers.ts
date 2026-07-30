// task016 Fase A — flag customer prioritas ("Pareto") yang dipantau ketat
export interface ParetoCustomerRow {
  id: number
  company_id: number
  company_name: string | null
  customer_id: number
  customer_name: string
  customer_code: string | null
  effective_from: string       // YYYY-MM-DD
  effective_until: string | null
  note: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface CreateParetoCustomerPayload {
  company_id: number
  customer_id: number
  effective_from: string
  effective_until?: string
  note?: string
}

export interface UpdateParetoCustomerPayload {
  effective_until: string | null
  note?: string
}

export interface ListParetoCustomersParams {
  company_id: number | 'all'
  active_only?: boolean
}

export interface ParetoCustomerOption {
  id: number
  customer_name: string
  customer_code: string | null
}
