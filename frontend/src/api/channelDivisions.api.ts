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

  importCsv: async (file: File, companyId: number): Promise<{ added: number; skipped: number; errors: Array<{ row: number; message: string }> }> => {
    const form = new FormData()
    form.append('file', file)
    form.append('company_id', String(companyId))
    const res = await api.post<ApiResponse<{ added: number; skipped: number; errors: Array<{ row: number; message: string }> }>>('/settings/channel-divisions/import', form)
    return res.data.data
  },

  listDivisionValues: async (companyId: number | 'all'): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>('/settings/channel-divisions/values', {
      params: { company_id: companyId },
    })
    return res.data.data
  },

  listUnmappedChannels: async (companyId: number | 'all'): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>('/settings/channel-divisions/unmapped-channels', {
      params: { company_id: companyId },
    })
    return res.data.data
  },

  downloadTemplate: async (): Promise<void> => {
    const res = await api.get('/settings/channel-divisions/template', { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'channel_divisions_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  },
}
