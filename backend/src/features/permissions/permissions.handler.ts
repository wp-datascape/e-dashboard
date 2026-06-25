import type { Context } from 'hono'
import { z } from 'zod'
import { success, noContent } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getPermissions, createPermissionService,
  updatePermissionService, deletePermissionService,
  updateRolePermissionsService,
} from './permissions.service'
import { createPermissionSchema, updatePermissionSchema, permissionIdSchema } from './permissions.schema'

const roleIdParamSchema = z.object({ id: z.coerce.number().int().positive() })

export async function handleGetPermissions(c: Context) {
  try {
    const rows = await getPermissions()
    return success(c, rows)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch permissions', 500)
  }
}

export async function handleCreatePermission(c: Context) {
  try {
    const body = await validateBody(c, createPermissionSchema)
    const permission = await createPermissionService(body, c)
    return success(c, permission, 'Created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create permission', 500)
  }
}

export async function handleUpdatePermission(c: Context) {
  try {
    const { id } = validateParam(c, permissionIdSchema)
    const body = await validateBody(c, updatePermissionSchema)
    const permission = await updatePermissionService(id, body, c)
    return success(c, permission)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update permission', 500)
  }
}

export async function handleDeletePermission(c: Context) {
  try {
    const { id } = validateParam(c, permissionIdSchema)
    await deletePermissionService(id, c)
    return noContent(c)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete permission', 500)
  }
}

export async function handleUpdateRolePermissions(c: Context) {
  try {
    const { id } = validateParam(c, roleIdParamSchema)
    const body = await validateBody(c, z.object({ permission_ids: z.array(z.number().int().positive()).min(1) }))
    const role = await updateRolePermissionsService(id, body, c)
    return success(c, role)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update role permissions', 500)
  }
}
