import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  ParetoAlertSettingRow,
  UpsertParetoAlertSettingPayload,
  ListParetoAlertSettingsParams,
} from '@/types/paretoThresholds'

export const paretoAlertSettingsApi = {
  list: async (params: ListParetoAlertSettingsParams): Promise<ParetoAlertSettingRow[]> => {
    const res = await api.get<ApiResponse<ParetoAlertSettingRow[]>>('/settings/pareto-alert-settings', { params })
    return res.data.data
  },

  upsert: async (payload: UpsertParetoAlertSettingPayload): Promise<ParetoAlertSettingRow> => {
    const res = await api.put<ApiResponse<ParetoAlertSettingRow>>('/settings/pareto-alert-settings', payload)
    return res.data.data
  },
}
