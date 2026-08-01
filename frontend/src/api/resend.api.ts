import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type { ResendSettings, UpsertResendSettingsPayload, SendTestEmailResult } from '@/types/resend'
import type { AnalisisPeriodType } from '@/types/analisis'

export const resendApi = {
  getSettings: async (): Promise<ResendSettings> => {
    const response = await api.get<ApiResponse<ResendSettings>>('/config/resend/settings')
    return response.data.data
  },

  saveSettings: async (payload: UpsertResendSettingsPayload): Promise<ResendSettings> => {
    try {
      const response = await api.put<ApiResponse<ResendSettings>>('/config/resend/settings', payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      if (axiosErr.response?.data) throw axiosErr.response.data
      throw err
    }
  },

  sendTestEmail: async (to: string): Promise<SendTestEmailResult> => {
    try {
      const response = await api.post<ApiResponse<SendTestEmailResult>>('/config/resend/test-email', { to })
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      if (axiosErr.response?.data) throw axiosErr.response.data
      throw err
    }
  },

  sendTestDigestEmail: async (to: string, periodType: AnalisisPeriodType, endDate: string): Promise<SendTestEmailResult> => {
    try {
      const response = await api.post<ApiResponse<SendTestEmailResult>>('/config/resend/test-digest-email', { to, period_type: periodType, end_date: endDate })
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      if (axiosErr.response?.data) throw axiosErr.response.data
      throw err
    }
  },
}
