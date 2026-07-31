import { Hono } from 'hono'
import {
  handleListNotifications,
  handleUnreadCount,
  handleMarkRead,
  handleMarkAllRead,
} from './notifications.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const notificationsRoutes = new Hono()

// 'notifications:view' (task016 §19) — SEBELUMNYA tanpa permission sama
// sekali ("siapa pun login boleh akses notifikasi miliknya"), diubah biar
// konsisten dgn pola menu lain (403 kalau role tidak punya akses). Data
// tetap di-scope by user_id di service seperti semula — permission ini
// kontrol BOLEH/TIDAK fitur notifikasi dipakai sama sekali, bukan ganti pola
// ownership-nya.
const notificationsMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, keyFn: keyByUser })

notificationsRoutes.get('/', requirePermission('notifications:view'), handleListNotifications)
notificationsRoutes.get('/unread-count', requirePermission('notifications:view'), handleUnreadCount)
notificationsRoutes.patch('/read-all', requirePermission('notifications:view'), notificationsMutationRateLimit, handleMarkAllRead)
notificationsRoutes.patch('/:id/read', requirePermission('notifications:view'), notificationsMutationRateLimit, handleMarkRead)
