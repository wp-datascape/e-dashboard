import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import { resolveInvoiceScopeConditions, cteCustDivision, dormantThresholdCaseSql, cteEstablishedCustomers, dormantCrossedSql } from '../segment.helper'
import type { DormantTrendRow, DormantValueRow, CustomerDormantStatusRow, DormantValueHistoryRow } from '../metrics.types'
import { buildCompanyConditionRaw } from '@/utils/scope'
import type { TrailingPeriodBucket } from '@/features/analisis/period.util'

/**
 * Tren 12 titik (Bulanan/Kuartalan/Semesteran/Tahunan, 2026-08-24, susulan
 * task029.md §30.9 poin 1) untuk M8 (dormant rate) + M10 (reactivation
 * rate) — generalisasi dari versi lama yang hardcode 12 bulan kalender
 * (`generate_series`). Pola bucket VALUES-list + `prevBuckets` (window
 * "sebelumnya" per titik, dihitung DI SERVICE LAYER, label SAMA dgn bucket
 * current-nya) SAMA PERSIS `fetchCustomerMetricsTrend` (M3-M7,
 * `m3m7.repository.ts`) — REUSE pola, bukan tulis ulang. `dormant_threshold`
 * (dalam BULAN, business config per kategori divisi) TIDAK berubah maknanya
 * — durasi kalender tetap, independen dari lebar bucket granularitas.
 *
 * `buckets` VS `liveBuckets` (2026-08-24, definisi final dikonfirmasi
 * berkali-kali oleh user, termasuk ditegur keras): titik berlabel "Agustus"
 * di `buckets` isinya rentang tanggal bulan SEBELUMNYA (Juli) — "dormant
 * Agustus = tidak ada transaksi Mei, Juni, 31 Juli", customer yang tidak
 * transaksi DI Agustus baru masuk hitungan dormant BULAN SEPTEMBER. Field
 * snapshot (total_customers/dormant_count/active_count/dormant_rate) SEMUA
 * pakai `buckets` ini. TAPI reaktivasi beda sifat — itu EVENT (order
 * terjadi/tidak), bukan kondisi absen yang baru pasti begitu bulan tutup:
 * "reaktivasi adalah data dormant yang telah diaktivasi DI PERIODE
 * BERJALAN" — jadi numerator reaktivasi butuh `liveBuckets` (periode ASLI
 * titik ini, dipotong elapsed ke hari ini kalau genuinely masih berjalan),
 * BUKAN `buckets` yang sudah digeser. Baseline/denominator reaktivasi tetap
 * dormant_count row yang SAMA (pakai `buckets`/`me`) — populasi dormant
 * yang "diaktivasi" itu adalah populasi dormant milik LABEL itu sendiri.
 */
