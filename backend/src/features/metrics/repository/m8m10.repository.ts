import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import type { DormantTrendRow, DormantValueRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

/**
 * Tren 12 bulan untuk M8 (dormant rate) + M10 (reactivation rate).
 */
export async function fetchDormantTrend(p: SegmentParams): Promise<DormantTrendRow[]> {
  const { cid, filterDate, dormantMonths, division, companyScopeIds } = p
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c_ov.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)

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
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),

    -- Customer dalam scope (ada minimal 1 invoice)
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid
      FROM customers c
      WHERE c.is_placeholder = false
        AND ${companyCondC}
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
  const { cid, filterDate, dormantMonths, division, companyScopeIds } = p
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c_ov.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)

  const rawRows = await db.execute(sql`
    WITH
    inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    cust_last AS (
      SELECT
        c.id                    AS customer_id,
        c.customer_name,
        c.customer_code,
        MAX(inv.invoice_date)   AS last_invoice_date
      FROM customers c
      JOIN inv ON inv.customer_id = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
      GROUP BY c.id, c.customer_name, c.customer_code
      HAVING MAX(inv.invoice_date) <= ${filterDate}::date - ${dormantMonths}::int * INTERVAL '1 month'
    ),
    -- avg_monthly_revenue dibatasi 12 bulan kalender terakhir SEBELUM customer dormant
    -- (bukan total_rev all-time dibagi jumlah bulan yang ada transaksi saja) - dulu
    -- pembeli borongan/jarang (misal cuma aktif 8 dari 13 bulan relasi) dapat rata-rata
    -- yang melambung karena pembaginya cuma bulan yang ada transaksi, bukan window
    -- waktu tetap. Konsisten dengan pola avgMonthlyExpr di customers.repository.ts.
    cust_agg AS (
      SELECT
        cl.customer_id, cl.customer_name, cl.customer_code, cl.last_invoice_date,
        COALESCE(SUM(inv.rev) FILTER (
          WHERE inv.invoice_date <= cl.last_invoice_date
            AND inv.invoice_date >= DATE_TRUNC('month', cl.last_invoice_date::date - INTERVAL '11 months')
        ), 0) AS recent_12m_rev
      FROM cust_last cl
      LEFT JOIN inv ON inv.customer_id = cl.customer_id
      GROUP BY cl.customer_id, cl.customer_name, cl.customer_code, cl.last_invoice_date
    )
    SELECT
      customer_id,
      customer_name,
      customer_code,
      last_invoice_date::text,
      GREATEST(ROUND((${filterDate}::date - last_invoice_date) / 30.0)::int, 1)                  AS months_dormant,
      ROUND(recent_12m_rev / 12.0)::bigint                                                        AS avg_monthly_revenue,
      ROUND(
        recent_12m_rev / 12.0
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
