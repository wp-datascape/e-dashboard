import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Card } from '@/components/ui';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { currentYearMonth, resolvePeriodEnd } from '@/utils/date';

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
import { StatCardSkeleton } from './components/StatCardSkeleton';
import { ChartSkeleton } from './components/ChartSkeleton';
import { PeriodStrip } from './components/PeriodStrip';
import { ClickableChart } from './components/ClickableChart';

// ─── Halaman Overview (task029) ────────────────────────────────────────────
//
// Tata letak PERSIS versi `main` (Row 1: 10 StatCard · Row 3: Definitions
// dalam Card berbingkai) — dikembalikan atas instruksi user (2026-08-19),
// redesign Executive Summary/Growth/Health/Key Alerts sebelumnya di commit
// 48bc443 DIBATALKAN, bukan arah yang dipakai. Dua penyesuaian yang tetap
// dipakai:
// 1. Field `color` sudah dihapus dari backend (docs-v2/task/task029.md,
//    dashboard.types.ts) — API sekarang kirim `chart_type` per metric,
//    warna murni urusan frontend. Dipetakan lokal per metric_key
//    (METRIC_COLOR_KEY), sedekat mungkin dgn hex lama backend.
// 2. Row 2 (chart widget) DIKELOMPOKKAN Growth/Retention/Value sesuai
//    task029.md §2 (2026-08-19, instruksi user) — beda dari main yang
//    urutannya flat tanpa pengelompokan, DAN semua 10 KPI sekarang punya
//    chart widget sendiri (main cuma charting 7 dari 10 — M3/M4/M9 dulu
//    cuma StatCard). Cuma label section (Typography bold, bukan Card/
//    Divider tebal) di atas tiap grup, chrome tetap minim. Pemetaan §2:
//    Growth = M1 Cross Selling (Bar) + M2 Avg Category (Area) + M7
//    Expansion (Bar) · Retention = M6 Repeat Order (RadialBar) + M8
//    Dormant Rate (LineAlert) + M9 Dormant Value (Area, BARU) + M10
//    Reactivation (Bullet) · Value = M3 Avg Revenue (Area, BARU) + M4 Avg
//    Gross Profit (Area, BARU) + M5 High Margin (Donut). M3/M4/M9 dipilih
//    AreaChartWidget spy konsisten sama M2 (bukan ComboChartWidget spt di
//    /customer-metrics M3Revenue.tsx — itu butuh 2 series bar+line
//    terpisah yg tidak ada di monthly_trend Overview yg cuma 1 `value`).

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

// Pengganti `metric.color` (dihapus dari backend) — dipetakan ke key palet
// tema, dipilih sedekat mungkin dgn hex lama tiap metric_key.
const METRIC_COLOR_KEY: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'> = {
  cross_selling_ratio: 'primary',
  avg_category: 'secondary',
  avg_revenue: 'success',
  avg_gross_profit: 'info',
  high_margin_penetration: 'warning',
  repeat_order_rate: 'primary',
  expansion_rate: 'success',
  dormant_rate: 'error',
  dormant_value: 'warning',
  reactivation_rate: 'secondary',
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

  const scopeFilter = useScopedCompanyFilter();
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const [periodMonth, setPeriodMonth] = useState(currentYearMonth());

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: resolvePeriodEnd(periodMonth),
    exclude_intercompany: excludeIntercompany,
  });

  const metrics = data?.metrics ?? [];

  const findMetric = (key: string) => metrics.find((x) => x.metric_key === key);
  const metricColor = (key: string) => theme.palette[METRIC_COLOR_KEY[key] ?? 'primary'].main;

  const mCrossRatio      = findMetric('cross_selling_ratio');
  const mAvgCategory     = findMetric('avg_category');
  const mAvgRevenue      = findMetric('avg_revenue');
  const mAvgGrossProfit  = findMetric('avg_gross_profit');
  const mHighMargin      = findMetric('high_margin_penetration');
  const mRepeatOrder     = findMetric('repeat_order_rate');
  const mExpansion       = findMetric('expansion_rate');
  const mDormantRate     = findMetric('dormant_rate');
  const mDormantValue    = findMetric('dormant_value');
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
        <Typography variant="pageTitle">
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <ScopeFilterFields filter={scopeFilter} />
        <MonthYearPicker
          size="small"
          label={t('common.filters.period')}
          value={periodMonth}
          onChange={setPeriodMonth}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
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
                  color={metricColor(metric.metric_key)}
                  link={metric.link}
                />
              </Grid>
            ))}
      </Grid>

      {/* ── Row 2: Chart Widgets — dikelompokkan Growth/Retention/Value (task029.md §2) ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Growth — M1 Cross Selling, M2 Avg Category, M7 Expansion */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.growth')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
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
                    series={[{ key: 'value', label: t('dashboard.charts.crossSellingRatioLabel'), color: metricColor('cross_selling_ratio') }]}
                    xKey="month"
                    height={180}
                    tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
                  />
                </ClickableChart>
              ) : null}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
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
                <ChartSkeleton />
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
                    height={180}
                    tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
                  />
                </ClickableChart>
              ) : null}
            </Grid>
          </Grid>
        </Box>

        {/* Retention — M6 Repeat Order, M8 Dormant Rate, M9 Dormant Value, M10 Reactivation */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.retention')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {isLoading ? (
                <ChartSkeleton />
              ) : mDormantValue ? (
                <ClickableChart link={mDormantValue.link}>
                  <AreaChartWidget
                    title={metricTitle(mDormantValue, t)}
                    subtitle={metricSubtitle(mDormantValue, t)}
                    value={formatMetricValue(mDormantValue)}
                    change={mDormantValue.summary.change_percent}
                    data={mDormantValue.monthly_trend}
                    series={[{ key: 'value', label: t('dashboard.charts.dormantValueLabel'), color: metricColor('dormant_value') }]}
                    xKey="month"
                    height={180}
                  />
                </ClickableChart>
              ) : null}
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {isLoading ? (
                <ChartSkeleton height={260} />
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
        </Box>

        {/* Value — M3 Avg Revenue, M4 Avg Gross Profit, M5 High Margin */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.value')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              {isLoading ? (
                <ChartSkeleton />
              ) : mAvgRevenue ? (
                <ClickableChart link={mAvgRevenue.link}>
                  <AreaChartWidget
                    title={metricTitle(mAvgRevenue, t)}
                    subtitle={metricSubtitle(mAvgRevenue, t)}
                    value={formatMetricValue(mAvgRevenue)}
                    change={mAvgRevenue.summary.change_percent}
                    data={mAvgRevenue.monthly_trend}
                    series={[{ key: 'value', label: t('dashboard.charts.avgRevenueLabel'), color: metricColor('avg_revenue') }]}
                    xKey="month"
                    height={180}
                  />
                </ClickableChart>
              ) : null}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              {isLoading ? (
                <ChartSkeleton />
              ) : mAvgGrossProfit ? (
                <ClickableChart link={mAvgGrossProfit.link}>
                  <AreaChartWidget
                    title={metricTitle(mAvgGrossProfit, t)}
                    subtitle={metricSubtitle(mAvgGrossProfit, t)}
                    value={formatMetricValue(mAvgGrossProfit)}
                    change={mAvgGrossProfit.summary.change_percent}
                    data={mAvgGrossProfit.monthly_trend}
                    series={[{ key: 'value', label: t('dashboard.charts.avgGrossProfitLabel'), color: metricColor('avg_gross_profit') }]}
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
          </Grid>
        </Box>
      </Box>

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
