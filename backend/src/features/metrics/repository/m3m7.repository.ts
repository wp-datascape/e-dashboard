import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { RevenueBreakdownRow, ExpansionBreakdownRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export type TrendRow = {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  gp_tier1: number
  gp_tier2: number
  gp_tier3: number
  top_gp_customer_id: number | null
  top_gp_customer_name: string | null
  top_gp_revenue: number
  top_gp_pct: number
  high_margin_ratio: number
  repeat_order_rate: number
  expansion_rate: number
  active_existing_count: number
  active_new_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
}

/**
 * Tren 12 bulan untuk M3–M7.
 *
 * existing = ada invoice dalam dormantMonths sebelum akhir bulan, bukan customer baru
 * active   = ada invoice dalam activeMonths sebelum akhir bulan (subset existing)
 */
export async function fetchCustomerMetricsTrend(p: SegmentParams): Promise<TrendRow[]> {
  const { cid, filterDate, activeMonths, dormantMonths, division, branchScope, divisionScope, companyScopeIds } = p
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)

  const rows = await db.execute(sql`
    WITH
    months AS (
      SELECT generate_series(
        date_trunc('month', ${filterDate}::date) - INTERVAL '11 months',
        date_trunc('month', ${filterDate}::date),
        INTERVAL '1 month'
      )::date AS ms
    ),

    -- First invoice per customer (global, tanpa filter divisi) — untuk deteksi customer baru
    first_inv AS (
      SELECT customer_id, MIN(invoice_date) AS first_date
      FROM invoices
      WHERE deleted_at IS NULL
      GROUP BY customer_id
    ),

    -- Semua invoice relevan: dari 11 bulan lalu - dormantMonths, sampai akhir bulan filter
    raw_inv AS (
      SELECT i.id AS invoice_id, i.customer_id, i.invoice_date,
             i.total_revenue::numeric AS rev,
             i.total_gp::numeric      AS gp
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND i.invoice_date >= date_trunc('month', ${filterDate}::date)
                              - INTERVAL '11 months'
                              - ${dormantMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= (date_trunc('month', ${filterDate}::date)
                              + INTERVAL '1 month'
                              - INTERVAL '1 day')
    ),

    -- Invoice HM relevan: dari 11 bulan lalu - activeMonths, sampai akhir bulan filter
    hm_raw AS (
      SELECT DISTINCT i.customer_id, i.invoice_date
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN high_margin_products hmp ON (
        hmp.company_id = i.company_id
        AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
      )
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND i.invoice_date >= date_trunc('month', ${filterDate}::date)
                              - INTERVAL '11 months'
                              - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= (date_trunc('month', ${filterDate}::date)
                              + INTERVAL '1 month'
                              - INTERVAL '1 day')
    ),

    -- Existing customers per bulan: ada invoice dalam dormantMonths, bukan customer baru
    existing AS (
      SELECT DISTINCT c.id, m.ms
      FROM customers c
      CROSS JOIN months m
      JOIN first_inv fi ON fi.customer_id = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        -- not new: first invoice sebelum active cutoff bulan ini
        AND fi.first_date < (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                            - ${activeMonths}::int * INTERVAL '1 month'
        AND EXISTS (
          SELECT 1 FROM raw_inv ri
          WHERE ri.customer_id = c.id
            AND ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                                   - ${dormantMonths}::int * INTERVAL '1 month'
            AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
        )
    ),

    -- Revenue + GP per existing customer per bulan (window: activeMonths sebelum akhir bulan)
    active_inv_agg AS (
      SELECT e.ms, ri.customer_id, SUM(ri.rev) AS rev, SUM(ri.gp) AS gp
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeMonths}::int * INTERVAL '1 month'
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
    ),

    -- M7: revenue per existing customer di activeMonths SEBELUM active window
    prev_inv_agg AS (
      SELECT e.ms, ri.customer_id, SUM(ri.rev) AS rev
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - (${activeMonths}::int * 2) * INTERVAL '1 month'
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                               - ${activeMonths}::int * INTERVAL '1 month'
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
    ),

    -- M6: existing customer yang order lebih dari 1x dalam active window
    repeat_orders AS (
      SELECT e.ms, ri.customer_id
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeMonths}::int * INTERVAL '1 month'
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
      HAVING COUNT(DISTINCT ri.invoice_id) > 1
    ),

    -- M5: existing customer yang beli HM dalam activeMonths sebelum akhir bulan
    hm AS (
      SELECT DISTINCT e.ms, hr.customer_id
      FROM hm_raw hr
      JOIN months m ON
        hr.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeMonths}::int * INTERVAL '1 month'
        AND hr.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = hr.customer_id AND e.ms = m.ms
    ),

    -- New customers per bulan: first invoice dalam active window
    new_cust AS (
      SELECT DISTINCT c.id, m.ms
      FROM customers c
      CROSS JOIN months m
      JOIN first_inv fi ON fi.customer_id = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND fi.first_date >= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                            - ${activeMonths}::int * INTERVAL '1 month'
        AND fi.first_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
        AND EXISTS (
          SELECT 1 FROM raw_inv ri
          WHERE ri.customer_id = c.id
            AND ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                                   - ${activeMonths}::int * INTERVAL '1 month'
            AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
        )
    ),

    -- Pre-aggregated new customer count — hindari cartesian product di main SELECT
    new_cust_cnt AS (
      SELECT ms, COUNT(DISTINCT id)::int AS cnt
      FROM new_cust
      GROUP BY ms
    ),

    -- Active existing count + median revenue per bulan (M3 enrichment)
    monthly_extras AS (
      SELECT ms,
        COUNT(*)::int AS active_existing_count,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rev))::bigint AS median_revenue
      FROM active_inv_agg
      GROUP BY ms
    ),

    -- Top revenue contributor per bulan
    top_contrib AS (
      SELECT DISTINCT ON (ms)
        ms, customer_id, rev AS top_rev,
        ROUND(rev * 100.0 / NULLIF(SUM(rev) OVER (PARTITION BY ms), 0), 1) AS top_pct
      FROM active_inv_agg
      ORDER BY ms, rev DESC
    ),

    -- Median GP per bulan (M4 tier threshold)
    gp_median_per_month AS (
      SELECT ms, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gp) AS gp_median_threshold
      FROM active_inv_agg
      GROUP BY ms
    ),

    -- GP tier breakdown per bulan
    gp_tier_breakdown AS (
      SELECT
        ai.ms,
        SUM(CASE WHEN ai.gp >  gm.gp_median_threshold            THEN ai.gp ELSE 0 END) AS tier1_gp,
        SUM(CASE WHEN ai.gp <= gm.gp_median_threshold
                 AND ai.gp >  gm.gp_median_threshold * 0.5       THEN ai.gp ELSE 0 END) AS tier2_gp,
        SUM(CASE WHEN ai.gp <= gm.gp_median_threshold * 0.5      THEN ai.gp ELSE 0 END) AS tier3_gp
      FROM active_inv_agg ai
      JOIN gp_median_per_month gm ON gm.ms = ai.ms
      GROUP BY ai.ms
    ),

    -- Top GP contributor per bulan
    top_contrib_gp AS (
      SELECT DISTINCT ON (ms)
        ms, customer_id, gp AS top_gp,
        ROUND(gp * 100.0 / NULLIF(SUM(gp) OVER (PARTITION BY ms), 0), 1) AS top_gp_pct
      FROM active_inv_agg
      ORDER BY ms, gp DESC
    )

    SELECT
      TO_CHAR(m.ms, 'YYYY-MM') AS month,

      COUNT(DISTINCT e.id)::int AS existing_customers,

      COALESCE(SUM(cur.rev), 0) AS total_revenue_existing,

      ROUND(
        COALESCE(SUM(cur.rev), 0) / NULLIF(COUNT(DISTINCT e.id), 0), 0
      ) AS avg_revenue,

      ROUND(
        COALESCE(SUM(cur.gp), 0) / NULLIF(COUNT(DISTINCT e.id), 0), 0
      ) AS avg_gross_profit,

      ROUND(
        COUNT(DISTINCT hmr.customer_id)::numeric * 100
        / NULLIF(COUNT(DISTINCT e.id), 0), 1
      ) AS high_margin_ratio,

      ROUND(
        COUNT(DISTINCT ro.customer_id)::numeric * 100
        / NULLIF(COUNT(DISTINCT e.id), 0), 1
      ) AS repeat_order_rate,

      -- M7: existing yang spend naik vs periode sebelumnya
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0)
          THEN e.id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT e.id), 0), 1
      ) AS expansion_rate,

      COALESCE(MAX(me.active_existing_count), 0)::int AS active_existing_count,
      COALESCE(MAX(ncc.cnt), 0)::int                   AS active_new_count,
      COALESCE(MAX(me.median_revenue), 0)             AS median_revenue,
      MAX(tc.customer_id)                            AS top_customer_id,
      MAX(cust_top.customer_name)                    AS top_customer_name,
      COALESCE(MAX(ROUND(tc.top_rev)), 0)            AS top_customer_revenue,
      COALESCE(MAX(tc.top_pct), 0)                  AS top_customer_pct,
      COALESCE(MAX(gtb.tier1_gp), 0)                AS gp_tier1,
      COALESCE(MAX(gtb.tier2_gp), 0)                AS gp_tier2,
      COALESCE(MAX(gtb.tier3_gp), 0)                AS gp_tier3,
      MAX(tcg.customer_id)                           AS top_gp_customer_id,
      MAX(cust_top_gp.customer_name)                 AS top_gp_customer_name,
      COALESCE(MAX(ROUND(tcg.top_gp)), 0)            AS top_gp_revenue,
      COALESCE(MAX(tcg.top_gp_pct), 0)              AS top_gp_pct

    FROM months m
    LEFT JOIN existing e          ON e.ms = m.ms
    LEFT JOIN active_inv_agg cur  ON cur.ms = m.ms AND cur.customer_id = e.id
    LEFT JOIN prev_inv_agg   prv  ON prv.ms = m.ms AND prv.customer_id = e.id
    LEFT JOIN repeat_orders  ro   ON ro.ms  = m.ms AND ro.customer_id  = e.id
    LEFT JOIN hm hmr              ON hmr.ms = m.ms AND hmr.customer_id = e.id
    LEFT JOIN monthly_extras me   ON me.ms = m.ms
    LEFT JOIN new_cust_cnt ncc    ON ncc.ms = m.ms
    LEFT JOIN top_contrib tc      ON tc.ms = m.ms
    LEFT JOIN customers cust_top  ON cust_top.id = tc.customer_id
    LEFT JOIN gp_tier_breakdown gtb ON gtb.ms = m.ms
    LEFT JOIN top_contrib_gp tcg  ON tcg.ms = m.ms
    LEFT JOIN customers cust_top_gp ON cust_top_gp.id = tcg.customer_id
    GROUP BY m.ms
    ORDER BY m.ms
  `)

  return (rows as unknown[]).map((r: unknown) => {
    const row = r as Record<string, unknown>
    return {
      month:                  String(row.month),
      existing_customers:     Number(row.existing_customers ?? 0),
      total_revenue_existing: Number(row.total_revenue_existing ?? 0),
      avg_revenue:            Number(row.avg_revenue ?? 0),
      avg_gross_profit:       Number(row.avg_gross_profit ?? 0),
      high_margin_ratio:      Number(row.high_margin_ratio ?? 0),
      repeat_order_rate:      Number(row.repeat_order_rate ?? 0),
      expansion_rate:         Number(row.expansion_rate ?? 0),
      active_existing_count:  Number(row.active_existing_count ?? 0),
      active_new_count:       Number(row.active_new_count ?? 0),
      median_revenue:         Number(row.median_revenue ?? 0),
      top_customer_id:        row.top_customer_id != null ? Number(row.top_customer_id) : null,
      top_customer_name:      row.top_customer_name != null ? String(row.top_customer_name) : null,
      top_customer_revenue:   Number(row.top_customer_revenue ?? 0),
      top_customer_pct:       Number(row.top_customer_pct ?? 0),
      gp_tier1:               Number(row.gp_tier1 ?? 0),
      gp_tier2:               Number(row.gp_tier2 ?? 0),
      gp_tier3:               Number(row.gp_tier3 ?? 0),
      top_gp_customer_id:     row.top_gp_customer_id != null ? Number(row.top_gp_customer_id) : null,
      top_gp_customer_name:   row.top_gp_customer_name != null ? String(row.top_gp_customer_name) : null,
      top_gp_revenue:         Number(row.top_gp_revenue ?? 0),
      top_gp_pct:             Number(row.top_gp_pct ?? 0),
    }
  })
}

