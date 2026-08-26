import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { cteEstablishedCustomers, resolveInvoiceScopeConditions, cteCustDivision, dormantThresholdCaseSql, dormantCrossedSql } from '../segment.helper'
import type { SegmentParams } from '../segment.helper'
import type { RevenueBreakdownRow, ExpansionBreakdownRow } from '../metrics.types'
import { buildCompanyConditionRaw } from '@/utils/scope'
import type { TrailingPeriodBucket } from '@/features/analisis/period.util'

export type TrendRow = {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  gp_tier1: number
  gp_tier2: number
  gp_tier3: number
  top_gp_customer_id: number | null
  top_gp_customer_name: string | null
  top_gp_revenue: number
  top_gp_pct: number
  high_margin_ratio: number
  // Angka mentah numerator high_margin_ratio (2026-08-25, task029.md §36) —
  // dipakai bar chart trend M5.
  high_margin_buyer_count: number
  repeat_order_rate: number
  expansion_rate: number
  flat_rate: number
  inactive_rate: number
  down_rate: number
  // Jumlah customer mentah per kategori (2026-08-22, user: "Aku butuh data
  // jumlah nya selain dari persentase") — dihitung dari CASE WHEN yang
  // SAMA PERSIS dgn up_rate/flat_rate/inactive_rate/down_rate di atas,
  // cuma tanpa dibagi/dikali 100 (COUNT DISTINCT e.id mentah).
  up_count: number
  flat_count: number
  inactive_count: number
  down_count: number
  // Populasi M7 (koreksi 2026-08-25, task029.md §34-lanjutan) — existing
  // DAN belum melewati ambang dormant per kategori bisnis divisi (SAMA
  // PERSIS ambang M8, reuse dormantThresholdCaseSql). Existing yang SUDAH
  // resmi dormant DIKELUARKAN dari expansion_rate/flat_rate/inactive_rate/
  // down_rate — itu ranah M8, bukan lagi soal "expansion". Existing yang
  // baru absen TAPI belum lewat ambang TETAP masuk (biasanya jatuh ke
  // inactive_rate/down_rate — sinyal dini yang masih actionable, beda dari
  // yang sudah lama mati). Pembagi BARU utk 4 rate + 4 raw count M7 (GANTI
  // dari `existing_customers`/COUNT(DISTINCT e.id) kumulatif).
  existing_not_dormant_count: number
  active_existing_count: number
  active_new_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
  hm_revenue: number
}

/**
 * Tren 12 titik (Bulanan/Kuartalan/Semesteran/Tahunan, task029.md §30.9
 * poin 1, 2026-08-22) untuk M3–M7 — generalisasi dari versi lama yang
 * hardcode 12 bulan kalender (`generate_series`). Pola bucket VALUES-list
 * SAMA PERSIS `fetchCrossSellingTrend` (M1, `m1.repository.ts`) — REUSE,
 * bukan tulis ulang. Service layer (`getCustomerMetrics`) yang menghitung
 * tanggal 12 bucket (`buildTrailingPeriods`) — repository ini TIDAK
 * menghitung tanggal periode sendiri (pembagian layer, CRITICAL_RULES.md).
 *
 * existing = bukan customer baru (task028: TERMASUK yang sudah dormant)
 * active   = ada invoice DALAM BUCKET itu sendiri (subset existing)
 *
 * 2 keputusan desain generalisasi (task029.md §30.9, plan 2026-08-22,
 * TIDAK mengubah makna bisnis "siapa existing" — task026 §8e):
 * 1. Kualifikasi "Existing" (first_invoice_date < X) di-anchor ke AWAL
 *    bucket (`b.ps`), BUKAN akhir bucket spt sebelumnya — supaya tidak
 *    melonggar liar utk bucket lebar (Kuartal/Semester/Tahun). Formula
 *    date_trunc-anchored (pola SAMA fix M1 §30.7) SEKALIAN
 *    memperbaiki bug off-by-one lama (`bucket_end - activeMonths bulan`
 *    mentah, §30.9 poin 4) — utk bucket BULANAN & activeMonths=1 (default
 *    config saat ini), hasilnya PERSIS SAMA dgn perilaku lama (diverifikasi
 *    numerik).
 * 2. Window "current"/"previous" agregasi (revenue M3/M4, rate M7) SEKARANG
 *    IKUT LEBAR BUCKET ITU SENDIRI (whole bucket), bukan lagi fixed
 *    activeMonths — sesuai keputusan §30.3 ("Rate KPI: recompute dari
 *    total se-periode" + "SUM murni aman dijumlah [across periode]"). Utk
 *    granularitas BULANAN (activeMonths=1 = lebar bucket bulanan), hasilnya
 *    JUGA identik dgn sebelumnya — bedanya cuma kelihatan di kuartal/
 *    semester/tahun (baru, belum pernah ada).
 */
