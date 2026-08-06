import { api } from './axios'
import type { PaginatedResponse } from '@/types/api'
import type { AnalisisRow, AnalisisParams, RetentionRow, RetentionParams } from '@/types/analisis'

export const analisisApi = {
  get: async (params: AnalisisParams): Promise<PaginatedResponse<AnalisisRow>> => {
    const res = await api.get<PaginatedResponse<AnalisisRow>>('/analisis', { params })
    return res.data
  },
  getRetention: async (params: RetentionParams): Promise<PaginatedResponse<RetentionRow>> => {
    const res = await api.get<PaginatedResponse<RetentionRow>>('/analisis/retention', { params })
    return res.data
  },
}
