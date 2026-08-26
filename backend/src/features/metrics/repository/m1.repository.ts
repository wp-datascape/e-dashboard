import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import type { CrossSellingTrendRow, CrossSellingDetailRow, CrossSellingHeatmapRow } from '../metrics.types'
import type { TrailingPeriodBucket } from '@/features/analisis/period.util'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw, buildOnlyParetoRaw } from '@/utils/scope'

// Populasi = "Customer Aktif" (koreksi 2026-08-25, task029.md §34 — dokumen
// SSOT resmi "DEFINISI OPERASIONAL Customer Loyal Dashboard" dijadikan
// acuan): "Customer Aktif adalah pelanggan yang melakukan minimal 1
// transaksi pembelian dalam periode pengukuran" — TANPA syarat riwayat
// transaksi sebelumnya. GANTI dari definisi "Existing relatif periode"
// (§30.10, 2026-08-20) yang SEBELUMNYA dipakai di sini — pilot §30.10 keliru
// menganggap M1/M2 populasinya "Existing", padahal dokumen SSOT eksplisit
// bilang populasi M1 ("Cross Sell Ratio") & M2 ("Average Product Category
// per Customer") itu "Customer Aktif" murni, BUKAN "Existing Customer" (beda
// dari M3/M4/M6/M7 yang MEMANG "Existing Customer" secara definisi resmi,
// lihat §34 tabel ringkasan). Konsekuensi: customer baru (first invoice DI
// DALAM periode ini) SEKARANG IKUT terhitung — sebelumnya sengaja
// dikecualikan, itu yang salah.
//
// Rentang transaksi yang dianalisis (buat cat_count) tetap ikut LEBAR
// PERIODE PENUH (Kuartal = 3 bulan/elapsed, Tahunan = YTD) — BUKAN
// activeMonths 1 bulan lagi, ini juga yang menjawab temuan user "Q3 harusnya
// 51 hari (elapsed sejak 1 Juli), bukan 1 bulan terakhir". `periodStart`
// SELALU batas kalender (tidak pernah dipotong), `periodEnd` BISA dipotong
// elapsed/day-cutoff oleh service layer (period.util.ts) — lihat pemanggil.
const CS_INV_CTE = (p: SegmentParams, periodStart: string, periodEnd: string) => sql`
  inv AS (
    SELECT DISTINCT
      i.id, i.customer_id, i.total_revenue::numeric AS total_revenue,
      -- branch_id/channel_name/invoice_date/division_id ditambah 2026-08-21
      -- (tabel Breakdown M1, task029.md §28.10 Branch/Division/Channel) —
      -- kolom asli tabel invoices, tidak nambah baris (masih 1:1 dgn invoice), aman
      -- di SELECT DISTINCT yang sudah include i.id (unik per invoice).
      i.branch_id, i.channel_name, i.invoice_date,
      COALESCE(c.division_override_id, cd.division_id) AS division_id
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN channel_divisions cd
      ON  cd.channel_name  = i.channel_name
      AND cd.company_id = i.company_id
    WHERE i.deleted_at IS NULL
      AND c.is_placeholder = false
      AND i.invoice_date >= ${periodStart}::date
      AND i.invoice_date <= ${periodEnd}::date
      AND ${buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)}
      AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
      AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
      AND ${buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)}
      AND ${buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)}
      AND ${buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)}
      AND ${buildOnlyParetoRaw('c.id', 'i.company_id', p.filterDate, p.onlyPareto)}
  )
`

export async function fetchCrossSellingKPI(p: SegmentParams, periodStart: string, periodEnd: string) {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p, periodStart, periodEnd)},
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

/**
 * Trend N-periode (default 12, task029.md §30) — `buckets` sudah dihitung di
 * SERVICE layer (`buildTrailingPeriods`, period.util.ts) sesuai granularitas
 * filter (monthly/quarter/semester/annual), masing-masing bawa {label,start,
 * end} sendiri. Populasi "Customer Aktif" (koreksi 2026-08-25, task029.md
 * §34 — SEBELUMNYA "Existing" §30.10, GANTI ke definisi resmi dokumen SSOT:
 * siapa saja dgn minimal 1 transaksi DI DALAM bucket itu, TANPA syarat
 * riwayat transaksi sebelumnya — customer baru IKUT terhitung) — cukup dari
 * `base` (invoice dalam rentang bucket), tidak perlu CTE first_invoice_date/
 * gerbang tambahan apa pun lagi.
 */
