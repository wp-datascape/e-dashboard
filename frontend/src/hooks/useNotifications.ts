import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications.api'
import type { ListNotificationsParams } from '@/types/notifications'

const KEY = 'notifications'
const UNREAD_KEY = 'notifications-unread-count'

export function useNotifications(params: ListNotificationsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => notificationsApi.list(params),
    // Default global refetchOnWindowFocus:false (queryClient.ts) bikin dropdown
    // bell nampilin data basi kalau notifikasi baru masuk di background (lewat
    // scheduler) sementara tab ini sudah kebuka lama — override true khusus di
    // sini supaya balik ke tab langsung dapat data terbaru tanpa reload manual.
    refetchOnWindowFocus: true,
  })
}

// Polling ringan — badge di header perlu update walau user tidak refresh halaman.
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [UNREAD_KEY],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [UNREAD_KEY] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [UNREAD_KEY] })
    },
  })
}
