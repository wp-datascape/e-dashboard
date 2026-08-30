import { AppError, ErrorCode } from '@/utils/error'
import { loadThresholds, resolveDormantCategory, resolveDormantMonths, getDormantCategoryMap } from '@/features/config/threshold'
import { loadDivisionFallbackIds, flattenFallbackByBranch } from '@/utils/scope'
import { fetchCustomerMetricsTrend, fetchRevenueBreakdown, fetchExpansionBreakdown, fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking, fetchCustomerDormantStatusLog, fetchDormantValueHistory, fetchCrossSellingKPI, fetchCrossSellingTrend, fetchCrossSellingDetail, fetchCrossSellingHeatmap, fetchCategoryPerformance, fetchProductPerformance, fetchProductCategoryOptions, fetchCategoryProducts, fetchHmDetail, fetchHmProductDetail, fetchUpsellTargets, fetchCustomerProducts, fetchAvgCategoryTrend, fetchHmCustomers, fetchHmDivisionBreakdown } from './metrics.repository'
// Reuse fetchDormantValueTrend (task025 §19, 2026-08-07) — sebelumnya cuma
// dipakai Dashboard summary card, sekarang dipakai juga halaman KPI9
// (Nilai Hilang) supaya bisa averageLastMonths sama seperti KPI8/KPI10.
// Formula/threshold PERSIS sama, cuma dipanggil dari 1 tempat lagi.
import { fetchDormantValueTrend } from '@/features/dashboard/dashboard.repository'
// Reuse resolve-tanggal-periode Monthly/Quarterly/Semester/Annual (task029.md
// §30.4 — "REUSE ini, jangan tulis ulang") — modul ini sebelumnya cuma dipakai
// fitur Analisis (task016), sekarang juga dipakai granularitas M1 Cross
// Selling (§30, 2026-08-20). Tidak ada pembatasan cross-feature import lain
// di backend ini (dicek: tidak ada eslint boundary rule).
import { getPeriodRange, getCurrentPeriodKey, getPreviousPeriodKey, buildTrailingPeriods, resolveTrendPeriod, daysSincePeriodStart, clampToElapsedEnd } from '@/features/analisis/period.util'
import type { TrailingPeriodBucket } from '@/features/analisis/period.util'
import type { AssignToDivision } from './metrics.repository'
import { buildSegmentParams } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { CrossSellingQuery, CustomerMetricsQuery, RevenueBreakdownQuery, ExpansionBreakdownQuery, GpBreakdownQuery, HmBreakdownQuery, RorBreakdownQuery, DormantCustomerQuery, DormantStatusBreakdownQuery, DormantValueHistoryQuery, CategoryPerformanceQuery, ProductPerformanceQuery, ProductCategoryOptionsQuery, CategoryProductsQuery, HmDetailQuery, UpsellTargetQuery, CustomerProductsQuery, AvgCategoryQuery, HmCustomersQuery } from './metrics.schema'
import type { CrossSellingMetricsData, CrossSellingSummaryData, CustomerMetricsData, CustomerMetricsTrendPoint, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantMetricsData, DormantValueRow, DormantBreakdownData, DormantStatusBreakdownData, DormantValueHistoryData, ProductTrendData } from './metrics.types'

// "Assign To" (task017) — divisi di luar scope viewer TIDAK PERNAH ditampilkan
// sama sekali (bukan cuma angkanya, chip-nya juga) — beda dari data transaksi
// lain yang sudah otomatis ter-scope di level SQL (WHERE branchCond/
// divisionScopeCond), field ini murni metadata config (high_margin_product_
// divisions) yang tidak lewat filter itu, jadi difilter di sini secara eksplisit.
function filterAssignToByScope(assignTo: AssignToDivision[], divisionScope: Map<number, number[]> | undefined): AssignToDivision[] {
  if (!divisionScope) return assignTo // superadmin/bypass — tampilkan semua
  const allowed = new Set([...divisionScope.values()].flat())
  return assignTo.filter((d) => allowed.has(d.id))
}

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Scope hasil resolveCompanyScope/resolveBranchScope/resolveDivisionScope (handler layer).
 * Fix bug (2026-07-06): sebelumnya scopeIds dihitung di handler tapi dibuang, tidak
 * pernah diteruskan ke service/repository — company_id='all' selalu tanpa filter
 * company untuk SEMUA user, bukan cuma superadmin. Lihat docs-v2/task/task001.md.
 */
export interface MetricsScope {
  companyScopeIds?: number[]
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
}

export async function resolveSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  division?: number,
  companyScopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  branchId?: number,
  excludeIntercompany?: boolean,
  onlyPareto?: boolean,
): Promise<SegmentParams> {
  // `activeMonths`/`dormantMonths` SELALU dari business_configs, TIDAK ADA
  // jalur override dari filter periode apa pun (task026 §8e, koreksi user
  // 2026-08-09: "window aktif utk parameter existing TIDAK BOLEH berubah").
  // Ini SegmentParams dipakai buat nentuin SIAPA yang qualify sbg
  // "existing"/tidak dormant (cteEstablishedCustomers) — business rule
  // tetap, bukan pilihan user. Kalau suatu endpoint butuh rentang tanggal
  // yang ikut filter periode (mis. GP breakdown ikut periodType), itu
  // parameter TERPISAH (`dateFrom` dst) yang diteruskan langsung ke
  // repository function-nya, BUKAN lewat activeMonths di sini — lihat
  // `fetchGpBreakdown` utk contoh polanya.
  const { activeMonths, dormant } = await loadThresholds()
  const cid = companyId === 'all' ? 0 : companyId
  let dormantMonths: number
  if (division) {
    const dormantKey = await resolveDormantCategory(division)
    dormantMonths = dormant[dormantKey]
  } else {
    dormantMonths = await resolveDormantMonths(cid, dormant, companyScopeIds)
  }
  // Fallback division_id 'other'/'intercompany' per company (task012 v2) — resolusi
  // sekali per request, lihat utils/scope.ts
  // dormantCategoryMap (task027 fix, 2026-08-21): division_id → kategori dormant,
  // dipakai bareng `dormant` di atas utk threshold PER-CUSTOMER (dormantMonths
  // scalar di atas TETAP dihitung/dipertahankan demi caller lama yang belum
  // migrasi — lihat cteCustDivision/dormantThresholdCaseSql, segment.helper.ts).
  // cid=0 (superadmin/holding, 'all') TIDAK boleh diteruskan sbg companyId ke
  // getDormantCategoryMap (0 bukan company_id valid) — kirim undefined supaya
  // ambil peta divisi SEMUA company (division_id PK global, tidak collide).
  const [otherIdByCompany, intercompanyIdByCompany, dormantCategoryMap] = await Promise.all([
    loadDivisionFallbackIds('other'),
    loadDivisionFallbackIds('intercompany'),
    getDormantCategoryMap(cid !== 0 ? cid : undefined),
  ])
  const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany)
  return buildSegmentParams(companyId, filterDate, activeMonths, dormantMonths, otherIdByBranch, intercompanyIdByCompany, dormant, dormantCategoryMap, division, branchScope, divisionScope, companyScopeIds, branchId, excludeIntercompany, onlyPareto)
}

