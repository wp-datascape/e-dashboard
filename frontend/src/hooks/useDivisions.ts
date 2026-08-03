import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { divisionsApi } from '@/api/divisions.api'
import type { ListDivisionsParams, CreateDivisionPayload, UpdateDivisionPayload } from '@/types/divisions'

const KEY = 'divisions'
const VALUES_KEY = 'divisions-values'

/** List lengkap (CRUD admin, termasuk nonaktif) — butuh settings.division:view */
export function useDivisions(params?: ListDivisionsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => divisionsApi.list(params),
  })
}

/**
 * Division aktif saja dari tabel `divisions` (katalog CRUD per company, task012 v2,
 * FK-based) — dipakai AssignmentTreePicker, dropdown form Create Division/
 * DivisionMappingDialog, DAN filter report lintas halaman (ScopeFilterFields dkk —
 * §2d task012.md, filter sekarang numeric division_id, bukan string key lagi).
 * Endpoint ini tidak butuh permission khusus (lihat divisions.route.ts).
 */
export function useActiveDivisions(companyId: number | 'all') {
  return useQuery({
    queryKey: [VALUES_KEY, companyId],
    queryFn: () => divisionsApi.listValues(companyId),
    enabled: !!companyId,
  })
}

export function useCreateDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDivisionPayload) => divisionsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}

export function useUpdateDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDivisionPayload }) =>
      divisionsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}

export function useDeleteDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => divisionsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [VALUES_KEY] })
    },
  })
}
