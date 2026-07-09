import { api } from './axios'
import type { ApiResponse, ApiError } from '@/types/api'
import type {
  DivisionRow,
  CreateDivisionPayload,
  UpdateDivisionPayload,
  ListDivisionsParams,
} from '@/types/divisions'

export const divisionsApi = {
  list: async (params?: ListDivisionsParams): Promise<DivisionRow[]> => {
    const res = await api.get<ApiResponse<DivisionRow[]>>('/settings/divisions', { params })
    return res.data.data
  },

  create: async (payload: CreateDivisionPayload): Promise<DivisionRow> => {
    try {
      const res = await api.post<ApiResponse<DivisionRow>>('/settings/divisions', payload)
      return res.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  update: async (id: number, payload: UpdateDivisionPayload): Promise<DivisionRow> => {
    try {
      const res = await api.patch<ApiResponse<DivisionRow>>(`/settings/divisions/${id}`, payload)
      return res.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  remove: async (id: number): Promise<void> => {
    try {
      await api.delete(`/settings/divisions/${id}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },
}
