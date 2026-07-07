import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Card } from '@/components/ui';

import { StatCard } from '@/components/charts/StatCard';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { useDashboard } from '@/hooks/useDashboard';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import type { MetricCard } from '@/types/dashboard';
import type { Division } from '@/types/customers';
import { StatCardSkeleton } from './components/StatCardSkeleton';
import { ChartSkeleton } from './components/ChartSkeleton';
import { PeriodStrip } from './components/PeriodStrip';
import { ClickableChart } from './components/ClickableChart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METRIC_LABEL_KEYS: Record<string, { title: string; desc: string }> = {
  cross_selling_ratio: { title: 'metrics.crossSelling', desc: 'metrics.crossSellingDesc' },
  avg_category: { title: 'metrics.avgCategory', desc: 'metrics.avgCategoryDesc' },
  avg_revenue: { title: 'metrics.avgRevenue', desc: 'metrics.avgRevenueDesc' },
  avg_gross_profit: { title: 'metrics.avgGrossProfit', desc: 'metrics.avgGrossProfitDesc' },
  high_margin_penetration: { title: 'metrics.highMargin', desc: 'metrics.highMarginDesc' },
  repeat_order_rate: { title: 'metrics.repeatOrder', desc: 'metrics.repeatOrderDesc' },
  expansion_rate: { title: 'metrics.expansion', desc: 'metrics.expansionDesc' },
  dormant_rate: { title: 'metrics.dormantRate', desc: 'metrics.dormantRateDesc' },
  dormant_value: { title: 'metrics.dormantValue', desc: 'metrics.dormantValueDesc' },
  reactivation_rate: { title: 'metrics.reactivation', desc: 'metrics.reactivationDesc' },
};

function metricTitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key];
  return keys ? t(keys.title) : card.title;
}

function metricSubtitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key];
  return keys ? t(keys.desc) : card.subtitle;
}

