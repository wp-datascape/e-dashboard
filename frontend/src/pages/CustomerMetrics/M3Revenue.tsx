import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useRevenueBreakdown } from '@/hooks/useMetrics';
import { useThemeMode } from '@/theme/theme.context';
import { PALETTES, type PaletteKey } from '@/theme/palettes';
import { fmtRp, fmtRpDetail, monthToEndDate } from './helpers';
import { SectionLabel, Row } from './HelperComponents';

function M3Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      p: 1.5,
      minWidth: 230,
      fontSize: 12,
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {d.month}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {/* fmtRpDetail (2 desimal) — BUKAN fmtRp (1 desimal) — supaya angka yang tampil di
          tooltip chart ini PERSIS SAMA dengan yang tampil di dialog drill-down (subtitle
          dialogRevenueExisting/dialogAvgRevenue/dialogMedianThreshold di bawah pakai
          fmtRpDetail juga). Nilainya sudah identik di backend (total_revenue_existing ===
          breakdown.total_revenue, dst - sudah diverifikasi by direct API call), tapi
          fmtRp membulatkan ke 1 desimal jadi keliatan beda ("2,4M" vs "2,35M") padahal
          angka aslinya sama - laporan user 2026-07-23: "validasi data itu penting". */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Row label={t('customerMetrics.m3.rowTotalRevenue')} value={fmtRpDetail(d.total_revenue_existing)} />
        <Row label={t('customerMetrics.m3.rowTotalExisting')} value={String(d.existing_customers)} />
        <Row label={t('customerMetrics.m3.rowAvgRevenue')} value={fmtRpDetail(d.avg_revenue)} />
        <Row
          label={t('customerMetrics.m3.rowMedianRevenue')}
          value={fmtRpDetail(d.median_revenue)}
          highlight={d.median_revenue < d.avg_revenue * 0.7}
        />
        <Row
          label={t('customerMetrics.m3.rowHmContribution')}
          value={`${fmtRpDetail(d.hm_revenue)} (${d.total_revenue_existing > 0 ? ((d.hm_revenue / d.total_revenue_existing) * 100).toFixed(1) : '0'}%)`}
        />
      </Box>
      {d.top_customer_name && (
        <>
          <Divider sx={{ my: 1 }} />
          <Row
            label={t('customerMetrics.m3.topLabel', { name: d.top_customer_name })}
            value={t('customerMetrics.m3.topValue', { pct: d.top_customer_pct })}
            highlight={d.is_concentrated}
            icon={d.is_concentrated ? '⚠ ' : undefined}
          />
        </>
      )}
    </Box>
  );
}

// Nilai `tier` dari backend (RevenueBreakdownRow.tier) selalu literal 'Atas'/'Tengah'/'Bawah'
// — data API, bukan chrome UI, jadi perbandingan tetap pakai string asli. Hanya label
// tampilan (StatusChip) yang di-translate. Mirror persis tierChipColor/tierLabel di M4GrossProfit.tsx.
function tierChipColor(tier: string): 'primary' | 'info' | 'default' {
  if (tier === 'Atas')   return 'primary';
  if (tier === 'Tengah') return 'info';
  return 'default';
}

// Template warna 3 garis M3 — DIBEDAKAN PER PALETTE (bukan 1 warna universal untuk semua),
// supaya tiap palette selalu dapat kombinasi paling kontras terhadap warna bar-nya sendiri
// (bar = primary.main, ikut 6 palette aktif: blue/green/yellow/purple/rose/indigo).
//
// Default line1/line2 = warning/success (dipakai chart lain juga, semantik tetap sama di
// semua palette) - TAPI diganti kalau hue-nya ketabrak sama bar palette itu:
// - yellow: bar (~32°) = SAMA PERSIS dengan warning (~32°) → line1 diganti biru (blue accent).
//           line3 JUGA diganti ungu (bukan magenta) — magenta (~310°) secara hue jauh dari
//           amber (82°) tapi dua-duanya warna "hangat", kontras PERSEPSI-nya lemah di layar
//           (dilaporkan user, screenshot). Ungu (dingin, ~272°) jauh lebih menonjol di atas
//           background oranye/amber.
// - green:  bar (~142°) cuma beda ~18° dari success (~160°) → line2 diganti info (cyan, ~192°)
// - purple: bar (~272°) beda 112° dari success — aman, tapi magenta line3 (lihat bawah)
//           cuma beda ~38° dari purple → line3 diganti info (cyan) utk purple
// - rose:   bar (~347°) terlalu dekat warning (45°) DAN magenta (37°) → line1/line3 diganti
//           success+info (garis 1&2) dan purple accent (garis 3), semua >75° dari bar
//
// line3 (baru, HM%) defaultnya magenta/orchid (~310° — titik tengah gap terbesar antar
// bar purple 272° & rose 347°, dua bar yang paling berdekatan satu sama lain) — KECUALI
// utk palette hangat (yellow) yang butuh warna dingin spesifik biar kontras persepsinya kuat.
function buildLineTemplates(warning: string, success: string, info: string, mode: 'light' | 'dark') {
  const magenta = mode === 'dark' ? 'hsl(310, 80%, 63%)' : 'hsl(310, 75%, 45%)';
  const blueAccent = PALETTES.blue.primary[mode];
  const purpleAccent = PALETTES.purple.primary[mode];

  const templates: Record<PaletteKey, { line1: string; line2: string; line3: string }> = {
    blue:   { line1: warning,    line2: success, line3: magenta },
    indigo: { line1: warning,    line2: success, line3: magenta },
    green:  { line1: warning,    line2: info,    line3: magenta },
    yellow: { line1: blueAccent, line2: success, line3: purpleAccent },
    purple: { line1: warning,    line2: success, line3: info },
    rose:   { line1: success,    line2: info,    line3: purpleAccent },
  };
  return templates;
}

