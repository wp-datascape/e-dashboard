import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import type { Context } from 'hono'
import {
  findAllPermissions,
  findPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  replaceRolePermissions,
} from './permissions.repository'
import { findRoleById } from '@/features/roles/roles.repository'
import { createPermissionSchema, updatePermissionSchema } from './permissions.schema'
import type { CreatePermissionDto, UpdatePermissionDto } from './permissions.schema'

export const updateRolePermissionsSchema = createPermissionSchema.extend({
  permission_ids: createPermissionSchema.array(),
})

export async function getPermissions() {
  return findAllPermissions()
}

export async function createPermissionService(dto: CreatePermissionDto, ctx: Context) {
  try {
    const existingPerms = await findAllPermissions()
    if (existingPerms?.some(p => p.name === dto.name)) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Permission name already exists', 409)
    }

    const permission = await createPermission({
      name: dto.name,
      description: dto.description || null,
      category: dto.category || null,
    })

    if (!permission) throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create permission', 500)

    logger.info('[permission] Permission created', { permissionId: permission.id, name: permission.name })

    await logAudit(ctx, {
      action: 'permission.assign',
      entity: 'permissions',
      entityId: permission.id,
      companyId: null,
      newValue: { name: permission.name, category: permission.category },
    })

    return permission
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Permission name already exists', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create permission', 500)
  }
}

export async function updatePermissionService(id: number, dto: UpdatePermissionDto, ctx: Context) {
  const permission = await findPermissionById(id)
  if (!permission) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Permission not found', 404)
  }

  const updated = await updatePermission(id, {
    description: dto.description !== undefined ? dto.description : permission.description,
    category: dto.category !== undefined ? dto.category : permission.category,
  })

  if (!updated) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update permission', 500)
  }

  logger.info('[permission] Permission updated', { permissionId: id })

  await logAudit(ctx, {
    action: 'permission.assign',
    entity: 'permissions',
    entityId: id,
    companyId: null,
    oldValue: { description: permission.description, category: permission.category },
    newValue: { description: updated.description, category: updated.category },
  })

  return updated
}

export async function deletePermissionService(id: number, ctx: Context) {
  const permission = await findPermissionById(id)
  if (!permission) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Permission not found', 404)
  }

  await deletePermission(id)

  logger.info('[permission] Permission deleted', { permissionId: id, name: permission.name })

  await logAudit(ctx, {
    action: 'permission.revoke',
    entity: 'permissions',
    entityId: id,
    companyId: null,
    oldValue: { name: permission.name, category: permission.category },
  })
}

export async function updateRolePermissionsService(roleId: number, dto: { permission_ids: number[] }, ctx: Context) {
  const role = await findRoleById(roleId)
  if (!role) throw new AppError(ErrorCode.NOT_FOUND, 'Role not found', 404)

  await replaceRolePermissions(roleId, dto.permission_ids)
  logger.info('[permission] Role permissions updated', { roleId })

  await logAudit(ctx, {
    action: 'permission.assign',
    entity: 'roles',
    entityId: roleId,
    companyId: null,
    meta: { permission_ids: dto.permission_ids },
  })

  // Return role with updated permissions
  return { ...role }
}
