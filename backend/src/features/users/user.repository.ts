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
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLoginAt: users.lastLoginAt,
          deletedAt: users.deletedAt,
          rolesJson: sql`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'isSystem', ${roles.isSystem})) FILTER (WHERE ${roles.id} IS NOT NULL)`.as('roles'),
          companiesJson: sql`json_agg(json_build_object('id', ${companies.id}, 'code', ${companies.code}, 'name', ${companies.name})) FILTER (WHERE ${companies.id} IS NOT NULL)`.as('companies'),
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(userCompanies, eq(users.id, userCompanies.userId))
        .leftJoin(companies, eq(userCompanies.companyId, companies.id))
        .where(isNull(users.deletedAt))
        .groupBy(users.id)
        .limit(per_page)
        .offset((page - 1) * per_page),
      db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
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
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
        deletedAt: users.deletedAt,
        rolesJson: sql`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'isSystem', ${roles.isSystem})) FILTER (WHERE ${roles.id} IS NOT NULL)`.as('roles'),
        companiesJson: sql`json_agg(json_build_object('id', ${companies.id}, 'code', ${companies.code}, 'name', ${companies.name})) FILTER (WHERE ${companies.id} IS NOT NULL)`.as('companies'),
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(userCompanies, eq(users.id, userCompanies.userId))
      .leftJoin(companies, eq(userCompanies.companyId, companies.id))
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
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
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
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
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning()

    return user ? stripPassword(user) : null
  } catch (err) {
    handleDbError(err)
  }
}

export async function replaceUserRoles(userId: number, roleIds: number[]) {
  try {
    await db.delete(userRoles).where(eq(userRoles.userId, userId))
    if (roleIds.length > 0) {
      await db.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })))
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function replaceUserCompanies(userId: number, companyIds: number[]) {
  try {
    await db.delete(userCompanies).where(eq(userCompanies.userId, userId))
    if (companyIds.length > 0) {
      await db.insert(userCompanies).values(companyIds.map(companyId => ({ userId, companyId })))
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function softDeleteUser(id: number) {
  try {
    const [user] = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id })

    return user ?? null
  } catch (err) {
    handleDbError(err)
  }
}
