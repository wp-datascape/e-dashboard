import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { api } from '@/api/axios';
import type { ApiResponse } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerMetricsTrendPoint {
  month: string;
  existing_customers: number;
  total_revenue_existing: number;
  avg_revenue: number;
  avg_gross_profit: number;
  gp_tier1: number;
  gp_tier2: number;
  gp_tier3: number;
  high_margin_ratio: number;
  repeat_order_rate: number;
  expansion_rate: number;
  up_rate: number;
  flat_down_rate: number;
}

interface HighMarginCurrent {
  bought_pct: number;
  not_bought_pct: number;
}

interface RepeatOrderCurrent {
  value: number;
}

interface CustomerMetricsData {
  trend: CustomerMetricsTrendPoint[];
  detail: unknown[];
  high_margin_current: HighMarginCurrent;
  repeat_order_current: RepeatOrderCurrent;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useCustomerMetrics() {
  return useQuery<CustomerMetricsData>({
    queryKey: ['metrics', 'customer-metrics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CustomerMetricsData>>('/metrics/customer-metrics');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
export default function CustomerMetrics() {
  const { data, isLoading } = useCustomerMetrics();

  const latestTrend = data?.trend.at(-1);
  const hm = data?.high_margin_current;
  const ror = data?.repeat_order_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Customer Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Metrik 3–7 — Revenue, Gross Profit, High Margin Penetration, Repeat Order Rate, Customer Expansion
        </Typography>
      </Box>

      {/* ── M3: Combo Chart — Avg Revenue per Existing Customer ── */}
      <Box>
        <SectionLabel label="M3 · Average Revenue per Existing Customer" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <ComboChartWidget
                title="Total Revenue Existing vs Rata-rata Revenue per Customer (12 Bulan)"
                subtitle="Batang (kiri) = Total Revenue Existing · Garis (kanan) = Avg Revenue per Customer"
                data={data?.trend ?? []}
                barKey="total_revenue_existing"
                barLabel="Total Revenue Existing"
                barColor="#3B82F6"
                lineKey="avg_revenue"
                lineLabel="Avg Revenue / Customer"
                lineColor="#f97316"
                xKey="month"
                height={240}
                formatBar={(v) => fmtRp(v)}
                formatLine={(v) => fmtRp(v)}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── M4: Stacked Column Chart — Avg Gross Profit per Existing Customer ── */}
      <Box>
        <SectionLabel label="M4 · Average Gross Profit per Existing Customer" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title="Rata-rata Gross Profit per Customer — Segmentasi Kontribusi (12 Bulan)"
                subtitle="Stacked: Tier 1 (top) + Tier 2 (mid) + Tier 3 (long tail) · Total = Avg Gross Profit"
                value={latestTrend ? fmtRp(latestTrend.avg_gross_profit) : undefined}
                data={data?.trend ?? []}
                series={[
                  { key: 'gp_tier1', label: 'Tier 1 (Top Customer)',  color: '#1d4ed8' },
                  { key: 'gp_tier2', label: 'Tier 2 (Mid Customer)',   color: '#60a5fa' },
                  { key: 'gp_tier3', label: 'Tier 3 (Long Tail)',      color: '#bfdbfe' },
                ]}
                xKey="month"
                height={240}
                stacked
                tooltipFormatter={(v, n) => [fmtRp(v), n]}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── M5 + M6: Donut & Radial Bar ── */}
      <Box>
        <Grid container spacing={2}>
          {/* M5: High Margin Product Penetration — Donut */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionLabel label="M5 · High Margin Product Penetration — Bulan Berjalan" />
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <DonutChartWidget
                title="Penetrasi Produk High Margin"
                subtitle="Snapshot bulan berjalan — proporsi customer yang membeli produk high margin"
                data={[
                  {
                    name: 'Membeli High Margin',
                    value: hm?.bought_pct ?? 0,
                    color: '#16a34a',
                  },
                  {
                    name: 'Tidak Membeli',
                    value: hm?.not_bought_pct ?? 0,
                    color: '#e5e7eb',
                  },
                ]}
                centerValue={`${hm?.bought_pct ?? 0}%`}
                centerLabel="High Margin"
                height={240}
              />
            )}
          </Grid>

          {/* M6: Repeat Order Rate — Radial Bar */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionLabel label="M6 · Repeat Order Rate — Bulan Berjalan" />
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <RadialBarWidget
                title="Repeat Order Rate"
                subtitle="Hijau ≥ 80% (on target) · Kuning 60–79% · Merah < 60%"
                value={ror?.value ?? 0}
                thresholdGreen={80}
                height={240}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── M7: 100% Stacked Horizontal Bar — Customer Expansion Rate ── */}
      <Box>
        <SectionLabel label="M7 · Customer Expansion Rate — Spending Naik vs Flat/Turun" />
        {isLoading ? (
          <Skeleton variant="rectangular" height={340} />
        ) : (
          <BarChartWidget
            title="Customer Expansion Rate — 100% Stacked Horizontal (12 Bulan)"
            subtitle="Setiap baris = 1 bulan · Cerah = % spending naik · Redup = % flat/turun"
            data={(data?.trend ?? []).map((t) => ({
              month: t.month,
              up_rate: t.up_rate,
              flat_down_rate: t.flat_down_rate,
            }))}
            series={[
              { key: 'up_rate',        label: 'Spending Naik (%)',     color: '#16a34a' },
              { key: 'flat_down_rate', label: 'Flat / Turun (%)',      color: '#d1d5db' },
            ]}
            xKey="month"
            height={320}
            stacked
            layout="horizontal"
            tooltipFormatter={(v, n) => [`${v.toFixed(1)}%`, n]}
          />
        )}
      </Box>
    </Box>
  );
}