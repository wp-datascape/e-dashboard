import { eq, desc, and, gte, lte, count, inArray, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { auditLogs, users } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'

export interface AuditLogsQuery {
  page: number
  per_page: number
  action?: string
  actor_id?: number
  company_id?: number
  date_from?: string
  date_to?: string
  scopeIds?: number[]
  excludeSuperAdminActors?: boolean
}

// Isolasi data superadmin: entry audit log yang aktornya superadmin disembunyikan
// total dari viewer non-superadmin. NOT EXISTS (bukan notInArray) supaya
// actor_id NULL (system action) tetap lolos apa adanya, bukan ikut ke-drop.
function excludeSuperAdminActorCondition() {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${auditLogs.actor_id} AND r.name = 'superadmin'
  )`
}

function mapRow(row: any) {
  const oldVal = row.oldValue as Record<string, unknown> | null
  const newVal = row.newValue as Record<string, unknown> | null

  let entityKey: string = String(row.entityId ?? '')
  if (row.entity === 'users') {
    entityKey = (newVal?.name as string) ?? (oldVal?.name as string) ?? (newVal?.email as string) ?? (oldVal?.email as string) ?? String(row.entityId ?? '')
  } else if (row.entity === 'roles') {
    entityKey = (newVal?.name as string) ?? (oldVal?.name as string) ?? String(row.entityId ?? '')
  } else if (row.entity === 'business_configs') {
    entityKey = (oldVal?.key as string) ?? String(row.entityId ?? '')
  }

  return {
    id: row.id,
    actor: row.actorId != null ? { id: row.actorId, name: row.actorName ?? '' } : null,
    action: row.action,
    entity: row.entity,
    entity_id: String(row.entityId ?? ''),
    entity_key: entityKey,
    company_id: row.companyId ?? null,
    old_value: oldVal,
    new_value: newVal,
    meta: row.meta as Record<string, unknown> | null,
    ip_address: row.ipAddress ?? '',
    request_id: row.requestId ?? '',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  }
}

export async function findAuditLogs(query: AuditLogsQuery) {
  const { page, per_page, action, actor_id, company_id, date_from, date_to, scopeIds, excludeSuperAdminActors } = query

  const conditions = []

  if (action) conditions.push(eq(auditLogs.action, action))
  if (actor_id) conditions.push(eq(auditLogs.actor_id, actor_id))
  if (company_id) conditions.push(eq(auditLogs.company_id, company_id))
  else if (scopeIds && scopeIds.length > 0) conditions.push(inArray(auditLogs.company_id, scopeIds))
  if (date_from) conditions.push(gte(auditLogs.created_at, new Date(date_from)))
  if (date_to) {
    const end = new Date(date_to)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(auditLogs.created_at, end))
  }
  if (excludeSuperAdminActors) conditions.push(excludeSuperAdminActorCondition())

  const where = conditions.length > 0 ? and(...conditions) : undefined

  try {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entity_id,
          companyId: auditLogs.company_id,
          oldValue: auditLogs.old_value,
          newValue: auditLogs.new_value,
          meta: auditLogs.meta,
          ipAddress: auditLogs.ip_address,
          requestId: auditLogs.request_id,
          createdAt: auditLogs.created_at,
          actorId: auditLogs.actor_id,
          actorName: sql<string | null>`${users.name}`.as('actor_name'),
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actor_id, users.id))
        .where(where)
        .orderBy(desc(auditLogs.created_at))
        .limit(per_page)
        .offset((page - 1) * per_page),

      db.select({ value: count() }).from(auditLogs).where(where),
    ])

    const data = rows.map(mapRow)
    return { data, total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findDistinctActions(): Promise<string[]> {
  try {
    const rows = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action)
    return rows.map((r) => r.action)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findAuditLogById(id: number, excludeSuperAdminActors: boolean) {
  try {
    const where = excludeSuperAdminActors
      ? and(eq(auditLogs.id, id), excludeSuperAdminActorCondition())
      : eq(auditLogs.id, id)

    const [row] = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entity_id,
        companyId: auditLogs.company_id,
        oldValue: auditLogs.old_value,
        newValue: auditLogs.new_value,
        meta: auditLogs.meta,
        ipAddress: auditLogs.ip_address,
        requestId: auditLogs.request_id,
        createdAt: auditLogs.created_at,
        actorId: auditLogs.actor_id,
        actorName: sql<string | null>`${users.name}`.as('actor_name'),
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actor_id, users.id))
      .where(where)
      .limit(1)

    if (!row) return null
    return mapRow(row)
  } catch (err) {
    handleDbError(err)
  }
}