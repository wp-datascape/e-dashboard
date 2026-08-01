import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { resendApi } from '@/api/resend.api'
import type { UpsertResendSettingsPayload } from '@/types/resend'
import type { AnalisisPeriodType } from '@/types/analisis'

const KEYS = {
  settings: ['resend-settings'] as const,
}

export function useResendSettings() {
  return useQuery({
    queryKey: KEYS.settings,
    queryFn: () => resendApi.getSettings(),
  })
}

export function useSaveResendSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertResendSettingsPayload) => resendApi.saveSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.settings })
    },
  })
}

export function useSendTestEmail() {
  const { i18n } = useTranslation()
  return useMutation({
    mutationFn: (to: string) => resendApi.sendTestEmail(to, i18n.language),
  })
}

export function useSendTestDigestEmail() {
  const { i18n } = useTranslation()
  return useMutation({
    mutationFn: ({ to, periodType, endDate }: { to: string; periodType: AnalisisPeriodType; endDate: string }) =>
      resendApi.sendTestDigestEmail(to, periodType, endDate, i18n.language),
  })
}
