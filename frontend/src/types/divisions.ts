// frontend/src/types/divisions.ts
// Katalog divisi dinamis per company/branch (task004/task005) — beda dari
// ChannelDivisionRow (types/channelDivisions.ts) yang isinya MAPPING
// channel_name -> kode divisi. DivisionRow ini adalah baris "master" divisi itu
// sendiri (nama, kode, dormant_bucket per company+branch).

export const DORMANT_BUCKETS = ['b2b_dc', 'b2b_project', 'b2c', 'manufacturing'] as const
export type DormantBucket = typeof DORMANT_BUCKETS[number]

export interface DivisionRow {
  id: number
  company_id: number
  company_name: string | null
  branch_id: number | null
  branch_name: string | null
  name: string
  code: string
  dormant_bucket: DormantBucket
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDivisionPayload {
  company_id: number
  branch_id?: number | null
  name: string
  code: string
  dormant_bucket?: DormantBucket
  is_active?: boolean
}

export interface UpdateDivisionPayload {
  branch_id?: number | null
  name?: string
  code?: string
  dormant_bucket?: DormantBucket
  is_active?: boolean
}

export interface ListDivisionsParams {
  company_id?: number
  branch_id?: number
  is_active?: boolean
}
