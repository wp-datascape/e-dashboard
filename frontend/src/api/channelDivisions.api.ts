import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  ChannelDivisionRow,
  CreateChannelDivisionPayload,
  UpdateChannelDivisionPayload,
  ListChannelDivisionsParams,
} from '@/types/channelDivisions'

export const channelDivisionsApi = {
  list: async (params?: ListChannelDivisionsParams): Promise<ChannelDivisionRow[]> => {
    const res = await api.get<ApiResponse<ChannelDivisionRow[]>>('/settings/channel-divisions', { params })
    return res.data.data
  },

  create: async (payload: CreateChannelDivisionPayload): Promise<ChannelDivisionRow> => {
    const res = await api.post<ApiResponse<ChannelDivisionRow>>('/settings/channel-divisions', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateChannelDivisionPayload): Promise<ChannelDivisionRow> => {
    const res = await api.patch<ApiResponse<ChannelDivisionRow>>(`/settings/channel-divisions/${id}`, payload)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/channel-divisions/${id}`)
  },
}
