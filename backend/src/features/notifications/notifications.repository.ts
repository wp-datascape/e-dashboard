import { and, eq, desc, count } from 'drizzle-orm'
import { db } from '@/config/db'
import { notifications } from '@/db/schema'
import type { NewNotification } from '@/db/schema'

/** Ambil notifikasi terbaru per type, LINTAS user — dipakai preview "kirim contoh
 * laporan" di Config/Integration Resend tab (task016 §22), bukan buat user-facing
 * list (yang selalu scoped ke 1 user, lihat findNotificationsByUser di atas). */
export async function findRecentNotificationsByType(type: string, limit: number) {
  return db
    .select({ title: notifications.title, body: notifications.body })
    .from(notifications)
    .where(eq(notifications.type, type))
    .orderBy(desc(notifications.created_at))
    .limit(limit)
}

export async function findNotificationsByUser(
  userId: number,
  unreadOnly: boolean,
  page: number,
  perPage: number,
): Promise<{ rows: (typeof notifications.$inferSelect)[]; total: number }> {
  const conditions = [eq(notifications.user_id, userId)]
  if (unreadOnly) conditions.push(eq(notifications.is_read, false))
  const where = and(...conditions)

  const [{ value: total }] = await db.select({ value: count() }).from(notifications).where(where)

  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.created_at))
    .limit(perPage)
    .offset((page - 1) * perPage)

  return { rows, total: Number(total) }
}

export async function countUnread(userId: number): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
  return Number(value)
}

export async function findNotificationById(id: number) {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id))
  return row ?? null
}

export async function markNotificationRead(id: number) {
  const [row] = await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.id, id))
    .returning()
  return row
}

export async function markAllNotificationsRead(userId: number) {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
}

export async function createNotification(data: NewNotification) {
  const [row] = await db.insert(notifications).values(data).returning()
  return row
}

export async function createNotifications(data: NewNotification[]) {
  if (data.length === 0) return []
  return db.insert(notifications).values(data).returning()
}
