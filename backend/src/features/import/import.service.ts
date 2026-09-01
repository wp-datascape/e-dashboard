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
import { classifyItemType, loadClassificationRules } from '@/utils/classifier'
import { parseCsv, parseExcel } from '@/utils/parser'
import type { InvoiceRow, ParseRowError } from '@/utils/parser'
import { logAudit } from '@/utils/audit'
import { AppError, ErrorCode } from '@/utils/error'
import type { Context } from 'hono'
import {
  createImportLog,
  updateImportLog,
  findImportLogs,
  findImportLogById,
  findImportErrors,
  upsertCustomer,
  upsertProductCategory,
  upsertProduct,
  findInvoiceByNumber,
  findInvoicesByNumbers,
  createInvoice,
  updateInvoice,
  deleteInvoiceItemsByInvoiceId,
  updateInvoiceTotals,
  createInvoiceItem,
  createImportErrors,
  findBranchIdByName,
} from './import.repository'
import type { NewImportLogError } from '@/db/schema'
import type { ImportCommitInvoiceDto } from './import.schema'

export interface ImportProgress {
  processed: number
  total: number
  success: number
  errors: number
}

export interface ImportFileOptions {
  companyId: number
  periodMonth: string
  userId: number
  buffer: Buffer
  filename: string
  mimetype: string
  ctx: Context
  onProgress?: (p: ImportProgress) => Promise<void>
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
  const { companyId, periodMonth, userId, buffer, filename, mimetype, ctx, onProgress } = options

  // ── Parse file ─────────────────────────────────────────────────────────────
  const parseResult = mimetype.includes('csv')
    ? await parseCsv(buffer)
    : await parseExcel(buffer)

  if (parseResult.rows.length === 0 && parseResult.errors.length === 0) {
    throw new AppError(
      ErrorCode.INVALID_FILE_FORMAT,
      'Tidak ada baris data yang ditemukan di file. Pastikan format file sesuai dengan export Accurate Online.',
      422,
    )
  }

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

    await logAudit(ctx, {
      action: 'import.file',
      entity: 'import_logs',
      entityId: importLog.id,
      companyId,
      newValue: { status: 'failed', total_invoices: 0, success_invoices: 0, error_rows: parseResult.errors.length },
      meta: { filename, period_month: periodMonth, source: 'file' },
    })

    return {
      importLogId: importLog.id,
      status: 'failed',
      totalInvoices: 0,
      successInvoices: 0,
      errorRows: parseResult.errors.length,
      errorSummary: `${parseResult.errors.length} baris gagal diparse`,
    }
  }

  return processImportRows({
    companyId,
    periodMonth,
    userId,
    filename,
    source: 'file',
    rows: parseResult.rows,
    parseErrors: parseResult.errors,
    ctx,
    onProgress,
  })
}

// ─── Shared row-processing loop ──────────────────────────────────────────────
// Dipakai import langsung (importFile, rows dari parser) MAUPUN commit setelah
// review (commitImportFile, rows hasil flatten dari pilihan per invoice user —
// task037/EDASHBOARD-588) — logic upsert customer/kategori/produk, resolve
// invoice, tulis item HARUS identik di kedua alur, jadi dipusatkan di sini
// (bukan copy-paste, lihat docs-v2/task/task037.md).

interface ProcessImportRowsOptions {
  companyId: number
  periodMonth: string
  userId: number
  filename: string
  source: string
  rows: InvoiceRow[]
  parseErrors: ParseRowError[]
  ctx: Context
  auditMeta?: Record<string, unknown>
  onProgress?: (p: ImportProgress) => Promise<void>
}

