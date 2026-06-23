import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accurateApi } from '@/api/accurate.api'
import type { AccurateCredentialsPayload } from '@/types/accurate'

const KEYS = {
  branches: (companyId: number) => ['branches', companyId] as const,
  credentials: (branchId: number) => ['accurate-credentials', branchId] as const,
}

export function useBranches(companyId: number | null) {
  return useQuery({
    queryKey: KEYS.branches(companyId ?? 0),
    queryFn: () => accurateApi.getBranchesByCompany(companyId!),
    enabled: !!companyId,
  })
}

export function useCredentials(branchId: number | null) {
  return useQuery({
    queryKey: KEYS.credentials(branchId ?? 0),
    queryFn: () => accurateApi.getCredentials(branchId!),
    enabled: !!branchId,
  })
}

export function useSaveCredentials() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AccurateCredentialsPayload) => accurateApi.saveCredentials(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: KEYS.credentials(payload.branch_id) })
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (payload: AccurateCredentialsPayload) => accurateApi.testConnection(payload),
  })
}