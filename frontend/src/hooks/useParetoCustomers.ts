import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paretoCustomersApi } from '@/api/paretoCustomers.api'
import type { CreateParetoCustomerPayload, UpdateParetoCustomerPayload, ListParetoCustomersParams } from '@/types/paretoCustomers'

const KEY = 'pareto-customers'
const OPTIONS_KEY = 'pareto-customer-options'

export function useParetoCustomers(params: ListParetoCustomersParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => paretoCustomersApi.list(params),
    enabled: !!params.company_id,
  })
}

export function useCreateParetoCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateParetoCustomerPayload) => paretoCustomersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateParetoCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateParetoCustomerPayload }) =>
      paretoCustomersApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeactivateParetoCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paretoCustomersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteParetoCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paretoCustomersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useParetoCustomerOptions(companyId: number | '') {
  return useQuery({
    queryKey: [OPTIONS_KEY, companyId],
    queryFn: () => paretoCustomersApi.customerOptions(companyId as number),
    enabled: !!companyId,
  })
}
