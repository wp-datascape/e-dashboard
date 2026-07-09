export interface ChannelDivisionRow {
  id: number
  channel_name: string
  division: string
  company_id: number | null
  company_name: string | null
  branch_id: number | null
  created_at: string
  updated_at: string
}

// company_id wajib (revisi task004) — mapping channel division HARUS dimiliki
// 1 company spesifik, tidak ada lagi "rule global" (company_id null).
export interface CreateChannelDivisionPayload {
  channel_name: string
  division: string
  company_id: number
  branch_id?: number | null
}

export interface UpdateChannelDivisionPayload {
  channel_name?: string
  division?: string
  company_id?: number
  branch_id?: number | null
}

export interface ListChannelDivisionsParams {
  division?: string
  company_id?: number | 'all'
  branch_id?: number
  search?: string
}
