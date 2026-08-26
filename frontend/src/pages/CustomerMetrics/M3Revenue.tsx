import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { useRevenueBreakdown } from '@/hooks/useMetrics';
import { useThemeMode } from '@/theme/theme.context';
import { PALETTES } from '@/theme/palettes';
import { fmtRp } from './helpers';
import { formatRupiah } from '@/utils/format';
import { formatPeriodLabel, formatPeriodLabelShort, formatPeriodRangeSub, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from './HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useRevenueColumns } from './valueHelpers';

// Tooltip custom (2026-08-25, task029.md §33 — standarisasi M3 ke pola
// Growth/Retention) — DIGANTI ke `ChartTooltipCard` shared component
// (sebelumnya Box+Divider manual, style beda dari M1/M2/M6/M7/M8/M10),
// isi baris SAMA PERSIS versi lama, cuma wrapper-nya distandarkan.
function M3Tooltip({ active, payload, periodType }: TooltipContentProps<number, string> & { periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;

  const rows = [
    { label: t('customerMetrics.m3.rowTotalRevenue'), value: formatRupiah(d.total_revenue_existing) },
    { label: t('customerMetrics.m3.rowTotalExisting'), value: d.existing_customers.toLocaleString('id-ID') },
    { label: t('customerMetrics.m3.rowAvgRevenue'), value: formatRupiah(d.avg_revenue) },
    { label: t('customerMetrics.m3.rowMedianRevenue'), value: formatRupiah(d.median_revenue) },
    { label: t('customerMetrics.m3.rowHmContribution'), value: formatRupiah(d.hm_revenue) },
    {
      label: t('customerMetrics.m3.rowHmContributionPct'),
      value: `${d.total_revenue_existing > 0 ? ((d.hm_revenue / d.total_revenue_existing) * 100).toFixed(1) : '0'}%`,
    },
  ];
  if (d.top_customer_name) {
    rows.push({
      label: t('customerMetrics.m3.topLabel', { name: d.top_customer_name }),
      value: t('customerMetrics.m3.topValue', { pct: d.top_customer_pct }),
    });
  }

  return (
    <ChartTooltipCard
      title={formatPeriodLabelShort(t, periodType, d.month)}
      rows={rows}
      hint={t('customerMetrics.m3.tooltipClickHint')}
    />
  );
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  /** Trend YoY (2026-08-25) — dipakai KpiHeader, di-fetch TERPUSAT di
   * Value/index.tsx (1 sumber dibagi M3/M4/M5), bukan per-komponen spt
   * M7ExpansionGrowth.tsx. Opsional, kalau kosong KpiHeader tidak tampil. */
  yoyTrend?: CustomerMetricsTrendPoint[]
  isLoading: boolean
  /** Granularitas trend (2026-08-25, task029.md §33). Default 'monthly'
   * kalau caller belum wired (CustomerMetrics workbench). */
  periodType?: PeriodGranularity
  /** Tanggal akhir periode filter halaman (2026-08-25) — dipakai fetch Top5
   * + label KpiHeader, opsional supaya caller lama (workbench) aman tanpa
   * prop ini. */
  periodEnd?: string
  applyDateCutoff?: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
  onlyPareto?: boolean
}

export function M3Revenue({ trend, yoyTrend = [], isLoading, periodType = 'monthly', periodEnd, companyId, branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const theme = useTheme();
  const { palette: paletteKey, isDark } = useThemeMode();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [drillDateFrom, setDrillDateFrom] = useState<string | null>(null);
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const revenueColumns = useRevenueColumns(t);

  const mode = isDark ? 'dark' : 'light';
  const lineTemplate = {
    line1: PALETTES[paletteKey].line1[mode],
    line2: PALETTES[paletteKey].line2[mode],
    line3: PALETTES[paletteKey].line3[mode],
  };
  const concentrationColor = PALETTES[paletteKey].warningComplement[mode];

  // Top 5 (2026-08-25, pola sama persis M1/M6/M8) — breakdown periode
  // PALING BARU di trend (bukan cuma on-click), date_from = awal bucket
  // granularitas yang sedang aktif.
  const latestMonth = trend.length > 0 ? trend[trend.length - 1].month : null;
  const currentPeriodStart = latestMonth ? getPeriodDateRange(periodType, latestMonth).start : undefined;
  const currentPeriodEnd = latestMonth
    ? clampPeriodEndToToday(periodType, latestMonth, getPeriodDateRange(periodType, latestMonth).end)
    : null;
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useRevenueBreakdown({
    period_end: currentPeriodEnd,
    date_from: currentPeriodStart,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const top5Items: TopMoverItem[] = (currentBreakdown?.rows ?? []).slice(0, 5).map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: fmtRp(r.revenue),
    icon: MonetizationOnIcon,
    iconColor: theme.palette.primary.main,
  }));

  const { data: breakdown, isLoading: breakdownLoading } = useRevenueBreakdown({
    period_end: drillDate,
    date_from: drillDateFrom ?? undefined,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  // non_hm_revenue (2026-08-25, task029.md §36, instruksi user: "Ganti cart
  // m3 menjadi stack bar cart, bar utuh untuk total revenue, bar dalam
  // untuk high margin value") — DERIVED (total_revenue_existing - hm_revenue),
  // pola SAMA PERSIS M2AvgCategory.tsx (single_category) / M5HighMargin.tsx
  // (not_bought_count) — supaya stacking bar bawah+atas balik ke total
  // revenue, bukan dobel hitung (hm_revenue SUDAH subset dari
  // total_revenue_existing).
  const trendWithNonHm = trend.map((d) => ({
    ...d,
    non_hm_revenue: d.total_revenue_existing - d.hm_revenue,
  }));

  // KpiHeader current-vs-YoY (2026-08-25, task029.md §33) — pola sama
  // persis M1/M6/M7/M8/M10, current = titik terakhir trend, yoy = titik
  // terakhir yoyTrend.
  const last = trend.at(-1);
  const yoyLast = yoyTrend.at(-1);
  const periodKey = latestMonth ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';
  const periodPhrase = (latestMonth && currentPeriodStart && currentPeriodEnd)
    ? formatPeriodRangeSub(t, periodType, latestMonth, currentPeriodStart, currentPeriodEnd)
    : '';

  return (
    <Box>
      {/* 3 kartu ringkasan (2026-08-25, task029.md §33) — pola sama persis
          M1/M6/M8/M9/M10: metrik utama (Total Revenue Existing) + 2 angka
          pendukung (avg revenue, total existing customer). */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m3.summaryTotalRevenue')}
              value={fmtRp(last?.total_revenue_existing ?? 0)}
              sub={periodPhrase}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m3.summaryAvgRevenue')}
              value={fmtRp(last?.avg_revenue ?? 0)}
              sub={periodPhrase}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m3.summaryExisting')}
              value={(last?.existing_customers ?? 0).toLocaleString('id-ID')}
              sub={periodPhrase}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
      </Grid>

      {/* Judul dipindah KE DALAM Card (2026-08-25, koreksi user: "Pindahkan
          semua judul kedalam card") — sebelumnya SectionLabel render sbg Box
          terpisah DI LUAR card chart, sama bug class yang sudah diperbaiki
          utk M7 (lihat komentar `headerContent` BarChartWidget.tsx). Pola
          SAMA PERSIS M7ExpansionGrowth.tsx: 1 Card membungkus judul + Grid
          chart/Top 5 sekaligus. */}
      <Card>
      <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <SectionLabel label={t('customerMetrics.m3.sectionLabel')} icon={MonetizationOnIcon} />
        <MuiTooltip
          title={t('customerMetrics.m3.tooltipInfo')}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : (
            <ComboChartWidget
              // Stacked bar (2026-08-25, task029.md §36, instruksi user:
              // "Ganti cart m3 menjadi stack bar cart, bar utuh untuk total
              // revenue, bar dalam untuk high margin value") — barKey
              // (bawah) = non_hm_revenue (DERIVED, total - HM), bar2Key
              // (atas) = hm_revenue mentah. Stacking keduanya balik ke
              // total_revenue_existing, jadi tinggi bar keseluruhan TETAP
              // "total revenue" persis sebelumnya, cuma sekarang porsi HM
              // kelihatan LANGSUNG sbg segmen Rupiah, bukan cuma garis %
              // terpisah (line3/hm_pct DIHAPUS, digantikan visual bar ini).
              data={trendWithNonHm}
              barKey="non_hm_revenue"
              barLabel={t('customerMetrics.m3.barLabel')}
              barColor={theme.palette.primary.main}
              bar2Key="hm_revenue"
              bar2Label={t('customerMetrics.m3.bar2LabelHm')}
              // bar2Color (2026-08-25, koreksi user: "jangan terlalu
              // kontras orange, bisa gunakan hijau lebih muda... warna ini
              // selalu berganti tergantung palet jadi jangan hardcode") —
              // GANTI dari theme.palette.warning.main (warna semantik
              // FIXED, tidak ikut palet) ke PALETTES[paletteKey].secondary
              // (token yang MEMANG didesain utk "Bar 2" chart 2-bar,
              // lihat komentar di palettes.ts — otomatis beda tiap palet,
              // mis. hijau muda di palet "Executive Green").
              bar2Color={PALETTES[paletteKey].secondary[mode]}
              stacked
              // lineVariant="area" (2026-08-25, instruksi user: "Rubah
              // average menjadi area chart") — warna TETAP lineTemplate.line1
              // (SUDAH palette-aware sejak awal, kebetulan cyan di palet
              // default "Enterprise Blue" — tidak perlu diganti, sudah
              // otomatis ikut palet).
              lineKey="avg_revenue"
              lineLabel={t('customerMetrics.m3.lineLabelAvg')}
              lineColor={lineTemplate.line1}
              lineVariant="area"
              line2Key="median_revenue"
              line2Label={t('customerMetrics.m3.lineLabelMedian')}
              line2Color={lineTemplate.line2}
              // line2Variant="area" (2026-08-25, susulan instruksi user:
              // "line median juga bagus jika dijadikan area cart") — warna
              // TETAP lineTemplate.line2 (palette-aware sejak awal). Render
              // Area TIDAK pernah dashed (beda dari Line), jadi otomatis
              // solid — line2Dash (dulu dipakai utk minta "median line
              // solid" sblm Area ini) sekarang tidak relevan lagi, tidak
              // perlu dikirim.
              line2Variant="area"
              concentrationKey="top_customer_pct"
              concentrationThreshold={25}
              concentrationColor={concentrationColor}
              xKey="month"
              height={280}
              xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
              formatBar={(v) => fmtRp(v)}
              formatLine={(v) => fmtRp(v)}
              renderTooltip={(props) => <M3Tooltip {...props} periodType={periodType} />}
              onBarClick={(d) => {
                const month = String(d.month ?? '');
                const range = getPeriodDateRange(periodType, month);
                setDrillMonth(month);
                setDrillDateFrom(range.start);
                setDrillDate(clampPeriodEndToToday(periodType, month, range.end));
              }}
              headerContent={periodEnd ? (
                <KpiHeader
                  current={last?.total_revenue_existing ?? 0}
                  yoy={yoyLast?.total_revenue_existing ?? 0}
                  kpiType="value"
                  formatValue={fmtRp}
                  currentPeriodLabel={currentPeriodLabel}
                  comparisonLabel={yoyComparisonLabel}
                />
              ) : undefined}
              // footerContent (2026-08-25, koreksi user: "Pindahkan dibawah
              // legend") — legend concentrationKey ini SEBELUMNYA dirender
              // sbg Box sibling SETELAH <ComboChartWidget>, jadi visualnya
              // di LUAR border/background Card widget chart (sama bug class
              // headerContent yang sudah diperbaiki 2026-08-22). Sekarang
              // dirender DI DALAM Card, tepat di bawah legend recharts.
              footerContent={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2.5 }, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">{t('customerMetrics.m3.legendNormal')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: concentrationColor, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('customerMetrics.m3.legendConcentrated')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          )}
        </Grid>

        {/* Top 5 (2026-08-25) + tombol "Cek Detail di Laporan" — pola SAMA
            PERSIS M1/M6/M8. */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          {isLoading || currentBreakdownLoading ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (
            <Box>
              <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SectionLabel label={t('customerMetrics.m3.topCustomersLabel')} />
                <MuiTooltip
                  title={t('customerMetrics.m3.topCustomersInfo')}
                  placement="top"
                  arrow
                  slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                >
                  <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </MuiTooltip>
              </Box>
              <TopMoversTimeline items={top5Items} emptyMessage={t('customerMetrics.m3.emptyMessage')} />
            </Box>
          )}
          {!(isLoading || currentBreakdownLoading) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/report/revenue?tab=revenue')}
                sx={{ textTransform: 'none', fontSize: 12 }}
              >
                {t('customerMetrics.m3.viewDetailInReport')}
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>
      </Box>
      </Card>

      {/* Revenue Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => { setDrillDate(null); setDrillDateFrom(null); setDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m3.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Standar layout drilldown (2026-08-25, task029.md §33) — title cuma
        // nama entitas, subtitle baris pertama = periode (formatPeriodRangeSub,
        // granularitas-aware).
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {drillMonth && drillDateFrom && drillDate ? formatPeriodRangeSub(t, periodType, drillMonth, drillDateFrom, drillDate) : ''}
            </Typography>
            {/* 2 kolom (2026-08-25, instruksi user: "pindahkan ke sebelah
                kanan") — kolom kiri 4 baris utama (revenue/existing/avg/
                median), kolom kanan 2 baris High Margin (dipindah dari
                stack vertikal tunggal, mengisi ruang kosong di kanan). */}
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {([
                  [t('customerMetrics.m3.dialogRevenueExisting'), formatRupiah(breakdown.total_revenue)],
                  [t('customerMetrics.m3.dialogTotalExisting'),    breakdown.total_existing.toLocaleString('id-ID')],
                  [t('customerMetrics.m3.dialogAvgRevenue'),       formatRupiah(breakdown.total_existing > 0 ? breakdown.total_revenue / breakdown.total_existing : 0)],
                  [t('customerMetrics.m3.dialogMedianThreshold'),  formatRupiah(breakdown.median_threshold)],
                ] as [string, string][]).map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {([
                  [t('customerMetrics.m3.dialogHmContribution'),   formatRupiah(breakdown.hm_revenue)],
                  [t('customerMetrics.m3.dialogHmContributionPct'), `${breakdown.total_revenue > 0 ? ((breakdown.hm_revenue / breakdown.total_revenue) * 100).toFixed(1) : '0'}%`],
                ] as [string, string][]).map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
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
          mobileFields={['customer_name', 'revenue', 'revenue_pct', 'hm_revenue', 'hm_pct', 'tier']}
        />
      </Dialog>
    </Box>
  );
}
