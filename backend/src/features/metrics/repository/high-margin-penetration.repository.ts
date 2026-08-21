import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildCompanyConditionRaw } from '@/utils/scope'
import { resolveInvoiceScopeConditions } from '../segment.helper'

// ─── Params ───────────────────────────────────────────────────────────────────

export interface HmDetailRepoParams {
  cid: number
  companyScopeIds?: number[]
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  division?: number | null   // filter laporan - mirror business_unit di metrics lain
  excludeIntercompany?: boolean
  branchFilter?: number | null // filter laporan - mirror branch_id di metrics lain
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
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
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
}

// ─── DB Row types ─────────────────────────────────────────────────────────────

export interface AssignToDivision {
  id: number
  label: string
}

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
  // "Assign To" (task017) — MENTAH, belum di-filter scope viewer, lihat catatan
  // hm_cat_assign_to di hmCatsCte(). Filter RBAC dilakukan service layer.
  assign_to: AssignToDivision[]
}

export interface CategoryRef {
  id: number
  name: string
}

export interface HmProductDbRow {
  product_id: number
  product_name: string
  category_id: number
  category_name: string
  customer_count: number
  total_active_customers: number
  penetration_rate: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  total_count: number
  assign_to: AssignToDivision[]
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

// divisionId (task017) — kalau terisi, hm_flags DI-INTERSECT ke high_margin_
// product_divisions (produk/kategori ini HARUS di-tag fokus utk divisi itu, bukan
// cuma flag company-wide) — dipakai fetchHmDetail (Category Penetration) SAJA.
// fetchUpsellTargets SENGAJA SELALU panggil dgn null (di luar scope task017,
// tetap company-wide) — lihat catatan di pemanggilnya.
function hmCatsCte(cid: number, periodEnd: string, companyScopeIds: number[] | undefined, divisionId: number | null) {
  const companyCondHmp = buildCompanyConditionRaw('hmp.company_id', cid, companyScopeIds)
  const divisionTagCond = divisionId != null
    ? sql`AND EXISTS (SELECT 1 FROM high_margin_product_divisions hmd WHERE hmd.high_margin_product_id = hmp.id AND hmd.division_id = ${divisionId}::int)`
    : sql``
  return sql`
    hm_flags AS (
      SELECT
        hmp.id AS hmp_id,
        hmp.product_id,
        COALESCE(hmp.product_category_id, p.product_category_id) AS product_category_id
      FROM high_margin_products hmp
      LEFT JOIN products p ON p.id = hmp.product_id
      WHERE hmp.effective_from             <= ${periodEnd}::date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= ${periodEnd}::date)
        AND ${companyCondHmp}
        AND COALESCE(hmp.product_category_id, p.product_category_id) IS NOT NULL
        ${divisionTagCond}
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
    ),
    -- "Assign To" (task017) — union semua divisi yang di-tag ke SETIAP flag yang
    -- resolve ke kategori ini (baik category-level maupun product-level flag di
    -- dalamnya), MENTAH/belum di-filter scope viewer — filter RBAC (divisi di
    -- luar scope viewer TIDAK PERNAH ditampilkan) dilakukan di SERVICE layer,
    -- bukan di sini (butuh divisionScope Map, lebih gampang di JS daripada SQL).
    -- jsonb_agg (BUKAN json_agg) — hasilnya dipakai di GROUP BY outer query,
    -- tipe json tidak punya operator kesetaraan (error "could not identify
    -- an equality operator for type json"), jsonb punya.
    hm_cat_assign_to AS (
      SELECT
        product_category_id,
        jsonb_agg(jsonb_build_object('id', division_id, 'label', label) ORDER BY label) AS divisions
      FROM (
        SELECT DISTINCT hf.product_category_id, hmd.division_id, d.label
        FROM hm_flags hf
        JOIN high_margin_product_divisions hmd ON hmd.high_margin_product_id = hf.hmp_id
        JOIN divisions d ON d.id = hmd.division_id
      ) dedup
      GROUP BY product_category_id
    )
  `
}

// ─── 3.2a: High Margin Category Penetration ───────────────────────────────────

export async function fetchHmDetail(p: HmDetailRepoParams): Promise<HmDetailDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    ${hmCatsCte(p.cid, p.periodEnd, p.companyScopeIds, division)},
    active AS (
      SELECT DISTINCT i.customer_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
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
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (
          ii.product_category_id IN (SELECT product_category_id FROM hm_cat_level)
          OR ii.product_id       IN (SELECT product_id FROM hm_product_level)
        )
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
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
      COALESCE(hcat.divisions, '[]')                                      AS assign_to,
      COUNT(*) OVER ()::int                                              AS total_count
    FROM hm_cats hmc
    JOIN product_categories pc ON pc.id = hmc.product_category_id
    LEFT JOIN hm_items hi      ON hi.product_category_id = pc.id
    LEFT JOIN hm_cat_assign_to hcat ON hcat.product_category_id = pc.id
    GROUP BY pc.id, pc.name, hcat.divisions
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
      assign_to:              ((row.assign_to as AssignToDivision[]) ?? []),
      total_gp:              Number(row.total_gp              ?? 0),
      gp_margin_percent:     Number(row.gp_margin_percent     ?? 0),
      total_count:           Number(row.total_count           ?? 0),
    }
  })
}

