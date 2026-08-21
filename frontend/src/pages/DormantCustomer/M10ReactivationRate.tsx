import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useTranslation } from 'react-i18next';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { formatMonthLabel } from '@/utils/date';
import type { DormantData } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';

// M10 (Customer Reactivation Rate, task029.md §15). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
}

export function M10ReactivationRate({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const rc = data?.reactivation_current;
  const targetLow = rc?.target_low ?? 15;
  const targetHigh = rc?.target_high ?? 20;
  const bulletMax = Math.max(targetHigh * 2, 30);

  return (
    <Box>
      <SectionLabel label={t('dormantCustomer.m10SectionLabel')} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={220} />
          ) : (
            <BulletChartWidget
              title={t('dormantCustomer.m10ChartTitle')}
              subtitle={t('dormantCustomer.m10ChartSubtitle', { targetLow, targetHigh })}
              value={rc?.value ?? 0}
              targetLow={targetLow}
              targetHigh={targetHigh}
              max={bulletMax}
              unit="%"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={220} />
          ) : (
            <LineAlertWidget
              title={t('dormantCustomer.m10TrendTitle')}
              subtitle={t('dormantCustomer.m10TrendSubtitle', { targetLow, targetHigh })}
              data={data?.trend ?? []}
              lineKey="reactivation_rate"
              lineLabel={t('dormantCustomer.lineLabelReactivationRate')}
              xKey="month"
              threshold={targetLow}
              thresholdLabel={t('dormantCustomer.targetMinLabel', { targetLow })}
              height={180}
              xAxisFormatter={formatMonthLabel}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