export async function getCrossSellingMetrics(params: CrossSellingQuery, scope: MetricsScope = {}): Promise<CrossSellingMetricsData> {
  try {
    const periodEnd = params.period_end ?? todayDate()
    const periodType = params.period_type ?? 'monthly'

    // Normalisasi ke akhir PERIODE (bukan selalu akhir bulan lagi, task029.md
    // §30 — granularitas Monthly/Quarterly/Semester/Annual) agar KPI / Detail
    // / Heatmap / Trend semua pakai window identik. Tanpa ini, KPI pakai
    // filterDate (hari ini) sementara Trend pakai end-of-period per titik →
    // pada 1 Juli KPI Card 1 menunjuk data Juni tapi Trend titik Juli = 0%.
    // periodEnd diparse manual (BUKAN `new Date(periodEnd)`) supaya konstruksi
    // Date pakai komponen LOKAL eksplisit (y,m,d) — hindari pergeseran timezone
    // dari parsing string ISO (pola sama dgn frontend utils/date.ts).
    const [py, pm, pd] = periodEnd.split('-').map(Number)
    const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
    const calendarRange = getPeriodRange(periodType, periodKey)
    const calendarEnd = calendarRange.end
    // Awal periode SELALU batas kalender, tidak pernah dipotong/digeser apa pun
    // kondisinya (task029 §30.10 — "start date selalu harus awal periode, itu
    // sudah aturan paten internasional"). Dipakai juga sbg acuan New/Existing
    // (cteExistingCustomersByPeriod, segment.helper.ts).
    const periodStartDate = calendarRange.start

    // 12 titik trend MUNDUR dari periodKey, granularitas sama dgn KPI Header
    // (§30.1 — Quarterly bukan "12 bulan dikelompokkan jadi kuartal", tapi
    // benar-benar 12 KUARTAL = 3 tahun ke belakang). Angka tiap bucket
    // dihitung ULANG per periode (bukan rata-rata dari titik bulanan) — sudah
    // diverifikasi numerik identik dgn query lama untuk granularitas monthly.
    const buckets = buildTrailingPeriods(periodType, periodKey, 12)

    // Prioritas potong tanggal (apply_date_cutoff > skip_elapsed_clamp >
    // default clampToElapsedEnd) SATU-SATUNYA sumber kebenaran di
    // `resolveTrendPeriod` (period.util.ts) — dipakai jg getCustomerMetrics
    // di bawah, JANGAN tulis ulang if/else ini di sini (2026-08-23, koreksi
    // user: "kalau ditulis ulang di tiap fungsi, akan rawan bug di metric
    // KPI lainnya" — insiden nyata: fix skip_elapsed_clamp sebelumnya cuma
    // menyentuh fungsi ini, apply_date_cutoff drilldown baru ketahuan belum
    // ikut diperbaiki krn logicnya sempat tercecer per tempat).
    const resolved = resolveTrendPeriod({
      periodKey, calendarEnd, calendarStart: periodStartDate, periodType, buckets,
      applyDateCutoff: params.apply_date_cutoff,
      cutoffDay: params.cutoff_day,
      // fallbackDay = hari ke-N SEJAK AWAL PERIODE (2026-08-23, fix bug
      // granularitas non-bulanan — laporan user: cutoff "13 Agustus" di
      // Kuartal/Semester/Tahun malah menarik 1-13 Juli/Januari, krn `pd`
      // (angka tanggal mentah 13) diterapkan balik ke bulan PERTAMA periode
      // manapun, bukan ke bulan tempat tanggal itu sebenarnya dipilih).
      // `daysSincePeriodStart` (period.util.ts) — REUSE, SATU sumber kebenaran.
      fallbackDay: daysSincePeriodStart(periodStartDate, periodEnd),
      skipElapsedClamp: params.skip_elapsed_clamp,
    })
    const periodEndDate = resolved.periodEndDate
    const resolvedBuckets = resolved.buckets

    const segParams = await resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)

    const [kpiRaw, trend, detailResult, heatmapResult] = await Promise.all([
      fetchCrossSellingKPI(segParams, periodStartDate, periodEndDate),
      fetchCrossSellingTrend(segParams, resolvedBuckets),
      fetchCrossSellingDetail(segParams, periodStartDate, periodEndDate),
      fetchCrossSellingHeatmap(segParams, periodStartDate, periodEndDate),
    ])

    return {
      period: { start: periodStartDate, end: periodEndDate, active_months: segParams.activeMonths, type: periodType, key: periodKey },
      kpi1: {
        multi_cat_count: kpiRaw.multi_cat_count,
        active_count:    kpiRaw.active_count,
        rate:            kpiRaw.multi_cat_rate,
      },
      kpi2: {
        avg_categories:      kpiRaw.avg_categories,
        total_distinct_cats: kpiRaw.total_distinct_cats,
      },
      trend,
      detail:            detailResult.rows,
      heatmap:           heatmapResult.heatmap,
      categories:        heatmapResult.categories,
      detail_categories: detailResult.categories,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data cross-selling metrics', 500)
  }
}

// Versi ringan getCrossSellingMetrics — cuma kpi1/kpi2 (2026-08-28). Dipakai
// halaman Overview (section "Ringkasan Cross-Selling"), yang butuh angka
// yang SAMA PERSIS dgn halaman Growth tapi TIDAK butuh trend/detail/heatmap
// sama sekali. Awalnya Overview reuse langsung getCrossSellingMetrics/route
// /metrics/cross-selling yang sudah ada — user koreksi: itu jalankan 4 query
// paralel (fetchCrossSellingKPI + fetchCrossSellingTrend + fetchCrossSelling
// Detail + fetchCrossSellingHeatmap), 3 di antaranya kebuang percuma krn
// Overview cuma pakai hasil query pertama. Resolusi periode (periodKey,
// calendarRange, resolveTrendPeriod, segParams) REUSE PERSIS logic yang
// sama dgn getCrossSellingMetrics di atas (termasuk buildTrailingPeriods
// yang tetap dipanggil krn resolveTrendPeriod butuh param `buckets` utk
// clamp elapsed-end — itu murni komputasi tanggal, BUKAN query DB, jadi
// tetap murah), cuma bagian fetch DB-nya yang dipangkas jadi 1 query saja.
export async function getCrossSellingSummary(params: CrossSellingQuery, scope: MetricsScope = {}): Promise<CrossSellingSummaryData> {
  try {
    const periodEnd = params.period_end ?? todayDate()
    const periodType = params.period_type ?? 'monthly'

    const [py, pm, pd] = periodEnd.split('-').map(Number)
    const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
    const calendarRange = getPeriodRange(periodType, periodKey)
    const calendarEnd = calendarRange.end
    const periodStartDate = calendarRange.start

    const buckets = buildTrailingPeriods(periodType, periodKey, 12)
    const resolved = resolveTrendPeriod({
      periodKey, calendarEnd, calendarStart: periodStartDate, periodType, buckets,
      applyDateCutoff: params.apply_date_cutoff,
      cutoffDay: params.cutoff_day,
      fallbackDay: daysSincePeriodStart(periodStartDate, periodEnd),
      skipElapsedClamp: params.skip_elapsed_clamp,
    })
    const periodEndDate = resolved.periodEndDate

    const segParams = await resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)

    const kpiRaw = await fetchCrossSellingKPI(segParams, periodStartDate, periodEndDate)

    return {
      period: { start: periodStartDate, end: periodEndDate, active_months: segParams.activeMonths, type: periodType, key: periodKey },
      kpi1: {
        multi_cat_count: kpiRaw.multi_cat_count,
        active_count:    kpiRaw.active_count,
        rate:            kpiRaw.multi_cat_rate,
      },
      kpi2: {
        avg_categories:      kpiRaw.avg_categories,
        total_distinct_cats: kpiRaw.total_distinct_cats,
      },
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data ringkasan cross-selling', 500)
  }
}

