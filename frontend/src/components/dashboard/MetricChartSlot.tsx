import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { MetricCard } from '@/types/dashboard'
import { ChartSkeleton } from './ChartSkeleton'
import { ClickableChart } from './ClickableChart'
import { renderMetricWidget, METRIC_CHART_SKELETON_HEIGHT } from './renderMetricWidget'

// `metricKey` dipisah dari `metric` (bisa undefined saat masih loading atau
// data metric_key itu tidak ada di response) supaya skeleton tetap tahu
// tinggi chart yang benar walau datanya belum datang.
export function MetricChartSlot({
  metricKey,
  metric,
  isLoading,
}: {
  metricKey: string
  metric: MetricCard | undefined
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const theme = useTheme()

  if (isLoading) return <ChartSkeleton height={METRIC_CHART_SKELETON_HEIGHT[metricKey]} />
  if (!metric) return null

  return (
    <ClickableChart link={metric.link}>
      {renderMetricWidget(metric, t, theme)}
    </ClickableChart>
  )
}
