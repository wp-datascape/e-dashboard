// features/settings/high-margin-import.service.ts (task036, 2026-08-31)
//
// Bulk import mapping High Margin Products — 2 tahap (instruksi user):
// 1. preview  — parse file, validasi tiap baris terhadap "kamus" nama
//    produk/kategori/divisi company yang dipilih, deteksi konflik dengan
//    mapping aktif yang sudah ada. TIDAK menulis apa pun ke DB.
// 2. commit   — terima baris hasil preview yang mau disimpan (dari
//    frontend), validasi ULANG (jangan percaya payload client begitu
//    saja), baru insert. Lihat docs-v2/task/task036.md.
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { logAudit } from '@/utils/audit'
import { findActiveDivisions } from './divisions.repository'
import {
  findProductsAndCategoriesByCompany,
  findHighMargins,
  createHighMarginWithSupersede,
} from './high-margin.repository'
import type { HighMarginImportCommitDto } from './high-margin.schema'
import { invalidateMetricCache } from '@/features/metrics/metric-cache.helper'

export interface HighMarginImportPreviewRow {
  row: number
  type: 'product' | 'category' | null
  name: string
  target_id: number | null
  division_names: string[]
  division_ids: number[]
  effective_from: string
  effective_until?: string
  note?: string
  status: 'success' | 'conflict' | 'error'
  error_message?: string
  // Terisi kalau status='conflict' — info mapping AKTIF yang bentrok, dipakai
  // frontend menampilkan "data lama vs data baru" berdampingan.
  conflict?: {
    id: number
    effective_from: string
    effective_until: string | null
    division_names: string[]
    note: string | null
  }
}

export interface HighMarginImportPreviewResult {
  rows: HighMarginImportPreviewRow[]
  success_count: number
  conflict_count: number
  error_count: number
}

/** "Sehari sebelum" tanggal YYYY-MM-DD, murni string manipulation lewat Date
 * (tanggal murni tanpa jam, aman dari pergeseran timezone utk kasus ini). */
function dayBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! - 1))
  return dt.toISOString().slice(0, 10)
}

/** "DD-MM-YYYY" (format lokal Indonesia, dipakai di kolom Tanggal Mulai/
 * Tanggal Selesai template) → "YYYY-MM-DD" (ISO, dipakai internal utk
 * perbandingan & disimpan ke DB). Validasi kalender asli (bukan cuma
 * bentuk teksnya), null kalau tanggal tidak valid (mis. 31-02-2026). */
function parseDateID(input: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(input)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null
  return `${yyyy}-${mm}-${dd}`
}

