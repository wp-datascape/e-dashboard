import { Hono } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getPermissions,
  createPermissionService,
  updatePermissionService,
  deletePermissionService,
  updateRolePermissionsService,
} from './permissions.service'
import { createPermissionSchema, updatePermissionSchema, permissionIdSchema } from './permissions.schema'
import { z } from 'zod'

const roleIdParamSchema = z.object({ id: z.coerce.number().int().positive() })

export const permissionsRoutes = new Hono()

// GET /permissions
permissionsRoutes.get('/', async (c) => {
  const rows = await getPermissions()
  return success(c, rows)
})

// POST /rbac/permissions — Create permission
permissionsRoutes.post('/', async (c) => {
  const body = await validateBody(c, createPermissionSchema)
  const permission = await createPermissionService(body, c)
  return success(c, permission, 'Created', 201)
})

// PUT /rbac/permissions/:id — Update permission
permissionsRoutes.put('/:id', async (c) => {
  const { id } = validateParam(c, permissionIdSchema)
  const body = await validateBody(c, updatePermissionSchema)
  const permission = await updatePermissionService(id, body, c)
  return success(c, permission)
})

// DELETE /rbac/permissions/:id — Delete permission
permissionsRoutes.delete('/:id', async (c) => {
  const { id } = validateParam(c, permissionIdSchema)
  await deletePermissionService(id, c)
  return noContent(c)
})

// PUT /roles/:id/permissions
permissionsRoutes.put('/roles/:id/permissions', async (c) => {
  const { id } = validateParam(c, roleIdParamSchema)
  const body = await validateBody(c, z.object({ permission_ids: z.array(z.number().int().positive()).min(1) }))
  const role = await updateRolePermissionsService(id, body, c)
  return success(c, role)
})
