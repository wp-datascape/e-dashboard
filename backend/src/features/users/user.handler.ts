import type { Context } from 'hono'
import { success, noContent, paginated } from '@/utils/response'
import { validateBody, validateQuery, validateParam, paginationSchema } from '@/utils/validator'
import {
  getUsers, getUserById, createUserService,
  updateUserService, deleteUserService,
} from './user.service'
import { createUserSchema, updateUserSchema, userIdParamSchema } from './user.schema'

export async function handleGetUsers(c: Context) {
  const query = validateQuery(c, paginationSchema)
  const typedQuery = { page: query.page ?? 1, per_page: query.per_page ?? 20, sort: query.sort }
  const { rows, total } = await getUsers(typedQuery)
  return paginated(c, rows, { page: typedQuery.page, per_page: typedQuery.per_page, total })
}

export async function handleGetUserById(c: Context) {
  const { id } = validateParam(c, userIdParamSchema)
  const user = await getUserById(id)
  return success(c, user)
}

export async function handleCreateUser(c: Context) {
  const body = await validateBody(c, createUserSchema)
  const user = await createUserService(body, c)
  return success(c, user, 'User created', 201)
}

export async function handleUpdateUser(c: Context) {
  const { id } = validateParam(c, userIdParamSchema)
  const body = await validateBody(c, updateUserSchema)
  const user = await updateUserService(id, body, c)
  return success(c, user)
}

export async function handleDeleteUser(c: Context) {
  const { id } = validateParam(c, userIdParamSchema)
  await deleteUserService(id, c)
  return noContent(c)
}
