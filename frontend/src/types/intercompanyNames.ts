// task013 — daftar nama customer per company yang representasi sister company,
// sync otomatis ke customers.division_override_id di backend.
export interface IntercompanyNameRow {
  id: number
  company_id: number
  customer_name: string
  created_at: string
  updated_at: string
}

export interface CreateIntercompanyNamePayload {
  company_id: number
  customer_name: string
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