export async function getCustomerMetrics(params: CustomerMetricsQuery, scope: MetricsScope = {}): Promise<CustomerMetricsData> {
  try {
    const periodEnd = params.period_end ?? todayDate()
    const periodType = params.period_type ?? 'monthly'

    // Granularitas periode (task029.md §30.9 poin 1, 2026-08-22) — pola
    // SAMA PERSIS getCrossSellingMetrics (M1/M2) di atas, REUSE bukan tulis
    // ulang. M3-M7 sebelumnya hardcode `segParams.filterDate` sbg satu-
    // satunya acuan (12 bulan kalender mundur, dihitung DI DALAM
    // fetchCustomerMetricsTrend) — sekarang 12 titik ("buckets") dihitung DI
    // SINI (service layer), granularitas-aware, dikirim ke repository siap
    // pakai (repository TIDAK lagi menghitung tanggal periode sendiri).
    const [py, pm, pd] = periodEnd.split('-').map(Number)
    const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
    const calendarRange = getPeriodRange(periodType, periodKey)

    const buckets = buildTrailingPeriods(periodType, periodKey, 12)

    // Prioritas potong tanggal (apply_date_cutoff > skip_elapsed_clamp >
    // default clampToElapsedEnd) — SATU fungsi pusat sama persis dgn
    // getCrossSellingMetrics di atas, lihat komentar `resolveTrendPeriod`
    // (period.util.ts). M3-M7 belum ada CALLER yang mengaktifkan
    // apply_date_cutoff/skip_elapsed_clamp lewat UI saat ini — tapi
    // kapabilitasnya sudah tersedia global, tidak perlu ditulis ulang kalau
    // suatu saat dibutuhkan (mis. drilldown M3-M7 baru yang reuse fetch ini).
    const resolved = resolveTrendPeriod({
      periodKey, calendarEnd: calendarRange.end, calendarStart: calendarRange.start, periodType, buckets,
      applyDateCutoff: params.apply_date_cutoff,
      cutoffDay: params.cutoff_day,
      // fallbackDay = hari ke-N SEJAK AWAL PERIODE, bukan angka tanggal
      // mentah — lihat komentar `daysSincePeriodStart` di getCrossSellingMetrics
      // di atas (2026-08-23, fix bug granularitas non-bulanan).
      fallbackDay: daysSincePeriodStart(calendarRange.start, periodEnd),
      skipElapsedClamp: params.skip_elapsed_clamp,
    })
    const periodEndDate = resolved.periodEndDate
    const resolvedBuckets = resolved.buckets

    // "Bucket sebelumnya" per titik (dipakai M7 up/flat/inactive/down —
    // window "previous" = bucket SEBELUM bucket itu, lebar sama, keputusan
    // desain #2 §30.9 plan 2026-08-22) — dihitung DI SERVICE LAYER (bukan
    // di repository, konsisten dgn pembagian layer "repository tidak
    // menghitung tanggal periode sendiri", CRITICAL_RULES.md). Label
    // dibuat SAMA PERSIS dgn bucket current-nya (bukan label periode
    // sebelumnya sendiri) supaya repository bisa JOIN by label langsung.
    const prevBuckets = resolvedBuckets.map((b) => {
      const prevKey = getPreviousPeriodKey(periodType, b.label)
      const prevRange = getPeriodRange(periodType, prevKey)
      // Bucket ini terpotong (elapsed clamp default ATAU apply_date_cutoff) —
      // window previous ikut dipersempit PROPORSIONAL (jumlah hari elapsed
      // yang sama, dihitung dari awal previous), BUKAN dibiarkan kalender
      // previous PENUH sebulan (2026-08-23, bug dilaporkan user: trend
      // up_rate periode berjalan Agustus 2026 1,7% vs drilldown titik yang
      // sama 2,0% — root cause: current dipotong ke tanggal berjalan tapi
      // previous SELALU dipakai penuh sebulan, jadi baseline pembandingnya
      // tidak apple-to-apple. `fetchExpansionBreakdown`/drilldown SUDAH
      // benar dari awal — dipersempit proporsional lewat dateFrom/filterDate
      // — trend ini yang menyusul supaya konsisten, BUKAN sebaliknya).
      const fullRange = getPeriodRange(periodType, b.label)
      if (b.end < fullRange.end) {
        const elapsedDays = Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 86400000)
        const prevEndDate = new Date(prevRange.start)
        prevEndDate.setDate(prevEndDate.getDate() + elapsedDays)
        const prevEndStr = `${prevEndDate.getFullYear()}-${String(prevEndDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`
        return { label: b.label, start: prevRange.start, end: prevEndStr < prevRange.end ? prevEndStr : prevRange.end }
      }
      return { label: b.label, start: prevRange.start, end: prevRange.end }
    })

    const [segParams, { repeatOrderTargetPct }] = await Promise.all([
      resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto),
      loadThresholds(),
    ])

    const trend = await fetchCustomerMetricsTrend(segParams, resolvedBuckets, prevBuckets)

    const trendPoints: CustomerMetricsTrendPoint[] = trend.map((row) => ({
      month:                  row.month,
      existing_customers:      row.existing_customers,
      total_revenue_existing:  row.total_revenue_existing,
      avg_revenue:             row.avg_revenue,
      avg_gross_profit:        row.avg_gross_profit,
      gp_tier1:                row.gp_tier1,
      gp_tier2:                row.gp_tier2,
      gp_tier3:                row.gp_tier3,
      top_gp_customer_id:      row.top_gp_customer_id,
      top_gp_customer_name:    row.top_gp_customer_name,
      top_gp_revenue:          row.top_gp_revenue,
      top_gp_pct:              row.top_gp_pct,
      is_gp_concentrated:      row.top_gp_pct > 25,
      high_margin_ratio:       row.high_margin_ratio,
      high_margin_buyer_count: row.high_margin_buyer_count,
      repeat_order_rate:       row.repeat_order_rate,
      expansion_rate:          row.expansion_rate,
      up_rate:                 row.expansion_rate,
      flat_down_rate:          parseFloat((100 - row.expansion_rate).toFixed(1)),
      flat_rate:               row.flat_rate,
      inactive_rate:           row.inactive_rate,
      down_rate:               row.down_rate,
      up_count:                row.up_count,
      flat_count:              row.flat_count,
      inactive_count:          row.inactive_count,
      down_count:              row.down_count,
      existing_not_dormant_count: row.existing_not_dormant_count,
      active_existing_count:   row.active_existing_count,
      active_new_count:        row.active_new_count,
      median_revenue:          row.median_revenue,
      top_customer_id:         row.top_customer_id,
      top_customer_name:       row.top_customer_name,
      top_customer_revenue:    row.top_customer_revenue,
      top_customer_pct:        row.top_customer_pct,
      is_concentrated:         row.top_customer_pct > 25,
      hm_revenue:              row.hm_revenue,
    }))

    const last = trendPoints.at(-1)

    return {
      trend:   trendPoints,
      detail:  [],
      period:  { start: calendarRange.start, end: periodEndDate },
      high_margin_current: {
        bought_pct:     last?.high_margin_ratio ?? 0,
        not_bought_pct: parseFloat((100 - (last?.high_margin_ratio ?? 0)).toFixed(1)),
      },
      repeat_order_current: {
        value:      last?.repeat_order_rate ?? 0,
        target_pct: repeatOrderTargetPct,
      },
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer metrics', 500)
  }
}

export async function getRevenueBreakdown(params: RevenueBreakdownQuery, scope: MetricsScope = {}): Promise<RevenueBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    const result = await fetchRevenueBreakdown(segParams, params.date_from)
    return {
      period_end:       filterDate,
      total_revenue:    result.total_revenue,
      median_threshold: result.median_threshold,
      total_existing:   result.total_existing,
      hm_revenue:       result.hm_revenue,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil revenue breakdown', 500)
  }
}

export async function getExpansionBreakdown(params: ExpansionBreakdownQuery, scope: MetricsScope = {}): Promise<ExpansionBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    // date_from = periode penarikan data (mirror getGpBreakdown, koreksi user
    // 2026-08-10) — TERPISAH dari segParams.activeMonths (business config
    // "existing", tetap fixed).
    //
    // prevDateFrom/prevDateTo (2026-08-23, koreksi user: "membandingkan 1-7
    // Agustus vs 26-31 Juli itu makesense?" — jawaban TIDAK, window
    // "sebelumnya" harus PERIOD-ANCHORED, posisi relatif sama di periode
    // sebelumnya (1-7 Juli utk 1-7 Agustus), BUKAN rolling-window mundur dari
    // date_from — sama persis pola yang sudah dipakai `prevBuckets` di
    // `getCustomerMetrics` di atas, REUSE bukan tulis ulang) — cuma dihitung
    // kalau date_from+period_type dikirim (drilldown granularitas-aware),
    // biar repository bisa fallback ke rolling-window lama utk caller yang
    // belum wired (M7Expansion.tsx workbench).
    let prevDateFrom: string | undefined
    let prevDateTo: string | undefined
    if (params.date_from && params.period_type) {
      const periodType = params.period_type
      const [y, m, d] = params.date_from.split('-').map(Number)
      const periodKey = getCurrentPeriodKey(periodType, new Date(y, m - 1, d))
      const prevKey = getPreviousPeriodKey(periodType, periodKey)
      const prevRange = getPeriodRange(periodType, prevKey)
      const elapsedDays = Math.round((new Date(filterDate).getTime() - new Date(params.date_from).getTime()) / 86400000)
      const prevEndDate = new Date(prevRange.start)
      prevEndDate.setDate(prevEndDate.getDate() + elapsedDays)
      const prevEndStr = `${prevEndDate.getFullYear()}-${String(prevEndDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`
      prevDateFrom = prevRange.start
      prevDateTo = prevEndStr < prevRange.end ? prevEndStr : prevRange.end
    }
    const result = await fetchExpansionBreakdown(segParams, params.date_from, prevDateFrom, prevDateTo)
    return {
      period_end:     filterDate,
      up_count:       result.up_count,
      flat_count:     result.flat_count,
      inactive_count: result.inactive_count,
      down_count:     result.down_count,
      active_count:   result.active_count,
      total_existing: result.total_existing,
      rows:           result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil expansion breakdown', 500)
  }
}

