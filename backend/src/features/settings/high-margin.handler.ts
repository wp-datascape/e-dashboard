import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import {
  createHighMarginSchema,
  updateHighMarginSchema,
  listHighMarginQuerySchema,
  highMarginIdParamSchema,
} from './high-margin.schema'
import {
  listHighMargins,
  addHighMargin,
  editHighMargin,
  deactivateHighMargin,
  removeHighMargin,
} from './high-margin.service'

export async function handleListHighMargins(c: Context) {
  try {
    const query = validateQuery(c, listHighMarginQuerySchema)
    const result = await listHighMargins({ ...query, active_only: query.active_only ?? false })
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar high margin', 500)
  }
}

export async function handleCreateHighMargin(c: Context) {
  try {
    const body = await validateBody(c, createHighMarginSchema)
    // TODO: ambil userId dari auth context setelah auth middleware aktif
    const userId = Number(c.req.header('x-user-id') ?? 1)
    const result = await addHighMargin(body, userId)
    return success(c, result, 'Created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat high margin mapping', 500)
  }
}

export async function handleUpdateHighMargin(c: Context) {
  try {
    const { id } = validateParam(c, highMarginIdParamSchema)
    const body = await validateBody(c, updateHighMarginSchema)
    const result = await editHighMargin(id, body)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate high margin mapping', 500)
  }
}

export async function handleDeactivateHighMargin(c: Context) {
  try {
    const { id } = validateParam(c, highMarginIdParamSchema)
    const result = await deactivateHighMargin(id)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menonaktifkan high margin mapping', 500)
  }
}

export async function handleDeleteHighMargin(c: Context) {
  try {
    const { id } = validateParam(c, highMarginIdParamSchema)
    await removeHighMargin(id)
    return success(c, { id })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus high margin mapping', 500)
  }
}
