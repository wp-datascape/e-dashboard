import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { GpBreakdownRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export async function fetchGpBreakdown(
  p: SegmentParams,
): Promise<{ rows: GpBreakdownRow[]; total_gp: number; median_threshold: number; total_existing: number }> {
  const { cid, filterDate, activeMonths, companyScopeIds } = p
  const establishedCTE = cteEstablishedCustomers(p)
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c_ov.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    inv_active AS (
      SELECT i.customer_id, SUM(i.total_gp::numeric) AS gp
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR cd.division_id = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    ),
    existing_gp AS (
      SELECT ec.id, ec.customer_name, ec.customer_code, ia.gp
      FROM established_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
    ),
    median_threshold AS (
      SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gp), 0) AS threshold
      FROM existing_gp
    ),
    total AS (
      SELECT
        COALESCE(SUM(gp), 0)                                AS total_gp,
        (SELECT COUNT(*) FROM established_customers)::int   AS total_existing
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
      WITH ${cteEstablishedCustomers(p)}
      SELECT COUNT(*)::int AS total_existing FROM established_customers
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
