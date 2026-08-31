import { db } from '@/config/db'
import { invoices, invoice_items, customers, companies, channel_divisions, import_logs, divisions } from '@/db/schema'
import { and, eq, inArray, isNull, sql, desc, asc, ilike, or, gte, lte } from 'drizzle-orm'
import {
  buildBranchCondition,
  buildDivisionCondition,
  buildExcludeIntercompanyCondition,
  loadDivisionFallbackIds,
  flattenFallbackByBranch,
} from '@/utils/scope'
import { EXPORT_ROW_CAP } from '@/utils/excel'
import type { InvoicesQuery, InvoicesSummaryQuery } from './transactions.schema'

// Filter dasar (company/branch/division/exclude-intercompany/search/tanggal) —
// DIPAKAI BERSAMA findInvoices (list) dan findInvoicesSummary (kartu ringkasan
// Revenue/Laba Kotor/Margin, 2026-08-29), supaya kartu ringkasan SELALU sinkron
// dengan filter yang lagi aktif di tabel, tidak ada jalur filter kedua yang bisa
// divergen dari yang pertama.
type InvoiceFilterParams = Pick<
  InvoicesQuery,
  'company_id' | 'branch_id' | 'business_unit' | 'exclude_intercompany' | 'customer_search' | 'date_from' | 'date_to'
>

