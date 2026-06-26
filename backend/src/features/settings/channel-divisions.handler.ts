import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import {
  createChannelDivisionSchema,
  updateChannelDivisionSchema,
  listChannelDivisionsQuerySchema,
  channelDivisionIdParamSchema,
} from './channel-divisions.schema'
import {
  findChannelDivisions,
  findChannelDivisionById,
  findChannelDivisionByName,
  createChannelDivision,
  updateChannelDivision,
  deleteChannelDivision,
} from './channel-divisions.repository'

export async function handleListChannelDivisions(c: Context) {
  try {
    const query = validateQuery(c, listChannelDivisionsQuerySchema)
    const result = await findChannelDivisions(query)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar channel division', 500)
  }
}

export async function handleCreateChannelDivision(c: Context) {
  try {
    const body = await validateBody(c, createChannelDivisionSchema)

    const existing = await findChannelDivisionByName(body.channel_name)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`)
    }

    const result = await createChannelDivision(body)
    return success(c, result, 'Created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat channel division', 500)
  }
}

export async function handleUpdateChannelDivision(c: Context) {
  try {
    const { id } = validateParam(c, channelDivisionIdParamSchema)
    const body = await validateBody(c, updateChannelDivisionSchema)

    const existing = await findChannelDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Channel division dengan id ${id} tidak ditemukan`)

    if (body.channel_name && body.channel_name !== existing.channel_name) {
      const duplicate = await findChannelDivisionByName(body.channel_name, id)
      if (duplicate.length > 0) {
        throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`)
      }
    }

    const result = await updateChannelDivision(id, body)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate channel division', 500)
  }
}

export async function handleDeleteChannelDivision(c: Context) {
  try {
    const { id } = validateParam(c, channelDivisionIdParamSchema)

    const existing = await findChannelDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Channel division dengan id ${id} tidak ditemukan`)

    await deleteChannelDivision(id)
    return success(c, { id })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus channel division', 500)
  }
}
