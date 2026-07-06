import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { SectionLabel } from './HelperComponents';

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
}

export function M7Expansion({ trend, isLoading }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <SectionLabel label={t('customerMetrics.m7.sectionLabel')} />
      {isLoading ? (
        <Skeleton variant="rectangular" height={340} />
      ) : (
        <BarChartWidget
          title={t('customerMetrics.m7.chartTitle')}
          subtitle={t('customerMetrics.m7.chartSubtitle')}
          data={trend.map((point) => ({
            month:          point.month,
            up_rate:        point.up_rate,
            flat_down_rate: point.flat_down_rate,
          }))}
          series={[
            { key: 'up_rate',        label: t('customerMetrics.m7.seriesUp'), color: theme.palette.success.main },
            { key: 'flat_down_rate', label: t('customerMetrics.m7.seriesFlatDown'),  color: theme.palette.action.disabledBackground, labelColor: theme.palette.text.primary },
          ]}
          xKey="month"
          height={320}
          stacked
          layout="horizontal"
          showLabels
          labelFormatter={(v) => `${v.toFixed(1)}%`}
          tooltipFormatter={(v, n) => [`${v.toFixed(1)}%`, n]}
        />
      )}
    </>
  );
}
