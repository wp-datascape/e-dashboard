/**
 * utils/parser.ts
 *
 * CSV dan Excel file parser untuk invoice import.
 * Output selalu dikonversi ke format internal yang konsisten.
 *
 * Column mapping dari Accurate Online export (sesuai data-model.md):
 *   invoice_number   | invoice_date (DD/MM/YYYY) | customer_code | customer_name
 *   product_category | revenue                   | gross_profit
 *
 * DILARANG: Mengubah nama kolom internal tanpa update data-model.md.
 *
 * Usage:
 *   import { parseCsv, parseExcel } from '@/utils/parser'
 *
 *   const rows = await parseCsv(fileBuffer)
 *   const rows = await parseExcel(fileBuffer)
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/utils/error'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceRow {
  invoice_number: string
  invoice_date: string       // format: DD/MM/YYYY (as-is dari Accurate)
  customer_code: string
  customer_name: string
  product_category: string
  revenue: number
  gross_profit: number
}

export interface ParseResult {
  rows: InvoiceRow[]
  totalRows: number
  errors: ParseRowError[]
}

export interface ParseRowError {
  rowNumber: number
  rawData: string
  errorMessage: string
}

// ─── Required columns ─────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = [
  'invoice_number',
  'invoice_date',
  'customer_code',
  'customer_name',
  'product_category',
  'revenue',
  'gross_profit',
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
}

function validateHeaders(headers: string[]): void {
  const normalized = normalizeHeaders(headers)
  const missing = REQUIRED_COLUMNS.filter((col) => !normalized.includes(col))
  if (missing.length > 0) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      `Missing required columns: ${missing.join(', ')}`,
      400,
    )
  }
}

function parseNumeric(value: unknown, fieldName: string, rowNum: number): number {
  const str = String(value ?? '').trim().replace(',', '.')
  const num = parseFloat(str)
  if (isNaN(num)) {
    throw new Error(`Row ${rowNum}: Invalid numeric value for ${fieldName}: "${value}"`)
  }
  return num
}

function mapRow(raw: Record<string, unknown>, rowNum: number): InvoiceRow {
  return {
    invoice_number: String(raw['invoice_number'] ?? '').trim(),
    invoice_date: String(raw['invoice_date'] ?? '').trim(),
    customer_code: String(raw['customer_code'] ?? '').trim(),
    customer_name: String(raw['customer_name'] ?? '').trim(),
    product_category: String(raw['product_category'] ?? '').trim(),
    revenue: parseNumeric(raw['revenue'], 'revenue', rowNum),
    gross_profit: parseNumeric(raw['gross_profit'], 'gross_profit', rowNum),
  }
}

function validateRow(row: InvoiceRow, rowNum: number): string | null {
  if (!row.invoice_number) return `Row ${rowNum}: invoice_number is empty`
  if (!row.invoice_date) return `Row ${rowNum}: invoice_date is empty`
  if (!row.customer_code) return `Row ${rowNum}: customer_code is empty`
  if (!row.customer_name) return `Row ${rowNum}: customer_name is empty`
  return null
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Parse CSV file buffer → array of InvoiceRow.
 * Partial success: valid rows dikembalikan, error rows di-collect di result.errors.
 */
export async function parseCsv(buffer: Buffer): Promise<ParseResult> {
  const content = buffer.toString('utf-8')

  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (parsed.meta.fields) {
    validateHeaders(parsed.meta.fields)
  }

  const rows: InvoiceRow[] = []
  const errors: ParseRowError[] = []

  parsed.data.forEach((raw, index) => {
    const rowNum = index + 2 // +2 karena row 1 = header
    try {
      const row = mapRow(raw, rowNum)
      const validationError = validateRow(row, rowNum)
      if (validationError) {
        errors.push({ rowNumber: rowNum, rawData: JSON.stringify(raw), errorMessage: validationError })
      } else {
        rows.push(row)
      }
    } catch (err) {
      errors.push({
        rowNumber: rowNum,
        rawData: JSON.stringify(raw),
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  })

  return { rows, totalRows: parsed.data.length, errors }
}

// ─── Excel Parser ─────────────────────────────────────────────────────────────

/**
 * Parse Excel (.xlsx) file buffer → array of InvoiceRow.
 * Partial success: valid rows dikembalikan, error rows di-collect di result.errors.
 */
export async function parseExcel(buffer: Buffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Excel file has no sheets', 400)
  }

  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false, // semua value sebagai string, biar kita parse sendiri
  })

  if (rawData.length === 0) {
    throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Excel sheet is empty', 400)
  }

  // Normalize headers dari key pertama
  const firstRow = rawData[0]
  const headers = Object.keys(firstRow).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  validateHeaders(headers)

  // Re-map keys menjadi normalized
  const normalizedData = rawData.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, '_'), v]),
    ),
  )

  const rows: InvoiceRow[] = []
  const errors: ParseRowError[] = []

  normalizedData.forEach((raw, index) => {
    const rowNum = index + 2 // +2 karena row 1 = header
    try {
      const row = mapRow(raw, rowNum)
      const validationError = validateRow(row, rowNum)
      if (validationError) {
        errors.push({ rowNumber: rowNum, rawData: JSON.stringify(raw), errorMessage: validationError })
      } else {
        rows.push(row)
      }
    } catch (err) {
      errors.push({
        rowNumber: rowNum,
        rawData: JSON.stringify(raw),
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  })

  return { rows, totalRows: rawData.length, errors }
}