export async function getGpBreakdown(params: GpBreakdownQuery, scope: MetricsScope = {}): Promise<GpBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    // date_from = periode penarikan data (task026 §8e) — TERPISAH dari
    // segParams.activeMonths (business config "existing", tetap fixed di atas).
    const result = await fetchGpBreakdown(segParams, params.date_from)
    return {
      period_end:       filterDate,
      total_gp:         result.total_gp,
      median_threshold: result.median_threshold,
      total_existing:   result.total_existing,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil GP breakdown', 500)
  }
}

export async function getHmBreakdown(params: HmBreakdownQuery, scope: MetricsScope = {}): Promise<HmBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    const result = await fetchHmBreakdown(segParams, params.date_from)
    return {
      period_end:       filterDate,
      total_hm_revenue: result.total_hm_revenue,
      hm_buyer_count:   result.hm_buyer_count,
      total_existing:   result.total_existing,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil HM breakdown', 500)
  }
}

/** Geser tanggal YYYY-MM-DD mundur/maju N tahun (kalender, bukan hitung hari) */
function shiftDateByYears(dateStr: string, years: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y + years, m - 1, d))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export async function getDormantCustomerMetrics(params: DormantCustomerQuery, scope: MetricsScope = {}): Promise<DormantMetricsData> {
  try {
    const periodEnd = params.period_end ?? todayDate()
    const periodType = params.period_type ?? 'monthly'

    // Granularitas periode (2026-08-24, susulan task029.md §30.9 poin 1 —
    // M8-M10 sebelumnya hardcode 12 bulan kalender via generate_series,
    // sekarang pola SAMA PERSIS getCustomerMetrics (M3-M7) di atas, REUSE
    // bukan tulis ulang.
    const [py, pm, pd] = periodEnd.split('-').map(Number)
    const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
    const calendarRange = getPeriodRange(periodType, periodKey)

    // Label bucket TETAP kalender asli (trailing 12 bulan sampai bulan
    // berjalan — titik "Agustus" TETAP ada di trend hari ini), TAPI
    // rentang TANGGAL DATA tiap bucket adalah bulan SEBELUM labelnya
    // (2026-08-24, definisi FINAL dari user, dikonfirmasi berkali-kali:
    // "customer dormant agustus adalah customer yang tidak ada transaksi
    // sepanjang mei, juni, 31 juli" — DAN "customer yang tidak transaksi
    // di bulan agustus ini baru masuk dormant di bulan september". Berlaku
    // utk SEMUA field titik "Agustus" — dormant_count, total_customers,
    // reactivated_count, dst, BUKAN cuma reactivation (percobaan sebelumnya
    // yang cuma geser reactivation SALAH menurut user).
    //
    // PENTING: label yang ditampilkan ke user (chart, tooltip, judul
    // dialog drilldown) SELALU pakai LABEL ini ("Agustus"/"2026-08"),
    // TIDAK PERNAH bulan data mentahnya ("Juli"/"2026-07") — kebocoran itu
    // yang bikin user marah ("NGAPAIN LU BERI JUDUL DORMANT 07-2026").
    //
    // Dikecualikan kalau `apply_date_cutoff` eksplisit aktif — mode lama,
    // user SENGAJA minta potongan hari tertentu termasuk periode berjalan,
    // pilihan eksplisit, TIDAK digeser (label = data bulan yang sama).
    let resolvedBuckets: TrailingPeriodBucket[]
    let liveBuckets: TrailingPeriodBucket[]
    let periodEndDate: string
    if (params.apply_date_cutoff) {
      const buckets = buildTrailingPeriods(periodType, periodKey, 12)
      const resolved = resolveTrendPeriod({
        periodKey, calendarEnd: calendarRange.end, calendarStart: calendarRange.start, periodType, buckets,
        applyDateCutoff: params.apply_date_cutoff,
        cutoffDay: params.cutoff_day,
        fallbackDay: daysSincePeriodStart(calendarRange.start, periodEnd),
        skipElapsedClamp: params.skip_elapsed_clamp,
      })
      periodEndDate = resolved.periodEndDate
      resolvedBuckets = resolved.buckets
      // Mode cutoff eksplisit: TIDAK ada konsep "live" terpisah, label = data
      // bulan yang sama, jadi live_buckets = buckets biasa (lihat JSDoc
      // fetchDormantTrend).
      liveBuckets = resolved.buckets
    } else {
      const labelBuckets = buildTrailingPeriods(periodType, periodKey, 12)
      resolvedBuckets = labelBuckets.map((b) => {
        const dataKey = getPreviousPeriodKey(periodType, b.label)
        const dataRange = getPeriodRange(periodType, dataKey)
        return { label: b.label, start: dataRange.start, end: dataRange.end }
      })
      periodEndDate = resolvedBuckets.at(-1)!.end

      // live_buckets (2026-08-24, definisi FINAL user: "reaktivasi adalah
      // data dormant yang telah diaktivasi DI PERIODE BERJALAN bulanan,
      // kuartalan, semesteran, tahunan") — periode ASLI titik ini (label ==
      // periodenya sendiri, BUKAN digeser spt resolvedBuckets di atas),
      // dipotong elapsed ke hari ini KALAU genuinely masih berjalan — reuse
      // resolveTrendPeriod TANPA apply_date_cutoff (default clampToElapsedEnd,
      // periode yang sudah tutup otomatis tidak terdampak).
      const liveResolved = resolveTrendPeriod({
        periodKey, calendarEnd: calendarRange.end, calendarStart: calendarRange.start, periodType, buckets: labelBuckets,
        applyDateCutoff: false,
        fallbackDay: daysSincePeriodStart(calendarRange.start, periodEnd),
        skipElapsedClamp: params.skip_elapsed_clamp,
      })
      liveBuckets = liveResolved.buckets
    }

    // "Bucket sebelumnya" per titik — relatif ke bulan DATA sebenarnya
    // tiap bucket (bukan label-nya langsung, karena di mode default
    // label != bulan data, lihat di atas). Bucket "2026-08" (data Juli)
    // → sebelumnya Juni, BUKAN Juli.
    const prevBuckets = resolvedBuckets.map((b) => {
      const dataKey = params.apply_date_cutoff ? b.label : getPreviousPeriodKey(periodType, b.label)
      const prevKey = getPreviousPeriodKey(periodType, dataKey)
      const prevRange = getPeriodRange(periodType, prevKey)
      const fullRange = getPeriodRange(periodType, dataKey)
      if (params.apply_date_cutoff && b.end < fullRange.end) {
        const elapsedDays = Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 86400000)
        const prevEndDate = new Date(prevRange.start)
        prevEndDate.setDate(prevEndDate.getDate() + elapsedDays)
        const prevEndStr = `${prevEndDate.getFullYear()}-${String(prevEndDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`
        return { label: b.label, start: prevRange.start, end: prevEndStr < prevRange.end ? prevEndStr : prevRange.end }
      }
      return { label: b.label, start: prevRange.start, end: prevRange.end }
    })

    // comparisonFilterDate (task025 lanjutan, 2026-08-07): tanggal yang sama
    // setahun lalu — dipakai utk komponen KpiSummaryStrip (pola "apple to
    // apple" dgn Revenue/Retention). CATATAN (2026-08-24): field
    // `comparison_value` hasil dari sini TIDAK dipakai frontend saat ini
    // (DormantData FE belum expose field itu) — tetap dihitung (backend
    // type sudah ada, jangan hapus kapabilitas), buckets comparison
    // dihitung SEDERHANA (kalender penuh, tanpa elapsed-clamp proporsional)
    // karena tidak ada UI yang membaca presisinya.
    const comparisonFilterDate = shiftDateByYears(periodEndDate, -1)
    const [ccpy, ccpm, ccpd] = comparisonFilterDate.split('-').map(Number)
    const comparisonPeriodKey = getCurrentPeriodKey(periodType, new Date(ccpy, ccpm - 1, ccpd))
    const comparisonBuckets = buildTrailingPeriods(periodType, comparisonPeriodKey, 12)
    const comparisonPrevBuckets = comparisonBuckets.map((b) => {
      const prevKey = getPreviousPeriodKey(periodType, b.label)
      const prevRange = getPeriodRange(periodType, prevKey)
      return { label: b.label, start: prevRange.start, end: prevRange.end }
    })

    const [segParams, thresholds] = await Promise.all([
      resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto),
      loadThresholds(),
    ])
    const comparisonSegParams = { ...segParams, filterDate: comparisonFilterDate }

    // Top reaktivasi (2026-08-24) — bucket = LIVE periode berjalan (Agustus
    // 1 s.d hari ini), prevBucket = baseline "Dormant Agustus" (Mei/Jun/Jul).
    const liveBucket = liveBuckets.at(-1)!
    // dormantBaselineBucket (2026-08-27, task029.md §36.55 — bug ditemukan
    // user: "kenapa date cutoff aktif, reaktivasi hilang?") — SEBELUMNYA
    // `resolvedBuckets.at(-1)!`, PADAHAL isi resolvedBuckets beda arti per
    // mode: non-cutoff = SUDAH digeser ke bulan lalu (benar, baseline =
    // Juli), TAPI cutoff aktif = TIDAK digeser sama sekali (isinya = bucket
    // berjalan itu sendiri, Agustus 1 s.d tanggal cutoff) — akibatnya
    // dormantBaselineBucket === liveBucket PERSIS di mode cutoff, window
    // "antara baseline dan sekarang" jadi NOL hari, reaktivasi mustahil
    // terdeteksi (SELALU 0 customer, di tanggal cutoff berapa pun — sudah
    // diverifikasi: tgl 1/15/27 Agustus hasilnya 0 semua). Baseline
    // SEHARUSNYA selalu bulan kalender PENUH sebelum periodKey saat ini
    // (Juli, utuh), TIDAK PERNAH ikut terpotong cutoff — cutoff cuma
    // memotong titik "sekarang" (liveBucket), bukan titik acuan
    // "sebelumnya" (koreksi tegas user: "start date selalu awal periode,
    // tanggal 1, end date selalu akhir periode kalau cutoff mati, terpotong
    // kalau cutoff aktif" — itu aturan utk bucket SEKARANG, bukan baseline).
    // Formula ini SAMA PERSIS `bucket` non-cutoff di atas (dataKey/dataRange),
    // makanya hasil non-cutoff TIDAK BERUBAH sama sekali — cuma mode cutoff
    // yang sekarang benar. `resolveDormantBaselineBucket` (§36.55) — SATU
    // fungsi, dipanggil ulang di sini DAN `resolveDormantSnapshotBucket` di
    // bawah, bukan diketik ulang 2x.
    const dormantBaselineBucket = resolveDormantBaselineBucket(periodType, periodKey)

    const [trend, valueRankingAll, comparisonTrend, comparisonValueRankingAll, statusLog, valueTrend] = await Promise.all([
      fetchDormantTrend(segParams, resolvedBuckets, prevBuckets, liveBuckets),
      // existingSince = liveBucket.start (task029.md §32.2, 2026-08-24) —
      // gate New/Existing SSOT §30.10, titik referensi SAMA PERSIS lb.ps
      // di fetchDormantTrend/is_existing_at_me (awal kalender ASLI label
      // yang sedang dilihat, bukan window data yang sudah digeser).
      //
      // limit=null (2026-08-26, task029.md §36.12 — bug ditemukan: "Total
      // Loss" M9 SEBELUMNYA dijumlah dari hasil `limit=20` ini, jadi cuma
      // total TOP 20 customer, BUKAN total SEMUA dormant customer — makin
      // banyak dormant customer di luar top 20, makin understated angkanya.
      // Sekarang fetch SEMUA (pola sama fetchDormantValueRanking limit=null
      // yang sudah dipakai getDormantBreakdown/M8), top-20 utk chart/tabel
      // di-slice di JS dari array penuh ini, TIDAK fetch 2x.
      fetchDormantValueRanking(segParams, null, liveBucket.start),
      // Comparison (YoY) TIDAK dipakai UI apa pun saat ini (lihat komentar
      // di atas) — comparisonBuckets dipakai juga sbg liveBuckets (kalender
      // penuh, tanpa shift/elapsed-clamp, sudah pasti periode lampau tutup).
      fetchDormantTrend(comparisonSegParams, comparisonBuckets, comparisonPrevBuckets, comparisonBuckets),
      fetchDormantValueRanking(comparisonSegParams, null, comparisonBuckets.at(-1)!.start),
      fetchCustomerDormantStatusLog(segParams, liveBucket, dormantBaselineBucket, liveBucket.start, !!params.apply_date_cutoff),
      // buckets param (2026-08-28, task029.md §41 — fetchDormantValueTrend
      // di-rewrite terima buckets eksplisit, dulu 1 SegmentParams saja).
      // `resolvedBuckets` SAMA yang dipakai fetchDormantTrend di atas —
      // field `value_trend` hasil ini TIDAK dipakai frontend saat ini
      // (DormantData FE belum deklarasikan field ini), tetap dihitung demi
      // kapabilitas backend (pola sama `comparisonTrend`/`comparison_value`
      // di atas, lihat komentar di situ).
      fetchDormantValueTrend(segParams, resolvedBuckets),
    ])
    // valueRanking/comparisonValueRanking (2026-08-26, lihat komentar di
    // atas) — top 20 UTK TAMPILAN (chart/ranking table), sudah ORDER BY
    // estimated_lost_value DESC dari query, slice aman. Total (di bawah)
    // TETAP dijumlah dari array PENUH (*All), bukan hasil slice ini.
    const valueRanking = valueRankingAll.slice(0, 20)
    const comparisonValueRanking = comparisonValueRankingAll.slice(0, 20)

    // Top reaktivasi periode berjalan (2026-08-24, susulan instruksi user
    // "buatkan juga 3 card summary diatas cart, dan top 5" M10) — filter
    // status log bucket TERAKHIR ke kategori reaktivasi saja (reactivated +
    // newlyDormant, dulu bernama 'relapsed'), diurutkan tanggal reaktivasi
    // terbaru. Reuse fetchCustomerDormantStatusLog yang SUDAH
    // granularitas-aware, bukan fetchReactivatedCustomers lama (hardcode
    // window 1 bulan kalender, DIHAPUS — sudah tidak dipakai lagi di mana pun).
    // Sort: reactivation_date terbaru dulu, tie-break avg_monthly_revenue
    // tertinggi (2026-08-24, koreksi user: "kalau berdasarkan abjad masih
    // ada yang lebih abjad awal, seharusnya urutkan berdasarkan avg revenue
    // nya tertinggi diantara reactivation lainnya" — sebelumnya tie utk
    // tanggal sama jatuh ke urutan alfabetis nama, efek samping ORDER BY
    // SQL, BUKAN kriteria bisnis).
    const reactivatedCustomers = statusLog
      .filter((r) => r.status === 'reactivated' || r.status === 'newlyDormant')
      .sort((a, b) => {
        const dateCompare = (b.reactivation_date ?? '').localeCompare(a.reactivation_date ?? '')
        if (dateCompare !== 0) return dateCompare
        return b.avg_monthly_revenue - a.avg_monthly_revenue
      })
      .slice(0, 20)

    const last = trend.at(-1)
    const comparisonLast = comparisonTrend.at(-1)
    const sumLostValue = (rows: DormantValueRow[]) => rows.reduce((acc, r) => acc + r.estimated_lost_value, 0)
    // sumLostGp (2026-08-26, task029.md §36.12) — versi Gross Profit
    // paralel, pola sama persis sumLostValue.
    const sumLostGp = (rows: DormantValueRow[]) => rows.reduce((acc, r) => acc + r.estimated_lost_gp, 0)

    return {
      trend,
      value_ranking: valueRanking,
      dormant_rate_current: {
        value:            last?.dormant_rate ?? 0,
        dormant_count:    last?.dormant_count ?? 0,
        total_customers:  last?.total_customers ?? 0,
        alert_pct:        thresholds.dormantRateAlertPct,
        comparison_value: comparisonLast?.dormant_rate ?? 0,
        active_count:                    last?.active_count ?? 0,
        dormant_light_count:             last?.dormant_light_count ?? 0,
        dormant_severe_count:            last?.dormant_severe_count ?? 0,
        active_count_comparison:         comparisonLast?.active_count ?? 0,
        dormant_light_count_comparison:  comparisonLast?.dormant_light_count ?? 0,
        dormant_severe_count_comparison: comparisonLast?.dormant_severe_count ?? 0,
      },
      reactivation_current: {
        value:            last?.reactivation_rate ?? 0,
        target_low:       thresholds.reactivationTargetLow,
        target_high:      thresholds.reactivationTargetHigh,
        comparison_value: comparisonLast?.reactivation_rate ?? 0,
      },
      value_ranking_total_current:    sumLostValue(valueRankingAll),
      value_ranking_total_comparison: sumLostValue(comparisonValueRankingAll),
      value_ranking_total_gp_current:    sumLostGp(valueRankingAll),
      value_ranking_total_gp_comparison: sumLostGp(comparisonValueRankingAll),
      reactivated_customers: reactivatedCustomers,
      value_trend: valueTrend,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data dormant customer metrics', 500)
  }
}

