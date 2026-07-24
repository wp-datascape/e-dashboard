import type { Context } from 'hono'
import { z } from 'zod'
import { success, paginated } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { getActivityLogs, getActivityLogById, createPageView } from './activity-log.service'
import { activityLogQuerySchema, pageViewSchema } from './activity-log.schema'

export async function handleGetActivityLogs(c: Context) {
  const query = validateQuery(c, activityLogQuerySchema)
  const scopeIds = resolveCompanyScope(c, 'all')

  const { data, total } = await getActivityLogs({
    page: query.page ?? 1,
    per_page: query.per_page ?? 50,
    user_id: query.user_id,
    module: query.module,
    method: query.method,
    date_from: query.date_from,
    date_to: query.date_to,
    scopeIds,
    excludeSuperAdminActors: !c.var.user.isSuperAdmin,
  })
  return paginated(c, data, { page: query.page ?? 1, per_page: query.per_page ?? 50, total })
}

export async function handleGetActivityLogById(c: Context) {
  const { id } = validateParam(c, z.object({ id: z.coerce.number().int().positive() }))
  const log = await getActivityLogById(id, !c.var.user.isSuperAdmin)
  return success(c, log)
}

export async function handleCreatePageView(c: Context) {
  const body = await validateBody(c, pageViewSchema)
  await createPageView(c, body)
  return success(c, null, 'Page view dicatat')
}
