import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import {
  users,
  userRoles,
  roles,
  userCompanies,
  rolePermissions,
  permissions,
  userBranches,
  userDivisions,
  companies,
  company_branches,
  branch_divisions,
} from '@/db/schema'

export async function findActiveUserByEmail(email: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      is_active: users.is_active,
      failed_login_count: users.failed_login_count,
      locked_until: users.locked_until,
      token_version: users.token_version,
    })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deleted_at)))
    .limit(1)
  return result[0] ?? null
}

export async function findActiveUserById(userId: number) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      is_active: users.is_active,
      token_version: users.token_version,
      preferences: users.preferences,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1)
  return result[0] ?? null
}

export async function updateUserPreferences(userId: number, partial: Record<string, unknown>) {
  const [current] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1)
  if (!current) return null

  const merged = { ...(current.preferences ?? {}), ...partial }
  const result = await db
    .update(users)
    .set({ preferences: merged })
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .returning({ preferences: users.preferences })
  return result[0]?.preferences ?? null
}

export async function getUserTokenVersion(userId: number): Promise<number | null> {
  const result = await db
    .select({ token_version: users.token_version })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1)
  return result[0]?.token_version ?? null
}

export async function getUserCompanyIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ company_id: userCompanies.company_id })
    .from(userCompanies)
    .where(eq(userCompanies.user_id, userId))
  return rows.map((r) => r.company_id)
}

export async function getUserBranchScopes(
  userId: number,
): Promise<{ company_id: number; branch_id: number }[]> {
  return db
    .select({ company_id: userBranches.company_id, branch_id: userBranches.branch_id })
    .from(userBranches)
    .where(eq(userBranches.user_id, userId))
}

export async function getUserDivisionScopes(
  userId: number,
): Promise<{ branch_id: number; division_id: number }[]> {
  return db
    .select({ branch_id: userDivisions.branch_id, division_id: userDivisions.division_id })
    .from(userDivisions)
    .where(eq(userDivisions.user_id, userId))
}

export interface MyScopeBranch {
  branch_id: number
  branch_name: string
  isFullDivisionAccess: boolean
  division_ids: number[]
}
export interface MyScopeCompany {
  company_id: number
  company_name: string
  isFullBranchAccess: boolean
  branches: MyScopeBranch[]
}

/**
 * Pohon scope Company -> Branch -> Division milik user sendiri - dipakai frontend
 * utk populate dropdown filter (Dashboard, Customer/Product/Transaction Workbench)
 * supaya opsi yang muncul konsisten dengan hak akses user (bukan cuma enforcement
 * di backend, tapi UX-nya juga tidak menawarkan opsi yang bakal 403/kosong).
 *
 * isFullBranchAccess/isFullDivisionAccess = true kalau assignment user mencakup
 * SEMUA branch/division yang ada (dibanding total company_branches / total divisi katalog).
 *
 * 2026-07-10: divisions sekarang berupa integer division_id (FK), bukan string code.
 */
