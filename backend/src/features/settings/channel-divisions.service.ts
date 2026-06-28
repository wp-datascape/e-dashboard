import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import {
  findChannelDivisions,
  findChannelDivisionById,
  findChannelDivisionByName,
  createChannelDivision,
  updateChannelDivision,
  deleteChannelDivision,
} from './channel-divisions.repository'
import type {
  ListChannelDivisionsQuery,
  CreateChannelDivisionDto,
  UpdateChannelDivisionDto,
} from './channel-divisions.schema'

export async function listChannelDivisionsService(query: ListChannelDivisionsQuery) {
  try {
    return await findChannelDivisions(query)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar channel division', 500)
  }
}

export async function createChannelDivisionService(body: CreateChannelDivisionDto, ctx: Context) {
  try {
    const existing = await findChannelDivisionByName(body.channel_name)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    }
    const result = await createChannelDivision(body)

    await logAudit(ctx, {
      action: 'channel_division.create',
      entity: 'channel_divisions',
      entityId: result!.id,
      companyId: body.company_id ?? null,
      newValue: body,
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat channel division', 500)
  }
}

export async function updateChannelDivisionService(id: number, body: UpdateChannelDivisionDto, ctx: Context) {
  try {
    const existing = await findChannelDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Channel division dengan id ${id} tidak ditemukan`, 404)

    if (body.channel_name && body.channel_name !== existing.channel_name) {
      const duplicate = await findChannelDivisionByName(body.channel_name, id)
      if (duplicate.length > 0) {
        throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
      }
    }

    const result = await updateChannelDivision(id, body)

    await logAudit(ctx, {
      action: 'channel_division.update',
      entity: 'channel_divisions',
      entityId: id,
      companyId: existing.company_id ?? null,
      oldValue: { channel_name: existing.channel_name, division: existing.division },
      newValue: { channel_name: body.channel_name ?? existing.channel_name, division: body.division ?? existing.division },
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Channel sudah ada', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate channel division', 500)
  }
}

export async function deleteChannelDivisionService(id: number, ctx: Context) {
  try {
    const existing = await findChannelDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Channel division dengan id ${id} tidak ditemukan`, 404)

    await deleteChannelDivision(id)

    await logAudit(ctx, {
      action: 'channel_division.delete',
      entity: 'channel_divisions',
      entityId: id,
      companyId: existing.company_id ?? null,
      oldValue: { channel_name: existing.channel_name, division: existing.division },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus channel division', 500)
  }
}