// ─── M3: Revenue Breakdown per Existing Customer (drill-down klik chart) ───────
// Mirror pola fetchGpBreakdown (m4.repository.ts) persis - cuma total_revenue,
// bukan total_gp, sebagai basis tier/ranking.
export async function fetchRevenueBreakdown(
  p: SegmentParams,
): Promise<{ rows: RevenueBreakdownRow[]; total_revenue: number; median_threshold: number; total_existing: number; hm_revenue: number }> {
  const { cid, filterDate, activeMonths, companyScopeIds } = p
  const establishedCTE = cteEstablishedCustomers(p)
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    inv_active AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    ),
    existing_revenue AS (
      SELECT ec.id, ec.customer_name, ec.customer_code, ia.revenue
      FROM established_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
    ),
    -- Task006 — kontribusi produk High Margin (tabel high_margin_products, mapping
    -- manual admin) terhadap total_revenue M3 di atas. Mirror pola JOIN high_margin_products
    -- di fetchHmBreakdown (m5.repository.ts), termasuk syarat effective_from/effective_until.
    -- Di-scope ke established_customers yang SAMA dengan existing_revenue supaya apple-to-apple.
    hm_inv_active AS (
      SELECT i.customer_id, SUM(ii.revenue::numeric) AS hm_revenue
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN high_margin_products hmp ON (
        hmp.company_id = i.company_id
        AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
      )
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
      GROUP BY i.customer_id
    ),
    existing_hm_revenue AS (
      SELECT ec.id, hia.hm_revenue
      FROM established_customers ec
      JOIN hm_inv_active hia ON hia.customer_id = ec.id
    ),
    median_threshold AS (
      SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue), 0) AS threshold
      FROM existing_revenue
    ),
    total AS (
      SELECT
        COALESCE(SUM(revenue), 0)                           AS total_revenue,
        (SELECT COUNT(*) FROM established_customers)::int   AS total_existing,
        (SELECT COALESCE(SUM(hm_revenue), 0) FROM existing_hm_revenue) AS hm_revenue
      FROM existing_revenue
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY er.revenue DESC)::int        AS ranking,
      er.customer_code,
      er.customer_name,
      ROUND(er.revenue)::bigint                                AS revenue,
      ROUND(er.revenue * 100.0 / NULLIF(t.total_revenue, 0), 1) AS revenue_pct,
      CASE
        WHEN er.revenue >  mt.threshold        THEN 'Atas'
        WHEN er.revenue >  mt.threshold * 0.5  THEN 'Tengah'
        ELSE                                        'Bawah'
      END                                                       AS tier,
      mt.threshold                                              AS median_threshold,
      t.total_revenue,
      t.total_existing,
      t.hm_revenue
    FROM existing_revenue er
    CROSS JOIN median_threshold mt
    CROSS JOIN total t
    ORDER BY er.revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      WITH ${cteEstablishedCustomers(p)}
      SELECT COUNT(*)::int AS total_existing FROM established_customers
    `) as unknown[]
    const tot = totRow as Record<string, unknown>
    return { rows: [], total_revenue: 0, median_threshold: 0, total_existing: Number(tot?.total_existing ?? 0), hm_revenue: 0 }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    total_revenue:    Number(first.total_revenue ?? 0),
    median_threshold: Number(first.median_threshold ?? 0),
    total_existing:   Number(first.total_existing ?? 0),
    hm_revenue:       Number(first.hm_revenue ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        customer_name: String(row.customer_name),
        revenue:       Number(row.revenue ?? 0),
        revenue_pct:   Number(row.revenue_pct ?? 0),
        tier:          String(row.tier) as 'Atas' | 'Tengah' | 'Bawah',
      }
    }),
  }
}

// ─── M7: Expansion Breakdown per Existing Customer (drill-down klik chart) ────
// Mirror pola fetchRevenueBreakdown/fetchGpBreakdown - bedanya di sini butuh DUA window
// (current vs previous activeMonths) buat tentuin status up/flat_down, sesuai definisi
// expansion_rate di fetchCustomerMetricsTrend (active_inv_agg vs prev_inv_agg di atas).
export async function fetchExpansionBreakdown(
  p: SegmentParams,
): Promise<{ rows: ExpansionBreakdownRow[]; up_count: number; total_existing: number }> {
  const { cid, filterDate, activeMonths, companyScopeIds } = p
  const establishedCTE = cteEstablishedCustomers(p)
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    inv_current AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    ),
    inv_previous AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - (${activeMonths}::int * 2) * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND ${companyCondI}
        AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    ),
    combined AS (
      SELECT
        ec.id, ec.customer_name, ec.customer_code,
        COALESCE(ic.revenue, 0)  AS cur_revenue,
        COALESCE(ip.revenue, 0)  AS prev_revenue
      FROM established_customers ec
      LEFT JOIN inv_current  ic ON ic.customer_id = ec.id
      LEFT JOIN inv_previous ip ON ip.customer_id = ec.id
    )
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY (cur_revenue - prev_revenue) DESC
      )::int                                                                AS ranking,
      customer_code,
      customer_name,
      ROUND(cur_revenue)::bigint                                           AS cur_revenue,
      ROUND(prev_revenue)::bigint                                          AS prev_revenue,
      CASE WHEN prev_revenue > 0
        THEN ROUND((cur_revenue - prev_revenue) * 100.0 / prev_revenue, 1)
        ELSE NULL
      END                                                                   AS change_pct,
      CASE WHEN cur_revenue > prev_revenue THEN 'up' ELSE 'flat_down' END   AS status,
      COUNT(*) FILTER (WHERE cur_revenue > prev_revenue) OVER ()::int       AS up_count,
      COUNT(*) OVER ()::int                                                 AS total_existing
    FROM combined
    ORDER BY (cur_revenue - prev_revenue) DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      WITH ${cteEstablishedCustomers(p)}
      SELECT COUNT(*)::int AS total_existing FROM established_customers
    `) as unknown[]
    const tot = totRow as Record<string, unknown>
    return { rows: [], up_count: 0, total_existing: Number(tot?.total_existing ?? 0) }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    up_count:       Number(first.up_count ?? 0),
    total_existing: Number(first.total_existing ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        customer_name: String(row.customer_name),
        cur_revenue:   Number(row.cur_revenue ?? 0),
        prev_revenue:  Number(row.prev_revenue ?? 0),
        change_pct:    row.change_pct != null ? Number(row.change_pct) : null,
        status:        String(row.status) as 'up' | 'flat_down',
      }
    }),
  }
}
