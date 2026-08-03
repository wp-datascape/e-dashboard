import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'
import type { AssignToDivision } from './high-margin-penetration.repository'

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
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
  // Task008 — filter ke produk yang BENAR-BENAR ditandai high margin di tabel
  // high_margin_products (bukan cuma "pernah terjual di kategori ini"). Opsional
  // (default false) karena query yang sama dipakai juga di tab Target Upsell &
  // halaman Products biasa, yang sengaja tetap tampilkan semua produk kategori.
  onlyHighMargin?: boolean
  division?: number | null   // filter laporan - mirror division di high-margin-penetration.repository.ts
  branchFilter?: number | null // filter laporan - mirror branch_id di high-margin-penetration.repository.ts
}

export interface CategoryProductDbRow {
  product_id: number
  product_name: string
  is_high_margin: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  total_count: number
  // "Assign To" (task017) — MENTAH, belum di-filter scope viewer, lihat catatan
  // hm_product_assign_to di categoryProductsCte(). Filter RBAC di service layer.
  assign_to: AssignToDivision[]
}

export interface CategoryProductsSummary {
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
}

export interface CategoryProductsResult {
  rows: CategoryProductDbRow[]
  summary: CategoryProductsSummary
}

// CTE bersama (hm_products + items) dipakai 2 query terpisah di bawah - daftar
// produk per-halaman DAN summary keseluruhan (Task008). Summary WAJIB query
// terpisah (bukan cuma scalar subquery nempel di baris per-produk) karena kalau
// hasil per-produk kosong (0 baris, mis. kategori tanpa produk HM efektif di
// periode ini), scalar subquery yang nempel di baris tidak akan pernah jalan -
// summary tetap harus balikin 0, bukan hilang/undefined.
function categoryProductsCte(p: CategoryProductsRepoParams) {
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', p.cid, p.companyScopeIds)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  // Task008 — kalau onlyHighMargin, batasi ke produk yang EFEKTIF high margin di
  // kategori ini pada periodEnd: ditandai langsung per-produk (hmp.product_id),
  // ATAU seluruh kategori ditandai (hmp.product_category_id) - mirror resolusi
  // yang sama dipakai hmCatsCte di high-margin-penetration.repository.ts, tapi
  // di sini resolve ke product_id karena butuh daftar produk, bukan kategori.
  const onlyHmCond = p.onlyHighMargin
    ? sql`ii.product_id IN (SELECT product_id FROM hm_products)`
    : sql`TRUE`

  // divisionTagCond (task017) — mirror hmCatsCte di high-margin-penetration.
  // repository.ts: kalau ada filter divisi aktif, flag HM (baik per-produk maupun
  // per-kategori) HARUS ADA di-tag ke divisi itu di high_margin_product_divisions
  // supaya dihitung — bukan cuma flag company-wide. is_high_margin (dipakai
  // SEMUA caller, bukan cuma onlyHighMargin) ikut division-aware juga, supaya
  // konsisten dgn angka kategori di hmCatsCte (mirror task007/008: baris kategori
  // & drill-down produknya harus selalu sinkron).
  const divisionTagCond = division != null
    ? sql`AND EXISTS (SELECT 1 FROM high_margin_product_divisions hmd WHERE hmd.high_margin_product_id = hmp.id AND hmd.division_id = ${division}::int)`
    : sql``

  return sql`
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
              ${divisionTagCond}
          )
          OR EXISTS (
            SELECT 1 FROM high_margin_products hmp
            WHERE hmp.product_category_id = ${p.categoryId}::int
              AND ${companyCondHmp}
              AND hmp.effective_from <= ${p.periodEnd}::date
              AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
              ${divisionTagCond}
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
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ii.product_category_id = ${p.categoryId}::int
        AND ${onlyHmCond}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    -- "Assign To" (task017) — union divisi dari flag yang berlaku ke produk ini
    -- (langsung per-produk ATAU warisan dari flag category-level), MENTAH/belum
    -- di-filter scope viewer (sama seperti hm_cat_assign_to di high-margin-
    -- penetration.repository.ts — filter RBAC di service layer). jsonb_agg
    -- (BUKAN json_agg) — dipakai di GROUP BY outer query, tipe json tidak
    -- punya operator kesetaraan.
    hm_product_assign_to AS (
      SELECT
        product_id,
        jsonb_agg(jsonb_build_object('id', division_id, 'label', label) ORDER BY label) AS divisions
      FROM (
        SELECT DISTINCT pr.id AS product_id, hmd.division_id, d.label
        FROM products pr
        JOIN high_margin_products hmp
          ON (hmp.product_id = pr.id OR hmp.product_category_id = pr.product_category_id)
          AND ${companyCondHmp}
          AND hmp.effective_from <= ${p.periodEnd}::date
          AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${p.periodEnd}::date)
        JOIN high_margin_product_divisions hmd ON hmd.high_margin_product_id = hmp.id
        JOIN divisions d ON d.id = hmd.division_id
        WHERE pr.product_category_id = ${p.categoryId}::int
      ) dedup
      GROUP BY product_id
    )
  `
}

