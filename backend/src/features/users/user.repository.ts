import { eq, isNull, and, count, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, roles, userCompanies, companies } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { PaginationQuery } from '@/utils/validator'
import type { CreateUserDto, UpdateUserDto } from './user.schema'

// Strip password dari hasil query sebelum dikembalikan ke caller
function stripPassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _, ...rest } = user
  return rest
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

export async function findAllUsers(pagination: PaginationQuery) {
  const { page, per_page } = pagination

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
        .where(isNull(users.deleted_at))
        .limit(per_page)
        .offset((page - 1) * per_page),
      db.select({ value: count() }).from(users).where(isNull(users.deleted_at)),
    ])

    const { rolesByUser, companiesByUser } = await fetchRolesAndCompaniesByUserIds(usersData.map((u) => u.id))

    const rows = usersData.map((user) => ({
      ...user,
      roles: rolesByUser.get(user.id) ?? [],
      companies: companiesByUser.get(user.id) ?? [],
    }))

    return { rows, total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findUserById(id: number) {
  try {
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
      .where(and(eq(users.id, id), isNull(users.deleted_at)))

    if (!user) return null

    const { rolesByUser, companiesByUser } = await fetchRolesAndCompaniesByUserIds([id])

    return {
      ...user,
      roles: rolesByUser.get(id) ?? [],
      companies: companiesByUser.get(id) ?? [],
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
