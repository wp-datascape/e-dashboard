import type { Context } from 'hono'
import { paginated } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { analisisQuerySchema } from './analisis.schema'
import { generateAnalisis } from './analisis.service'

export async function handleGetAnalisis(c: Context) {
  const query = validateQuery(c, analisisQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const { rows, total } = await generateAnalisis(query, scopeIds)
  return paginated(c, rows, { page: query.page, per_page: query.per_page, total })
}
