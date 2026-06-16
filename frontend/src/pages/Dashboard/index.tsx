import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

import { StatCard } from '@/components/charts/StatCard';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
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
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: 160 }}>
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

function PeriodStrip({ period, activeWindow }: { period: string; activeWindow: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Chip label={`Periode: ${period}`} size="small" variant="outlined" sx={{ borderRadius: 0, fontSize: '0.75rem' }} />
      <Chip label={`Window Aktif: ${activeWindow} bulan`} size="small" variant="outlined" sx={{ borderRadius: 0, fontSize: '0.75rem' }} />
    </Box>
  );
}

// ─── Clickable chart widget wrapper ──────────────────────────────────────────

function ClickableChart({ link, children }: { link: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate(link)}
      sx={{ cursor: 'pointer', '&:hover .chart-paper': { bgcolor: 'action.hover' } }}
    >
      {children}
    </Box>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading } = useDashboard();

  // Split metrics for different layout sections
  const metrics = data?.metrics ?? [];
  
  // Row 1: all 10 metric stat cards (2 rows of 5, or responsive grid)
  // Row 2: trend chart for selected metrics

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Overview Metrics
        </Typography>
        {!isLoading && data && (
          <PeriodStrip period={data.period_month} activeWindow={data.active_window} />
        )}
      </Box>

      {/* ── Row 1: 10 Metric Stat Cards (5 per row) ── */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <StatCardSkeleton />
              </Grid>
            ))
          : metrics.map((metric) => (
              <Grid key={metric.metric_key} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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

      {/* ── Row 2: Trend Charts (2 columns) ── */}
      <Grid container spacing={2}>
        {/* Cross Selling Ratio Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : (() => {
            const m = metrics.find(x => x.metric_key === 'cross_selling_ratio');
            if (!m) return null;
            return (
              <ClickableChart link={m.link}>
                <AreaChartWidget
                  title={m.title}
                  subtitle={m.subtitle}
                  value={formatMetricValue(m)}
                  change={m.summary.change_percent}
                  data={m.monthly_trend}
                  series={[{ key: 'value', label: m.title, color: m.color }]}
                  height={200}
                />
              </ClickableChart>
            );
          })()}
        </Grid>

        {/* Repeat Order Rate Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : (() => {
            const m = metrics.find(x => x.metric_key === 'repeat_order_rate');
            if (!m) return null;
            return (
              <ClickableChart link={m.link}>
                <AreaChartWidget
                  title={m.title}
                  subtitle={m.subtitle}
                  value={formatMetricValue(m)}
                  change={m.summary.change_percent}
                  data={m.monthly_trend}
                  series={[{ key: 'value', label: m.title, color: m.color }]}
                  height={200}
                />
              </ClickableChart>
            );
          })()}
        </Grid>

        {/* Dormant Rate Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : (() => {
            const m = metrics.find(x => x.metric_key === 'dormant_rate');
            if (!m) return null;
            return (
              <ClickableChart link={m.link}>
                <AreaChartWidget
                  title={m.title}
                  subtitle={m.subtitle}
                  value={formatMetricValue(m)}
                  change={m.summary.change_percent}
                  data={m.monthly_trend}
                  series={[{ key: 'value', label: m.title, color: m.color }]}
                  height={200}
                />
              </ClickableChart>
            );
          })()}
        </Grid>

        {/* Reactivation Rate Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <ChartSkeleton />
          ) : (() => {
            const m = metrics.find(x => x.metric_key === 'reactivation_rate');
            if (!m) return null;
            return (
              <ClickableChart link={m.link}>
                <AreaChartWidget
                  title={m.title}
                  subtitle={m.subtitle}
                  value={formatMetricValue(m)}
                  change={m.summary.change_percent}
                  data={m.monthly_trend}
                  series={[{ key: 'value', label: m.title, color: m.color }]}
                  height={200}
                />
              </ClickableChart>
            );
          })()}
        </Grid>
      </Grid>

      {/* ── Row 3: Definitions Reference ── */}
      <Paper
        elevation={0}
        square
        sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Definisi Kunci
        </Typography>
        <Grid container spacing={1}>
          {[
            { term: 'Customer Aktif', def: `last_transaction_date ≥ awal periode − ${data?.active_window ?? 6} bulan` },
            { term: 'Existing Customer', def: 'first_transaction_date < awal periode' },
            { term: 'New Customer', def: 'first_transaction_date dalam periode ini' },
            { term: 'Dormant Customer', def: 'last_transaction_date < awal periode − 3 bulan (default)' },
            { term: 'Kategori Produk', def: 'Hardware + Consumable saja — jasa/service tidak dihitung' },
            { term: 'High Margin Product', def: 'product_categories.is_high_margin = true' },
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
      </Paper>
    </Box>
  );
}
