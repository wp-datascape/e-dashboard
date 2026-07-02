import type { Context } from 'hono'
import { success, error, noContent, paginated } from '@/utils/response'
import { validateBody, validateQuery, validateParam, paginationSchema } from '@/utils/validator'
import { ErrorCode } from '@/errors'
import {
  getUsers, getUserById, createUserService,
  updateUserService, deleteUserService,
  importUsersService, getUsersTemplate,
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

export async function handleImportUsers(c: Context) {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const defaultPassword = formData.get('default_password')

  if (!file) return error(c, ErrorCode.VALIDATION_ERROR, 'File wajib diupload', 400)
  if (!defaultPassword || typeof defaultPassword !== 'string') {
    return error(c, ErrorCode.VALIDATION_ERROR, 'default_password wajib diisi', 400)
  }
  if (defaultPassword.length < 8) {
    return error(c, ErrorCode.VALIDATION_ERROR, 'default_password minimal 8 karakter', 400)
  }

  if (file.size > 5 * 1024 * 1024) return error(c, ErrorCode.FILE_TOO_LARGE, 'File terlalu besar (max 5MB)', 413)

  const isXlsx = file.name.endsWith('.xlsx')
  const isCsv = file.name.endsWith('.csv')
  if (!isXlsx && !isCsv) return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Hanya file .xlsx atau .csv yang diterima', 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await importUsersService(buffer, isXlsx, defaultPassword, c)
  return success(c, result, `Import selesai: ${result.added} ditambahkan, ${result.skipped} di-skip`)
}

export async function handleDownloadUsersTemplate(_c: Context) {
  return new Response(getUsersTemplate(), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_user.xlsx"',
    },
  })
}
