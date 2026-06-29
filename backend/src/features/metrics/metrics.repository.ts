import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { sqlExistingCustomers } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { GpBreakdownRow, HmBreakdownRow, RorBreakdownRow, DormantTrendRow, DormantValueRow, CrossSellingTrendRow, CrossSellingDetailRow, CrossSellingHeatmapRow, CrossSellingMetricsData } from './metrics.types'

interface CsParams { cid: number; periodEnd: string; division: string | null }

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
  active_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
}

/**
 * Tren 12 bulan untuk M3–M7.
 *
 * Setiap titik bulan menggunakan:
 *   existing  = ada invoice dalam dormantDays sebelum akhir bulan
 *   active    = ada invoice dalam activeDays sebelum akhir bulan (subset existing)
 *
 * Semua parameter berasal dari SegmentParams (single source of truth).
 */
export async function fetchCustomerMetricsTrend(p: SegmentParams): Promise<TrendRow[]> {
  const { cid, filterDate, activeDays, dormantDays, division } = p

  const rows = await db.execute(sql`
    WITH
    months AS (
      SELECT generate_series(
        date_trunc('month', ${filterDate}::date) - INTERVAL '11 months',
        date_trunc('month', ${filterDate}::date),
        INTERVAL '1 month'
      )::date AS ms
    ),

    -- Semua invoice relevan: dari 11 bulan lalu - dormantDays, sampai akhir bulan filter
    raw_inv AS (
      SELECT i.id AS invoice_id, i.customer_id, i.invoice_date,
             i.total_revenue::numeric AS rev,
             i.total_gp::numeric      AS gp
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND i.invoice_date >= date_trunc('month', ${filterDate}::date)
                              - INTERVAL '11 months'
                              - ${dormantDays}::int * INTERVAL '1 day'
        AND i.invoice_date <= (date_trunc('month', ${filterDate}::date)
                              + INTERVAL '1 month'
                              - INTERVAL '1 day')
    ),

    -- Invoice HM relevan: dari 11 bulan lalu - activeDays, sampai akhir bulan filter
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
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND i.invoice_date >= date_trunc('month', ${filterDate}::date)
                              - INTERVAL '11 months'
                              - ${activeDays}::int * INTERVAL '1 day'
        AND i.invoice_date <= (date_trunc('month', ${filterDate}::date)
                              + INTERVAL '1 month'
                              - INTERVAL '1 day')
    ),

    -- Existing customers per bulan: ada invoice dalam dormantDays sebelum akhir bulan
    existing AS (
      SELECT DISTINCT c.id, m.ms
      FROM customers c
      CROSS JOIN months m
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND EXISTS (
          SELECT 1 FROM raw_inv ri
          WHERE ri.customer_id = c.id
            AND ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                                   - ${dormantDays}::int * INTERVAL '1 day'
            AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
        )
    ),

    -- Revenue + GP per existing customer per bulan (window: activeDays sebelum akhir bulan)
    active_inv_agg AS (
      SELECT e.ms, ri.customer_id, SUM(ri.rev) AS rev, SUM(ri.gp) AS gp
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeDays}::int * INTERVAL '1 day'
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
    ),

    -- M7: revenue per existing customer di 30 hari SEBELUM active window
    prev_inv_agg AS (
      SELECT e.ms, ri.customer_id, SUM(ri.rev) AS rev
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeDays}::int * INTERVAL '1 day' * 2
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                               - ${activeDays}::int * INTERVAL '1 day'
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
    ),

    -- M6: existing customer yang order lebih dari 1x dalam active window (30 hari)
    repeat_orders AS (
      SELECT e.ms, ri.customer_id
      FROM raw_inv ri
      JOIN months m ON
        ri.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeDays}::int * INTERVAL '1 day'
        AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
      GROUP BY e.ms, ri.customer_id
      HAVING COUNT(DISTINCT ri.invoice_id) > 1
    ),

    -- M5: existing customer yang beli HM dalam activeDays sebelum akhir bulan
    hm AS (
      SELECT DISTINCT e.ms, hr.customer_id
      FROM hm_raw hr
      JOIN months m ON
        hr.invoice_date >  (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
                           - ${activeDays}::int * INTERVAL '1 day'
        AND hr.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
      JOIN existing e ON e.id = hr.customer_id AND e.ms = m.ms
    ),

    -- Active count + median revenue per bulan (M3 enrichment)
    monthly_extras AS (
      SELECT ms,
        COUNT(*)::int AS active_count,
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

      -- M7: existing yang spend naik vs 30 hari sebelumnya / semua existing
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0)
          THEN e.id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT e.id), 0), 1
      ) AS expansion_rate,

      COALESCE(MAX(me.active_count), 0)::int         AS active_count,
      COALESCE(MAX(me.median_revenue), 0)            AS median_revenue,
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
      active_count:           Number(row.active_count ?? 0),
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

export async function fetchGpBreakdown(
  p: SegmentParams,
): Promise<{ rows: GpBreakdownRow[]; total_gp: number; median_threshold: number; total_existing: number }> {
  const { cid, filterDate, activeDays } = p
  const existingCTE = sqlExistingCustomers(p)

  const rows = await db.execute(sql`
    WITH
    ${existingCTE},
    inv_active AS (
      SELECT i.customer_id, SUM(i.total_gp::numeric) AS gp
      FROM invoices i
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - ${activeDays}::int * INTERVAL '1 day'
        AND i.invoice_date <= ${filterDate}::date
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND (${p.division}::text IS NULL OR EXISTS (
          SELECT 1 FROM channel_divisions cd
          WHERE cd.channel_name = i.channel_name
            AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
            AND cd.division = ${p.division}::text
        ))
      GROUP BY i.customer_id
    ),
    existing_gp AS (
      SELECT ec.id, ec.customer_name, ec.customer_code, ia.gp
      FROM existing_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
    ),
    median_threshold AS (
      SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gp), 0) AS threshold
      FROM existing_gp
    ),
    total AS (
      SELECT
        COALESCE(SUM(gp), 0)                           AS total_gp,
        (SELECT COUNT(*) FROM existing_customers)::int AS total_existing
      FROM existing_gp
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY eg.gp DESC)::int        AS ranking,
      eg.customer_code,
      eg.customer_name,
      ROUND(eg.gp)::bigint                                AS gp,
      ROUND(eg.gp * 100.0 / NULLIF(t.total_gp, 0), 1)   AS gp_pct,
      CASE
        WHEN eg.gp >  mt.threshold        THEN 'Atas'
        WHEN eg.gp >  mt.threshold * 0.5  THEN 'Tengah'
        ELSE                                   'Bawah'
      END                                                 AS tier,
      mt.threshold                                        AS median_threshold,
      t.total_gp,
      t.total_existing
    FROM existing_gp eg
    CROSS JOIN median_threshold mt
    CROSS JOIN total t
    ORDER BY eg.gp DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      SELECT COUNT(DISTINCT c.id)::int AS total_existing
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${cid}::int = 0 OR ix.company_id = ${cid}::int)
            AND ix.invoice_date >  ${filterDate}::date - ${p.dormantDays}::int * INTERVAL '1 day'
            AND ix.invoice_date <= ${filterDate}::date
        )
    `) as unknown[]
    const tot = totRow as Record<string, unknown>
    return { rows: [], total_gp: 0, median_threshold: 0, total_existing: Number(tot?.total_existing ?? 0) }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    total_gp:         Number(first.total_gp ?? 0),
    median_threshold: Number(first.median_threshold ?? 0),
    total_existing:   Number(first.total_existing ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        customer_name: String(row.customer_name),
        gp:            Number(row.gp ?? 0),
        gp_pct:        Number(row.gp_pct ?? 0),
        tier:          String(row.tier) as 'Atas' | 'Tengah' | 'Bawah',
      }
    }),
  }
}

export async function fetchHmBreakdown(
  p: SegmentParams,
): Promise<{ rows: HmBreakdownRow[]; total_hm_revenue: number; hm_buyer_count: number; total_existing: number }> {
  const { cid, filterDate, activeDays } = p
  const existingCTE = sqlExistingCustomers(p)

  const rows = await db.execute(sql`
    WITH
    ${existingCTE},
    hm_buyers AS (
      SELECT i.customer_id, SUM(ii.revenue::numeric) AS hm_revenue
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN high_margin_products hmp ON (
        hmp.company_id = i.company_id
        AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
      )
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
        AND i.invoice_date >  ${filterDate}::date - ${activeDays}::int * INTERVAL '1 day'
        AND i.invoice_date <= ${filterDate}::date
      GROUP BY i.customer_id
    ),
    total AS (
      SELECT
        COALESCE(SUM(hb.hm_revenue), 0)         AS total_hm_revenue,
        COUNT(*)::int                            AS hm_buyer_count,
        (SELECT COUNT(*) FROM existing_customers)::int AS total_existing
      FROM hm_buyers hb
      JOIN existing_customers ec ON ec.id = hb.customer_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY hb.hm_revenue DESC)::int AS ranking,
      ec.customer_name,
      ec.customer_code,
      ROUND(hb.hm_revenue)::bigint                         AS hm_revenue,
      ROUND(hb.hm_revenue * 100.0 / NULLIF(t.total_hm_revenue, 0), 1) AS hm_pct,
      t.total_hm_revenue,
      t.hm_buyer_count,
      t.total_existing
    FROM hm_buyers hb
    JOIN existing_customers ec ON ec.id = hb.customer_id
    CROSS JOIN total t
    ORDER BY hb.hm_revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      SELECT COUNT(DISTINCT c.id)::int AS total_existing
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${cid}::int = 0 OR ix.company_id = ${cid}::int)
            AND ix.invoice_date >  ${filterDate}::date - ${p.dormantDays}::int * INTERVAL '1 day'
            AND ix.invoice_date <= ${filterDate}::date
        )
    `) as unknown[]
    const tot = totRow as Record<string, unknown>
    return { rows: [], total_hm_revenue: 0, hm_buyer_count: 0, total_existing: Number(tot?.total_existing ?? 0) }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    total_hm_revenue: Number(first.total_hm_revenue ?? 0),
    hm_buyer_count:   Number(first.hm_buyer_count ?? 0),
    total_existing:   Number(first.total_existing ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_name: String(row.customer_name),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        hm_revenue:    Number(row.hm_revenue ?? 0),
        hm_pct:        Number(row.hm_pct ?? 0),
      }
    }),
  }
}

// ── M6 Repeat Order Breakdown ─────────────────────────────────────────────────

export async function fetchRorBreakdown(
  p: SegmentParams,
): Promise<{ rows: RorBreakdownRow[]; repeat_count: number; total_existing: number }> {
  const { cid, filterDate, activeDays, division } = p
  const existingCTE = sqlExistingCustomers(p)

  const rows = await db.execute(sql`
    WITH
    ${existingCTE},
    repeat_buyers AS (
      SELECT i.customer_id,
             COUNT(DISTINCT i.id)::int           AS invoice_count,
             SUM(i.total_revenue::numeric)        AS total_revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND i.invoice_date >  ${filterDate}::date - ${activeDays}::int * INTERVAL '1 day'
        AND i.invoice_date <= ${filterDate}::date
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
      GROUP BY i.customer_id
      HAVING COUNT(DISTINCT i.id) > 1
    ),
    agg AS (
      SELECT
        COUNT(*)::int                                AS repeat_count,
        (SELECT COUNT(*) FROM existing_customers)::int AS total_existing
      FROM repeat_buyers rb
      JOIN existing_customers ec ON ec.id = rb.customer_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY rb.invoice_count DESC, rb.total_revenue DESC)::int AS ranking,
      ec.customer_name,
      ec.customer_code,
      rb.invoice_count,
      ROUND(rb.total_revenue)::bigint AS total_revenue,
      a.repeat_count,
      a.total_existing
    FROM repeat_buyers rb
    JOIN existing_customers ec ON ec.id = rb.customer_id
    CROSS JOIN agg a
    ORDER BY rb.invoice_count DESC, rb.total_revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [tot] = await db.execute(sql`
      SELECT COUNT(DISTINCT c.id)::int AS total_existing
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${cid}::int = 0 OR ix.company_id = ${cid}::int)
            AND ix.invoice_date >  ${filterDate}::date - ${p.dormantDays}::int * INTERVAL '1 day'
            AND ix.invoice_date <= ${filterDate}::date
        )
    `)
    return { rows: [], repeat_count: 0, total_existing: Number((tot as Record<string, unknown>)?.total_existing ?? 0) }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    repeat_count:   Number(first.repeat_count ?? 0),
    total_existing: Number(first.total_existing ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_name: String(row.customer_name),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        invoice_count: Number(row.invoice_count ?? 0),
        total_revenue: Number(row.total_revenue ?? 0),
      }
    }),
  }
}

