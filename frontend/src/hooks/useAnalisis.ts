import { useQuery } from '@tanstack/react-query'
import { analisisApi } from '@/api/analisis.api'
import type { AnalisisParams, RetentionParams } from '@/types/analisis'

const KEY = 'analisis'
const RETENTION_KEY = 'analisis-retention'

export function useAnalisis(params: AnalisisParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => analisisApi.get(params),
    enabled: !!params.company_id,
  })
}

export function useRetentionAnalisis(params: RetentionParams) {
  return useQuery({
    queryKey: [RETENTION_KEY, params],
    queryFn: () => analisisApi.getRetention(params),
    enabled: !!params.company_id,
  })
}
