import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { DatePicker } from '@/components/ui/DatePicker';

// helpers from CustomerMetrics — inline agar tidak perlu import cross-page
function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Typography>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DormantCustomer() {
  const theme = useTheme();
  const { t } = useTranslation();

  const [periodEnd,  setPeriodEnd]  = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division } = scopeFilter;

  const { data, isLoading } = useDormantCustomer({
    company_id:  companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
  });

  const drc = data?.dormant_rate_current;
  const rc  = data?.reactivation_current;

  // Thresholds dari backend — fallback ke nilai default selama loading
  const alertPct     = drc?.alert_pct     ?? 10;
  const targetLow    = rc?.target_low     ?? 15;
  const targetHigh   = rc?.target_high    ?? 20;
  const bulletMax    = Math.max(targetHigh * 2, 30);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="pageTitle">
            {t('dormantCustomer.pageTitle')}
          </Typography>
          <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
            {t('dormantCustomer.pageSubtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('common.filters.periodDate')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          />
        </Box>
      </Box>

      {/* ── M8: Line Chart + Red Alert Shading — Dormant Customer Rate ── */}
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

      {/* ── M9: Horizontal Bar Ranking — Dormant Customer Value ── */}
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

      {/* ── M10: Bullet Chart — Customer Reactivation Rate ── */}
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
              />
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