export async function fetchDormantTrend(p: SegmentParams, buckets: TrailingPeriodBucket[], prevBuckets: TrailingPeriodBucket[], liveBuckets: TrailingPeriodBucket[]): Promise<DormantTrendRow[]> {
  const { cid, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const dormantThresholdSql = dormantThresholdCaseSql(p)

  const bucketValues = sql.join(
    buckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )
  const prevBucketValues = sql.join(
    prevBuckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )
  const liveBucketValues = sql.join(
    liveBuckets.map((b) => sql`(${b.label}::text, ${b.start}::date, ${b.end}::date)`),
    sql.raw(', '),
  )

  const rawRows = await db.execute(sql`
    WITH
    ${cteCustDivision(p)},
    buckets(label, ps, pe) AS (VALUES ${bucketValues}),
    prev_buckets(label, ps, pe) AS (VALUES ${prevBucketValues}),
    -- live_buckets (2026-08-24, susulan koreksi user: "reaktivasi adalah
    -- data dormant yang telah diaktivasi DI PERIODE BERJALAN") — beda dari
    -- buckets (yang isinya digeser mundur 1 periode dari labelnya, lihat
    -- JSDoc di bawah), live_buckets itu bulan/kuartal/dst ASLI titik ini
    -- (label == periode kalendernya sendiri), dipotong elapsed ke hari ini
    -- KALAU itu periode yang genuinely masih berjalan. Dipakai KHUSUS utk
    -- numerator reaktivasi (order beneran terjadi kapan pun sampai hari
    -- ini di periode berjalan), BUKAN utk snapshot dormant (yang butuh
    -- bulan sudah tutup penuh).
    live_buckets(label, ps, pe) AS (VALUES ${liveBucketValues}),

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
        AND ${onlyParetoCond}
    ),

    -- Customer dalam scope (ada minimal 1 invoice). first_invoice_date ikut
    -- diambil di sini langsung dari kolom customers (bukan CTE first_inv/MIN
    -- scan semua invoice terpisah lagi, dihapus 2026-08-21 — kolom ini SUDAH
    -- dipelihara akurat tiap import, diverifikasi 0 baris beda dari MIN()
    -- langsung, scope SAMA/global per customer seperti sebelumnya). Dipakai
    -- utk deteksi customer baru — koreksi user 2026-08-10: "Aktif di
    -- DormantRate (357) harus sama dgn Total Existing di Expansion/GP
    -- (329)". Sebelum ini scoped_cust cuma syarat "pernah transaksi", TANPA
    -- exclude customer baru — beda populasi dgn established_customers
    -- (m3m7/m4 repository) yang WAJIB customer sudah py riwayat SEBELUM
    -- activeMonths terakhir. Selisihnya PERSIS jumlah customer yang
    -- first-purchase-nya masih dalam activeMonths terakhir (diverifikasi
    -- manual: 357-329=28, cocok dgn jumlah customer baru Juni 2026).
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid, c.first_invoice_date AS first_date,
        ${dormantThresholdSql} AS dormant_threshold
      FROM customers c
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND EXISTS (SELECT 1 FROM inv WHERE inv.customer_id = c.id)
    ),

    -- Customer x bucket: hitung last invoice date per titik waktu (bucket
    -- current DAN bucket sebelumnya, lebar sama dgn current, join by
    -- label, pola SAMA PERSIS m3m7.repository.ts). TIDAK di-cap filterDate
    -- lagi (2026-08-24, bug ditemukan: filterDate/segParams dipakai FUNGSI
    -- LAIN — mis. fetchDormantValueRanking, M9 — sbg snapshot point "Dormant
    -- Agustus" = 31 Juli; kalau dipakai jg buat cap live_me di sini,
    -- window reaktivasi Agustus IKUT terpotong ke 31 Juli, reactivated_count
    -- selalu 0. b.pe/lb.pe SUDAH benar-benar final dari service layer
    -- (buckets = sudah digeser + tutup penuh; liveBuckets = sudah
    -- elapsed-clamp ke hari ini via resolveTrendPeriod) — tidak perlu guard
    -- tambahan lagi di sini.
    cxm AS (
      SELECT
        sc.cid,
        b.label                                                                 AS bucket_label,
        b.ps                                                                    AS bucket_start,
        b.pe                                                                    AS me,
        pb.pe                                                                   AS prev_me,
        lb.pe                                                                   AS live_me,
        sc.first_date                                                           AS first_date,
        sc.dormant_threshold                                                    AS dormant_threshold,
        -- "not new" (§30.10) — koreksi user 2026-08-24: "customer yang
        -- masuk Januari sampai Maret Q1 2025, pada Q2 2025 itu sudah jadi
        -- existing" — gate populasi HARUS pakai awal kalender ASLI label
        -- (lb.ps, dari live_buckets — TIDAK ikut digeser), BUKAN awal
        -- bucket data yang sudah digeser (b.ps) — itu 2 konsep beda:
        -- me/last_at_me (evaluasi dormant) MEMANG digeser 1 periode
        -- (definisi "Dormant Agustus"), tapi "kapan seorang customer
        -- berhenti dianggap New" TIDAK ikut geser, tetap relatif ke label
        -- kalendernya sendiri (Q2 2025 mulai 1 April — siapa saja yang
        -- gabung sebelum itu, termasuk yang gabung Jan-Mar/Q1, SUDAH
        -- existing di titik Q2). Utk is_existing_at_prev_me (dipakai
        -- prev_dormant_count, "titik SEBELUMNYA" = label b.label sendiri
        -- kalau dilihat sbg titik tersendiri) — awal kalender aslinya
        -- PERSIS b.ps (b.ps sudah = awal bucket DATA b.label, yang mana
        -- itu AWAL KALENDER ASLI dari label sebelumnya, getPreviousPeriodKey
        -- (b.label) — kebetulan sama, bukan salah ketik).
        (sc.first_date < lb.ps)                                                 AS is_existing_at_me,
        (sc.first_date < b.ps)                                                  AS is_existing_at_prev_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= b.pe
        )                                                                       AS last_at_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= pb.pe
        )                                                                       AS last_at_prev_me,
        -- last_at_live_me (2026-08-24) — order TERAKHIR sampai HARI INI di
        -- periode berjalan yang ASLI (bukan bucket yang sudah digeser),
        -- dipakai numerator reaktivasi ("sudah diaktivasi di periode
        -- berjalan"), lihat JSDoc fungsi ini.
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= lb.pe
        )                                                                       AS last_at_live_me
      FROM scoped_cust sc
      CROSS JOIN buckets b
      JOIN prev_buckets pb ON pb.label = b.label
      JOIN live_buckets lb ON lb.label = b.label
      LEFT JOIN inv ON inv.customer_id = sc.cid
      GROUP BY sc.cid, b.label, b.ps, b.pe, pb.ps, pb.pe, lb.ps, lb.pe, sc.first_date, sc.dormant_threshold
    )

    SELECT
      bucket_label AS month,
      -- "not new" (§30.10, 2026-08-23) — pakai is_existing_at_me/
      -- is_existing_at_prev_me yang sudah dihitung 1x di CTE cxm (bukan
      -- activeMonths mundur dari me/prev_me lagi, formula lama task028
      -- punya bug off-by-one, lihat komentar di CTE cxm).
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
      )::int                                                                     AS total_customers,
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
      )::int                                                                     AS dormant_count,
      -- Severity split (koreksi user 2026-08-10, "opsi A": 4 kartu Total/
      -- Aktif/Dormant Ringan/Dormant Kronis) — partisi EKSAK dari populasi
      -- yang SAMA (total_customers), pakai kelipatan dormantMonths yang
      -- SUDAH dipakai di seluruh fitur ini (bukan threshold baru): Aktif =
      -- belum lewat ambang, Ringan = 1x-2x ambang lewat, Kronis = >2x
      -- ambang lewat. active_count + dormant_light_count +
      -- dormant_severe_count SELALU persis total_customers, dan
      -- dormant_light_count + dormant_severe_count SELALU persis
      -- dormant_count (angka lama, TIDAK dihapus, tetap dihitung persis
      -- sama, cuma sekarang ada pecahannya).
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`, true)}
      )::int                                                                     AS active_count,
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold * 2`, true)}
      )::int                                                                     AS dormant_light_count,
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold * 2`)}
      )::int                                                                     AS dormant_severe_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND is_existing_at_me
            AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
        )::numeric / NULLIF(COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND is_existing_at_me
        ), 0) * 100, 1
      )                                                                          AS dormant_rate,
      COUNT(*) FILTER (
        WHERE last_at_prev_me IS NOT NULL
          AND is_existing_at_prev_me
          AND ${dormantCrossedSql(sql`last_at_prev_me`, sql`prev_me`, sql`dormant_threshold`)}
      )::int                                                                     AS prev_dormant_count,
      -- reactivated_count (2026-08-24, definisi FINAL user: "reaktivasi
      -- adalah data dormant yang telah diaktivasi DI PERIODE BERJALAN
      -- bulanan, kuartalan, semesteran, tahunan") — denominator = populasi
      -- dormant LABEL INI SENDIRI (predikat SAMA PERSIS dormant_count di
      -- atas, pakai me/buckets yang sudah digeser — "Dormant Agustus"),
      -- numerator = subset itu yang net-aktif per HARI INI di periode
      -- berjalan ASLI (live_me/live_buckets, BUKAN me yang sudah
      -- digeser) — order beneran sudah terjadi = fakta, tidak perlu nunggu
      -- bulan tutup, beda dari dormant (kondisi absen, baru pasti kalau
      -- bulan sudah tutup penuh). "Net aktif" (bukan cuma "sempat order")
      -- tetap dipakai (koreksi user sebelumnya soal ambiguitas Q2/dormant-
      -- lagi) — kondisi last_at_live_me > live_me minus dormant_threshold
      -- PERSIS predikat active_count, cuma diukur di live_me bukan me.
      COUNT(*) FILTER (
        WHERE last_at_me IS NOT NULL
          AND is_existing_at_me
          AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
          AND last_at_live_me IS NOT NULL
          AND ${dormantCrossedSql(sql`last_at_live_me`, sql`live_me`, sql`dormant_threshold`, true)}
      )::int                                                                     AS reactivated_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND is_existing_at_me
            AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
            AND last_at_live_me IS NOT NULL
            AND ${dormantCrossedSql(sql`last_at_live_me`, sql`live_me`, sql`dormant_threshold`, true)}
        )::numeric / NULLIF(COUNT(*) FILTER (
          WHERE last_at_me IS NOT NULL
            AND is_existing_at_me
            AND ${dormantCrossedSql(sql`last_at_me`, sql`me`, sql`dormant_threshold`)}
        ), 0) * 100, 1
      )                                                                          AS reactivation_rate
    FROM cxm
    GROUP BY bucket_label, bucket_start
    ORDER BY bucket_start
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      month:               String(row.month),
      total_customers:     Number(row.total_customers ?? 0),
      dormant_count:       Number(row.dormant_count ?? 0),
      active_count:        Number(row.active_count ?? 0),
      dormant_light_count: Number(row.dormant_light_count ?? 0),
      dormant_severe_count: Number(row.dormant_severe_count ?? 0),
      dormant_rate:        Number(row.dormant_rate ?? 0),
      prev_dormant_count:  Number(row.prev_dormant_count ?? 0),
      reactivated_count:   Number(row.reactivated_count ?? 0),
      reactivation_rate:   Number(row.reactivation_rate ?? 0),
    }
  })
}

