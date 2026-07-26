import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export interface CategoryProductsRepoParams {
  cid: number
  companyScopeIds?: number[]
  categoryId: number
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  excludeIntercompany?: boolean
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
  // Task008 — filter ke produk yang BENAR-BENAR ditandai high margin di tabel
  // high_margin_products (bukan cuma "pernah terjual di kategori ini"). Opsional
  // (default false) karena query yang sama dipakai juga di tab Target Upsell &
  // halaman Products biasa, yang sengaja tetap tampilkan semua produk kategori.
  onlyHighMargin?: boolean
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
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', p.cid, p.companyScopeIds)

  // Task008 — kalau onlyHighMargin, batasi ke produk yang EFEKTIF high margin di
  // kategori ini pada periodEnd: ditandai langsung per-produk (hmp.product_id),
  // ATAU seluruh kategori ditandai (hmp.product_category_id) - mirror resolusi
  // yang sama dipakai hmCatsCte di high-margin-penetration.repository.ts, tapi
  // di sini resolve ke product_id karena butuh daftar produk, bukan kategori.
  const onlyHmCond = p.onlyHighMargin
    ? sql`ii.product_id IN (SELECT product_id FROM hm_products)`
    : sql`TRUE`

  const rows = await db.execute(sql`
    WITH hm_products AS (
      SELECT pr.id AS product_id
      FROM products pr
      WHERE pr.product_category_id = ${p.categoryId}::int
        AND (
          EXISTS (
            SELECT 1 FROM high_margin_products hmp
            WHERE hmp.product_id = pr.id
              AND ${companyCondHmp}
              AND hmp.effective_from <= ${p.periodEnd}::date
              AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
          )
          OR EXISTS (
            SELECT 1 FROM high_margin_products hmp
            WHERE hmp.product_category_id = ${p.categoryId}::int
              AND ${companyCondHmp}
              AND hmp.effective_from <= ${p.periodEnd}::date
              AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
          )
        )
    ),
    items AS (
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
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ii.product_category_id = ${p.categoryId}::int
        AND ${onlyHmCond}
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
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
