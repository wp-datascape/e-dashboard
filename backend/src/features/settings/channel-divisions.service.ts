import type { Context } from 'hono'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { findBranchById } from '@/features/companies/branch.repository'
import { ensureDivisionCode } from './divisions.service'
import { findDivisionCodesForFilter } from './divisions.repository'
import {
  findChannelDivisions,
  findChannelDivisionById,
  findChannelDivisionByName,
  findChannelDivisionByNameAndCompany,
  createChannelDivision,
  updateChannelDivision,
  deleteChannelDivision,
  findUnmappedChannelNames,
  findConsistentBranchIdForChannel,
} from './channel-divisions.repository'
import type {
  ListChannelDivisionsQuery,
  CreateChannelDivisionDto,
  UpdateChannelDivisionDto,
} from './channel-divisions.schema'

/**
 * Validasi branch_id (kalau diisi) — harus eksis dan milik company_id yang
 * sama. company_id null (rule global) tidak boleh dipasangkan branch_id
 * (branch selalu milik 1 company spesifik, jadi tidak ada "branch global").
 */
async function assertValidBranchScope(companyId: number | null | undefined, branchId: number | null | undefined) {
  if (!branchId) return
  if (!companyId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'branch_id tidak bisa diisi tanpa company_id (branch selalu milik 1 company)', 400)
  }
  const branch = await findBranchById(branchId)
  if (!branch || branch.company_id !== companyId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'branch_id tidak valid untuk company ini', 400)
  }
}

export async function listChannelDivisionsService(query: ListChannelDivisionsQuery) {
  try {
    return await findChannelDivisions(query)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar channel division', 500)
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

export async function createChannelDivisionService(body: CreateChannelDivisionDto, ctx: Context) {
  try {
    const existing = await findChannelDivisionByName(body.channel_name)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Channel "${body.channel_name}" sudah ada`, 409)
    }
    await assertValidBranchScope(body.company_id, body.branch_id)
    // SSOT kode divisi = keputusan admin yang tertulis di form/file mapping ini
    // sendiri — auto-create katalog kalau belum ada, bukan tolak (task005 §6).
    await ensureDivisionCode(body.company_id, body.branch_id ?? null, body.division)
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

    const finalCompanyId = body.company_id !== undefined ? body.company_id : existing.company_id
    const finalBranchId = body.branch_id !== undefined ? body.branch_id : existing.branch_id
    await assertValidBranchScope(finalCompanyId, finalBranchId)

    const finalDivision = body.division ?? existing.division
    if (finalCompanyId) await ensureDivisionCode(finalCompanyId, finalBranchId ?? null, finalDivision)

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

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i]
    const rowNum = i + 2

    const channelName = row.channel_name?.toUpperCase().trim()
    const division = row.division?.toLowerCase().trim()

    if (!channelName) {
      errors.push({ row: rowNum, message: 'channel_name wajib diisi' })
      continue
    }
    if (!division) {
      errors.push({ row: rowNum, message: 'division wajib diisi' })
      continue
    }
    // Branch di-derive dari histori invoice riil (SSOT dari data faktur),
    // BUKAN diketik manual — revisi B6 (task005 §6, 2026-07-09). Kalau channel
    // ini konsisten cuma pernah muncul di 1 branch, otomatis pakai itu; kalau
    // belum pernah ada di invoice atau nyebar ke >1 branch (ambigu), fallback
    // company-wide (branch_id null) seperti sebelumnya — tidak pernah menebak.
    const branchId = await findConsistentBranchIdForChannel(channelName, companyId)

    // Kode divisi = keputusan admin yang tertulis di file import ini sendiri —
    // auto-create katalog kalau belum ada, tidak perlu didaftarkan terpisah
    // dulu di tempat lain (task005 §6, revisi 2026-07-09).
    await ensureDivisionCode(companyId, branchId, division)

    const existing = await findChannelDivisionByNameAndCompany(channelName, companyId)
    if (existing) {
      skipped++
      continue
    }

    await createChannelDivision({ channel_name: channelName, division, company_id: companyId, branch_id: branchId })
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
    'Kode divisi channel — harus sudah terdaftar untuk company ini (lihat halaman Divisions).\n' +
      'Cabang TIDAK perlu diisi manual — otomatis di-deteksi dari histori faktur channel ini\n' +
      '(kalau channel cuma pernah muncul di 1 cabang). Kalau channel belum ada di faktur atau\n' +
      'muncul di >1 cabang, mapping jadi company-wide (berlaku semua cabang).',
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
  ws['!rows'] = [{ hpt: 20 }, { hpt: 70 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Channel Divisions')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
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
