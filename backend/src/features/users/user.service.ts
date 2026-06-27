import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
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

export async function createUserService(dto: CreateUserDto, ctx: Context) {
  try {
    const existing = await findUserByEmail(dto.email)
    if (existing) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Email already in use', 409)

    const hashed = await hashPassword(dto.password)
    const user = await createUser({ ...dto, password: hashed })

    logger.info('[user] User created', { id: user!.id, email: dto.email })

    await logAudit(ctx, {
      action: 'user.create',
      entity: 'users',
      entityId: user!.id,
      companyId: null,
      newValue: { id: user!.id, email: user!.email, name: user!.name },
    })

    return user
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Email already in use', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create user', 500)
  }
}

export async function updateUserService(id: number, dto: UpdateUserDto, ctx: Context) {
  // Ambil state sebelum update untuk oldValue
  const before = await getUserById(id)

  // Extract relation fields before updating user data
  const { role_ids, company_ids, ...userData } = dto

  // Update user basic fields
  await updateUser(id, userData)

  // Sync roles if provided
  if (role_ids !== undefined) {
    await replaceUserRoles(id, role_ids)
  }

  // Sync companies if provided
  if (company_ids !== undefined) {
    await replaceUserCompanies(id, company_ids)
  }

  // Re-fetch dengan relasi (state setelah update)
  const after = await findUserById(id)

  // Ambil companyId dari company pertama user (default context)
  const companyId = (before.companies as Array<{ id: number }> | undefined)?.[0]?.id ?? null

  logger.info('[user] User updated', { id })

  await logAudit(ctx, {
    action: 'user.update',
    entity: 'users',
    entityId: id,
    companyId,
    oldValue: {
      id: before.id,
      name: before.name,
      email: before.email,
      isActive: before.is_active,
      roles: (before.roles as Array<{ id: number; name: string }> | undefined)?.map(r => ({ id: r.id, name: r.name })),
      companies: (before.companies as Array<{ id: number; code: string }> | undefined)?.map(c => ({ id: c.id, code: c.code })),
    },
    newValue: {
      id: after!.id,
      name: after!.name,
      email: after!.email,
      isActive: after!.is_active,
      roles: (after!.roles as Array<{ id: number; name: string }> | undefined)?.map(r => ({ id: r.id, name: r.name })),
      companies: (after!.companies as Array<{ id: number; code: string }> | undefined)?.map(c => ({ id: c.id, code: c.code })),
    },
  })

  return after
}

export async function deleteUserService(id: number, ctx: Context) {
  const user = await getUserById(id)

  if (user.roles?.some(r => (r as Record<string, unknown>).is_system)) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Cannot delete a user with a system role', 403)
  }

  const companyId = (user.companies as Array<{ id: number }> | undefined)?.[0]?.id ?? null

  await softDeleteUser(id)
  logger.info('[user] User soft-deleted', { id })

  await logAudit(ctx, {
    action: 'user.delete',
    entity: 'users',
    entityId: id,
    companyId,
    oldValue: { id: user.id, email: user.email, name: user.name },
  })
}