/**
 * Dormant customer diranking berdasarkan estimated lost value (M9, top 20
 * default). `limit=null` (2026-08-24, endpoint breakdown drill-down M8 baru,
 * instruksi user: "Buatkan end poin dril down breakdown singkat") — kembalikan
 * SEMUA baris (bukan cuma top 20), dipakai `getDormantBreakdown` (service)
 * untuk dialog klik-titik-chart M8, query SAMA PERSIS (reuse penuh, bukan
 * duplikasi) — cuma LIMIT beda. `ranking` (ROW_NUMBER) ditambahkan
 * unconditional, konsisten dgn pola `fetchRorBreakdown` (M6).
 *
 * `existingSince` (2026-08-24, task029.md §32.2) — gate New/Existing SSOT
 * §30.10 ("not new": first_invoice_date < awal periode label yang sedang
 * dilihat), SEBELUMNYA fungsi ini TIDAK PUNYA gate ini sama sekali —
 * customer yang first-purchase-nya baru tapi sudah lewat ambang dormant
 * (kasus langka, mis. B2C ambang 6bln, first purchase 7bln lalu tanpa
 * order lagi) ikut masuk ranking, padahal seharusnya "New" bukan populasi
 * relevan KPI berbasis Existing. Titik referensi = awal kalender ASLI
 * label periode yang sedang dilihat (caller kirim `liveBucket.start`,
 * SAMA PERSIS `lb.ps` di `fetchDormantTrend`/`is_existing_at_me` —
 * konsisten, M9 dan M8/M10 sama-sama snapshot dari `segParams` yang sudah
 * digeser 1 periode, gate "New" tetap relatif ke kalender label ASLI,
 * bukan window data yang sudah digeser). Optional dgn fallback awal bulan
 * kalender `filterDate` (KPI lama tanpa filter granularitas eksplisit).
 */
