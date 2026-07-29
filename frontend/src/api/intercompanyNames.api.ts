import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  IntercompanyNameRow,
  CreateIntercompanyNamePayload,
  ListIntercompanyNamesParams,
  AmbiguousChannelRow,
} from '@/types/intercompanyNames'

export const intercompanyNamesApi = {
  list: async (params?: ListIntercompanyNamesParams): Promise<IntercompanyNameRow[]> => {
    const res = await api.get<ApiResponse<IntercompanyNameRow[]>>('/settings/intercompany-names', { params })
    return res.data.data
  },

  listAmbiguousChannels: async (params?: ListIntercompanyNamesParams): Promise<AmbiguousChannelRow[]> => {
    const res = await api.get<ApiResponse<AmbiguousChannelRow[]>>('/settings/intercompany-names/ambiguous-channels', { params })
    return res.data.data
  },

  create: async (payload: CreateIntercompanyNamePayload): Promise<IntercompanyNameRow> => {
    const res = await api.post<ApiResponse<IntercompanyNameRow>>('/settings/intercompany-names', payload)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/intercompany-names/${id}`)
  },
}
