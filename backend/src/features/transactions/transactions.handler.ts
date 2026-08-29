import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { invoicesQuerySchema, invoicesSummaryQuerySchema, invoiceIdParamSchema } from './transactions.schema'
import { getInvoices, getInvoicesSummary, getInvoiceDetail } from './transactions.service'

export async function handleGetInvoices(c: Context) {
  const query = validateQuery(c, invoicesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getInvoices(query, scopeIds, branchScope, divisionScope)
  return paginated(c, result.data, { page: query.page, per_page: query.per_page, total: result.total })
}

export async function handleGetInvoicesSummary(c: Context) {
  const query = validateQuery(c, invoicesSummaryQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getInvoicesSummary(query, scopeIds, branchScope, divisionScope)
  return success(c, result)
}

export async function handleGetInvoiceDetail(c: Context) {
  const { id } = validateParam(c, invoiceIdParamSchema)
  const scopeIds = resolveCompanyScope(c, 'all')
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  const detail = await getInvoiceDetail(id, scopeIds, branchScope, divisionScope)
  return success(c, detail)
}