export async function getRorBreakdown(params: RorBreakdownQuery, scope: MetricsScope = {}): Promise<RorBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    const result = await fetchRorBreakdown(segParams, params.date_from)
    return {
      period_end:     filterDate,
      repeat_count:   result.repeat_count,
      total_existing: result.total_existing,
      rows:           result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil ROR breakdown', 500)
  }
}

// resolveDormantBaselineBucket (2026-08-27, task029.md §36.55 — koreksi
// KERAS user: "SUDAH ADA FUNGSI FILTER GLOBAL KENAPA KAMU TIDAK MENGIKUTI
// ALUR NYA" — sebelumnya formula "bulan kalender PENUH sebelum periodKey
// saat ini" (baseline reaktivasi/dormant, TIDAK PERNAH ikut terpotong
// cutoff) DITULIS ULANG 2x persis sama di `getDormantCustomerMetrics` dan
// `resolveDormantSnapshotBucket` — sekarang 1 fungsi, DIPANGGIL ULANG dari
// 2 tempat itu, bukan diketik ulang.
function resolveDormantBaselineBucket(periodType: 'monthly' | 'quarter' | 'semester' | 'annual', periodKey: string): { start: string; end: string } {
  return getPeriodRange(periodType, getPreviousPeriodKey(periodType, periodKey))
}

