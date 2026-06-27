import { db } from '@/config/db'
import { sql } from 'drizzle-orm'

export type TrendRow = {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  high_margin_ratio: number
  repeat_order_rate: number
  expansion_rate: number
}

/**
 * Satu query CTE untuk semua data tren M3–M7 (12 bulan ke belakang dari period).
 *
 * activeWindow dibaca dari business_configs (active_window_months) oleh service,
 * bukan dari query param — konsisten dengan customers feature.
 *
 * Definisi yang dipakai:
 *  Existing  = customers.first_invoice_date < awal bulan
 *  M3 avg_revenue     = total_revenue / count_who_transacted
 *  M4 avg_gross_profit = total_gp / count_who_transacted
 *  M5 high_margin_ratio = count_existing_bought_hm / count_existing × 100
 *  M6 repeat_order_rate = count_existing_transacted / count_existing × 100
 *  M7 expansion_rate  = count(spent_up_vs_prev) / count(transacted_in_both) × 100
 */
export async function fetchCustomerMetricsTrend(
  companyId: number | 'all',
  periodStr: string,   // 'YYYY-MM-01' — first day of period month
  activeWindow: number, // dari business_configs active_window_months
): Promise<TrendRow[]> {
  const cid = companyId === 'all' ? 0 : companyId

  const rows = await db.execute(sql`
    WITH
    months AS (
      SELECT generate_series(
        date_trunc('month', ${periodStr}::date) - INTERVAL '11 months',
        date_trunc('month', ${periodStr}::date),
        INTERVAL '1 month'
      )::date AS ms
    ),

    -- Agregat invoice per (bulan, customer).
    -- Range diperluas (12 + activeWindow) bulan agar active_existing bisa cek
    -- siapa yang aktif di bulan paling awal dalam trend.
    inv AS (
      SELECT
        date_trunc('month', i.invoice_date)::date AS ms,
        i.customer_id,
        SUM(i.total_revenue::numeric) AS rev,
        SUM(i.total_gp::numeric)      AS gp
      FROM invoices i
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
        AND i.invoice_date >= date_trunc('month', ${periodStr}::date) - (12 + ${activeWindow}::int) * INTERVAL '1 month'
        AND i.invoice_date <  date_trunc('month', ${periodStr}::date) + INTERVAL '1 month'
      GROUP BY 1, 2
    ),

    -- Customer yang membeli produk high margin per bulan (M5)
    hm AS (
      SELECT DISTINCT
        date_trunc('month', i.invoice_date)::date AS ms,
        i.customer_id
      FROM invoices i
      JOIN invoice_items ii  ON ii.invoice_id = i.id
      JOIN high_margin_products hmp ON (
        hmp.product_category_id = ii.product_category_id
        OR hmp.product_id = ii.product_id
      )
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id      = ${cid}::int)
        AND (${cid}::int = 0 OR hmp.company_id    = ${cid}::int)
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
        AND i.invoice_date >= date_trunc('month', ${periodStr}::date) - INTERVAL '11 months'
        AND i.invoice_date <  date_trunc('month', ${periodStr}::date) + INTERVAL '1 month'
    ),

    -- Existing customers per bulan: first_invoice_date < awal bulan
    existing AS (
      SELECT c.id, m.ms
      FROM customers c
      CROSS JOIN months m
      WHERE (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND c.first_invoice_date IS NOT NULL
        AND c.first_invoice_date < m.ms
    ),

    -- Active existing customers per bulan: existing + punya transaksi dalam active_window
    -- Dipakai sebagai denominator M5, M6, M7
    -- active_window_months dari business_configs (bukan query param)
    active_existing AS (
      SELECT DISTINCT e.id, e.ms
      FROM existing e
      JOIN inv act ON act.customer_id = e.id
        AND act.ms >= (e.ms - (${activeWindow}::int * INTERVAL '1 month'))::date
        AND act.ms <= e.ms
    )

    SELECT
      TO_CHAR(m.ms, 'YYYY-MM') AS month,

      -- Total existing customers bulan ini (untuk info/display)
      COUNT(DISTINCT e.id)::int AS existing_customers,

      -- M3: total revenue dari existing customers yang transaksi
      COALESCE(SUM(cur.rev), 0) AS total_revenue_existing,

      -- M3: avg revenue per existing customer yang transaksi
      ROUND(
        COALESCE(SUM(cur.rev), 0)
        / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 0
      ) AS avg_revenue,

      -- M4: avg gross profit per existing customer yang transaksi
      ROUND(
        COALESCE(SUM(cur.gp), 0)
        / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 0
      ) AS avg_gross_profit,

      -- M5: % active existing customer yang beli high margin
      -- Denominator = active existing (punya transaksi dalam active_window bulan terakhir)
      ROUND(
        COUNT(DISTINCT hmr.customer_id)::numeric * 100
        / NULLIF(COUNT(DISTINCT ae.id), 0), 1
      ) AS high_margin_ratio,

      -- M6: % active existing customer yang transaksi bulan ini (repeat order)
      ROUND(
        COUNT(DISTINCT CASE WHEN ae.id IS NOT NULL THEN cur.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT ae.id), 0), 1
      ) AS repeat_order_rate,

      -- M7: % active existing customer dengan spending naik vs bulan lalu
      -- Hanya hitung customer yang transaksi di KEDUA bulan
      ROUND(
        COUNT(DISTINCT CASE
          WHEN ae.id IS NOT NULL
           AND cur.customer_id IS NOT NULL
           AND prev.customer_id IS NOT NULL
           AND cur.rev > prev.rev
          THEN e.id END)::numeric * 100
        / NULLIF(
            COUNT(DISTINCT CASE
              WHEN ae.id IS NOT NULL
               AND cur.customer_id IS NOT NULL
               AND prev.customer_id IS NOT NULL
              THEN e.id END),
            0
          ), 1
      ) AS expansion_rate

    FROM months m
    LEFT JOIN existing e
           ON e.ms = m.ms
    LEFT JOIN active_existing ae
           ON ae.id = e.id AND ae.ms = e.ms
    LEFT JOIN inv cur
           ON cur.ms = m.ms
          AND cur.customer_id = e.id
    LEFT JOIN inv prev
           ON prev.ms = (m.ms - INTERVAL '1 month')::date
          AND prev.customer_id = e.id
    LEFT JOIN hm hmr
           ON hmr.ms = m.ms
          AND hmr.customer_id = ae.id

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
    }
  })
}
