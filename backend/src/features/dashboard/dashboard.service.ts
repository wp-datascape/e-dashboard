import { AppError, ErrorCode } from '@/utils/error'
import { getCrossSellingMetrics, getCustomerMetrics, getDormantCustomerMetrics, resolveSegmentParams } from '@/features/metrics/metrics.service'
import type { MetricsScope } from '@/features/metrics/metrics.service'
import { loadThresholds } from '@/features/config/threshold'
import { fetchDormantValueTrend } from './dashboard.repository'
import type { DashboardData, MetricCard, MetricSummary, MonthlyTrendPoint } from './dashboard.types'
import type { DashboardQuery } from './dashboard.schema'

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function buildSummary(current: number, previous: number): MetricSummary {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  return {
    current_value: current,
    previous_value: previous,
    change_percent: parseFloat(change.toFixed(1)),
    trend: current > previous ? 'up' : current < previous ? 'down' : 'stable',
  }
}

function buildCard(
  metric_key: string,
  title: string,
  subtitle: string,
  link: string,
  format: 'percent' | 'number' | 'currency',
  color: string,
  trend: MonthlyTrendPoint[],
): MetricCard {
  const current = trend.at(-1)?.value ?? 0
  const previous = trend.at(-2)?.value ?? 0
  return {
    metric_key,
    title,
    subtitle,
    link,
    format,
    color,
    summary: buildSummary(current, previous),
    monthly_trend: trend,
  }
}

export async function getDashboard(
  scope: MetricsScope = {},
  companyId: number | 'all' = 'all',
  branchId?: number,
  division?: DashboardQuery['division'],
  periodEnd?: string,
  excludeIntercompany?: boolean,
): Promise<DashboardData> {
  try {
    const filterDate = periodEnd ?? todayDate()
    const excludeIC = excludeIntercompany ?? false

    const [cross, customer, dormant, thresholds, segParams] = await Promise.all([
      getCrossSellingMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getCustomerMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      getDormantCustomerMetrics({ company_id: companyId, period_end: filterDate, division, branch_id: branchId, exclude_intercompany: excludeIC }, scope),
      loadThresholds(),
      resolveSegmentParams(companyId, filterDate, division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, branchId, excludeIC),
    ])

    const dormantValueTrend = await fetchDormantValueTrend(segParams)

    const metrics: MetricCard[] = [
      buildCard(
        'cross_selling_ratio', 'Cross Selling Ratio',
        'Customer beli >1 kategori / Total customer aktif', '/cross-selling',
        'percent', '#3B82F6',
        cross.trend.map((r) => ({ month: r.month, value: r.ratio })),
      ),
      buildCard(
        'avg_category', 'Rata-rata Kategori Produk',
        'Rata-rata kategori unik per customer aktif', '/cross-selling',
        'number', '#8B5CF6',
        cross.trend.map((r) => ({ month: r.month, value: r.avg_category })),
      ),
      buildCard(
        'avg_revenue', 'Rata-rata Revenue',
        'Revenue per existing customer di periode ini', '/customer-metrics',
        'currency', '#10B981',
        customer.trend.map((r) => ({ month: r.month, value: r.avg_revenue })),
      ),
      buildCard(
        'avg_gross_profit', 'Rata-rata Gross Profit',
        'Gross profit per existing customer', '/customer-metrics',
        'currency', '#06B6D4',
        customer.trend.map((r) => ({ month: r.month, value: r.avg_gross_profit })),
      ),
      buildCard(
        'high_margin_penetration', 'High Margin Penetration',
        'Existing customer beli produk high margin', '/customer-metrics',
        'percent', '#F59E0B',
        customer.trend.map((r) => ({ month: r.month, value: r.high_margin_ratio })),
      ),
      buildCard(
        'repeat_order_rate', 'Repeat Order Rate',
        'Existing customer yang bertransaksi ulang', '/customer-metrics',
        'percent', '#3B82F6',
        customer.trend.map((r) => ({ month: r.month, value: r.repeat_order_rate })),
      ),
      buildCard(
        'expansion_rate', 'Customer Expansion Rate',
        'Customer dengan spending naik vs bulan lalu', '/customer-metrics',
        'percent', '#10B981',
        customer.trend.map((r) => ({ month: r.month, value: r.expansion_rate })),
      ),
      buildCard(
        // Link per-KPI (task025 §7a, 2026-08-07) — DormantCustomer bundle
        // dipecah jadi 3 halaman, tiap card sekarang mengarah ke halaman
        // spesifik-nya (sebelumnya ketiganya sama-sama ke '/dormant-customer').
        'dormant_rate', 'Dormant Customer Rate',
        'Existing customer tidak aktif', '/dormant-rate',
        'percent', '#EF4444',
        dormant.trend.map((r) => ({ month: r.month, value: r.dormant_rate })),
      ),
      buildCard(
        'dormant_value', 'Dormant Customer Value',
        'Estimasi potensi omset hilang dari customer dormant', '/dormant-value',
        'currency', '#F97316',
        dormantValueTrend,
      ),
      buildCard(
        'reactivation_rate', 'Customer Reactivation Rate',
        'Customer dormant yang kembali aktif bulan ini', '/reactivation-rate',
        'percent', '#8B5CF6',
        dormant.trend.map((r) => ({ month: r.month, value: r.reactivation_rate })),
      ),
    ]

    const periodMonth = cross.trend.at(-1)?.month ?? filterDate.slice(0, 7)

    return {
      period_month: periodMonth,
      active_window: thresholds.activeMonths,
      metrics,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data dashboard', 500)
  }
}
