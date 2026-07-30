import { api } from './axios'
import type { PaginatedResponse } from '@/types/api'
import type { AnalisisRow, AnalisisParams } from '@/types/analisis'

export const analisisApi = {
  get: async (params: AnalisisParams): Promise<PaginatedResponse<AnalisisRow>> => {
    const res = await api.get<PaginatedResponse<AnalisisRow>>('/analisis', { params })
    return res.data
  },
}