export async function fetchDormantValueRanking(p: SegmentParams, limit: number | null = 20, existingSince?: string): Promise<DormantValueRow[]> {
  const { cid, filterDate, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const dormantThresholdSql = dormantThresholdCaseSql(p)

  const rawRows = await db.execute(sql`
    WITH
    ${cteCustDivision(p)},
    ${cteEstablishedCustomers(p, existingSince ?? `${filterDate.slice(0, 7)}-01`)},
    inv AS (
      -- gp (2026-08-26, task029.md §36.12 — SSOT sebut "Historical Gross
      -- Profit" sbg komponen paralel Historical Revenue, keputusan user:
      -- "Tambah versi Gross Profit paralel") — 'invoices.total_gp' SUDAH
      -- kolom jadi (pola sama M4 'fetchGpBreakdown'), tidak perlu join
      -- invoice_items/COGS manual.
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev, i.total_gp::numeric AS gp
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
        AND ${onlyParetoCond}
    ),
    cust_last AS (
      SELECT
        c.id                    AS customer_id,
        c.customer_name,
        c.customer_code,
        co.name                 AS company_name,
        -- division_label (2026-08-31, laporan user: "itu bug filtering" —
        -- report difilter ke 1 divisi, tapi label tetap tampilkan divisi
        -- DOMINAN/permanen customer itu company-wide, mis. filter "Ucard"
        -- tapi baris tampil "Offline" krn itu divisi dominan customer tsb
        -- secara keseluruhan). Kalau laporan difilter ke 1 divisi, SEMUA
        -- baris di sini SUDAH PASTI py riwayat di divisi itu (dijamin JOIN
        -- inv yang sudah difilter parameter division di atas) — tampilkan
        -- label divisi yang SEDANG DIFILTER, bukan divisi dominan customer.
        -- Tanpa filter (division=NULL, "All Divisions"), tetap tampilkan
        -- divisi dominan sbg ringkasan (perilaku lama, tidak berubah).
        CASE WHEN ${division}::int IS NOT NULL
          THEN (SELECT label FROM divisions WHERE id = ${division}::int)
          ELSE d.label
        END                     AS division_label,
        MAX(inv.invoice_date)   AS last_invoice_date
      FROM customers c
      JOIN inv ON inv.customer_id = c.id
      JOIN established_customers ec ON ec.id = c.id
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      LEFT JOIN divisions d ON d.id = COALESCE(c.division_override_id, cdv.division_id, (SELECT id FROM divisions WHERE company_id = c.company_id AND key = 'other'))
      WHERE c.is_placeholder = false
        AND ${companyCondC}
      GROUP BY c.id, c.customer_name, c.customer_code, co.name, d.label, c.division_override_id, cdv.division_id
      HAVING ${dormantCrossedSql(sql`MAX(inv.invoice_date)`, sql`${filterDate}::date`, dormantThresholdSql)}
    ),
    -- avg_monthly_revenue dibatasi 12 bulan kalender terakhir SEBELUM customer dormant
    -- (bukan total_rev all-time dibagi jumlah bulan yang ada transaksi saja) - dulu
    -- pembeli borongan/jarang (misal cuma aktif 8 dari 13 bulan relasi) dapat rata-rata
    -- yang melambung karena pembaginya cuma bulan yang ada transaksi, bukan window
    -- waktu tetap. Konsisten dengan pola avgMonthlyExpr di customers.repository.ts.
    cust_agg AS (
      SELECT
        cl.customer_id, cl.customer_name, cl.customer_code, cl.company_name, cl.division_label, cl.last_invoice_date,
        COALESCE(SUM(inv.rev) FILTER (
          WHERE inv.invoice_date <= cl.last_invoice_date
            AND inv.invoice_date >= DATE_TRUNC('month', cl.last_invoice_date::date - INTERVAL '11 months')
        ), 0) AS recent_12m_rev,
        -- recent_12m_gp (2026-08-26, §36.12) — window 12 bulan SAMA PERSIS
        -- recent_12m_rev, cuma SUM kolom gp bukan rev.
        COALESCE(SUM(inv.gp) FILTER (
          WHERE inv.invoice_date <= cl.last_invoice_date
            AND inv.invoice_date >= DATE_TRUNC('month', cl.last_invoice_date::date - INTERVAL '11 months')
        ), 0) AS recent_12m_gp
      FROM cust_last cl
      LEFT JOIN inv ON inv.customer_id = cl.customer_id
      GROUP BY cl.customer_id, cl.customer_name, cl.customer_code, cl.company_name, cl.division_label, cl.last_invoice_date
    ),
    -- ranked (2026-08-24, fix bug) — estimated_lost_value DIMATERIALKAN di
    -- CTE terpisah dulu, BARU dipakai ROW_NUMBER() OVER (ORDER BY ...) di
    -- SELECT luar. Postgres TIDAK BISA reference alias kolom yang
    -- didefinisikan di SELECT list yang SAMA dari dalam window function
    -- (500 error "column estimated_lost_value does not exist" kalau
    -- ROW_NUMBER ditaruh 1 level sama persis dgn definisi alias-nya).
    ranked AS (
      SELECT
        customer_id,
        customer_name,
        customer_code,
        company_name,
        division_label,
        last_invoice_date::text,
        -- months_dormant (2026-08-25, koreksi KERAS user: "CUTOFF APRIL
        -- ITU AKHIR BULAN... SEHARUSNYA TERHITUNG MEI, JUNI, JULI TANPA
        -- ORDERAN, MASUK DORMANT DI AGUSTUS") — SEBELUMNYA selisih HARI
        -- mentah dibagi 30 (mis. transaksi terakhir 15 April, filterDate
        -- 31 Juli = 107 hari / 30 = 3.57 dibulatkan 4, padahal cuma Mei-
        -- Juni-Juli = 3 bulan kalender PENUH tanpa transaksi, bulan April-
        -- nya sendiri tetap dihitung "aktif" krn ada transaksi di situ).
        -- Sekarang selisih BULAN KALENDER murni (tahun*12+bulan), TIDAK
        -- peduli tanggal presisi dalam bulan — start = awal bulan transaksi
        -- terakhir, end = akhir bulan filterDate, granularitas SELALU
        -- bulan penuh sesuai instruksi user ("start date awal periode
        -- tanggal 1, end date akhir bulan").
        GREATEST(
          (EXTRACT(YEAR FROM ${filterDate}::date)::int * 12 + EXTRACT(MONTH FROM ${filterDate}::date)::int)
          - (EXTRACT(YEAR FROM last_invoice_date)::int * 12 + EXTRACT(MONTH FROM last_invoice_date)::int)
        , 1)                                                                                        AS months_dormant,
        ROUND(recent_12m_rev / 12.0)::bigint                                                        AS avg_monthly_revenue,
        ROUND(
          recent_12m_rev / 12.0
          * GREATEST(
              (EXTRACT(YEAR FROM ${filterDate}::date)::int * 12 + EXTRACT(MONTH FROM ${filterDate}::date)::int)
              - (EXTRACT(YEAR FROM last_invoice_date)::int * 12 + EXTRACT(MONTH FROM last_invoice_date)::int)
            , 1)
        )::bigint                                                                                   AS estimated_lost_value,
        -- avg_monthly_gp/estimated_lost_gp (2026-08-26, §36.12) — rumus
        -- SAMA PERSIS versi revenue di atas, cuma basis recent_12m_gp.
        ROUND(recent_12m_gp / 12.0)::bigint                                                         AS avg_monthly_gp,
        ROUND(
          recent_12m_gp / 12.0
          * GREATEST(
              (EXTRACT(YEAR FROM ${filterDate}::date)::int * 12 + EXTRACT(MONTH FROM ${filterDate}::date)::int)
              - (EXTRACT(YEAR FROM last_invoice_date)::int * 12 + EXTRACT(MONTH FROM last_invoice_date)::int)
            , 1)
        )::bigint                                                                                   AS estimated_lost_gp
      FROM cust_agg
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY estimated_lost_value DESC NULLS LAST)::int AS ranking,
      customer_id,
      customer_name,
      customer_code,
      company_name,
      division_label,
      last_invoice_date,
      months_dormant,
      avg_monthly_revenue,
      estimated_lost_value,
      avg_monthly_gp,
      estimated_lost_gp
    FROM ranked
    ORDER BY estimated_lost_value DESC NULLS LAST
    ${limit != null ? sql`LIMIT ${limit}` : sql``}
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      ranking:              Number(row.ranking),
      customer_id:          Number(row.customer_id),
      customer_name:        String(row.customer_name),
      customer_code:        row.customer_code != null ? String(row.customer_code) : null,
      company_name:         String(row.company_name ?? ''),
      division_label:       row.division_label != null ? String(row.division_label) : null,
      last_invoice_date:    String(row.last_invoice_date ?? ''),
      months_dormant:       Number(row.months_dormant ?? 0),
      avg_monthly_revenue:  Number(row.avg_monthly_revenue ?? 0),
      estimated_lost_value: Number(row.estimated_lost_value ?? 0),
      avg_monthly_gp:       Number(row.avg_monthly_gp ?? 0),
      estimated_lost_gp:    Number(row.estimated_lost_gp ?? 0),
    }
  })
}

/**
 * Riwayat revenue bulanan (12 bulan trailing dari `refDate`) untuk SATU
 * customer (2026-08-25, drilldown M9 — instruksi user: "list revenue
 * customer tersebut selama 12 bulan"). Window SAMA PERSIS `recent_12m_rev`
 * di `fetchDormantValueRanking` di atas (DATE_TRUNC awal bulan `refDate` -
 * 11 bulan, s.d. `refDate`) — `refDate` WAJIB `last_invoice_date` baris
 * ranking yang diklik (dikirim frontend, BUKAN dihitung ulang di sini),
 * supaya list-nya PERSIS window yang menghasilkan avg_monthly_revenue yang
 * sudah ditampilkan di kartu/dialog. Pola CTE generate_series + LEFT JOIN
 * reuse `findCustomerDetail` (customers.repository.ts) — kondisi scope
 * (branch/division/exclude_intercompany) pakai `resolveInvoiceScopeConditions`
 * yang SAMA dgn fungsi lain di file ini (bukan subset lebih tipis).
 */
export async function fetchDormantValueHistory(p: SegmentParams, customerId: number, refDate: string): Promise<DormantValueHistoryRow[]> {
  const { division } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })

  const rawRows = await db.execute(sql`
    WITH months AS (
      SELECT TO_CHAR(m, 'YYYY-MM') AS month
      FROM generate_series(
        DATE_TRUNC('month', ${refDate}::date - INTERVAL '11 months'),
        DATE_TRUNC('month', ${refDate}::date),
        INTERVAL '1 month'
      ) AS m
    ),
    actuals AS (
      SELECT
        TO_CHAR(i.invoice_date::date, 'YYYY-MM') AS month,
        COALESCE(SUM(i.total_revenue::numeric), 0) AS revenue
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.customer_id = ${customerId}
        AND i.deleted_at IS NULL
        AND i.invoice_date::date >= DATE_TRUNC('month', ${refDate}::date - INTERVAL '11 months')
        AND i.invoice_date::date <= ${refDate}::date
        AND ${companyCondI}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
      GROUP BY 1
    )
    SELECT m.month, COALESCE(a.revenue, 0)::text AS revenue
    FROM months m
    LEFT JOIN actuals a ON a.month = m.month
    ORDER BY m.month
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return { month: String(row.month), revenue: Number(row.revenue ?? 0) }
  })
}

