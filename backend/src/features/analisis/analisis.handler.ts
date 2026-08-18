import type { Context } from 'hono'
import { paginated } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { analisisQuerySchema } from './analisis.schema'
import { generateAnalisis } from './analisis.service'
import { generateRetentionAnalisis } from './retention.service'

export async function handleGetAnalisis(c: Context) {
  const query = validateQuery(c, analisisQuerySchema)
  // Urutan WAJIB company -> branch -> division (lihat middleware/auth.ts) —
  // hasilnya diteruskan penuh ke service/repository, BUKAN dihitung lalu
  // dibuang (itu persis bug company-scope bypass 2026-07-06 di metrics.handler.ts).
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const { rows, total, summary } = await generateAnalisis(query, scopeIds, branchScope, divisionScope)
  return paginated(c, rows, { page: query.page, per_page: query.per_page, total, summary: summary as unknown as Record<string, unknown> })
}

export async function handleGetRetentionAnalisis(c: Context) {
  const query = validateQuery(c, analisisQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const { rows, total, summary } = await generateRetentionAnalisis(query, scopeIds, branchScope, divisionScope)
  return paginated(c, rows, { page: query.page, per_page: query.per_page, total, summary: summary as unknown as Record<string, unknown> })
}
