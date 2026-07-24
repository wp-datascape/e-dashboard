import { useQuery } from '@tanstack/react-query'
import { activityLogApi } from '@/api/activityLog.api'
import type { ActivityLogFilters } from '@/types/activityLog'

export const useActivityLogs = (filters: ActivityLogFilters = {}) => {
  const mergedFilters: ActivityLogFilters = {
    page: filters.page ?? 1,
    per_page: filters.per_page ?? 50,
    ...(filters.module && { module: filters.module }),
    ...(filters.method && { method: filters.method }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  return useQuery({
    queryKey: ['activityLogs', mergedFilters],
    queryFn: () => activityLogApi.getActivityLogs(mergedFilters),
    staleTime: 0,
  })
}
