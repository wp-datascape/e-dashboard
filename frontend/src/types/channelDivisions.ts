import type { Division } from './customers'

export interface ChannelDivisionRow {
  id: number
  channel_name: string
  division: NonNullable<Division>
  company_id: number | null
  company_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateChannelDivisionPayload {
  channel_name: string
  division: NonNullable<Division>
  company_id?: number | null
}

export interface UpdateChannelDivisionPayload {
  channel_name?: string
  division?: NonNullable<Division>
  company_id?: number | null
}

export interface ListChannelDivisionsParams {
  division?: NonNullable<Division>
  company_id?: number | 'all'
  search?: string
}
