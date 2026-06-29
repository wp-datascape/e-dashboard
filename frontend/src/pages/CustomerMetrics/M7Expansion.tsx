import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { SectionLabel } from './helpers';

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
}

export function M7Expansion({ trend, isLoading }: Props) {
  const theme = useTheme();

  return (
    <>
      <SectionLabel label="M7 · Customer Expansion Rate — Spending Naik vs Flat/Turun" />
      {isLoading ? (
        <Skeleton variant="rectangular" height={340} />
      ) : (
        <BarChartWidget
          title="Customer Expansion Rate — 100% Stacked Horizontal (12 Bulan)"
          subtitle="Setiap baris = 1 bulan · Hijau = % spending naik vs 30 hari sebelumnya · Abu-abu = % flat/turun"
          data={trend.map((t) => ({
            month:          t.month,
            up_rate:        t.up_rate,
            flat_down_rate: t.flat_down_rate,
          }))}
          series={[
            { key: 'up_rate',        label: 'Spending Naik (%)', color: theme.palette.success.main },
            { key: 'flat_down_rate', label: 'Flat / Turun (%)',  color: theme.palette.action.disabledBackground, labelColor: theme.palette.text.primary },
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
