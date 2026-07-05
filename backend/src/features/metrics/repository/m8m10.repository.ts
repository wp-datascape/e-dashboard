import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import type { DormantTrendRow, DormantValueRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw } from '@/utils/scope'

/**
 * Tren 12 bulan untuk M8 (dormant rate) + M10 (reactivation rate).
 */
export async function fetchDormantTrend(p: SegmentParams): Promise<DormantTrendRow[]> {
  const { cid, filterDate, dormantMonths, division } = p
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)

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
        AND ${branchCond}
        AND ${divisionScopeCond}
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
    -- me di-cap filterDate agar bulan berjalan tidak pakai month_end masa depan
    -- → dormant cutoff konsisten dengan customer page (pakai filterDate, bukan month_end)
    cxm AS (
      SELECT
        sc.cid,
        m.ms                                                                    AS month_start,
        LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date,
              ${filterDate}::date)                                              AS me,
        (m.ms - INTERVAL '1 day')::date                                        AS prev_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date,
                                         ${filterDate}::date)
        )                                                                       AS last_at_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= (m.ms - INTERVAL '1 day')::date
        )                                                                       AS last_at_prev_me,
        BOOL_OR(
          inv.invoice_date >= m.ms
          AND inv.invoice_date <= LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date,
                                        ${filterDate}::date)
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
          AND last_at_me <= me - ${dormantMonths}::int * INTERVAL '1 month'
      )::int                                                                     AS dormant_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND last_at_me <= me - ${dormantMonths}::int * INTERVAL '1 month'
        )::numeric / NULLIF(COUNT(*) FILTER (WHERE last_at_me IS NOT NULL), 0) * 100, 1
      )                                                                          AS dormant_rate,
      COUNT(*) FILTER (
        WHERE last_at_prev_me IS NOT NULL
          AND last_at_prev_me <= prev_me - ${dormantMonths}::int * INTERVAL '1 month'
      )::int                                                                     AS prev_dormant_count,
      COUNT(*) FILTER (
        WHERE last_at_prev_me IS NOT NULL
          AND last_at_prev_me <= prev_me - ${dormantMonths}::int * INTERVAL '1 month'
          AND active_in_month = true
      )::int                                                                     AS reactivated_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_prev_me IS NOT NULL
            AND last_at_prev_me <= prev_me - ${dormantMonths}::int * INTERVAL '1 month'
            AND active_in_month = true
        )::numeric / NULLIF(COUNT(*) FILTER (
          WHERE last_at_prev_me IS NOT NULL
            AND last_at_prev_me <= prev_me - ${dormantMonths}::int * INTERVAL '1 month'
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

/**
 * Top 20 dormant customer diranking berdasarkan estimated lost value (M9).
 */
export async function fetchDormantValueRanking(p: SegmentParams): Promise<DormantValueRow[]> {
  const { cid, filterDate, dormantMonths, division } = p
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)

  const rawRows = await db.execute(sql`
    WITH
    inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND i.invoice_date <= ${filterDate}::date
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
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
      HAVING MAX(inv.invoice_date) <= ${filterDate}::date - ${dormantMonths}::int * INTERVAL '1 month'
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
