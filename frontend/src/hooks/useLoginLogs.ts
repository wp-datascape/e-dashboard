import { useQuery } from '@tanstack/react-query'
import { loginLogApi } from '@/api/loginLog.api'
import type { LoginLogFilters } from '@/types/loginLog'

export const useLoginLogs = (filters: LoginLogFilters = {}) => {
  const mergedFilters: LoginLogFilters = {
    page: filters.page ?? 1,
    per_page: filters.per_page ?? 50,
    ...(filters.event && { event: filters.event }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  return useQuery({
    queryKey: ['loginLogs', mergedFilters],
    queryFn: () => loginLogApi.getLoginLogs(mergedFilters),
    staleTime: 0,
  })
}