// Breakdown drill-down M8 (2026-08-24, instruksi user: "Buatkan end poin
// dril down breakdown singkat, lengkapnya nanti di tabel laporan") — pola
// SAMA PERSIS getRorBreakdown (M6) di atas, cuma repository-nya reuse
// fetchDormantValueRanking dgn limit=null (SEMUA customer dormant di
// period_end, bukan top 20 spt M9).
//
// resolveDormantSnapshotBucket (2026-08-27, task029.md §36.54 — koreksi
// KERAS user: "Kan semua parameter harus seragam. Akhir bulan, kecuali
// filter date cutoff diaktifkan" — screenshot bukti: tab Reaktivasi
// Laporan, "Dormant" (16.964, snapshot 31 Juli — via was_dormant_at_prev
// yang SELALU hardcode bulan lalu) TIDAK NYAMBUNG dgn "Active Customer"/
// "Lapsed" di kartu SEBELAHNYA (783/14.884, snapshot HARI INI/live) —
// padahal satu tab, satu baris kartu, seharusnya satu titik waktu acuan).
// `getDormantCustomerMetrics` (M8-M10 dashboard) SUDAH benar (diverifikasi
// live: cutoff off → shift ke bulan lalu, cutoff on → tanggal live) — fungsi
// INI meng-ekstrak pola bucket-resolution yang SAMA supaya `getDormantBreakdown`
// (tab Dormant) dan `getDormantStatusBreakdown` (tab Reaktivasi) REUSE 1
// sumber kebenaran yang sama, bukan masing-masing punya logika sendiri.
function resolveDormantSnapshotBucket(
  periodEnd: string,
  periodType: 'monthly' | 'quarter' | 'semester' | 'annual',
  applyDateCutoff: boolean | undefined,
  cutoffDay: number | undefined,
  skipElapsedClamp: boolean | undefined,
): { filterDate: string; bucket: { start: string; end: string }; dormantBaselineBucket: { start: string; end: string }; liveBucket: { start: string; end: string }; liveCalendarStart: string } {
  const [py, pm, pd] = periodEnd.split('-').map(Number)
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
  const calendarRange = getPeriodRange(periodType, periodKey)

  let bucket: { start: string; end: string }
  if (applyDateCutoff) {
    const resolved = resolveTrendPeriod({
      periodKey, calendarEnd: calendarRange.end, calendarStart: calendarRange.start, periodType,
      buckets: [{ label: periodKey, start: calendarRange.start, end: calendarRange.end }],
      applyDateCutoff, cutoffDay,
      fallbackDay: daysSincePeriodStart(calendarRange.start, periodEnd),
      skipElapsedClamp,
    })
    bucket = { start: calendarRange.start, end: resolved.periodEndDate }
  } else {
    const dataKey = getPreviousPeriodKey(periodType, periodKey)
    const dataRange = getPeriodRange(periodType, dataKey)
    bucket = { start: dataRange.start, end: dataRange.end }
  }

  // dormantBaselineBucket (2026-08-27, task029.md §36.55 — koreksi tegas
  // user: "start date selalu awal periode, tanggal 1, end date selalu akhir
  // periode kalau cutoff mati, terpotong kalau cutoff aktif" — itu aturan
  // utk bucket SEKARANG/liveBucket di bawah, BUKAN baseline reaktivasi ini)
  // — SEBELUMNYA field `prevBucket` di sini dihitung "1 periode sebelum
  // `bucket`" DENGAN penyempitan proporsional kalau `bucket` terpotong
  // cutoff — itu formula SALAH utk keperluan status reaktivasi: baseline
  // "was_dormant_at_prev" (§36.36, sudah didokumentasikan: "BELUM dormant
  // di AWAL periode berjalan") HARUS selalu bulan kalender PENUH sebelum
  // periodKey SAAT INI (Juli, utuh), TIDAK PERNAH ikut terpotong cutoff —
  // SAMA PERSIS `dormantBaselineBucket` di `getDormantCustomerMetrics` —
  // panggil `resolveDormantBaselineBucket` yang SAMA (§36.55), bukan
  // formula diketik ulang.
  const dormantBaselineBucket = resolveDormantBaselineBucket(periodType, periodKey)

  // liveBucket — window "sekarang" (Agustus 1 s.d hari ini/tanggal cutoff),
  // mereplikasi PERSIS `liveBuckets` di `getDormantCustomerMetrics`: mode
  // cutoff aktif → sama dgn `bucket` (tidak ada konsep live terpisah), mode
  // default → kalender bulan berjalan dipotong elapsed ke hari ini
  // (`clampToElapsedEnd`, REUSE fungsi yang sama, bukan tulis ulang).
  const liveBucket = applyDateCutoff
    ? bucket
    : { start: calendarRange.start, end: clampToElapsedEnd(periodKey, calendarRange.end, periodType) }

  return { filterDate: bucket.end, bucket, dormantBaselineBucket, liveBucket, liveCalendarStart: calendarRange.start }
}

