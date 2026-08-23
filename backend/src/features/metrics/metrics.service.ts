import { AppError, ErrorCode } from '@/utils/error'
import { loadThresholds, resolveDormantCategory, resolveDormantMonths, getDormantCategoryMap } from '@/features/config/threshold'
import { loadDivisionFallbackIds, flattenFallbackByBranch } from '@/utils/scope'
import { fetchCustomerMetricsTrend, fetchRevenueBreakdown, fetchExpansionBreakdown, fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking, fetchReactivatedCustomers, fetchCrossSellingKPI, fetchCrossSellingTrend, fetchCrossSellingDetail, fetchCrossSellingHeatmap, fetchCategoryPerformance, fetchProductPerformance, fetchProductCategoryOptions, fetchCategoryProducts, fetchHmDetail, fetchHmProductDetail, fetchUpsellTargets, fetchCustomerProducts, fetchAvgCategoryTrend, fetchHmCustomers, fetchHmDivisionBreakdown } from './metrics.repository'
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
import { getPeriodRange, getCurrentPeriodKey, getPreviousPeriodKey, buildTrailingPeriods, resolveTrendPeriod } from '@/features/analisis/period.util'
import type { AssignToDivision } from './metrics.repository'
import { buildSegmentParams } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { CrossSellingQuery, CustomerMetricsQuery, RevenueBreakdownQuery, ExpansionBreakdownQuery, GpBreakdownQuery, HmBreakdownQuery, RorBreakdownQuery, DormantCustomerQuery, CategoryPerformanceQuery, ProductPerformanceQuery, ProductCategoryOptionsQuery, CategoryProductsQuery, HmDetailQuery, UpsellTargetQuery, CustomerProductsQuery, AvgCategoryQuery, HmCustomersQuery } from './metrics.schema'
import type { CrossSellingMetricsData, CustomerMetricsData, CustomerMetricsTrendPoint, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantMetricsData, DormantValueRow, ProductTrendData } from './metrics.types'

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
  return buildSegmentParams(companyId, filterDate, activeMonths, dormantMonths, otherIdByBranch, intercompanyIdByCompany, dormant, dormantCategoryMap, division, branchScope, divisionScope, companyScopeIds, branchId, excludeIntercompany)
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
      fallbackDay: pd,
      skipElapsedClamp: params.skip_elapsed_clamp,
    })
    const periodEndDate = resolved.periodEndDate
    const resolvedBuckets = resolved.buckets

    const segParams = await resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)

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
      fallbackDay: pd,
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
      resolveSegmentParams(params.company_id, periodEndDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany),
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchRevenueBreakdown(segParams)
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchHmBreakdown(segParams)
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
    const filterDate = params.period_end ?? todayDate()
    // comparisonFilterDate (task025 lanjutan, 2026-08-07): tanggal yang sama
    // setahun lalu — dipakai utk komponen KpiSummaryStrip (pola "apple to
    // apple" dgn Revenue/Retention, SEMUA halaman KPI selalu YoY). Threshold
    // dormant/scope TETAP dari segParams yang SAMA (resolusi 1x, di-reuse
    // dgn filterDate di-override) — TIDAK ada aturan bisnis yang berubah,
    // cuma dihitung ulang di 2 titik waktu.
    const comparisonFilterDate = shiftDateByYears(filterDate, -1)
    const [segParams, thresholds] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany),
      loadThresholds(),
    ])
    const comparisonSegParams = { ...segParams, filterDate: comparisonFilterDate }

    const [trend, valueRanking, comparisonTrend, comparisonValueRanking, reactivatedCustomers, valueTrend] = await Promise.all([
      fetchDormantTrend(segParams),
      fetchDormantValueRanking(segParams),
      fetchDormantTrend(comparisonSegParams),
      fetchDormantValueRanking(comparisonSegParams),
      fetchReactivatedCustomers(segParams),
      fetchDormantValueTrend(segParams),
    ])

    const last = trend.at(-1)
    const comparisonLast = comparisonTrend.at(-1)
    const sumLostValue = (rows: DormantValueRow[]) => rows.reduce((acc, r) => acc + r.estimated_lost_value, 0)

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
      value_ranking_total_current:    sumLostValue(valueRanking),
      value_ranking_total_comparison: sumLostValue(comparisonValueRanking),
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchRorBreakdown(segParams)
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
): Promise<{ data: object[]; total: number }> {
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
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.product_id,
      is_high_margin: true,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))
    return { data, total }
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
      businessUnit: params.business_unit || null,
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
