import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { customersQuerySchema, customerIdParamSchema, customerDetailQuerySchema } from './customers.schema'
import { getCustomers, getCustomerDetail } from './customers.service'

export async function handleGetCustomers(c: Context) {
  const query = validateQuery(c, customersQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getCustomers(query, scopeIds, branchScope, divisionScope)
  return paginated(c, result.data, {
    page: query.page,
    per_page: query.per_page,
    total: result.total,
  })
}

export async function handleGetCustomerDetail(c: Context) {
  const { id } = validateParam(c, customerIdParamSchema)
  const query = validateQuery(c, customerDetailQuerySchema)
  const detail = await getCustomerDetail(id, query.as_of_date)
  return success(c, detail)
}