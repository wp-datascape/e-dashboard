import { db } from '@/config/db'
import { customers, invoices, invoice_items, product_categories, companies, channel_divisions } from '@/db/schema'
import { and, or, eq, inArray, isNull, isNotNull, sql, desc, asc, ilike } from 'drizzle-orm'
import { loadThresholds, resolveDormantMonths, resolveDormantBucketKey } from '@/features/config/threshold'
import { buildBranchCondition, buildDivisionCondition } from '@/utils/scope'
import { sqlStatusExpr, sqlStatusWhere } from './helper/segment.helper'
import type { CustomersQuery } from './customers.schema'

export async function findCustomers(
  params: CustomersQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, string[]>,
) {
  const { company_id, branch_id, search, business_unit, status, sort_by, sort_dir, page, per_page, as_of_date } = params
  const offset = (page - 1) * per_page
  const refDate = as_of_date ? sql`${as_of_date}::date` : sql`CURRENT_DATE`

  const { activeMonths, dormant } = await loadThresholds()
  const cid = company_id === 'all' ? 0 : company_id
  const dormantMonths = await resolveDormantMonths(cid, dormant)

  // Subquery: live first/last invoice date per customer (dari tabel invoices langsung)
  // Alias berbeda dari customers.first/last_invoice_date agar tidak ambigu di GROUP BY
  const liveDatesSq = db
    .select({
      customer_id: invoices.customer_id,
      live_last:  sql<string | null>`MAX(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} THEN ${invoices.invoice_date} END)`.as('live_last'),
      live_first: sql<string | null>`MIN(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} THEN ${invoices.invoice_date} END)`.as('live_first'),
    })
    .from(invoices)
    .groupBy(invoices.customer_id)
    .as('live_dates')

  // Aggregate expressions
  const lifetimeExpr = sql<string>`
    COALESCE(SUM(CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoices.total_revenue}::numeric END), 0)
  `
  const avgMonthlyExpr = sql<string>`
    COALESCE(
      SUM(CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoices.total_revenue}::numeric END) /
      NULLIF(COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL
        THEN TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM') END), 0),
      0
    )
  `
  const invCountExpr = sql<number>`
    COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoices.id} END)
  `
  const catCountExpr = sql<number>`
    COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoice_items.product_category_id} END)
  `

  // WHERE conditions (tanpa division — division difilter via JOIN channel_divisions)
  const conditions = []
  conditions.push(eq(customers.is_placeholder, false))
  if (company_id !== 'all') conditions.push(eq(customers.company_id, company_id))
  else if (scopeIds) {
    if (scopeIds.length === 0) return { data: [], total: 0 }
    conditions.push(inArray(customers.company_id, scopeIds))
  }
  if (search) conditions.push(ilike(customers.customer_name, `%${search}%`))
  const statusCond = status
    ? sqlStatusWhere(status, refDate, activeMonths, dormantMonths, liveDatesSq.live_last, liveDatesSq.live_first)
    : undefined
  if (statusCond) conditions.push(statusCond)

  const whereClause = conditions.length ? and(...conditions) : undefined

  // Division filter (business_unit param): diapply setelah JOIN channel_divisions
  const divisionCond = business_unit ? eq(channel_divisions.division, business_unit) : undefined

  // Sort
  const isAsc = sort_dir === 'asc'
  const orderByExpr = (() => {
    switch (sort_by) {
      case 'lifetime_value':      return isAsc ? asc(lifetimeExpr) : desc(lifetimeExpr)
      case 'avg_monthly_revenue': return isAsc ? asc(avgMonthlyExpr) : desc(avgMonthlyExpr)
      case 'category_count':      return isAsc ? asc(catCountExpr) : desc(catCountExpr)
      default:                    return isAsc ? asc(liveDatesSq.live_last) : desc(liveDatesSq.live_last)
    }
  })()

  const statusExpr = sqlStatusExpr(refDate, activeMonths, dormantMonths, liveDatesSq.live_last, liveDatesSq.live_first)

  // Subquery: channel_name dari invoice terbaru per customer
  const latestSalespersonSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    .orderBy(invoices.customer_id, desc(invoices.invoice_date))
    .as('latest_sp')

  // Branch/division scope (docs-v2/task/task001.md) — di-derive dari invoice TERBARU
  // customer (latestSalespersonSq), konsisten dengan cara business_unit/division di atas
  // sudah di-derive (satu division per customer dari invoice terakhir, bukan EXISTS
  // lintas semua invoice miliknya)
  const branchScopeCond = buildBranchCondition(customers.company_id, latestSalespersonSq.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(latestSalespersonSq.branch_id, channel_divisions.division, divisionScope)
  // Filter laporan branch_id (opsional) — mirror business_unit di atas, beda dari
  // branchScopeCond (enforcement akses) meski keduanya nyasar ke kolom yang sama
  const branchFilterCond = branch_id ? eq(latestSalespersonSq.branch_id, branch_id) : undefined

  const scopeConditions = [divisionCond, branchFilterCond, branchScopeCond, divisionScopeCond].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const whereWithDivision = scopeConditions.length
    ? whereClause ? and(whereClause, ...scopeConditions) : and(...scopeConditions)
    : whereClause

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          or(eq(channel_divisions.company_id, customers.company_id), isNull(channel_divisions.company_id)),
          or(eq(channel_divisions.branch_id, latestSalespersonSq.branch_id), isNull(channel_divisions.branch_id)),
        ),
      )
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        id: customers.id,
        customer_code: customers.customer_code,
        name: customers.customer_name,
        company_id: companies.id,
        company_name: companies.name,
        business_unit: customers.business_unit,
        division: channel_divisions.division,
        first_invoice_date: liveDatesSq.live_first,
        last_invoice_date: liveDatesSq.live_last,
        total_invoices: invCountExpr,
        lifetime_value: lifetimeExpr,
        avg_monthly_revenue: avgMonthlyExpr,
        category_count: catCountExpr,
        status: statusExpr,
      })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(companies, eq(customers.company_id, companies.id))
      .leftJoin(invoices, eq(invoices.customer_id, customers.id))
      .leftJoin(
        invoice_items,
        and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)),
      )
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          or(eq(channel_divisions.company_id, customers.company_id), isNull(channel_divisions.company_id)),
          or(eq(channel_divisions.branch_id, latestSalespersonSq.branch_id), isNull(channel_divisions.branch_id)),
        ),
      )
      .where(whereWithDivision)
      .groupBy(customers.id, companies.id, channel_divisions.division, liveDatesSq.live_last, liveDatesSq.live_first)
      .orderBy(orderByExpr)
      .limit(per_page)
      .offset(offset),
  ])

  return {
    data: rows.map((r) => ({
      id: r.id,
      customer_code: r.customer_code,
      name: r.name,
      company: { id: r.company_id ?? 0, name: r.company_name ?? '' },
      business_unit: r.business_unit,
      division: r.division ?? null,
      first_invoice_date: r.first_invoice_date,
      last_invoice_date: r.last_invoice_date,
      total_invoices: Number(r.total_invoices),
      lifetime_value: Number(r.lifetime_value),
      avg_monthly_revenue: Number(r.avg_monthly_revenue),
      category_count: Number(r.category_count),
      status: r.status as 'new' | 'active' | 'dormant' | 'existing',
    })),
    total: Number(total),
  }
}

