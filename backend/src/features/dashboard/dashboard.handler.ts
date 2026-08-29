import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { dashboardQuerySchema } from './dashboard.schema'
import { getDashboard } from './dashboard.service'

export async function handleGetDashboard(c: Context) {
  // Fix bug (2026-07-06): getDashboard() sebelumnya dipanggil tanpa scope apa pun —
  // company_id di-hardcode 'all' tanpa resolveCompanyScope, jadi role apa pun
  // (termasuk 'user' biasa) melihat data SEMUA company. Lihat docs-v2/task/task001.md.
  const query = validateQuery(c, dashboardQuerySchema)
  const companyScopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, companyScopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const data = await getDashboard(
    { companyScopeIds, branchScope, divisionScope },
    query.company_id,
    query.branch_id,
    query.division,
    query.period_end,
    query.exclude_intercompany,
    query.period_start,
    query.period_type,
  )
  return success(c, data)
}
