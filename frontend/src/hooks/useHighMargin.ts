import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { highMarginApi } from '@/api/highMargin.api'
import type { CreateHighMarginPayload, UpdateHighMarginPayload, HighMarginListParams } from '@/types/highMargin'

const KEY = 'high-margin'
const PRODUCTS_KEY = 'hm-products'
const CATEGORIES_KEY = 'hm-categories'

export function useHighMargins(params: HighMarginListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => highMarginApi.list(params),
    enabled: !!params.company_id,
  })
}

export function useCreateHighMargin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateHighMarginPayload) => highMarginApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateHighMargin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateHighMarginPayload }) =>
      highMarginApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeactivateHighMargin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => highMarginApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteHighMargin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => highMarginApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useLocalProducts(companyId: number | '') {
  return useQuery({
    queryKey: [PRODUCTS_KEY, companyId],
    queryFn: () => highMarginApi.getProducts(companyId as number),
    enabled: !!companyId,
  })
}

export function useLocalCategories(companyId: number | '') {
  return useQuery({
    queryKey: [CATEGORIES_KEY, companyId],
    queryFn: () => highMarginApi.getCategories(companyId as number),
    enabled: !!companyId,
  })
}
