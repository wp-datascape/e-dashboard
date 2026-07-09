import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw } from '@/utils/scope'

export interface CategoryProductsRepoParams {
  cid: number
  companyScopeIds?: number[]
  categoryId: number
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
}

export interface CategoryProductDbRow {
  product_id: number
  product_name: string
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  total_count: number
}

export async function fetchCategoryProducts(
  p: CategoryProductsRepoParams,
): Promise<CategoryProductDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)

  const rows = await db.execute(sql`
    WITH items AS (
      SELECT
        ii.product_id,
        i.id          AS invoice_id,
        i.customer_id,
        ii.revenue::numeric       AS revenue,
        ii.gross_profit::numeric  AS gp
      FROM invoice_items ii
      JOIN invoices  i ON i.id = ii.invoice_id
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
        AND (cd.branch_id = i.branch_id OR cd.branch_id IS NULL)
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ii.product_category_id = ${p.categoryId}::int
        AND ${branchCond}
        AND ${divisionScopeCond}
    )
    SELECT
      pr.id                                                    AS product_id,
      pr.product_name,
      SUM(items.revenue)::bigint                               AS total_revenue,
      SUM(items.gp)::bigint                                    AS total_gp,
      ROUND(SUM(items.gp) / NULLIF(SUM(items.revenue), 0) * 100, 1) AS gp_margin_percent,
      COUNT(DISTINCT items.invoice_id)::int                    AS invoice_count,
      COUNT(DISTINCT items.customer_id)::int                   AS customer_count,
      COUNT(*) OVER ()::int                                    AS total_count
    FROM items
    JOIN products pr ON pr.id = items.product_id
    GROUP BY pr.id, pr.product_name
    ORDER BY total_revenue DESC
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_id:        Number(row.product_id),
      product_name:      String(row.product_name),
      total_revenue:     Number(row.total_revenue    ?? 0),
      total_gp:          Number(row.total_gp         ?? 0),
      gp_margin_percent: Number(row.gp_margin_percent ?? 0),
      invoice_count:     Number(row.invoice_count    ?? 0),
      customer_count:    Number(row.customer_count   ?? 0),
      total_count:       Number(row.total_count      ?? 0),
    }
  })
}
