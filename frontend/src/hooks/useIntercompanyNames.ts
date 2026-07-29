import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { intercompanyNamesApi } from '@/api/intercompanyNames.api'
import type { CreateIntercompanyNamePayload, UpdateIntercompanyNamePayload, ListIntercompanyNamesParams } from '@/types/intercompanyNames'

const KEY = 'intercompany-names'

export function useIntercompanyNames(params?: ListIntercompanyNamesParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => intercompanyNamesApi.list(params),
  })
}

export function useAmbiguousChannels(params?: ListIntercompanyNamesParams) {
  return useQuery({
    queryKey: [KEY, 'ambiguous-channels', params],
    queryFn: () => intercompanyNamesApi.listAmbiguousChannels(params),
  })
}

export function useCustomerNameOptions(companyId: number | null) {
  return useQuery({
    queryKey: [KEY, 'customer-options', companyId],
    queryFn: () => intercompanyNamesApi.listCustomerOptions(companyId as number),
    enabled: companyId != null,
  })
}

export function useCreateIntercompanyName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateIntercompanyNamePayload) => intercompanyNamesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateIntercompanyName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateIntercompanyNamePayload }) => intercompanyNamesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteIntercompanyName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => intercompanyNamesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
