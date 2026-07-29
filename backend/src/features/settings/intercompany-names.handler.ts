import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createIntercompanyNameSchema,
  listIntercompanyNamesQuerySchema,
  intercompanyNameIdParamSchema,
  customerOptionsQuerySchema,
  updateIntercompanyNameSchema,
} from './intercompany-names.schema'
import {
  listIntercompanyNamesService,
  createIntercompanyNameService,
  updateIntercompanyNameService,
  deleteIntercompanyNameService,
  listAmbiguousChannelsService,
  listCustomerNameOptionsService,
} from './intercompany-names.service'

export async function handleListIntercompanyNames(c: Context) {
  const query = validateQuery(c, listIntercompanyNamesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listIntercompanyNamesService(scopeIds)
  return success(c, result)
}

export async function handleCreateIntercompanyName(c: Context) {
  const body = await validateBody(c, createIntercompanyNameSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  const result = await createIntercompanyNameService(body, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateIntercompanyName(c: Context) {
  const { id } = validateParam(c, intercompanyNameIdParamSchema)
  const body = await validateBody(c, updateIntercompanyNameSchema)
  const result = await updateIntercompanyNameService(id, body, c)
  return success(c, result)
}

export async function handleDeleteIntercompanyName(c: Context) {
  const { id } = validateParam(c, intercompanyNameIdParamSchema)
  await deleteIntercompanyNameService(id, c)
  return success(c, { id })
}

export async function handleListCustomerOptions(c: Context) {
  const query = validateQuery(c, customerOptionsQuerySchema)
  resolveCompanyScope(c, query.company_id) // throw 403 kalau company di luar akses user
  const result = await listCustomerNameOptionsService(query.company_id)
  return success(c, result)
}

export async function handleListAmbiguousChannels(c: Context) {
  const query = validateQuery(c, listIntercompanyNamesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listAmbiguousChannelsService(scopeIds)
  return success(c, result)
}
