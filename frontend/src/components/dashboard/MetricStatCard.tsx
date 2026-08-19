import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { StatCard } from '@/components/charts/StatCard'
import type { MetricCard } from '@/types/dashboard'
import { METRIC_COLOR_KEY, metricTitle, metricSubtitle, formatMetricValue } from './metricFormat'

// Kartu ringkas 1 KPI — dipusatkan supaya Dashboard/Overview dan halaman
// Growth/Retention/Value (task029) tidak duplikat kode StatCard yang sama.
export function MetricStatCard({ metric }: { metric: MetricCard }) {
  const theme = useTheme()
  const { t } = useTranslation()

  return (
    <StatCard
      title={metricTitle(metric, t)}
      subtitle={metricSubtitle(metric, t)}
      value={formatMetricValue(metric)}
      change={metric.summary.change_percent}
      trend={metric.summary.trend}
      data={metric.monthly_trend}
      color={theme.palette[METRIC_COLOR_KEY[metric.metric_key] ?? 'primary'].main}
      link={metric.link}
    />
  )
}
