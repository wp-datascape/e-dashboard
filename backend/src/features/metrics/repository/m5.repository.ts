import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers, resolveInvoiceScopeConditions } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { HmBreakdownRow } from '../metrics.types'

export async function fetchHmBreakdown(
  p: SegmentParams,
  // dateFrom (2026-08-25, task029.md §33 — M5 dipakai di Value page yg
  // SEKARANG py filter granularitas) — pola sama persis fetchGpBreakdown/M4.
  dateFrom?: string,
): Promise<{ rows: HmBreakdownRow[]; total_hm_revenue: number; hm_buyer_count: number; total_existing: number }> {
  const { filterDate, activeMonths } = p
  const establishedCTE = cteEstablishedCustomers(p, dateFrom ?? `${filterDate.slice(0, 7)}-01`)
  const rangeStartCond = dateFrom
    ? sql`i.invoice_date >= ${dateFrom}::date`
    : sql`i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'`
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    hm_buyers AS (
      SELECT i.customer_id, SUM(ii.revenue::numeric) AS hm_revenue, SUM(ii.quantity)::int AS hm_qty
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
        AND ${rangeStartCond}
        AND i.invoice_date <= ${filterDate}::date
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
        -- Filter divisi laporan (2026-08-31, laporan user: drill-down HM
        -- Buyers tetap tampil "Existing Active: 1.109" saat report difilter
        -- ke 1 divisi/Ucard, padahal tooltip trend chart bilang 11 —
        -- HILANG di sini sebelumnya, cuma divisionScopeCond [RBAC] yang ada,
        -- BUKAN p.division [filter laporan]. Samakan pola dgn m3m7.repository.ts.
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
      GROUP BY i.customer_id
    ),
    -- inv_active (2026-08-25, task029.md §36) — BEDA dari M3/M4: denominator
    -- M5 BUKAN "yang beli HM" (itu numerator/hm_buyers di atas), tapi SEMUA
    -- existing yang transaksi APA PUN di rentang ini — sama persis alias
    -- 'cur' (active_inv_agg) yang dipakai trend chart high_margin_ratio
    -- (fetchCustomerMetricsTrend, m3m7.repository.ts). TANPA JOIN
    -- high_margin_products — sengaja lebih luas dari hm_buyers.
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
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
    ),
    total AS (
      SELECT
        COALESCE(SUM(hb.hm_revenue), 0)                          AS total_hm_revenue,
        COUNT(*)::int                                             AS hm_buyer_count,
        (SELECT COUNT(*) FROM established_customers ec2 JOIN inv_active ia ON ia.customer_id = ec2.id)::int AS total_existing
      FROM hm_buyers hb
      JOIN established_customers ec ON ec.id = hb.customer_id
    )
    SELECT
      -- Ranking (2026-08-25, task029.md §36, koreksi user: "Top 5 itu
      -- harusnya jumlah terbanyak bukan value nya") — GANTI dari
      -- hm_revenue (Rupiah) ke hm_qty (unit/quantity produk HM terjual) —
      -- M5 mengukur PENETRASI (jumlah/keluasan), bukan nilai uang (itu
      -- ranah M3). hm_revenue/hm_pct TETAP diekspos sbg info tambahan per
      -- baris, cuma bukan lagi basis urutan.
      ROW_NUMBER() OVER (ORDER BY hb.hm_qty DESC)::int     AS ranking,
      ec.customer_name,
      ec.customer_code,
      hb.hm_qty                                            AS hm_qty,
      ROUND(hb.hm_revenue)::bigint                         AS hm_revenue,
      ROUND(hb.hm_revenue * 100.0 / NULLIF(t.total_hm_revenue, 0), 1) AS hm_pct,
      t.total_hm_revenue,
      t.hm_buyer_count,
      t.total_existing
    FROM hm_buyers hb
    JOIN established_customers ec ON ec.id = hb.customer_id
    CROSS JOIN total t
    ORDER BY hb.hm_qty DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    // total_existing (2026-08-25, susulan fix di atas) — rawRows kosong berarti
    // TIDAK ADA established customer yang beli HM di rentang ini, TAPI
    // total_existing tetap harus dihitung dari "existing yang aktif APA PUN"
    // (bukan 0, dan bukan established_customers mentah) — reuse pola inv_active
    // yang sama, query kecil terpisah krn hm_buyers (dipakai query utama)
    // kosong.
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
          AND ${branchCond}
          AND ${divisionScopeCond}
          AND ${excludeIntercompanyCond}
          AND ${onlyParetoCond}
          AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
      )
      SELECT COUNT(*)::int AS total_existing
      FROM established_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
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
        hm_qty:        Number(row.hm_qty ?? 0),
        hm_revenue:    Number(row.hm_revenue ?? 0),
        hm_pct:        Number(row.hm_pct ?? 0),
      }
    }),
  }
}
