import { eq, desc, and, gte, lte, count, sql } from 'drizzle-orm'
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
}

function mapRow(row: any) {
  const oldVal = row.oldValue as Record<string, unknown> | null
  const newVal = row.newValue as Record<string, unknown> | null

  let entityKey: string = row.entityId
  if (row.entity === 'users') {
    entityKey = (newVal?.name as string) ?? (oldVal?.name as string) ?? (newVal?.email as string) ?? (oldVal?.email as string) ?? row.entityId
  } else if (row.entity === 'roles') {
    entityKey = (newVal?.name as string) ?? (oldVal?.name as string) ?? row.entityId
  } else if (row.entity === 'business_configs') {
    entityKey = (oldVal?.key as string) ?? row.entityId
  }

  return {
    id: row.id,
    actor: row.actorId != null ? { id: row.actorId, name: row.actorName ?? '' } : null,
    action: row.action,
    entity: row.entity,
    entity_id: row.entityId,
    entity_key: entityKey,
    company_id: row.companyId,
    old_value: oldVal,
    new_value: newVal,
    meta: row.meta as Record<string, unknown> | null,
    ip_address: row.ipAddress,
    request_id: row.requestId,
    created_at: row.created_at.toISOString(),
  }
}

export async function findAuditLogs(query: AuditLogsQuery) {
  const { page, per_page, action, actor_id, company_id, date_from, date_to } = query

  const conditions = []

  if (action) conditions.push(eq(auditLogs.action, action))
  if (actor_id) conditions.push(eq(auditLogs.actor_id, actor_id))
  if (company_id) conditions.push(eq(auditLogs.company_id, company_id))
  if (date_from) conditions.push(gte(auditLogs.created_at, new Date(date_from)))
  if (date_to) {
    const end = new Date(date_to)
    end.setHours(23, 59, 59, 999)
    conditions.push(lte(auditLogs.created_at, end))
  }

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

export async function findAuditLogById(id: number) {
  try {
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
      .where(eq(auditLogs.id, id))
      .limit(1)

    if (!row) return null
    return mapRow(row)
  } catch (err) {
    handleDbError(err)
  }
}