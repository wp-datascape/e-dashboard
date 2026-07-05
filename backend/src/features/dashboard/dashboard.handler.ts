import type { Context } from 'hono'
import { success } from '@/utils/response'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope } from '@/middleware/auth'
import { getDashboard } from './dashboard.service'

export async function handleGetDashboard(c: Context) {
  // Fix bug (2026-07-06): getDashboard() sebelumnya dipanggil tanpa scope apa pun —
  // company_id di-hardcode 'all' tanpa resolveCompanyScope, jadi role apa pun
  // (termasuk 'user' biasa) melihat data SEMUA company. Lihat docs-v2/task/task001.md.
  const companyScopeIds = resolveCompanyScope(c, 'all')
  const branchScope = resolveBranchScope(c, companyScopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  const data = await getDashboard({ companyScopeIds, branchScope, divisionScope })
  return success(c, data)
}
