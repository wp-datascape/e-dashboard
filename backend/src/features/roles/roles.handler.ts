import type { Context } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getRoles, getRoleById, createRoleService,
  updateRoleService, deleteRoleService, getRolePermissionsService,
} from './roles.service'
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from './roles.schema'

export async function handleGetRoles(c: Context) {
  const rows = await getRoles()
  return success(c, rows)
}

export async function handleGetRoleById(c: Context) {
  const { id } = validateParam(c, roleIdParamSchema)
  const role = await getRoleById(id)
  return success(c, role)
}

export async function handleGetRolePermissions(c: Context) {
  const { id } = validateParam(c, roleIdParamSchema)
  const perms = await getRolePermissionsService(id)
  return success(c, perms)
}

export async function handleCreateRole(c: Context) {
  const body = await validateBody(c, createRoleSchema)
  const role = await createRoleService(body, c)
  return success(c, role, 'Role created', 201)
}

export async function handleUpdateRole(c: Context) {
  const { id } = validateParam(c, roleIdParamSchema)
  const body = await validateBody(c, updateRoleSchema)
  const role = await updateRoleService(id, body, c)
  return success(c, role)
}

export async function handleDeleteRole(c: Context) {
  const { id } = validateParam(c, roleIdParamSchema)
  await deleteRoleService(id, c)
  return noContent(c)
}
