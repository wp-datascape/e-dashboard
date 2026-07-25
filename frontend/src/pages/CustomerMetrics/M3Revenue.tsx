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
import type { PaletteKey } from '@/theme/palettes';
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

// Template warna 3 garis M3 — matriks eksak dari user (2026-07-25), 1 kombinasi khusus
// per palette (key internal blue/green/yellow/purple/rose/indigo memetakan ke label baru
// "Enterprise Blue/Executive Green/Modern Teal/Premium Purple/Executive Red/Enterprise
// Slate" — lihat catatan di theme/palettes.ts). Nilai dark mode diturunkan dari hex light
// yang dikasih user via HSL lightness bump (+10, formula sama dipakai utk primary/secondary
// palette lain di file ini), bukan quesswork manual.
//
// | Palette          | Bar (light) | Line 1 (light) | Line 2 (light) | Line 3 (light) |
// |------------------|-------------|-----------------|-----------------|-----------------|
// | Enterprise Blue  | #2563EB     | #F59E0B amber   | #10B981 emerald | #EF4444 red     |
// | Executive Green  | #059669     | #2563EB blue    | #F97316 orange  | #A855F7 purple  |
// | Modern Teal      | #0F766E     | #6366F1 indigo  | #F97316 orange  | #E11D48 rose    |
// | Premium Purple   | #7C3AED     | #14B8A6 teal    | #F59E0B amber   | #EF4444 red     |
// | Executive Red    | #DC2626     | #2563EB blue    | #10B981 green   | #FBBF24 yellow  |
// | Enterprise Slate | #475569     | #3B82F6 blue    | #22C55E green   | #F59E0B amber   |
function buildLineTemplates(mode: 'light' | 'dark') {
  const templates: Record<PaletteKey, { line1: { light: string; dark: string }; line2: { light: string; dark: string }; line3: { light: string; dark: string } }> = {
    blue: { // Enterprise Blue
      line1: { light: '#F59E0B', dark: '#F7B23B' },
      line2: { light: '#10B981', dark: '#14E6A0' },
      line3: { light: '#EF4444', dark: '#F37272' },
    },
    green: { // Executive Green
      line1: { light: '#2563EB', dark: '#5284EF' },
      line2: { light: '#F97316', dark: '#FA9247' },
      line3: { light: '#A855F7', dark: '#C185F9' },
    },
    yellow: { // Modern Teal (key internal tetap 'yellow')
      line1: { light: '#6366F1', dark: '#9395F6' },
      line2: { light: '#F97316', dark: '#FA9247' },
      line3: { light: '#E11D48', dark: '#E84A6C' },
    },
    purple: { // Premium Purple
      line1: { light: '#14B8A6', dark: '#19E6CE' },
      line2: { light: '#F59E0B', dark: '#F7B23B' },
      line3: { light: '#EF4444', dark: '#F37272' },
    },
    rose: { // Executive Red (key internal tetap 'rose')
      line1: { light: '#2563EB', dark: '#5284EF' },
      line2: { light: '#10B981', dark: '#14E6A0' },
      line3: { light: '#FBBF24', dark: '#FCCC55' },
    },
    indigo: { // Enterprise Slate (key internal tetap 'indigo')
      line1: { light: '#3B82F6', dark: '#6DA2F8' },
      line2: { light: '#22C55E', dark: '#3BDE77' },
      line3: { light: '#F59E0B', dark: '#F7B23B' },
    },
  };

  return Object.fromEntries(
    Object.entries(templates).map(([key, t]) => [
      key,
      { line1: t.line1[mode], line2: t.line2[mode], line3: t.line3[mode] },
    ]),
  ) as Record<PaletteKey, { line1: string; line2: string; line3: string }>;
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

  const lineTemplates = buildLineTemplates(isDark ? 'dark' : 'light');
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