export async function fetchCrossSellingTrend(p: SegmentParams, buckets: TrailingPeriodBucket[]): Promise<CrossSellingTrendRow[]> {
  const bucketValues = sql.join(
    buckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )
  const earliestStart = buckets[0]!.start
  const latestEnd = buckets[buckets.length - 1]!.end

  const rawRows = await db.execute(sql`
    WITH
    buckets(label, ps, pe) AS (VALUES ${bucketValues}),
    base AS (
      SELECT
        i.customer_id,
        i.invoice_date,
        ii.product_category_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN channel_divisions cd
        ON  cd.channel_name  = i.channel_name
        AND cd.company_id = i.company_id
      WHERE i.deleted_at IS NULL
        AND c.is_placeholder = false
        AND i.invoice_date >= ${earliestStart}::date
        AND i.invoice_date <= ${latestEnd}::date
        AND ${buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)}
        AND ${buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)}
        AND ${buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)}
        AND ${buildOnlyParetoRaw('c.id', 'i.company_id', p.filterDate, p.onlyPareto)}
        AND ii.product_category_id IS NOT NULL
    ),
    per_bucket AS (
      SELECT
        bk.label,
        b.customer_id,
        COUNT(DISTINCT b.product_category_id) AS cat_count
      FROM buckets bk
      JOIN base b ON b.invoice_date >= bk.ps AND b.invoice_date <= bk.pe
      GROUP BY bk.label, b.customer_id
    ),
    -- Agregasi per bucket sebelum LEFT JOIN ke buckets agar periode tanpa transaksi tetap muncul (nilai 0)
    agg AS (
      SELECT
        label,
        COUNT(*)::int                                                    AS total_active,
        COUNT(*) FILTER (WHERE cat_count > 1)::int                      AS multi_product,
        ROUND(COUNT(*) FILTER (WHERE cat_count > 1)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1)                               AS ratio,
        ROUND(AVG(cat_count)::numeric, 2)                               AS avg_category
      FROM per_bucket
      GROUP BY label
    )
    SELECT
      bk.label                         AS month,
      COALESCE(a.total_active,  0)     AS total_active,
      COALESCE(a.multi_product, 0)     AS multi_product,
      COALESCE(a.ratio,         0)     AS ratio,
      COALESCE(a.avg_category,  0)     AS avg_category
    FROM buckets bk
    LEFT JOIN agg a ON a.label = bk.label
    ORDER BY bk.pe
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

/**
 * Breakdown per tipe produk (task029.md §28.10) — koreksi 2026-08-21: SEBELUMNYA
 * hardcode 3 tipe (unit/consumable/sparepart), TERNYATA item_type per company
 * BERVARIASI (KNT py 6 tipe: unit/consumable/sparepart/card/accesories/software,
 * MKO cuma 4 — 'card' Rp43.8M utk KNT SAMA SEKALI hilang dari tabel dgn hardcode
 * lama). Sekarang DINAMIS, mirror persis pola `fetchCrossSellingHeatmap` di bawah
 * (fetch flat customer×item_type lalu pivot di JS) — BUKAN scoped ke top-30
 * customer seperti heatmap (`categories` di sini dari SEMUA customer di `cc`,
 * heatmap py `categories` sendiri, sengaja terpisah biar tidak ketinggalan tipe
 * yang cuma dibeli customer di luar top-30).
 */
export async function fetchCrossSellingDetail(p: SegmentParams, periodStart: string, periodEnd: string): Promise<{
  rows: CrossSellingDetailRow[]
  categories: string[]
}> {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p, periodStart, periodEnd)},
    cc AS (
      SELECT
        inv.customer_id,
        COUNT(DISTINCT ii.product_category_id)  AS cat_count,
        SUM(ii.revenue::numeric)                AS total_revenue
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      WHERE ii.product_category_id IS NOT NULL
      GROUP BY inv.customer_id
    ),
    -- qty = SUM(quantity) asli kolom invoice_items, BUKAN COUNT(*) baris item
    -- (pola dipakai heatmap M1.1, ambigu — 3 produk beda dlm 1 invoice vs
    -- 1 produk di 3 invoice keduanya keluar "3"). SUM(quantity) tidak ambigu.
    type_breakdown AS (
      SELECT
        inv.customer_id,
        pc.item_type,
        SUM(ii.quantity)::int    AS qty,
        SUM(ii.revenue)::bigint  AS revenue
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      JOIN product_categories pc ON pc.id = ii.product_category_id
      WHERE pc.item_type IS NOT NULL
      GROUP BY inv.customer_id, pc.item_type
    ),
    -- Branch/Division/Channel (task029.md §28.10, 2026-08-21) — customer bisa
    -- transaksi dari branch/channel berbeda-beda DALAM periode yang sama,
    -- tabel butuh 1 nilai per baris — dipilih dari invoice TERBARU customer
    -- itu DI DALAM periode ini (bukan all-time, beda dari cteCustDivision
    -- yang dipakai dormant threshold — di sini scope-nya SENGAJA ikut
    -- periode laporan, bukan properti customer sepanjang hidup).
    latest_inv AS (
      SELECT DISTINCT ON (inv.customer_id)
        inv.customer_id, inv.branch_id, inv.channel_name, inv.division_id
      FROM inv
      ORDER BY inv.customer_id, inv.invoice_date DESC, inv.id DESC
    )
    SELECT
      c.id                       AS customer_id,
      c.customer_code,
      c.customer_name,
      cc.cat_count::int          AS category_count,
      cc.total_revenue::bigint   AS total_revenue,
      cb.name                    AS branch_name,
      d.label                    AS division_label,
      li.channel_name,
      tb.item_type,
      tb.qty,
      tb.revenue
    FROM cc
    JOIN customers c ON c.id = cc.customer_id
    LEFT JOIN latest_inv li ON li.customer_id = cc.customer_id
    LEFT JOIN company_branches cb ON cb.id = li.branch_id
    LEFT JOIN divisions d ON d.id = li.division_id
    LEFT JOIN type_breakdown tb ON tb.customer_id = cc.customer_id
    ORDER BY cc.cat_count DESC, cc.total_revenue DESC, c.id
  `)

  type CustomerAcc = {
    customer_id: number
    customer_code: string | null
    customer_name: string
    category_count: number
    total_revenue: number
    branch: string | null
    division: string | null
    channel: string | null
    type_breakdown: Record<string, { qty: number; revenue: number }>
  }
  const byCustomer = new Map<number, CustomerAcc>()
  const orderedCustomerIds: number[] = []
  const categoryRevenue = new Map<string, number>()

  for (const r of rawRows as unknown[]) {
    const row = r as Record<string, unknown>
    const customerId = Number(row.customer_id)
    if (!byCustomer.has(customerId)) {
      byCustomer.set(customerId, {
        customer_id:    customerId,
        customer_code:  row.customer_code ? String(row.customer_code) : null,
        customer_name:  String(row.customer_name),
        category_count: Number(row.category_count ?? 0),
        total_revenue:  Number(row.total_revenue ?? 0),
        branch:         row.branch_name ? String(row.branch_name) : null,
        division:       row.division_label ? String(row.division_label) : null,
        channel:        row.channel_name ? String(row.channel_name) : null,
        type_breakdown: {},
      })
      orderedCustomerIds.push(customerId)
    }
    const itemType = row.item_type != null ? String(row.item_type) : null
    if (itemType) {
      const qty = Number(row.qty ?? 0)
      const revenue = Number(row.revenue ?? 0)
      byCustomer.get(customerId)!.type_breakdown[itemType] = { qty, revenue }
      categoryRevenue.set(itemType, (categoryRevenue.get(itemType) ?? 0) + revenue)
    }
  }

  const categories = [...categoryRevenue.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)

  const rows: CrossSellingDetailRow[] = orderedCustomerIds.map((id) => {
    const acc = byCustomer.get(id)!
    return {
      customer_id:    acc.customer_id,
      customer_code:  acc.customer_code,
      customer_name:  acc.customer_name,
      category_count: acc.category_count,
      total_revenue:  acc.total_revenue,
      branch:         acc.branch,
      division:       acc.division,
      channel:        acc.channel,
      has_unit:       (acc.type_breakdown.unit?.qty ?? 0) > 0,
      has_consumable: (acc.type_breakdown.consumable?.qty ?? 0) > 0,
      has_sparepart:  (acc.type_breakdown.sparepart?.qty ?? 0) > 0,
      type_breakdown: acc.type_breakdown,
    }
  })

  return { rows, categories }
}

