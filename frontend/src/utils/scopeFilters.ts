import type { MyScope } from '@/hooks/useMyScope'

export interface ScopedOptions<T> {
  /** false = user unrestricted di level ini (superadmin, atau full access) - caller pakai daftar penuh */
  restricted: boolean
  options: T[]
}

/**
 * Opsi branch yang boleh dipilih user untuk company tertentu.
 * - Superadmin → unrestricted (caller pakai useBranchesByCompany, daftar penuh).
 * - company='all' (non-superadmin) → union branch dari SEMUA company yang di-assign user
 *   (BUKAN unrestricted — company dropdown bisa saja disembunyikan krn user cuma punya 1
 *   company, tapi itu tak berarti dia boleh lihat branch company lain/di luar assignment).
 * - isFullBranchAccess (assignment mencakup SEMUA branch company itu) → unrestricted juga,
 *   meski user bukan superadmin (dia toh bisa lihat semua branch di company ini).
 * - Selain itu → restricted, cuma branch yang di-assign eksplisit.
 */
export function getScopedBranches(
  scope: MyScope,
  companyId: number | 'all',
): ScopedOptions<{ branch_id: number; branch_name: string; company_name?: string }> {
  if (scope.isSuperAdmin) return { restricted: false, options: [] }

  if (companyId === 'all') {
    // Union lintas company — nama branch BISA sama antar company (mis. tiap company
    // punya branch "Jakarta"), jadi ikutkan company_name di sini supaya caller bisa
    // kasih suffix pembeda di dropdown. Company spesifik (branch di bawah) tidak perlu
    // ini - dalam 1 company nama branch sudah pasti unik, tidak ambigu.
    const union = new Map<number, { branch_id: number; branch_name: string; company_name?: string }>()
    scope.companies.forEach((c) => c.branches.forEach((b) => union.set(b.branch_id, { branch_id: b.branch_id, branch_name: b.branch_name, company_name: c.company_name })))
    return { restricted: true, options: [...union.values()] }
  }

  const company = scope.companies.find((c) => c.company_id === companyId)
  if (!company) return { restricted: true, options: [] }
  if (company.isFullBranchAccess) return { restricted: false, options: [] }
  return { restricted: true, options: company.branches.map(({ branch_id, branch_name }) => ({ branch_id, branch_name })) }
}

/**
 * Opsi division yang boleh dipilih user, untuk company + branch (opsional) tertentu.
 * - Superadmin → unrestricted.
 * - company='all' (non-superadmin) → union division dari SEMUA branch di SEMUA company
 *   yang di-assign user (BUKAN unrestricted, alasan sama seperti getScopedBranches()).
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
  if (scope.isSuperAdmin) return { restricted: false, options: [] }

  if (companyId === 'all') {
    const union = new Set<string>()
    scope.companies.forEach((c) => c.branches.forEach((b) => b.divisions.forEach((d) => union.add(d))))
    return { restricted: true, options: [...union] }
  }

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