async function processImportRows(options: ProcessImportRowsOptions): Promise<ImportResult> {
  const { companyId, periodMonth, userId, filename, source, rows, parseErrors, ctx, auditMeta, onProgress } = options

  // ── Create import log — status awal 'failed', diupdate ke final di akhir ────
  // Pesimistik: jika proses terputus (browser refresh, crash), log tetap 'failed'
  // bukan 'partial' yang menyesatkan.
  const importLog = await createImportLog({
    company_id: companyId,
    source,
    filename,
    period_month: periodMonth,
    status: 'failed',
    total_invoices: rows.length,
    total_items: 0,
    success_invoices: 0,
    error_rows: 0,
    imported_by: userId,
  })

  const errors: NewImportLogError[] = parseErrors.map((e) => ({
    import_log_id: importLog.id,
    row_number: e.rowNumber,
    raw_data: e.rawData,
    error_message: e.errorMessage,
  }))
  let successCount = 0
  let totalItems = 0

  // Rule klasifikasi SEKALI per batch (bukan per baris) — lihat docstring
  // loadClassificationRules (classifier.ts, audit N+1 2026-08-21): rule-nya
  // identik untuk semua baris company yang sama, sebelumnya di-query ULANG di
  // SETIAP baris (bisa puluhan ribu query redundan per file).
  const classificationRules = await loadClassificationRules(companyId)

  // invoice_number → invoice_id: reuse dalam satu batch (multi-item per SI)
  const batchInvoiceCache = new Map<string, number>()
  // Set invoice_id yang sudah di-reset items-nya saat re-import
  const resetItemsCache = new Set<number>()
  // branch_name → branch_id: reuse dalam satu batch (banyak baris berbagi branch_name sama)
  const batchBranchIdCache = new Map<string, number | null>()
  // product_category name (UPPER+trim) → {id, item_type} — reuse dalam satu batch
  // (audit N+1 2026-08-21: banyak baris berbagi nama kategori sama). item_type
  // ikut disimpan supaya kalau baris LAIN dgn nama sama tapi hasil klasifikasi
  // BEDA (mis. rule price_range, harga beda -> item_type beda), cache di-miss
  // dgn sengaja dan upsertProductCategory dipanggil lagi (sync item_type tetap
  // benar, TIDAK mengorbankan correctness demi performa) — key SUDAH upper+trim
  // sama persis dgn logika matching upsertProductCategory sendiri.
  const batchCategoryCache = new Map<string, { id: number; item_type: string }>()
  // product name (UPPER+trim) → {id, product_category_id} — pola sama seperti
  // kategori di atas, alasan sama (audit N+1 2026-08-21).
  const batchProductCache = new Map<string, { id: number; product_category_id: number | null }>()
  // invoice_id yang tersentuh batch ini — updateInvoiceTotals dipanggil SEKALI
  // per invoice di akhir (bukan per baris item, lihat bawah) — hasilnya IDENTIK
  // (SUM selalu dihitung ulang dari invoice_items yang ADA di DB, tidak peduli
  // kapan/berapa kali dipanggil), cuma buang N-1 pemanggilan redundan per
  // invoice ber-multi-item (audit N+1 2026-08-21).
  const touchedInvoiceIds = new Set<number>()

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]!
    const rowNum = idx + 2

    try {
      // ── Parse date ─────────────────────────────────────────────────────
      const parts = row.invoice_date.split('/')
      const invoiceDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      if (isNaN(invoiceDate.getTime())) {
        throw new Error(`Invalid date format: ${row.invoice_date}`)
      }

      // ── Classify product ───────────────────────────────────────────────
      // unitPrice WAJIB row.unit_price (harga per unit, kolom "@Harga"), BUKAN
      // row.revenue (Total Harga = harga × kuantitas) - rule price_range di
      // Classification Rules dimaksudkan mengecek harga SATUAN. Pakai revenue
      // salah kaprah: barang murah yang dijual banyak (qty besar) bisa ke-total
      // tinggi dan salah kena rule "harga tinggi" walau per-unit-nya murah
      // (root cause laporan user 2026-07-29: kategori consumable murah salah
      // ke-klasifikasi 'sparepart'/'unit'). Fallback ke revenue kalau unit_price
      // tidak ada di file (kolom opsional) - sama seperti fallback yang sudah
      // dipakai buat invoice_items.unit_price di bawah.
      const classification = classifyItemType({
        itemName: row.product_category,
        categoryName: row.product_category,
        unitPrice: row.unit_price ?? row.revenue,
        rules: classificationRules,
      })

      // ── Upsert product category (cache per batch, lihat komentar di atas) ─
      const categoryKey = row.product_category.trim().toUpperCase()
      const cachedCategory = batchCategoryCache.get(categoryKey)
      const category = cachedCategory && cachedCategory.item_type === classification.itemType
        ? { id: cachedCategory.id }
        : await upsertProductCategory({
            company_id: companyId,
            name: row.product_category,
            item_type: classification.itemType,
          })
      batchCategoryCache.set(categoryKey, { id: category.id, item_type: classification.itemType })

      // ── Upsert product (cache per batch, lihat komentar di atas) ─────────
      const productKey = (row.item_name ?? row.product_category).trim().toUpperCase()
      const cachedProduct = batchProductCache.get(productKey)
      const product = cachedProduct && cachedProduct.product_category_id === category.id
        ? { id: cachedProduct.id }
        : await upsertProduct({
            company_id: companyId,
            product_name: (row.item_name ?? row.product_category).trim(),
            product_category_id: category.id,
          })
      batchProductCache.set(productKey, { id: product.id, product_category_id: category.id })

      // ── Resolve invoice: reuse dari batch ini, atau insert/update ───────
      const invoiceKey = row.invoice_number.toUpperCase().trim()
      let invoiceId = batchInvoiceCache.get(invoiceKey)

      if (!invoiceId) {
        // ── Customer upsert ───────────────────────────────────────────────
        const customer = await upsertCustomer({
          company_id: companyId,
          customer_name: row.customer_name,
          invoice_date: invoiceDate,
          channel_name: row.channel_name,
        })

        // ── Resolve branch_id dari branch_name (§4.6) — cache per batch ────
        const branchCacheKey = row.branch_name ?? ''
        let branchId = batchBranchIdCache.get(branchCacheKey)
        if (branchId === undefined) {
          branchId = await findBranchIdByName(companyId, row.branch_name ?? null)
          batchBranchIdCache.set(branchCacheKey, branchId)
        }

        const existingInvoice = await findInvoiceByNumber(companyId, row.invoice_number)

        if (existingInvoice) {
          // Re-import: update header invoice, hapus items lama
          await updateInvoice(existingInvoice.id, {
            customer_id: customer.id,
            invoice_date: `${parts[2]}-${parts[1]}-${parts[0]}`,
            channel_name: row.channel_name ?? null,
            branch_name: row.branch_name ?? null,
            branch_id: branchId,
            import_log_id: importLog.id,
          })
          invoiceId = existingInvoice.id
        } else {
          // Invoice baru
          const invoice = await createInvoice({
            company_id: companyId,
            customer_id: customer.id,
            invoice_number: invoiceKey,
            invoice_date: `${parts[2]}-${parts[1]}-${parts[0]}`,
            total_revenue: '0',
            total_gp: '0',
            channel_name: row.channel_name ?? null,
            branch_name: row.branch_name ?? null,
            branch_id: branchId,
            import_log_id: importLog.id,
          })
          invoiceId = invoice.id
        }

        batchInvoiceCache.set(invoiceKey, invoiceId)
      }

      // Hapus items lama sekali saja saat pertama kali SI ini muncul di batch
      if (!resetItemsCache.has(invoiceId)) {
        await deleteInvoiceItemsByInvoiceId(invoiceId)
        resetItemsCache.add(invoiceId)
      }

      // ── Create invoice item ─────────────────────────────────────────────
      await createInvoiceItem({
        invoice_id: invoiceId,
        product_id: product.id,
        product_category_id: category.id,
        quantity: row.quantity ?? 1,
        unit_price: String(row.unit_price ?? row.revenue),
        revenue: String(row.revenue),
        gross_profit: String(row.gross_profit),
      })
      totalItems++
      touchedInvoiceIds.add(invoiceId)

      successCount++
    } catch (err) {
      errors.push({
        import_log_id: importLog.id,
        row_number: rowNum,
        raw_data: JSON.stringify(row),
        error_message: err instanceof Error ? err.message : String(err),
      })
    }

    if (onProgress) {
      await onProgress({
        processed: idx + 1,
        total: rows.length,
        success: successCount,
        errors: errors.length,
      })
    }
  }

  // ── Update invoice totals — SEKALI per invoice (lihat komentar touchedInvoiceIds
  // di atas), bukan per baris item. SUM dihitung dari invoice_items yang BENERAN
  // ke-insert (baris gagal otomatis tidak ikut kehitung), hasilnya tetap akurat.
  for (const invoiceId of touchedInvoiceIds) {
    await updateInvoiceTotals(invoiceId)
  }

  // ── Save errors ──────────────────────────────────────────────────────────
  await createImportErrors(errors)

  // ── Update import log ────────────────────────────────────────────────────
  const finalStatus = successCount === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'success'
  await updateImportLog(importLog.id, {
    status: finalStatus,
    total_invoices: rows.length,
    total_items: totalItems,
    success_invoices: successCount,
    error_rows: errors.length,
  })

  await logAudit(ctx, {
    action: 'import.file',
    entity: 'import_logs',
    entityId: importLog.id,
    companyId,
    newValue: {
      status: finalStatus,
      total_invoices: rows.length,
      success_invoices: successCount,
      error_rows: errors.length,
    },
    meta: { filename, period_month: periodMonth, source, ...auditMeta },
  })

  return {
    importLogId: importLog.id,
    status: finalStatus,
    totalInvoices: rows.length,
    successInvoices: successCount,
    errorRows: errors.length,
    errorSummary: errors.length > 0
      ? `${errors.length} baris gagal: ${errors[0].error_message}`
      : '',
  }
}

