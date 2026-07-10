import type { Context } from 'hono'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { findDivisionCodesForFilter } from './branch-divisions.repository'
import {
  findDivisionChannels,
  findDivisionChannelById,
  findDivisionChannelByName,
  findDivisionChannelByNameAndCompany,
  createDivisionChannel,
  updateDivisionChannel,
  deleteDivisionChannel,
  findUnmappedChannelNames,
  findConsistentBranchIdForChannel,
} from './division-channels.repository'
import type {
  ListDivisionChannelsQuery,
  CreateDivisionChannelDto,
  UpdateDivisionChannelDto,
} from './division-channels.schema'

export async function listDivisionChannelsService(query: ListDivisionChannelsQuery) {
  try {
    return await findDivisionChannels(query)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar division channel', 500)
  }
}

export async function listDivisionValuesService(companyId: number | 'all', branchId?: number) {
  try {
    return await findDivisionCodesForFilter(companyId, branchId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar divisi', 500)
  }
}

export async function listUnmappedChannelsService(companyId: number | 'all') {
  try {
    const cid = companyId === 'all' ? 0 : companyId
    return await findUnmappedChannelNames(cid)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil channel name yang belum di-mapping', 500)
  }
}

export async function createDivisionChannelService(body: CreateDivisionChannelDto, ctx: Context) {
  try {
    const existing = await findDivisionChannelByName(body.channel_name)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    }

    const result = await createDivisionChannel(body)

    await logAudit(ctx, {
      action: 'division_channel.create',
      entity: 'division_channels',
      entityId: result!.id,
      companyId: body.company_id,
      newValue: body,
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat division channel', 500)
  }
}

export async function updateDivisionChannelService(id: number, body: UpdateDivisionChannelDto, ctx: Context) {
  try {
    const existing = await findDivisionChannelById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Division channel dengan id ${id} tidak ditemukan`, 404)

    if (body.channel_name && body.channel_name !== existing.channel_name) {
      const duplicate = await findDivisionChannelByName(body.channel_name, id)
      if (duplicate.length > 0) {
        throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
      }
    }

    const result = await updateDivisionChannel(id, body)

    await logAudit(ctx, {
      action: 'division_channel.update',
      entity: 'division_channels',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { channel_name: existing.channel_name, division_id: existing.division_id },
      newValue: { channel_name: body.channel_name ?? existing.channel_name, division_id: body.division_id ?? existing.division_id },
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Channel sudah ada', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate division channel', 500)
  }
}

export interface ImportDivisionChannelsResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function importDivisionChannelsService(
  fileBuffer: Buffer,
  isXlsx: boolean,
  companyId: number,
  ctx: Context,
): Promise<ImportDivisionChannelsResult> {
  let parsed: Record<string, string>[]
  if (isXlsx) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    const headerIdx = rawRows.findIndex((r) => r.map(String).some((c) => c.trim().toLowerCase() === 'channel_name'))
    if (headerIdx === -1) throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Header "channel_name" tidak ditemukan di file', 400)
    const headers = rawRows[headerIdx].map((h) => String(h).trim())
    parsed = rawRows.slice(headerIdx + 1)
      .filter((r) => r.some((c) => String(c).trim() !== ''))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])))
  } else {
    const { data } = Papa.parse<Record<string, string>>(fileBuffer.toString('utf-8'), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    })
    parsed = data
  }

  let added = 0
  let skipped = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i]
    const rowNum = i + 2

    const channelName = row.channel_name?.toUpperCase().trim()
    const divisionIdStr = row.division_id?.trim()

    if (!channelName) {
      errors.push({ row: rowNum, message: 'channel_name wajib diisi' })
      continue
    }
    if (!divisionIdStr) {
      errors.push({ row: rowNum, message: 'division_id wajib diisi (ID numerik dari tabel branch_divisions)' })
      continue
    }

    const divisionId = parseInt(divisionIdStr, 10)
    if (isNaN(divisionId)) {
      errors.push({ row: rowNum, message: 'division_id harus berupa angka' })
      continue
    }

    const existing = await findDivisionChannelByNameAndCompany(channelName, companyId)
    if (existing) {
      skipped++
      continue
    }

    await createDivisionChannel({ channel_name: channelName, division_id: divisionId, company_id: companyId })
    added++
  }

  if (added > 0) {
    await logAudit(ctx, {
      action: 'division_channel.import',
      entity: 'division_channels',
      entityId: 0,
      companyId,
      newValue: { added, skipped, errors: errors.length },
    })
  }

  return { added, skipped, errors }
}

export function getDivisionChannelsTemplate(): ArrayBuffer {
  const title       = ['Template Import Division Channels', '']
  const descriptions = [
    'Nama channel penjualan\n(harus UPPERCASE, cocok dengan kolom "Nama Tenaga Penjual" di faktur)',
    'ID divisi (numeric, dari tabel branch_divisions)\nGunakan endpoint GET /api/v1/settings/branch-divisions untuk daftar ID.',
  ]
  const headers  = ['channel_name', 'division_id']
  const examples = [
    ['DC WEST',         1],
    ['DC EAST',         1],
    ['SDR B2B WEST',    2],
    ['B2B EAST',        2],
    ['TOKOPEDIA',       3],
  ]

  const ws = XLSX.utils.aoa_to_sheet([title, descriptions, headers, ...examples])
  ws['!cols'] = [{ wch: 32 }, { wch: 48 }]
  ws['!rows'] = [{ hpt: 20 }, { hpt: 70 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Division Channels')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function deleteDivisionChannelService(id: number, ctx: Context) {
  try {
    const existing = await findDivisionChannelById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Division channel dengan id ${id} tidak ditemukan`, 404)

    await deleteDivisionChannel(id)

    await logAudit(ctx, {
      action: 'division_channel.delete',
      entity: 'division_channels',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { channel_name: existing.channel_name, division_id: existing.division_id },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus division channel', 500)
  }
}