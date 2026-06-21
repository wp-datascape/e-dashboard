import { Hono } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getRoles,
  getRoleById,
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getRolePermissionsService,
} from './roles.service'
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
} from './roles.schema'

export const rolesRoutes = new Hono()

// GET /roles
rolesRoutes.get('/', async (c) => {
  const rows = await getRoles()
  return success(c, rows)
})

// GET /roles/:id
rolesRoutes.get('/:id', async (c) => {
  const { id } = validateParam(c, roleIdParamSchema)
  const role = await getRoleById(id)
  return success(c, role)
})

// GET /roles/:id/permissions
rolesRoutes.get('/:id/permissions', async (c) => {
  const { id } = validateParam(c, roleIdParamSchema)
  const perms = await getRolePermissionsService(id)
  return success(c, perms)
})

// POST /roles
rolesRoutes.post('/', async (c) => {
  const body = await validateBody(c, createRoleSchema)
  const role = await createRoleService(body, c)
  return success(c, role, 'Role created', 201)
})

// PATCH /roles/:id
rolesRoutes.patch('/:id', async (c) => {
  const { id } = validateParam(c, roleIdParamSchema)
  const body = await validateBody(c, updateRoleSchema)
  const role = await updateRoleService(id, body, c)
  return success(c, role)
})

// DELETE /roles/:id
rolesRoutes.delete('/:id', async (c) => {
  const { id } = validateParam(c, roleIdParamSchema)
  await deleteRoleService(id, c)
  return noContent(c)
})