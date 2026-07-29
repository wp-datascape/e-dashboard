import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  DivisionRow,
  DivisionOption,
  CreateDivisionPayload,
  UpdateDivisionPayload,
  ListDivisionsParams,
} from '@/types/divisions'

export const divisionsApi = {
  list: async (params?: ListDivisionsParams): Promise<DivisionRow[]> => {
    const res = await api.get<ApiResponse<DivisionRow[]>>('/settings/divisions', { params })
    return res.data.data
  },

  listValues: async (companyId: number | 'all'): Promise<DivisionOption[]> => {
    const res = await api.get<ApiResponse<DivisionOption[]>>('/settings/divisions/values', {
      params: { company_id: companyId },
    })
    return res.data.data
  },

  create: async (payload: CreateDivisionPayload): Promise<DivisionRow> => {
    const res = await api.post<ApiResponse<DivisionRow>>('/settings/divisions', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateDivisionPayload): Promise<DivisionRow> => {
    const res = await api.patch<ApiResponse<DivisionRow>>(`/settings/divisions/${id}`, payload)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/divisions/${id}`)
  },
}
