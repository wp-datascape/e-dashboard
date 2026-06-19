import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { Card } from '@/components/ui';
import { StatusChip } from '@/components/ui/StatusChip';

import { StatCard } from '@/components/charts/StatCard';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { useDashboard } from '@/hooks/useDashboard';
import type { MetricCard } from '@/types/dashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: 160,
      }}
    >
      <Skeleton variant="text" width="60%" height={14} />
      <Skeleton variant="text" width="40%" height={36} sx={{ my: 0.5 }} />
      <Skeleton variant="text" width="80%" height={12} />
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ mt: 1 }} />
    </Box>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton variant="rectangular" width="100%" height={height} />;
}

// ─── Summary strip (period info) ─────────────────────────────────────────────

function PeriodStrip({
  period,
  activeWindow,
}: {
  period: string;
  activeWindow: number;
}) {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
    >
      <StatusChip label={`Periode: ${period}`} color="default" />
      <StatusChip label={`Window Aktif: ${activeWindow} bulan`} color="default" />
    </Box>
  );
}

// ─── Clickable wrapper ───────────────────────────────────────────────────────

function ClickableChart({
  link,
  children,
}: {
  link: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate(link)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        '&:hover': { opacity: 0.92 },
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </Box>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading } = useDashboard();

  const metrics = data?.metrics ?? [];

  const findMetric = (key: string) => metrics.find((x) => x.metric_key === key);

  // individual metrics
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
          Overview Metrics
        </Typography>
        {!isLoading && data && (
          <PeriodStrip
            period={data.period_month}
            activeWindow={data.active_window}
          />
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
                  title={metric.title}
                  subtitle={metric.subtitle}
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

      {/* ── Row 2: Chart Widgets (spec-matched types) ── */}
      <Grid container spacing={2}>

        {/* M1: Cross Selling Ratio — Bar Chart (trend) */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mCrossRatio ? (
            <ClickableChart link={mCrossRatio.link}>
              <BarChartWidget
                title={mCrossRatio.title}
                subtitle={mCrossRatio.subtitle}
                value={formatMetricValue(mCrossRatio)}
                change={mCrossRatio.summary.change_percent}
                data={mCrossRatio.monthly_trend}
                series={[{ key: 'value', label: 'Cross Selling Ratio (%)', color: mCrossRatio.color }]}
                xKey="month"
                height={180}
                tooltipFormatter={(v, n) => [`${v}%`, n]}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M2: Avg Category — Spline Area, green gradient */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mAvgCategory ? (
            <ClickableChart link={mAvgCategory.link}>
              <AreaChartWidget
                title={mAvgCategory.title}
                subtitle={mAvgCategory.subtitle}
                value={formatMetricValue(mAvgCategory)}
                change={mAvgCategory.summary.change_percent}
                data={mAvgCategory.monthly_trend}
                series={[{ key: 'value', label: 'Avg Kategori', color: '#16a34a' }]}
                xKey="month"
                height={180}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M5: High Margin Penetration — Donut Chart */}
        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mHighMargin ? (
            <ClickableChart link={mHighMargin.link}>
              <DonutChartWidget
                title={mHighMargin.title}
                subtitle={mHighMargin.subtitle}
                data={[
                  {
                    name: 'Membeli High Margin',
                    value: parseFloat(mHighMargin.summary.current_value.toFixed(1)),
                    color: '#F59E0B',
                  },
                  {
                    name: 'Tidak Membeli',
                    value: parseFloat(
                      (100 - mHighMargin.summary.current_value).toFixed(1)
                    ),
                    color: '#e5e7eb',
                  },
                ]}
                centerValue={formatMetricValue(mHighMargin)}
                centerLabel="High Margin"
                height={200}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M6: Repeat Order Rate — Radial Bar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mRepeatOrder ? (
            <ClickableChart link={mRepeatOrder.link}>
              <RadialBarWidget
                title={mRepeatOrder.title}
                subtitle={mRepeatOrder.subtitle}
                value={parseFloat(mRepeatOrder.summary.current_value.toFixed(1))}
                thresholdGreen={80}
                height={200}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M7: Customer Expansion Rate — Bar Chart */}
        <Grid size={{ xs: 12, md: 4 }}>
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : mExpansion ? (
            <ClickableChart link={mExpansion.link}>
              <BarChartWidget
                title={mExpansion.title}
                subtitle={mExpansion.subtitle}
                value={formatMetricValue(mExpansion)}
                change={mExpansion.summary.change_percent}
                data={mExpansion.monthly_trend}
                series={[{ key: 'value', label: 'Expansion Rate (%)', color: '#10B981' }]}
                xKey="month"
                height={200}
                tooltipFormatter={(v, n) => [`${v}%`, n]}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M8: Dormant Customer Rate — Line Alert Chart (threshold 10%) */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mDormantRate ? (
            <ClickableChart link={mDormantRate.link}>
              <LineAlertWidget
                title={mDormantRate.title}
                subtitle="Area merah = di atas ambang batas 10% (kondisi kritis)"
                data={mDormantRate.monthly_trend}
                lineKey="value"
                lineLabel="Dormant Rate (%)"
                xKey="month"
                threshold={10}
                thresholdLabel="Ambang 10%"
                height={180}
              />
            </ClickableChart>
          ) : null}
        </Grid>

        {/* M10: Customer Reactivation Rate — Bullet Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : mReactivation ? (
            <ClickableChart link={mReactivation.link}>
              <BulletChartWidget
                title={mReactivation.title}
                subtitle="Target KPI: 15%–20% · Latar berubah warna saat ketercapaian"
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
          Definisi Kunci
        </Typography>
        <Grid container spacing={1}>
          {[
            {
              term: 'Customer Aktif',
              def: `last_transaction_date ≥ awal periode − ${data?.active_window ?? 6} bulan`,
            },
            {
              term: 'Existing Customer',
              def: 'first_transaction_date < awal periode',
            },
            {
              term: 'New Customer',
              def: 'first_transaction_date dalam periode ini',
            },
            {
              term: 'Dormant Customer',
              def: 'last_transaction_date < awal periode − 3 bulan (default)',
            },
            {
              term: 'Kategori Produk',
              def: 'Hardware + Consumable saja — jasa/service tidak dihitung',
            },
            {
              term: 'High Margin Product',
              def: 'product_categories.is_high_margin = true',
            },
          ].map(({ term, def }) => (
            <Grid key={term} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: 'primary.main',
                    display: 'block',
                  }}
                >
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