// ─── Review Import Faktur (task037/EDASHBOARD-588) ───────────────────────────
// Preview: parse file + deteksi konflik terhadap invoice yang SUDAH ADA,
// TANPA tulis DB sama sekali. Commit: terima baris hasil preview yang sudah
// direview user (pilihan Timpa/Lewati per baris konflik) dan benar-benar
// tulis DB, reuse processImportRows yang SAMA dgn importFile() biasa — lihat
// docs-v2/task/task037.md.

export interface PreviewInvoiceItem {
  product_category: string
  item_name?: string
  quantity?: number
  unit_price?: number
  revenue: number
  gross_profit: number
}

export interface PreviewInvoiceRow {
  invoice_number: string
  invoice_date: string
  customer_code: string
  customer_name: string
  branch_name?: string
  channel_name?: string
  item_count: number
  total_revenue: number
  total_gp: number
  status: 'new' | 'conflict' | 'error'
  error_message?: string
  // Terisi kalau status='conflict' — data invoice AKTIF yang bentrok, dipakai
  // frontend menampilkan "data lama vs data baru" berdampingan.
  conflict?: {
    total_revenue: number
    updated_at: string
  }
  items: PreviewInvoiceItem[]
}

export interface PreviewImportResult {
  invoices: PreviewInvoiceRow[]
  summary: { new: number; conflict: number; error: number }
  raw_row_count: number
}

