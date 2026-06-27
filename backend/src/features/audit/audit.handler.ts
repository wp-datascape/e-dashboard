import type { Context } from 'hono'
import { z } from 'zod'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { getAuditLogs, getAuditLogById } from './audit.service'
import { auditQuerySchema } from './audit.schema'

export async function handleGetAuditLogs(c: Context) {
  const query = validateQuery(c, auditQuerySchema)
  const page = query.page ?? 1
  const per_page = query.per_page ?? 50

  const { data, total } = await getAuditLogs({
    page, per_page,
    action: query.action,
    actor_id: query.actor_id,
    company_id: query.company_id,
    date_from: query.date_from,
    date_to: query.date_to,
  })
  return paginated(c, data, { page, per_page, total })
}

export async function handleGetAuditLogById(c: Context) {
  const { id } = validateParam(c, z.object({ id: z.coerce.number().int().positive() }))
  const log = await getAuditLogById(id)
  return success(c, log)
}
