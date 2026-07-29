export interface ChannelDivisionRow {
  id: number
  channel_name: string
  // Label display (join ke divisions.label di backend), bukan raw key/id.
  division: string
  division_id: number
  company_id: number
  company_name: string | null
  created_at: string
  updated_at: string
}

// Division sekarang FK integer per company (task012 v2, tabel `divisions`) —
// division_id, bukan string key lagi. company_id WAJIB (tidak ada rule global lagi).
export interface CreateChannelDivisionPayload {
  channel_name: string
  division_id: number
  company_id: number
}

export interface UpdateChannelDivisionPayload {
  channel_name?: string
  division_id?: number
  company_id?: number
}

export interface ListChannelDivisionsParams {
  division?: number
  company_id?: number | 'all'
  search?: string
}
