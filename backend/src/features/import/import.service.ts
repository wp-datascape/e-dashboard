/**
 * features/import/import.service.ts
 *
 * Service layer untuk import feature — business logic utama.
 *
 * Flow:
 * 1. Parse file CSV/Excel → InvoiceRow[]
 * 2. Untuk setiap row:
 *    a. Classify item type (4-layer classifier)
 *    b. Upsert customer
 *    c. Upsert product_category
 *    d. Cek duplikat invoice_number
 *    e. Insert invoice + invoice_items
 * 3. Update invoice totals (SUM revenue, gross_profit)
 * 4. Update import_log status
 * 5. Audit log
 */
import { classifyItemType } from '@/utils/classifier'
import { parseCsv, parseExcel } from '@/utils/parser'
import { logAudit } from '@/utils/audit'
import type { Context } from 'hono'
import {
  createImportLog,
  updateImportLog,
  findImportLogs,
  findImportLogById,
  findImportErrors,
  upsertCustomer,
  upsertProductCategory,
  findInvoiceByNumber,
  createInvoice,
  updateInvoiceTotals,
  createInvoiceItem,
  createImportErrors,
} from './import.repository'
import type { NewImportLogError } from '@/db/schema/import_log_errors'

export interface ImportFileOptions {
  companyId: number
  periodMonth: string
  userId: number
  buffer: Buffer
  filename: string
  mimetype: string
}

export interface ImportResult {
  importLogId: number
  status: 'success' | 'partial' | 'failed'
  totalInvoices: number
  successInvoices: number
  errorRows: number
  errorSummary: string
}

export async function importFile(options: ImportFileOptions): Promise<ImportResult> {
  const { companyId, periodMonth, userId, buffer, filename, mimetype } = options

  // ── Parse file ─────────────────────────────────────────────────────────────
  const parseResult = mimetype.includes('csv')
    ? await parseCsv(buffer)
    : await parseExcel(buffer)

  if (parseResult.rows.length === 0 && parseResult.errors.length > 0) {
    // All rows failed
    const importLog = await createImportLog({
      company_id: companyId,
      source: 'file',
      filename,
      period_month: periodMonth,
      status: 'failed',
      total_invoices: 0,
      total_items: 0,
      success_invoices: 0,
      error_rows: parseResult.errors.length,
      imported_by: userId,
    })

    const errors: NewImportLogError[] = parseResult.errors.map((e) => ({
      import_log_id: importLog.id,
      row_number: e.rowNumber,
      raw_data: e.rawData,
      error_message: e.errorMessage,
    }))
    await createImportErrors(errors)

    return {
      importLogId: importLog.id,
      status: 'failed',
      totalInvoices: 0,
      successInvoices: 0,
      errorRows: parseResult.errors.length,
      errorSummary: `${parseResult.errors.length} baris gagal diparse`,
    }
  }

  // ── Create import log (partial status) ─────────────────────────────────────
  const importLog = await createImportLog({
    company_id: companyId,
    source: 'file',
    filename,
    period_month: periodMonth,
    status: 'partial',
    total_invoices: parseResult.rows.length,
    total_items: 0,
    success_invoices: 0,
    error_rows: 0,
    imported_by: userId,
  })

  const errors: NewImportLogError[] = []
  let successCount = 0
  let totalItems = 0
  let totalItemRows = 0

  for (const row of parseResult.rows) {
    const rowNum = parseResult.rows.indexOf(row) + 2

    try {
      // ── Parse date ─────────────────────────────────────────────────────
      const parts = row.invoice_date.split('/')
      const invoiceDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      if (isNaN(invoiceDate.getTime())) {
        throw new Error(`Invalid date format: ${row.invoice_date}`)
      }

      // ── Classify product ───────────────────────────────────────────────
      // For CSV import, we don't have unit_price directly from the old parser format
      // revenue is the total price for the line item
      const classification = await classifyItemType({
        itemName: row.product_category, // fallback: gunakan category name
        categoryName: row.product_category,
        unitPrice: row.revenue, // fallback revenue as price
        companyId,
      })

      // ── Upsert product category ─────────────────────────────────────────
      const category = await upsertProductCategory({
        company_id: companyId,
        name: row.product_category,
        item_type: classification.itemType,
      })

      // ── Customer upsert ─────────────────────────────────────────────────
      const customer = await upsertCustomer({
        company_id: companyId,
        customer_name: row.customer_name,
        invoice_date: invoiceDate,
      })

      // ── Dedup check ─────────────────────────────────────────────────────
      const existingInvoice = await findInvoiceByNumber(companyId, row.invoice_number)
      if (existingInvoice) {
        // Invoice already exists — skip but count as error
        errors.push({
          import_log_id: importLog.id,
          row_number: rowNum,
          raw_data: JSON.stringify(row),
          error_message: `Invoice ${row.invoice_number} already exists`,
        })
        continue
      }

      // ── Create invoice ──────────────────────────────────────────────────
      const invoice = await createInvoice({
        company_id: companyId,
        customer_id: customer.id,
        invoice_number: row.invoice_number.toUpperCase().trim(),
        invoice_date: `${parts[2]}-${parts[1]}-${parts[0]}`,
        total_revenue: '0',
        total_gp: '0',
        import_log_id: importLog.id,
      })

      // ── Create invoice item ─────────────────────────────────────────────
      await createInvoiceItem({
        invoice_id: invoice.id,
        product_category_id: category.id,
        product_name: row.product_category.toUpperCase().trim(),
        quantity: 1,
        unit_price: String(row.revenue),
        revenue: String(row.revenue),
        gross_profit: String(row.gross_profit),
      })
      totalItems++

      // ── Update invoice totals ───────────────────────────────────────────
      await updateInvoiceTotals(invoice.id)

      successCount++
    } catch (err) {
      errors.push({
        import_log_id: importLog.id,
        row_number: rowNum,
        raw_data: JSON.stringify(row),
        error_message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  totalItemRows = parseResult.rows.length

  // ── Save errors ──────────────────────────────────────────────────────────
  await createImportErrors(errors)

  // ── Update import log ────────────────────────────────────────────────────
  const finalStatus = successCount === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'success'
  await updateImportLog(importLog.id, {
    status: finalStatus,
    total_invoices: totalItemRows,
    total_items: totalItems,
    success_invoices: successCount,
    error_rows: errors.length,
  })

  return {
    importLogId: importLog.id,
    status: finalStatus,
    totalInvoices: totalItemRows,
    successInvoices: successCount,
    errorRows: errors.length,
    errorSummary: errors.length > 0
      ? `${errors.length} baris gagal: ${errors[0].error_message}`
      : '',
  }
}

export async function getImportLogs(companyId?: number, page = 1, perPage = 20) {
  return findImportLogs(companyId, page, perPage)
}

export async function getImportLogDetail(id: number) {
  const log = await findImportLogById(id)
  if (!log) return null
  const errors = await findImportErrors(id)
  return { log, errors }
}