import type { Context } from 'hono'
import { z } from 'zod'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { getLoginLogs, getLoginLogById } from './login-log.service'
import { loginLogQuerySchema } from './login-log.schema'

export async function handleGetLoginLogs(c: Context) {
  const query = validateQuery(c, loginLogQuerySchema)
  const scopeIds = resolveCompanyScope(c, 'all')

  const { data, total } = await getLoginLogs({
    page: query.page ?? 1,
    per_page: query.per_page ?? 50,
    user_id: query.user_id,
    event: query.event,
    date_from: query.date_from,
    date_to: query.date_to,
    scopeIds,
    excludeSuperAdminActors: !c.var.user.isSuperAdmin,
  })
  return paginated(c, data, { page: query.page ?? 1, per_page: query.per_page ?? 50, total })
}

export async function handleGetLoginLogById(c: Context) {
  const { id } = validateParam(c, z.object({ id: z.coerce.number().int().positive() }))
  const log = await getLoginLogById(id, !c.var.user.isSuperAdmin)
  return success(c, log)
}
