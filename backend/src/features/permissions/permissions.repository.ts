import { eq, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { permissions, rolePermissions } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewPermission } from '@/db/schema'

export async function findAllPermissions() {
  try {
    return await db
      .select()
      .from(permissions)
      .orderBy(permissions.name)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findPermissionById(id: number) {
  try {
    const result = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1)
    return result[0] || null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createPermission(data: Omit<NewPermission, 'createdAt' | 'updatedAt'>) {
  try {
    const result = await db.insert(permissions).values(data).returning()
    return result[0] || null
  } catch (err) {
    handleDbError(err)
  }
}

export async function updatePermission(id: number, data: Partial<Omit<NewPermission, 'id' | 'createdAt' | 'updatedAt'>>) {
  try {
    const result = await db
      .update(permissions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(permissions.id, id))
      .returning()
    return result[0] || null
  } catch (err) {
    handleDbError(err)
  }
}

export async function deletePermission(id: number) {
  try {
    await db.delete(permissions).where(eq(permissions.id, id))
  } catch (err) {
    handleDbError(err)
  }
}

export async function replaceRolePermissions(roleId: number, permissionIds: number[]) {
  try {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(permissionId => ({ role_id: roleId, permission_id: permissionId }))
      )
    }
  } catch (err) {
    handleDbError(err)
  }
}

export async function findPermissionsByRoleId(roleId: number) {
  try {
    return await db
      .select({ id: permissions.id, name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
  } catch (err) {
    handleDbError(err)
  }
}
