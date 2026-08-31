import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { resolveInvoiceScopeConditions } from '../segment.helper'

export interface CustomerProductsRepoParams {
  cid: number
  companyScopeIds?: number[]
  customerId: number
  categoryId?: number
  itemType?: string
  periodEnd: string
  // EITHER periodStart eksplisit — INKLUSIF (>=), sama persis filter
  // `fetchCrossSellingHeatmap` (m1.repository.ts), dipakai M1 heatmap
  // drill-down (2026-08-22, bug user: drill-down dulu SELALU pakai
  // activeWindow bulan mundur dari periodEnd, TIDAK terkait rentang
  // granularitas-aware yang dipakai heatmap-nya) — ATAU activeWindow
  // (bulan mundur dari periodEnd, PERSIS perilaku lama, dipertahankan
  // apa adanya utk UpsellCustomerDialog.tsx yang TIDAK disentuh). Kalau
  // periodStart diisi, activeWindow diabaikan.
  periodStart?: string
  activeWindow?: number
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

// Ringkasan keseluruhan (2026-08-22, koreksi user: "informasi juga kurang
// lengkap, total produk, total invoice, total revenue, total GP") — query
// TERPISAH dari daftar produk per-halaman (bukan scalar subquery nempel di
// baris), sama pola persis `fetchCategoryProducts`
// (category-products.repository.ts) — summary WAJIB benar walau daftar
// produk kosong/terpotong pagination.
export interface CustomerProductsSummary {
  product_count: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
}

export interface CustomerProductsResult {
  rows: CustomerProductDbRow[]
  summary: CustomerProductsSummary
}

export async function fetchCustomerProducts(
  p: CustomerProductsRepoParams,
): Promise<CustomerProductsResult> {
  const offset = (p.page - 1) * p.perPage
  const catFilter = p.categoryId
    ? sql`AND ii.product_category_id = ${p.categoryId}`
    : sql``
  const itemTypeFilter = p.itemType
    ? sql`AND pc.item_type = ${p.itemType}`
    : sql``
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const baseFilter = sql`
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
      AND i.invoice_date >= COALESCE(${p.periodStart ?? null}::date, ${p.periodEnd}::date - ${p.activeWindow ?? 0}::int * INTERVAL '1 month' + INTERVAL '1 day')
      AND i.invoice_date <= ${p.periodEnd}::date
      AND ii.product_category_id IS NOT NULL
      AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
      AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
      AND ${branchCond}
      AND ${divisionScopeCond}
      AND ${excludeIntercompanyCond}
      ${catFilter}
      ${itemTypeFilter}
  `

  const [rows, summaryRows] = await Promise.all([
    db.execute(sql`
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
      ${baseFilter}
      GROUP BY pr.id, pr.product_name, pc.id, pc.name
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT  ${p.perPage}
      OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT
        COUNT(DISTINCT pr.id)::int                                       AS product_count,
        COALESCE(SUM(ii.revenue), 0)::bigint                             AS total_revenue,
        COALESCE(SUM(ii.gross_profit), 0)::bigint                        AS total_gp,
        ROUND(SUM(ii.gross_profit) / NULLIF(SUM(ii.revenue), 0) * 100, 1) AS gp_margin_percent,
        COUNT(DISTINCT i.id)::int                                        AS invoice_count
      ${baseFilter}
    `),
  ])

  const productRows = (rows as unknown[]).map((r) => {
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

  const s = (summaryRows as unknown[])[0] as Record<string, unknown> | undefined
  const summary: CustomerProductsSummary = {
    product_count:     Number(s?.product_count     ?? 0),
    total_revenue:     Number(s?.total_revenue     ?? 0),
    total_gp:          Number(s?.total_gp          ?? 0),
    gp_margin_percent: Number(s?.gp_margin_percent ?? 0),
    invoice_count:     Number(s?.invoice_count     ?? 0),
  }

  return { rows: productRows, summary }
}
