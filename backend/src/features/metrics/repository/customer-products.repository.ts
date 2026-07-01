import { db } from '@/config/db'
import { sql } from 'drizzle-orm'

export interface CustomerProductsRepoParams {
  cid: number
  customerId: number
  categoryId?: number
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
}

export interface CustomerProductDbRow {
  product_id: number
  product_name: string
  category_id: number
  category_name: string
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  total_count: number
}

export async function fetchCustomerProducts(
  p: CustomerProductsRepoParams,
): Promise<CustomerProductDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const catFilter = p.categoryId
    ? sql`AND ii.product_category_id = ${p.categoryId}`
    : sql``

  const rows = await db.execute(sql`
    SELECT
      pr.id                                                              AS product_id,
      pr.product_name,
      pc.id                                                              AS category_id,
      pc.name                                                            AS category_name,
      SUM(ii.revenue)::bigint                                            AS total_revenue,
      SUM(ii.gross_profit)::bigint                                       AS total_gp,
      ROUND(SUM(ii.gross_profit) / NULLIF(SUM(ii.revenue), 0) * 100, 1) AS gp_margin_percent,
      COUNT(DISTINCT i.id)::int                                          AS invoice_count,
      COUNT(*) OVER ()::int                                              AS total_count
    FROM invoice_items ii
    JOIN invoices           i  ON i.id  = ii.invoice_id
    JOIN customers          c  ON c.id  = i.customer_id
    JOIN products           pr ON pr.id = ii.product_id
    JOIN product_categories pc ON pc.id = ii.product_category_id
    WHERE i.deleted_at    IS NULL
      AND c.is_placeholder = false
      AND i.customer_id   = ${p.customerId}
      AND (${p.cid}::int = 0 OR i.company_id = ${p.cid}::int)
      AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
      AND i.invoice_date <= ${p.periodEnd}::date
      AND ii.product_category_id IS NOT NULL
      ${catFilter}
    GROUP BY pr.id, pr.product_name, pc.id, pc.name
    ORDER BY total_revenue DESC NULLS LAST
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_id:       Number(row.product_id),
      product_name:     String(row.product_name),
      category_id:      Number(row.category_id),
      category_name:    String(row.category_name),
      total_revenue:    Number(row.total_revenue    ?? 0),
      total_gp:         Number(row.total_gp         ?? 0),
      gp_margin_percent: Number(row.gp_margin_percent ?? 0),
      invoice_count:    Number(row.invoice_count    ?? 0),
      total_count:      Number(row.total_count      ?? 0),
    }
  })
}
