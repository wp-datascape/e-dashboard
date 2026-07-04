/**
 * features/import/import.handler.ts
 *
 * Handler functions for import endpoints.
 */
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import * as XLSX from 'xlsx'
import { success, paginated, error } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { resolveCompanyScope } from '@/middleware/auth'
import { importFile as importFileService, getImportLogs, getImportLogDetail } from './import.service'
import { importFileSchema, importAccurateSchema, importLogQuerySchema } from './import.schema'

export async function handleImportFile(c: Context) {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const companyId = Number(formData.get('company_id'))
    const periodMonth = formData.get('period_month') as string

    if (!file) {
      return error(c, ErrorCode.VALIDATION_ERROR, 'File is required', 400)
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return error(c, ErrorCode.FILE_TOO_LARGE, 'File too large (max 10MB)', 413)
    }

    // Validate MIME type
    const validMimes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    if (!validMimes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Invalid file format. Accepted: .csv, .xlsx', 400)
    }

    // Validate params
    const parsed = importFileSchema.safeParse({ company_id: companyId, period_month: periodMonth })
    if (!parsed.success) {
      return error(c, ErrorCode.VALIDATION_ERROR, parsed.error.errors.map(e => e.message).join(', '), 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    resolveCompanyScope(c, parsed.data.company_id)
    const userId = c.var.user.userId

    const result = await importFileService({
      companyId: parsed.data.company_id,
      periodMonth: parsed.data.period_month,
      userId,
      buffer,
      filename: file.name,
      mimetype: file.type,
      ctx: c,
    })

    return success(c, {
      import_log_id: result.importLogId,
      status: result.status,
      total_invoices: result.totalInvoices,
      success_invoices: result.successInvoices,
      error_rows: result.errorRows,
      error_summary: result.errorSummary,
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.IMPORT_PROCESSING_ERROR, `Import failed: ${err instanceof Error ? err.message : String(err)}`, 422)
  }
}

export async function handleImportFileStream(c: Context) {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const companyId = Number(formData.get('company_id'))
  const periodMonth = formData.get('period_month') as string

  if (!file) return error(c, ErrorCode.VALIDATION_ERROR, 'File is required', 400)
  if (file.size > 10 * 1024 * 1024) return error(c, ErrorCode.FILE_TOO_LARGE, 'File too large (max 10MB)', 413)

  const validMimes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  if (!validMimes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Invalid file format. Accepted: .csv, .xlsx', 400)
  }

  const parsed = importFileSchema.safeParse({ company_id: companyId, period_month: periodMonth })
  if (!parsed.success) {
    return error(c, ErrorCode.VALIDATION_ERROR, parsed.error.errors.map(e => e.message).join(', '), 400)
  }

  resolveCompanyScope(c, parsed.data.company_id)
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const userId = c.var.user.userId

  return streamSSE(c, async (stream) => {
    try {
      const result = await importFileService({
        companyId: parsed.data.company_id,
        periodMonth: parsed.data.period_month,
        userId,
        buffer,
        filename: file.name,
        mimetype: file.type,
        ctx: c,
        onProgress: async ({ processed, total, success: s, errors }) => {
          await stream.writeSSE({
            data: JSON.stringify({ event: 'progress', processed, total, success: s, errors }),
          })
        },
      })

      await stream.writeSSE({
        data: JSON.stringify({
          event: 'done',
          result: {
            import_log_id: result.importLogId,
            status: result.status,
            total_invoices: result.totalInvoices,
            success_invoices: result.successInvoices,
            error_rows: result.errorRows,
            error_summary: result.errorSummary,
          },
        }),
      })
    } catch (err) {
      const code = err instanceof AppError ? err.code : ErrorCode.INTERNAL_ERROR
      const message = err instanceof AppError
        ? err.message
        : `Import failed: ${err instanceof Error ? err.message : String(err)}`
      await stream.writeSSE({ data: JSON.stringify({ event: 'error', error: code, message }) })
    }
  })
}

export async function handleGetImportLogs(c: Context) {
  const query = importLogQuerySchema.parse(c.req.query())

  const scopeIds = resolveCompanyScope(c, query.company_id ?? 'all')
  const { rows, total } = await getImportLogs(query.company_id, query.page, query.per_page, scopeIds)
  return paginated(c, rows, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetImportLogDetail(c: Context) {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return error(c, ErrorCode.VALIDATION_ERROR, 'Invalid ID', 400)
  }

  const result = await getImportLogDetail(id)
  if (!result) {
    return error(c, ErrorCode.NOT_FOUND, 'Import log not found', 404)
  }

  return success(c, { log: result.log, errors: result.errors })
}

export async function handleGetFakturTemplate(_c: Context) {
  // Baris 1: judul
  // Baris 2: keterangan tiap kolom
  // Baris 3: header (label persis seperti yang dipakai Accurate Online & parser)
  // Baris 4-6: contoh data

  const title = [
    'Template Import Faktur Penjualan', '', '', '', '', '', '', '', '', '', '',
  ]

  const descriptions = [
    'Tanggal faktur\n(DD/MM/YYYY atau DD MMM YYYY)',
    'Nomor faktur\n(awali dengan SI. atau INV-)',
    'Nama pelanggan / customer',
    'Nama kategori barang\n(dari Accurate: Kategori Barang & Jasa)',
    'Nama barang / item detail',
    'Jumlah unit terjual',
    'Harga satuan per unit',
    'Total nilai penjualan\n(qty × harga)',
    'Laba kotor\n(Total Harga dikurangi HPP)',
    'Nama cabang\n(opsional)',
    'Nama tenaga penjual / channel\n(opsional, untuk mapping divisi)',
  ]

  const headers = [
    'Tanggal',
    'Sales Invoice',
    'Pelanggan',
    'Nama Kategori Barang Barang & Jasa',
    'Nama Barang',
    'Kuantitas',
    '@Harga',
    'Total Harga',
    'Laba',
    'Nama Cabang',
    'Nama Tenaga Penjual',
  ]

  const examples = [
    ['01/01/2025', 'SI.00001', 'TOKO MAJU JAYA', 'PRINTER', 'CANON PIXMA G2010', 2, 1500000, 3000000, 600000, 'PUSAT', 'DC WEST'],
    ['15/01/2025', 'SI.00002', 'CV BERKAH MAKMUR', 'SCANNER', 'FUJITSU SP-1130N', 1, 4500000, 4500000, 900000, 'SURABAYA', 'B2B EAST'],
    ['20/01/2025', 'SI.00003', 'PT SINAR ABADI', 'CARTRIDGE', 'CANON PG-745', 10, 85000, 850000, 170000, '', 'TOKOPEDIA'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([title, descriptions, headers, ...examples])

  // Lebar kolom
  ws['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 28 },
    { wch: 38 }, { wch: 28 }, { wch: 12 },
    { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 18 }, { wch: 24 },
  ]

  // Tinggi baris deskripsi supaya teks multi-baris terbaca
  ws['!rows'] = [{ hpt: 20 }, { hpt: 42 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Faktur Penjualan')

  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

  return new Response(ab, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_faktur_penjualan.xlsx"',
    },
  })
}