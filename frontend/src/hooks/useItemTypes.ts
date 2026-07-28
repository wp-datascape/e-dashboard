import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemTypesApi } from '@/api/itemTypes.api'
import type { ListItemTypesParams, CreateItemTypePayload, UpdateItemTypePayload } from '@/types/itemTypes'

const KEY = 'item-types'
const VALUES_KEY = 'item-types-values'

/** List lengkap (CRUD admin, termasuk nonaktif) — butuh config.classification:view */
export function useItemTypes(params?: ListItemTypesParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => itemTypesApi.list(params),
  })
}

/**
 * Item type aktif saja — dipakai dropdown filter (Products page) & dropdown
 * form rule (Classification Rules page). Endpoint ini tidak butuh permission
 * khusus (lihat item-types.route.ts), beda dari useItemTypes() di atas.
 */
export function useItemTypeValues(companyId: number | 'all') {
  return useQuery({
    queryKey: [VALUES_KEY, companyId],
    queryFn: () => itemTypesApi.listValues(companyId),
    enabled: companyId !== undefined,
  })
}

export function useCreateItemType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateItemTypePayload) => itemTypesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}

export function useUpdateItemType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateItemTypePayload }) =>
      itemTypesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}

export function useDeleteItemType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => itemTypesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}
