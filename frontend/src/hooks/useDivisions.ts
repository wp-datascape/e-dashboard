import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { divisionsApi } from '@/api/divisions.api'
import type { ApiError } from '@/types/api'
import type {
  DivisionRow,
  CreateDivisionPayload,
  UpdateDivisionPayload,
  ListDivisionsParams,
} from '@/types/divisions'

const KEY = 'divisions'

export function useDivisions(params?: ListDivisionsParams) {
  return useQuery<DivisionRow[]>({
    queryKey: [KEY, params],
    queryFn: () => divisionsApi.list(params),
  })
}

export function useCreateDivision() {
  const qc = useQueryClient()
  return useMutation<DivisionRow, ApiError, CreateDivisionPayload>({
    mutationFn: (payload) => divisionsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateDivision() {
  const qc = useQueryClient()
  return useMutation<DivisionRow, ApiError, { id: number; payload: UpdateDivisionPayload }>({
    mutationFn: ({ id, payload }) => divisionsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteDivision() {
  const qc = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (id) => divisionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
