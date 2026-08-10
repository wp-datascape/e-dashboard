import { AppError, ErrorCode } from '@/utils/error'
import { getCrossSellingMetrics, getCustomerMetrics, getDormantCustomerMetrics, resolveSegmentParams } from '@/features/metrics/metrics.service'
import type { MetricsScope } from '@/features/metrics/metrics.service'
import { loadThresholds } from '@/features/config/threshold'
import { fetchDormantValueTrend } from './dashboard.repository'
import type { ChartType, DashboardData, MetricCard, MetricSummary, MonthlyTrendPoint } from './dashboard.types'
import type { DashboardQuery } from './dashboard.schema'

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Geser tanggal ISO N tahun (dipakai utk hitung tanggal pembanding YoY -
// task026 §9, 2026-08-09) - pola sama dgn `shiftDateByYears` di frontend.
function shiftYearsIso(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

// Pembanding sekarang YoY (nilai periode yang sama, 1 tahun lalu), BUKAN
// MoM lagi (task026 §9, 2026-08-09) — sebelumnya `previous` = trend.at(-2)
// (bulan lalu), sekarang jadi nilai metrik yang SAMA dihitung ulang dgn
// filterDate digeser -1 tahun (lihat getDashboard di bawah), biar mental
// model-nya konsisten dgn 10 halaman KPI individual yang semua sudah
// pakai pembanding YoY.
function buildSummary(current: number, yoyValue: number): MetricSummary {
  const change = yoyValue !== 0 ? ((current - yoyValue) / yoyValue) * 100 : 0
  return {
    current_value: current,
    previous_value: yoyValue,
    change_percent: parseFloat(change.toFixed(1)),
    trend: current > yoyValue ? 'up' : current < yoyValue ? 'down' : 'stable',
  }
}

// Rata-rata field bulanan dlm rentang [start, end] (inklusif, banding
// string 'YYYY-MM', BUKAN trailing-N-by-posisi-array) — dipakai supaya
// dropdown Periode (Bulanan/Kuartalan/Semester/Tahunan) BENERAN mengubah
// angka headline dashboard (task026 §9 lanjutan, 2026-08-09, koreksi user
// "kenapa filter periode ... tidak bekerja": sebelumnya periodType di UI
// Dashboard tidak pernah dikirim ke backend, headline SELALU cuma titik
// bulan terakhir). Pola SAMA dgn `sumMonthsInRange`/`averageMonthsInRange`
// frontend (§8g, KPI4) — filter by bulan asli yg align kalender, bukan
// trailing-N dari HARI INI (bug lama, salah kalau rentang kalender tidak
// align sama filterDate). `start` opsional: kalau tidak dikirim frontend,
// fallback ke perilaku lama (titik bulan terakhir saja) — backward compat.
function averageInRange<T extends { month: string }>(
  trend: T[], start: string | undefined, end: string, accessor: (row: T) => number,
): number {
  if (!start) return trend.at(-1) ? accessor(trend.at(-1)!) : 0
  const startMonth = start.slice(0, 7)
  const endMonth = end.slice(0, 7)
  const rows = trend.filter((r) => r.month >= startMonth && r.month <= endMonth)
  if (rows.length === 0) return 0
  return rows.reduce((sum, r) => sum + accessor(r), 0) / rows.length
}

function buildCard(
  metric_key: string,
  title: string,
  subtitle: string,
  link: string,
  format: 'percent' | 'number' | 'currency',
  chartType: ChartType,
  trend: MonthlyTrendPoint[],
  currentValue: number,
  yoyValue: number,
  detail?: Record<string, number>,
): MetricCard {
  return {
    metric_key,
    title,
    subtitle,
    link,
    format,
    chart_type: chartType,
    summary: buildSummary(currentValue, yoyValue),
    monthly_trend: trend,
    detail,
  }
}

export async function getDashboard(
  scope: MetricsScope = {},
  companyId: number | 'all' = 'all',
  branchId?: number,
  division?: DashboardQuery['division'],
  periodEnd?: string,
  excludeIntercompany?: boolean,
  periodStart?: string,
): Promise<DashboardData> {
  try {
    const filterDate = periodEnd ?? todayDate()
    const comparisonDate = shiftYearsIso(filterDate, -1)
    // Awal rentang pembanding YoY = awal rentang aktif digeser -1 tahun juga
    // (sama pola dgn `filterDate`/`comparisonDate`) — task026 §9 lanjutan.
    const comparisonPeriodStart = periodStart ? shiftYearsIso(periodStart, -1) : undefined
    const excludeIC = excludeIntercompany ?? false

    // Fetch 2x — filterDate (periode aktif) & comparisonDate (YoY, 1 tahun
    // lalu) — lewat SERVICE FUNCTION YANG SAMA (task026 §9), pola identik
    // dgn yang sudah terverifikasi di KPI4 (dual-fetch beda period_end).
    // "Existing customer" tiap titik tetap dihitung KONTEMPORER thd
    // tanggalnya sendiri (resolveSegmentParams dipanggil terpisah per
    // tanggal) - BUKAN override activeMonths, prinsip §8e tidak berubah.
    const [cross, customer, dormant, thresholds, segParams,
           crossYoy, customerYoy, dormantYoy, segParamsYoy] = await Promise.all([
      getCrossSellingMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getCustomerMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getDormantCustomerMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      loadThresholds(),
      resolveSegmentParams(companyId, filterDate, division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, branchId, excludeIC),
      getCrossSellingMetrics({ company_id: companyId, period_end: comparisonDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getCustomerMetrics({ company_id: companyId, period_end: comparisonDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getDormantCustomerMetrics({ company_id: companyId, period_end: comparisonDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      resolveSegmentParams(companyId, comparisonDate, division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, branchId, excludeIC),
    ])

    const [dormantValueTrend, dormantValueTrendYoy] = await Promise.all([
      fetchDormantValueTrend(segParams),
      fetchDormantValueTrend(segParamsYoy),
    ])

    // Nilai headline = rata-rata field bulanan dlm rentang [periodStart,
    // filterDate] (ikut dropdown Periode), BUKAN cuma titik bulan terakhir
    // lagi (task026 §9 lanjutan, 2026-08-09). `current`/`yoy` pakai fungsi
    // agregasi YANG SAMA, cuma beda rentang tanggal (aktif vs YoY -1 tahun) —
    // "existing customer" tiap trend point tetap dihitung kontemporer thd
    // bulannya sendiri (query terpisah per periodEnd, prinsip §8e tidak
    // berubah), yang berubah cuma bulan-bulan mana yg di-rata-rata.
    const current = {
      cross_selling_ratio: averageInRange(cross.trend, periodStart, filterDate, (r) => r.ratio),
      avg_category: averageInRange(cross.trend, periodStart, filterDate, (r) => r.avg_category),
      avg_revenue: averageInRange(customer.trend, periodStart, filterDate, (r) => r.avg_revenue),
      avg_gross_profit: averageInRange(customer.trend, periodStart, filterDate, (r) => r.avg_gross_profit),
      high_margin_penetration: averageInRange(customer.trend, periodStart, filterDate, (r) => r.high_margin_ratio),
      repeat_order_rate: averageInRange(customer.trend, periodStart, filterDate, (r) => r.repeat_order_rate),
      expansion_rate: averageInRange(customer.trend, periodStart, filterDate, (r) => r.expansion_rate),
      dormant_rate: averageInRange(dormant.trend, periodStart, filterDate, (r) => r.dormant_rate),
      dormant_value: averageInRange(dormantValueTrend, periodStart, filterDate, (r) => r.value),
      reactivation_rate: averageInRange(dormant.trend, periodStart, filterDate, (r) => r.reactivation_rate),
    }

    const yoy = {
      cross_selling_ratio: averageInRange(crossYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.ratio),
      avg_category: averageInRange(crossYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.avg_category),
      avg_revenue: averageInRange(customerYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.avg_revenue),
      avg_gross_profit: averageInRange(customerYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.avg_gross_profit),
      high_margin_penetration: averageInRange(customerYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.high_margin_ratio),
      repeat_order_rate: averageInRange(customerYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.repeat_order_rate),
      expansion_rate: averageInRange(customerYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.expansion_rate),
      dormant_rate: averageInRange(dormantYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.dormant_rate),
      dormant_value: averageInRange(dormantValueTrendYoy, comparisonPeriodStart, comparisonDate, (r) => r.value),
      reactivation_rate: averageInRange(dormantYoy.trend, comparisonPeriodStart, comparisonDate, (r) => r.reactivation_rate),
    }

    const metrics: MetricCard[] = [
      buildCard(
        'cross_selling_ratio', 'Cross Selling Ratio',
        'Customer beli >1 kategori / Total customer aktif', '/cross-selling',
        // 'line' — samakan dgn ComboChartWidget di CrossSelling/index.tsx,
        // seri "ratio" (metrik ini persis) dirender sbg LINE di sana, bukan
        // bar (koreksi user 2026-08-09: "chart di dashboard jenisnya sama
        // kan dengan chart di halaman masing-masing KPI").
        'percent', 'line',
        cross.trend.map((r) => ({ month: r.month, value: r.ratio })),
        current.cross_selling_ratio,
        yoy.cross_selling_ratio,
        // Angka exact dari cross.kpi1 (SAMA persis dgn yang dipakai halaman
        // CrossSelling) - task026 §9 lanjutan.
        { numerator: cross.kpi1.multi_cat_count, denominator: cross.kpi1.active_count },
      ),
      buildCard(
        // Link per-KPI (task025 §14, 2026-08-07) — CrossSelling bundle KPI1+KPI2
        // dipecah jadi 2 halaman, card KPI2 sekarang mengarah ke halaman
        // spesifik-nya (sebelumnya sama-sama ke '/cross-selling').
        'avg_category', 'Rata-rata Kategori Produk',
        'Rata-rata kategori unik per customer aktif', '/avg-category-per-customer',
        'number', 'area',
        cross.trend.map((r) => ({ month: r.month, value: r.avg_category })),
        current.avg_category,
        yoy.avg_category,
        { totalCategories: cross.kpi2.total_distinct_cats, activeCustomers: cross.kpi1.active_count },
      ),
      // Link per-KPI (task025 §12, 2026-08-07) — CustomerMetrics bundle M3-M7
      // dipecah jadi 5 halaman; sebelumnya ke-5 card ini SEMUA mengarah ke
      // '/customer-metrics' (route lama, masih redirect statis ke
      // /customer-revenue di App.tsx tapi bukan halaman spesifik KPI-nya) —
      // ditemukan sbg bug terkait saat memperbaiki link avg_category di atas.
      buildCard(
        'avg_revenue', 'Rata-rata Revenue',
        'Revenue per existing customer di periode ini', '/customer-revenue',
        'currency', 'bar',
        customer.trend.map((r) => ({ month: r.month, value: r.avg_revenue })),
        current.avg_revenue,
        yoy.avg_revenue,
      ),
      buildCard(
        'avg_gross_profit', 'Rata-rata Gross Profit',
        'Gross profit per existing customer', '/customer-gross-profit',
        'currency', 'stacked-bar',
        // 3 tier (Atas/Tengah/Bawah) per bulan (task026 §9 lanjutan) - sama
        // dgn field yang dipakai CustomerGrossProfit/index.tsx, biar mini-
        // chart Overview konsisten dgn breakdown di halaman detailnya.
        customer.trend.map((r) => ({ month: r.month, value: r.avg_gross_profit, tier1: r.gp_tier1, tier2: r.gp_tier2, tier3: r.gp_tier3 })),
        current.avg_gross_profit,
        yoy.avg_gross_profit,
        { topTierGp: customer.trend.at(-1)?.gp_tier1 ?? 0, midTierGp: customer.trend.at(-1)?.gp_tier2 ?? 0 },
      ),
      buildCard(
        'high_margin_penetration', 'High Margin Penetration',
        'Existing customer beli produk high margin', '/high-margin-penetration',
        'percent', 'line',
        customer.trend.map((r) => ({ month: r.month, value: r.high_margin_ratio })),
        current.high_margin_penetration,
        yoy.high_margin_penetration,
      ),
      buildCard(
        'repeat_order_rate', 'Repeat Order Rate',
        'Existing customer yang bertransaksi ulang', '/repeat-order',
        // 'line' — samakan dgn M6RepeatOrder.tsx (LineChartWidget tren 12
        // bulan seri "rate"), bukan bar. RadialBarWidget (gauge snapshot)
        // di halaman yang sama TIDAK direplikasi di sini — bentuknya gauge
        // 1-nilai, tidak cocok jadi sparkline 12-titik.
        'percent', 'line',
        customer.trend.map((r) => ({ month: r.month, value: r.repeat_order_rate })),
        current.repeat_order_rate,
        yoy.repeat_order_rate,
      ),
      buildCard(
        'expansion_rate', 'Customer Expansion Rate',
        'Customer dengan spending naik vs bulan lalu', '/customer-expansion',
        // 'bar' — samakan dgn M7Expansion.tsx (BarChartWidget seri
        // "up_rate"), bukan line.
        'percent', 'bar',
        customer.trend.map((r) => ({ month: r.month, value: r.expansion_rate })),
        current.expansion_rate,
        yoy.expansion_rate,
      ),
      buildCard(
        // Link per-KPI (task025 §7a, 2026-08-07) — DormantCustomer bundle
        // dipecah jadi 3 halaman, tiap card sekarang mengarah ke halaman
        // spesifik-nya (sebelumnya ketiganya sama-sama ke '/dormant-customer').
        'dormant_rate', 'Dormant Customer Rate',
        'Existing customer tidak aktif', '/dormant-rate',
        'percent', 'line',
        dormant.trend.map((r) => ({ month: r.month, value: r.dormant_rate })),
        current.dormant_rate,
        yoy.dormant_rate,
        { dormantCount: dormant.dormant_rate_current.dormant_count, totalCustomers: dormant.dormant_rate_current.total_customers },
      ),
      buildCard(
        'dormant_value', 'Dormant Customer Value',
        'Estimasi potensi omset hilang dari customer dormant', '/dormant-value',
        'currency', 'bar',
        dormantValueTrend,
        current.dormant_value,
        yoy.dormant_value,
        { dormantCount: dormant.dormant_rate_current.dormant_count },
      ),
      buildCard(
        'reactivation_rate', 'Customer Reactivation Rate',
        'Customer dormant yang kembali aktif bulan ini', '/reactivation-rate',
        // 'line' — samakan dgn LineAlertWidget tren di ReactivationRate/
        // index.tsx, bukan bar. BulletChartWidget (gauge snapshot) di
        // halaman yang sama TIDAK direplikasi (gauge 1-nilai, bukan seri
        // 12-titik).
        'percent', 'line',
        dormant.trend.map((r) => ({ month: r.month, value: r.reactivation_rate })),
        current.reactivation_rate,
        yoy.reactivation_rate,
        // reactivated_count/prev_dormant_count PER BULAN dari DormantTrendRow
        // (SAMA field dgn yang dipakai halaman ReactivationRate) - task026 §9.
        { reactivatedCount: dormant.trend.at(-1)?.reactivated_count ?? 0, priorDormantCount: dormant.trend.at(-1)?.prev_dormant_count ?? 0 },
      ),
    ]

    const periodMonth = cross.trend.at(-1)?.month ?? filterDate.slice(0, 7)
    const comparisonPeriodMonth = crossYoy.trend.at(-1)?.month ?? comparisonDate.slice(0, 7)

    // `has_data` — dipakai frontend utk suppress alert banner (2026-08-09,
    // task026 §9 lanjutan): ditemukan lewat screenshot user, company yang
    // BELUM PUNYA customer/invoice sama sekali (mis. PT SKI, 0 invoice)
    // tetap memicu alert "di bawah target" krn 0% < target manapun -
    // matematis benar tapi menyesatkan (bukan performa jelek, tapi memang
    // belum ada data). `dormant_rate_current.total_customers` dipakai sbg
    // sinyal "ada basis customer sama sekali atau tidak" - kalau 0, SEMUA
    // 3 alert (yg semuanya customer-rate-based) disuppress.
    const hasData = dormant.dormant_rate_current.total_customers > 0

    return {
      period_month: periodMonth,
      comparison_period_month: comparisonPeriodMonth,
      has_data: hasData,
      active_window: thresholds.activeMonths,
      thresholds: {
        repeat_order_target_pct: thresholds.repeatOrderTargetPct,
        dormant_rate_alert_pct: thresholds.dormantRateAlertPct,
        reactivation_target_low_pct: thresholds.reactivationTargetLow,
        reactivation_target_high_pct: thresholds.reactivationTargetHigh,
      },
      metrics,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data dashboard', 500)
  }
}