export async function getDormantBreakdown(params: DormantCustomerQuery, scope: MetricsScope = {}): Promise<DormantBreakdownData> {
  try {
    // Dua mode (2026-08-27, §36.54), SAMA PERSIS getDormantStatusBreakdown:
    // `period_type` DIKIRIM (Report/Retention tab Dormant, Report/Growth tab
    // Ekspansi — "periode berjalan") → resolveDormantSnapshotBucket, SATU
    // acuan sama dgn getDormantCustomerMetrics/getDormantStatusBreakdown.
    // `period_type` TIDAK dikirim (M8DormantRate.tsx dashboard, klik 1 titik
    // chart trend — `period_end` SUDAH final hasil resolusi frontend sendiri
    // dari titik yang diklik) → filterDate = period_end APA ADANYA, PERILAKU
    // LAMA, tidak boleh diproses ulang (double-shift kalau dipaksa lewat
    // resolver periode berjalan).
    let filterDate: string
    let existingSince: string | undefined
    if (params.period_type) {
      const periodEnd = params.period_end ?? todayDate()
      const resolved = resolveDormantSnapshotBucket(periodEnd, params.period_type, params.apply_date_cutoff, params.cutoff_day, params.skip_elapsed_clamp)
      filterDate = resolved.filterDate
      // liveCalendarStart, BUKAN resolved.bucket.start (2026-08-27, §36.55) —
      // gate New/Existing SSOT SELALU awal kalender ASLI (Agustus 1), SAMA
      // persis `liveBucket.start` di pemanggilan `getDormantCustomerMetrics`
      // (lihat JSDoc fetchDormantValueRanking baris ~291) — bukan awal
      // baseline snapshot yang bisa digeser ke bulan lalu (cutoff off).
      existingSince = resolved.liveCalendarStart
    } else {
      filterDate = params.period_end ?? todayDate()
    }
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    const rows = await fetchDormantValueRanking(segParams, null, existingSince)
    return {
      period_end: filterDate,
      rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil dormant breakdown', 500)
  }
}

// Status breakdown per customer utk 1 titik (2026-08-24, susulan pertanyaan
// user soal ambiguitas reaktivasi — lihat JSDoc CustomerDormantStatusRow di
// metrics.types.ts). DUA mode (2026-08-27, §36.54):
// - `date_from` DIKIRIM eksplisit (M10 dashboard, klik 1 titik chart trend
//   spesifik — `M10ReactivationRate.tsx` handlePointClick) — titik HISTORIS
//   yang diklik, bucket-nya SUDAH ditentukan sendiri oleh caller (bulan yang
//   diklik, live-clamped di frontend), prevBucket SELALU 1 bulan kalender
//   penuh sebelumnya (titik historis dianggap SUDAH tutup) — PERILAKU LAMA,
//   tidak berubah, `apply_date_cutoff` TIDAK relevan di sini (bukan "periode
//   berjalan").
// - `date_from` TIDAK dikirim (Report/Retention tab Reaktivasi — "periode
//   berjalan" saat ini) — bucket current+sebelumnya dari
//   `resolveDormantSnapshotBucket`, SATU sumber acuan tanggal yang sama
//   dgn getDormantCustomerMetrics/getDormantBreakdown (koreksi user:
//   "semua parameter harus seragam, akhir bulan kecuali cutoff
//   diaktifkan" — sebelumnya current SELALU live, previous SELALU bulan
//   lalu, 2 acuan beda dalam 1 tab).
export async function getDormantStatusBreakdown(params: DormantStatusBreakdownQuery, scope: MetricsScope = {}): Promise<DormantStatusBreakdownData> {
  try {
    let bucket: { start: string; end: string }
    let prevBucket: { start: string; end: string }
    let liveCalendarStart: string | undefined
    // applyDateCutoffGate (2026-08-27, §36.56) — gerbang cabang "baru
    // menyebrang dormant DI DALAM periode ini" di fetchCustomerDormantStatusLog
    // HANYA relevan mode Report (`date_from` absen, resolveDormantSnapshotBucket)
    // — mode drilldown lama (`date_from` hadir) TIDAK kenal konsep cutoff sama
    // sekali (komentar JSDoc di atas: "apply_date_cutoff TIDAK relevan di
    // sini"), tetap false PERILAKU LAMA.
    let applyDateCutoffGate = false

    if (params.date_from) {
      const filterDate = params.period_end ?? todayDate()
      bucket = { start: params.date_from, end: filterDate }
      prevBucket = { start: params.date_from, end: filterDate }
      if (params.period_type) {
        const periodType = params.period_type
        const [y, m, d] = params.date_from.split('-').map(Number)
        const periodKey = getCurrentPeriodKey(periodType, new Date(y, m - 1, d))
        const prevKey = getPreviousPeriodKey(periodType, periodKey)
        const prevRange = getPeriodRange(periodType, prevKey)
        prevBucket = { start: prevRange.start, end: prevRange.end }
      }
    } else {
      const periodEnd = params.period_end ?? todayDate()
      const periodType = params.period_type ?? 'monthly'
      const resolved = resolveDormantSnapshotBucket(periodEnd, periodType, params.apply_date_cutoff, params.cutoff_day, params.skip_elapsed_clamp)
      // bucket/prevBucket (2026-08-27, §36.55, lihat komentar liveBucket &
      // dormantBaselineBucket di resolveDormantSnapshotBucket) —
      // `fetchCustomerDormantStatusLog` taruh acuan LIVE di slot `bucket`
      // (is_dormant_at_me/transacted_in_period) dan acuan BASELINE (bulan
      // kalender PENUH sebelum periode berjalan, TIDAK ikut terpotong cutoff
      // — sumber status 'dormant'/'reactivated') di slot `prevBucket` — SAMA
      // persis pemanggilan `getDormantCustomerMetrics` (liveBucket,
      // dormantBaselineBucket).
      bucket = resolved.liveBucket
      prevBucket = resolved.dormantBaselineBucket
      applyDateCutoffGate = !!params.apply_date_cutoff
      // liveCalendarStart (2026-08-27, §36.54) — gerbang "New" TETAP awal
      // kalender ASLI periode yang dilihat (Agustus 1), TIDAK ikut geser ke
      // Juli walau baseline dormant-nya digeser (cutoff off) — SAMA aturan
      // `lb.ps` di fetchDormantTrend, supaya Total Customer Base tab ini
      // SELALU cocok dgn kartu M8 (32.631), tidak ikut menyusut krn gate
      // "New" salah geser.
      liveCalendarStart = resolved.liveCalendarStart
    }

    const segParams = await resolveSegmentParams(params.company_id, bucket.end, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)

    const rows = await fetchCustomerDormantStatusLog(segParams, bucket, prevBucket, liveCalendarStart, applyDateCutoffGate)
    const filtered = params.status ? rows.filter((r) => r.status === params.status) : rows

    return {
      period_start: bucket.start,
      period_end:   bucket.end,
      rows:         filtered,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil status breakdown dormant customer', 500)
  }
}

// Riwayat revenue bulanan per customer (2026-08-25, drilldown M9 — klik bar
// ranking "Potensi Omset Hilang", instruksi user: "Nama customer, divisi,
// berapa lama dia dormant, tanggal transaksi terakhirnya... list revenue
// customer tersebut selama 12 bulan"). `ref_date` (bukan `todayDate()`)
// dipakai sbg filterDate segParams JUGA — customer ini SUDAH dormant,
// scope company/branch/division-nya tidak berubah krn tanggal filter,
// tapi `resolveSegmentParams` tetap butuh SATU tanggal, `ref_date` yang
// paling relevan (sama dgn window revenue yang dihitung).
export async function getDormantValueHistory(params: DormantValueHistoryQuery, scope: MetricsScope = {}): Promise<DormantValueHistoryData> {
  try {
    const segParams = await resolveSegmentParams(params.company_id, params.ref_date, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany, params.only_pareto)
    const rows = await fetchDormantValueHistory(segParams, params.customer_id, params.ref_date)
    return {
      customer_id: params.customer_id,
      rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil riwayat revenue customer dormant', 500)
  }
}

export async function getCategoryPerformance(
  params: CategoryPerformanceQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchCategoryPerformance({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd,
      activeWindow:   params.active_window,
      search:         params.search,
      highMarginOnly: params.high_margin_only,
      sortBy:         params.sort_by,
      sortDir:        params.sort_dir,
      page:           params.page,
      perPage:        params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.category_id, ...row }))

    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil performa kategori produk', 500)
  }
}

export async function getProductPerformance(
  params: ProductPerformanceQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchProductPerformance({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      categoryId:      params.category_id,
      itemType:        params.item_type,
      periodEnd,
      activeWindow:   params.active_window,
      search:         params.search,
      highMarginOnly: params.high_margin_only,
      sortBy:         params.sort_by,
      sortDir:        params.sort_dir,
      page:           params.page,
      perPage:        params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.product_id, ...row }))

    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil performa produk', 500)
  }
}

