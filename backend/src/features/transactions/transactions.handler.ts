import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { buildExcelBuffer, excelResponseHeaders, formatDateID } from '@/utils/excel'
import type { ExcelColumn } from '@/utils/excel'
import { findCompanyById } from '@/features/companies/companies.repository'
import { invoicesQuerySchema, invoicesSummaryQuerySchema, invoicesExportQuerySchema, invoiceIdParamSchema } from './transactions.schema'
import { getInvoices, getInvoicesSummary, getInvoicesExport, getInvoiceDetail } from './transactions.service'

export async function handleGetInvoices(c: Context) {
  const query = validateQuery(c, invoicesQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getInvoices(query, scopeIds, branchScope, divisionScope)
  return paginated(c, result.data, { page: query.page, per_page: query.per_page, total: result.total })
}

export async function handleGetInvoicesSummary(c: Context) {
  const query = validateQuery(c, invoicesSummaryQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getInvoicesSummary(query, scopeIds, branchScope, divisionScope)
  return success(c, result)
}

// Export Excel (2026-08-30) — filter query param SAMA PERSIS
// handleGetInvoicesSummary (`invoicesSummaryQuerySchema`, sudah punya
// company_id/branch_id/business_unit/exclude_intercompany/customer_search/
// date_from/date_to) + `fields` opsional (pilih kolom, instruksi user
// "export ditambahkan filter field mana saja yg ingin di export"), SATU
// query lewat `getInvoicesExport` (reuse `buildInvoiceWhereClause` di
// repository — TIDAK ada logic filter kedua yang bisa menyimpang dari
// list/summary di atas).
export async function handleExportInvoices(c: Context) {
  const query = validateQuery(c, invoicesExportQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getInvoicesExport(query, scopeIds, branchScope, divisionScope)

  // Nama company ASLI, bukan "Company #2" (laporan user: "user tidak tau
  // company 2 itu apa") — company_id di sini SUDAH lolos resolveCompanyScope/
  // assertBranchFilterAccess di atas, jadi lookup nama di sini aman (user
  // pasti sudah berhak lihat company itu, bukan celah scope baru).
  const entitasLabel = query.company_id === 'all'
    ? 'Semua Entitas'
    : (await findCompanyById(query.company_id))?.name ?? `Company #${query.company_id}`

  const meta: [string, string][] = [
    ['Entitas', entitasLabel],
    // formatDateID (2026-08-30, laporan user: "format date ini bukan format
    // indonesia") — date_from/date_to dulu ISO mentah (YYYY-MM-DD), sekarang
    // DD-MM-YYYY sama gaya "Waktu cetak".
    ['Periode', `${query.date_from ? formatDateID(query.date_from) : '—'} s/d ${query.date_to ? formatDateID(query.date_to) : '—'}`],
    ['Jumlah Baris', result.data.length.toLocaleString('id-ID') + (result.truncated ? ` (dibatasi dari ${result.total.toLocaleString('id-ID')} total)` : '')],
  ]

  // `fields` KOSONG/tidak dikirim = export SEMUA kolom (default, sama spt
  // perilaku sebelum fitur pilih-field ada). Kalau diisi, cuma kolom yg
  // key-nya ADA di daftar itu yang di-include — urutan TETAP urutan
  // definisi di bawah (bukan urutan client kirim di `fields`).
  const selectedFields: readonly string[] | undefined = query.fields
  const isSelected = (key: string) => !selectedFields?.length || selectedFields.includes(key)

  // Dependency rumus GP Margin (2026-08-30, keputusan user: opsi B —
  // "kolom rumus otomatis jadi angka statis kalau dependency-nya tidak
  // lengkap dipilih", BUKAN auto-include Revenue/GP yg tidak diminta,
  // BUKAN juga tolak dgn error — biar UI (dialog pilih field) yang cegah
  // situasi ini duluan via checkbox disabled, backend cuma fallback aman
  // kalau somehow lolos, defense in depth).
  const hasGpMarginDeps = isSelected('total_gp') && isSelected('total_revenue')

  const allColumns: ExcelColumn[] = [
    { header: 'No. Invoice', key: 'invoice_number', width: 18 },
    { header: 'Tanggal', key: 'invoice_date', width: 12 },
    { header: 'Company', key: 'company_name', width: 22 },
    { header: 'Customer', key: 'customer_name', width: 25 },
    { header: 'Kode Customer', key: 'customer_code', width: 14 },
    { header: 'Divisi', key: 'business_unit', width: 16 },
    { header: 'Revenue', key: 'total_revenue', width: 16 },
    { header: 'Gross Profit', key: 'total_gp', width: 16 },
    // Rumus Excel LIVE (2026-08-30, laporan user: "harusnya rumus, bukan
    // teks hasil hitung server") — GP Margin = GP ÷ Revenue, kalkulasi
    // ulang otomatis di Excel kalau user edit angka Revenue/GP-nya.
    // IFERROR(...,0) — pola sama fallback server, cegah #DIV/0! kalau
    // Revenue-nya 0.
    //
    // TANPA "*100" (koreksi user, 2026-08-30: "agar saat excel format
    // sbg percentase tidak salah hasil perhitungannya") — numFmt '0.0%'
    // di bawah yang urus tampilan "%", Excel SENDIRI kalikan 100 pas
    // render. Kalau rumus/data-nya JUGA dikali 100 di sini, hasilnya
    // dobel kali 100 ("560%" bukan "5.6%") — `gp_margin_ratio` (bukan
    // lagi `gp_margin_percent`) dari repository juga sudah rasio 0-1
    // murni, BUKAN 0-100, konsisten dgn ini.
    //
    // `formula` cuma dipasang KALAU total_gp+total_revenue SAMA-SAMA
    // ikut ter-export (lihat hasGpMarginDeps) — kalau tidak, kolom ini
    // tetap tampil (angka statis dari `row.gp_margin_ratio`, numFmt tetap
    // jalan) TAPI tanpa rumus (rumus yg merujuk kolom yg tidak ada di
    // sheet = rusak).
    {
      header: 'GP Margin (%)', key: 'gp_margin_ratio', width: 12, numFmt: '0.0%',
      ...(hasGpMarginDeps ? { formula: (ref) => `IFERROR(${ref('total_gp')}/${ref('total_revenue')},0)` } : {}),
    },
    { header: 'Jumlah Kategori', key: 'category_count', width: 14 },
    { header: 'Sumber Import', key: 'import_source', width: 14 },
  ]
  const columns = allColumns.filter((c) => isSelected(c.key))

  const buffer = await buildExcelBuffer({
    title: 'Data Transaksi',
    printedFrom: c.req.url,
    meta,
    columns,
    rows: result.data,
  })

  const filename = `transaksi-${query.date_from ?? 'semua'}-${query.date_to ?? 'periode'}.xlsx`
  // Response BodyInit tidak terima Buffer langsung (beda dari Bun.write dkk)
  // — konversi ke ArrayBuffer, pola sama persis import.handler.ts (endpoint
  // download template faktur, satu-satunya presedan file-download di app
  // ini sebelum endpoint export ini).
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  return new Response(ab, { headers: excelResponseHeaders(filename) })
}

export async function handleGetInvoiceDetail(c: Context) {
  const { id } = validateParam(c, invoiceIdParamSchema)
  const scopeIds = resolveCompanyScope(c, 'all')
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  const detail = await getInvoiceDetail(id, scopeIds, branchScope, divisionScope)
  return success(c, detail)
}
