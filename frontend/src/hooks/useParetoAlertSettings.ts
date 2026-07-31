import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paretoAlertSettingsApi } from '@/api/paretoAlertSettings.api'
import type { UpsertParetoAlertSettingPayload, ListParetoAlertSettingsParams } from '@/types/paretoThresholds'

const KEY = 'pareto-alert-settings'

export function useParetoAlertSettings(params: ListParetoAlertSettingsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => paretoAlertSettingsApi.list(params),
    enabled: !!params.company_id,
  })
}

export function useUpsertParetoAlertSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertParetoAlertSettingPayload) => paretoAlertSettingsApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
