import type { Context } from 'hono'
import { success, error } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { ErrorCode } from '@/utils/error'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createChannelDivisionSchema,
  updateChannelDivisionSchema,
  listChannelDivisionsQuerySchema,
  channelDivisionIdParamSchema,
  unmappedChannelsQuerySchema,
} from './channel-divisions.schema'
import {
  listChannelDivisionsService,
  createChannelDivisionService,
  updateChannelDivisionService,
  deleteChannelDivisionService,
  importChannelDivisionsService,
  getChannelDivisionsTemplate,
  listUnmappedChannelsService,
  listDivisionValuesService,
} from './channel-divisions.service'

export async function handleListChannelDivisions(c: Context) {
  const query = validateQuery(c, listChannelDivisionsQuerySchema)
  const result = await listChannelDivisionsService(query)
  return success(c, result)
}

export async function handleListDivisionValues(c: Context) {
  const query = validateQuery(c, unmappedChannelsQuerySchema)
  const result = await listDivisionValuesService(query.company_id)
  return success(c, result)
}

export async function handleListUnmappedChannels(c: Context) {
  const query = validateQuery(c, unmappedChannelsQuerySchema)
  const result = await listUnmappedChannelsService(query.company_id)
  return success(c, result)
}

export async function handleCreateChannelDivision(c: Context) {
  const body = await validateBody(c, createChannelDivisionSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  const result = await createChannelDivisionService(body, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateChannelDivision(c: Context) {
  const { id } = validateParam(c, channelDivisionIdParamSchema)
  const body = await validateBody(c, updateChannelDivisionSchema)
  const result = await updateChannelDivisionService(id, body, c)
  return success(c, result)
}

export async function handleDeleteChannelDivision(c: Context) {
  const { id } = validateParam(c, channelDivisionIdParamSchema)
  await deleteChannelDivisionService(id, c)
  return success(c, { id })
}

export async function handleImportChannelDivisions(c: Context) {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const companyIdRaw = formData.get('company_id')

  if (!file) return error(c, ErrorCode.VALIDATION_ERROR, 'File wajib diupload', 400)
  if (!companyIdRaw) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id wajib diisi', 400)

  const companyId = Number(companyIdRaw)
  if (!Number.isInteger(companyId) || companyId <= 0) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id tidak valid', 400)
  resolveCompanyScope(c, companyId) // throw 403 kalau company di luar akses user

  if (file.size > 5 * 1024 * 1024) return error(c, ErrorCode.FILE_TOO_LARGE, 'File terlalu besar (max 5MB)', 413)

  const isXlsx = file.name.endsWith('.xlsx')
  const isCsv = file.name.endsWith('.csv')
  if (!isXlsx && !isCsv) return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Hanya file .xlsx atau .csv yang diterima', 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await importChannelDivisionsService(buffer, isXlsx, companyId, c)
  return success(c, result, `Import selesai: ${result.added} ditambahkan, ${result.skipped} di-skip`)
}

export async function handleDownloadChannelDivisionsTemplate(_c: Context) {
  return new Response(getChannelDivisionsTemplate(), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="channel_divisions_template.xlsx"',
    },
  })
}
