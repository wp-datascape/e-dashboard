import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { customersQuerySchema, customerIdParamSchema } from './customers.schema'
import { getCustomers, getCustomerDetail } from './customers.service'

export async function handleGetCustomers(c: Context) {
  const query = validateQuery(c, customersQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await getCustomers(query, scopeIds)
  return paginated(c, result.data, {
    page: query.page,
    per_page: query.per_page,
    total: result.total,
  })
}

export async function handleGetCustomerDetail(c: Context) {
  const { id } = validateParam(c, customerIdParamSchema)
  const detail = await getCustomerDetail(id)
  return success(c, detail)
}
