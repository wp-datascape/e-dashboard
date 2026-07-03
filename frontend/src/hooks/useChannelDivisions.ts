import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { channelDivisionsApi } from '@/api/channelDivisions.api'
import type {
  CreateChannelDivisionPayload,
  UpdateChannelDivisionPayload,
  ListChannelDivisionsParams,
} from '@/types/channelDivisions'

const KEY = 'channel-divisions'
const UNMAPPED_KEY = 'channel-divisions-unmapped'
const VALUES_KEY = 'channel-divisions-values'

export function useChannelDivisions(params?: ListChannelDivisionsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => channelDivisionsApi.list(params),
  })
}

/**
 * Nilai divisi unik saja (bukan mapping channel_name lengkap) — dipakai
 * useDivisionOptions() untuk dropdown filter. Endpoint ini tidak butuh
 * permission khusus (lihat channel-divisions.route.ts), beda dari
 * useChannelDivisions() di atas yang tetap perlu settings.channel.division:view.
 */
export function useDivisionValues(companyId: number | 'all') {
  return useQuery({
    queryKey: [VALUES_KEY, companyId],
    queryFn: () => channelDivisionsApi.listDivisionValues(companyId),
  })
}

/** Channel name riil dari invoices yang belum punya mapping — untuk dropdown "Add Channel Mapping". */
export function useUnmappedChannels(companyId: number | 'all', enabled = true) {
  return useQuery({
    queryKey: [UNMAPPED_KEY, companyId],
    queryFn: () => channelDivisionsApi.listUnmappedChannels(companyId),
    enabled,
  })
}

export function useCreateChannelDivision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateChannelDivisionPayload) => channelDivisionsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [UNMAPPED_KEY] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [UNMAPPED_KEY] })
    },
  })
}
