import { eq, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { roles, rolePermissions, permissions } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewRole } from '@/db/schema/roles'

type RoleWithPermissions = {
  id: number
  name: string
  description: string | null
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  permissions: unknown
}

export async function findAllRoles() {
  try {
    const rows = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        permissions: sql`COALESCE(json_agg(json_build_object('id', ${permissions.id}, 'name', ${permissions.name})) FILTER (WHERE ${permissions.id} IS NOT NULL), '[]'::json)`,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .groupBy(roles.id)
      .orderBy(roles.name)
    return rows as unknown as RoleWithPermissions[]
  } catch (err) {
    handleDbError(err)
  }
}

export async function findRoleById(id: number) {
  try {
    const [row] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function findRoleByName(name: string) {
  try {
    const [row] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createRole(data: Pick<NewRole, 'name' | 'description' | 'isSystem'>) {
  try {
    const [row] = await db
      .insert(roles)
      .values(data)
      .returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateRole(id: number, data: Partial<Pick<NewRole, 'description'>>) {
  try {
    const [row] = await db
      .update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function findRolePermissions(roleId: number) {
  try {
    const rows = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        category: permissions.category,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(permissions.category, permissions.name)
    return rows
  } catch (err) {
    handleDbError(err)
  }
}

export async function deleteRole(id: number) {
  try {
    const [row] = await db
      .delete(roles)
      .where(eq(roles.id, id))
      .returning({ id: roles.id })
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}