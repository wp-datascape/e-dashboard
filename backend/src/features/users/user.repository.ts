import { eq, isNull, and, count, inArray, sql, type SQL } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, roles, userCompanies, companies, userBranches, userDivisions, company_branches } from '@/db/schema'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { handleDbError } from '@/utils/dbError'
import type { PaginationQuery } from '@/utils/validator'
import type { CreateUserDto, UpdateUserDto, CompanyAssignmentDto } from './user.schema'

// Strip password dari hasil query sebelum dikembalikan ke caller
function stripPassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _, ...rest } = user
  return rest
}

// Isolasi data superadmin: baris user dengan role 'superadmin' disembunyikan total
// dari viewer non-superadmin (default-deny by role, bukan cuma restriksi field).
// NOT EXISTS (bukan notInArray) supaya userIdCol NULL tetap lolos apa adanya.
function excludeSuperAdminCondition(userIdCol: PgColumn): SQL {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${userIdCol} AND r.name = 'superadmin'
  )`
}

// Ambil roles & companies untuk sekumpulan user_id lewat 2 query terpisah
// (bukan JOIN ganda dalam satu query) — JOIN userRoles+roles DAN
// userCompanies+companies sekaligus di query yang sama menyebabkan cartesian
// product sebelum GROUP BY: user dengan 1 role + 3 company akan menghasilkan
// 3 baris pre-aggregate, sehingga role-nya ikut ter-duplikasi 3x di json_agg.
async function fetchRolesAndCompaniesByUserIds(userIds: number[]) {
  const rolesByUser = new Map<number, Array<{ id: number; name: string; is_system: boolean }>>()
  const companiesByUser = new Map<number, Array<{ id: number; code: string; name: string }>>()

  if (userIds.length === 0) return { rolesByUser, companiesByUser }

  const [roleRows, companyRows] = await Promise.all([
    db
      .select({
        userId: userRoles.user_id,
        id: roles.id,
        name: roles.name,
        is_system: roles.is_system,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(inArray(userRoles.user_id, userIds)),
    db
      .select({
        userId: userCompanies.user_id,
        id: companies.id,
        code: companies.code,
        name: companies.name,
      })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.company_id, companies.id))
      .where(inArray(userCompanies.user_id, userIds)),
  ])

  for (const { userId, ...role } of roleRows) {
    if (!rolesByUser.has(userId)) rolesByUser.set(userId, [])
    rolesByUser.get(userId)!.push(role)
  }
  for (const { userId, ...company } of companyRows) {
    if (!companiesByUser.has(userId)) companiesByUser.set(userId, [])
    companiesByUser.get(userId)!.push(company)
  }

  return { rolesByUser, companiesByUser }
}

// Ambil pohon assignment Company -> Branch -> Division untuk sekumpulan user_id.
// 3 query terpisah (bukan JOIN bertingkat) - alasan sama seperti fetchRolesAndCompaniesByUserIds:
// hindari cartesian product sebelum di-assemble di JS.
async function fetchAssignmentTreeByUserIds(userIds: number[]) {
  type BranchNode = { branch_id: number; branch_name: string; divisions: string[] }
  type CompanyNode = { company_id: number; company_name: string; branches: BranchNode[] }
  const treeByUser = new Map<number, CompanyNode[]>()

  if (userIds.length === 0) return treeByUser

  const [companyRows, branchRows, divisionRows] = await Promise.all([
    db
      .select({ userId: userCompanies.user_id, id: companies.id, name: companies.name })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.company_id, companies.id))
      .where(inArray(userCompanies.user_id, userIds)),
    db
      .select({
        userId: userBranches.user_id,
        companyId: userBranches.company_id,
        branchId: userBranches.branch_id,
        branchName: company_branches.name,
      })
      .from(userBranches)
      .innerJoin(company_branches, eq(userBranches.branch_id, company_branches.id))
      .where(inArray(userBranches.user_id, userIds)),
    db
      .select({ userId: userDivisions.user_id, branchId: userDivisions.branch_id, division: userDivisions.division })
      .from(userDivisions)
      .where(inArray(userDivisions.user_id, userIds)),
  ])

  const divisionsByUserBranch = new Map<string, string[]>()
  for (const { userId, branchId, division } of divisionRows) {
    const key = `${userId}:${branchId}`
    if (!divisionsByUserBranch.has(key)) divisionsByUserBranch.set(key, [])
    divisionsByUserBranch.get(key)!.push(division)
  }

  const branchesByUserCompany = new Map<string, BranchNode[]>()
  for (const { userId, companyId, branchId, branchName } of branchRows) {
    const key = `${userId}:${companyId}`
    if (!branchesByUserCompany.has(key)) branchesByUserCompany.set(key, [])
    branchesByUserCompany.get(key)!.push({
      branch_id: branchId,
      branch_name: branchName,
      divisions: divisionsByUserBranch.get(`${userId}:${branchId}`) ?? [],
    })
  }

  for (const { userId, id, name } of companyRows) {
    if (!treeByUser.has(userId)) treeByUser.set(userId, [])
    treeByUser.get(userId)!.push({
      company_id: id,
      company_name: name,
      branches: branchesByUserCompany.get(`${userId}:${id}`) ?? [],
    })
  }

  return treeByUser
}

// Replace assignment Company/Branch/Division sekaligus dalam satu transaksi -
// supaya tidak ada state invalid (mis. division ter-assign tapi branch parent-nya
// terhapus). Mirror pola replaceUserCompanies/replaceUserRoles tapi untuk 3 tabel.
export async function replaceUserAssignments(userId: number, assignments: CompanyAssignmentDto[]) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(userCompanies).where(eq(userCompanies.user_id, userId))
      await tx.delete(userBranches).where(eq(userBranches.user_id, userId))
      await tx.delete(userDivisions).where(eq(userDivisions.user_id, userId))

      if (assignments.length === 0) return

      await tx.insert(userCompanies).values(
        assignments.map((a) => ({ user_id: userId, company_id: a.company_id })),
      )

      const branchRows = assignments.flatMap((a) =>
        a.branches.map((b) => ({ user_id: userId, company_id: a.company_id, branch_id: b.branch_id })),
      )
      if (branchRows.length > 0) await tx.insert(userBranches).values(branchRows)

      const divisionRows = assignments.flatMap((a) =>
        a.branches.flatMap((b) =>
          b.divisions.map((division) => ({ user_id: userId, branch_id: b.branch_id, division })),
        ),
      )
      if (divisionRows.length > 0) await tx.insert(userDivisions).values(divisionRows)
    })
  } catch (err) {
    handleDbError(err)
  }
}

export async function findAllUsers(pagination: PaginationQuery, excludeSuperAdmin: boolean) {
  const { page, per_page } = pagination
  const where = excludeSuperAdmin
    ? and(isNull(users.deleted_at), excludeSuperAdminCondition(users.id))
    : isNull(users.deleted_at)

  try {
    const [usersData, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          is_active: users.is_active,
          created_at: users.created_at,
          updated_at: users.updated_at,
          last_login_at: users.last_login_at,
          deleted_at: users.deleted_at,
        })
        .from(users)
        .where(where)
        .limit(per_page)
        .offset((page - 1) * per_page),
      db.select({ value: count() }).from(users).where(where),
    ])

    const userIds = usersData.map((u) => u.id)
    const [{ rolesByUser, companiesByUser }, assignmentTreeByUser] = await Promise.all([
      fetchRolesAndCompaniesByUserIds(userIds),
      fetchAssignmentTreeByUserIds(userIds),
    ])

    const rows = usersData.map((user) => ({
      ...user,
      roles: rolesByUser.get(user.id) ?? [],
      companies: companiesByUser.get(user.id) ?? [],
      company_assignments: assignmentTreeByUser.get(user.id) ?? [],
    }))

    return { rows, total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findUserById(id: number, excludeSuperAdmin: boolean) {
  try {
    const conditions = [eq(users.id, id), isNull(users.deleted_at)]
    if (excludeSuperAdmin) conditions.push(excludeSuperAdminCondition(users.id))

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        is_active: users.is_active,
        created_at: users.created_at,
        updated_at: users.updated_at,
        last_login_at: users.last_login_at,
        deleted_at: users.deleted_at,
      })
      .from(users)
      .where(and(...conditions))

    if (!user) return null

    const [{ rolesByUser, companiesByUser }, assignmentTreeByUser] = await Promise.all([
      fetchRolesAndCompaniesByUserIds([id]),
      fetchAssignmentTreeByUserIds([id]),
    ])

    return {
      ...user,
      roles: rolesByUser.get(id) ?? [],
      companies: companiesByUser.get(id) ?? [],
      company_assignments: assignmentTreeByUser.get(id) ?? [],
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findUserByEmail(email: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deleted_at)))
      .limit(1)

    return user ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createUser(data: CreateUserDto & { password: string }) {
  try {
    const [user] = await db.insert(users).values(data).returning()
    return stripPassword(user!)
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateUser(id: number, data: UpdateUserDto) {
  try {
    const [user] = await db
      .update(users)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .returning()

    return user ? stripPassword(user) : null
  } catch (err) {
    handleDbError(err)
  }
}

export async function replaceUserRoles(userId: number, roleIds: number[]) {
  try {
    await db.delete(userRoles).where(eq(userRoles.user_id, userId))
    if (roleIds.length > 0) {
      await db.insert(userRoles).values(roleIds.map(roleId => ({ user_id: userId, role_id: roleId })))
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function replaceUserCompanies(userId: number, companyIds: number[]) {
  try {
    await db.delete(userCompanies).where(eq(userCompanies.user_id, userId))
    if (companyIds.length > 0) {
      await db.insert(userCompanies).values(companyIds.map(companyId => ({ user_id: userId, company_id: companyId })))
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function softDeleteUser(id: number) {
  try {
    const [user] = await db
      .update(users)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .returning({ id: users.id })

    return user ?? null
  } catch (err) {
    handleDbError(err)
  }
}