/**
 * Status per customer (Active/Inactive/Dormant/Reactivated/Relapsed) untuk
 * SATU periode (2026-08-24, susulan pertanyaan user soal ambiguitas
 * reaktivasi — lihat JSDoc CustomerDormantStatusRow di metrics.types.ts).
 * Pembongkaran per-customer dari angka agregat fetchDormantTrend, bukan
 * pengganti angka itu (dormant_count/reactivated_count TETAP net status
 * akhir saja). Dipakai drill-down klik-titik-chart M10 + bahan tabel
 * laporan.
 *
 * 5 status (2026-08-26, task029.md §36.28/§36.43, susulan Kamus Penamaan
 * Pelanggan §36.27 — SEBELUMNYA cuma 4, 'active' digabung dgn apa yang
 * sekarang jadi 'inactive'): 'active' ("Existing Aktif" — ADA transaksi
 * di dalam periode ini), 'inactive' ("Existing Inaktif" — TIDAK ada
 * transaksi di dalam periode ini, masih masa tenggang), 'dormant', 'reactivated',
 * 'newlyDormant' ("Newly Dormant", NAMA BARU dari "Dormant Kembali" —
 * customer yang sempat reaktivasi lalu dormant lagi; TIDAK ada padanan di
 * kamus 5-kategori dasar, dipertahankan sbg status ekstra sesuai instruksi
 * user eksplisit — cuma soal nama, logikanya TIDAK berubah).
 *
 * bucket/prevBucket TERPISAH dari parameter buckets[]/prevBuckets[] milik
 * fetchDormantTrend (array 12 titik) — di sini cuma SATU titik yang diklik,
 * dihitung service layer via pola SAMA PERSIS getExpansionBreakdown (M7,
 * prevDateFrom/prevDateTo period-anchored + proporsional).
 */
