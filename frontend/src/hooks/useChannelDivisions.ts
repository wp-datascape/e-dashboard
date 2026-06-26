import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { channelDivisionsApi } from '@/api/channelDivisions.api'
import type {
  CreateChannelDivisionPayload,
  UpdateChannelDivisionPayload,
  ListChannelDivisionsParams,
} from '@/types/channelDivisions'

const KEY = 'channel-divisions'

export function useChannelDivisions(params?: ListChannelDivisionsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => channelDivisionsApi.list(params),
  })
}

export function useCreateChannelDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateChannelDivisionPayload) => channelDivisionsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateChannelDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateChannelDivisionPayload }) =>
      channelDivisionsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteChannelDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => channelDivisionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