export async function previewImportFile(options: {
  companyId: number
  buffer: Buffer
  mimetype: string
}): Promise<PreviewImportResult> {
  const { companyId, buffer, mimetype } = options

  const parseResult = mimetype.includes('csv') ? await parseCsv(buffer) : await parseExcel(buffer)

  // Group per INVOICE (invoice_number), BUKAN per baris file mentah — 1
  // invoice bisa punya banyak baris item, tabel review harus 1 baris = 1
  // invoice (docs-v2/task/task037.md §"Grouping").
  const grouped = new Map<string, InvoiceRow[]>()
  for (const row of parseResult.rows) {
    const key = row.invoice_number.trim().toUpperCase()
    const bucket = grouped.get(key)
    if (bucket) bucket.push(row)
    else grouped.set(key, [row])
  }

  // 1 query batch utk SEMUA invoice_number sekaligus — aman utk ribuan
  // invoice sekali jalan (bukan query per baris).
  const existingInvoices = await findInvoicesByNumbers(companyId, [...grouped.keys()])
  const existingMap = new Map(existingInvoices.map((inv) => [inv.invoiceNumber, inv]))

  const invoiceRows: PreviewInvoiceRow[] = []
  let newCount = 0
  let conflictCount = 0
  let errorCount = 0

  for (const [key, itemRows] of grouped) {
    const first = itemRows[0]!
    let totalRevenue = 0
    let totalGp = 0
    const items: PreviewInvoiceItem[] = []
    for (const r of itemRows) {
      totalRevenue += r.revenue
      totalGp += r.gross_profit
      items.push({
        product_category: r.product_category,
        item_name: r.item_name,
        quantity: r.quantity,
        unit_price: r.unit_price,
        revenue: r.revenue,
        gross_profit: r.gross_profit,
      })
    }

    const existing = existingMap.get(key)
    const row: PreviewInvoiceRow = {
      invoice_number: key,
      invoice_date: first.invoice_date,
      customer_code: first.customer_code,
      customer_name: first.customer_name,
      branch_name: first.branch_name,
      channel_name: first.channel_name,
      item_count: items.length,
      total_revenue: totalRevenue,
      total_gp: totalGp,
      status: existing ? 'conflict' : 'new',
      items,
    }

    if (existing) {
      conflictCount++
      row.conflict = {
        total_revenue: Number(existing.totalRevenue),
        updated_at: existing.updatedAt.toISOString(),
      }
    } else {
      newCount++
    }
    invoiceRows.push(row)
  }

  // Baris gagal parse (mis. invoice_number kosong) — tidak bisa digroup per
  // invoice, ditampilkan apa adanya per baris file mentah.
  for (const e of parseResult.errors) {
    errorCount++
    invoiceRows.push({
      invoice_number: `(baris ${e.rowNumber})`,
      invoice_date: '',
      customer_code: '',
      customer_name: '',
      item_count: 0,
      total_revenue: 0,
      total_gp: 0,
      status: 'error',
      error_message: e.errorMessage,
      items: [],
    })
  }

  return {
    invoices: invoiceRows,
    summary: { new: newCount, conflict: conflictCount, error: errorCount },
    raw_row_count: parseResult.rows.length + parseResult.errors.length,
  }
}