export async function findCustomerDetail(customerId: number) {
  const { activeMonths, dormant } = await loadThresholds()
  const refDate = sql`CURRENT_DATE`

  // Ambil channel_name + company_id + branch_id dari invoice terbaru → lookup division
  const [latestInv] = await db
    .select({ channel_name: invoices.channel_name, company_id: invoices.company_id, branch_id: invoices.branch_id })
    .from(invoices)
    .where(and(eq(invoices.customer_id, customerId), isNull(invoices.deleted_at)))
    .orderBy(desc(invoices.invoice_date))
    .limit(1)

  const branchMatchCond = latestInv?.branch_id
    ? or(eq(channel_divisions.branch_id, latestInv.branch_id), isNull(channel_divisions.branch_id))!
    : isNull(channel_divisions.branch_id)

  const [divRow] = latestInv?.channel_name
    ? await db
        .select({ division: channel_divisions.division })
        .from(channel_divisions)
        .where(and(
          eq(channel_divisions.channel_name, latestInv.channel_name),
          or(eq(channel_divisions.company_id, latestInv.company_id), isNull(channel_divisions.company_id)),
          branchMatchCond,
        ))
        // Rule paling spesifik menang: company+branch match > company match > global
        .orderBy(sql`${channel_divisions.company_id} IS NULL`, sql`${channel_divisions.branch_id} IS NULL`)
        .limit(1)
    : []

  const divisionKey = latestInv?.company_id && divRow?.division
    ? await resolveDormantBucketKey(latestInv.company_id, latestInv.branch_id ?? null, divRow.division)
    : 'b2b_dc'
  const dormantMonths = dormant[divisionKey]

  const liveLastInv  = sql`MAX(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} THEN ${invoices.invoice_date} END)`
  const liveFirstInv = sql`MIN(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} THEN ${invoices.invoice_date} END)`

  const [row] = await db
    .select({
      id: customers.id,
      customer_code: customers.customer_code,
      name: customers.customer_name,
      company_id: companies.id,
      company_name: companies.name,
      business_unit: customers.business_unit,
      first_invoice_date: liveFirstInv.mapWith(String),
      last_invoice_date: liveLastInv.mapWith(String),
      status: sqlStatusExpr(refDate, activeMonths, dormantMonths, liveLastInv, liveFirstInv),
      lifetime_value: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoices.total_revenue}::numeric END), 0)`,
      avg_monthly_revenue: sql<string>`
        COALESCE(
          SUM(CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoices.total_revenue}::numeric END) /
          NULLIF(COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL
            THEN TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM') END), 0),
          0
        )
      `,
      category_count: sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL THEN ${invoice_items.product_category_id} END)`,
    })
    .from(customers)
    .leftJoin(companies, eq(customers.company_id, companies.id))
    .leftJoin(invoices, eq(invoices.customer_id, customers.id))
    .leftJoin(
      invoice_items,
      and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)),
    )
    .where(eq(customers.id, customerId))
    .groupBy(customers.id, companies.id)

  if (!row) return null

  const catRows = await db
    .selectDistinct({ name: product_categories.name })
    .from(invoice_items)
    .innerJoin(invoices, and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)))
    .innerJoin(product_categories, eq(invoice_items.product_category_id, product_categories.id))
    .where(eq(invoices.customer_id, customerId))

  const trendRows = await db.execute<{ month: string; revenue: string; gp: string }>(sql`
    WITH months AS (
      SELECT TO_CHAR(m, 'YYYY-MM') AS month
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS m
    ),
    actuals AS (
      SELECT
        TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM') AS month,
        COALESCE(SUM(${invoices.total_revenue}::numeric), 0) AS revenue,
        COALESCE(SUM(${invoices.total_gp}::numeric), 0) AS gp
      FROM ${invoices}
      WHERE ${invoices.customer_id} = ${customerId}
        AND ${invoices.deleted_at} IS NULL
        AND ${invoices.invoice_date}::date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
      GROUP BY 1
    )
    SELECT m.month, COALESCE(a.revenue, 0)::text AS revenue, COALESCE(a.gp, 0)::text AS gp
    FROM months m
    LEFT JOIN actuals a ON a.month = m.month
    ORDER BY m.month
  `)

  const recentRows = await db
    .select({
      invoice_number: invoices.invoice_number,
      invoice_date: invoices.invoice_date,
      total_revenue: invoices.total_revenue,
      total_gp: invoices.total_gp,
    })
    .from(invoices)
    .where(and(eq(invoices.customer_id, customerId), isNull(invoices.deleted_at)))
    .orderBy(desc(invoices.invoice_date))
    .limit(5)

  return {
    id: row.id,
    customer_code: row.customer_code,
    name: row.name,
    company: { id: row.company_id ?? 0, name: row.company_name ?? '' },
    business_unit: row.business_unit,
    division: divRow?.division ?? null,
    channel: latestInv?.channel_name ?? null,
    status: row.status as 'new' | 'active' | 'dormant' | 'existing',
    first_invoice_date: row.first_invoice_date,
    last_invoice_date: row.last_invoice_date,
    lifetime_value: Number(row.lifetime_value),
    avg_monthly_revenue: Number(row.avg_monthly_revenue),
    category_count: Number(row.category_count),
    categories_bought: catRows.map((c) => c.name).filter(Boolean) as string[],
    monthly_revenue_trend: trendRows.map((t) => ({
      month: t.month,
      revenue: Number(t.revenue),
      gp: Number(t.gp),
    })),
    recent_invoices: recentRows.map((i) => ({
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      total_revenue: Number(i.total_revenue),
      total_gp: Number(i.total_gp),
    })),
  }
}