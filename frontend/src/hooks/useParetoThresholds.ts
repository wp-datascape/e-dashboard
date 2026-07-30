import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paretoThresholdsApi } from '@/api/paretoThresholds.api'
import type { UpsertParetoThresholdPayload, ListParetoThresholdsParams } from '@/types/paretoThresholds'

const KEY = 'pareto-thresholds'

export function useParetoThresholds(params: ListParetoThresholdsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => paretoThresholdsApi.list(params),
    enabled: !!params.company_id,
  })
}

export function useUpsertParetoThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertParetoThresholdPayload) => paretoThresholdsApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
