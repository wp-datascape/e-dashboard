import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { buildExcelBuffer, excelResponseHeaders } from '@/utils/excel'
import type { ExcelColumn } from '@/utils/excel'
import { findCompanyById } from '@/features/companies/companies.repository'
import { customersQuerySchema, customersExportQuerySchema, customerIdParamSchema, customerDetailQuerySchema } from './customers.schema'
import { getCustomers, getCustomersExport, getCustomerDetail } from './customers.service'

export async function handleGetCustomers(c: Context) {
  const query = validateQuery(c, customersQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const result = await getCustomers(query, scopeIds, branchScope, divisionScope)
  return paginated(c, result.data, {
    page: query.page,
    per_page: query.per_page,
    total: result.total,
  })
}

// Export Excel (2026-08-31, instruksi user: "tambahkan fungsi export excel
// juga di ke 2 menu" — susulan export Transactions) — filter SAMA PERSIS
// handleGetCustomers, satu query tanpa pagination lewat getCustomersExport.
// Kolom Excel SAMA PERSIS kolom tabel di layar (Customers/index.tsx), bukan
// set kolom baru yang bisa menyimpang.
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif', existing: 'Existing', dormant: 'Dorman', new: 'Baru',
}

export async function handleExportCustomers(c: Context) {
  const query = validateQuery(c, customersExportQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (query.branch_id) assertBranchFilterAccess(branchScope, query.branch_id)
  const { data, total, truncated } = await getCustomersExport(query, scopeIds, branchScope, divisionScope)

  const entitasLabel = query.company_id === 'all'
    ? 'Semua Entitas'
    : (await findCompanyById(query.company_id))?.name ?? `Company #${query.company_id}`

  const meta: [string, string][] = [
    ['Entitas', entitasLabel],
    ['Per Tanggal', query.as_of_date ?? 'Hari ini'],
    ['Jumlah Baris', data.length.toLocaleString('id-ID') + (truncated ? ` (dibatasi dari ${total.toLocaleString('id-ID')} total)` : '')],
  ]

  // `fields` KOSONG/tidak dikirim = export SEMUA kolom (default, sama spt
  // Transactions) — pola sama persis handleExportInvoices.
  const selectedFields: readonly string[] | undefined = query.fields
  const isSelected = (key: string) => !selectedFields?.length || selectedFields.includes(key)

  const allColumns: ExcelColumn[] = [
    { header: 'Kode Customer', key: 'customer_code', width: 16 },
    { header: 'Nama Customer', key: 'name', width: 28 },
    { header: 'Company', key: 'company_name', width: 20 },
    { header: 'Divisi', key: 'division_label', width: 16 },
    { header: 'Status', key: 'status_label', width: 12 },
    { header: 'Kategori', key: 'category_count', width: 10 },
    { header: 'Rata-rata Revenue Bulanan', key: 'avg_monthly_revenue', width: 20 },
    { header: 'Revenue 12 Bulan Terakhir', key: 'lifetime_value', width: 20 },
    { header: 'Transaksi Terakhir', key: 'last_invoice_date', width: 16 },
    { header: 'Total Faktur', key: 'total_invoices', width: 12 },
  ]
  const columns = allColumns.filter((c) => isSelected(c.key))

  const rows = data.map((row) => ({ ...row, status_label: STATUS_LABEL[row.status] ?? row.status }))

  const buffer = await buildExcelBuffer({
    title: 'Data Customer',
    printedFrom: c.req.url,
    meta,
    columns,
    rows,
  })

  const filename = `customer-${query.as_of_date ?? 'hari-ini'}.xlsx`
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  return new Response(ab, { headers: excelResponseHeaders(filename) })
}

export async function handleGetCustomerDetail(c: Context) {
  const { id } = validateParam(c, customerIdParamSchema)
  const query = validateQuery(c, customerDetailQuerySchema)
  const scopeIds = resolveCompanyScope(c, 'all')
  const branchScope = resolveBranchScope(c, scopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  const detail = await getCustomerDetail(id, query.as_of_date, scopeIds, branchScope, divisionScope)
  return success(c, detail)
}