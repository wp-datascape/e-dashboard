import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createIntercompanyNameSchema,
  listIntercompanyNamesQuerySchema,
  intercompanyNameIdParamSchema,
} from './intercompany-names.schema'
import {
  listIntercompanyNamesService,
  createIntercompanyNameService,
  deleteIntercompanyNameService,
  listAmbiguousChannelsService,
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

export async function handleDeleteIntercompanyName(c: Context) {
  const { id } = validateParam(c, intercompanyNameIdParamSchema)
  await deleteIntercompanyNameService(id, c)
  return success(c, { id })
}

export async function handleListAmbiguousChannels(c: Context) {
  const query = validateQuery(c, listIntercompanyNamesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listAmbiguousChannelsService(scopeIds)
  return success(c, result)
}