export async function fetchCrossSellingHeatmap(p: SegmentParams, periodStart: string, periodEnd: string): Promise<{
  heatmap: CrossSellingHeatmapRow[]
  categories: string[]
}> {
  const rawRows = await db.execute(sql`
    WITH
    ${CS_INV_CTE(p, periodStart, periodEnd)},
    type_counts AS (
      SELECT pc.item_type AS name, COUNT(*) AS freq
      FROM inv
      JOIN invoice_items ii ON ii.invoice_id = inv.id
      JOIN product_categories pc ON pc.id = ii.product_category_id
      WHERE pc.item_type IS NOT NULL
      GROUP BY pc.item_type
      ORDER BY freq DESC
    ),
    -- Seleksi + urutan 30 customer = total revenue gabungan semua kategori (unit+
    -- sparepart+consumable), terbesar dulu. Dulu pakai type_count (jumlah kategori
    -- berbeda) DESC lalu tx_count DESC - hasilnya customer dengan 1 transaksi di 3
    -- kategori (total 3 tx) ranking di atas customer dengan 13 transaksi tapi cuma 2
    -- kategori, jelas tidak masuk akal secara bisnis. Laporan user 2026-07-23.
    top_customers AS (
      SELECT inv.customer_id, SUM(inv.total_revenue) AS revenue
      FROM inv
      GROUP BY inv.customer_id
      ORDER BY revenue DESC
      LIMIT 30
    )
    SELECT
      tc.customer_id                         AS customer_id,
      c.customer_name                        AS customer,
      pc.item_type                           AS category,
      -- COUNT(DISTINCT invoice_id), BUKAN COUNT(*) baris item (2026-08-22,
      -- koreksi user: "harusnya sama dengan jumlah invoice agar tidak
      -- ambigu" — angka sel heatmap dulu = jumlah BARIS invoice_items
      -- (bisa >1 per invoice kalau 1 invoice punya beberapa baris produk
      -- di kategori sama), beda dari drill-down dialog yang nunjukkin
      -- "Total Invoice" (COUNT DISTINCT invoice), bikin 2 angka yang
      -- MESTINYA sama tapi keliatan beda. Sekarang keduanya pakai definisi
      -- SAMA PERSIS: jumlah invoice unik.
      COUNT(DISTINCT ii.invoice_id)::int     AS purchase_count,
      SUM(ii.revenue)                        AS category_revenue,
      tc2.freq                               AS cat_freq,
      tc.revenue                             AS customer_total_revenue
    FROM top_customers tc
    JOIN customers c ON c.id = tc.customer_id
    JOIN inv         ON inv.customer_id = tc.customer_id
    JOIN invoice_items ii ON ii.invoice_id = inv.id
    JOIN product_categories pc ON pc.id = ii.product_category_id
    JOIN type_counts tc2 ON tc2.name = pc.item_type
    WHERE pc.item_type IS NOT NULL
    GROUP BY tc.customer_id, c.customer_name, pc.item_type, tc2.freq, tc.revenue
    ORDER BY tc.revenue DESC, c.customer_name, tc2.freq DESC
  `)

  const catFreqMap = new Map<string, number>()
  const customerMap = new Map<string, Record<string, number>>()
  const customerRevenueMap = new Map<string, Record<string, number>>()
  const customerTotalRevenue = new Map<string, number>()
  const customerIdMap = new Map<string, number>()

  for (const r of rawRows as unknown[]) {
    const row = r as Record<string, unknown>
    const customer   = String(row.customer)
    const customerId = Number(row.customer_id)
    const category  = String(row.category)
    const count     = Number(row.purchase_count ?? 0)
    const revenue   = Number(row.category_revenue ?? 0)
    const freq      = Number(row.cat_freq ?? 0)
    const totalRev  = Number(row.customer_total_revenue ?? 0)
    if (!catFreqMap.has(category)) catFreqMap.set(category, freq)
    if (!customerMap.has(customer)) customerMap.set(customer, {})
    if (!customerRevenueMap.has(customer)) customerRevenueMap.set(customer, {})
    customerMap.get(customer)![category] = count
    customerRevenueMap.get(customer)![category] = revenue
    customerTotalRevenue.set(customer, totalRev)
    customerIdMap.set(customer, customerId)
  }

  const categories = [...catFreqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  const heatmap: CrossSellingHeatmapRow[] = [...customerMap.entries()].map(([customer, values]) => ({
    customer,
    customer_id: customerIdMap.get(customer) ?? 0,
    values,
    revenues: customerRevenueMap.get(customer) ?? {},
    total_revenue: customerTotalRevenue.get(customer) ?? 0,
  }))

  return { heatmap, categories }
}
