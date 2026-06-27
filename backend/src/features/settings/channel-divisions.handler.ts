import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import {
  createChannelDivisionSchema,
  updateChannelDivisionSchema,
  listChannelDivisionsQuerySchema,
  channelDivisionIdParamSchema,
} from './channel-divisions.schema'
import {
  listChannelDivisionsService,
  createChannelDivisionService,
  updateChannelDivisionService,
  deleteChannelDivisionService,
} from './channel-divisions.service'

export async function handleListChannelDivisions(c: Context) {
  const query = validateQuery(c, listChannelDivisionsQuerySchema)
  const result = await listChannelDivisionsService(query)
  return success(c, result)
}

export async function handleCreateChannelDivision(c: Context) {
  const body = await validateBody(c, createChannelDivisionSchema)
  const result = await createChannelDivisionService(body)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateChannelDivision(c: Context) {
  const { id } = validateParam(c, channelDivisionIdParamSchema)
  const body = await validateBody(c, updateChannelDivisionSchema)
  const result = await updateChannelDivisionService(id, body)
  return success(c, result)
}

export async function handleDeleteChannelDivision(c: Context) {
  const { id } = validateParam(c, channelDivisionIdParamSchema)
  await deleteChannelDivisionService(id)
  return success(c, { id })
}
