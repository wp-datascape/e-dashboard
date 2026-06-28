import type { Context } from 'hono'
import { success } from '@/utils/response'
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
  const query = validateQuery(c, listHighMarginQuerySchema)
  const result = await listHighMargins({ ...query, active_only: query.active_only ?? false })
  return success(c, result)
}

export async function handleCreateHighMargin(c: Context) {
  const body = await validateBody(c, createHighMarginSchema)
  const userId = Number(c.req.header('x-user-id') ?? 1)
  const result = await addHighMargin(body, userId, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  const body = await validateBody(c, updateHighMarginSchema)
  const result = await editHighMargin(id, body, c)
  return success(c, result)
}

export async function handleDeactivateHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  const result = await deactivateHighMargin(id, c)
  return success(c, result)
}

export async function handleDeleteHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  await removeHighMargin(id, c)
  return success(c, { id })
}