export async function getProductCategoryOptions(
  params: ProductCategoryOptionsQuery,
  scope: MetricsScope = {},
): Promise<{ id: number; name: string }[]> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    return await fetchProductCategoryOptions({ cid, companyScopeIds: scope.companyScopeIds, itemType: params.item_type })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar kategori', 500)
  }
}

export async function getCategoryProducts(
  params: CategoryProductsQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number; summary: Record<string, unknown> }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { rows, summary } = await fetchCategoryProducts({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      categoryId:  params.category_id,
      excludeIntercompany: params.exclude_intercompany,
      onlyHighMargin: params.high_margin_only,
      division:     params.division,
      branchFilter: params.branch_id,
      periodEnd,
      activeWindow: params.active_window,
      page:         params.page,
      perPage:      params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.product_id,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))

    return { data, total, summary: { ...summary } }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil produk dalam kategori', 500)
  }
}

export async function getHmPenetrationDetail(
  params: HmDetailQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchHmDetail({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      periodStart:     params.period_start,
      onlyPareto:      params.only_pareto,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.category_id,
      is_high_margin: true,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil penetrasi high margin', 500)
  }
}

/** task017 lanjutan — view flat per-produk (1 baris = 1 produk high margin),
 * VIEW DEFAULT baru menggantikan asumsi lama "baris = kategori" (flag di DB
 * SELALU per-produk, lihat catatan di fetchHmProductDetail()). */
export async function getHmProductPenetrationDetail(
  params: HmDetailQuery,
  scope: MetricsScope = {},
): Promise<{
  data: object[]; total: number
  totalHmBuyers: number; totalActiveCustomers: number
  totalHmBuyersExisting: number; totalHmBuyersNew: number
}> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchHmProductDetail({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      periodStart:     params.period_start,
      onlyPareto:      params.only_pareto,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    // totalHmBuyers/totalActiveCustomers (2026-08-31, instruksi user: "tambahkan
    // summary total pembeli high margin di atas tabel produk penetration") —
    // scalar SAMA di semua baris (lihat komentar HmProductDbRow.total_hm_buyers),
    // diambil dari baris pertama sbg ringkasan level-halaman, BUKAN per-produk.
    const totalHmBuyers = rows[0]?.total_hm_buyers ?? 0
    const totalActiveCustomers = rows[0]?.total_active_customers ?? 0
    // totalHmBuyersExisting/New (2026-08-31, instruksi user: "buat 2 kartu, 1
    // existing active, 1 new customer, total yang membeli active transacting"
    // — susulan laporan "kenapa di card 24 di tabel 25, itu inkonsistensi",
    // diverifikasi lewat query manual: beda 1 customer PT ANUGRAH GASINDO
    // ABADI, transaksi pertamanya 12 Agustus 2026 - "New" di window Agustus,
    // makanya dibuang dari kartu M5 "Existing Active" tapi ikut kehitung di
    // ringkasan total sini). existing+new SELALU = totalHmBuyers.
    const totalHmBuyersExisting = rows[0]?.total_hm_buyers_existing ?? 0
    const totalHmBuyersNew = rows[0]?.total_hm_buyers_new ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.product_id,
      is_high_margin: true,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))
    return { data, total, totalHmBuyers, totalActiveCustomers, totalHmBuyersExisting, totalHmBuyersNew }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil penetrasi high margin per produk', 500)
  }
}

/** Drill-down "Customer Pembeli" + "Capaian per Divisi" (task017) — 1 dialog,
 * 2 query paralel: list customer terpaginasi + breakdown per divisi (TIDAK
 * terpaginasi, supaya angkanya selalu lengkap walau customer di halaman ini
 * sedikit). */
export async function getHmCustomers(
  params: HmCustomersQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number; breakdown: object[] }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const repoParams = {
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      targetType:  params.target_type,
      targetId:    params.target_id,
      division:     params.division,
      branchFilter: params.branch_id,
      excludeIntercompany: params.exclude_intercompany,
      periodEnd, activeWindow: params.active_window,
      page: params.page, perPage: params.per_page,
    }

    const [rows, breakdown] = await Promise.all([
      fetchHmCustomers(repoParams),
      fetchHmDivisionBreakdown(repoParams),
    ])

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: `${row.customer_id}-${row.division_id ?? 'na'}`, ...row }))
    return { data, total, breakdown }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil customer pembeli', 500)
  }
}

export async function getCustomerProducts(
  params: CustomerProductsQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number; summary: Record<string, unknown> }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    // periodEnd — kalau period_start/period_end eksplisit dikirim (M1 heatmap
    // drill-down, granularitas-aware), pakai LANGSUNG. Kalau tidak (jalur
    // lama period_month+active_window, dipakai UpsellCustomerDialog.tsx),
    // tetap hitung dari period_month spt sebelumnya — TIDAK diubah.
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = params.period_end ?? `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { rows, summary } = await fetchCustomerProducts({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      customerId:  params.customer_id,
      categoryId:  params.category_id,
      itemType:    params.item_type,
      excludeIntercompany: params.exclude_intercompany,
      division:     params.division,
      branchFilter: params.branch_id,
      periodEnd,
      periodStart:  params.period_start,
      activeWindow: params.active_window,
      page:         params.page,
      perPage:      params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.product_id, ...row }))
    return { data, total, summary: { ...summary } }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil riwayat produk customer', 500)
  }
}

export async function getUpsellTargets(
  params: UpsellTargetQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchUpsellTargets({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      periodStart: params.period_start,
      onlyPareto: params.only_pareto,
      divisionId: params.division ?? null,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, relevance_score, ...row }) => row)
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil upsell targets', 500)
  }
}

export async function getAvgCategoryTrend(params: AvgCategoryQuery, scope: MetricsScope = {}): Promise<ProductTrendData> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling / category-performance)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Default active_window dari business_configs.active_window_months (SSOT, sama dengan
    // cross-selling/dormant) — bukan hardcode, supaya tiap titik trend self-contained per bulan
    // kalender (bukan rolling multi-bulan) kecuali caller eksplisit override.
    const activeWindow = params.active_window ?? (await loadThresholds()).activeMonths

    const trend = await fetchAvgCategoryTrend({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd,
      activeWindow,
    })

    const current = trend.at(-1)
    const prev    = trend.at(-2)
    const currentAvg = current?.avg_category ?? 0
    const prevAvg     = prev?.avg_category ?? null
    const changePct   = prevAvg !== null && prevAvg !== 0
      ? parseFloat((((currentAvg - prevAvg) / prevAvg) * 100).toFixed(1))
      : null

    return {
      company_id:   params.company_id,
      period_month: params.period_month,
      trend,
      current_avg:  currentAvg,
      prev_avg:     prevAvg,
      change_pct:   changePct,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil tren rata-rata kategori produk', 500)
  }
}
