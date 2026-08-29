import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers, resolveInvoiceScopeConditions } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { RorBreakdownRow } from '../metrics.types'

export async function fetchRorBreakdown(
  p: SegmentParams,
  // dateFrom (2026-08-24, koreksi user: M6RepeatOrder.tsx sekarang dipakai
  // di Retention page yang SUDAH py filter granularitas Kuartal/Semester/
  // Tahun — sebelumnya drilldown ini SELALU anchor ke awal BULAN kalender
  // dari filterDate, salah utk granularitas non-bulanan (populasi "existing"
  // & window agregat repeat_buyers beda dari yang dipakai trend chart).
  // Pola SAMA PERSIS fetchGpBreakdown (M4)/fetchExpansionBreakdown (M7) —
  // opsional, fallback ke awal bulan lama kalau kosong (caller belum wired,
  // mis. Value/CustomerMetrics workbench yang memang belum py granularitas).
  dateFrom?: string,
): Promise<{ rows: RorBreakdownRow[]; repeat_count: number; total_existing: number }> {
  const { filterDate, activeMonths, division } = p
  const establishedCTE = cteEstablishedCustomers(p, dateFrom ?? `${filterDate.slice(0, 7)}-01`)
  const rangeStartCond = dateFrom
    ? sql`i.invoice_date >= ${dateFrom}::date`
    : sql`i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'`
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

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
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND ${rangeStartCond}
        AND i.invoice_date <= ${filterDate}::date
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      GROUP BY i.customer_id
      HAVING COUNT(DISTINCT i.id) > 1
    ),
    -- inv_active (2026-08-25, task029.md §36) — BEDA dari M3/M4: denominator
    -- M6 BUKAN "yang repeat order" (itu numerator/repeat_buyers di atas),
    -- tapi SEMUA existing yang transaksi APA PUN di rentang ini (SSOT:
    -- "Existing Customer... DAN masih melakukan pembelian" — TANPA syarat
    -- harus >1 kali). Mirror alias 'cur' di trend chart repeat_order_rate
    -- (fetchCustomerMetricsTrend, m3m7.repository.ts). TANPA HAVING >1.
    inv_active AS (
      SELECT DISTINCT i.customer_id
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND ${rangeStartCond}
        AND i.invoice_date <= ${filterDate}::date
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
    ),
    agg AS (
      SELECT
        COUNT(*)::int                                                                                        AS repeat_count,
        (SELECT COUNT(*) FROM established_customers ec2 JOIN inv_active ia ON ia.customer_id = ec2.id)::int  AS total_existing
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
    // total_existing (2026-08-25, susulan fix di atas) — rawRows kosong berarti
    // TIDAK ADA established customer yang repeat order di rentang ini, TAPI
    // total_existing tetap harus "existing yang aktif APA PUN" (bukan 0, bukan
    // established_customers mentah) — reuse pola inv_active, query terpisah
    // krn repeat_buyers (dipakai query utama) kosong.
    const [totRow] = await db.execute(sql`
      WITH
      ${establishedCTE},
      inv_active AS (
        SELECT DISTINCT i.customer_id
        FROM invoices i
        LEFT JOIN channel_divisions cd
          ON cd.channel_name = i.channel_name
          AND cd.company_id = i.company_id
        LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
        WHERE i.deleted_at IS NULL
          AND ${companyCondI}
          AND ${rangeStartCond}
          AND i.invoice_date <= ${filterDate}::date
          AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
          AND ${branchCond}
          AND ${divisionScopeCond}
          AND ${excludeIntercompanyCond}
          AND ${onlyParetoCond}
      )
      SELECT COUNT(*)::int AS total_existing
      FROM established_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
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
