import { and, eq, inArray, isNull, gte, lte, ilike, count, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { invoices, pareto_customers, customers, companies, channel_divisions } from '@/db/schema'
import {
  loadDivisionFallbackIds,
  flattenFallbackByBranch,
  buildExcludeIntercompanyCondition,
  buildBranchCondition,
  buildDivisionCondition,
} from '@/utils/scope'

export interface CustomerPeriodAggregate {
  customer_id: number
  revenue: number
  margin: number
}

/**
 * SUM total_revenue/total_gp langsung dari `invoices` (BUKAN join invoice_items)
 * supaya tidak duplikasi — pola sama seperti findCustomerDetail trend 12 bulan
 * (customers.repository.ts, lihat komentar di situ soal duplikasi JOIN).
 * Dipakai untuk periode previous/YoY (cuma customer_id di 1 halaman, bukan
 * seluruh scope — beda dari current_revenue yang dihitung inline di
 * findAnalisisCustomers supaya bisa dipakai sorting sebelum paginasi).
 */
export async function aggregateInvoicesByCustomer(
  customerIds: number[],
  range: { start: string; end: string },
): Promise<Map<number, CustomerPeriodAggregate>> {
  if (customerIds.length === 0) return new Map()

  const rows = await db
    .select({
      customer_id: invoices.customer_id,
      revenue: sql<string>`COALESCE(SUM(${invoices.total_revenue}::numeric), 0)`,
      margin: sql<string>`COALESCE(SUM(${invoices.total_gp}::numeric), 0)`,
    })
    .from(invoices)
    .where(
      and(
        inArray(invoices.customer_id, customerIds),
        isNull(invoices.deleted_at),
        gte(invoices.invoice_date, range.start),
        lte(invoices.invoice_date, range.end),
      ),
    )
    .groupBy(invoices.customer_id)

  const map = new Map<number, CustomerPeriodAggregate>()
  for (const r of rows) {
    map.set(r.customer_id, {
      customer_id: r.customer_id,
      revenue: Number(r.revenue),
      margin: Number(r.margin),
    })
  }
  return map
}

export interface AnalisisCustomerRow {
  customer_id: number
  customer_name: string
  customer_code: string | null
  company_id: number
  company_name: string | null
  is_pareto: boolean
  current_revenue: string
  current_margin: string
}

export type AnalisisSortBy = 'default' | 'revenue'
export type AnalisisSortDir = 'asc' | 'desc'

/**
 * SEMUA customer non-placeholder di scope (bukan cuma yang di-flag Pareto) —
 * ditandai `is_pareto` via LEFT JOIN ke pareto_customers aktif, diprioritaskan
 * tampil duluan secara default (ORDER BY is_pareto DESC) mirror pola High
 * Margin di halaman Product Ledger (chip + tetap muncul dalam list lengkap,
 * bukan halaman terpisah). `onlyPareto` = toggle filter (mirror
 * `high_margin_only`), independen dari prioritas tampil default.
 *
 * `excludeIntercompany` — toggle laporan (mirror `ExcludeIntercompanyToggle`
 * yang sudah dipakai Products/Transactions/Customers), exclude customer yang
 * division efektifnya 'intercompany' (COALESCE division_override_id, division
 * dari channel invoice TERBARU — pola sama persis dgn customers.repository.ts).
 *
 * Revenue/margin periode SAAT INI dihitung LANGSUNG di query ini (LEFT JOIN
 * invoices + CASE WHEN, bukan query terpisah) supaya bisa jadi basis sorting
 * SEBELUM paginasi — kalau dihitung belakangan (per halaman saja, pola lama),
 * sort by revenue tidak mungkin benar lintas halaman.
 */
export async function findAnalisisCustomers(
  scopeIds: number[] | undefined,
  search: string | undefined,
  onlyPareto: boolean,
  excludeIntercompany: boolean,
  sortBy: AnalisisSortBy,
  sortDir: AnalisisSortDir,
  currentRange: { start: string; end: string },
  page: number,
  perPage: number,
  customerId?: number,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  branchIdFilter?: number,
  divisionFilter?: number,
): Promise<{ rows: AnalisisCustomerRow[]; total: number }> {
  if (scopeIds && scopeIds.length === 0) return { rows: [], total: 0 }

  // Subquery: channel_name + branch_id dari invoice terbaru per customer —
  // dipakai resolve division efektif utk exclude-intercompany DAN scope
  // Cabang/Divisi (task016 §27), pola sama persis dgn `latestSalespersonSq`
  // di customers.repository.ts.
  const latestChannelSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    .orderBy(invoices.customer_id, sql`${invoices.invoice_date} DESC`)
    .as('latest_channel')

  const [intercompanyIdByCompany, otherIdByCompany] = await Promise.all([
    excludeIntercompany ? loadDivisionFallbackIds('intercompany') : Promise.resolve(undefined),
    (branchScope || divisionScope) ? loadDivisionFallbackIds('other') : Promise.resolve(undefined),
  ])
  const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany ?? new Map())

  const excludeIntercompanyCond = buildExcludeIntercompanyCondition(
    customers.company_id,
    sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`,
    intercompanyIdByCompany,
    excludeIntercompany,
  )

  // Scope Cabang/Divisi (enforcement RBAC) — WAJIB dipasang meski undefined
  // (bypass superadmin) sesuai pola resolveBranchScope/resolveDivisionScope
  // di middleware/auth.ts. Filter Cabang/Divisi (pilihan user di UI, opsional)
  // dipasang TERPISAH — dua hal beda meski nyasar ke kolom yang sama, lihat
  // customers.repository.ts.
  const branchScopeCond = buildBranchCondition(customers.company_id, latestChannelSq.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(latestChannelSq.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
  const branchFilterCond = branchIdFilter ? eq(latestChannelSq.branch_id, branchIdFilter) : undefined
  const divisionFilterCond = divisionFilter
    ? eq(sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`, divisionFilter)
    : undefined

  const baseConditions = [eq(customers.is_placeholder, false)]
  if (scopeIds) baseConditions.push(inArray(customers.company_id, scopeIds))
  if (search) baseConditions.push(ilike(customers.customer_name, `%${search}%`))
  if (customerId) baseConditions.push(eq(customers.id, customerId))
  if (excludeIntercompanyCond) baseConditions.push(excludeIntercompanyCond)
  if (branchScopeCond) baseConditions.push(branchScopeCond)
  if (divisionScopeCond) baseConditions.push(divisionScopeCond)
  if (branchFilterCond) baseConditions.push(branchFilterCond)
  if (divisionFilterCond) baseConditions.push(divisionFilterCond)

  const activeParetoJoin = and(
    eq(pareto_customers.customer_id, customers.id),
    lte(pareto_customers.effective_from, sql`CURRENT_DATE`),
    sql`(${pareto_customers.effective_until} IS NULL OR ${pareto_customers.effective_until} >= CURRENT_DATE)`,
  )

  const channelJoin = eq(latestChannelSq.customer_id, customers.id)
  const divisionJoin = and(
    eq(channel_divisions.channel_name, latestChannelSq.channel_name),
    eq(channel_divisions.company_id, customers.company_id),
  )

  let countQuery = db
    .select({ value: count(sql`DISTINCT ${customers.id}`) })
    .from(customers)
    .leftJoin(latestChannelSq, channelJoin)
    .leftJoin(channel_divisions, divisionJoin)
    .where(and(...baseConditions))
    .$dynamic()
  if (onlyPareto) {
    countQuery = countQuery.innerJoin(pareto_customers, activeParetoJoin)
  }
  const total = Number((await countQuery)[0].value)

  if (total === 0) return { rows: [], total: 0 }

  const revenueExpr = sql<string>`COALESCE(SUM(CASE WHEN ${invoices.invoice_date} BETWEEN ${currentRange.start} AND ${currentRange.end} THEN ${invoices.total_revenue}::numeric END), 0)`
  const marginExpr = sql<string>`COALESCE(SUM(CASE WHEN ${invoices.invoice_date} BETWEEN ${currentRange.start} AND ${currentRange.end} THEN ${invoices.total_gp}::numeric END), 0)`
  const isParetoExpr = sql<boolean>`bool_or(${pareto_customers.id} IS NOT NULL)`

  let query = db
    .select({
      customer_id: customers.id,
      customer_name: customers.customer_name,
      customer_code: customers.customer_code,
      company_id: customers.company_id,
      company_name: companies.name,
      is_pareto: isParetoExpr,
      current_revenue: revenueExpr,
      current_margin: marginExpr,
    })
    .from(customers)
    .leftJoin(companies, eq(customers.company_id, companies.id))
    .leftJoin(pareto_customers, activeParetoJoin)
    .leftJoin(invoices, and(eq(invoices.customer_id, customers.id), isNull(invoices.deleted_at)))
    .leftJoin(latestChannelSq, channelJoin)
    .leftJoin(channel_divisions, divisionJoin)
    .where(and(...baseConditions))
    .groupBy(customers.id, companies.id)
    .$dynamic()

  if (onlyPareto) {
    query = query.having(sql`bool_or(${pareto_customers.id} IS NOT NULL) = true`)
  }

  // Ulangi persis ekspresi revenueExpr di ORDER BY (bukan reference alias
  // SELECT) — pola sama dengan is_pareto DESC di bawah, aman dari perubahan
  // urutan kolom SELECT.
  //
  // Default (sortBy !== 'revenue') SENGAJA ikut urutkan revenue DESC sebagai
  // tiebreak kedua (bukan cuma customer_name ASC) — kalau cuma alfabetis,
  // customer nama berawalan angka/huruf awal yang omset-nya 0 nongol duluan,
  // di atas customer aktif ber-omset besar (laporan user 2026-07-29).
  query = sortBy === 'revenue'
    ? query.orderBy(sortDir === 'asc' ? sql`${revenueExpr} ASC` : sql`${revenueExpr} DESC`)
    : query.orderBy(sql`bool_or(${pareto_customers.id} IS NOT NULL) DESC`, sql`${revenueExpr} DESC`, customers.customer_name)

  const rows = await query.limit(perPage).offset((page - 1) * perPage)

  return { rows, total }
}
