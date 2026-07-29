import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export interface CustomerProductsRepoParams {
  cid: number
  companyScopeIds?: number[]
  customerId: number
  categoryId?: number
  itemType?: string
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  excludeIntercompany?: boolean
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
  division?: number | null   // filter laporan - mirror division di high-margin-penetration.repository.ts
  branchFilter?: number | null // filter laporan - mirror branch_id di high-margin-penetration.repository.ts
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
  const itemTypeFilter = p.itemType
    ? sql`AND pc.item_type = ${p.itemType}`
    : sql``
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', p.intercompanyIdByCompany, p.excludeIntercompany)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

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
    LEFT JOIN channel_divisions cd
      ON cd.channel_name = i.channel_name
      AND cd.company_id = i.company_id
    WHERE i.deleted_at    IS NULL
      AND c.is_placeholder = false
      AND i.customer_id   = ${p.customerId}
      AND ${companyCondI}
      AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
      AND i.invoice_date <= ${p.periodEnd}::date
      AND ii.product_category_id IS NOT NULL
      AND (${division}::int IS NULL OR cd.division_id = ${division}::int)
      AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
      AND ${branchCond}
      AND ${divisionScopeCond}
      AND ${excludeIntercompanyCond}
      ${catFilter}
      ${itemTypeFilter}
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