export async function fetchCustomerMetricsTrend(p: SegmentParams, buckets: TrailingPeriodBucket[], prevBuckets: TrailingPeriodBucket[]): Promise<TrendRow[]> {
  const { cid, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  // M7 dormant threshold (2026-08-25) — SAMA PERSIS pola m8m10.repository.ts
  // (dormantThresholdCaseSql + cteCustDivision), reuse bukan tulis ulang.
  const dormantThresholdSql = dormantThresholdCaseSql(p)

  const bucketValues = sql.join(
    buckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )
  const prevBucketValues = sql.join(
    prevBuckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )
  const earliestStart = prevBuckets[0]!.start
  const latestEnd = buckets[buckets.length - 1]!.end

  const rows = await db.execute(sql`
    WITH
    buckets(label, ps, pe) AS (VALUES ${bucketValues}),
    prev_buckets(label, ps, pe) AS (VALUES ${prevBucketValues}),

    -- Semua invoice relevan: dari awal bucket "previous" paling lama
    -- (dibutuhkan prev_inv_agg titik pertama) sampai akhir bucket terakhir.
    raw_inv AS (
      SELECT i.id AS invoice_id, i.customer_id, i.invoice_date,
             i.total_revenue::numeric AS rev,
             i.total_gp::numeric      AS gp
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
        AND ${onlyParetoCond}
        AND i.invoice_date >= ${earliestStart}::date
        AND i.invoice_date <= ${latestEnd}::date
    ),

    -- Invoice HM relevan, rentang SAMA dgn raw_inv. Tidak DISTINCT (beda
    -- dari sebelumnya) - butuh revenue per invoice_item utk SUM di
    -- hm_inv_agg (tooltip hover M3); CTE hm di bawah tetap aman karena cuma
    -- project label+customer_id dengan DISTINCT-nya sendiri.
    hm_raw AS (
      SELECT i.customer_id, i.invoice_date, ii.revenue::numeric AS revenue
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
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
        AND i.invoice_date >= ${earliestStart}::date
        AND i.invoice_date <= ${latestEnd}::date
    ),

    -- Existing customers per bucket: bukan customer baru — TERMASUK yang
    -- sudah dormant (task028, supersede task027 §4: Existing = semua
    -- customer kecuali New). EXISTS di bawah query langsung ke tabel
    -- invoices (bukan CTE raw_inv, yang lower-bound-nya dibatasi ke rentang
    -- 13-bucket saja) — cek keanggotaan ini perlu tembus ke invoice sejauh
    -- apa pun ke belakang, cuma upper-bound (invoice <= akhir bucket ini) +
    -- scope filter, mirror pola cteEstablishedCustomers.
    existing AS (
      SELECT DISTINCT c.id, b.label
      FROM customers c
      CROSS JOIN buckets b
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        -- not new: first invoice SEBELUM AWAL bucket (§30.10, definisi
        -- final — relatif periode, BUKAN activeMonths). b.ps SUDAH
        -- batas kalender bucket itu sendiri (TrailingPeriodBucket.start,
        -- tidak pernah digeser), jadi cukup dibandingkan langsung, TANPA
        -- date_trunc/activeMonths/pengurangan hari tambahan — bug ditemukan
        -- 2026-08-23 (instruksi user "patokan ke definisi terbaru"):
        -- formula lama SALAH reintroduce activeMonths ke perbandingan ini
        -- (§30.10 eksplisit bilang New/Existing TIDAK relatif activeMonths
        -- sama sekali) DAN kurang 1 hari ekstra (exclude customer yang
        -- first invoice-nya PERSIS di hari terakhir bulan sebelumnya,
        -- padahal itu "sebelum awal bucket" jadi harusnya Existing) — pola
        -- benar PERSIS cteExistingCustomersByPeriod (segment.helper.ts,
        -- referensi asli §30.10 M1). Baca langsung customers.first_invoice_date
        -- (bukan CTE first_inv/MIN scan 246rb+ invoice lagi) — kolom ini
        -- SUDAH dipelihara akurat tiap import (upsertCustomer,
        -- import.repository.ts).
        AND c.first_invoice_date < b.ps
        AND EXISTS (
          SELECT 1
          FROM invoices i
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = i.channel_name
            AND cd.company_id = i.company_id
          LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
          WHERE i.customer_id = c.id
            AND i.deleted_at IS NULL
            AND ${companyCondI}
            AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
            AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
            AND ${branchCond}
            AND ${divisionScopeCond}
            AND ${excludeIntercompanyCond}
            AND ${onlyParetoCond}
            AND i.invoice_date <= b.pe
        )
    ),

    -- M7: populasi "existing DAN belum lewat ambang dormant" per bucket
    -- (2026-08-25, task029.md §34-lanjutan, koreksi user via diskusi
    -- panjang: "customer baru tidak ada pembanding" [new dikeluarkan,
    -- SUDAH via CTE existing di atas] + "dormant tidak akan punya
    -- pembanding periode sebelumnya" [customer yang SUDAH resmi dormant
    -- dikeluarkan juga] + "perlihatkan tidak papa, tapi tidak dimasukkan
    -- ke perhitungan" [kategori "Tidak Aktif" TETAP tampil di chart, tapi
    -- HANYA utk yang baru absen belum lewat ambang — bukan disembunyikan,
    -- tapi juga tidak mencampur yang sudah lama mati]. Ambang SAMA PERSIS
    -- M8 (dormantThresholdCaseSql, per kategori bisnis divisi) — 1 sumber
    -- kebenaran, bukan aturan baru.
    ${cteCustDivision(p)},
    cust_dormant_threshold AS (
      SELECT c.id AS cid, ${dormantThresholdSql} AS dormant_threshold
      FROM customers c
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      WHERE c.is_placeholder = false AND ${companyCondC}
    ),
    -- Invoice TANPA batas bawah tanggal (beda dari raw_inv yang dibatasi ke
    -- window trailing-buckets) — status dormant butuh tahu transaksi
    -- TERAKHIR sungguhan, bisa jauh sebelum window trend 12 titik dimulai.
    -- Pola SAMA PERSIS m8m10.repository.ts CTE 'inv'.
    last_inv_unbounded AS (
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
        AND ${onlyParetoCond}
    ),
    last_inv_per_bucket AS (
      SELECT b.label, e.id AS customer_id, b.pe AS bucket_end, cdt.dormant_threshold,
        MAX(li.invoice_date) AS last_inv_before_be
      FROM buckets b
      JOIN existing e ON e.label = b.label
      JOIN cust_dormant_threshold cdt ON cdt.cid = e.id
      LEFT JOIN last_inv_unbounded li ON li.customer_id = e.id AND li.invoice_date <= b.pe
      GROUP BY b.label, e.id, b.pe, cdt.dormant_threshold
    ),
    existing_not_dormant AS (
      SELECT label, customer_id
      FROM last_inv_per_bucket
      WHERE last_inv_before_be IS NOT NULL
        AND ${dormantCrossedSql(sql`last_inv_before_be`, sql`bucket_end`, sql`dormant_threshold`, true)}
    ),

    -- Revenue + GP per existing customer per bucket (window: SELURUH
    -- bucket itu sendiri, bukan lagi activeMonths — Keputusan desain #2).
    -- invoice_count DIGABUNG dari repeat_orders (dulu CTE terpisah, JOIN
    -- ke-6 pada spine customer x bucket yang sama persis - restrukturisasi
    -- 2026-08-21, audit performa: 8+ Merge Join berantai pada ~275rb baris
    -- dominasi waktu eksekusi).
    active_inv_agg AS (
      SELECT b.label, ri.customer_id, SUM(ri.rev) AS rev, SUM(ri.gp) AS gp,
        COUNT(DISTINCT ri.invoice_id) AS invoice_count
      FROM raw_inv ri
      JOIN buckets b ON ri.invoice_date >= b.ps AND ri.invoice_date <= b.pe
      JOIN existing e ON e.id = ri.customer_id AND e.label = b.label
      GROUP BY b.label, ri.customer_id
    ),

    -- M7: revenue per existing customer di BUCKET SEBELUMNYA (lebar sama
    -- dgn bucket current, Keputusan desain #2) — bukan lagi 2×activeMonths
    -- mundur dari bucket_end.
    prev_inv_agg AS (
      SELECT pb.label, ri.customer_id, SUM(ri.rev) AS rev
      FROM raw_inv ri
      JOIN prev_buckets pb ON ri.invoice_date >= pb.ps AND ri.invoice_date <= pb.pe
      JOIN existing e ON e.id = ri.customer_id AND e.label = pb.label
      GROUP BY pb.label, ri.customer_id
    ),

    -- Kontribusi revenue High Margin per existing customer per bucket
    -- (tooltip hover M3, task006) - populasi & window sama dengan
    -- active_inv_agg supaya konsisten dgn total_revenue_existing. JUGA
    -- dipakai sbg penentu keanggotaan M5 (customer yang MUNCUL di sini
    -- otomatis "beli HM dalam window ini", tidak perlu CTE keanggotaan
    -- terpisah).
    hm_inv_agg AS (
      SELECT b.label, hr.customer_id, SUM(hr.revenue) AS hm_revenue
      FROM hm_raw hr
      JOIN buckets b ON hr.invoice_date >= b.ps AND hr.invoice_date <= b.pe
      JOIN existing e ON e.id = hr.customer_id AND e.label = b.label
      GROUP BY b.label, hr.customer_id
    ),

    -- New customers per bucket: first invoice dalam bucket itu sendiri
    -- (komplemen persis dari kualifikasi "existing" di atas — formula
    -- ambang SAMA, cuma tandanya dibalik).
    new_cust AS (
      SELECT DISTINCT c.id, b.label
      FROM customers c
      CROSS JOIN buckets b
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        -- New = komplemen persis dari existing (§30.10) — first invoice DI
        -- DALAM bucket ini (>= b.ps), bug off-by-one/activeMonths yang sama
        -- dgn CTE existing di atas, fix sama.
        AND c.first_invoice_date >= b.ps
        AND c.first_invoice_date <= b.pe
        AND EXISTS (
          SELECT 1 FROM raw_inv ri
          WHERE ri.customer_id = c.id
            AND ri.invoice_date >= b.ps AND ri.invoice_date <= b.pe
        )
    ),

    -- Pre-aggregated new customer count — hindari cartesian product di main SELECT
    new_cust_cnt AS (
      SELECT label, COUNT(DISTINCT id)::int AS cnt
      FROM new_cust
      GROUP BY label
    ),

    -- Active existing count + median revenue per bucket (M3 enrichment)
    monthly_extras AS (
      SELECT label,
        COUNT(*)::int AS active_existing_count,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rev))::bigint AS median_revenue
      FROM active_inv_agg
      GROUP BY label
    ),

    -- Top revenue contributor per bucket
    top_contrib AS (
      SELECT DISTINCT ON (label)
        label, customer_id, rev AS top_rev,
        ROUND(rev * 100.0 / NULLIF(SUM(rev) OVER (PARTITION BY label), 0), 1) AS top_pct
      FROM active_inv_agg
      ORDER BY label, rev DESC
    ),

    -- Median GP per bucket (M4 tier threshold)
    gp_median_per_month AS (
      SELECT label, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gp) AS gp_median_threshold
      FROM active_inv_agg
      GROUP BY label
    ),

    -- GP tier breakdown per bucket
    gp_tier_breakdown AS (
      SELECT
        ai.label,
        SUM(CASE WHEN ai.gp >  gm.gp_median_threshold            THEN ai.gp ELSE 0 END) AS tier1_gp,
        SUM(CASE WHEN ai.gp <= gm.gp_median_threshold
                 AND ai.gp >  gm.gp_median_threshold * 0.5       THEN ai.gp ELSE 0 END) AS tier2_gp,
        SUM(CASE WHEN ai.gp <= gm.gp_median_threshold * 0.5      THEN ai.gp ELSE 0 END) AS tier3_gp
      FROM active_inv_agg ai
      JOIN gp_median_per_month gm ON gm.label = ai.label
      GROUP BY ai.label
    ),

    -- Top GP contributor per bucket
    top_contrib_gp AS (
      SELECT DISTINCT ON (label)
        label, customer_id, gp AS top_gp,
        ROUND(gp * 100.0 / NULLIF(SUM(gp) OVER (PARTITION BY label), 0), 1) AS top_gp_pct
      FROM active_inv_agg
      ORDER BY label, gp DESC
    )

    SELECT
      b.label AS month,

      -- Populasi M3/M4/M5/M6 (2026-08-25, task029.md §34 — GANTI dari
      -- COUNT(DISTINCT e.id) "existing kumulatif" TERMASUK yang sudah
      -- dormant, ke COUNT(DISTINCT cur.customer_id) "existing DAN masih
      -- bertransaksi periode ini") — sesuai dokumen SSOT resmi
      -- (DEFINISI_OPERASIONAL_CUSTOMER_LOYAL_DASHBOARD.docx): "Existing
      -- Customer adalah customer yang sudah memiliki riwayat transaksi
      -- sebelum periode berjalan DAN MASIH MELAKUKAN PEMBELIAN PADA
      -- PERIODE TERSEBUT" — jadi customer dormant SECARA DEFINISI bukan
      -- "Existing" utk 4 KPI ini, bukan cuma "existing yang dilute rata-
      -- rata". Alias 'cur' = active_inv_agg (sudah di-JOIN, HANYA berisi
      -- customer dgn invoice DI DALAM bucket ini) — REUSE, tidak perlu
      -- CTE/JOIN baru. M5 (high_margin_ratio) numerator TETAP dari alias
      -- 'hia', denominator ikut disamakan ke populasi Existing
      -- yang sama (keputusan user 2026-08-25: M5 pakai definisi "Existing",
      -- bukan "Customer Aktif" spt M1/M2).
      COUNT(DISTINCT cur.customer_id)::int AS existing_customers,

      COALESCE(SUM(cur.rev), 0) AS total_revenue_existing,

      ROUND(
        COALESCE(SUM(cur.rev), 0) / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 0
      ) AS avg_revenue,

      ROUND(
        COALESCE(SUM(cur.gp), 0) / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 0
      ) AS avg_gross_profit,

      ROUND(
        COUNT(DISTINCT hia.customer_id)::numeric * 100
        / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 1
      ) AS high_margin_ratio,

      -- high_margin_buyer_count (2026-08-25, task029.md §36) — angka
      -- mentah dari high_margin_ratio di atas (SAMA numerator, alias
      -- 'hia', TANPA dibagi/dikali 100) — dibutuhkan chart trend M5
      -- (bar = existing_customers vs high_margin_buyer_count, pola SAMA
      -- up_count/flat_count dst M7) yang MENGGANTIKAN DonutChartWidget
      -- snapshot lama (instruksi user: "chart nya buat jadi 12 titik
      -- tren seperti cart lain").
      COUNT(DISTINCT hia.customer_id)::int AS high_margin_buyer_count,

      ROUND(
        COUNT(DISTINCT CASE WHEN cur.invoice_count > 1 THEN cur.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT cur.customer_id), 0), 1
      ) AS repeat_order_rate,

      -- M7: existing (belum lewat ambang dormant, alias 'nd' =
      -- existing_not_dormant) yang spend naik vs periode sebelumnya
      -- (2026-08-25, task029.md §34-lanjutan — GANTI pembagi dari e.id
      -- kumulatif ke nd.customer_id, lihat CTE existing_not_dormant di atas
      -- + JOIN di FROM clause bawah).
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0)
          THEN nd.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT nd.customer_id), 0), 1
      ) AS expansion_rate,

      -- M7 3-way split (koreksi user 2026-08-10: "pisahkan flat/turun jadi
      -- masing-masing 1 card, chart kiri 3 balok Naik/Flat/Turun") — dulu
      -- cuma binary up vs flat_down (100-expansion_rate), sekarang flat
      -- dan turun (cur < prev) dipisah eksak, bukan didekati.
      -- expansion_rate/flat_down_rate TIDAK dihapus (masih dipakai
      -- M7Expansion.tsx chart tren kanan, 2-way, di luar scope perubahan ini).
      --
      -- 4-way (koreksi user 2026-08-21, KERAS: "datamu tidak valid jika
      -- tanpa transaksi kamu beri label stabil") — flat_rate SEBELUMNYA
      -- include customer yang literally TIDAK ADA transaksi di kedua window
      -- (cur=prev=0) sbg "Flat/Stabil" — SALAH secara bisnis, "stabil"
      -- cuma masuk akal kalau customer itu MEMANG masih order (nilainya
      -- sama persis), bukan yang tidak order sama sekali. Dipisah jadi
      -- flat_rate (cur=prev, DAN cur>0 — genuinely tidak berubah) vs
      -- inactive_rate (cur=prev=0 — tidak ada sinyal sama sekali,
      -- kategori terpisah, BUKAN bagian dari "stabil").
      --
      -- inactive_rate/down_rate (2026-08-25, susulan) — TETAP tampil di
      -- chart (keputusan user: "perlihatkan tidak papa"), TAPI populasinya
      -- SEKARANG cuma existing yang BELUM lewat ambang dormant (alias 'nd')
      -- — yang SUDAH resmi dormant dikeluarkan dari perhitungan sama sekali
      -- ("tidak dimasukkan ke perhitungan"), jadi bukan lagi disembunyikan
      -- (dulu) atau mendominasi (90%, metrics_docs.md) tapi murni sinyal
      -- "baru absen, belum lewat ambang" yang actionable.
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) = COALESCE(prv.rev, 0) AND COALESCE(cur.rev, 0) > 0
          THEN nd.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT nd.customer_id), 0), 1
      ) AS flat_rate,
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) = 0 AND COALESCE(prv.rev, 0) = 0
          THEN nd.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT nd.customer_id), 0), 1
      ) AS inactive_rate,
      ROUND(
        COUNT(DISTINCT CASE
          WHEN COALESCE(cur.rev, 0) < COALESCE(prv.rev, 0)
          THEN nd.customer_id END)::numeric * 100
        / NULLIF(COUNT(DISTINCT nd.customer_id), 0), 1
      ) AS down_rate,

      -- Jumlah mentah (2026-08-22, "butuh data jumlah, bukan cuma
      -- persentase") — CASE WHEN sama persis rate di atas, tanpa *100/…
      COUNT(DISTINCT CASE
        WHEN COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0)
        THEN nd.customer_id END)::int AS up_count,
      COUNT(DISTINCT CASE
        WHEN COALESCE(cur.rev, 0) = COALESCE(prv.rev, 0) AND COALESCE(cur.rev, 0) > 0
        THEN nd.customer_id END)::int AS flat_count,
      COUNT(DISTINCT CASE
        WHEN COALESCE(cur.rev, 0) = 0 AND COALESCE(prv.rev, 0) = 0
        THEN nd.customer_id END)::int AS inactive_count,
      COUNT(DISTINCT CASE
        WHEN COALESCE(cur.rev, 0) < COALESCE(prv.rev, 0)
        THEN nd.customer_id END)::int AS down_count,

      COUNT(DISTINCT nd.customer_id)::int AS existing_not_dormant_count,

      COALESCE(MAX(me.active_existing_count), 0)::int AS active_existing_count,
      COALESCE(MAX(ncc.cnt), 0)::int                   AS active_new_count,
      COALESCE(MAX(me.median_revenue), 0)             AS median_revenue,
      MAX(tc.customer_id)                            AS top_customer_id,
      MAX(cust_top.customer_name)                    AS top_customer_name,
      COALESCE(MAX(ROUND(tc.top_rev)), 0)            AS top_customer_revenue,
      COALESCE(MAX(tc.top_pct), 0)                  AS top_customer_pct,
      COALESCE(MAX(gtb.tier1_gp), 0)                AS gp_tier1,
      COALESCE(MAX(gtb.tier2_gp), 0)                AS gp_tier2,
      COALESCE(MAX(gtb.tier3_gp), 0)                AS gp_tier3,
      MAX(tcg.customer_id)                           AS top_gp_customer_id,
      MAX(cust_top_gp.customer_name)                 AS top_gp_customer_name,
      COALESCE(MAX(ROUND(tcg.top_gp)), 0)            AS top_gp_revenue,
      COALESCE(MAX(tcg.top_gp_pct), 0)              AS top_gp_pct,
      COALESCE(SUM(hia.hm_revenue), 0)               AS hm_revenue

    FROM buckets b
    LEFT JOIN existing e          ON e.label = b.label
    LEFT JOIN existing_not_dormant nd ON nd.label = b.label AND nd.customer_id = e.id
    LEFT JOIN active_inv_agg cur  ON cur.label = b.label AND cur.customer_id = e.id
    LEFT JOIN prev_inv_agg   prv  ON prv.label = b.label AND prv.customer_id = e.id
    LEFT JOIN hm_inv_agg hia      ON hia.label = b.label AND hia.customer_id = e.id
    LEFT JOIN monthly_extras me   ON me.label = b.label
    LEFT JOIN new_cust_cnt ncc    ON ncc.label = b.label
    LEFT JOIN top_contrib tc      ON tc.label = b.label
    LEFT JOIN customers cust_top  ON cust_top.id = tc.customer_id
    LEFT JOIN gp_tier_breakdown gtb ON gtb.label = b.label
    LEFT JOIN top_contrib_gp tcg  ON tcg.label = b.label
    LEFT JOIN customers cust_top_gp ON cust_top_gp.id = tcg.customer_id
    GROUP BY b.label, b.pe
    ORDER BY b.pe
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
      high_margin_buyer_count: Number(row.high_margin_buyer_count ?? 0),
      repeat_order_rate:      Number(row.repeat_order_rate ?? 0),
      expansion_rate:         Number(row.expansion_rate ?? 0),
      flat_rate:              Number(row.flat_rate ?? 0),
      inactive_rate:          Number(row.inactive_rate ?? 0),
      down_rate:              Number(row.down_rate ?? 0),
      up_count:               Number(row.up_count ?? 0),
      flat_count:             Number(row.flat_count ?? 0),
      inactive_count:         Number(row.inactive_count ?? 0),
      down_count:             Number(row.down_count ?? 0),
      existing_not_dormant_count: Number(row.existing_not_dormant_count ?? 0),
      active_existing_count:  Number(row.active_existing_count ?? 0),
      active_new_count:       Number(row.active_new_count ?? 0),
      median_revenue:         Number(row.median_revenue ?? 0),
      top_customer_id:        row.top_customer_id != null ? Number(row.top_customer_id) : null,
      top_customer_name:      row.top_customer_name != null ? String(row.top_customer_name) : null,
      top_customer_revenue:   Number(row.top_customer_revenue ?? 0),
      top_customer_pct:       Number(row.top_customer_pct ?? 0),
      gp_tier1:               Number(row.gp_tier1 ?? 0),
      gp_tier2:               Number(row.gp_tier2 ?? 0),
      gp_tier3:               Number(row.gp_tier3 ?? 0),
      top_gp_customer_id:     row.top_gp_customer_id != null ? Number(row.top_gp_customer_id) : null,
      top_gp_customer_name:   row.top_gp_customer_name != null ? String(row.top_gp_customer_name) : null,
      top_gp_revenue:         Number(row.top_gp_revenue ?? 0),
      top_gp_pct:             Number(row.top_gp_pct ?? 0),
      hm_revenue:             Number(row.hm_revenue ?? 0),
    }
  })
}

// ─── M3: Revenue Breakdown per Existing Customer (drill-down klik chart) ───────
// Mirror pola fetchGpBreakdown (m4.repository.ts) persis - cuma total_revenue,
// bukan total_gp, sebagai basis tier/ranking.
export async function fetchRevenueBreakdown(
  p: SegmentParams,
  // dateFrom (2026-08-25, task029.md §33 — M3 dipakai di Value page yg
  // SEKARANG py filter granularitas, pola sama persis fetchGpBreakdown/M4)
  // — opsional, fallback ke perilaku activeMonths lama kalau kosong.
  dateFrom?: string,
): Promise<{ rows: RevenueBreakdownRow[]; total_revenue: number; median_threshold: number; total_existing: number; hm_revenue: number }> {
  const { cid, filterDate, activeMonths, companyScopeIds } = p
  const establishedCTE = cteEstablishedCustomers(p, dateFrom ?? `${filterDate.slice(0, 7)}-01`)
  const rangeStartCond = dateFrom
    ? sql`i.invoice_date >= ${dateFrom}::date`
    : sql`i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'`
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    inv_active AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${rangeStartCond}
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      GROUP BY i.customer_id
    ),
    existing_revenue AS (
      SELECT ec.id, ec.customer_name, ec.customer_code, ia.revenue
      FROM established_customers ec
      JOIN inv_active ia ON ia.customer_id = ec.id
    ),
    -- Task006 — kontribusi produk High Margin (tabel high_margin_products, mapping
    -- manual admin) terhadap total_revenue M3 di atas. Mirror pola JOIN high_margin_products
    -- di fetchHmBreakdown (m5.repository.ts), termasuk syarat effective_from/effective_until.
    -- Di-scope ke established_customers yang SAMA dengan existing_revenue supaya apple-to-apple.
    hm_inv_active AS (
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
        AND ${rangeStartCond}
        AND i.invoice_date <= ${filterDate}::date
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
        AND hmp.effective_from <= i.invoice_date
        AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
      GROUP BY i.customer_id
    ),
    existing_hm_revenue AS (
      SELECT ec.id, hia.hm_revenue
      FROM established_customers ec
      JOIN hm_inv_active hia ON hia.customer_id = ec.id
    ),
    median_threshold AS (
      SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue), 0) AS threshold
      FROM existing_revenue
    ),
    total AS (
      -- total_existing (2026-08-25, task029.md §36 — koreksi user: dokumen SSOT
      -- "Existing Customer adalah customer... DAN MASIH MELAKUKAN PEMBELIAN PADA
      -- PERIODE TERSEBUT") — GANTI dari COUNT(*) established_customers (fixed
      -- cohort, TERMASUK yang tidak transaksi sama sekali di rentang ini, dulu
      -- disebut "template standar KPI4") ke COUNT(*) existing_revenue (customer
      -- established YANG BENAR-BENAR transaksi di rentang ini) — populasi ini
      -- SEKARANG konsisten dgn definisi "Existing" yang dipakai trend chart
      -- (existing_customers, m3m7.repository.ts fetchCustomerMetricsTrend),
      -- bukan lagi angka lebih besar yang beda populasi.
      SELECT
        COALESCE(SUM(revenue), 0)                           AS total_revenue,
        COUNT(*)::int                                        AS total_existing,
        (SELECT COALESCE(SUM(hm_revenue), 0) FROM existing_hm_revenue) AS hm_revenue
      FROM existing_revenue
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY er.revenue DESC)::int        AS ranking,
      er.customer_code,
      er.customer_name,
      ROUND(er.revenue)::bigint                                AS revenue,
      ROUND(er.revenue * 100.0 / NULLIF(t.total_revenue, 0), 1) AS revenue_pct,
      CASE
        WHEN er.revenue >  mt.threshold        THEN 'Atas'
        WHEN er.revenue >  mt.threshold * 0.5  THEN 'Tengah'
        ELSE                                        'Bawah'
      END                                                       AS tier,
      -- Revenue High Margin per customer + persentase relatif ke total_revenue KESELURUHAN
      -- (sama denominator dgn revenue_pct di atas & "Persentase Kontribusi" ringkasan
      -- header dialog) - konsisten, supaya kalau dijumlah semua baris = angka header.
      ROUND(COALESCE(ehr.hm_revenue, 0))::bigint                       AS customer_hm_revenue,
      ROUND(COALESCE(ehr.hm_revenue, 0) * 100.0 / NULLIF(t.total_revenue, 0), 1) AS customer_hm_pct,
      mt.threshold                                              AS median_threshold,
      t.total_revenue,
      t.total_existing,
      t.hm_revenue
    FROM existing_revenue er
    LEFT JOIN existing_hm_revenue ehr ON ehr.id = er.id
    CROSS JOIN median_threshold mt
    CROSS JOIN total t
    ORDER BY er.revenue DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    // total_existing = 0 (2026-08-25, susulan fix di atas) — rawRows kosong berarti
    // TIDAK ADA established customer yang transaksi di rentang ini sama sekali,
    // jadi populasi "Existing" (yang mensyaratkan "masih beli periode ini") memang
    // 0 — TIDAK perlu query terpisah ke established_customers lagi (fixed cohort,
    // sudah bukan definisi yang dipakai).
    return { rows: [], total_revenue: 0, median_threshold: 0, total_existing: 0, hm_revenue: 0 }
  }

  const first = rawRows[0] as Record<string, unknown>
  return {
    total_revenue:    Number(first.total_revenue ?? 0),
    median_threshold: Number(first.median_threshold ?? 0),
    total_existing:   Number(first.total_existing ?? 0),
    hm_revenue:       Number(first.hm_revenue ?? 0),
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        ranking:       Number(row.ranking),
        customer_code: row.customer_code != null ? String(row.customer_code) : null,
        customer_name: String(row.customer_name),
        revenue:       Number(row.revenue ?? 0),
        revenue_pct:   Number(row.revenue_pct ?? 0),
        tier:          String(row.tier) as 'Atas' | 'Tengah' | 'Bawah',
        hm_revenue:    Number(row.customer_hm_revenue ?? 0),
        hm_pct:        Number(row.customer_hm_pct ?? 0),
      }
    }),
  }
}

