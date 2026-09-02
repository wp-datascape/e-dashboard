import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildCompanyConditionRaw } from '@/utils/scope'
import { EXPORT_ROW_CAP } from '@/utils/excel'
import { resolveInvoiceScopeConditions } from '../segment.helper'

export interface ProductPerformanceRepoParams {
  cid: number          // 0 = semua company
  companyScopeIds?: number[]
  periodEnd: string    // YYYY-MM-DD = akhir bulan dari period_month
  activeWindow: number
  search: string       // '' = tanpa filter, cari nama produk
  categoryId?: number | null
  itemType?: string | null
  highMarginOnly: boolean
  sortBy: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sortDir: 'asc' | 'desc'
  page: number
  perPage: number
  division?: number | null
  excludeIntercompany?: boolean
  branchFilter?: number | null
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
}

export interface ProductPerformanceDbRow {
  product_id: number
  product_name: string
  category_id: number | null
  category_name: string | null
  is_high_margin: boolean
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

export async function fetchProductPerformance(
  p: ProductPerformanceRepoParams,
): Promise<ProductPerformanceDbRow[]> {
  const sortCol = SORT_COL[p.sortBy] ?? 'total_revenue'
  const sortDir = p.sortDir === 'asc' ? 'ASC' : 'DESC'
  const offset  = (p.page - 1) * p.perPage
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', p.cid, p.companyScopeIds)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null
  const categoryId = p.categoryId ?? null
  const itemType = p.itemType ?? null

  const rows = await db.execute(sql`
    WITH
    -- Invoice items dalam active window yang relevan
    items AS (
      SELECT
        ii.product_id,
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
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ii.product_id IS NOT NULL
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),

    -- Resolusi High Margin per produk — mirror hmCatsCte() di
    -- high-margin-penetration.repository.ts: produk dianggap HM kalau
    -- ditandai LANGSUNG per product_id, ATAU seluruh kategorinya ditandai.
    hm_flags AS (
      SELECT
        hmp.product_id,
        COALESCE(hmp.product_category_id, pr.product_category_id) AS product_category_id
      FROM high_margin_products hmp
      LEFT JOIN products pr ON pr.id = hmp.product_id
      WHERE hmp.effective_from             <= ${p.periodEnd}::date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
        AND ${companyCondHmp}
        AND COALESCE(hmp.product_category_id, pr.product_category_id) IS NOT NULL
    ),
    hm_cat_level AS (
      SELECT DISTINCT product_category_id FROM hm_flags WHERE product_id IS NULL
    ),
    hm_product_level AS (
      SELECT DISTINCT product_id FROM hm_flags WHERE product_id IS NOT NULL
    ),

    -- Agregasi performa per produk
    agg AS (
      SELECT
        product_id,
        SUM(revenue)::bigint                                   AS total_revenue,
        SUM(gp)::bigint                                        AS total_gp,
        ROUND(SUM(gp) / NULLIF(SUM(revenue), 0) * 100, 1)     AS gp_margin_percent,
        COUNT(DISTINCT invoice_id)::int                         AS invoice_count,
        COUNT(DISTINCT customer_id)::int                        AS customer_count,
        TO_CHAR(MAX(invoice_date), 'YYYY-MM')                  AS last_sold_month
      FROM items
      GROUP BY product_id
    )

    SELECT
      pr.id                                         AS product_id,
      pr.product_name,
      pc.id                                         AS category_id,
      pc.name                                       AS category_name,
      (
        pr.id IN (SELECT product_id FROM hm_product_level)
        OR pr.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
      )                                              AS is_high_margin,
      agg.total_revenue,
      agg.total_gp,
      COALESCE(agg.gp_margin_percent, 0)            AS gp_margin_percent,
      agg.invoice_count,
      agg.customer_count,
      agg.last_sold_month,
      COUNT(*) OVER ()::int                         AS total_count
    FROM agg
    JOIN products pr                  ON pr.id = agg.product_id
    LEFT JOIN product_categories pc   ON pc.id = pr.product_category_id
    WHERE (${p.search} = '' OR pr.product_name ILIKE '%' || ${p.search} || '%')
      AND (${categoryId}::int IS NULL OR pr.product_category_id = ${categoryId}::int)
      AND (${itemType}::text IS NULL OR pc.item_type = ${itemType}::text)
      AND (
        ${p.highMarginOnly}::boolean = false
        OR pr.id IN (SELECT product_id FROM hm_product_level)
        OR pr.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
      )
    -- Tie-break product_id (2026-09-02, koreksi user: sorting tanpa pemutus
    -- seri bikin urutan antar baris yg nilainya SAMA PERSIS di sortCol tidak
    -- stabil antar eksekusi query -> paginasi (LIMIT/OFFSET) bisa nampilin
    -- produk dobel di 2 halaman atau kelewat sama sekali. Kolom ke-2 ini
    -- TIDAK pernah mempengaruhi urutan kalau sortCol beda - Postgres cuma
    -- pakai dia utk baris yg genuinely tied di kolom pertama.
    ORDER BY ${sql.raw(`${sortCol} ${sortDir}`)}, product_id ASC
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_id:        Number(row.product_id),
      product_name:      String(row.product_name),
      category_id:       row.category_id !== null ? Number(row.category_id) : null,
      category_name:     row.category_name ? String(row.category_name) : null,
      is_high_margin:    Boolean(row.is_high_margin),
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

export interface ProductPerformanceExportRow {
  product_name: string
  category_name: string
  is_high_margin: boolean
  total_revenue: number
  total_gp: number
  gp_margin_ratio: number
  customer_count: number
  invoice_count: number
  last_sold_month: string
}

// Export Excel (2026-08-31, instruksi user: "tambahkan fungsi export excel
// juga di ke 2 menu" — susulan export Transactions) — filter SAMA PERSIS
// fetchProductPerformance (CTE identik, reuse query di atas), TANPA LIMIT/
// OFFSET (ambil semua baris yang lolos filter, bukan 1 halaman), diurutkan
// tetap total_revenue DESC (default tampilan tabel) — bukan search/sort
// pilihan user, export selalu representasi PENUH dari filter yang aktif.
// EXPORT_ROW_CAP — lihat JSDoc di utils/excel.ts, pola sama persis
// findInvoicesForExport (transactions.repository.ts).
export async function fetchProductPerformanceForExport(
  p: Omit<ProductPerformanceRepoParams, 'sortBy' | 'sortDir' | 'page' | 'perPage'>,
): Promise<{ data: ProductPerformanceExportRow[]; total: number; truncated: boolean }> {
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', p.cid, p.companyScopeIds)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null
  const categoryId = p.categoryId ?? null
  const itemType = p.itemType ?? null

  const rows = await db.execute(sql`
    WITH
    items AS (
      SELECT
        ii.product_id,
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
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ii.product_id IS NOT NULL
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    hm_flags AS (
      SELECT
        hmp.product_id,
        COALESCE(hmp.product_category_id, pr.product_category_id) AS product_category_id
      FROM high_margin_products hmp
      LEFT JOIN products pr ON pr.id = hmp.product_id
      WHERE hmp.effective_from             <= ${p.periodEnd}::date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
        AND ${companyCondHmp}
        AND COALESCE(hmp.product_category_id, pr.product_category_id) IS NOT NULL
    ),
    hm_cat_level AS (
      SELECT DISTINCT product_category_id FROM hm_flags WHERE product_id IS NULL
    ),
    hm_product_level AS (
      SELECT DISTINCT product_id FROM hm_flags WHERE product_id IS NOT NULL
    ),
    agg AS (
      SELECT
        product_id,
        SUM(revenue)::bigint                                   AS total_revenue,
        SUM(gp)::bigint                                        AS total_gp,
        COUNT(DISTINCT invoice_id)::int                         AS invoice_count,
        COUNT(DISTINCT customer_id)::int                        AS customer_count,
        TO_CHAR(MAX(invoice_date), 'YYYY-MM')                  AS last_sold_month
      FROM items
      GROUP BY product_id
    )
    SELECT
      pr.product_name,
      pc.name                                       AS category_name,
      (
        pr.id IN (SELECT product_id FROM hm_product_level)
        OR pr.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
      )                                              AS is_high_margin,
      agg.total_revenue,
      agg.total_gp,
      CASE WHEN agg.total_revenue > 0 THEN agg.total_gp::numeric / agg.total_revenue ELSE 0 END AS gp_margin_ratio,
      agg.customer_count,
      agg.invoice_count,
      agg.last_sold_month,
      COUNT(*) OVER ()::int                         AS total_count
    FROM agg
    JOIN products pr                  ON pr.id = agg.product_id
    LEFT JOIN product_categories pc   ON pc.id = pr.product_category_id
    WHERE (${p.search} = '' OR pr.product_name ILIKE '%' || ${p.search} || '%')
      AND (${categoryId}::int IS NULL OR pr.product_category_id = ${categoryId}::int)
      AND (${itemType}::text IS NULL OR pc.item_type = ${itemType}::text)
      AND (
        ${p.highMarginOnly}::boolean = false
        OR pr.id IN (SELECT product_id FROM hm_product_level)
        OR pr.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
      )
    ORDER BY agg.total_revenue DESC
    LIMIT ${EXPORT_ROW_CAP}
  `)

  const data = (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_name:      String(row.product_name),
      category_name:     row.category_name ? String(row.category_name) : '—',
      is_high_margin:    Boolean(row.is_high_margin),
      total_revenue:     Number(row.total_revenue   ?? 0),
      total_gp:          Number(row.total_gp        ?? 0),
      gp_margin_ratio:   Number(row.gp_margin_ratio ?? 0),
      customer_count:    Number(row.customer_count  ?? 0),
      invoice_count:     Number(row.invoice_count   ?? 0),
      last_sold_month:   row.last_sold_month ? String(row.last_sold_month) : '—',
    }
  })
  const total = (rows as unknown[])[0] ? Number((rows[0] as Record<string, unknown>).total_count ?? 0) : 0

  return { data, total, truncated: total > EXPORT_ROW_CAP }
}
