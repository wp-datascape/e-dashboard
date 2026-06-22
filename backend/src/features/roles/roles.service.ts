import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import {
  findAllRoles,
  findRoleById,
  findRoleByName,
  findRolePermissions,
  createRole,
  updateRole,
  deleteRole,
} from './roles.repository'
import type { CreateRoleDto, UpdateRoleDto } from './roles.schema'

export async function getRoles() {
  return findAllRoles()
}

export async function getRoleById(id: number) {
  const role = await findRoleById(id)
  if (!role) throw new AppError(ErrorCode.NOT_FOUND, 'Role not found', 404)
  return role
}

export async function createRoleService(dto: CreateRoleDto, ctx: Context) {
  const existing = await findRoleByName(dto.name)
  if (existing) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Role name already in use', 409)

  const role = await createRole({ name: dto.name, description: dto.description, isSystem: false })
  logger.info('[role] Role created', { id: role!.id, name: dto.name })

  await logAudit(ctx, {
    action: 'role.create',
    entity: 'roles',
    entityId: role!.id,
    companyId: null,
    newValue: { id: role!.id, name: dto.name },
  })

  return role
}

export async function updateRoleService(id: number, dto: UpdateRoleDto, ctx: Context) {
  const existing = await getRoleById(id)

  if (existing.isSystem) {
    // System roles can only update description, not name
    const role = await updateRole(id, { description: dto.description })
    logger.info('[role] System role description updated', { id })

    await logAudit(ctx, {
      action: 'role.update',
      entity: 'roles',
      entityId: id,
      companyId: null,
      oldValue: { id: existing.id, name: existing.name, description: existing.description },
      newValue: { id: existing.id, name: existing.name, description: role!.description },
    })

    return role
  }

  const role = await updateRole(id, dto)
  logger.info('[role] Role updated', { id })

  await logAudit(ctx, {
    action: 'role.update',
    entity: 'roles',
    entityId: id,
    companyId: null,
    oldValue: { id: existing.id, name: existing.name, description: existing.description },
    newValue: { id: existing.id, name: role!.name, description: role!.description },
  })

  return role
}

export async function getRolePermissionsService(id: number) {
  const role = await findRoleById(id)
  if (!role) throw new AppError(ErrorCode.NOT_FOUND, 'Role not found', 404)
  return findRolePermissions(id)
}

export async function deleteRoleService(id: number, ctx: Context) {
  const existing = await getRoleById(id)

  if (existing.isSystem) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Cannot delete a system role', 403)
  }

  await deleteRole(id)
  logger.info('[role] Role deleted', { id })

  await logAudit(ctx, {
    action: 'role.delete',
    entity: 'roles',
    entityId: id,
    companyId: null,
    oldValue: { id: existing.id, name: existing.name },
  })
}