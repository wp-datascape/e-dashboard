import type { TFunction } from 'i18next'
import type { MetricCard } from '@/types/dashboard'

// Dipusatkan di sini (bukan duplikat per halaman) — dipakai bareng oleh
// Dashboard/Overview DAN 3 halaman Growth/Retention/Value (task029). Kalau
// nambah metric_key baru dari backend, cukup nambah entry di sini, semua
// halaman ikut update otomatis.

export const METRIC_LABEL_KEYS: Record<string, { title: string; desc: string }> = {
  cross_selling_ratio: { title: 'metrics.crossSelling', desc: 'metrics.crossSellingDesc' },
  avg_category: { title: 'metrics.avgCategory', desc: 'metrics.avgCategoryDesc' },
  avg_revenue: { title: 'metrics.avgRevenue', desc: 'metrics.avgRevenueDesc' },
  avg_gross_profit: { title: 'metrics.avgGrossProfit', desc: 'metrics.avgGrossProfitDesc' },
  high_margin_penetration: { title: 'metrics.highMargin', desc: 'metrics.highMarginDesc' },
  repeat_order_rate: { title: 'metrics.repeatOrder', desc: 'metrics.repeatOrderDesc' },
  expansion_rate: { title: 'metrics.expansion', desc: 'metrics.expansionDesc' },
  dormant_rate: { title: 'metrics.dormantRate', desc: 'metrics.dormantRateDesc' },
  dormant_value: { title: 'metrics.dormantValue', desc: 'metrics.dormantValueDesc' },
  reactivation_rate: { title: 'metrics.reactivation', desc: 'metrics.reactivationDesc' },
}

// Pengganti `metric.color` (dihapus dari backend, task029) — dipetakan ke
// key palet tema, dipilih sedekat mungkin dgn hex lama tiap metric_key.
export const METRIC_COLOR_KEY: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'> = {
  cross_selling_ratio: 'primary',
  avg_category: 'secondary',
  avg_revenue: 'success',
  avg_gross_profit: 'info',
  high_margin_penetration: 'warning',
  repeat_order_rate: 'primary',
  expansion_rate: 'success',
  dormant_rate: 'error',
  dormant_value: 'warning',
  reactivation_rate: 'secondary',
}

export function metricTitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key]
  return keys ? t(keys.title) : card.title
}

export function metricSubtitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key]
  return keys ? t(keys.desc) : card.subtitle
}

export function formatMetricValue(card: MetricCard): string {
  const v = card.summary.current_value
  if (card.format === 'percent') return `${v.toFixed(1)}%`
  if (card.format === 'currency') {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
    return `Rp ${v.toLocaleString('id-ID')}`
  }
  return v % 1 === 0 ? v.toString() : v.toFixed(2)
}