export async function fetchCustomerDormantStatusLog(
  p: SegmentParams,
  bucket: { start: string; end: string },
  prevBucket: { start: string; end: string },
  // liveCalendarStart (2026-08-27, task029.md §36.54) — gerbang "New" HARUS
  // pakai awal kalender ASLI periode yang dilihat (SAMA aturan lb.ps di
  // fetchDormantTrend), TIDAK ikut geser walau `bucket` di atas digeser ke
  // bulan lalu (mode cutoff off). Default = bucket.start (PERILAKU LAMA,
  // caller existing — M10 dashboard drilldown, `bucket` yang dikirim SUDAH
  // live/tidak digeser — tetap aman tanpa perlu ubah caller-nya).
  liveCalendarStart: string = bucket.start,
  // applyDateCutoff (2026-08-27, task029.md §36.56) — gerbang cabang
  // "baru menyebrang dormant DI DALAM periode ini" (lihat komentar CASE
  // WHEN di bawah) HANYA relevan di mode cutoff aktif, lihat penjelasan
  // di situ. Default false (PERILAKU LAMA, caller existing — M10
  // dashboard drilldown TIDAK kenal konsep cutoff sama sekali, aman).
  applyDateCutoff = false,
): Promise<CustomerDormantStatusRow[]> {
  const { cid, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const dormantThresholdSql = dormantThresholdCaseSql(p)

  const rawRows = await db.execute(sql`
    WITH
    ${cteCustDivision(p)},
    inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
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
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid, c.first_invoice_date AS first_date,
        ${dormantThresholdSql} AS dormant_threshold
      FROM customers c
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND EXISTS (SELECT 1 FROM inv WHERE inv.customer_id = c.id)
    ),
    -- last_at_me/reactivation_date TIDAK di-cap p.filterDate lagi (2026-08-24,
    -- bug: caller (Top 5 M10) kirim segParams.filterDate = baseline dormant
    -- SNAPSHOT (mis. 31 Juli), beda arti dari bucket.end yang di sini bisa
    -- jadi window LIVE periode berjalan (mis. 24 Agustus) — LEAST(...)
    -- keduanya diam-diam motong balik ke 31 Juli, reaktivasi selalu 0
    -- baris. bucket.end dari caller SUDAH final (elapsed-clamp sudah
    -- terjadi di service layer), tidak perlu guard tambahan.
    cxm AS (
      SELECT
        sc.cid,
        c.customer_name,
        c.customer_code,
        co.name                                                              AS company_name,
        sc.dormant_threshold,
        (sc.first_date < ${liveCalendarStart}::date)                         AS is_existing_at_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= ${bucket.end}::date
        )                                                                    AS last_at_me,
        MAX(inv.invoice_date) FILTER (
          WHERE inv.invoice_date <= ${prevBucket.end}::date
        )                                                                    AS last_at_prev_me,
        MIN(inv.invoice_date) FILTER (
          WHERE inv.invoice_date > ${prevBucket.end}::date
            AND inv.invoice_date <= ${bucket.end}::date
        )                                                                    AS reactivation_date
      FROM scoped_cust sc
      JOIN customers c ON c.id = sc.cid
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN inv ON inv.customer_id = sc.cid
      GROUP BY sc.cid, c.customer_name, c.customer_code, co.name, sc.dormant_threshold, sc.first_date
    ),
    -- avg_monthly_revenue (2026-08-24, instruksi user: "urutkan berdasarkan
    -- avg revenue nya tertinggi diantara reactivation lainnya" — tie-break
    -- Top 5 M10 yang sebelumnya kebetulan alfabetis, bukan kriteria bisnis)
    -- — rev 12 bulan trailing SEBELUM customer dormant (last_at_prev_me,
    -- SUDAH dihitung di cxm), pola SAMA PERSIS cust_agg/avg_monthly_revenue
    -- di fetchDormantValueRanking (M9) di atas — REUSE definisi, bukan
    -- kriteria baru. Perlu CTE terpisah krn agregat tidak boleh nested
    -- (SUM(...) pakai batas dari MAX(...) row yang sama).
    rev_agg AS (
      SELECT
        cxm.cid,
        COALESCE(SUM(inv.rev) FILTER (
          WHERE inv.invoice_date <= cxm.last_at_prev_me
            AND inv.invoice_date >= DATE_TRUNC('month', cxm.last_at_prev_me::date - INTERVAL '11 months')
        ), 0) AS recent_12m_rev
      FROM cxm
      LEFT JOIN inv ON inv.customer_id = cxm.cid
      GROUP BY cxm.cid, cxm.last_at_prev_me
    ),
    -- classified (materialisasi was_dormant_at_prev/is_dormant_at_me DULU di
    -- CTE terpisah, supaya SELECT luar bisa pakai alias itu berkali-kali di
    -- CASE WHEN status TANPA menulis ulang kondisinya — sama alasan CTE
    -- ranked di fetchDormantValueRanking, Postgres larang window function
    -- reference alias sendiri, tapi CASE WHEN biasa aman asal DARI CTE lain).
    classified AS (
      SELECT
        cxm.cid, cxm.customer_name, cxm.customer_code, cxm.company_name,
        cxm.last_at_prev_me::text                                            AS last_invoice_before_period,
        cxm.reactivation_date::text                                          AS reactivation_date,
        cxm.last_at_me::text                                                 AS last_invoice_in_period,
        ROUND(rev_agg.recent_12m_rev / 12.0)::bigint                         AS avg_monthly_revenue,
        (cxm.last_at_prev_me IS NOT NULL
          AND ${dormantCrossedSql(sql`cxm.last_at_prev_me`, sql`${prevBucket.end}::date`, sql`cxm.dormant_threshold`)}
        )                                                                    AS was_dormant_at_prev,
        (cxm.last_at_me IS NOT NULL
          AND ${dormantCrossedSql(sql`cxm.last_at_me`, sql`${bucket.end}::date`, sql`cxm.dormant_threshold`)}
        )                                                                    AS is_dormant_at_me,
        -- transacted_in_period (2026-08-26, task029.md §36.28 — instruksi
        -- user: "buat endpoint nya pisahkan existing aktif dan inaktif",
        -- mengikuti Kamus Penamaan Pelanggan §36.27: "Existing Aktif" =
        -- ADA transaksi DI DALAM periode ini, "Existing Inaktif" = TIDAK
        -- ada transaksi DI DALAM periode ini tapi masih masa tenggang)
        -- — SEBELUMNYA status 'active' cuma cek NOT is_dormant_at_me,
        -- TIDAK cek apakah transaksi TERAKHIRnya jatuh di dalam window
        -- periode yang sedang dilihat (bucket.start..bucket.end) atau
        -- dari SEBELUM periode ini (customer yang masih dlm masa tenggang
        -- tapi belum beli lagi bulan ini ikut kehitung "aktif", padahal
        -- seharusnya kategori terpisah).
        --
        -- transacted_in_period TETAP live/bucket.start (2026-08-26,
        -- task029.md §36.46 — koreksi §36.45 SALAH: sempat diganti ke
        -- last_at_prev_me/prevBucket.start (Juli) supaya "Dormant" match
        -- kartu KPI, TAPI itu bikin "Existing Aktif"/"Existing Inaktif"
        -- ikut kebawa ke Juli — padahal HEADER dialog ini sendiri bilang
        -- "Periode 01-08-2026 s/d 26-08-2026" (live, Agustus). User
        -- protes: "Ini bukan seperti definisi yang aku kirimkan" — SSOT
        -- "Existing Customer...masih melakukan pembelian PADA PERIODE
        -- TERSEBUT" berarti transaksi di periode yang DILABELKAN (Agustus
        -- live), bukan Juli. Dikembalikan ke bucket.start (live) —
        -- HANYA cabang 'dormant'/'newlyDormant'/'reactivated' (was_dormant_at_prev)
        -- yang tetap pakai referensi Juli (itu murni utk match kartu KPI
        -- Dormant, konsep terpisah dari Aktif/Inaktif).
        (cxm.last_at_me IS NOT NULL
          AND cxm.last_at_me >= ${bucket.start}::date
        )                                                                    AS transacted_in_period,
        CASE
          WHEN cxm.last_at_me IS NOT NULL
            AND ${dormantCrossedSql(sql`cxm.last_at_me`, sql`${bucket.end}::date`, sql`cxm.dormant_threshold`)}
          THEN (DATE_TRUNC('month', cxm.last_at_me) + (cxm.dormant_threshold + 1) * INTERVAL '1 month')::date::text
          ELSE NULL
        END                                                                  AS dormant_since_date
      FROM cxm
      JOIN rev_agg ON rev_agg.cid = cxm.cid
      WHERE cxm.is_existing_at_me
    )
    SELECT
      cid AS customer_id, customer_name, customer_code, company_name,
      -- 'newlyDormant' (2026-08-26, task029.md §36.43 — koreksi user:
      -- "Dormant kembali itu diganti nama menjadi newlydormant, hanya itu"
      -- — sebelumnya sempat dipecah jadi 2 cabang terpisah ('relapsed' vs
      -- 'newlyDormant' via was_dormant_at_prev flip), ditegur: itu fungsi
      -- baru yang tidak diminta. 'Dormant Kembali' yang LAMA (customer
      -- yang sempat reaktivasi lalu dormant lagi) SUDAH PERSIS menangkap
      -- konsep yang dimaksud — cukup di-RENAME key-nya jadi 'newlyDormant',
      -- bukan dibuatkan logika baru.
      --
      -- Cabang 'dormant' pakai was_dormant_at_prev SEBAGAI SUMBER UTAMA
      -- (2026-08-26, §36.45), is_dormant_at_me dipakai utk membedakan
      -- 'newlyDormant' vs 'reactivated' (masih dormant lagi SEKARANG vs
      -- berhasil bertahan aktif SEKARANG).
      --
      -- Cabang BARU "WHEN is_dormant_at_me THEN 'dormant'" (2026-08-27,
      -- task029.md §36.56 — koreksi user: "Ya kalau namanya dormant bukan
      -- kah harusnya datanya sama?", setelah tab Reaktivasi (16.964) vs tab
      -- Dormant/kartu KPI M8 [19.200] kedapatan beda 2.236 walau baseline
      -- reaktivasi (Juli) sudah benar) — akar selisihnya: customer yang
      -- BUKAN dormant per akhir Juli (was_dormant_at_prev=false) TAPI baru
      -- menyebrang ambang dormant DI DALAM periode berjalan ini (is_dormant_at_me
      -- =true) sebelumnya jatuh ke cabang 'inactive'/Lapsed (was_dormant_at_prev
      -- palsu, transacted_in_period juga palsu krn mereka justru TIDAK
      -- transaksi) — padahal kartu KPI "Dormant" (fetchDormantTrend, acuan
      -- is_dormant_at_me di tanggal cutoff) SUDAH menghitung mereka dormant.
      --
      -- Cabang ini DIGERBANG applyDateCutoff (fix susulan, ditemukan
      -- sendiri sebelum sempat dilaporkan salah — 1st attempt TANPA gerbang
      -- ini bikin regresi di mode NON-cutoff: is_dormant_at_me di sini SELALU
      -- pakai acuan LIVE/hari-ini (bucket=liveBucket), sedangkan kartu KPI
      -- "Dormant" di mode NON-cutoff pakai acuan bulan lalu penuh (SAMA
      -- persis was_dormant_at_prev) — keduanya SUDAH cocok tanpa cabang ini.
      -- Cabang ini HANYA perlu aktif saat cutoff aktif (acuan KPI di mode
      -- itu = liveBucket juga, PERSIS is_dormant_at_me) — supaya
      -- dormant+newlyDormant+reactivated SELALU jumlah PERSIS ke angka kartu
      -- KPI "Dormant" di KEDUA mode, SEKALIGUS baseline Juli (was_dormant_at_prev)
      -- tetap dipakai utk reaktivasi (akomodir dua-duanya, sesuai instruksi user).
      CASE
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL AND is_dormant_at_me  THEN 'newlyDormant'
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL AND NOT is_dormant_at_me THEN 'reactivated'
        WHEN was_dormant_at_prev                                                          THEN 'dormant'
        ${applyDateCutoff ? sql`WHEN is_dormant_at_me THEN 'dormant'` : sql``}
        WHEN transacted_in_period                                                        THEN 'active'
        ELSE 'inactive'
      END                                                                    AS status,
      last_invoice_before_period,
      reactivation_date,
      last_invoice_in_period,
      avg_monthly_revenue,
      dormant_since_date
    FROM classified
    ORDER BY
      CASE
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL AND is_dormant_at_me  THEN 0
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL AND NOT is_dormant_at_me THEN 1
        WHEN was_dormant_at_prev                                                          THEN 2
        ${applyDateCutoff ? sql`WHEN is_dormant_at_me THEN 3` : sql``}
        WHEN transacted_in_period                                                        THEN 4
        ELSE 5
      END,
      customer_name
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      customer_id:                 Number(row.customer_id),
      customer_name:               String(row.customer_name),
      customer_code:                row.customer_code != null ? String(row.customer_code) : null,
      company_name:                 String(row.company_name ?? ''),
      status:                       row.status as CustomerDormantStatusRow['status'],
      last_invoice_before_period:   row.last_invoice_before_period != null ? String(row.last_invoice_before_period) : null,
      reactivation_date:            row.reactivation_date != null ? String(row.reactivation_date) : null,
      last_invoice_in_period:       row.last_invoice_in_period != null ? String(row.last_invoice_in_period) : null,
      avg_monthly_revenue:          Number(row.avg_monthly_revenue ?? 0),
      dormant_since_date:           row.dormant_since_date != null ? String(row.dormant_since_date) : null,
    }
  })
}
