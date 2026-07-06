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
} from '@/db/schema'

// 6 value bisnis existing + 'other' ("Lainnya") - lihat docs-v2/task/task001.md §4.5
const ALL_DIVISION_VALUES = ['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other']

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
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1)
  return result[0] ?? null
}

/**
 * Invalidasi sesi (Task002 Task D) — dipanggil authMiddleware tiap request untuk
 * bandingkan vs tokenVersion di JWT. Query ringan terpisah (bukan lewat
 * findActiveUserById) supaya bisa masuk Promise.all batch yang sudah ada di
 * authMiddleware tanpa nambah round-trip baru.
 */
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
): Promise<{ branch_id: number; division: string }[]> {
  return db
    .select({ branch_id: userDivisions.branch_id, division: userDivisions.division })
    .from(userDivisions)
    .where(eq(userDivisions.user_id, userId))
}

export interface MyScopeBranch {
  branch_id: number
  branch_name: string
  isFullDivisionAccess: boolean
  divisions: string[]
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
 * SEMUA branch/division yang ada (dibanding total company_branches / 7 value tetap) -
 * dipakai frontend utk nentuin apakah tampilkan opsi "All" atau daftar terbatas saja.
 */
export async function getMyScopeTree(userId: number): Promise<MyScopeCompany[]> {
  const companyIds = await getUserCompanyIds(userId)
  if (companyIds.length === 0) return []

  const [companyRows, branchScopes, divisionScopes, allBranchRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds)),
    getUserBranchScopes(userId),
    getUserDivisionScopes(userId),
    db
      .select({ id: company_branches.id, name: company_branches.name, company_id: company_branches.company_id })
      .from(company_branches)
      .where(inArray(company_branches.company_id, companyIds)),
  ])

  const divisionsByBranch = new Map<number, string[]>()
  for (const { branch_id, division } of divisionScopes) {
    if (!divisionsByBranch.has(branch_id)) divisionsByBranch.set(branch_id, [])
    divisionsByBranch.get(branch_id)!.push(division)
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

  return companyRows.map((company) => {
    const assignedBranchIds = new Set(assignedBranchIdsByCompany.get(company.id) ?? [])
    const allBranches = allBranchesByCompany.get(company.id) ?? []
    const isFullBranchAccess = allBranches.length > 0 && allBranches.every((b) => assignedBranchIds.has(b.id))

    const branches: MyScopeBranch[] = allBranches
      .filter((b) => assignedBranchIds.has(b.id))
      .map((b) => {
        const divisions = divisionsByBranch.get(b.id) ?? []
        const isFullDivisionAccess = ALL_DIVISION_VALUES.every((d) => divisions.includes(d))
        return { branch_id: b.id, branch_name: b.name, isFullDivisionAccess, divisions }
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

/**
 * Account lockout (Task002 Task C) — dipanggil setiap password salah. Increment
 * failed_login_count; kalau sudah mencapai threshold (ENV ACCOUNT_LOCKOUT_THRESHOLD),
 * set locked_until = now + durasi (ENV ACCOUNT_LOCKOUT_DURATION_MINUTES).
 * Return failed_login_count TERBARU (setelah increment) supaya service tahu apakah
 * baru saja jadi locked di percobaan ini (utk pesan error yang lebih jelas).
 */
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

/**
 * Reset failed_login_count + locked_until — dipanggil saat login SUKSES (percobaan
 * gagal sebelumnya tidak relevan lagi), atau saat admin unlock manual (Task C4).
 */
export async function resetLoginAttempts(userId: number): Promise<void> {
  await db.update(users).set({ failed_login_count: 0, locked_until: null }).where(eq(users.id, userId))
}
