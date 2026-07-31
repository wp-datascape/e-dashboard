import { Hono } from 'hono'
import {
  handleListNotifications,
  handleUnreadCount,
  handleMarkRead,
  handleMarkAllRead,
} from './notifications.handler'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const notificationsRoutes = new Hono()

// Tidak butuh requirePermission — notifikasi bersifat personal, siapa pun yang
// sudah login (authMiddleware di protectedApi) berhak lihat/kelola notifikasi
// miliknya sendiri (di-scope by user_id di service, bukan permission check).
const notificationsMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, keyFn: keyByUser })

notificationsRoutes.get('/', handleListNotifications)
notificationsRoutes.get('/unread-count', handleUnreadCount)
notificationsRoutes.patch('/read-all', notificationsMutationRateLimit, handleMarkAllRead)
notificationsRoutes.patch('/:id/read', notificationsMutationRateLimit, handleMarkRead)
