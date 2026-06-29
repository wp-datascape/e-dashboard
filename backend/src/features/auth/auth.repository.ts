import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, roles, userCompanies, rolePermissions, permissions } from '@/db/schema'

export async function findActiveUserByEmail(email: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      is_active: users.is_active,
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
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deleted_at)))
    .limit(1)
  return result[0] ?? null
}

export async function getUserCompanyIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ company_id: userCompanies.company_id })
    .from(userCompanies)
    .where(eq(userCompanies.user_id, userId))
  return rows.map((r) => r.company_id)
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