export async function getHighMarginImportTemplate(companyId: number): Promise<ArrayBuffer> {
  const divisionRows = await findActiveDivisions(companyId, undefined)
  const assignable = divisionRows.filter((d) => d.key !== 'intercompany')

  const title = ['Template Import Mapping High Margin Products', '', '', '', '', '']
  const note = ['Format tanggal: DD-MM-YYYY (contoh: 01-01-2026)', '', '', '', '', '']
  const headers = ['Tipe', 'Nama', 'Divisi', 'Tanggal Mulai', 'Tanggal Selesai', 'Catatan']
  const examples = [
    ['Produk', 'CONTOH NAMA PRODUK PERSIS SESUAI SISTEM', assignable[0]?.label ?? 'Distribution', '01-01-2026', '', ''],
    ['Kategori', 'CONTOH NAMA KATEGORI PERSIS SESUAI SISTEM', (assignable[1] ?? assignable[0])?.label ?? 'Project', '01-01-2026', '', 'Opsional'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([title, note, headers, ...examples])
  ws['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 24 }]

  // Sheet legend — daftar nama divisi VALID company ini (exclude
  // intercompany, task017 §6.2), reference read-only utk kolom "Divisi"
  // (bisa lebih dari 1, pisah koma). Template TIDAK generik antar company
  // krn sheet ini beda-beda (lihat task036.md).
  const legendHeader = ['Nama Divisi Valid (bisa lebih dari 1, pisah koma)']
  const legendRows = assignable.map((d) => [d.label])
  const wsLegend = XLSX.utils.aoa_to_sheet([legendHeader, ...legendRows])
  wsLegend['!cols'] = [{ wch: 34 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Legend Divisi')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function previewHighMarginImport(
  fileBuffer: Buffer,
  isXlsx: boolean,
  companyId: number,
): Promise<HighMarginImportPreviewResult> {
  let parsed: Record<string, string>[]
  if (isXlsx) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]!]!
    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    const headerIdx = rawRows.findIndex((r) => r.map(String).some((c) => c.trim().toLowerCase() === 'tipe'))
    if (headerIdx === -1) throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Header "Tipe" tidak ditemukan di file', 400)
    const headers = rawRows[headerIdx]!.map((h) => String(h).trim().toLowerCase())
    parsed = rawRows.slice(headerIdx + 1)
      .filter((r) => r.some((c) => String(c).trim() !== ''))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])))
  } else {
    const { data } = Papa.parse<Record<string, string>>(fileBuffer.toString('utf-8'), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      transform: (v) => v.trim(),
    })
    parsed = data
  }

  const { products, categories } = await findProductsAndCategoriesByCompany(companyId)
  const productMap = new Map(products.map((p) => [p.name.trim().toUpperCase(), p.id]))
  const categoryMap = new Map(categories.map((c) => [c.name.trim().toUpperCase(), c.id]))

  const divisionRows = await findActiveDivisions(companyId, undefined)
  const assignableDivisions = divisionRows.filter((d) => d.key !== 'intercompany')
  const divisionMap = new Map(assignableDivisions.map((d) => [d.label.trim().toUpperCase(), d]))

  // Mapping AKTIF company ini (SEMUA, bukan cuma active_only=true — deteksi
  // konflik butuh cek overlap tanggal terhadap histori juga, bukan cuma
  // status "aktif hari ini") — reuse findHighMargins, sudah include
  // division_ids per baris (lihat JSDoc di repository).
  const existingMappings = await findHighMargins({}, [companyId])

  const rows: HighMarginImportPreviewRow[] = []
  let successCount = 0
  let conflictCount = 0
  let errorCount = 0

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]!
    const rowNum = i + 2

    const tipeRaw = (r.tipe ?? '').trim().toLowerCase()
    const nama = (r.nama ?? '').trim()
    const divisiRaw = (r.divisi ?? '').trim()
    const tglMulai = (r['tanggal mulai'] ?? '').trim()
    const tglSelesai = (r['tanggal selesai'] ?? '').trim()
    const catatan = (r.catatan ?? '').trim()

    const errors: string[] = []

    let type: 'product' | 'category' | null = null
    if (tipeRaw === 'produk') type = 'product'
    else if (tipeRaw === 'kategori') type = 'category'
    else errors.push(`Tipe "${r.tipe ?? ''}" tidak valid, harus "Produk" atau "Kategori"`)

    if (!nama) errors.push('Nama wajib diisi')

    let targetId: number | null = null
    if (type && nama) {
      const map = type === 'product' ? productMap : categoryMap
      targetId = map.get(nama.toUpperCase()) ?? null
      if (targetId === null) errors.push(`${type === 'product' ? 'Produk' : 'Kategori'} "${nama}" tidak ditemukan di company ini`)
    }

    const divisionNames = divisiRaw.split(',').map((s) => s.trim()).filter(Boolean)
    const divisionIds: number[] = []
    const resolvedDivisionNames: string[] = []
    if (divisionNames.length === 0) {
      errors.push('Divisi wajib diisi minimal 1 (lihat sheet "Legend Divisi")')
    } else {
      for (const dn of divisionNames) {
        const found = divisionMap.get(dn.toUpperCase())
        if (!found) errors.push(`Divisi "${dn}" tidak ditemukan/tidak valid utk company ini`)
        else { divisionIds.push(found.id); resolvedDivisionNames.push(found.label) }
      }
    }

    const tglMulaiIso = tglMulai ? parseDateID(tglMulai) : null
    const tglSelesaiIso = tglSelesai ? parseDateID(tglSelesai) : null
    if (!tglMulai || !tglMulaiIso) errors.push('Tanggal Mulai wajib diisi, format DD-MM-YYYY')
    if (tglSelesai && !tglSelesaiIso) errors.push('Tanggal Selesai format harus DD-MM-YYYY')
    if (tglMulaiIso && tglSelesaiIso && tglSelesaiIso < tglMulaiIso) errors.push('Tanggal Selesai tidak boleh sebelum Tanggal Mulai')

    const baseRow = {
      row: rowNum,
      type,
      name: nama,
      target_id: targetId,
      division_names: resolvedDivisionNames,
      division_ids: divisionIds,
      effective_from: tglMulaiIso ?? tglMulai,
      effective_until: tglSelesaiIso ?? undefined,
      note: catatan || undefined,
    }

    if (errors.length > 0) {
      errorCount++
      rows.push({ ...baseRow, status: 'error', error_message: errors.join('; ') })
      continue
    }

    // Deteksi konflik — mapping aktif LAIN dgn target sama, DAN minimal 1
    // divisi beririsan, DAN rentang tanggal beririsan (effective_until
    // NULL dianggap tak terbatas ke depan).
    const conflictMapping = existingMappings.find((m) => {
      const sameTarget = type === 'product' ? m.product_id === targetId : m.product_category_id === targetId
      if (!sameTarget) return false
      const divisionOverlap = (m.division_ids as number[]).some((id) => divisionIds.includes(id))
      if (!divisionOverlap) return false
      const existingUntil = m.effective_until ?? '9999-12-31'
      const newUntil = tglSelesaiIso || '9999-12-31'
      return m.effective_from <= newUntil && existingUntil >= tglMulaiIso!
    })

    if (conflictMapping) {
      conflictCount++
      rows.push({
        ...baseRow,
        status: 'conflict',
        conflict: {
          id: conflictMapping.id,
          effective_from: conflictMapping.effective_from,
          effective_until: conflictMapping.effective_until,
          division_names: conflictMapping.division_names as string[],
          note: conflictMapping.note,
        },
      })
    } else {
      successCount++
      rows.push({ ...baseRow, status: 'success' })
    }
  }

  return { rows, success_count: successCount, conflict_count: conflictCount, error_count: errorCount }
}