export interface CommitImportFileOptions {
  companyId: number
  periodMonth: string
  userId: number
  filename: string
  invoices: ImportCommitInvoiceDto[]
  ctx: Context
  onProgress?: (p: ImportProgress) => Promise<void>
}

export interface CommitImportResult extends ImportResult {
  skippedInvoices: number
}

export async function commitImportFile(options: CommitImportFileOptions): Promise<CommitImportResult> {
  const { companyId, periodMonth, userId, filename, invoices, ctx, onProgress } = options

  // Baris dgn action 'skip' (user pilih "Lewati" utk invoice konflik) TIDAK
  // disentuh sama sekali — flatten balik ke InvoiceRow[] item-level, reuse
  // processImportRows yang SAMA persis dgn importFile() biasa (task037.md).
  const rows: InvoiceRow[] = []
  let skippedInvoices = 0
  for (const inv of invoices) {
    if (inv.action === 'skip') { skippedInvoices++; continue }
    for (const item of inv.items) {
      rows.push({
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        customer_code: inv.customer_code,
        customer_name: inv.customer_name,
        product_category: item.product_category,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        revenue: item.revenue,
        gross_profit: item.gross_profit,
        branch_name: inv.branch_name,
        channel_name: inv.channel_name,
      })
    }
  }

  if (rows.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Tidak ada invoice yang akan disimpan (semua baris dilewati)', 400)
  }

  const result = await processImportRows({
    companyId,
    periodMonth,
    userId,
    filename,
    source: 'file',
    rows,
    parseErrors: [],
    ctx,
    auditMeta: { reviewed: true, skipped_invoices: skippedInvoices },
    onProgress,
  })

  return { ...result, skippedInvoices }
}

export async function getImportLogs(companyId?: number, page = 1, perPage = 20, scopeIds?: number[]) {
  return findImportLogs(companyId, page, perPage, scopeIds)
}

export async function getImportLogDetail(id: number) {
  const log = await findImportLogById(id)
  if (!log) return null
  const errors = await findImportErrors(id)
  return { log, errors }
}