import type { Context } from 'hono'
import { z } from 'zod'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getPermissions, createPermissionService,
  updatePermissionService, deletePermissionService,
  updateRolePermissionsService,
} from './permissions.service'
import { createPermissionSchema, updatePermissionSchema, permissionIdSchema } from './permissions.schema'

const roleIdParamSchema = z.object({ id: z.coerce.number().int().positive() })

export async function handleGetPermissions(c: Context) {
  const rows = await getPermissions()
  return success(c, rows)
}

export async function handleCreatePermission(c: Context) {
  const body = await validateBody(c, createPermissionSchema)
  const permission = await createPermissionService(body, c)
  return success(c, permission, 'Created', 201)
}

export async function handleUpdatePermission(c: Context) {
  const { id } = validateParam(c, permissionIdSchema)
  const body = await validateBody(c, updatePermissionSchema)
  const permission = await updatePermissionService(id, body, c)
  return success(c, permission)
}

export async function handleDeletePermission(c: Context) {
  const { id } = validateParam(c, permissionIdSchema)
  await deletePermissionService(id, c)
  return noContent(c)
}

export async function handleUpdateRolePermissions(c: Context) {
  const { id } = validateParam(c, roleIdParamSchema)
  const body = await validateBody(c, z.object({ permission_ids: z.array(z.number().int().positive()).min(1) }))
  const role = await updateRolePermissionsService(id, body, c)
  return success(c, role)
}
