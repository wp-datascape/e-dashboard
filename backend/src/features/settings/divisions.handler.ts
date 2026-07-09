import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import {
  createDivisionSchema,
  updateDivisionSchema,
  listDivisionsQuerySchema,
  divisionIdParamSchema,
} from './divisions.schema'
import {
  listDivisionsService,
  getDivisionByIdService,
  createDivisionService,
  updateDivisionService,
  deleteDivisionService,
} from './divisions.service'

export async function handleListDivisions(c: Context) {
  const query = validateQuery(c, listDivisionsQuerySchema)
  const result = await listDivisionsService(query)
  return success(c, result)
}

export async function handleGetDivisionById(c: Context) {
  const { id } = validateParam(c, divisionIdParamSchema)
  const result = await getDivisionByIdService(id)
  return success(c, result)
}

export async function handleCreateDivision(c: Context) {
  const body = await validateBody(c, createDivisionSchema)
  const result = await createDivisionService(body, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateDivision(c: Context) {
  const { id } = validateParam(c, divisionIdParamSchema)
  const body = await validateBody(c, updateDivisionSchema)
  const result = await updateDivisionService(id, body, c)
  return success(c, result)
}

export async function handleDeleteDivision(c: Context) {
  const { id } = validateParam(c, divisionIdParamSchema)
  await deleteDivisionService(id, c)
  return success(c, { id })
}
