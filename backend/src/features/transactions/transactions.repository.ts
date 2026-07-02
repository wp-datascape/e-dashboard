import { db } from '@/config/db'
import { invoices, invoice_items, customers, companies, channel_divisions, import_logs } from '@/db/schema'
import { and, eq, inArray, isNull, sql, desc, asc, ilike, or, gte, lte } from 'drizzle-orm'
import type { InvoicesQuery } from './transactions.schema'

export async function findInvoices(params: InvoicesQuery, scopeIds?: number[]) {
  const { company_id, business_unit, customer_search, date_from, date_to, sort_by, sort_dir, page, per_page } = params
  const offset = (page - 1) * per_page

  const conditions = [isNull(invoices.deleted_at), eq(customers.is_placeholder, false)]
  if (company_id !== 'all') conditions.push(eq(invoices.company_id, company_id))
  else if (scopeIds) {
    if (scopeIds.length === 0) return { data: [], total: 0 }
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
  const divisionCond = business_unit ? eq(channel_divisions.division, business_unit) : undefined
  const whereWithDivision = divisionCond ? and(whereClause, divisionCond) : whereClause

  const isAsc = sort_dir === 'asc'
  const orderByExpr = (() => {
    switch (sort_by) {
      case 'total_revenue': return isAsc ? asc(invoices.total_revenue) : desc(invoices.total_revenue)
      case 'total_gp':      return isAsc ? asc(invoices.total_gp)      : desc(invoices.total_gp)
      default:               return isAsc ? asc(invoices.invoice_date) : desc(invoices.invoice_date)
    }
  })()

  const catCountExpr = sql<number>`COUNT(DISTINCT ${invoice_items.product_category_id})`

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${invoices.id})` })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .leftJoin(channel_divisions, eq(channel_divisions.channel_name, invoices.channel_name))
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
        division:       channel_divisions.division,
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
      .leftJoin(channel_divisions, eq(channel_divisions.channel_name, invoices.channel_name))
      .leftJoin(import_logs, eq(import_logs.id, invoices.import_log_id))
      .leftJoin(invoice_items, eq(invoice_items.invoice_id, invoices.id))
      .where(whereWithDivision)
      .groupBy(invoices.id, customers.id, channel_divisions.division, companies.id, import_logs.source)
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

export async function findInvoiceDetail(invoiceId: number, scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return null

  const conditions = [eq(invoices.id, invoiceId), isNull(invoices.deleted_at)]
  if (scopeIds) conditions.push(inArray(invoices.company_id, scopeIds))

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
