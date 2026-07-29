// task013 — daftar nama customer per company yang representasi sister company,
// sync otomatis ke customers.division_override_id di backend.
export interface IntercompanyNameRow {
  id: number
  company_id: number
  customer_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateIntercompanyNamePayload {
  company_id: number
  customer_name: string
}

export interface UpdateIntercompanyNamePayload {
  is_active: boolean
}

export interface ListIntercompanyNamesParams {
  company_id?: number | 'all'
}

export interface AmbiguousChannelRow {
  company_id: number
  channel_name: string
  override_customers: number
  regular_customers: number
}

export interface CustomerNameOption {
  id: number
  customer_name: string
}
