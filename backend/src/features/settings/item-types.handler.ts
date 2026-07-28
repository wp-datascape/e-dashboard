import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
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
  const result = await listItemTypesService(query.company_id)
  return success(c, result)
}

export async function handleListItemTypeValues(c: Context) {
  const query = validateQuery(c, listItemTypesQuerySchema)
  const result = await listActiveItemTypesService(query.company_id)
  return success(c, result)
}

export async function handleCreateItemType(c: Context) {
  const body = await validateBody(c, createItemTypeSchema)
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
