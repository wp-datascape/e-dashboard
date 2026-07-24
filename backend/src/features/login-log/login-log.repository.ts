import { eq, desc, and, gte, lte, count, inArray, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { loginLogs, users, userCompanies } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'

export interface LoginLogsQuery {
  page: number
  per_page: number
  user_id?: number
  event?: string
  date_from?: string
  date_to?: string
  scopeIds?: number[]
  excludeSuperAdminActors?: boolean
}

// Isolasi data superadmin — sama pola dengan audit_logs/activity_logs.
function excludeSuperAdminActorCondition() {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${loginLogs.user_id} AND r.name = 'superadmin'
  )`
}

async function resolveScopedUserIds(scopeIds: number[]): Promise<number[]> {
  if (scopeIds.length === 0) return []
  const rows = await db
    .selectDistinct({ userId: userCompanies.user_id })
    .from(userCompanies)
    .where(inArray(userCompanies.company_id, scopeIds))
  return rows.map((r) => r.userId)
}

function mapRow(row: any) {
  return {
    id: row.id,
    user: row.userId != null ? { id: row.userId, name: row.userName ?? '' } : null,
    email: row.email ?? '',
    event: row.event,
    reason: row.reason ?? '',
    ip_address: row.ipAddress ?? '',
    user_agent: row.userAgent ?? '',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  }
}

export async function findLoginLogs(query: LoginLogsQuery) {
  const { page, per_page, user_id, event, date_from, date_to, scopeIds, excludeSuperAdminActors } = query

  const conditions = []

  if (user_id) conditions.push(eq(loginLogs.user_id, user_id))
  if (event) conditions.push(eq(loginLogs.event, event))
  if (date_from) conditions.push(gte(loginLogs.created_at, new Date(date_from)))
  if (date_to) {
    const end = new Date(date_to)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(loginLogs.created_at, end))
  }
  if (excludeSuperAdminActors) conditions.push(excludeSuperAdminActorCondition())

  if (scopeIds) {
    const scopedUserIds = await resolveScopedUserIds(scopeIds)
    if (scopedUserIds.length === 0) return { data: [], total: 0 }
    conditions.push(inArray(loginLogs.user_id, scopedUserIds))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  try {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: loginLogs.id,
          userId: loginLogs.user_id,
          userName: sql<string | null>`${users.name}`.as('user_name'),
          email: loginLogs.email,
          event: loginLogs.event,
          reason: loginLogs.reason,
          ipAddress: loginLogs.ip_address,
          userAgent: loginLogs.user_agent,
          createdAt: loginLogs.created_at,
        })
        .from(loginLogs)
        .leftJoin(users, eq(loginLogs.user_id, users.id))
        .where(where)
        .orderBy(desc(loginLogs.created_at))
        .limit(per_page)
        .offset((page - 1) * per_page),

      db.select({ value: count() }).from(loginLogs).where(where),
    ])

    return { data: rows.map(mapRow), total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findLoginLogById(id: number, excludeSuperAdminActors: boolean) {
  const where = excludeSuperAdminActors
    ? and(eq(loginLogs.id, id), excludeSuperAdminActorCondition())
    : eq(loginLogs.id, id)

  try {
    const [row] = await db
      .select({
        id: loginLogs.id,
        userId: loginLogs.user_id,
        userName: sql<string | null>`${users.name}`.as('user_name'),
        email: loginLogs.email,
        event: loginLogs.event,
        reason: loginLogs.reason,
        ipAddress: loginLogs.ip_address,
        userAgent: loginLogs.user_agent,
        createdAt: loginLogs.created_at,
      })
      .from(loginLogs)
      .leftJoin(users, eq(loginLogs.user_id, users.id))
      .where(where)
      .limit(1)

    if (!row) return null
    return mapRow(row)
  } catch (err) {
    handleDbError(err)
  }
}