function formatMetricValue(card: MetricCard): string {
  const v = card.summary.current_value;
  if (card.format === 'percent') return `${v.toFixed(1)}%`;
  if (card.format === 'currency') {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
    return `Rp ${v.toLocaleString('id-ID')}`;
  }
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const theme = useTheme();
  const { t } = useTranslation();

  const {
    companies, showCompanyFilter,
    companyId: companyFilter, setCompanyId: setCompanyFilter,
    branchId: branchFilter, setBranchId: setBranchFilter, branchOptions, showBranchFilter,
    division: divisionFilter, setDivision: setDivisionFilter, divisionOptions,
  } = useScopedCompanyFilter();

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
  });

  const metrics = data?.metrics ?? [];

  const findMetric = (key: string) => metrics.find((x) => x.metric_key === key);

  const mCrossRatio      = findMetric('cross_selling_ratio');
  const mAvgCategory     = findMetric('avg_category');
  const mHighMargin      = findMetric('high_margin_penetration');
  const mRepeatOrder     = findMetric('repeat_order_rate');
  const mExpansion       = findMetric('expansion_rate');
  const mDormantRate     = findMetric('dormant_rate');
  const mReactivation    = findMetric('reactivation_rate');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('dashboard.overviewTitle')}
        </Typography>
        {!isLoading && data && (
          <PeriodStrip
            period={data.period_month}
            activeWindow={data.active_window}
          />
        )}
      </Box>

      {/* ── Filter Bar ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        {showCompanyFilter && (
          <TextField select size="small" label={t('common.company')} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} sx={{ minWidth: 180 }}>
            <MenuItem value="all">{t('common.all')}</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        )}
        {showBranchFilter && (
          <TextField select size="small" label={t('common.branch')} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} sx={{ minWidth: 160 }}>
            <MenuItem value="all">{t('common.all')}</MenuItem>
            {branchOptions.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        )}
        {companyFilter !== 'all' && (
          <TextField select size="small" label={t('customers.detail.division')} value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value as NonNullable<Division> | '')} sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {divisionOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {/* ── Row 1: 10 Metric Stat Cards ── */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <StatCardSkeleton />
              </Grid>
            ))
          : metrics.map((metric) => (
              <Grid
                key={metric.metric_key}
                size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}
              >
                <StatCard
                  title={metricTitle(metric, t)}
                  subtitle={metricSubtitle(metric, t)}
                  value={formatMetricValue(metric)}
                  change={metric.summary.change_percent}
                  trend={metric.summary.trend}
                  data={metric.monthly_trend}
                  color={metric.color}
                  link={metric.link}
                />
              </Grid>
            ))}
      </Grid>

      {/* ── Row 2: Chart Widgets ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mCrossRatio ? (
            <ClickableChart link={mCrossRatio.link}>
              <BarChartWidget
                title={metricTitle(mCrossRatio, t)}
                subtitle={metricSubtitle(mCrossRatio, t)}
                value={formatMetricValue(mCrossRatio)}
                change={mCrossRatio.summary.change_percent}
                data={mCrossRatio.monthly_trend}
                series={[{ key: 'value', label: t('dashboard.charts.crossSellingRatioLabel'), color: mCrossRatio.color }]}
                xKey="month"
                height={180}
                tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mAvgCategory ? (
            <ClickableChart link={mAvgCategory.link}>
              <AreaChartWidget
                title={metricTitle(mAvgCategory, t)}
                subtitle={metricSubtitle(mAvgCategory, t)}
                value={formatMetricValue(mAvgCategory)}
                change={mAvgCategory.summary.change_percent}
                data={mAvgCategory.monthly_trend}
                series={[{ key: 'value', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
                xKey="month"
                height={180}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mHighMargin ? (
            <ClickableChart link={mHighMargin.link}>
              <DonutChartWidget
                title={metricTitle(mHighMargin, t)}
                subtitle={metricSubtitle(mHighMargin, t)}
                data={[
                  { name: t('dashboard.charts.highMarginBought'), value: parseFloat(mHighMargin.summary.current_value.toFixed(1)), color: theme.palette.warning.main },
                  { name: t('dashboard.charts.highMarginNotBought'), value: parseFloat((100 - mHighMargin.summary.current_value).toFixed(1)), color: theme.palette.action.hover },
                ]}
                centerValue={formatMetricValue(mHighMargin)}
                centerLabel={t('dashboard.charts.highMarginCenterLabel')}
                height={200}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mRepeatOrder ? (
            <ClickableChart link={mRepeatOrder.link}>
              <RadialBarWidget
                title={metricTitle(mRepeatOrder, t)}
                subtitle={metricSubtitle(mRepeatOrder, t)}
                value={parseFloat(mRepeatOrder.summary.current_value.toFixed(1))}
                thresholdGreen={80}
                height={200}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mExpansion ? (
            <ClickableChart link={mExpansion.link}>
              <BarChartWidget
                title={metricTitle(mExpansion, t)}
                subtitle={metricSubtitle(mExpansion, t)}
                value={formatMetricValue(mExpansion)}
                change={mExpansion.summary.change_percent}
                data={mExpansion.monthly_trend}
                series={[{ key: 'value', label: t('dashboard.charts.expansionRateLabel'), color: theme.palette.success.main }]}
                xKey="month"
                height={200}
                tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mDormantRate ? (
            <ClickableChart link={mDormantRate.link}>
              <LineAlertWidget
                title={metricTitle(mDormantRate, t)}
                subtitle={t('dashboard.charts.dormantSubtitle')}
                data={mDormantRate.monthly_trend}
                lineKey="value"
                lineLabel={t('dashboard.charts.dormantRateLabel')}
                xKey="month"
                threshold={10}
                thresholdLabel={t('dashboard.charts.dormantThresholdLabel')}
                height={180}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mReactivation ? (
            <ClickableChart link={mReactivation.link}>
              <BulletChartWidget
                title={metricTitle(mReactivation, t)}
                subtitle={t('dashboard.charts.reactivationSubtitle')}
                value={parseFloat(mReactivation.summary.current_value.toFixed(1))}
                targetLow={15}
                targetHigh={20}
                max={30}
                unit="%"
              />
            </ClickableChart>
          ) : null}
        </Grid>
      </Grid>

      {/* ── Row 3: Definitions Reference ── */}
      <Card sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
          {t('dashboard.definitions.title')}
        </Typography>
        <Grid container spacing={1}>
          {[
            { term: t('dashboard.definitions.activeCustomer.term'), def: t('dashboard.definitions.activeCustomer.def', { months: data?.active_window ?? 6 }) },
            { term: t('dashboard.definitions.existingCustomer.term'), def: t('dashboard.definitions.existingCustomer.def') },
            { term: t('dashboard.definitions.newCustomer.term'), def: t('dashboard.definitions.newCustomer.def') },
            { term: t('dashboard.definitions.dormantCustomer.term'), def: t('dashboard.definitions.dormantCustomer.def') },
            { term: t('dashboard.definitions.productCategory.term'), def: t('dashboard.definitions.productCategory.def') },
            { term: t('dashboard.definitions.highMarginProduct.term'), def: t('dashboard.definitions.highMarginProduct.def') },
          ].map(({ term, def }) => (
            <Grid key={term} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}>
                  {term}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {def}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
}