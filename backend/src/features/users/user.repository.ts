import { eq, isNull, and, count, sql, inArray } from 'drizzle-orm'
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
          rolesJson: sql`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'is_system', ${roles.is_system})) FILTER (WHERE ${roles.id} IS NOT NULL)`.as('roles'),
          companiesJson: sql`json_agg(json_build_object('id', ${companies.id}, 'code', ${companies.code}, 'name', ${companies.name})) FILTER (WHERE ${companies.id} IS NOT NULL)`.as('companies'),
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.user_id))
        .leftJoin(roles, eq(userRoles.role_id, roles.id))
        .leftJoin(userCompanies, eq(users.id, userCompanies.user_id))
        .leftJoin(companies, eq(userCompanies.company_id, companies.id))
        .where(isNull(users.deleted_at))
        .groupBy(users.id)
        .limit(per_page)
        .offset((page - 1) * per_page),
      db.select({ value: count() }).from(users).where(isNull(users.deleted_at)),
    ])

    const rows = usersData.map((row) => {
      const { rolesJson, companiesJson, ...user } = row
      return {
        ...stripPassword({ ...user, password: '' }),
        roles: (rolesJson as Array<{ id: number; name: string }>) || [],
        companies: (companiesJson as Array<{ id: number; code: string; name: string }>) || [],
      }
    })

    return { rows, total }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findUserById(id: number) {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
          is_active: users.is_active,
          created_at: users.created_at,
          updated_at: users.updated_at,
          last_login_at: users.last_login_at,
          deleted_at: users.deleted_at,
          rolesJson: sql`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'is_system', ${roles.is_system})) FILTER (WHERE ${roles.id} IS NOT NULL)`.as('roles'),
        companiesJson: sql`json_agg(json_build_object('id', ${companies.id}, 'code', ${companies.code}, 'name', ${companies.name})) FILTER (WHERE ${companies.id} IS NOT NULL)`.as('companies'),
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.user_id))
      .leftJoin(roles, eq(userRoles.role_id, roles.id))
      .leftJoin(userCompanies, eq(users.id, userCompanies.user_id))
      .leftJoin(companies, eq(userCompanies.company_id, companies.id))
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .groupBy(users.id)

    if (result.length === 0) return null

    const row = result[0]
    const { rolesJson, companiesJson, ...user } = row
    return {
      ...stripPassword({ ...user, password: '' }),
      roles: (rolesJson as Array<{ id: number; name: string }>) || [],
      companies: (companiesJson as Array<{ id: number; code: string; name: string }>) || [],
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