// ─── 3.2a-flat: High Margin Product Penetration ───────────────────────────────
//
// task017 lanjutan — user tegas: "product high margin adalah produk, bukan
// kategory". Data flag di high_margin_products SELALU per-produk (product_id
// terisi, product_category_id kosong) — 0 dari 11 flag live yang product-level
// menandai satu kategori penuh. Baris kategori di fetchHmDetail() menyamarkan
// itu (1 baris kategori mewakili 1 produk spesifik, tapi labelnya nama
// kategori). fetchHmProductDetail() jadi VIEW DEFAULT baru: 1 baris = 1 produk,
// mirror resolusi hm_product_level/hm_cat_level yang sama dgn hmCatsCte supaya
// angka konsisten dgn baris kategori (kalau kategori jadi opsi sekunder).
export async function fetchHmProductDetail(p: HmDetailRepoParams): Promise<HmProductDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    ${hmCatsCte(p.cid, p.periodEnd, p.companyScopeIds, division)},
    active AS (
      SELECT DISTINCT i.customer_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    -- Produk efektif HM: langsung per-produk (hm_product_level), ATAU seluruh
    -- produk di kategori yang ditandai level-kategori (hm_cat_level) - mirror
    -- filter hm_items di fetchHmDetail() supaya total per kategori = jumlah
    -- baris produk turunannya.
    hm_effective_products AS (
      SELECT DISTINCT product_id, product_category_id FROM hm_product_level
      UNION
      SELECT pr.id AS product_id, pr.product_category_id
      FROM products pr
      JOIN hm_cat_level hcl ON hcl.product_category_id = pr.product_category_id
    ),
    hm_items AS (
      SELECT
        ii.product_id,
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
        AND ii.product_id IN (SELECT product_id FROM hm_effective_products)
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    -- "Assign To" per produk - union divisi dari flag yang berlaku (langsung
    -- per-produk ATAU warisan flag category-level, BUKAN dari flag product-level
    -- produk lain yang kebetulan 1 kategori - hf.product_id IS NULL menjaga
    -- guard itu, sama seperti hm_product_assign_to di category-products.repository.ts).
    hm_product_assign_to_flat AS (
      SELECT
        product_id,
        jsonb_agg(jsonb_build_object('id', division_id, 'label', label) ORDER BY label) AS divisions
      FROM (
        SELECT DISTINCT hep.product_id, hmd.division_id, d.label
        FROM hm_effective_products hep
        JOIN hm_flags hf
          ON hf.product_id = hep.product_id
          OR (hf.product_id IS NULL AND hf.product_category_id = hep.product_category_id)
        JOIN high_margin_product_divisions hmd ON hmd.high_margin_product_id = hf.hmp_id
        JOIN divisions d ON d.id = hmd.division_id
      ) dedup
      GROUP BY product_id
    )
    SELECT
      pr.id                                                              AS product_id,
      pr.product_name,
      pr.product_category_id                                            AS category_id,
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
      COALESCE(hpat.divisions, '[]')                                     AS assign_to,
      COUNT(*) OVER ()::int                                              AS total_count
    FROM hm_effective_products hep
    JOIN products pr ON pr.id = hep.product_id
    LEFT JOIN product_categories pc ON pc.id = pr.product_category_id
    LEFT JOIN hm_items hi           ON hi.product_id = pr.id
    LEFT JOIN hm_product_assign_to_flat hpat ON hpat.product_id = pr.id
    GROUP BY pr.id, pr.product_name, pr.product_category_id, pc.name, hpat.divisions
    ORDER BY penetration_rate DESC NULLS LAST
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      product_id:             Number(row.product_id),
      product_name:           String(row.product_name),
      category_id:            Number(row.category_id),
      category_name:          String(row.category_name),
      customer_count:         Number(row.customer_count         ?? 0),
      total_active_customers: Number(row.total_active_customers ?? 0),
      penetration_rate:       Number(row.penetration_rate       ?? 0),
      total_revenue:          Number(row.total_revenue          ?? 0),
      total_gp:               Number(row.total_gp               ?? 0),
      gp_margin_percent:      Number(row.gp_margin_percent      ?? 0),
      assign_to:              ((row.assign_to as AssignToDivision[]) ?? []),
      total_count:            Number(row.total_count            ?? 0),
    }
  })
}

// ─── 3.2b: Upsell Targets ─────────────────────────────────────────────────────

export async function fetchUpsellTargets(p: UpsellTargetRepoParams): Promise<UpsellTargetDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p)
  const branchFilter = p.branchFilter ?? null

  const rows = await db.execute(sql`
    WITH
    ${hmCatsCte(p.cid, p.periodEnd, p.companyScopeIds, null)},
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
          AND cd.company_id = i.company_id
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
        AND cd.company_id = i.company_id
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
