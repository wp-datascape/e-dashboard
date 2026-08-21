import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers, resolveInvoiceScopeConditions } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { HmBreakdownRow } from '../metrics.types'

export async function fetchHmBreakdown(
  p: SegmentParams,
): Promise<{ rows: HmBreakdownRow[]; total_hm_revenue: number; hm_buyer_count: number; total_existing: number }> {
  const { filterDate, activeMonths } = p
  const establishedCTE = cteEstablishedCustomers(p)
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    hm_buyers AS (
      SELECT i.customer_id, SUM(ii.revenue::numeric) AS hm_revenue
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN high_margin_products hmp ON (
        hmp.company_id = i.company_id
        AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
      )
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
        AND i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${filterDate}::date
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
      GROUP BY i.customer_id
    ),
    total AS (
      SELECT
        COALESCE(SUM(hb.hm_revenue), 0)                          AS total_hm_revenue,
        COUNT(*)::int                                             AS hm_buyer_count,
        (SELECT COUNT(*) FROM established_customers)::int         AS total_existing
      FROM hm_buyers hb
      JOIN established_customers ec ON ec.id = hb.customer_id
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
    JOIN established_customers ec ON ec.id = hb.customer_id
    CROSS JOIN total t
    ORDER BY hb.hm_revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      WITH ${cteEstablishedCustomers(p)}
      SELECT COUNT(*)::int AS total_existing FROM established_customers
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
