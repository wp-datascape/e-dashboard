import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit.api'
import type { AuditLogFilters } from '@/types/audit'

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  // Merge dengan default filters
  const mergedFilters: AuditLogFilters = {
    page: filters.page ?? 1,
    per_page: filters.per_page ?? 50,
    ...(filters.action && { action: filters.action }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  return useQuery({
    queryKey: ['auditLogs', mergedFilters],
    queryFn: () => auditApi.getAuditLogs(mergedFilters),
    staleTime: 0, // Always refetch fresh data
  })
}

export const useAuditActions = () => {
  return useQuery({
    queryKey: ['auditLogs', 'actions'],
    queryFn: () => auditApi.getActions(),
  })
}