// ─── M7: Expansion Breakdown per Existing Customer (drill-down klik chart +
// kartu/chart kiri CustomerExpansion/index.tsx) ────────────────────────────
// Mirror pola fetchRevenueBreakdown/fetchGpBreakdown - bedanya di sini butuh DUA window
// (current vs previous) buat tentuin status naik/flat/turun, sesuai definisi
// expansion_rate di fetchCustomerMetricsTrend (active_inv_agg vs prev_inv_agg di atas).
//
// dateFrom (koreksi user 2026-08-10, "template standar KPI4": Total = established
// customer TETAP/fixed cohort seperti GP breakdown, Naik/Flat/Turun mem-partisi
// cohort tetap itu berdasarkan window filter — BUKAN rata-rata snapshot bulanan,
// yang keliru dipakai sebelumnya krn ikut naik-turun tren existing_customers per
// bulan) — window CURRENT jadi [dateFrom, filterDate] (mengikuti periodType),
// window PREVIOUS jadi periode SEPANJANG ITU JUGA persis sebelum dateFrom
// (bukan activeMonths tetap lagi). established_customers (LEFT JOIN, combined
// CTE) TETAP fixed cohort dari cteEstablishedCustomers (activeMonths/
// dormantMonths business rule, TIDAK ikut dateFrom) — makanya total_existing
// SELALU sama utk endDate yang sama, berapa pun lebar periodType-nya, PERSIS
// pola total_existing GP breakdown. Opsional, fallback ke window activeMonths
// tetap kalau kosong (backward-compat dialog drill-down di M7Expansion.tsx).
export async function fetchExpansionBreakdown(
  p: SegmentParams,
  dateFrom?: string,
  prevDateFrom?: string,
  prevDateTo?: string,
): Promise<{ rows: ExpansionBreakdownRow[]; up_count: number; flat_count: number; inactive_count: number; down_count: number; active_count: number; total_existing: number }> {
  const { cid, filterDate, activeMonths, companyScopeIds } = p
  // periodStart (task029 §30.10, 2026-08-23 — "patokan ke definisi terbaru")
  // — kalau dateFrom dikirim (klik-titik chart granularitas-aware), itu
  // SUDAH persis awal bucket yang dilihat, reuse langsung. Kalau tidak
  // (fallback lama, mis. M7Expansion.tsx workbench), anchor ke awal BULAN
  // kalender yang memuat filterDate — lebih benar drpd activeMonths mentah
  // task028, konsisten dgn default granularitas "Bulanan" KPI lain.
  const establishedCTE = cteEstablishedCustomers(p, dateFrom ?? `${filterDate.slice(0, 7)}-01`)
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const dormantThresholdSql = dormantThresholdCaseSql(p)
  const curRangeCond = dateFrom
    ? sql`i.invoice_date >= ${dateFrom}::date AND i.invoice_date <= ${filterDate}::date`
    : sql`i.invoice_date >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month' AND i.invoice_date <= ${filterDate}::date`
  // prevRangeCond (2026-08-23, koreksi user: "membandingkan 1-7 vs 26-31 itu
  // makesense?" — jawaban TIDAK) — kalau prevDateFrom/prevDateTo dikirim
  // (dihitung PERIOD-ANCHORED di service layer, posisi relatif sama di
  // periode sebelumnya), pakai itu APA ADANYA. Kalau tidak (caller lama blm
  // wired periodType), fallback ke rolling-window mundur (perilaku lama,
  // TIDAK diubah — backward-compat M7Expansion.tsx workbench).
  const prevRangeCond = (prevDateFrom && prevDateTo)
    ? sql`i.invoice_date >= ${prevDateFrom}::date AND i.invoice_date <= ${prevDateTo}::date`
    : dateFrom
      ? sql`i.invoice_date >= (${dateFrom}::date - (${filterDate}::date - ${dateFrom}::date)) AND i.invoice_date < ${dateFrom}::date`
      : sql`i.invoice_date >  ${filterDate}::date - (${activeMonths}::int * 2) * INTERVAL '1 month' AND i.invoice_date <= ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'`
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

  const rows = await db.execute(sql`
    WITH
    ${establishedCTE},
    -- Gerbang "belum lewat ambang dormant" (2026-08-25, task029.md
    -- §34-lanjutan — konsistensi dgn fetchCustomerMetricsTrend di atas,
    -- cegah bug class §30.17: chart trend vs dialog drilldown beda
    -- populasi). Ambang SAMA PERSIS M8/trend M7 (dormantThresholdCaseSql).
    -- Referensi "as of" = filterDate (titik snapshot yang sedang dilihat,
    -- sama pola dgn b.pe di fetchCustomerMetricsTrend).
    ${cteCustDivision(p)},
    cust_dormant_threshold AS (
      SELECT c.id AS cid, ${dormantThresholdSql} AS dormant_threshold
      FROM customers c
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      WHERE c.is_placeholder = false AND ${companyCondC}
    ),
    last_inv_unbounded AS (
      SELECT i.customer_id, i.invoice_date
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
    ),
    established_not_dormant AS (
      SELECT ec.id
      FROM established_customers ec
      JOIN cust_dormant_threshold cdt ON cdt.cid = ec.id
      LEFT JOIN last_inv_unbounded li ON li.customer_id = ec.id AND li.invoice_date <= ${filterDate}::date
      GROUP BY ec.id, cdt.dormant_threshold
      HAVING MAX(li.invoice_date) IS NOT NULL
        AND ${dormantCrossedSql(sql`MAX(li.invoice_date)`, sql`${filterDate}::date`, sql`cdt.dormant_threshold`, true)}
    ),
    inv_current AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${curRangeCond}
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      GROUP BY i.customer_id
    ),
    inv_previous AS (
      SELECT i.customer_id, SUM(i.total_revenue::numeric) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${prevRangeCond}
        AND ${companyCondI}
        AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      GROUP BY i.customer_id
    ),
    -- Branch/Division/Channel (2026-08-21, samakan §28.10 standar — user:
    -- "standarmu berubah-rubah, tab 3 ini melenceng jauh" — semua KPI lain
    -- (M1/M3-M6/M8-M10) py kolom ini di tabel breakdown, M7 belum). Pola
    -- SAMA PERSIS latest_inv M1 (m1.repository.ts) — dari invoice
    -- TERBARU customer itu DI DALAM window "current" (curRangeCond), bukan
    -- all-time.
    latest_inv AS (
      SELECT DISTINCT ON (i.customer_id)
        i.customer_id, i.branch_id, i.channel_name,
        -- 3-level fallback SAMA PERSIS M1 (CS_INV_CTE, m1.repository.ts) —
        -- ketemu susulan user "kenapa ada yang division-nya kosong": awalnya
        -- cuma 2-level (division_override_id -> channel_divisions), channel
        -- yang belum di-mapping ke channel_divisions jatuh NULL. M1 punya
        -- fallback ke-3 (division "other") persis buat kasus ini.
        COALESCE(c_ov.division_override_id, cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) AS division_id
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${curRangeCond}
        AND ${companyCondI}
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      ORDER BY i.customer_id, i.invoice_date DESC, i.id DESC
    ),
    combined AS (
      SELECT
        ec.id, ec.customer_name, ec.customer_code,
        COALESCE(ic.revenue, 0)  AS cur_revenue,
        COALESCE(ip.revenue, 0)  AS prev_revenue,
        li.branch_id, li.channel_name, li.division_id
      FROM established_customers ec
      JOIN established_not_dormant nd ON nd.id = ec.id
      LEFT JOIN inv_current  ic ON ic.customer_id = ec.id
      LEFT JOIN inv_previous ip ON ip.customer_id = ec.id
      LEFT JOIN latest_inv   li ON li.customer_id = ec.id
    )
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY (cur_revenue - prev_revenue) DESC
      )::int                                                                AS ranking,
      customer_code,
      customer_name,
      cb.name                                                              AS branch_name,
      d.label                                                              AS division_label,
      combined.channel_name,
      ROUND(cur_revenue)::bigint                                           AS cur_revenue,
      ROUND(prev_revenue)::bigint                                          AS prev_revenue,
      CASE WHEN prev_revenue > 0
        THEN ROUND((cur_revenue - prev_revenue) * 100.0 / prev_revenue, 1)
        ELSE NULL
      END                                                                   AS change_pct,
      -- 4-way status (koreksi user 2026-08-21, "datamu tidak valid jika
      -- tanpa transaksi kamu beri label stabil") — cur=prev=0 (tidak ada
      -- transaksi sama sekali di kedua window) dipisah jadi 'inactive',
      -- BUKAN lagi 'flat'. 'flat' sekarang HANYA cur=prev DAN cur>0.
      CASE
        WHEN cur_revenue > prev_revenue THEN 'up'
        WHEN cur_revenue = prev_revenue AND cur_revenue = 0 THEN 'inactive'
        WHEN cur_revenue = prev_revenue THEN 'flat'
        ELSE 'down'
      END                                                                   AS status,
      COUNT(*) FILTER (WHERE cur_revenue > prev_revenue) OVER ()::int       AS up_count,
      COUNT(*) FILTER (WHERE cur_revenue = prev_revenue AND cur_revenue > 0) OVER ()::int AS flat_count,
      COUNT(*) FILTER (WHERE cur_revenue = prev_revenue AND cur_revenue = 0) OVER ()::int AS inactive_count,
      COUNT(*) FILTER (WHERE cur_revenue < prev_revenue) OVER ()::int       AS down_count,
      -- Total customer Active (2026-08-25, susulan user: "info drilldown
      -- total customer active") — cur_revenue > 0, TANPA syarat naik/
      -- turun/flat, murni "genuinely bertransaksi periode ini". Selalu
      -- subset existing_not_dormant (siapa pun cur>0 otomatis "belum
      -- lewat ambang dormant" — transaksi barusan), jadi TIDAK perlu
      -- gerbang dormant tambahan di sini, cukup filter cur_revenue.
      COUNT(*) FILTER (WHERE cur_revenue > 0) OVER ()::int                  AS active_count,
      COUNT(*) OVER ()::int                                                 AS total_existing
    FROM combined
    LEFT JOIN company_branches cb ON cb.id = combined.branch_id
    LEFT JOIN divisions d ON d.id = combined.division_id
    ORDER BY (cur_revenue - prev_revenue) DESC
  `)

  const rawRows = rows as unknown[]
  if (rawRows.length === 0) {
    const [totRow] = await db.execute(sql`
      WITH
      ${establishedCTE},
      ${cteCustDivision(p)},
      cust_dormant_threshold AS (
        SELECT c.id AS cid, ${dormantThresholdSql} AS dormant_threshold
        FROM customers c
        LEFT JOIN cust_division cdv ON cdv.cid = c.id
        WHERE c.is_placeholder = false AND ${companyCondC}
      ),
      last_inv_unbounded AS (
        SELECT i.customer_id, i.invoice_date
        FROM invoices i
        LEFT JOIN channel_divisions cd
          ON cd.channel_name = i.channel_name
          AND cd.company_id = i.company_id
        LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
        WHERE i.deleted_at IS NULL
          AND ${companyCondI}
          AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${p.division}::int)
          AND ${branchCond}
          AND ${divisionScopeCond}
          AND ${excludeIntercompanyCond}
          AND ${onlyParetoCond}
      ),
      established_not_dormant AS (
        SELECT ec.id
        FROM established_customers ec
        JOIN cust_dormant_threshold cdt ON cdt.cid = ec.id
        LEFT JOIN last_inv_unbounded li ON li.customer_id = ec.id AND li.invoice_date <= ${filterDate}::date
        GROUP BY ec.id, cdt.dormant_threshold
        HAVING MAX(li.invoice_date) IS NOT NULL
          AND ${dormantCrossedSql(sql`MAX(li.invoice_date)`, sql`${filterDate}::date`, sql`cdt.dormant_threshold`, true)}
      )
      SELECT COUNT(*)::int AS total_existing FROM established_not_dormant
    `) as unknown[]
    const tot = totRow as Record<string, unknown>
    return { rows: [], up_count: 0, flat_count: 0, inactive_count: 0, down_count: 0, active_count: 0, total_existing: Number(tot?.total_existing ?? 0) }
  }

  const first = rawRows[0] as Record<string, unknown>
  const mappedRows = rawRows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      ranking:       Number(row.ranking),
      customer_code: row.customer_code != null ? String(row.customer_code) : null,
      customer_name: String(row.customer_name),
      branch:        row.branch_name != null ? String(row.branch_name) : null,
      division:      row.division_label != null ? String(row.division_label) : null,
      channel:       row.channel_name != null ? String(row.channel_name) : null,
      cur_revenue:   Number(row.cur_revenue ?? 0),
      prev_revenue:  Number(row.prev_revenue ?? 0),
      change_pct:    row.change_pct != null ? Number(row.change_pct) : null,
      status:        String(row.status) as 'up' | 'flat' | 'inactive' | 'down',
    }
  })

  return {
    // up_count/flat_count/inactive_count/down_count/total_existing TETAP
    // dari window function di atas kohort established_not_dormant PENUH
    // (2026-08-25, task029.md §34.1 — DIPERBAIKI dari "semua existing"
    // ke "existing belum dormant", lihat established_not_dormant CTE di
    // atas) — TIDAK ikut kena filter tampilan baris di bawah.
    up_count:       Number(first.up_count ?? 0),
    flat_count:     Number(first.flat_count ?? 0),
    inactive_count: Number(first.inactive_count ?? 0),
    down_count:     Number(first.down_count ?? 0),
    // active_count (2026-08-25) — cur_revenue > 0, TANPA syarat naik/
    // turun/flat (beda dari up_count yang mensyaratkan cur>prev).
    active_count:   Number(first.active_count ?? 0),
    total_existing: Number(first.total_existing ?? 0),
    // `rows` (baris DITAMPILKAN, beda dari angka KPI di atas) DIFILTER
    // cuma yang py sinyal revenue (2026-08-21, user: "maksudmu kamu tarik
    // data all customer?", konfirmasi via AskUserQuestion) — established
    // customer yang literally Rp0->Rp0 (tidak order sama sekali di kedua
    // window) TIDAK menyebabkan apa pun (§28.7: breakdown jawab "siapa
    // yang menyebabkan KPI berubah"), jadi tidak perlu jadi baris tabel.
    // Sebelum filter: 32237 baris (89% Rp0->Rp0). Sama filosofinya dgn M1
    // yang breakdown-nya cuma customer BENAR ADA invoice (INNER JOIN),
    // bukan seluruh kohort existing.
    rows: mappedRows.filter((r) => r.cur_revenue > 0 || r.prev_revenue > 0),
  }
}