async function buildInvoiceWhereClause(
  params: InvoiceFilterParams,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { company_id, branch_id, business_unit, exclude_intercompany, customer_search, date_from, date_to } = params

  const conditions = [isNull(invoices.deleted_at), eq(customers.is_placeholder, false)]
  if (company_id !== 'all') conditions.push(eq(invoices.company_id, company_id))
  else if (scopeIds) {
    if (scopeIds.length === 0) return { where: undefined, isEmptyScope: true as const }
    conditions.push(inArray(invoices.company_id, scopeIds))
  }
  if (customer_search) {
    conditions.push(
      or(
        ilike(customers.customer_name, `%${customer_search}%`),
        ilike(customers.customer_code, `%${customer_search}%`),
      )!,
    )
  }
  if (date_from) conditions.push(gte(invoices.invoice_date, date_from))
  if (date_to) conditions.push(lte(invoices.invoice_date, date_to))

  const whereClause = and(...conditions)

  // Fallback division_id 'other'/'intercompany' per company (task012 v2 — COALESCE
  // dulu literal string tunggal, sekarang beda id per company, lihat utils/scope.ts)
  const [otherIdByCompany, intercompanyIdByCompany] = await Promise.all([
    loadDivisionFallbackIds('other'),
    loadDivisionFallbackIds('intercompany'),
  ])
  const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany)

  // Division filter (business_unit param, sekarang numeric division_id — task012 v2)
  // COALESCE ke division_id "other" milik company invoice ini — tanpa ini, invoice
  // yang channel_name-nya tidak match rule apa pun (division_id NULL) tidak akan
  // pernah muncul waktu filter divisi "Lainnya" dipilih, padahal seharusnya masuk
  // situ (data-model.md §Channel Division Filter, bug ditemukan lewat audit KNT).
  const divisionCond = business_unit
    ? eq(sql`COALESCE(${channel_divisions.division_id}, (SELECT id FROM divisions WHERE company_id = ${invoices.company_id} AND key = 'other'))`, business_unit)
    : undefined
  const branchFilterCond = branch_id ? eq(invoices.branch_id, branch_id) : undefined
  const branchScopeCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
  // COALESCE override customer (task013, representasi sister company) menang atas
  // mapping channel biasa - lihat docs-v2/task/task013.md
  const excludeIntercompanyCond = buildExcludeIntercompanyCondition(
    invoices.company_id,
    sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`,
    intercompanyIdByCompany,
    exclude_intercompany,
  )
  const scopeConditions = [divisionCond, branchFilterCond, branchScopeCond, divisionScopeCond, excludeIntercompanyCond].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const whereWithDivision = scopeConditions.length ? and(whereClause, ...scopeConditions) : whereClause
  return { where: whereWithDivision, isEmptyScope: false as const }
}

export async function findInvoices(
  params: InvoicesQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { sort_by, sort_dir, page, per_page } = params
  const offset = (page - 1) * per_page

  const { where: whereWithDivision, isEmptyScope } = await buildInvoiceWhereClause(params, scopeIds, branchScope, divisionScope)
  if (isEmptyScope) return { data: [], total: 0 }

  const isAsc = sort_dir === 'asc'
  // catCountExpr didefinisikan SEBELUM orderByExpr (2026-08-31) - dipakai
  // juga di sana sekarang utk sort_by='category_count'.
  const catCountExpr = sql<number>`COUNT(DISTINCT ${invoice_items.product_category_id})`
  // marginExpr — bukan kolom asli, dihitung di sini KHUSUS utk ORDER BY (nilai
  // gp_margin_percent sesungguhnya dihitung di JS dari total_gp/total_revenue
  // saat map row di bawah, sengaja TIDAK diduplikasi di SELECT list, cuma
  // dipakai urutan relatifnya di sini).
  const marginExpr = sql`${invoices.total_gp}::numeric / NULLIF(${invoices.total_revenue}, 0)`
  // Semua kolom GROUP BY invoices.id/customers.id/companies.id (functional
  // dependency Postgres via primary key) - referensi kolom LAIN dari tabel yg
  // SAMA (invoices.invoice_number, companies.name, customers.customer_name)
  // valid tanpa perlu masuk aggregate/GROUP BY sendiri. divisions.label dan
  // import_logs.source SUDAH persis di GROUP BY list (bukan lewat FK id-nya).
  const orderByExpr = (() => {
    switch (sort_by) {
      case 'total_revenue':      return isAsc ? asc(invoices.total_revenue)      : desc(invoices.total_revenue)
      case 'total_gp':           return isAsc ? asc(invoices.total_gp)           : desc(invoices.total_gp)
      case 'invoice_number':     return isAsc ? asc(invoices.invoice_number)     : desc(invoices.invoice_number)
      case 'company':            return isAsc ? asc(companies.name)             : desc(companies.name)
      case 'customer':           return isAsc ? asc(customers.customer_name)    : desc(customers.customer_name)
      case 'business_unit':      return isAsc ? asc(divisions.label)            : desc(divisions.label)
      case 'gp_margin_percent':  return isAsc ? asc(marginExpr)                 : desc(marginExpr)
      case 'category_count':     return isAsc ? asc(catCountExpr)               : desc(catCountExpr)
      case 'import_source':      return isAsc ? asc(import_logs.source)         : desc(import_logs.source)
      default:                    return isAsc ? asc(invoices.invoice_date)      : desc(invoices.invoice_date)
    }
  })()

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${invoices.id})` })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, invoices.channel_name),
          eq(channel_divisions.company_id, invoices.company_id),
        ),
      )
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        id:             invoices.id,
        invoice_number: invoices.invoice_number,
        invoice_date:   invoices.invoice_date,
        customer_id:    customers.id,
        customer_code:  customers.customer_code,
        customer_name:  customers.customer_name,
        division:       divisions.label,
        company_id:     companies.id,
        company_name:   companies.name,
        total_revenue:  invoices.total_revenue,
        total_gp:       invoices.total_gp,
        import_source:  import_logs.source,
        category_count: catCountExpr,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .innerJoin(companies, eq(invoices.company_id, companies.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, invoices.channel_name),
          eq(channel_divisions.company_id, invoices.company_id),
        ),
      )
      .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
      .leftJoin(import_logs, eq(import_logs.id, invoices.import_log_id))
      .leftJoin(invoice_items, eq(invoice_items.invoice_id, invoices.id))
      .where(whereWithDivision)
      .groupBy(invoices.id, customers.id, divisions.label, companies.id, import_logs.source)
      .orderBy(orderByExpr)
      .limit(per_page)
      .offset(offset),
  ])

  return {
    data: rows.map((r) => {
      const totalRevenue = Number(r.total_revenue)
      const totalGp = Number(r.total_gp)
      return {
        id:             r.id,
        invoice_number: r.invoice_number,
        invoice_date:   r.invoice_date,
        customer: {
          id:            r.customer_id,
          code:          r.customer_code ?? '',
          name:          r.customer_name,
          business_unit: r.division ?? null,
        },
        company:           { id: r.company_id ?? 0, name: r.company_name ?? '' },
        total_revenue:     totalRevenue,
        total_gp:          totalGp,
        gp_margin_percent: totalRevenue > 0 ? Number(((totalGp / totalRevenue) * 100).toFixed(1)) : 0,
        category_count:    Number(r.category_count),
        import_source:     r.import_source ?? null,
      }
    }),
    total: Number(total),
  }
}

