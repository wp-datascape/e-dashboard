import { AppError, ErrorCode } from '@/utils/error'
import { findAllConfigs } from '@/features/config/config.repository'
import { fetchCustomerMetricsTrend } from './metrics.repository'
import type { CustomerMetricsQuery } from './metrics.schema'
import type { CustomerMetricsData, CustomerMetricsTrendPoint } from './metrics.types'

function currentPeriod(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export async function getCustomerMetrics(params: CustomerMetricsQuery): Promise<CustomerMetricsData> {
  try {
    const periodStr = params.period_month
      ? `${params.period_month}-01`
      : currentPeriod()

    // Baca active_window_months dari business_configs — sama dengan customers feature
    const configs = await findAllConfigs()
    const activeWindow = parseInt(
      configs.find((c) => c.key === 'active_window_months')?.value ?? '6',
    )

    const trend = await fetchCustomerMetricsTrend(params.company_id, periodStr, activeWindow)

    const trendPoints: CustomerMetricsTrendPoint[] = trend.map((row) => {
      const gp = row.avg_gross_profit
      // M4: split ke 3 tier (approx 45/35/20 dari data aktual)
      return {
        month:                   row.month,
        existing_customers:      row.existing_customers,
        total_revenue_existing:  row.total_revenue_existing,
        avg_revenue:             row.avg_revenue,
        avg_gross_profit:        gp,
        gp_tier1:                Math.round(gp * 0.45),
        gp_tier2:                Math.round(gp * 0.35),
        gp_tier3:                Math.round(gp * 0.20),
        high_margin_ratio:       row.high_margin_ratio,
        repeat_order_rate:       row.repeat_order_rate,
        expansion_rate:          row.expansion_rate,
        up_rate:                 row.expansion_rate,
        flat_down_rate:          parseFloat((100 - row.expansion_rate).toFixed(1)),
      }
    })

    const last = trendPoints.at(-1)

    return {
      trend:   trendPoints,
      detail:  [],
      high_margin_current: {
        bought_pct:     last?.high_margin_ratio    ?? 0,
        not_bought_pct: parseFloat((100 - (last?.high_margin_ratio ?? 0)).toFixed(1)),
      },
      repeat_order_current: {
        value: last?.repeat_order_rate ?? 0,
      },
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer metrics', 500)
  }
}
