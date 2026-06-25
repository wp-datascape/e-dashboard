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
  item_name?: string         // Nama Barang (Excel only); CSV fallback ke product_category
  quantity?: number
  unit_price?: number
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

// ─── Column mapping — mendukung INGGRIS + INDONESIA + variasi umum ────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  invoice_number: [
    'invoice_number', 'invoice no', 'invoice no.', 'invoice#', 'inv_no', 'inv number',
    'no_faktur', 'no faktur', 'nomor faktur', 'faktur', 'invoice',
  ],
  invoice_date: [
    'invoice_date', 'invoice date', 'inv_date', 'inv date', 'date', 'tanggal',
    'tgl', 'trans_date', 'transaction date', 'tgl_faktur', 'tanggal faktur',
  ],
  customer_code: [
    'customer_code', 'customer code', 'cust_code', 'cust code', 'kode customer',
    'kode_customer', 'kode pelanggan', 'cust_id', 'customer id', 'customer_id',
  ],
  customer_name: [
    'customer_name', 'customer name', 'cust_name', 'cust name', 'nama customer',
    'nama_customer', 'nama pelanggan', 'pelanggan', 'customer', 'client',
  ],
  product_category: [
    'product_category', 'product category', 'prod_category', 'prod cat',
    'kategori', 'kategori produk', 'kategori_produk', 'category', 'product',
    'item', 'barang', 'nama barang', 'nama_item', 'item_name', 'item name',
  ],
  revenue: [
    'revenue', 'total', 'amount', 'jumlah', 'harga', 'total_price', 'total price',
    'nilai', 'subtotal', 'sales', 'penjualan', 'dpp', 'harga_satuan', 'unit_price',
  ],
  gross_profit: [
    'gross_profit', 'gross profit', 'gp', 'laba', 'laba kotor', 'laba_kotor',
    'profit', 'margin', 'keuntungan', 'net profit', 'net_profit',
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, '_'))
}

/**
 * Map actual header names to canonical column names.
 * Returns a mapping dari canonical name → original key untuk ambil data row.
 */
function mapColumns(headers: string[]): Record<string, string> {
  const normalized = normalizeHeaders(headers)
  const mapping: Record<string, string> = {}

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const normalizedAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, '_'))

    for (let i = 0; i < normalized.length; i++) {
      if (normalizedAliases.includes(normalized[i])) {
        mapping[canonical] = headers[i] // pakai original key (case asli)
        break
      }
    }
  }

  return mapping
}

