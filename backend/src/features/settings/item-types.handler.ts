import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createItemTypeSchema,
  updateItemTypeSchema,
  listItemTypesQuerySchema,
  itemTypeIdParamSchema,
} from './item-types.schema'
import {
  listItemTypesService,
  listActiveItemTypesService,
  createItemTypeService,
  updateItemTypeService,
  deleteItemTypeService,
} from './item-types.service'

export async function handleListItemTypes(c: Context) {
  const query = validateQuery(c, listItemTypesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listItemTypesService(scopeIds)
  return success(c, result)
}

export async function handleListItemTypeValues(c: Context) {
  const query = validateQuery(c, listItemTypesQuerySchema)
  // Celah RBAC (audit lanjutan 2026-08-06): sebelumnya company_id dari query
  // dipakai mentah tanpa resolveCompanyScope() -- endpoint ini juga tanpa
  // requirePermission (siapa pun login bisa akses), jadi user company A bisa
  // lihat daftar item type company B lewat ?company_id=<company B>.
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listActiveItemTypesService(query.company_id, scopeIds)
  return success(c, result)
}

export async function handleCreateItemType(c: Context) {
  const body = await validateBody(c, createItemTypeSchema)
  resolveCompanyScope(c, body.company_id) // task015 §2d — defense-in-depth (config.classification:* saat ini superadmin-only)
  const result = await createItemTypeService(body, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateItemType(c: Context) {
  const { id } = validateParam(c, itemTypeIdParamSchema)
  const body = await validateBody(c, updateItemTypeSchema)
  const result = await updateItemTypeService(id, body, c)
  return success(c, result)
}

export async function handleDeleteItemType(c: Context) {
  const { id } = validateParam(c, itemTypeIdParamSchema)
  await deleteItemTypeService(id, c)
  return success(c, { id })
}
