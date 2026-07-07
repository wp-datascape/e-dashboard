import type { MyScope } from '@/hooks/useMyScope'

export interface ScopedOptions<T> {
  /** false = user unrestricted di level ini (superadmin, atau full access) - caller pakai daftar penuh */
  restricted: boolean
  options: T[]
}

/**
 * Opsi branch yang boleh dipilih user untuk company tertentu.
 * - Superadmin / company='all' → unrestricted (caller pakai useBranchesByCompany, daftar penuh).
 * - isFullBranchAccess (assignment mencakup SEMUA branch company itu) → unrestricted juga,
 *   meski user bukan superadmin (dia toh bisa lihat semua branch di company ini).
 * - Selain itu → restricted, cuma branch yang di-assign eksplisit.
 */
export function getScopedBranches(
  scope: MyScope,
  companyId: number | 'all',
): ScopedOptions<{ branch_id: number; branch_name: string }> {
  if (scope.isSuperAdmin || companyId === 'all') return { restricted: false, options: [] }
  const company = scope.companies.find((c) => c.company_id === companyId)
  if (!company) return { restricted: true, options: [] }
  if (company.isFullBranchAccess) return { restricted: false, options: [] }
  return { restricted: true, options: company.branches.map(({ branch_id, branch_name }) => ({ branch_id, branch_name })) }
}

/**
 * Opsi division yang boleh dipilih user, untuk company + branch (opsional) tertentu.
 * - Superadmin / company='all' → unrestricted.
 * - Branch spesifik dipilih → pakai isFullDivisionAccess/divisions branch itu saja.
 * - Branch belum dipilih ('all' branch dalam company) → gabungan (union) division dari
 *   SEMUA branch yang di-assign user di company itu; unrestricted kalau company full-access
 *   DAN semua branch-nya juga full division access.
 */
export function getScopedDivisions(
  scope: MyScope,
  companyId: number | 'all',
  branchId: number | 'all' | undefined,
): ScopedOptions<string> {
  if (scope.isSuperAdmin || companyId === 'all') return { restricted: false, options: [] }
  const company = scope.companies.find((c) => c.company_id === companyId)
  if (!company) return { restricted: true, options: [] }

  if (branchId && branchId !== 'all') {
    const branch = company.branches.find((b) => b.branch_id === branchId)
    if (!branch) return { restricted: true, options: [] }
    return branch.isFullDivisionAccess ? { restricted: false, options: [] } : { restricted: true, options: branch.divisions }
  }

  if (company.isFullBranchAccess && company.branches.every((b) => b.isFullDivisionAccess)) {
    return { restricted: false, options: [] }
  }
  const union = new Set<string>()
  company.branches.forEach((b) => b.divisions.forEach((d) => union.add(d)))
  return { restricted: true, options: [...union] }
}
