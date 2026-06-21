import { AppError, ErrorCode } from '@/errors'
import { hashPassword } from '@/utils/hash'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import type { Context } from 'hono'
import type { PaginationQuery } from '@/utils/validator'
import {
  findAllUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  softDeleteUser,
  replaceUserRoles,
  replaceUserCompanies,
} from './user.repository'
import type { CreateUserDto, UpdateUserDto } from './user.schema'

export async function getUsers(query: PaginationQuery) {
  return findAllUsers(query)
}

export async function getUserById(id: number) {
  const user = await findUserById(id)
  if (!user) throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404)
  return user
}

export async function createUserService(dto: CreateUserDto) {
  const existing = await findUserByEmail(dto.email)
  if (existing) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Email already in use', 409)

  const hashed = await hashPassword(dto.password)
  const user = await createUser({ ...dto, password: hashed })

  logger.info('[user] User created', { id: user!.id, email: dto.email })
  return user
}

export async function updateUserService(id: number, dto: UpdateUserDto, ctx: Context) {
  await getUserById(id)

  // Extract relation fields before updating user data
  const { role_ids, company_ids, ...userData } = dto

  // Update user basic fields
  const user = await updateUser(id, userData)

  // Sync roles if provided
  if (role_ids !== undefined) {
    await replaceUserRoles(id, role_ids)
  }

  // Sync companies if provided
  if (company_ids !== undefined) {
    await replaceUserCompanies(id, company_ids)
  }

  // Re-fetch with relations
  const updated = await findUserById(id)

  logger.info('[user] User updated', { id })

  await logAudit(ctx, {
    action: 'user.update',
    entity: 'users',
    entityId: id,
    companyId: null,
    meta: { changes: dto },
  })

  return updated
}

export async function deleteUserService(id: number, ctx: Context) {
  const user = await getUserById(id)

  if (user.roles?.some(r => (r as Record<string, unknown>).isSystem)) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Cannot delete a user with a system role', 403)
  }

  await softDeleteUser(id)
  logger.info('[user] User soft-deleted', { id })

  await logAudit(ctx, {
    action: 'user.delete',
    entity: 'users',
    entityId: id,
    companyId: null,
    oldValue: { id: user.id, email: user.email, name: user.name },
  })
}
