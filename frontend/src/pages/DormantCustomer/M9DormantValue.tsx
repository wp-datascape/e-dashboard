import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import type { DormantData } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';
import { fmtRp } from './helpers';

// M9 (Dormant Customer Value, task029.md §14). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
}

export function M9DormantValue({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box>
      <SectionLabel label={t('dormantCustomer.m9SectionLabel')} />
      {isLoading ? (
        <Skeleton variant="rectangular" height={340} />
      ) : (
        <BarChartWidget
          title={t('dormantCustomer.m9ChartTitle')}
          subtitle={t('dormantCustomer.m9ChartSubtitle')}
          data={data?.value_ranking ?? []}
          series={[
            {
              key: 'estimated_lost_value',
              label: t('dormantCustomer.m9SeriesLabel'),
              color: theme.palette.error.main,
            },
          ]}
          xKey="customer_name"
          height={520}
          layout="horizontal"
          yAxisWidth={200}
          showLabels
          mobileNameInBar
          labelFormatter={(v) => fmtRp(v)}
          yAxisFormatter={(v) => fmtRp(v)}
          tooltipFormatter={(v, n) => [fmtRp(v), n]}
        />
      )}
    </Box>
  );
}
