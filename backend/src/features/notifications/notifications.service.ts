import { AppError, ErrorCode } from '@/errors'
import {
  findNotificationsByUser,
  countUnread,
  findNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications.repository'
import type { ListNotificationsQuery } from './notifications.schema'

export async function listNotificationsService(userId: number, query: ListNotificationsQuery) {
  return findNotificationsByUser(userId, query.unread_only, query.page, query.per_page)
}

export async function unreadCountService(userId: number) {
  const count = await countUnread(userId)
  return { count }
}

export async function markReadService(id: number, userId: number) {
  const existing = await findNotificationById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Notifikasi #${id} tidak ditemukan`, 404)
  // Notifikasi milik user lain diperlakukan seolah tidak ada — jangan expose
  // keberadaan notifikasi user lain (pola sama seperti findInvoiceDetail).
  if (existing.user_id !== userId) throw new AppError(ErrorCode.NOT_FOUND, `Notifikasi #${id} tidak ditemukan`, 404)

  return markNotificationRead(id)
}

export async function markAllReadService(userId: number) {
  await markAllNotificationsRead(userId)
}
