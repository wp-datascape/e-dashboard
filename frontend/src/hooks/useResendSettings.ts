import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resendApi } from '@/api/resend.api'
import type { UpsertResendSettingsPayload } from '@/types/resend'

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
  return useMutation({
    mutationFn: (to: string) => resendApi.sendTestEmail(to),
  })
}