function validateHeaders(headers: string[]): void {
  const mapping = mapColumns(headers)
  const required = Object.keys(COLUMN_ALIASES)
  const missing = required.filter((col) => !mapping[col])
  if (missing.length > 0) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      `Missing required columns: ${missing.join(', ')}. Detected headers: ${headers.join(', ')}`,
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

function mapRow(raw: Record<string, unknown>, rowNum: number, columnMapping?: Record<string, string>): InvoiceRow {
  // Helper: ambil nilai dari raw data, coba canonical key dulu, lalu alias
  const rawKey = (canonical: string): string => columnMapping?.[canonical] ?? canonical
  const val = (canonical: string) => String(raw[rawKey(canonical)] ?? '').trim()

  return {
    invoice_number: val('invoice_number'),
    invoice_date: val('invoice_date'),
    customer_code: val('customer_code'),
    customer_name: val('customer_name'),
    product_category: val('product_category'),
    revenue: parseNumeric(raw[rawKey('revenue')], 'revenue', rowNum),
    gross_profit: parseNumeric(raw[rawKey('gross_profit')], 'gross_profit', rowNum),
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

  // Parse dengan transformHeader — row keys akan menjadi normalized (lowercase, underscore)
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, '_'),
  })

  // Build column mapping dari normalized headers → canonical keys
  let columnMapping: Record<string, string> = {}
  if (parsed.meta.fields) {
    const normalizedFields = parsed.meta.fields
    validateHeaders(normalizedFields)
    columnMapping = mapColumns(normalizedFields)
  }

  const rows: InvoiceRow[] = []
  const errors: ParseRowError[] = []

  parsed.data.forEach((raw, index) => {
    const rowNum = index + 2
    try {
      const row = mapRow(raw, rowNum, columnMapping)
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

// ─── Column positions for Accurate Online "Rincian Faktur Penjualan Laba" export ──
// Setiap kolom di Accurate export diikuti 1 cell kosong (merged cells), jadi index berlipat.
// Layout actual (0-based): B(1) | C(2)empty | D(3) | E(4)empty | F(5) | ... dst
// Row 4 = header: Tanggal | | Sales Invoice | | Pelanggan | | Nama Cabang | | Nama Kategori | | Nama Barang | | Kuantitas | | @Harga | | Total Harga | | BPP | | Laba
const EXCEL_COL = {
  DATE: 1,           // Tanggal (format: "DD MMM YYYY", e.g. "02 Jun 2026")
  INVOICE_NO: 3,     // Sales Invoice
  CUSTOMER_NAME: 5,  // Pelanggan
  CATEGORY: 9,       // Nama Kategori Barang Barang & Jasa
  ITEM_NAME: 11,     // Nama Barang
  QUANTITY: 13,      // Kuantitas
  UNIT_PRICE: 15,    // @Harga (harga satuan)
  REVENUE: 17,       // Total Harga
  GROSS_PROFIT: 21,  // Laba
} as const

/**
 * Check if a row from an Accurate export is a data row (not header, not summary, not footer).
 */
function isAccurateDataRow(row: unknown[]): boolean {
  // Row kosong → skip
  if (!row || row.length === 0) return false

  const dateVal = String(row[EXCEL_COL.DATE] ?? '').trim()
  const invVal = String(row[EXCEL_COL.INVOICE_NO] ?? '').trim()

  // Tidak ada invoice number → bukan data row (subtotal/separator)
  if (!invVal) return false

  // Skip footer rows
  const fullText = row.join(' ')
  if (
    fullText.includes('ACCURATE Accounting System') ||
    fullText.includes('Tercetak pada') ||
    fullText.includes('Halaman')
  ) return false

  // Skip date-only separator rows (ada tanggal tapi no invoice)
  if (dateVal && !invVal) return false

  // Skip rows where invoice doesn't look like an invoice number
  if (!invVal.startsWith('SI.') && !invVal.startsWith('INV-')) return false

  return true
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  mei: '05', may: '05', jun: '06', jul: '07',
  agu: '08', aug: '08', sep: '09',
  okt: '10', oct: '10', nov: '11', des: '12', dec: '12',
}

/**
 * Convert berbagai format tanggal dari Accurate export ke DD/MM/YYYY (format internal).
 * Mendukung: "DD MMM YYYY" (e.g. "02 Jun 2026"), "YYYY-MM-DD", "DD/MM/YYYY".
 */
function formatDateFromExport(dateStr: string): string {
  const cleaned = dateStr.trim()
  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) return cleaned
  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`
  // DD MMM YYYY — format Accurate export, e.g. "02 Jun 2026"
  const accurateMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (accurateMatch) {
    const month = MONTH_MAP[accurateMatch[2].toLowerCase()]
    if (month) return `${accurateMatch[1].padStart(2, '0')}/${month}/${accurateMatch[3]}`
  }
  return cleaned
}

/**
 * Parse Excel (.xlsx) file buffer → array of InvoiceRow.
 * Khusus format Accurate Online "Rincian Faktur Penjualan Laba".
 * Partial success: valid rows dikembalikan, error rows di-collect di result.errors.
 */
export async function parseExcel(buffer: Buffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Excel file has no sheets', 400)
  }

  const sheet = workbook.Sheets[sheetName]

  // Parse sebagai row array — merged cells jadi string kosong, bukan __EMPTY
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (rawData.length === 0) {
    throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Excel sheet is empty', 400)
  }

  const rows: InvoiceRow[] = []
  const errors: ParseRowError[] = []

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i] as unknown[]
    const rowNum = i + 1

    if (!isAccurateDataRow(row)) continue

    try {
      const dateRaw = String(row[EXCEL_COL.DATE] ?? '').trim()
      const invNo = String(row[EXCEL_COL.INVOICE_NO] ?? '').trim()
      const customerName = String(row[EXCEL_COL.CUSTOMER_NAME] ?? '').trim()
      const categoryRaw = String(row[EXCEL_COL.CATEGORY] ?? '').trim()
      const itemNameRaw = String(row[EXCEL_COL.ITEM_NAME] ?? '').trim()
      const qtyRaw = String(row[EXCEL_COL.QUANTITY] ?? '').trim().replace(/\.$/, '')
      const unitPriceRaw = String(row[EXCEL_COL.UNIT_PRICE] ?? '').trim().replace(/,/g, '').replace(/\.$/, '')
      // Format Accurate: koma = pemisah ribuan ("5,648,662."), titik akhir = integer tanpa desimal
      const revRaw = String(row[EXCEL_COL.REVENUE] ?? '').trim().replace(/,/g, '').replace(/\.$/, '')
      const gpRaw = String(row[EXCEL_COL.GROSS_PROFIT] ?? '').trim().replace(/,/g, '').replace(/\.$/, '')

      const invoiceDate = formatDateFromExport(dateRaw)
      const revenueNum = parseFloat(revRaw)
      const gpNum = parseFloat(gpRaw)

      if (isNaN(revenueNum)) {
        errors.push({
          rowNumber: rowNum,
          rawData: JSON.stringify(row),
          errorMessage: `Invalid revenue: "${revRaw}"`,
        })
        continue
      }

      if (isNaN(gpNum)) {
        errors.push({
          rowNumber: rowNum,
          rawData: JSON.stringify(row),
          errorMessage: `Invalid gross_profit: "${gpRaw}"`,
        })
        continue
      }

      const invoiceRow: InvoiceRow = {
        invoice_number: invNo,
        invoice_date: invoiceDate,
        customer_code: `CUST-${invNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
        customer_name: customerName.toUpperCase().trim(),
        product_category: categoryRaw.toUpperCase().trim(),
        item_name: itemNameRaw.toUpperCase().trim() || undefined,
        quantity: qtyRaw ? parseFloat(qtyRaw) : undefined,
        unit_price: unitPriceRaw ? parseFloat(unitPriceRaw) : undefined,
        revenue: revenueNum,
        gross_profit: gpNum,
      }

      const validationError = validateRow(invoiceRow, rowNum)
      if (validationError) {
        errors.push({ rowNumber: rowNum, rawData: JSON.stringify(row), errorMessage: validationError })
      } else {
        rows.push(invoiceRow)
      }
    } catch (err) {
      errors.push({
        rowNumber: rowNum,
        rawData: JSON.stringify(row),
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { rows, totalRows: rows.length + errors.length, errors }
}
