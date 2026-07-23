import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export interface CategoryPerformanceRepoParams {
  cid: number          // 0 = semua company
  companyScopeIds?: number[] // hasil resolveCompanyScope() — lihat utils/scope.ts buildCompanyConditionRaw
  periodEnd: string    // YYYY-MM-DD = akhir bulan dari period_month
  activeWindow: number // jumlah bulan window aktif
  search: string       // '' = tanpa filter
  highMarginOnly: boolean
  sortBy: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sortDir: 'asc' | 'desc'
  page: number
  perPage: number
  division?: string | null
  excludeIntercompany?: boolean
  branchFilter?: number | null
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
}

export interface CategoryPerformanceDbRow {
  category_id: number
  category_name: string
  item_type: string
  is_high_margin: boolean
  is_service: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  last_sold_month: string | null
  total_count: number
}

// Whitelist kolom sort — cegah SQL injection
const SORT_COL: Record<string, string> = {
  total_revenue:     'total_revenue',
  total_gp:          'total_gp',
  gp_margin_percent: 'gp_margin_percent',
  customer_count:    'customer_count',
}

export async function fetchCategoryPerformance(
  p: CategoryPerformanceRepoParams,
): Promise<CategoryPerformanceDbRow[]> {
  const sortCol = SORT_COL[p.sortBy] ?? 'total_revenue'
  const sortDir = p.sortDir === 'asc' ? 'ASC' : 'DESC'
  const offset  = (p.page - 1) * p.perPage
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    -- Invoice items dalam active window yang relevan
    items AS (
      SELECT
        ii.product_category_id,
        i.id                      AS invoice_id,
        i.customer_id,
        i.invoice_date,
        ii.revenue::numeric        AS revenue,
        ii.gross_profit::numeric   AS gp
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
        AND ii.product_category_id IS NOT NULL
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),

    -- Kategori yang aktif sebagai high-margin pada akhir periode
    -- Dua sumber: (1) high_margin_products.product_category_id langsung
    --             (2) high_margin_products.product_id → products.product_category_id
    hm_cats AS (
      SELECT DISTINCT
        COALESCE(hmp.product_category_id, p.product_category_id) AS product_category_id
      FROM high_margin_products hmp
      LEFT JOIN products p ON p.id = hmp.product_id
      WHERE hmp.effective_from             <= ${p.periodEnd}::date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
        AND ${companyCondHmp}
        AND COALESCE(hmp.product_category_id, p.product_category_id) IS NOT NULL
    ),

    -- Agregasi performa per kategori
    agg AS (
      SELECT
        product_category_id,
        SUM(revenue)::bigint                                   AS total_revenue,
        SUM(gp)::bigint                                        AS total_gp,
        ROUND(SUM(gp) / NULLIF(SUM(revenue), 0) * 100, 1)     AS gp_margin_percent,
        COUNT(DISTINCT invoice_id)::int                         AS invoice_count,
        COUNT(DISTINCT customer_id)::int                        AS customer_count,
        TO_CHAR(MAX(invoice_date), 'YYYY-MM')                  AS last_sold_month
      FROM items
      GROUP BY product_category_id
    )

    SELECT
      pc.id                                         AS category_id,
      pc.name                                       AS category_name,
      pc.item_type,
      (hmc.product_category_id IS NOT NULL)         AS is_high_margin,
      (pc.item_type = 'service')                    AS is_service,
      agg.total_revenue,
      agg.total_gp,
      COALESCE(agg.gp_margin_percent, 0)            AS gp_margin_percent,
      agg.invoice_count,
      agg.customer_count,
      agg.last_sold_month,
      COUNT(*) OVER ()::int                         AS total_count
    FROM agg
    JOIN product_categories pc  ON pc.id = agg.product_category_id
    LEFT JOIN hm_cats hmc       ON hmc.product_category_id = pc.id
    WHERE (${p.search} = '' OR pc.name ILIKE '%' || ${p.search} || '%')
      AND (${p.highMarginOnly}::boolean = false OR hmc.product_category_id IS NOT NULL)
    ORDER BY ${sql.raw(`${sortCol} ${sortDir}`)}
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      category_id:       Number(row.category_id),
      category_name:     String(row.category_name),
      item_type:         String(row.item_type ?? 'unit'),
      is_high_margin:    Boolean(row.is_high_margin),
      is_service:        Boolean(row.is_service),
      total_revenue:     Number(row.total_revenue   ?? 0),
      total_gp:          Number(row.total_gp        ?? 0),
      gp_margin_percent: Number(row.gp_margin_percent ?? 0),
      invoice_count:     Number(row.invoice_count   ?? 0),
      customer_count:    Number(row.customer_count  ?? 0),
      last_sold_month:   row.last_sold_month ? String(row.last_sold_month) : null,
      total_count:       Number(row.total_count     ?? 0),
    }
  })
}
