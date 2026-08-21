import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTranslation } from 'react-i18next';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { formatMonthLabel } from '@/utils/date';
import type { DormantData } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';

// M8 (Dormant Customer Rate, task029.md §13). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
}

export function M8DormantRate({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const drc = data?.dormant_rate_current;
  const alertPct = drc?.alert_pct ?? 10;

  return (
    <Box>
      <SectionLabel label={t('dormantCustomer.m8SectionLabel')} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : (
            <LineAlertWidget
              title={t('dormantCustomer.m8ChartTitle')}
              subtitle={t('dormantCustomer.m8ChartSubtitle', { alertPct })}
              data={data?.trend ?? []}
              lineKey="dormant_rate"
              lineLabel={t('dormantCustomer.lineLabelDormantRate')}
              xKey="month"
              threshold={alertPct}
              thresholdLabel={t('dormantCustomer.thresholdLabelPct', { alertPct })}
              height={240}
              xAxisFormatter={formatMonthLabel}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('dormantCustomer.dormantRateCurrentLabel')}
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: (drc?.value ?? 0) > alertPct ? 'error.main' : 'success.main',
                  lineHeight: 1,
                  mt: 0.5,
                }}
              >
                {drc?.value ?? '–'}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {(drc?.value ?? 0) > alertPct
                  ? t('dormantCustomer.aboveAlert', { alertPct })
                  : t('dormantCustomer.belowAlert', { alertPct })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('dormantCustomer.dormantCountLabel')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, mt: 0.25 }}>
                {t('dormantCustomer.customerCountValue', { count: drc?.dormant_count ?? '–' })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('dormantCustomer.totalCustomerLabel')}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1, mt: 0.25 }}>
                {t('dormantCustomer.customerCountValue', { count: drc?.total_customers ?? '–' })}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
