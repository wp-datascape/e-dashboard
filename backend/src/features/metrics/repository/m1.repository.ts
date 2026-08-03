import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import type { CrossSellingTrendRow, CrossSellingDetailRow, CrossSellingHeatmapRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

// active = new + active_existing = semua yang ada invoice dalam active_window (SSOT segment.helper)
const CS_INV_CTE = (p: SegmentParams) => sql`
  inv AS (
    SELECT DISTINCT i.id, i.customer_id, i.total_revenue::numeric AS total_revenue
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN channel_divisions cd
      ON  cd.channel_name  = i.channel_name
      AND cd.company_id = i.company_id
    WHERE i.deleted_at IS NULL
      AND c.is_placeholder = false
      AND i.invoice_date >  ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
      AND i.invoice_date <= ${p.filterDate}::date
      AND ${buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)}
      AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
      AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
      AND ${buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)}
      AND ${buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)}
      AND ${buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)}
  )
`

export async function fetchCrossSellingKPI(p: SegmentParams) {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p)},
    cc AS (
      SELECT
        inv.customer_id,
        COUNT(DISTINCT ii.product_category_id) AS cat_count
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      WHERE ii.product_category_id IS NOT NULL
      GROUP BY inv.customer_id
    )
    SELECT
      COUNT(*)::int                                                         AS active_count,
      COUNT(*) FILTER (WHERE cat_count > 1)::int                           AS multi_cat_count,
      ROUND(
        COUNT(*) FILTER (WHERE cat_count > 1)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
      )                                                                     AS multi_cat_rate,
      ROUND(AVG(cat_count)::numeric, 2)                                     AS avg_categories,
      (
        SELECT COUNT(DISTINCT ii2.product_category_id)::int
        FROM inv
        JOIN invoice_items ii2 ON ii2.invoice_id = inv.id
        WHERE ii2.product_category_id IS NOT NULL
      )                                                                     AS total_distinct_cats
    FROM cc
  `)
  const row = ((rawRows as unknown[])[0] ?? {}) as Record<string, unknown>
  return {
    active_count:        Number(row.active_count        ?? 0),
    multi_cat_count:     Number(row.multi_cat_count     ?? 0),
    multi_cat_rate:      Number(row.multi_cat_rate      ?? 0),
    avg_categories:      Number(row.avg_categories      ?? 0),
    total_distinct_cats: Number(row.total_distinct_cats ?? 0),
  }
}

export async function fetchCrossSellingTrend(p: SegmentParams): Promise<CrossSellingTrendRow[]> {
  const rawRows = await db.execute(sql`
    WITH
    months AS (
      SELECT
        TO_CHAR(m, 'YYYY-MM') AS label,
        (date_trunc('month', m) + INTERVAL '1 month' - INTERVAL '1 day')::date AS me
      FROM generate_series(
        date_trunc('month', ${p.filterDate}::date - INTERVAL '11 months'),
        date_trunc('month', ${p.filterDate}::date),
        INTERVAL '1 month'
      ) AS m
    ),
    base AS (
      SELECT
        i.customer_id,
        i.invoice_date,
        ii.product_category_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN channel_divisions cd
        ON  cd.channel_name  = i.channel_name
        AND cd.company_id = i.company_id
      WHERE i.deleted_at IS NULL
        AND c.is_placeholder = false
        AND i.invoice_date >  ${p.filterDate}::date - INTERVAL '12 months'
        AND i.invoice_date <= ${p.filterDate}::date
        AND ${buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)}
        AND ${buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)}
        AND ${buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)}
        AND ii.product_category_id IS NOT NULL
    ),
    monthly AS (
      SELECT
        m.label,
        b.customer_id,
        COUNT(DISTINCT b.product_category_id) AS cat_count
      FROM months m
      JOIN base b ON b.invoice_date > m.me - ${p.activeMonths}::int * INTERVAL '1 month'
                 AND b.invoice_date <= m.me
      GROUP BY m.label, b.customer_id
    ),
    -- Agregasi per bulan sebelum LEFT JOIN ke months agar bulan tanpa transaksi tetap muncul (nilai 0)
    agg AS (
      SELECT
        label,
        COUNT(*)::int                                                    AS total_active,
        COUNT(*) FILTER (WHERE cat_count > 1)::int                      AS multi_product,
        ROUND(COUNT(*) FILTER (WHERE cat_count > 1)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1)                               AS ratio,
        ROUND(AVG(cat_count)::numeric, 2)                               AS avg_category
      FROM monthly
      GROUP BY label
    )
    SELECT
      m.label                          AS month,
      COALESCE(a.total_active,  0)     AS total_active,
      COALESCE(a.multi_product, 0)     AS multi_product,
      COALESCE(a.ratio,         0)     AS ratio,
      COALESCE(a.avg_category,  0)     AS avg_category
    FROM months m
    LEFT JOIN agg a ON a.label = m.label
    ORDER BY m.label
  `)
  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      month:         String(row.month),
      total_active:  Number(row.total_active  ?? 0),
      multi_product: Number(row.multi_product ?? 0),
      ratio:         Number(row.ratio         ?? 0),
      avg_category:  Number(row.avg_category  ?? 0),
    }
  })
}

export async function fetchCrossSellingDetail(p: SegmentParams): Promise<CrossSellingDetailRow[]> {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p)},
    cc AS (
      SELECT
        inv.customer_id,
        COUNT(DISTINCT ii.product_category_id)  AS cat_count,
        SUM(ii.revenue::numeric)                AS total_revenue,
        BOOL_OR(pc.item_type = 'unit')          AS has_unit,
        BOOL_OR(pc.item_type = 'consumable')    AS has_consumable,
        BOOL_OR(pc.item_type = 'sparepart')     AS has_sparepart
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      LEFT JOIN product_categories pc ON pc.id = ii.product_category_id
      WHERE ii.product_category_id IS NOT NULL
      GROUP BY inv.customer_id
    )
    SELECT
      c.id                       AS customer_id,
      c.customer_code,
      c.customer_name,
      cc.cat_count::int          AS category_count,
      cc.has_unit,
      cc.has_consumable,
      cc.has_sparepart,
      cc.total_revenue::bigint   AS total_revenue
    FROM cc
    JOIN customers c ON c.id = cc.customer_id
    ORDER BY cat_count DESC, total_revenue DESC
  `)
  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      customer_id:    Number(row.customer_id),
      customer_code:  row.customer_code ? String(row.customer_code) : null,
      customer_name:  String(row.customer_name),
      category_count: Number(row.category_count ?? 0),
      has_unit:       Boolean(row.has_unit),
      has_consumable: Boolean(row.has_consumable),
      has_sparepart:  Boolean(row.has_sparepart),
      total_revenue:  Number(row.total_revenue ?? 0),
    }
  })
}

