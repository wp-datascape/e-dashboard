import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import type { Theme } from '@mui/material/styles'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { DonutChartWidget } from '@/components/charts/DonutChartWidget'
import { RadialBarWidget } from '@/components/charts/RadialBarWidget'
import { LineAlertWidget } from '@/components/charts/LineAlertWidget'
import { BulletChartWidget } from '@/components/charts/BulletChartWidget'
import type { MetricCard } from '@/types/dashboard'
import { METRIC_COLOR_KEY, metricTitle, metricSubtitle, formatMetricValue } from './metricFormat'
import { formatMonthLabel } from '@/utils/date'
import { formatIDR } from '@/utils/format'

// Pemetaan tipe chart per metric_key — dipusatkan di sini (task029) supaya
// Dashboard/Overview dan halaman Growth/Retention/Value (masing-masing
// 1 menu, 1 halaman, dikelompokkan sesuai task029.md §2) pakai widget yang
// sama persis, bukan reimplementasi per halaman. M3/M4/M9 pakai
// AreaChartWidget (konsisten dgn M2) — BUKAN ComboChartWidget yang dipakai
// di halaman detail lama /customer-metrics (M3Revenue.tsx), karena itu
// butuh 2 series bar+line terpisah yang tidak tersedia di monthly_trend
// (cuma 1 field `value` per bulan).
export function renderMetricWidget(metric: MetricCard, t: TFunction, theme: Theme): ReactNode {
  const color = (key: string) => theme.palette[METRIC_COLOR_KEY[key] ?? 'primary'].main

  switch (metric.metric_key) {
    case 'cross_selling_ratio':
      return (
        <BarChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.crossSellingRatioLabel'), color: color('cross_selling_ratio') }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
          tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
        />
      )

    case 'avg_category':
      return (
        <AreaChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
        />
      )

    case 'expansion_rate':
      return (
        <BarChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.expansionRateLabel'), color: theme.palette.success.main }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
          tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
        />
      )

    case 'repeat_order_rate':
      return (
        <RadialBarWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={parseFloat(metric.summary.current_value.toFixed(1))}
          thresholdGreen={80}
          height={200}
        />
      )

    case 'dormant_rate':
      return (
        <LineAlertWidget
          title={metricTitle(metric, t)}
          subtitle={t('dashboard.charts.dormantSubtitle')}
          data={metric.monthly_trend}
          lineKey="value"
          lineLabel={t('dashboard.charts.dormantRateLabel')}
          xKey="month"
          threshold={10}
          thresholdLabel={t('dashboard.charts.dormantThresholdLabel')}
          height={180}
          xAxisFormatter={formatMonthLabel}
        />
      )

    case 'dormant_value':
      return (
        <AreaChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.dormantValueLabel'), color: color('dormant_value') }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
          yAxisFormatter={formatIDR}
        />
      )

    case 'reactivation_rate':
      return (
        <BulletChartWidget
          title={metricTitle(metric, t)}
          subtitle={t('dashboard.charts.reactivationSubtitle')}
          value={parseFloat(metric.summary.current_value.toFixed(1))}
          targetLow={15}
          targetHigh={20}
          max={30}
          unit="%"
        />
      )

    case 'avg_revenue':
      return (
        <AreaChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.avgRevenueLabel'), color: color('avg_revenue') }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
          yAxisFormatter={formatIDR}
        />
      )

    case 'avg_gross_profit':
      return (
        <AreaChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          value={formatMetricValue(metric)}
          change={metric.summary.change_percent}
          data={metric.monthly_trend}
          series={[{ key: 'value', label: t('dashboard.charts.avgGrossProfitLabel'), color: color('avg_gross_profit') }]}
          xKey="month"
          height={180}
          xAxisFormatter={formatMonthLabel}
          yAxisFormatter={formatIDR}
        />
      )

    case 'high_margin_penetration':
      return (
        <DonutChartWidget
          title={metricTitle(metric, t)}
          subtitle={metricSubtitle(metric, t)}
          data={[
            { name: t('dashboard.charts.highMarginBought'), value: parseFloat(metric.summary.current_value.toFixed(1)), color: theme.palette.warning.main },
            { name: t('dashboard.charts.highMarginNotBought'), value: parseFloat((100 - metric.summary.current_value).toFixed(1)), color: theme.palette.action.hover },
          ]}
          centerValue={formatMetricValue(metric)}
          centerLabel={t('dashboard.charts.highMarginCenterLabel')}
          height={200}
        />
      )

    default:
      return null
  }
}

// Tinggi ChartSkeleton per metric_key saat loading — biar tidak "loncat"
// pas data datang (skeleton match tinggi widget asli). Default (undefined)
// dipakai kalau tidak dicantumkan di sini.
export const METRIC_CHART_SKELETON_HEIGHT: Record<string, number> = {
  repeat_order_rate: 260,
  reactivation_rate: 260,
  high_margin_penetration: 260,
}
