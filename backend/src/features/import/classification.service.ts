import type { Context } from 'hono'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/utils/error'
import { logAudit } from '@/utils/audit'
import {
  findClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
} from './import.repository'
import { MATCH_TYPE_PRIORITY } from './import.schema'
import type { z } from 'zod'
import type { classificationRuleSchema, classificationRuleUpdateSchema } from './import.schema'

const VALID_MATCH_TYPES = ['keyword_item_name', 'keyword_category', 'price_range', 'exact_item_name', 'exact_category'] as const
const VALID_ITEM_TYPES = ['unit', 'consumable', 'sparepart', 'service'] as const

type CreateRuleDto = z.infer<typeof classificationRuleSchema>
type UpdateRuleDto = z.infer<typeof classificationRuleUpdateSchema>

export async function listClassificationRules(companyId?: number) {
  try {
    return await findClassificationRules(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar rules', 500)
  }
}

export async function createClassificationRuleService(data: CreateRuleDto, ctx: Context) {
  try {
    const priority = MATCH_TYPE_PRIORITY[data.match_type] ?? 50
    const rule = await createClassificationRule({ ...data, priority })

    await logAudit(ctx, {
      action: 'classification_rule.create',
      entity: 'item_classification_rules',
      entityId: rule!.id,
      companyId: data.company_id ?? null,
      newValue: { ...data, priority },
    })

    return rule
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat rule', 500)
  }
}

export async function updateClassificationRuleService(id: number, data: UpdateRuleDto, ctx: Context) {
  try {
    const rule = await updateClassificationRule(id, data)
    if (!rule) throw new AppError(ErrorCode.NOT_FOUND, 'Rule tidak ditemukan', 404)

    await logAudit(ctx, {
      action: 'classification_rule.update',
      entity: 'item_classification_rules',
      entityId: id,
      companyId: rule.company_id ?? null,
      oldValue: data,
    })

    return rule
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate rule', 500)
  }
}

export async function deleteClassificationRuleService(id: number, ctx: Context) {
  try {
    await deleteClassificationRule(id)

    await logAudit(ctx, {
      action: 'classification_rule.delete',
      entity: 'item_classification_rules',
      entityId: id,
      companyId: null,
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus rule', 500)
  }
}

export interface ImportClassificationResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function importClassificationRulesService(
  fileBuffer: Buffer,
  isXlsx: boolean,
  companyId: number,
  ctx: Context,
): Promise<ImportClassificationResult> {
  let parsed: Record<string, string>[]
  if (isXlsx) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    // Scan baris pertama yang mengandung "match_type" sebagai header
    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    const headerIdx = rawRows.findIndex((r) => r.map(String).some((c) => c.trim().toLowerCase() === 'match_type'))
    if (headerIdx === -1) throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Header "match_type" tidak ditemukan di file', 400)
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

  // Fetch existing rules for this company (plus global) for dedup check
  const existingRules = await findClassificationRules(companyId)

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i]
    const rowNum = i + 2

    const matchType = row.match_type?.trim()
    const matchPattern = row.match_pattern?.trim()
    const itemType = row.item_type?.trim()

    if (!matchType || !(VALID_MATCH_TYPES as readonly string[]).includes(matchType)) {
      errors.push({ row: rowNum, message: `match_type "${matchType ?? ''}" tidak valid. Pilihan: ${VALID_MATCH_TYPES.join(', ')}` })
      continue
    }
    if (!matchPattern) {
      errors.push({ row: rowNum, message: 'match_pattern wajib diisi' })
      continue
    }
    if (!itemType || !(VALID_ITEM_TYPES as readonly string[]).includes(itemType)) {
      errors.push({ row: rowNum, message: `item_type "${itemType ?? ''}" tidak valid. Pilihan: ${VALID_ITEM_TYPES.join(', ')}` })
      continue
    }

    const upperPattern = matchType === 'price_range' ? matchPattern : matchPattern.toUpperCase()

    const duplicate = existingRules.find(
      (r) => r.match_type === matchType && r.match_pattern === upperPattern && r.company_id === companyId,
    )
    if (duplicate) {
      skipped++
      continue
    }

    const priority = MATCH_TYPE_PRIORITY[matchType] ?? 50
    await createClassificationRule({
      company_id: companyId,
      match_type: matchType as typeof VALID_MATCH_TYPES[number],
      match_pattern: upperPattern,
      item_type: itemType as typeof VALID_ITEM_TYPES[number],
      priority,
      is_active: true,
    })
    added++
  }

  if (added > 0) {
    await logAudit(ctx, {
      action: 'classification_rule.import',
      entity: 'item_classification_rules',
      entityId: 0,
      companyId,
      newValue: { added, skipped, errors: errors.length },
    })
  }

  return { added, skipped, errors }
}

export function getClassificationRulesTemplate(): ArrayBuffer {
  const title        = ['Template Import Klasifikasi Item', '', '']
  const descriptions = [
    'Tipe pencocokan\nPilihan:\n· keyword_item_name — cari kata di nama barang\n· keyword_category — cari kata di kategori\n· exact_item_name — nama barang persis sama\n· exact_category — kategori persis sama\n· price_range — rentang harga',
    'Pola yang dicocokkan\n· Untuk keyword/exact: tulis kata kunci (UPPERCASE)\n· Untuk price_range: JSON {"min":500000} atau {"max":50000} atau {"min":100000,"max":500000}',
    'Tipe item hasil klasifikasi\nPilihan: unit | consumable | sparepart | service',
  ]
  const headers  = ['match_type', 'match_pattern', 'item_type']
  const examples = [
    ['keyword_item_name', 'CARTRIDGE',        'consumable'],
    ['keyword_item_name', 'INK',              'consumable'],
    ['keyword_item_name', 'RIBBON',           'consumable'],
    ['keyword_item_name', 'TONER',            'consumable'],
    ['keyword_item_name', 'SPARE PART',       'sparepart'],
    ['keyword_item_name', 'CABLE',            'sparepart'],
    ['keyword_item_name', 'ADAPTOR',          'sparepart'],
    ['keyword_category',  'PRINTER',          'unit'],
    ['keyword_category',  'SCANNER',          'unit'],
    ['keyword_category',  'MONEY COUNTER',    'unit'],
    ['keyword_category',  'DISPLAY',          'unit'],
    ['keyword_category',  'MONITOR',          'unit'],
    ['keyword_category',  'SPARE PART',       'sparepart'],
    ['keyword_category',  'CARTRIDGE',        'consumable'],
    ['price_range',       '{"min": 500000}',  'unit'],
    ['price_range',       '{"max": 50000}',   'sparepart'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([title, descriptions, headers, ...examples])
  ws['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 16 }]
  ws['!rows'] = [{ hpt: 20 }, { hpt: 80 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Klasifikasi Item')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}
