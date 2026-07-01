import type { Context } from 'hono'
import { z } from 'zod'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { getAuditLogs, getAuditLogById, getAuditActions } from './audit.service'
import { auditQuerySchema } from './audit.schema'

export async function handleGetAuditLogs(c: Context) {
  const query = validateQuery(c, auditQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id ?? 'all')

  const { data, total } = await getAuditLogs({
    page: query.page ?? 1,
    per_page: query.per_page ?? 50,
    action: query.action,
    actor_id: query.actor_id,
    company_id: query.company_id,
    date_from: query.date_from,
    date_to: query.date_to,
    scopeIds,
  })
  return paginated(c, data, { page: query.page ?? 1, per_page: query.per_page ?? 50, total })
}

export async function handleGetAuditActions(c: Context) {
  const actions = await getAuditActions()
  return success(c, actions)
}

export async function handleGetAuditLogById(c: Context) {
  const { id } = validateParam(c, z.object({ id: z.coerce.number().int().positive() }))
  const log = await getAuditLogById(id)
  return success(c, log)
}
