import type { Context } from 'hono'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  findChannelDivisions,
  findChannelDivisionById,
  findChannelDivisionByName,
  findChannelDivisionByNameAndCompany,
  createChannelDivision,
  updateChannelDivision,
  deleteChannelDivision,
  findUnmappedChannelNames,
  findDistinctDivisions,
} from './channel-divisions.repository'
import { findActiveDivisions } from './divisions.repository'
import type {
  ListChannelDivisionsQuery,
  CreateChannelDivisionDto,
  UpdateChannelDivisionDto,
} from './channel-divisions.schema'

// Division sekarang FK integer per company (task012 v2, tabel `divisions`) — validasi
// terhadap DB (company-scoped), bukan const VALID_DIVISIONS tetap lagi.
async function isValidDivision(companyId: number, divisionId: number): Promise<boolean> {
  const activeDivisions = await findActiveDivisions(companyId)
  return activeDivisions.some((d) => d.id === divisionId)
}

export async function listChannelDivisionsService(query: ListChannelDivisionsQuery) {
  try {
    return await findChannelDivisions(query)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar channel division', 500)
  }
}

export async function listDivisionValuesService(companyId: number | 'all') {
  try {
    return await findDistinctDivisions(companyId)
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

export async function createChannelDivisionService(body: CreateChannelDivisionDto, ctx: Context) {
  try {
    if (!(await isValidDivision(body.company_id, body.division_id))) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Division tidak terdaftar untuk company ini`, 400)
    }
    const existing = await findChannelDivisionByName(body.channel_name)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    }
    const result = await createChannelDivision(body)

    await logAudit(ctx, {
      action: 'channel_division.create',
      entity: 'channel_divisions',
      entityId: result!.id,
      companyId: body.company_id,
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
    resolveCompanyScope(ctx, existing.company_id) // throw 403 kalau row ini di luar akses company user
    if (body.company_id && body.company_id !== existing.company_id) {
      resolveCompanyScope(ctx, body.company_id) // company_id BARU (kalau diubah) juga wajib dalam akses user
    }

    if (body.division_id) {
      const scopeCompanyId = body.company_id ?? existing.company_id
      if (!(await isValidDivision(scopeCompanyId, body.division_id))) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, `Division tidak terdaftar untuk company ini`, 400)
      }
    }

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
      companyId: existing.company_id,
      oldValue: { channel_name: existing.channel_name, division_id: existing.division_id },
      newValue: { channel_name: body.channel_name ?? existing.channel_name, division_id: body.division_id ?? existing.division_id },
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Channel sudah ada', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate channel division', 500)
  }
}

export interface ImportChannelDivisionsResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function importChannelDivisionsService(
  fileBuffer: Buffer,
  isXlsx: boolean,
  companyId: number,
  ctx: Context,
): Promise<ImportChannelDivisionsResult> {
  let parsed: Record<string, string>[]
  if (isXlsx) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    // Scan baris pertama yang mengandung "channel_name" sebagai header
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

  // File import pakai KEY string (human-authored text di CSV/XLSX), bukan division_id
  // mentah — di-resolve ke ID sekali di luar loop (mirror pola item_type task011).
  const activeDivisions = await findActiveDivisions(companyId)
  const divisionIdByKey = new Map(activeDivisions.map((d) => [d.key, d.id]))

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i]
    const rowNum = i + 2

    const channelName = row.channel_name?.toUpperCase().trim()
    const divisionKey = row.division?.toLowerCase().trim()
    const divisionId = divisionKey ? divisionIdByKey.get(divisionKey) : undefined

    if (!channelName) {
      errors.push({ row: rowNum, message: 'channel_name wajib diisi' })
      continue
    }
    if (!divisionId) {
      errors.push({ row: rowNum, message: `division "${divisionKey ?? ''}" tidak valid. Pilihan: ${[...divisionIdByKey.keys()].join(', ')}` })
      continue
    }

    const existing = await findChannelDivisionByNameAndCompany(channelName, companyId)
    if (existing) {
      skipped++
      continue
    }

    await createChannelDivision({ channel_name: channelName, division_id: divisionId, company_id: companyId })
    added++
  }

  if (added > 0) {
    await logAudit(ctx, {
      action: 'channel_division.import',
      entity: 'channel_divisions',
      entityId: 0,
      companyId,
      newValue: { added, skipped, errors: errors.length },
    })
  }

  return { added, skipped, errors }
}

export function getChannelDivisionsTemplate(): ArrayBuffer {
  const title       = ['Template Import Channel Divisions', '']
  const descriptions = [
    'Nama channel penjualan\n(harus UPPERCASE, cocok dengan kolom "Nama Tenaga Penjual" di faktur)',
    'Divisi channel\nPilihan: distribution | project | e_commerce | intercompany | freelancer | support',
  ]
  const headers  = ['channel_name', 'division']
  const examples = [
    ['DC WEST',         'distribution'],
    ['DC EAST',         'distribution'],
    ['SDR B2B WEST',    'project'],
    ['B2B EAST',        'project'],
    ['TOKOPEDIA',       'e_commerce'],
    ['TIKTOKSHOP',      'e_commerce'],
    ['LAZADA',          'e_commerce'],
    ['KODE NIAGA TAMA', 'intercompany'],
    ['SBY UDIN',        'freelancer'],
    ['SALES SUPPORT',   'support'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([title, descriptions, headers, ...examples])
  ws['!cols'] = [{ wch: 32 }, { wch: 48 }]
  ws['!rows'] = [{ hpt: 20 }, { hpt: 42 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Channel Divisions')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function deleteChannelDivisionService(id: number, ctx: Context) {
  try {
    const existing = await findChannelDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Channel division dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // throw 403 kalau row ini di luar akses company user

    await deleteChannelDivision(id)

    await logAudit(ctx, {
      action: 'channel_division.delete',
      entity: 'channel_divisions',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { channel_name: existing.channel_name, division_id: existing.division_id },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus channel division', 500)
  }
}
