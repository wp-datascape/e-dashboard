import { eq, desc, and, gte, lte, count, inArray, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { activityLogs, users, userCompanies } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'

export interface ActivityLogsQuery {
  page: number
  per_page: number
  user_id?: number
  module?: string
  method?: string
  date_from?: string
  date_to?: string
  scopeIds?: number[]
  excludeSuperAdminActors?: boolean
}

// Isolasi data superadmin — sama pola dengan audit_logs (lihat audit.repository.ts):
// entry milik user superadmin disembunyikan total dari viewer non-superadmin.
function excludeSuperAdminActorCondition() {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${activityLogs.user_id} AND r.name = 'superadmin'
  )`
}

// Resolve daftar user_id yang berada dalam scope company milik viewer (non-superadmin).
// Tidak ada kolom company_id di activity_logs, jadi scoping dilakukan via user_companies.
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
    method: row.method,
    path: row.path,
    module: row.module,
    status_code: row.statusCode,
    duration_ms: row.durationMs,
    ip_address: row.ipAddress ?? '',
    user_agent: row.userAgent ?? '',
    request_id: row.requestId ?? '',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  }
}

export async function findActivityLogs(query: ActivityLogsQuery) {
  const { page, per_page, user_id, module, method, date_from, date_to, scopeIds, excludeSuperAdminActors } = query

  const conditions = []

  if (user_id) conditions.push(eq(activityLogs.user_id, user_id))
  if (module) conditions.push(eq(activityLogs.module, module))
  if (method) conditions.push(eq(activityLogs.method, method))
  if (date_from) conditions.push(gte(activityLogs.created_at, new Date(date_from)))
  if (date_to) {
    const end = new Date(date_to)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(activityLogs.created_at, end))
  }
  if (excludeSuperAdminActors) conditions.push(excludeSuperAdminActorCondition())

  if (scopeIds) {
    const scopedUserIds = await resolveScopedUserIds(scopeIds)
    if (scopedUserIds.length === 0) return { data: [], total: 0 }
    conditions.push(inArray(activityLogs.user_id, scopedUserIds))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  try {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: activityLogs.id,
          userId: activityLogs.user_id,
          userName: sql<string | null>`${users.name}`.as('user_name'),
          method: activityLogs.method,
          path: activityLogs.path,
          module: activityLogs.module,
          statusCode: activityLogs.status_code,
          durationMs: activityLogs.duration_ms,
          ipAddress: activityLogs.ip_address,
          userAgent: activityLogs.user_agent,
          requestId: activityLogs.request_id,
          createdAt: activityLogs.created_at,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.user_id, users.id))
        .where(where)
        .orderBy(desc(activityLogs.created_at))
        .limit(per_page)
        .offset((page - 1) * per_page),

      db.select({ value: count() }).from(activityLogs).where(where),
    ])

    return { data: rows.map(mapRow), total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findActivityLogById(id: number, excludeSuperAdminActors: boolean) {
  const where = excludeSuperAdminActors
    ? and(eq(activityLogs.id, id), excludeSuperAdminActorCondition())
    : eq(activityLogs.id, id)

  try {
    const [row] = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.user_id,
        userName: sql<string | null>`${users.name}`.as('user_name'),
        method: activityLogs.method,
        path: activityLogs.path,
        module: activityLogs.module,
        statusCode: activityLogs.status_code,
        durationMs: activityLogs.duration_ms,
        ipAddress: activityLogs.ip_address,
        userAgent: activityLogs.user_agent,
        requestId: activityLogs.request_id,
        createdAt: activityLogs.created_at,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.user_id, users.id))
      .where(where)
      .limit(1)

    if (!row) return null
    return mapRow(row)
  } catch (err) {
    handleDbError(err)
  }
}
