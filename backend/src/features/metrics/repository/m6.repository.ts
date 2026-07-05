import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { RorBreakdownRow } from '../metrics.types'
import { buildBranchConditionRaw, buildDivisionConditionRaw } from '@/utils/scope'

export async function fetchRorBreakdown(
  p: SegmentParams,
): Promise<{ rows: RorBreakdownRow[]; repeat_count: number; total_existing: number }> {
  const { cid, filterDate, activeMonths, division } = p
  const establishedCTE = cteEstablishedCustomers(p)
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
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
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND ${branchCond}
        AND ${divisionScopeCond}
      GROUP BY i.customer_id
      HAVING COUNT(DISTINCT i.id) > 1
    ),
    agg AS (
      SELECT
        COUNT(*)::int                                       AS repeat_count,
        (SELECT COUNT(*) FROM established_customers)::int  AS total_existing
      FROM repeat_buyers rb
      JOIN established_customers ec ON ec.id = rb.customer_id
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
    JOIN established_customers ec ON ec.id = rb.customer_id
    CROSS JOIN agg a
    ORDER BY rb.invoice_count DESC, rb.total_revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      WITH ${cteEstablishedCustomers(p)}
      SELECT COUNT(*)::int AS total_existing FROM established_customers
    `) as unknown[]
    return { rows: [], repeat_count: 0, total_existing: Number((totRow as Record<string, unknown>)?.total_existing ?? 0) }
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