export async function fetchCrossSellingHeatmap(p: SegmentParams): Promise<{
  heatmap: CrossSellingHeatmapRow[]
  categories: string[]
}> {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p)},
    type_counts AS (
      SELECT pc.item_type AS name, COUNT(*) AS freq
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      JOIN product_categories pc ON pc.id = ii.product_category_id
      WHERE pc.item_type IS NOT NULL
      GROUP BY pc.item_type
      ORDER BY freq DESC
    ),
    -- Seleksi + urutan 30 customer = total revenue gabungan semua kategori (unit+
    -- sparepart+consumable), terbesar dulu. Dulu pakai type_count (jumlah kategori
    -- berbeda) DESC lalu tx_count DESC - hasilnya customer dengan 1 transaksi di 3
    -- kategori (total 3 tx) ranking di atas customer dengan 13 transaksi tapi cuma 2
    -- kategori, jelas tidak masuk akal secara bisnis. Laporan user 2026-07-23.
    top_customers AS (
      SELECT inv.customer_id, SUM(inv.total_revenue) AS revenue
      FROM inv
      GROUP BY inv.customer_id
      ORDER BY revenue DESC
      LIMIT 30
    )
    SELECT
      tc.customer_id     AS customer_id,
      c.customer_name    AS customer,
      pc.item_type       AS category,
      COUNT(*)::int      AS purchase_count,
      SUM(ii.revenue)    AS category_revenue,
      tc2.freq           AS cat_freq,
      tc.revenue         AS customer_total_revenue
    FROM top_customers tc
    JOIN customers c ON c.id = tc.customer_id
    JOIN inv         ON inv.customer_id = tc.customer_id
    JOIN invoice_items ii ON ii.invoice_id = inv.id
    JOIN product_categories pc ON pc.id = ii.product_category_id
    JOIN type_counts tc2 ON tc2.name = pc.item_type
    WHERE pc.item_type IS NOT NULL
    GROUP BY tc.customer_id, c.customer_name, pc.item_type, tc2.freq, tc.revenue
    ORDER BY tc.revenue DESC, c.customer_name, tc2.freq DESC
  `)

  const catFreqMap = new Map<string, number>()
  const customerMap = new Map<string, Record<string, number>>()
  const customerRevenueMap = new Map<string, Record<string, number>>()
  const customerTotalRevenue = new Map<string, number>()
  const customerIdMap = new Map<string, number>()

  for (const r of rawRows as unknown[]) {
    const row = r as Record<string, unknown>
    const customer   = String(row.customer)
    const customerId = Number(row.customer_id)
    const category  = String(row.category)
    const count     = Number(row.purchase_count ?? 0)
    const revenue   = Number(row.category_revenue ?? 0)
    const freq      = Number(row.cat_freq ?? 0)
    const totalRev  = Number(row.customer_total_revenue ?? 0)
    if (!catFreqMap.has(category)) catFreqMap.set(category, freq)
    if (!customerMap.has(customer)) customerMap.set(customer, {})
    if (!customerRevenueMap.has(customer)) customerRevenueMap.set(customer, {})
    customerMap.get(customer)![category] = count
    customerRevenueMap.get(customer)![category] = revenue
    customerTotalRevenue.set(customer, totalRev)
    customerIdMap.set(customer, customerId)
  }

  const categories = [...catFreqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  const heatmap: CrossSellingHeatmapRow[] = [...customerMap.entries()].map(([customer, values]) => ({
    customer,
    customer_id: customerIdMap.get(customer) ?? 0,
    values,
    revenues: customerRevenueMap.get(customer) ?? {},
    total_revenue: customerTotalRevenue.get(customer) ?? 0,
  }))

  return { heatmap, categories }
}
