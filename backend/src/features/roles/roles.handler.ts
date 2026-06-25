import type { Context } from 'hono'
import { success, noContent } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getRoles, getRoleById, createRoleService,
  updateRoleService, deleteRoleService, getRolePermissionsService,
} from './roles.service'
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from './roles.schema'

export async function handleGetRoles(c: Context) {
  try {
    const rows = await getRoles()
    return success(c, rows)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch roles', 500)
  }
}

export async function handleGetRoleById(c: Context) {
  try {
    const { id } = validateParam(c, roleIdParamSchema)
    const role = await getRoleById(id)
    return success(c, role)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch role', 500)
  }
}

export async function handleGetRolePermissions(c: Context) {
  try {
    const { id } = validateParam(c, roleIdParamSchema)
    const perms = await getRolePermissionsService(id)
    return success(c, perms)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch role permissions', 500)
  }
}

export async function handleCreateRole(c: Context) {
  try {
    const body = await validateBody(c, createRoleSchema)
    const role = await createRoleService(body, c)
    return success(c, role, 'Role created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create role', 500)
  }
}

export async function handleUpdateRole(c: Context) {
  try {
    const { id } = validateParam(c, roleIdParamSchema)
    const body = await validateBody(c, updateRoleSchema)
    const role = await updateRoleService(id, body, c)
    return success(c, role)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update role', 500)
  }
}

export async function handleDeleteRole(c: Context) {
  try {
    const { id } = validateParam(c, roleIdParamSchema)
    await deleteRoleService(id, c)
    return noContent(c)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete role', 500)
  }
}
