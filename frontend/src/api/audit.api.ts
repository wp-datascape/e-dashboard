import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type { AuditLogResponse, AuditLogFilters } from '@/types/audit'

export const auditApi = {
  getAuditLogs: async (filters: AuditLogFilters): Promise<AuditLogResponse> => {
    const response = await api.get<AuditLogResponse>('/audit-logs', { params: filters })
    return response.data
  },

  getActions: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/audit-logs/actions')
    return response.data.data
  },
}
