import { api } from './axios'
import type { AuditLogResponse, AuditLogFilters } from '@/types/audit'

export const auditApi = {
  getAuditLogs: async (filters: AuditLogFilters): Promise<AuditLogResponse> => {
    const response = await api.get<AuditLogResponse>('/audit-logs', { params: filters })
    return response.data
  },
}
