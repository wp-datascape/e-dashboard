import { api } from './axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { NotificationRow, ListNotificationsParams } from '@/types/notifications'

export const notificationsApi = {
  list: async (params: ListNotificationsParams): Promise<PaginatedResponse<NotificationRow>> => {
    const res = await api.get<PaginatedResponse<NotificationRow>>('/notifications', { params })
    return res.data
  },

  unreadCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
    return res.data.data.count
  },

  markRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },
}