// ── M8–M10: Dormant Trend ─────────────────────────────────────────────────────

/**
 * Tren 12 bulan untuk M8 (dormant rate) + M10 (reactivation rate).
 *
 * Untuk setiap bulan dihitung:
 *   - total_customers: customer yang punya invoice ≤ akhir bulan
 *   - dormant_count: dari total, yang last invoice < month_end - dormantDays
 *   - reactivated_count: dormant bulan lalu yang punya invoice di bulan ini
 */
export async function fetchDormantTrend(p: SegmentParams): Promise<DormantTrendRow[]> {
  const { cid, filterDate, dormantDays, division } = p

  const rawRows = await db.execute(sql`
    WITH
    months AS (
      SELECT generate_series(
        date_trunc('month', ${filterDate}::date) - INTERVAL '11 months',
        date_trunc('month', ${filterDate}::date),
        INTERVAL '1 month'
      )::date AS ms
    ),

    -- Semua invoice dalam scope (company + division)
    inv AS (
      SELECT i.customer_id, i.invoice_date
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
    ),

    -- Customer dalam scope (ada minimal 1 invoice)
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND EXISTS (SELECT 1 FROM inv WHERE inv.customer_id = c.id)
    ),

    -- Customer × bulan: hitung last invoice date per titik waktu
    cxm AS (
      SELECT
        sc.cid,
        m.ms                                                                    AS month_start,
        (m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date                  AS me,
        (m.ms - INTERVAL '1 day')::date                                        AS prev_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date
        )                                                                       AS last_at_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= (m.ms - INTERVAL '1 day')::date
        )                                                                       AS last_at_prev_me,
        BOOL_OR(
          inv.invoice_date >= m.ms
          AND inv.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date
        )                                                                       AS active_in_month
      FROM scoped_cust sc
      CROSS JOIN months m
      LEFT JOIN inv ON inv.customer_id = sc.cid
      GROUP BY sc.cid, m.ms
    )

    SELECT
      TO_CHAR(month_start, 'YYYY-MM') AS month,
      COUNT(*) FILTER (WHERE last_at_me IS NOT NULL)::int                       AS total_customers,
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND last_at_me < me - ${dormantDays}::int * INTERVAL '1 day'
      )::int                                                                     AS dormant_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND last_at_me < me - ${dormantDays}::int * INTERVAL '1 day'
        )::numeric / NULLIF(COUNT(*) FILTER (WHERE last_at_me IS NOT NULL), 0) * 100, 1
      )                                                                          AS dormant_rate,
      COUNT(*) FILTER (
        WHERE last_at_prev_me IS NOT NULL
          AND last_at_prev_me < prev_me - ${dormantDays}::int * INTERVAL '1 day'
      )::int                                                                     AS prev_dormant_count,
      COUNT(*) FILTER (
        WHERE last_at_prev_me IS NOT NULL
          AND last_at_prev_me < prev_me - ${dormantDays}::int * INTERVAL '1 day'
          AND active_in_month = true
      )::int                                                                     AS reactivated_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_prev_me IS NOT NULL
            AND last_at_prev_me < prev_me - ${dormantDays}::int * INTERVAL '1 day'
            AND active_in_month = true
        )::numeric / NULLIF(COUNT(*) FILTER (
          WHERE last_at_prev_me IS NOT NULL
            AND last_at_prev_me < prev_me - ${dormantDays}::int * INTERVAL '1 day'
        ), 0) * 100, 1
      )                                                                          AS reactivation_rate
    FROM cxm
    GROUP BY month_start
    ORDER BY month_start
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      month:               String(row.month),
      total_customers:     Number(row.total_customers ?? 0),
      dormant_count:       Number(row.dormant_count ?? 0),
      dormant_rate:        Number(row.dormant_rate ?? 0),
      prev_dormant_count:  Number(row.prev_dormant_count ?? 0),
      reactivated_count:   Number(row.reactivated_count ?? 0),
      reactivation_rate:   Number(row.reactivation_rate ?? 0),
    }
  })
}

// ── M9: Dormant Value Ranking ─────────────────────────────────────────────────

/**
 * Top 20 dormant customer diranking berdasarkan estimated lost value.
 * estimated_lost_value = avg monthly revenue × months since last invoice
 */
export async function fetchDormantValueRanking(p: SegmentParams): Promise<DormantValueRow[]> {
  const { cid, filterDate, dormantDays, division } = p

  const rawRows = await db.execute(sql`
    WITH
    inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
    ),
    cust_agg AS (
      SELECT
        c.id                                                       AS customer_id,
        c.customer_name,
        c.customer_code,
        MAX(inv.invoice_date)                                      AS last_invoice_date,
        COUNT(DISTINCT DATE_TRUNC('month', inv.invoice_date))      AS active_months,
        COALESCE(SUM(inv.rev), 0)                                  AS total_rev
      FROM customers c
      JOIN inv ON inv.customer_id = c.id
      WHERE c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
      GROUP BY c.id, c.customer_name, c.customer_code
      HAVING MAX(inv.invoice_date) < ${filterDate}::date - ${dormantDays}::int * INTERVAL '1 day'
    )
    SELECT
      customer_id,
      customer_name,
      customer_code,
      last_invoice_date::text,
      GREATEST(ROUND((${filterDate}::date - last_invoice_date) / 30.0)::int, 1)                  AS months_dormant,
      ROUND(total_rev / NULLIF(active_months, 0))::bigint                                        AS avg_monthly_revenue,
      ROUND(
        total_rev / NULLIF(active_months, 0)
        * GREATEST(ROUND((${filterDate}::date - last_invoice_date) / 30.0), 1)
      )::bigint                                                                                   AS estimated_lost_value
    FROM cust_agg
    ORDER BY estimated_lost_value DESC NULLS LAST
    LIMIT 20
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      customer_id:          Number(row.customer_id),
      customer_name:        String(row.customer_name),
      customer_code:        row.customer_code != null ? String(row.customer_code) : null,
      last_invoice_date:    String(row.last_invoice_date ?? ''),
      months_dormant:       Number(row.months_dormant ?? 0),
      avg_monthly_revenue:  Number(row.avg_monthly_revenue ?? 0),
      estimated_lost_value: Number(row.estimated_lost_value ?? 0),
    }
  })
}