export async function fetchCategoryProducts(
  p: CategoryProductsRepoParams,
): Promise<CategoryProductsResult> {
  const offset = (p.page - 1) * p.perPage
  const cte = categoryProductsCte(p)

  const [rows, summaryRows] = await Promise.all([
    db.execute(sql`
      ${cte}
      SELECT
        pr.id                                                    AS product_id,
        pr.product_name,
        pr.id IN (SELECT product_id FROM hm_products)            AS is_high_margin,
        SUM(items.revenue)::bigint                               AS total_revenue,
        SUM(items.gp)::bigint                                    AS total_gp,
        ROUND(SUM(items.gp) / NULLIF(SUM(items.revenue), 0) * 100, 1) AS gp_margin_percent,
        COUNT(DISTINCT items.invoice_id)::int                    AS invoice_count,
        COUNT(DISTINCT items.customer_id)::int                   AS customer_count,
        COALESCE(hpat.divisions, '[]')                            AS assign_to,
        COUNT(*) OVER ()::int                                    AS total_count
      FROM items
      JOIN products pr ON pr.id = items.product_id
      LEFT JOIN hm_product_assign_to hpat ON hpat.product_id = pr.id
      GROUP BY pr.id, pr.product_name, hpat.divisions
      ORDER BY total_revenue DESC
      LIMIT  ${p.perPage}
      OFFSET ${offset}
    `),
    db.execute(sql`
      ${cte}
      SELECT
        COALESCE(SUM(revenue), 0)::bigint                        AS total_revenue,
        COALESCE(SUM(gp), 0)::bigint                              AS total_gp,
        ROUND(SUM(gp) / NULLIF(SUM(revenue), 0) * 100, 1)        AS gp_margin_percent,
        COUNT(DISTINCT invoice_id)::int                          AS invoice_count,
        COUNT(DISTINCT customer_id)::int                         AS customer_count
      FROM items
    `),
  ])

  const productRows = (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_id:        Number(row.product_id),
      product_name:      String(row.product_name),
      is_high_margin:    Boolean(row.is_high_margin),
      total_revenue:     Number(row.total_revenue    ?? 0),
      total_gp:          Number(row.total_gp         ?? 0),
      gp_margin_percent: Number(row.gp_margin_percent ?? 0),
      invoice_count:     Number(row.invoice_count    ?? 0),
      customer_count:    Number(row.customer_count   ?? 0),
      assign_to:          ((row.assign_to as AssignToDivision[]) ?? []),
      total_count:       Number(row.total_count      ?? 0),
    }
  })

  const s = (summaryRows as unknown[])[0] as Record<string, unknown> | undefined
  const summary: CategoryProductsSummary = {
    total_revenue:     Number(s?.total_revenue     ?? 0),
    total_gp:          Number(s?.total_gp          ?? 0),
    gp_margin_percent: Number(s?.gp_margin_percent ?? 0),
    invoice_count:     Number(s?.invoice_count     ?? 0),
    customer_count:    Number(s?.customer_count    ?? 0),
  }

  return { rows: productRows, summary }
}
