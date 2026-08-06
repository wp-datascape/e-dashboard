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

/**
 * Analisis Retention — customer repeat order (jumlah invoice) per periode,
 * dibandingkan periode sama tahun lalu (YoY). Mirror pola analisis.repository.ts
 * (Revenue & GP) persis, cuma nilai yang dihitung beda: COUNT(DISTINCT invoice)
 * per customer, bukan SUM(revenue). Kondisi filter/scope SENGAJA disalin
 * (bukan diekstrak jadi 1 helper bersama dgn analisis.repository.ts) — supaya
 * fungsi Revenue (dipakai scheduler notifikasi digest email) tidak ikut
 * tersentuh perubahan apa pun di sini.
 */

export interface CustomerInvoiceCountAggregate {
  customer_id: number
  invoice_count: number
}

export async function aggregateInvoiceCountByCustomer(
  customerIds: number[],
  range: { start: string; end: string },
): Promise<Map<number, CustomerInvoiceCountAggregate>> {
  if (customerIds.length === 0) return new Map()

  const rows = await db
    .select({
      customer_id: invoices.customer_id,
      invoice_count: sql<number>`COUNT(DISTINCT ${invoices.id})::int`,
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

  const map = new Map<number, CustomerInvoiceCountAggregate>()
  for (const r of rows) {
    map.set(r.customer_id, { customer_id: r.customer_id, invoice_count: Number(r.invoice_count) })
  }
  return map
}

export interface RetentionCustomerRow {
  customer_id: number
  customer_name: string
  customer_code: string | null
  company_id: number
  company_name: string | null
  is_pareto: boolean
  current_invoice_count: number
}

export type RetentionSortBy = 'default' | 'invoice_count'
export type RetentionSortDir = 'asc' | 'desc'

export async function findRetentionCustomers(
  scopeIds: number[] | undefined,
  search: string | undefined,
  onlyPareto: boolean,
  excludeIntercompany: boolean,
  sortBy: RetentionSortBy,
  sortDir: RetentionSortDir,
  currentRange: { start: string; end: string },
  page: number,
  perPage: number,
  customerId?: number,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  branchIdFilter?: number,
  divisionFilter?: number,
): Promise<{ rows: RetentionCustomerRow[]; total: number }> {
  if (scopeIds && scopeIds.length === 0) return { rows: [], total: 0 }

  const latestChannelSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    .orderBy(invoices.customer_id, sql`${invoices.invoice_date} DESC`, sql`${invoices.id} DESC`)
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

  const branchScopeCond = buildBranchCondition(customers.company_id, latestChannelSq.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(latestChannelSq.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
  const branchFilterCond = branchIdFilter ? eq(latestChannelSq.branch_id, branchIdFilter) : undefined
  const divisionFilterCond = divisionFilter
    ? eq(sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id}, (SELECT id FROM divisions WHERE company_id = ${customers.company_id} AND key = 'other'))`, divisionFilter)
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

  const invoiceCountExpr = sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.invoice_date} BETWEEN ${currentRange.start} AND ${currentRange.end} THEN ${invoices.id} END)::int`
  const isParetoExpr = sql<boolean>`bool_or(${pareto_customers.id} IS NOT NULL)`

  let query = db
    .select({
      customer_id: customers.id,
      customer_name: customers.customer_name,
      customer_code: customers.customer_code,
      company_id: customers.company_id,
      company_name: companies.name,
      is_pareto: isParetoExpr,
      current_invoice_count: invoiceCountExpr,
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

  query = sortBy === 'invoice_count'
    ? query.orderBy(sortDir === 'asc' ? sql`${invoiceCountExpr} ASC` : sql`${invoiceCountExpr} DESC`)
    : query.orderBy(sql`bool_or(${pareto_customers.id} IS NOT NULL) DESC`, sql`${invoiceCountExpr} DESC`, customers.customer_name)

  const rows = await query.limit(perPage).offset((page - 1) * perPage)

  return { rows, total }
}

export interface RetentionSummary {
  current_invoice_count: number
  comparison_invoice_count: number
}

export async function aggregateRetentionSummary(
  scopeIds: number[] | undefined,
  search: string | undefined,
  onlyPareto: boolean,
  excludeIntercompany: boolean,
  currentRange: { start: string; end: string },
  comparisonRange: { start: string; end: string },
  customerId?: number,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  branchIdFilter?: number,
  divisionFilter?: number,
): Promise<RetentionSummary> {
  const empty: RetentionSummary = { current_invoice_count: 0, comparison_invoice_count: 0 }
  if (scopeIds && scopeIds.length === 0) return empty

  const latestChannelSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    .orderBy(invoices.customer_id, sql`${invoices.invoice_date} DESC`, sql`${invoices.id} DESC`)
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

  const branchScopeCond = buildBranchCondition(customers.company_id, latestChannelSq.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(latestChannelSq.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
  const branchFilterCond = branchIdFilter ? eq(latestChannelSq.branch_id, branchIdFilter) : undefined
  const divisionFilterCond = divisionFilter
    ? eq(sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id}, (SELECT id FROM divisions WHERE company_id = ${customers.company_id} AND key = 'other'))`, divisionFilter)
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

  const curCountExpr = sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.invoice_date} BETWEEN ${currentRange.start} AND ${currentRange.end} THEN ${invoices.id} END)::int`
  const cmpCountExpr = sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.invoice_date} BETWEEN ${comparisonRange.start} AND ${comparisonRange.end} THEN ${invoices.id} END)::int`

  let perCustomer = db
    .select({
      customer_id: customers.id,
      cur_count: curCountExpr,
      cmp_count: cmpCountExpr,
    })
    .from(customers)
    .leftJoin(pareto_customers, activeParetoJoin)
    .leftJoin(invoices, and(eq(invoices.customer_id, customers.id), isNull(invoices.deleted_at)))
    .leftJoin(latestChannelSq, channelJoin)
    .leftJoin(channel_divisions, divisionJoin)
    .where(and(...baseConditions))
    .groupBy(customers.id)
    .$dynamic()

  if (onlyPareto) {
    perCustomer = perCustomer.having(sql`bool_or(${pareto_customers.id} IS NOT NULL) = true`)
  }

  const sub = perCustomer.as('sub')
  const [row] = await db
    .select({
      total_cur: sql<number>`COALESCE(SUM(${sub.cur_count}), 0)::int`,
      total_cmp: sql<number>`COALESCE(SUM(${sub.cmp_count}), 0)::int`,
    })
    .from(sub)

  if (!row) return empty
  return { current_invoice_count: Number(row.total_cur), comparison_invoice_count: Number(row.total_cmp) }
}
