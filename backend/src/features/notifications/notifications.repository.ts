import { and, eq, desc, count } from 'drizzle-orm'
import { db } from '@/config/db'
import { notifications } from '@/db/schema'
import type { NewNotification } from '@/db/schema'

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

// Batch per NOTIFICATIONS_INSERT_CHUNK_SIZE baris — Postgres punya limit KERAS
// 65535 parameter per statement. Dipanggil scheduler.ts dgn 1 baris per alert
// (bisa ribuan sekaligus utk company besar) — tanpa chunking, company dgn
// puluhan ribu customer/alert bikin insert ini SELALU gagal (ditemukan
// 2026-08-20, bug sama persis dgn pareto_period_snapshots di scheduler.ts,
// pemicu utama leak RAM production: gagal terus -> retry terus -> error
// message raksasa ke-log berulang). 5000 baris x ~7 kolom = 35.000 parameter/
// batch, aman di bawah limit.
const NOTIFICATIONS_INSERT_CHUNK_SIZE = 5000

export async function createNotifications(data: NewNotification[]) {
  if (data.length === 0) return []
  const inserted: (typeof notifications.$inferSelect)[] = []
  for (let i = 0; i < data.length; i += NOTIFICATIONS_INSERT_CHUNK_SIZE) {
    const chunk = data.slice(i, i + NOTIFICATIONS_INSERT_CHUNK_SIZE)
    inserted.push(...await db.insert(notifications).values(chunk).returning())
  }
  return inserted
}
