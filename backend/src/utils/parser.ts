/**
 * utils/parser.ts
 *
 * CSV dan Excel file parser untuk invoice import.
 * Output selalu dikonversi ke format internal yang konsisten.
 *
 * Column mapping dari Accurate Online export (sesuai data-model.md):
 *   invoice_number   | invoice_date (DD/MM/YYYY) | customer_name
 *   product_category | item_name    | quantity    | unit_price
 *   revenue          | gross_profit | branch_name | salesperson
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
  branch_name?: string       // Nama Cabang — dari kolom "Nama Cabang"
  salesperson?: string       // Tenaga Penjual — dari kolom "Nama Tenaga Penjual"
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

// ─── Excel Header Detection ──────────────────────────────────────────────────
// Template resmi: "Rincian Faktur Penjualan" dari Accurate Online.
// Header dideteksi secara dinamis sehingga perubahan urutan kolom tidak memutus parser.

const REQUIRED_EXCEL_HEADERS = [
  { key: 'date',             label: 'Tanggal' },
  { key: 'invoice_number',   label: 'Sales Invoice' },
  { key: 'customer_name',    label: 'Pelanggan' },
  { key: 'product_category', label: 'Nama Kategori Barang Barang & Jasa' },
  { key: 'item_name',        label: 'Nama Barang' },
  { key: 'quantity',         label: 'Kuantitas' },
  { key: 'unit_price',       label: '@Harga' },
  { key: 'revenue',          label: 'Total Harga' },
  { key: 'gross_profit',     label: 'Laba' },
] as const

const OPTIONAL_EXCEL_HEADERS = [
  { key: 'branch_name',  label: 'Nama Cabang' },
  { key: 'salesperson',  label: 'Nama Tenaga Penjual' },
] as const

type ExcelColMap = Record<string, number>

/**
 * Scan baris pertama (max 10) untuk menemukan header row.
 * Header row dikenali dari keberadaan "Tanggal" DAN "Sales Invoice".
 * Mengembalikan index baris header, mapping field → index kolom, dan raw header row.
 */
function detectExcelHeaders(rawData: unknown[][]): { headerRowIndex: number; colMap: ExcelColMap; headerRow: string[] } | null {
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = (rawData[i] as unknown[]).map((c) => String(c ?? '').trim())

    if (!row.includes('Tanggal') || !row.includes('Sales Invoice')) continue

    const colMap: ExcelColMap = {}
    for (const h of [...REQUIRED_EXCEL_HEADERS, ...OPTIONAL_EXCEL_HEADERS]) {
      const idx = row.indexOf(h.label)
      if (idx !== -1) colMap[h.key] = idx
    }
    return { headerRowIndex: i, colMap, headerRow: row }
  }
  return null
}

/**
 * Validasi header row:
 * 1. Semua kolom wajib harus ada.
 * 2. Tidak boleh ada kolom yang tidak dikenali — jika ada, template dianggap tidak valid.
 */
function validateExcelHeaders(colMap: ExcelColMap, headerRow: string[]): void {
  const missing = REQUIRED_EXCEL_HEADERS
    .filter((h) => colMap[h.key] === undefined)
    .map((h) => `"${h.label}"`)

  if (missing.length > 0) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Pastikan menggunakan template resmi "Rincian Faktur Penjualan".`,
      400,
    )
  }

  const knownLabels = new Set<string>([
    ...REQUIRED_EXCEL_HEADERS.map((h) => h.label),
    ...OPTIONAL_EXCEL_HEADERS.map((h) => h.label),
  ])

  const unexpected = headerRow
    .filter((h) => h !== '' && !knownLabels.has(h))
    .map((h) => `"${h}"`)

  if (unexpected.length > 0) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      `Template tidak valid. Kolom tidak dikenali: ${unexpected.join(', ')}. Pastikan menggunakan template resmi "Rincian Faktur Penjualan".`,
      400,
    )
  }
}

/**
 * Cek apakah baris adalah data invoice (bukan header, summary, atau footer).
 */
function isDataRow(row: unknown[], invoiceColIdx: number): boolean {
  if (!row || row.length === 0) return false

  const invVal = String(row[invoiceColIdx] ?? '').trim()
  if (!invVal) return false

  // Skip footer rows
  const fullText = row.join(' ')
  if (
    fullText.includes('ACCURATE Accounting System') ||
    fullText.includes('Tercetak pada') ||
    fullText.includes('Halaman')
  ) return false

  // Invoice number harus diawali SI. atau INV-
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
 * Khusus format Accurate Online "Rincian Faktur Penjualan".
 *
 * Header dideteksi secara dinamis — jika header tidak sesuai template resmi,
 * import dibatalkan dengan pesan error yang jelas.
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

  // ── Detect & validate header row ─────────────────────────────────────────
  const headerResult = detectExcelHeaders(rawData)
  if (!headerResult) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      'Header tidak ditemukan dalam 10 baris pertama. Pastikan menggunakan template resmi "Rincian Faktur Penjualan" dari Accurate Online.',
      400,
    )
  }

  const { headerRowIndex, colMap, headerRow } = headerResult
  validateExcelHeaders(colMap, headerRow)  // throws jika kolom wajib hilang atau ada kolom asing

  const rows: InvoiceRow[] = []
  const errors: ParseRowError[] = []

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[]
    const rowNum = i + 1

    if (!isDataRow(row, colMap.invoice_number)) continue

    try {
      const str = (key: string) => String(row[colMap[key]] ?? '').trim()

      const dateRaw     = str('date')
      const invNo       = str('invoice_number')
      const custName    = str('customer_name')
      const categoryRaw = str('product_category')
      const itemNameRaw = str('item_name')
      const qtyRaw      = str('quantity').replace(/\.$/, '')
      const unitPriceRaw = str('unit_price').replace(/,/g, '').replace(/\.$/, '')
      // Format Accurate: koma = pemisah ribuan ("5,648,662."), titik akhir = integer tanpa desimal
      const revRaw = str('revenue').replace(/,/g, '').replace(/\.$/, '')
      const gpRaw  = str('gross_profit').replace(/,/g, '').replace(/\.$/, '')
      const branchRaw     = colMap.branch_name !== undefined ? str('branch_name') : ''
      const salespersonRaw = colMap.salesperson !== undefined ? str('salesperson') : ''

      const invoiceDate = formatDateFromExport(dateRaw)
      const revenueNum  = parseFloat(revRaw)
      const gpNum       = parseFloat(gpRaw)

      if (isNaN(revenueNum)) {
        errors.push({ rowNumber: rowNum, rawData: JSON.stringify(row), errorMessage: `Invalid revenue: "${revRaw}"` })
        continue
      }

      if (isNaN(gpNum)) {
        errors.push({ rowNumber: rowNum, rawData: JSON.stringify(row), errorMessage: `Invalid gross_profit: "${gpRaw}"` })
        continue
      }

      const invoiceRow: InvoiceRow = {
        invoice_number:   invNo,
        invoice_date:     invoiceDate,
        customer_code:    `CUST-${invNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
        customer_name:    custName.toUpperCase().trim(),
        product_category: categoryRaw.toUpperCase().trim(),
        item_name:        itemNameRaw.toUpperCase().trim() || undefined,
        quantity:         qtyRaw ? parseFloat(qtyRaw) : undefined,
        unit_price:       unitPriceRaw ? parseFloat(unitPriceRaw) : undefined,
        revenue:          revenueNum,
        gross_profit:     gpNum,
        branch_name:      branchRaw.toUpperCase().trim() || undefined,
        salesperson:      salespersonRaw.toUpperCase().trim() || undefined,
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
