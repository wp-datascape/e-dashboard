import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '@/features/metrics/segment.helper'
import type { MonthlyTrendPoint } from './dashboard.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

/**
 * Tren 12 bulan estimasi total nilai (revenue) yang berpotensi hilang dari
 * SELURUH customer dormant per titik bulan (bukan cuma top 20 seperti
 * fetchDormantValueRanking di metrics/repository/m8m10.repository.ts).
 *
 * Formula per customer sama dengan m9 (avg_monthly_revenue × months_dormant),
 * dihitung ulang di tiap titik waktu `me` memakai pola cap yang sama dengan
 * fetchDormantTrend agar month grid & definisi dormant align dengan M8/M10.
 */
export async function fetchDormantValueTrend(p: SegmentParams): Promise<MonthlyTrendPoint[]> {
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
    inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND (${division}::int IS NULL OR cd.division_id = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid
      FROM customers c
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND EXISTS (SELECT 1 FROM inv WHERE inv.customer_id = c.id)
    ),
    cxm AS (
      SELECT
        sc.cid,
        m.ms AS month_start,
        LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date, ${filterDate}::date) AS me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date, ${filterDate}::date)
        ) AS last_at_me,
        COUNT(DISTINCT DATE_TRUNC('month', inv.invoice_date)) FILTER (
          WHERE inv.invoice_date <= LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date, ${filterDate}::date)
        ) AS active_months,
        COALESCE(SUM(inv.rev) FILTER (
          WHERE inv.invoice_date <= LEAST((m.ms + INTERVAL '1 month' - INTERVAL '1 day')::date, ${filterDate}::date)
        ), 0) AS total_rev
      FROM scoped_cust sc
      CROSS JOIN months m
      LEFT JOIN inv ON inv.customer_id = sc.cid
      GROUP BY sc.cid, m.ms
    )
    SELECT
      TO_CHAR(month_start, 'YYYY-MM') AS month,
      COALESCE(SUM(
        CASE
          WHEN last_at_me IS NOT NULL
           AND last_at_me <= me - ${dormantMonths}::int * INTERVAL '1 month'
          THEN ROUND(total_rev / NULLIF(active_months, 0))
               * GREATEST(ROUND((me - last_at_me) / 30.0), 1)
          ELSE 0
        END
      ), 0)::bigint AS value
    FROM cxm
    GROUP BY month_start
    ORDER BY month_start
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      month: String(row.month),
      value: Number(row.value ?? 0),
    }
  })
}
