import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

// ─── Params ───────────────────────────────────────────────────────────────────

export interface HmDetailRepoParams {
  cid: number
  companyScopeIds?: number[]
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  division?: string | null   // filter laporan - mirror business_unit di metrics lain
  excludeIntercompany?: boolean
  branchFilter?: number | null // filter laporan - mirror branch_id di metrics lain
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
}

export interface UpsellTargetRepoParams {
  cid: number
  companyScopeIds?: number[]
  periodEnd: string
  activeWindow: number
  businessUnit: string | null
  page: number
  perPage: number
  excludeIntercompany?: boolean
  branchFilter?: number | null // filter laporan - mirror branch_id di metrics lain
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
}

// ─── DB Row types ─────────────────────────────────────────────────────────────

export interface HmDetailDbRow {
  category_id: number
  category_name: string
  customer_count: number
  total_active_customers: number
  penetration_rate: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  total_count: number
}

export interface CategoryRef {
  id: number
  name: string
}

export interface UpsellTargetDbRow {
  id: number
  customer_code: string | null
  customer_name: string
  business_unit: string | null
  last_invoice_date: string
  avg_monthly_revenue: number
  relevance_score: number
  categories_bought: CategoryRef[]
  missing_high_margin_categories: CategoryRef[]
  total_count: number
}

// ─── Shared CTE template ──────────────────────────────────────────────────────

function hmCatsCte(cid: number, periodEnd: string, companyScopeIds: number[] | undefined) {
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', cid, companyScopeIds)
  return sql`
    hm_flags AS (
      SELECT
        hmp.product_id,
        COALESCE(hmp.product_category_id, p.product_category_id) AS product_category_id
      FROM high_margin_products hmp
      LEFT JOIN products p ON p.id = hmp.product_id
      WHERE hmp.effective_from             <= ${periodEnd}::date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${periodEnd}::date)
        AND ${companyCondHmp}
        AND COALESCE(hmp.product_category_id, p.product_category_id) IS NOT NULL
    ),
    hm_cats AS (
      SELECT DISTINCT product_category_id FROM hm_flags
    ),
    -- kategori yang ditandai LANGSUNG di level kategori (hmp.product_category_id
    -- terisi) - semua produk di kategori ini dihitung HM.
    hm_cat_level AS (
      SELECT DISTINCT product_category_id FROM hm_flags WHERE product_id IS NULL
    ),
    -- kategori yang ditandai per-produk (hmp.product_id terisi) - HANYA produk itu
    -- yang dihitung HM, bukan seluruh kategori. Mirror resolusi hm_products di
    -- category-products.repository.ts supaya angka baris kategori (penetrasi) dan
    -- angka drill-down produknya konsisten (sebelumnya baris kategori ikut menjumlah
    -- transaksi produk sibling yang tidak ditandai HM - laporan user 2026-07-26).
    hm_product_level AS (
      SELECT DISTINCT product_id, product_category_id FROM hm_flags WHERE product_id IS NOT NULL
    )
  `
}

// ─── 3.2a: High Margin Category Penetration ───────────────────────────────────

export async function fetchHmDetail(p: HmDetailRepoParams): Promise<HmDetailDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    ${hmCatsCte(p.cid, p.periodEnd, p.companyScopeIds)},
    active AS (
      SELECT DISTINCT i.customer_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    hm_items AS (
      SELECT
        ii.product_category_id,
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
        AND (
          ii.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
          OR ii.product_id       IN (SELECT product_id FROM hm_product_level)
        )
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    )
    SELECT
      pc.id                                                              AS category_id,
      pc.name                                                            AS category_name,
      COUNT(DISTINCT hi.customer_id)::int                                AS customer_count,
      (SELECT COUNT(*)::int FROM active)                                 AS total_active_customers,
      ROUND(
        COUNT(DISTINCT hi.customer_id)::numeric
          / NULLIF((SELECT COUNT(*) FROM active), 0) * 100, 1
      )                                                                  AS penetration_rate,
      COALESCE(SUM(hi.revenue), 0)::bigint                              AS total_revenue,
      COALESCE(SUM(hi.gp), 0)::bigint                                   AS total_gp,
      ROUND(SUM(hi.gp) / NULLIF(SUM(hi.revenue), 0) * 100, 1)          AS gp_margin_percent,
      COUNT(*) OVER ()::int                                              AS total_count
    FROM hm_cats hmc
    JOIN product_categories pc ON pc.id = hmc.product_category_id
    LEFT JOIN hm_items hi      ON hi.product_category_id = pc.id
    GROUP BY pc.id, pc.name
    ORDER BY penetration_rate DESC NULLS LAST
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      category_id:           Number(row.category_id),
      category_name:         String(row.category_name),
      customer_count:        Number(row.customer_count        ?? 0),
      total_active_customers: Number(row.total_active_customers ?? 0),
      penetration_rate:      Number(row.penetration_rate      ?? 0),
      total_revenue:         Number(row.total_revenue         ?? 0),
      total_gp:              Number(row.total_gp              ?? 0),
      gp_margin_percent:     Number(row.gp_margin_percent     ?? 0),
      total_count:           Number(row.total_count           ?? 0),
    }
  })
}