// Export Excel (2026-08-30, instruksi user: "export data yang terlihat,
// berdasarkan filter... langsung dari backend, tanpa query ulang") — filter
// SAMA PERSIS findInvoices (lewat buildInvoiceWhereClause), SATU query,
// TANPA LIMIT/OFFSET (ambil semua baris yang lolos filter, bukan 1 halaman).
// Shape select SAMA PERSIS findInvoices (field-nya lurus jadi kolom Excel)
// supaya tidak ada 2 definisi "bentuk baris invoice" yang bisa menyimpang.
// EXPORT_ROW_CAP (2026-08-31, dipindah ke utils/excel.ts) — dipakai bersama
// semua endpoint export lain (Products/Customers), bukan cuma di sini lagi.
export async function findInvoicesForExport(
  params: InvoiceFilterParams,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { where: whereWithDivision, isEmptyScope } = await buildInvoiceWhereClause(params, scopeIds, branchScope, divisionScope)
  if (isEmptyScope) return { data: [], total: 0, truncated: false }

  const catCountExpr = sql<number>`COUNT(DISTINCT ${invoice_items.product_category_id})`

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${invoices.id})` })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, invoices.channel_name),
          eq(channel_divisions.company_id, invoices.company_id),
        ),
      )
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        id:             invoices.id,
        invoice_number: invoices.invoice_number,
        invoice_date:   invoices.invoice_date,
        customer_id:    customers.id,
        customer_code:  customers.customer_code,
        customer_name:  customers.customer_name,
        division:       divisions.label,
        company_id:     companies.id,
        company_name:   companies.name,
        total_revenue:  invoices.total_revenue,
        total_gp:       invoices.total_gp,
        import_source:  import_logs.source,
        category_count: catCountExpr,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .innerJoin(companies, eq(invoices.company_id, companies.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, invoices.channel_name),
          eq(channel_divisions.company_id, invoices.company_id),
        ),
      )
      .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
      .leftJoin(import_logs, eq(import_logs.id, invoices.import_log_id))
      .leftJoin(invoice_items, eq(invoice_items.invoice_id, invoices.id))
      .where(whereWithDivision)
      .groupBy(invoices.id, customers.id, divisions.label, companies.id, import_logs.source)
      .orderBy(desc(invoices.invoice_date))
      .limit(EXPORT_ROW_CAP),
  ])

  return {
    data: rows.map((r) => {
      const totalRevenue = Number(r.total_revenue)
      const totalGp = Number(r.total_gp)
      return {
        id:             r.id,
        invoice_number: r.invoice_number,
        invoice_date:   r.invoice_date,
        customer_code:  r.customer_code ?? '',
        customer_name:  r.customer_name,
        business_unit:  r.division ?? '',
        company_name:   r.company_name ?? '',
        total_revenue:  totalRevenue,
        total_gp:       totalGp,
        // gp_margin_ratio (2026-08-30, koreksi user: "format sbg
        // percentase, jgn salah hasil perhitungannya") — RASIO mentah
        // (0-1), BUKAN angka persen (0-100) spt di findInvoices/
        // findInvoicesSummary. Kolom Excel-nya jadi RUMUS `=GP/Revenue`
        // (lihat handler) + numFmt '0.0%' — Excel SENDIRI yang kalikan
        // 100 utk tampilan persen, kalau field ini sudah dikali 100 di
        // sini, hasilnya kelipatan 100 SALAH ("560%" bukan "5.6%").
        gp_margin_ratio: totalRevenue > 0 ? totalGp / totalRevenue : 0,
        category_count: Number(r.category_count),
        import_source:  r.import_source ?? '',
      }
    }),
    total: Number(total),
    truncated: Number(total) > EXPORT_ROW_CAP,
  }
}

// Kartu ringkasan Revenue/Laba Kotor/Margin (2026-08-29) — 1 baris agregat,
// filter SAMA PERSIS findInvoices (lewat buildInvoiceWhereClause), TANPA join
// invoice_items (tidak butuh category_count di sini) supaya SUM tidak
// terlipatgandakan oleh baris item per invoice.
export async function findInvoicesSummary(
  params: InvoicesSummaryQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { where: whereWithDivision, isEmptyScope } = await buildInvoiceWhereClause(params, scopeIds, branchScope, divisionScope)
  if (isEmptyScope) return { total_revenue: 0, total_gp: 0, gp_margin_percent: 0 }

  const [row] = await db
    .select({
      total_revenue: sql<number>`COALESCE(SUM(${invoices.total_revenue}), 0)`,
      total_gp:      sql<number>`COALESCE(SUM(${invoices.total_gp}), 0)`,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customer_id, customers.id))
    .leftJoin(
      channel_divisions,
      and(
        eq(channel_divisions.channel_name, invoices.channel_name),
        eq(channel_divisions.company_id, invoices.company_id),
      ),
    )
    .where(whereWithDivision)

  const totalRevenue = Number(row?.total_revenue ?? 0)
  const totalGp = Number(row?.total_gp ?? 0)
  return {
    total_revenue:     totalRevenue,
    total_gp:          totalGp,
    gp_margin_percent: totalRevenue > 0 ? Number(((totalGp / totalRevenue) * 100).toFixed(1)) : 0,
  }
}

export async function findInvoiceDetail(
  invoiceId: number,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  if (scopeIds && scopeIds.length === 0) return null

  const conditions = [eq(invoices.id, invoiceId), isNull(invoices.deleted_at)]
  if (scopeIds) conditions.push(inArray(invoices.company_id, scopeIds))
  const branchScopeCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)
  if (branchScopeCond) conditions.push(branchScopeCond)

  if (divisionScope) {
    const otherIdByCompany = await loadDivisionFallbackIds('other')
    const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany)
    const divisionScopeCond = buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
    if (divisionScopeCond) conditions.push(divisionScopeCond)
  }

  const [row] = await db
    .select({
      id:             invoices.id,
      invoice_number: invoices.invoice_number,
      invoice_date:   invoices.invoice_date,
      customer_id:    customers.id,
      customer_code:  customers.customer_code,
      customer_name:  customers.customer_name,
      company_id:     companies.id,
      company_name:   companies.name,
      total_revenue:  invoices.total_revenue,
      total_gp:       invoices.total_gp,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customer_id, customers.id))
    .innerJoin(companies, eq(invoices.company_id, companies.id))
    .leftJoin(
      channel_divisions,
      and(
        eq(channel_divisions.channel_name, invoices.channel_name),
        eq(channel_divisions.company_id, invoices.company_id),
      ),
    )
    .where(and(...conditions))
    .limit(1)

  if (!row) return null

  const itemRows = await db.execute(sql`
    SELECT
      ii.id,
      pr.product_name,
      pc.id   AS category_id,
      pc.name AS category_name,
      ii.revenue,
      ii.gross_profit,
      EXISTS (
        SELECT 1 FROM high_margin_products hmp
        WHERE hmp.company_id = ${row.company_id}::int
          AND hmp.effective_from <= ${row.invoice_date}::date
          AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${row.invoice_date}::date)
          AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
      ) AS is_high_margin
    FROM invoice_items ii
    JOIN products pr ON pr.id = ii.product_id
    LEFT JOIN product_categories pc ON pc.id = ii.product_category_id
    WHERE ii.invoice_id = ${invoiceId}::int
    ORDER BY ii.id
  `)

  return {
    id:             row.id,
    invoice_number: row.invoice_number,
    invoice_date:   row.invoice_date,
    customer: { id: row.customer_id, code: row.customer_code ?? '', name: row.customer_name },
    company:  { id: row.company_id, name: row.company_name },
    total_revenue: Number(row.total_revenue),
    total_gp:      Number(row.total_gp),
    items: (itemRows as unknown[]).map((r) => {
      const i = r as Record<string, unknown>
      return {
        id:           Number(i.id),
        product_name: String(i.product_name),
        category: {
          id:             Number(i.category_id ?? 0),
          name:           i.category_name ? String(i.category_name) : '',
          is_high_margin: Boolean(i.is_high_margin),
        },
        revenue:      Number(i.revenue),
        gross_profit: Number(i.gross_profit),
      }
    }),
  }
}
