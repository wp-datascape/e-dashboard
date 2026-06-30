import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useCompanies } from '@/hooks/useCompanies';

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

  const [companyId,  setCompanyId]  = useState<number | 'all'>('all');
  const [periodEnd,  setPeriodEnd]  = useState(todayIsoDate());
  const [division,   setDivision]   = useState<string>('');

  const { data: companies = [] } = useCompanies();
  const { data, isLoading } = useDormantCustomer({
    company_id:  companyId,
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
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Dormant Customer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Metrik 8–10 — Dormant Rate, Nilai Customer Hilang, dan Reactivation Rate
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            select size="small" label="Entitas"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="all">Semua Entitas</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Divisi"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value="">Semua Divisi</MenuItem>
            <MenuItem value="distribution">Distribution</MenuItem>
            <MenuItem value="project">Project</MenuItem>
            <MenuItem value="e_commerce">E-Commerce</MenuItem>
            <MenuItem value="intercompany">Intercompany</MenuItem>
            <MenuItem value="freelancer">Freelancer</MenuItem>
            <MenuItem value="support">Support</MenuItem>
          </TextField>

          <TextField
            size="small" label="Per Tanggal" type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
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
                subtitle={`Area merah = kondisi kritis di atas ambang ${alertPct}% · Garis putus-putus = batas aman`}
                data={data?.trend ?? []}
                lineKey="dormant_rate"
                lineLabel="Dormant Rate (%)"
                xKey="month"
                threshold={alertPct}
                thresholdLabel={`Ambang ${alertPct}%`}
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
                  Dormant Rate — Bulan Terakhir
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
                    ? `⚠ Di atas ambang kritis ${alertPct}%`
                    : `✓ Di bawah ambang aman ${alertPct}%`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Jumlah Dormant
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, mt: 0.25 }}>
                  {drc?.dormant_count ?? '–'} customer
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Customer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1, mt: 0.25 }}>
                  {drc?.total_customers ?? '–'} customer
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
            subtitle="Diurutkan dari nilai kerugian terbesar · Estimasi = avg revenue bulanan × bulan dormant"
            data={data?.value_ranking ?? []}
            series={[
              {
                key: 'estimated_lost_value',
                label: 'Potensi Omset Hilang',
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
        <SectionLabel label="M10 · Customer Reactivation Rate — vs Target KPI" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <BulletChartWidget
                title="Customer Reactivation Rate"
                subtitle={`Nilai realisasi vs rentang target ${targetLow}%–${targetHigh}% · Latar berubah warna saat tercapai`}
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
                title="Reactivation Rate — Tren 12 Bulan"
                subtitle={`Target zona: ${targetLow}%–${targetHigh}% · Garis biru = realisasi bulanan`}
                data={data?.trend ?? []}
                lineKey="reactivation_rate"
                lineLabel="Reactivation Rate (%)"
                xKey="month"
                threshold={targetLow}
                thresholdLabel={`Target Min ${targetLow}%`}
                height={180}
              />
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
