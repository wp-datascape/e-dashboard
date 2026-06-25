import type { Context } from 'hono'
import { success, noContent, paginated } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateQuery, validateParam, paginationSchema } from '@/utils/validator'
import {
  getUsers, getUserById, createUserService,
  updateUserService, deleteUserService,
} from './user.service'
import { createUserSchema, updateUserSchema, userIdParamSchema } from './user.schema'

export async function handleGetUsers(c: Context) {
  try {
    const query = validateQuery(c, paginationSchema)
    const typedQuery = { page: query.page ?? 1, per_page: query.per_page ?? 20, sort: query.sort }
    const { rows, total } = await getUsers(typedQuery)
    return paginated(c, rows, { page: typedQuery.page, per_page: typedQuery.per_page, total })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch users', 500)
  }
}

export async function handleGetUserById(c: Context) {
  try {
    const { id } = validateParam(c, userIdParamSchema)
    const user = await getUserById(id)
    return success(c, user)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user', 500)
  }
}

export async function handleCreateUser(c: Context) {
  try {
    const body = await validateBody(c, createUserSchema)
    const user = await createUserService(body, c)
    return success(c, user, 'User created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create user', 500)
  }
}

export async function handleUpdateUser(c: Context) {
  try {
    const { id } = validateParam(c, userIdParamSchema)
    const body = await validateBody(c, updateUserSchema)
    const user = await updateUserService(id, body, c)
    return success(c, user)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update user', 500)
  }
}

export async function handleDeleteUser(c: Context) {
  try {
    const { id } = validateParam(c, userIdParamSchema)
    await deleteUserService(id, c)
    return noContent(c)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete user', 500)
  }
}