// ── M1, M1.1, M2 — Cross Selling ──────────────────────────────────────────────

const CS_INV_CTE = (p: CsParams) => sql`
  inv AS (
    SELECT DISTINCT i.id, i.customer_id
    FROM invoices i
    LEFT JOIN channel_divisions cd
      ON  cd.channel_name  = i.channel_name
      AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
    WHERE i.deleted_at IS NULL
      AND i.invoice_date >  ${p.periodEnd}::date - 30
      AND i.invoice_date <= ${p.periodEnd}::date
      AND (${p.cid}::int = 0 OR i.company_id = ${p.cid}::int)
      AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
  )
`

export async function fetchCrossSellingKPI(p: CsParams) {
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

export async function fetchCrossSellingTrend(p: CsParams): Promise<CrossSellingTrendRow[]> {
  const rawRows = await db.execute(sql`
    WITH
    months AS (
      SELECT
        TO_CHAR(m, 'YYYY-MM') AS label,
        (date_trunc('month', m) + INTERVAL '1 month' - INTERVAL '1 day')::date AS me
      FROM generate_series(
        date_trunc('month', ${p.periodEnd}::date - INTERVAL '11 months'),
        date_trunc('month', ${p.periodEnd}::date),
        INTERVAL '1 month'
      ) AS m
    ),
    base AS (
      SELECT
        i.customer_id,
        i.invoice_date,
        ii.product_category_id
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN channel_divisions cd
        ON  cd.channel_name  = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${p.periodEnd}::date - INTERVAL '12 months'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND (${p.cid}::int = 0 OR i.company_id = ${p.cid}::int)
        AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        AND ii.product_category_id IS NOT NULL
    ),
    monthly AS (
      SELECT
        m.label,
        b.customer_id,
        COUNT(DISTINCT b.product_category_id) AS cat_count
      FROM months m
      JOIN base b ON b.invoice_date > m.me - 30 AND b.invoice_date <= m.me
      GROUP BY m.label, b.customer_id
    )
    SELECT
      label                                                              AS month,
      COUNT(*)::int                                                      AS total_active,
      COUNT(*) FILTER (WHERE cat_count > 1)::int                        AS multi_product,
      ROUND(COUNT(*) FILTER (WHERE cat_count > 1)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1)                                  AS ratio,
      ROUND(AVG(cat_count)::numeric, 2)                                  AS avg_category
    FROM monthly
    GROUP BY label
    ORDER BY label
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

export async function fetchCrossSellingDetail(p: CsParams): Promise<CrossSellingDetailRow[]> {
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

export async function fetchCrossSellingHeatmap(p: CsParams): Promise<{
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
    top_customers AS (
      SELECT
        inv.customer_id,
        COUNT(DISTINCT pc.item_type) AS type_count,
        COUNT(*)                     AS tx_count
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      JOIN product_categories pc ON pc.id = ii.product_category_id
      WHERE pc.item_type IS NOT NULL
      GROUP BY inv.customer_id
      ORDER BY type_count DESC, tx_count DESC
      LIMIT 30
    )
    SELECT
      c.customer_name  AS customer,
      pc.item_type     AS category,
      COUNT(*)::int    AS purchase_count,
      tc2.freq         AS cat_freq
    FROM top_customers tc
    JOIN customers c ON c.id = tc.customer_id
    JOIN inv         ON inv.customer_id = tc.customer_id
    JOIN invoice_items ii ON ii.invoice_id = inv.id
    JOIN product_categories pc ON pc.id = ii.product_category_id
    JOIN type_counts tc2 ON tc2.name = pc.item_type
    WHERE pc.item_type IS NOT NULL
    GROUP BY c.customer_name, pc.item_type, tc2.freq
    ORDER BY c.customer_name, tc2.freq DESC
  `)

  const catFreqMap = new Map<string, number>()
  const customerMap = new Map<string, Record<string, number>>()

  for (const r of rawRows as unknown[]) {
    const row = r as Record<string, unknown>
    const customer = String(row.customer)
    const category = String(row.category)
    const count    = Number(row.purchase_count ?? 0)
    const freq     = Number(row.cat_freq       ?? 0)
    if (!catFreqMap.has(category)) catFreqMap.set(category, freq)
    if (!customerMap.has(customer)) customerMap.set(customer, {})
    customerMap.get(customer)![category] = count
  }

  const categories = [...catFreqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  const heatmap: CrossSellingHeatmapRow[] = [...customerMap.entries()].map(([customer, values]) => ({
    customer,
    values,
  }))

  return { heatmap, categories }
}
