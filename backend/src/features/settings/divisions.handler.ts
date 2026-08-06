import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createDivisionSchema,
  updateDivisionSchema,
  listDivisionsQuerySchema,
  divisionIdParamSchema,
} from './divisions.schema'
import {
  listDivisionsService,
  listActiveDivisionsService,
  createDivisionService,
  updateDivisionService,
  deleteDivisionService,
} from './divisions.service'

export async function handleListDivisions(c: Context) {
  const query = validateQuery(c, listDivisionsQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listDivisionsService(scopeIds)
  return success(c, result)
}

export async function handleListDivisionValues(c: Context) {
  const query = validateQuery(c, listDivisionsQuerySchema)
  // Celah RBAC (audit lanjutan 2026-08-06): sebelumnya company_id dari query
  // dipakai mentah tanpa resolveCompanyScope() -- user company A bisa lihat
  // daftar division company B lewat ?company_id=<company B>.
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listActiveDivisionsService(query.company_id, scopeIds)
  return success(c, result)
}

export async function handleCreateDivision(c: Context) {
  const body = await validateBody(c, createDivisionSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
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