function tierLabel(tier: string, t: TFunction): string {
  if (tier === 'Atas')   return t('customerMetrics.m4.tierTop');
  if (tier === 'Tengah') return t('customerMetrics.m4.tierMid');
  if (tier === 'Bawah')  return t('customerMetrics.m4.tierBottom');
  return tier;
}

function useRevenueColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m4.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'revenue',     headerName: t('customerMetrics.m3.colRevenue'),     width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRpDetail(p.value as number) },
    { field: 'revenue_pct', headerName: t('customerMetrics.m3.colRevenuePct'), width: 90,  align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), width: 100, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => <StatusChip label={tierLabel(p.value as string, t)} color={tierChipColor(p.value as string)} /> },
  ]
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
  companyId: number | 'all'
  branchId?: number
  division?: string
  excludeIntercompany?: boolean
}

export function M3Revenue({ trend, isLoading, companyId, branchId, division, excludeIntercompany }: Props) {
  const theme = useTheme();
  const { palette: paletteKey, isDark } = useThemeMode();
  const { t } = useTranslation();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const revenueColumns = useRevenueColumns(t);

  const lineTemplates = buildLineTemplates(
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
    isDark ? 'dark' : 'light',
  );
  const lineTemplate = lineTemplates[paletteKey];

  const { data: breakdown, isLoading: breakdownLoading } = useRevenueBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // hm_pct dihitung di frontend (bukan dari API) - sama seperti avg_revenue dialog yang
  // juga dihitung inline dari total_revenue/total_existing, konsisten dgn pola existing.
  const trendWithHmPct = trend.map((d) => ({
    ...d,
    hm_pct: d.total_revenue_existing > 0 ? (d.hm_revenue / d.total_revenue_existing) * 100 : 0,
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SectionLabel label={t('customerMetrics.m3.sectionLabel')} />
        <MuiTooltip
          title={t('customerMetrics.m3.tooltipInfo')}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>

      {isLoading ? (
        <Skeleton variant="rectangular" height={280} />
      ) : (
        <ComboChartWidget
          title={t('customerMetrics.m3.chartTitle')}
          subtitle={t('customerMetrics.m3.chartSubtitle')}
          data={trendWithHmPct}
          barKey="total_revenue_existing"
          barLabel={t('customerMetrics.m3.barLabel')}
          barColor={theme.palette.primary.main}
          lineKey="avg_revenue"
          lineLabel={t('customerMetrics.m3.lineLabelAvg')}
          lineColor={lineTemplate.line1}
          line2Key="median_revenue"
          line2Label={t('customerMetrics.m3.lineLabelMedian')}
          line2Color={lineTemplate.line2}
          line3Key="hm_pct"
          line3Label={t('customerMetrics.m3.lineLabelHm')}
          line3Color={lineTemplate.line3}
          formatLine3={(v) => `${v.toFixed(1)}%`}
          concentrationKey="top_customer_pct"
          concentrationThreshold={25}
          xKey="month"
          height={260}
          formatBar={(v) => fmtRp(v)}
          formatLine={(v) => fmtRp(v)}
          renderTooltip={(props) => <M3Tooltip {...props} />}
          onBarClick={(d) => setDrillDate(monthToEndDate(String(d.month ?? '')))}
        />
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2.5 }, mt: 1, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">{t('customerMetrics.m3.legendNormal')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'warning.light', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            {t('customerMetrics.m3.legendConcentrated')}
          </Typography>
        </Box>
      </Box>

      {/* Revenue Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m3.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m3.dialogRevenueExisting'), fmtRpDetail(breakdown.total_revenue)],
              [t('customerMetrics.m3.dialogTotalExisting'),    String(breakdown.total_existing)],
              [t('customerMetrics.m3.dialogAvgRevenue'),       fmtRpDetail(breakdown.total_existing > 0 ? breakdown.total_revenue / breakdown.total_existing : 0)],
              [t('customerMetrics.m3.dialogMedianThreshold'),  fmtRpDetail(breakdown.median_threshold)],
              [t('customerMetrics.m3.dialogHmContribution'),   `${fmtRpDetail(breakdown.hm_revenue)} (${breakdown.total_revenue > 0 ? ((breakdown.hm_revenue / breakdown.total_revenue) * 100).toFixed(1) : '0'}%)`],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
      >
        <ResponsiveListView
          rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={revenueColumns}
          loading={breakdownLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m3.emptyMessage')}
          mobileFields={['customer_name', 'revenue', 'revenue_pct', 'tier']}
        />
      </Dialog>
    </Box>
  );
}
