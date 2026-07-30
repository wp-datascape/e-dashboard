import { useQuery } from '@tanstack/react-query'
import { analisisApi } from '@/api/analisis.api'
import type { AnalisisParams } from '@/types/analisis'

const KEY = 'analisis'

export function useAnalisis(params: AnalisisParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => analisisApi.get(params),
    enabled: !!params.company_id,
  })
}
