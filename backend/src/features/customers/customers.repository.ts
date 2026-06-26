import { db } from '@/config/db'
import { customers, invoices, invoice_items, product_categories, companies } from '@/db/schema'
import { and, eq, isNull, isNotNull, or, sql, desc, asc, ilike } from 'drizzle-orm'
import { findAllConfigs } from '@/features/config/config.repository'
import type { CustomersQuery } from './customers.schema'

// ─── Load threshold config dari business_configs ───────────────────────────────
// active_window_months              → new + active threshold (default 1)
// dormant_threshold_months.{bu}     → dormant threshold per BU
async function loadThresholds() {
  const configs = await findAllConfigs()
  const get = (key: string, fallback: string) =>
    configs.find((c) => c.key === key)?.value ?? fallback
  return {
    activeMonths: parseInt(get('active_window_months', '1')),
    dormant: {
      b2b_dc: parseInt(get('dormant_threshold_months.b2b_dc', '3')),
      b2b_project: parseInt(get('dormant_threshold_months.b2b_project', '12')),
      b2c: parseInt(get('dormant_threshold_months.b2c', '6')),
      manufacturing: parseInt(get('dormant_threshold_months.manufacturing', '6')),
    },
  }
}

// ─── Ekspresi CASE SQL untuk kolom status ─────────────────────────────────────
function buildStatusExpr(
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormant: Record<string, number>,
) {
  const activeCutoff = sql`${refDate} - ${activeMonths}::int * INTERVAL '1 month'`
  const dormantCutoff = sql`${refDate} - (
    CASE ${customers.business_unit}
      WHEN 'b2b_dc'          THEN ${dormant.b2b_dc}::int
      WHEN 'b2b_project'     THEN ${dormant.b2b_project}::int
      WHEN 'b2c'             THEN ${dormant.b2c}::int
      WHEN 'manufacturing'   THEN ${dormant.manufacturing}::int
      ELSE                        ${dormant.b2b_dc}::int
    END * INTERVAL '1 month'
  )`

  return sql<string>`
    CASE
      WHEN ${customers.last_invoice_date} IS NULL
        THEN 'new'
      WHEN ${customers.first_invoice_date}::date >= ${activeCutoff}
        THEN 'new'
      WHEN ${customers.last_invoice_date}::date < ${dormantCutoff}
        THEN 'dormant'
      WHEN ${customers.last_invoice_date}::date >= ${activeCutoff}
        THEN 'active'
      ELSE 'existing'
    END
  `
}

// ─── WHERE condition untuk filter status ──────────────────────────────────────
function buildStatusWhere(
  status: string,
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormant: Record<string, number>,
) {
  const activeCutoff = sql`${refDate} - ${activeMonths}::int * INTERVAL '1 month'`
  const dormantCutoff = sql`${refDate} - (
    CASE ${customers.business_unit}
      WHEN 'b2b_dc'          THEN ${dormant.b2b_dc}::int
      WHEN 'b2b_project'     THEN ${dormant.b2b_project}::int
      WHEN 'b2c'             THEN ${dormant.b2c}::int
      WHEN 'manufacturing'   THEN ${dormant.manufacturing}::int
      ELSE                        ${dormant.b2b_dc}::int
    END * INTERVAL '1 month'
  )`

  const isNew = or(
    isNull(customers.last_invoice_date),
    sql`${customers.first_invoice_date}::date >= ${activeCutoff}`,
  )
  const notNew = and(
    isNotNull(customers.last_invoice_date),
    sql`(${customers.first_invoice_date} IS NULL OR ${customers.first_invoice_date}::date < ${activeCutoff})`,
  )

  switch (status) {
    case 'new':
      return isNew
    case 'dormant':
      return and(notNew, sql`${customers.last_invoice_date}::date < ${dormantCutoff}`)
    case 'active':
      return and(notNew, sql`${customers.last_invoice_date}::date >= ${activeCutoff}`)
    case 'existing':
      return and(
        notNew,
        sql`${customers.last_invoice_date}::date >= ${dormantCutoff}`,
        sql`${customers.last_invoice_date}::date < ${activeCutoff}`,
      )
    default:
      return undefined
  }
}

export async function findCustomers(params: CustomersQuery) {
  const { company_id, search, business_unit, status, sort_by, sort_dir, page, per_page, as_of_date } = params
  const offset = (page - 1) * per_page
  const refDate = as_of_date ? sql`${as_of_date}::date` : sql`CURRENT_DATE`

  const { activeMonths, dormant } = await loadThresholds()

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

  // WHERE conditions
  const conditions = []
  if (company_id !== 'all') conditions.push(eq(customers.company_id, company_id))
  if (search) conditions.push(ilike(customers.customer_name, `%${search}%`))
  if (business_unit) conditions.push(eq(customers.business_unit, business_unit))
  const statusCond = status ? buildStatusWhere(status, refDate, activeMonths, dormant) : undefined
  if (statusCond) conditions.push(statusCond)

  const whereClause = conditions.length ? and(...conditions) : undefined

  // Sort
  const isAsc = sort_dir === 'asc'
  const orderByExpr = (() => {
    switch (sort_by) {
      case 'lifetime_value':      return isAsc ? asc(lifetimeExpr) : desc(lifetimeExpr)
      case 'avg_monthly_revenue': return isAsc ? asc(avgMonthlyExpr) : desc(avgMonthlyExpr)
      case 'category_count':      return isAsc ? asc(catCountExpr) : desc(catCountExpr)
      default:                    return isAsc ? asc(customers.last_invoice_date) : desc(customers.last_invoice_date)
    }
  })()

  const statusExpr = buildStatusExpr(refDate, activeMonths, dormant)

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .where(whereClause)
      .then(([r]) => r),
    db
      .select({
        id: customers.id,
        customer_code: customers.customer_code,
        name: customers.customer_name,
        company_id: companies.id,
        company_name: companies.name,
        business_unit: customers.business_unit,
        first_invoice_date: customers.first_invoice_date,
        last_invoice_date: customers.last_invoice_date,
        total_invoices: invCountExpr,
        lifetime_value: lifetimeExpr,
        avg_monthly_revenue: avgMonthlyExpr,
        category_count: catCountExpr,
        status: statusExpr,
      })
      .from(customers)
      .leftJoin(companies, eq(customers.company_id, companies.id))
      .leftJoin(invoices, eq(invoices.customer_id, customers.id))
      .leftJoin(
        invoice_items,
        and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)),
      )
      .where(whereClause)
      .groupBy(customers.id, companies.id)
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

  const [row] = await db
    .select({
      id: customers.id,
      customer_code: customers.customer_code,
      name: customers.customer_name,
      company_id: companies.id,
      company_name: companies.name,
      business_unit: customers.business_unit,
      first_invoice_date: customers.first_invoice_date,
      last_invoice_date: customers.last_invoice_date,
      status: buildStatusExpr(refDate, activeMonths, dormant),
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

  const trendRows = await db
    .select({
      month: sql<string>`TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM')`,
      revenue: sql<string>`COALESCE(SUM(${invoices.total_revenue}::numeric), 0)`,
      gp: sql<string>`COALESCE(SUM(${invoices.total_gp}::numeric), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customer_id, customerId),
        isNull(invoices.deleted_at),
        sql`${invoices.invoice_date}::date >= CURRENT_DATE - INTERVAL '12 months'`,
      ),
    )
    .groupBy(sql`TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${invoices.invoice_date}::date, 'YYYY-MM')`)

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