// ─── 3.2b: Upsell Targets ─────────────────────────────────────────────────────

export async function fetchUpsellTargets(p: UpsellTargetRepoParams): Promise<UpsellTargetDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    ${hmCatsCte(p.cid, p.periodEnd, p.companyScopeIds)},
    -- Top-2 business_unit per HM category berdasarkan jumlah distinct buyer
    hm_affinity AS (
      SELECT product_category_id, business_unit
      FROM (
        SELECT
          ii.product_category_id,
          c.business_unit,
          RANK() OVER (
            PARTITION BY ii.product_category_id
            ORDER BY COUNT(DISTINCT i.customer_id) DESC
          ) AS bu_rank
        FROM   invoice_items ii
        JOIN   invoices  i  ON i.id  = ii.invoice_id
        JOIN   customers c  ON c.id  = i.customer_id
        LEFT JOIN channel_divisions cd
          ON cd.channel_name = i.channel_name
          AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
        WHERE  i.deleted_at     IS NULL
          AND  c.is_placeholder  = false
          AND  ${companyCondI}
          AND  i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
          AND  i.invoice_date <= ${p.periodEnd}::date
          AND  c.business_unit  IS NOT NULL
          AND  ii.product_category_id IN (SELECT product_category_id FROM hm_cats)
          AND  (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
          AND  ${branchCond}
          AND  ${divisionScopeCond}
          AND  ${excludeIntercompanyCond}
        GROUP BY ii.product_category_id, c.business_unit
      ) ranked
      WHERE bu_rank <= 2
    ),
    customer_data AS (
      SELECT
        i.customer_id,
        ARRAY_AGG(DISTINCT ii.product_category_id)
          FILTER (WHERE ii.product_category_id IS NOT NULL)      AS cat_ids_bought,
        MAX(i.invoice_date)::text                                AS last_invoice_date,
        SUM(ii.revenue)::numeric                                 AS total_revenue,
        COUNT(DISTINCT DATE_TRUNC('month', i.invoice_date))::int AS active_months_count
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN customers    c  ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    )
    SELECT
      c.id,
      c.customer_code,
      c.customer_name,
      c.business_unit,
      cd.last_invoice_date,
      ROUND(cd.total_revenue / NULLIF(cd.active_months_count, 0), 0)::bigint AS avg_monthly_revenue,
      -- Jumlah missing HM categories yang business_unit-nya = top buyer segment customer ini
      (
        SELECT COUNT(*)
        FROM   hm_cats hmc_r
        WHERE  NOT (hmc_r.product_category_id = ANY(COALESCE(cd.cat_ids_bought, '{}')))
          AND  EXISTS (
            SELECT 1 FROM hm_affinity ha
            WHERE  ha.product_category_id = hmc_r.product_category_id
              AND  ha.business_unit       = c.business_unit
          )
      )::int                                                                   AS relevance_score,
      (
        SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name) ORDER BY pc.name), '[]'::json)
        FROM   UNNEST(COALESCE(cd.cat_ids_bought, '{}')) AS cat_id
        JOIN   product_categories pc ON pc.id = cat_id
      )                                                                        AS categories_bought,
      (
        SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name) ORDER BY pc.name), '[]'::json)
        FROM   hm_cats hmc2
        JOIN   product_categories pc ON pc.id = hmc2.product_category_id
        WHERE  NOT (hmc2.product_category_id = ANY(COALESCE(cd.cat_ids_bought, '{}')))
      )                                                                        AS missing_high_margin_categories,
      COUNT(*) OVER ()::int                                                    AS total_count
    FROM   customer_data cd
    JOIN   customers c ON c.id = cd.customer_id
    WHERE  NOT (
             (SELECT ARRAY_AGG(product_category_id) FROM hm_cats)
             <@ COALESCE(cd.cat_ids_bought, '{}')
           )
      AND  (${p.businessUnit}::text IS NULL OR c.business_unit = ${p.businessUnit}::text)
    ORDER  BY relevance_score DESC, avg_monthly_revenue DESC NULLS LAST
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id:                           Number(row.id),
      customer_code:                row.customer_code ? String(row.customer_code) : null,
      customer_name:                String(row.customer_name),
      business_unit:                row.business_unit ? String(row.business_unit) : null,
      last_invoice_date:            String(row.last_invoice_date ?? ''),
      avg_monthly_revenue:          Number(row.avg_monthly_revenue ?? 0),
      relevance_score:              Number(row.relevance_score ?? 0),
      categories_bought:            (row.categories_bought as CategoryRef[]) ?? [],
      missing_high_margin_categories: (row.missing_high_margin_categories as CategoryRef[]) ?? [],
      total_count:                  Number(row.total_count ?? 0),
    }
  })
}
