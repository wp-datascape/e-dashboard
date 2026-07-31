import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notifications.schema'
import { listNotificationsService, unreadCountService, markReadService, markAllReadService } from './notifications.service'

export async function handleListNotifications(c: Context) {
  const query = validateQuery(c, listNotificationsQuerySchema)
  const userId = c.var.user.userId
  const { rows, total } = await listNotificationsService(userId, query)
  return paginated(c, rows, { page: query.page, per_page: query.per_page, total })
}

export async function handleUnreadCount(c: Context) {
  const userId = c.var.user.userId
  const result = await unreadCountService(userId)
  return success(c, result)
}

export async function handleMarkRead(c: Context) {
  const { id } = validateParam(c, notificationIdParamSchema)
  const userId = c.var.user.userId
  const result = await markReadService(id, userId)
  return success(c, result)
}

export async function handleMarkAllRead(c: Context) {
  const userId = c.var.user.userId
  await markAllReadService(userId)
  return success(c, { ok: true })
}
