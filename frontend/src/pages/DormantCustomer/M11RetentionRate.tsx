import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { Card } from '@/components/ui';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { formatRupiah } from '@/utils/format';
import { formatPeriodLabel, formatPeriodLabelShort } from '@/utils/analisisPeriod';
import type { RetentionData } from '@/types/metrics';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from '../CustomerMetrics/HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';

// M11 Retention Rate (task044.md Bagian 2, HOLDINGIT-698, 2026-09-16) — KPI
// BARU, layout mengikuti standar M1/M6/M8/M10 (3 kartu + 1 chart trend + Top
// 5), TANPA dialog drilldown per-customer (belum ada endpoint breakdown
// terpisah - di luar cakupan task044.md, cuma "3 kartu + chart + Top 5").
//
// Formula: Retention Rate = COUNT(customer Active/Reactivated di checkpoint
// SEBELUMNYA yang JUGA Active/Reactivated di checkpoint ini) / COUNT(customer
// Active/Reactivated di checkpoint SEBELUMNYA) x 100. Populasi TIDAK punya
// target/ambang resmi (beda dari M8/M10 yang punya threshold) - chart pakai
// AreaChartWidget polos (tanpa ReferenceLine threshold), bukan LineAlertWidget.
interface Props {
  data: RetentionData | undefined;
  isLoading: boolean;
  periodType?: PeriodGranularity;
}

export function M11RetentionRate({ data, isLoading, periodType = 'monthly' }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const rc = data?.retention_current;
  const last = data?.trend.at(-1);

  const periodKey = last?.month ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';

  // Top 5 (task044.md - "Top 5 customer bernilai tertinggi yang TERTAHAN") —
  // REUSE data.top_retained_customers (SUDAH di-fetch bareng data utama,
  // backend urut avg_monthly_revenue DESC), pola sama M8/M9/M10.
  const top5Items: TopMoverItem[] = (data?.top_retained_customers ?? []).slice(0, 5).map((r) => ({
    id: r.customer_id,
    name: r.customer_name,
    metricText: formatRupiah(r.avg_monthly_revenue),
    icon: CheckCircleIcon,
    iconColor: theme.palette.success.main,
  }));

  return (
    <>
      {/* 3 kartu ringkasan (task044.md - "3 kartu: Retention Rate / Customer
          Tertahan / Customer Hilang"), pola SAMA PERSIS M6/M8/M10. */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m11RetentionRateLabel')}
              value={`${rc?.value ?? 0}%`}
              sub={currentPeriodLabel}
              color={theme.palette.success.main}
              info={t('dormantCustomer.m11RetentionRateInfo')}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m11RetainedCountLabel')}
              value={(rc?.retained_count ?? 0).toLocaleString('id-ID')}
              sub={currentPeriodLabel}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m11LostCountLabel')}
              value={(rc?.lost_count ?? 0).toLocaleString('id-ID')}
              sub={currentPeriodLabel}
              color={theme.palette.error.main}
              info={t('dormantCustomer.m11LostCountInfo')}
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('dormantCustomer.m11ChartTitle')} icon={GroupsIcon} />
            <MuiTooltip
              title={t('dormantCustomer.m11TooltipInfo')}
              placement="top"
              arrow
              slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
            >
              <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={280} />
              ) : (
                <AreaChartWidget
                  value={`${rc?.value ?? 0}%`}
                  subtitle={currentPeriodLabel}
                  data={data?.trend ?? []}
                  series={[{ key: 'retention_rate', label: t('dormantCustomer.m11RetentionRateLabel'), color: theme.palette.success.main }]}
                  xKey="month"
                  height={280}
                  xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                  yAxisFormatter={(v) => `${v}%`}
                  tooltipFormatter={(value) => [`${value.toFixed(1)}%`, t('dormantCustomer.m11RetentionRateLabel')]}
                />
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('dormantCustomer.m11TopCustomersLabel')} />
                    <MuiTooltip
                      title={t('dormantCustomer.m11TopCustomersInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <TopMoversTimeline items={top5Items} emptyMessage={t('dormantCustomer.m11RetainedEmpty')} />
                </Box>
              )}
              {!isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/report/retention?tab=retention')}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    {t('dormantCustomer.viewDetailInReport')}
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Card>
    </>
  );
}
