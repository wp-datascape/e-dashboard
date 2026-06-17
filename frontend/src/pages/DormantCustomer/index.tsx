import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';

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
export default function DormantCustomer() {
  const { data, isLoading } = useDormantCustomer();

  const latestTrend = data?.trend.at(-1);
  const rc = data?.reactivation_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Dormant Customer
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Metrik 8–10 — Dormant Rate, Nilai Customer Hilang, dan Reactivation Rate
        </Typography>
      </Box>

      {/* ── M8: Line Chart + Red Alert Shading — Dormant Customer Rate ── */}
      <Box>
        <SectionLabel label="M8 · Dormant Customer Rate — Tren 12 Bulan" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <LineAlertWidget
                title="Dormant Customer Rate (12 Bulan)"
                subtitle="Area merah = kondisi kritis di atas ambang 10% · Garis putus-putus = batas aman"
                data={data?.trend ?? []}
                lineKey="dormant_rate"
                lineLabel="Dormant Rate (%)"
                xKey="month"
                threshold={10}
                thresholdLabel="Ambang 10%"
                height={240}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Summary stat */}
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
                  Dormant Rate — Bulan Terakhir
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color:
                      (latestTrend?.dormant_rate ?? 0) > 10 ? '#dc2626' : '#16a34a',
                    lineHeight: 1,
                    mt: 0.5,
                  }}
                >
                  {latestTrend?.dormant_rate ?? '–'}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {(latestTrend?.dormant_rate ?? 0) > 10
                    ? '⚠ Di atas ambang batas kritis 10%'
                    : '✓ Di bawah ambang aman 10%'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Jumlah Dormant
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, mt: 0.25 }}>
                  {latestTrend?.dormant_count ?? '–'} customer
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* ── M9: Horizontal Bar Ranking — Dormant Customer Value ── */}
      <Box>
        <SectionLabel label="M9 · Dormant Customer Value — Ranking Potensi Omset Hilang" />
        {isLoading ? (
          <Skeleton variant="rectangular" height={340} />
        ) : (
          <BarChartWidget
            title="Top Dormant Customer — Ranked by Estimated Lost Value"
            subtitle="Diurutkan dari nilai kerugian terbesar ke terkecil · Fokus penyelamatan akun bernilai besar"
            data={data?.value_ranking ?? []}
            series={[
              {
                key: 'estimated_lost_value',
                label: 'Potensi Omset Hilang',
                color: '#ef4444',
              },
            ]}
            xKey="customer_name"
            height={320}
            layout="horizontal"
            tooltipFormatter={(v, n) => [fmtRp(v), n]}
          />
        )}
      </Box>

      {/* ── M10: Bullet Chart — Customer Reactivation Rate ── */}
      <Box>
        <SectionLabel label="M10 · Customer Reactivation Rate — vs Target KPI Tahunan" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <BulletChartWidget
                title="Customer Reactivation Rate"
                subtitle="Nilai realisasi vs rentang target 15%–20% · Latar berubah warna saat tercapai"
                value={rc?.value ?? 0}
                targetLow={rc?.target_low ?? 15}
                targetHigh={rc?.target_high ?? 20}
                max={30}
                unit="%"
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {/* Reactivation trend */}
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <LineAlertWidget
                title="Reactivation Rate — Tren 12 Bulan"
                subtitle="Target zona: 15%–20% · Garis biru = realisasi bulanan"
                data={data?.trend ?? []}
                lineKey="reactivation_rate"
                lineLabel="Reactivation Rate (%)"
                xKey="month"
                threshold={15}
                thresholdLabel="Target Min 15%"
                height={180}
              />
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}