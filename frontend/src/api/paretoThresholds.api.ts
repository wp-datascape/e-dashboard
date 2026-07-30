import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type { ParetoThresholdRow, UpsertParetoThresholdPayload, ListParetoThresholdsParams } from '@/types/paretoThresholds'

export const paretoThresholdsApi = {
  list: async (params: ListParetoThresholdsParams): Promise<ParetoThresholdRow[]> => {
    const res = await api.get<ApiResponse<ParetoThresholdRow[]>>('/settings/pareto-thresholds', { params })
    return res.data.data
  },

  upsert: async (payload: UpsertParetoThresholdPayload): Promise<ParetoThresholdRow> => {
    const res = await api.put<ApiResponse<ParetoThresholdRow>>('/settings/pareto-thresholds', payload)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/pareto-thresholds/${id}`)
  },
}