export async function getMyScopeTree(userId: number): Promise<MyScopeCompany[]> {
  const companyIds = await getUserCompanyIds(userId)
  if (companyIds.length === 0) return []

  const [companyRows, branchScopes, divisionScopes, allBranchRows, catalogRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds)),
    getUserBranchScopes(userId),
    getUserDivisionScopes(userId),
    db
      .select({ id: company_branches.id, name: company_branches.name, company_id: company_branches.company_id })
      .from(company_branches)
      .where(inArray(company_branches.company_id, companyIds)),
    // Katalog divisi aktif per company/branch — sekarang pakai branch_divisions
    db
      .select({ company_id: branch_divisions.company_id, branch_id: branch_divisions.branch_id, id: branch_divisions.id })
      .from(branch_divisions)
      .where(and(inArray(branch_divisions.company_id, companyIds), eq(branch_divisions.is_active, true))),
  ])

  const divisionIdsByBranch = new Map<number, number[]>()
  for (const { branch_id, division_id } of divisionScopes) {
    if (!divisionIdsByBranch.has(branch_id)) divisionIdsByBranch.set(branch_id, [])
    divisionIdsByBranch.get(branch_id)!.push(division_id)
  }

  const assignedBranchIdsByCompany = new Map<number, number[]>()
  for (const { company_id, branch_id } of branchScopes) {
    if (!assignedBranchIdsByCompany.has(company_id)) assignedBranchIdsByCompany.set(company_id, [])
    assignedBranchIdsByCompany.get(company_id)!.push(branch_id)
  }

  const allBranchesByCompany = new Map<number, { id: number; name: string }[]>()
  for (const b of allBranchRows) {
    if (!allBranchesByCompany.has(b.company_id)) allBranchesByCompany.set(b.company_id, [])
    allBranchesByCompany.get(b.company_id)!.push({ id: b.id, name: b.name })
  }

  // Katalog division_id per branch
  const companyWideDivisionIds = new Map<number, number[]>()
  const branchSpecificDivisionIds = new Map<number, number[]>()
  for (const row of catalogRows) {
    if (row.branch_id === null) {
      if (!companyWideDivisionIds.has(row.company_id)) companyWideDivisionIds.set(row.company_id, [])
      companyWideDivisionIds.get(row.company_id)!.push(row.id)
    } else {
      if (!branchSpecificDivisionIds.has(row.branch_id)) branchSpecificDivisionIds.set(row.branch_id, [])
      branchSpecificDivisionIds.get(row.branch_id)!.push(row.id)
    }
  }

  return companyRows.map((company) => {
    const assignedBranchIds = new Set(assignedBranchIdsByCompany.get(company.id) ?? [])
    const allBranches = allBranchesByCompany.get(company.id) ?? []
    const isFullBranchAccess = allBranches.length > 0 && allBranches.every((b) => assignedBranchIds.has(b.id))

    const branches: MyScopeBranch[] = allBranches
      .filter((b) => assignedBranchIds.has(b.id))
      .map((b) => {
        const divisionIds_ = divisionIdsByBranch.get(b.id) ?? []
        const allDivisionIdsForBranch = [...new Set([
          ...(companyWideDivisionIds.get(company.id) ?? []),
          ...(branchSpecificDivisionIds.get(b.id) ?? []),
        ])]
        const isFullDivisionAccess = allDivisionIdsForBranch.length > 0 && allDivisionIdsForBranch.every((d) => divisionIds_.includes(d))
        return { branch_id: b.id, branch_name: b.name, isFullDivisionAccess, division_ids: divisionIds_ }
      })

    return { company_id: company.id, company_name: company.name, isFullBranchAccess, branches }
  })
}

export async function getUserPrimaryRole(userId: number): Promise<string | null> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(eq(userRoles.user_id, userId))
    .limit(1)
  return rows[0]?.name ?? null
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: permissions.name })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.role_id, rolePermissions.role_id))
    .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
    .where(eq(userRoles.user_id, userId))
  return rows.map((r) => r.name)
}

export async function updateLastLogin(userId: number): Promise<void> {
  await db.update(users).set({ last_login_at: new Date() }).where(eq(users.id, userId))
}

export async function recordFailedLogin(userId: number, threshold: number, lockDurationMinutes: number): Promise<{ failedCount: number; justLocked: boolean }> {
  const [row] = await db
    .update(users)
    .set({ failed_login_count: sql`${users.failed_login_count} + 1` })
    .where(eq(users.id, userId))
    .returning({ failed_login_count: users.failed_login_count })

  const failedCount = row?.failed_login_count ?? 0
  const justLocked = failedCount >= threshold

  if (justLocked) {
    const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000)
    await db.update(users).set({ locked_until: lockedUntil }).where(eq(users.id, userId))
  }

  return { failedCount, justLocked }
}

export async function resetLoginAttempts(userId: number): Promise<void> {
  await db.update(users).set({ failed_login_count: 0, locked_until: null }).where(eq(users.id, userId))
}