export interface HighMarginImportCommitResult {
  added: number
  superseded: number
  errors: Array<{ row: number; message: string }>
}

export async function commitHighMarginImport(
  dto: HighMarginImportCommitDto,
  userId: number,
  ctx: Context,
): Promise<HighMarginImportCommitResult> {
  // Validasi ULANG terhadap DB — jangan percaya begitu saja target_id/
  // division_ids/supersede_id dari payload client (bisa saja sudah basi
  // karena jeda waktu antara preview & klik Terapkan, atau dimanipulasi).
  const { products, categories } = await findProductsAndCategoriesByCompany(dto.company_id)
  const validProductIds = new Set(products.map((p) => p.id))
  const validCategoryIds = new Set(categories.map((c) => c.id))
  const divisionRows = await findActiveDivisions(dto.company_id, undefined)
  const validDivisionIds = new Set(divisionRows.filter((d) => d.key !== 'intercompany').map((d) => d.id))
  const existingMappings = await findHighMargins({}, [dto.company_id])
  const existingById = new Map(existingMappings.map((m) => [m.id, m]))

  let added = 0
  let superseded = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < dto.rows.length; i++) {
    const row = dto.rows[i]!
    const rowNum = i + 1
    const targetValid = row.type === 'product' ? validProductIds.has(row.target_id) : validCategoryIds.has(row.target_id)
    if (!targetValid) { errors.push({ row: rowNum, message: `${row.type === 'product' ? 'Produk' : 'Kategori'} tidak ditemukan (mungkin sudah dihapus sejak preview)` }); continue }
    if (row.division_ids.some((id) => !validDivisionIds.has(id))) { errors.push({ row: rowNum, message: 'Ada divisi yang tidak valid utk company ini' }); continue }
    if (row.supersede_id != null) {
      const existing = existingById.get(row.supersede_id)
      if (!existing || existing.company_id !== dto.company_id) {
        errors.push({ row: rowNum, message: 'Mapping lama yang mau digantikan tidak ditemukan (mungkin sudah berubah sejak preview)' })
        continue
      }
    }

    try {
      const supersedeUntil = row.supersede_id != null ? dayBefore(row.effective_from) : undefined
      const mapping = await createHighMarginWithSupersede(
        {
          company_id: dto.company_id,
          product_id: row.type === 'product' ? row.target_id : null,
          product_category_id: row.type === 'category' ? row.target_id : null,
          effective_from: row.effective_from,
          effective_until: row.effective_until ?? null,
          note: row.note ?? null,
          created_by: userId,
        },
        row.division_ids,
        row.supersede_id,
        supersedeUntil,
      )
      added++
      if (row.supersede_id != null) superseded++

      await logAudit(ctx, {
        action: 'high_margin.import_commit',
        entity: 'high_margin_products',
        entityId: mapping!.id,
        companyId: dto.company_id,
        newValue: { ...row },
      })
    } catch (err) {
      errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Gagal menyimpan baris ini' })
    }
  }

  if (added > 0) await invalidateMetricCache(dto.company_id) // EDASHBOARD-591, task038.md

  return { added, superseded, errors }
}
