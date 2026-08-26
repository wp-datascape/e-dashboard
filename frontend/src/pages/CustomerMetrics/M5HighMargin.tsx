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
import StarIcon from '@mui/icons-material/Star';
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
import { useHmBreakdown } from '@/hooks/useMetrics';
import { useThemeMode } from '@/theme/theme.context';
import { PALETTES } from '@/theme/palettes';
import { formatRupiah } from '@/utils/format';
import { formatPeriodLabel, formatPeriodLabelShort, formatPeriodRangeSub, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from './HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useHmColumns } from './valueHelpers';

// Tooltip custom (2026-08-25, task029.md §36 — chart Donut snapshot diganti
// trend 12 titik, instruksi user: "chart nya buat jadi 12 titik tren seperti
// cart lain") — pola SAMA PERSIS M3Tooltip (ChartTooltipCard shared).
function M5Tooltip({ active, payload, periodType }: TooltipContentProps<number, string> & { periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;

  const rows = [
    { label: t('customerMetrics.m5.rowTotalExisting'), value: d.existing_customers.toLocaleString('id-ID') },
    { label: t('customerMetrics.m5.rowBuyerCount'), value: d.high_margin_buyer_count.toLocaleString('id-ID') },
    { label: t('customerMetrics.m5.rowPenetration'), value: `${d.high_margin_ratio}%` },
  ];

  return (
    <ChartTooltipCard
      title={formatPeriodLabelShort(t, periodType, d.month)}
      rows={rows}
      hint={t('customerMetrics.m5.tooltipClickHint')}
    />
  );
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  /** Trend YoY (2026-08-25) — dipakai KpiHeader, di-fetch TERPUSAT di
   * Value/index.tsx (1 sumber dibagi M3/M4/M5), pola sama M3/M4. */
  yoyTrend?: CustomerMetricsTrendPoint[]
  isLoading: boolean
  /** Granularitas trend (2026-08-25, task029.md §33). Default 'monthly'
   * kalau caller belum wired (CustomerMetrics workbench). */
  periodType?: PeriodGranularity
  /** Tanggal akhir periode filter halaman — dipakai label KpiHeader,
   * opsional supaya caller lama (workbench) aman tanpa prop ini. */
  periodEnd?: string
  applyDateCutoff?: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
  onlyPareto?: boolean
}

export function M5HighMargin({ trend, yoyTrend = [], isLoading, periodType = 'monthly', companyId, branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const theme = useTheme();
  // paletteKey/mode (2026-08-25, task029.md §36, instruksi user: "High
  // margin penetration perbaiki warnanya" — pola SAMA PERSIS koreksi M3
  // sebelumnya) — dipakai bar2Color/lineColor di bawah, GANTI dari
  // theme.palette.warning.main/info.main (warna semantik FIXED, tidak
  // ikut palet) ke token PALETTES yang otomatis beda tiap palet user.
  const { palette: paletteKey, isDark } = useThemeMode();
  const mode = isDark ? 'dark' : 'light';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hmDrillDate, setHmDrillDate] = useState<string | null>(null);
  const [hmDrillDateFrom, setHmDrillDateFrom] = useState<string | null>(null);
  const [hmDrillMonth, setHmDrillMonth] = useState<string | null>(null);
  // showPct:false (2026-08-25, task029.md §36, instruksi user: "Jangan
  // ditampilkan, karena di drildown tidak ada revenue... Tampilkan di tabel
  // laporan saja") — kolom "% Total HM" (basis Revenue) disembunyikan
  // KHUSUS di dialog drilldown ini, TETAP tampil di Report/Revenue (tab HM,
  // default showPct=true, tidak disentuh).
  const hmColumns = useHmColumns(t, { showPct: false });

  // not_bought (2026-08-25) — bar bawah stacked, DERIVED (existing_customers -
  // high_margin_buyer_count), pola SAMA PERSIS M2AvgCategory.tsx
  // (single_category = total_active - multi_product) — supaya stacking bar
  // bawah+atas jumlahnya balik ke existing_customers (total), bukan dobel
  // hitung (high_margin_buyer_count SUDAH subset dari existing_customers).
  const trendWithNotBought = trend.map((d) => ({
    ...d,
    not_bought_count: d.existing_customers - d.high_margin_buyer_count,
  }));

  // Top 5 (2026-08-25, pola sama persis M3/M4) — breakdown periode PALING
  // BARU di trend, date_from = awal bucket granularitas yang sedang aktif.
  const latestMonth = trend.length > 0 ? trend[trend.length - 1].month : null;
  const currentPeriodStart = latestMonth ? getPeriodDateRange(periodType, latestMonth).start : undefined;
  const currentPeriodEnd = latestMonth
    ? clampPeriodEndToToday(periodType, latestMonth, getPeriodDateRange(periodType, latestMonth).end)
    : null;
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useHmBreakdown({
    period_end: currentPeriodEnd,
    date_from: currentPeriodStart,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  // Ranking (task029.md §36, koreksi user: "Top 5 itu harusnya jumlah
  // terbanyak bukan value nya") — GANTI dari hm_revenue (Rupiah) ke hm_qty
  // (unit produk HM terjual) — rows dari backend SUDAH terurut hm_qty DESC,
  // slice(0,5) di sini cukup ambil urutan yang sudah benar.
  const top5Items: TopMoverItem[] = (currentBreakdown?.rows ?? []).slice(0, 5).map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: `${r.hm_qty.toLocaleString('id-ID')} unit`,
    icon: StarIcon,
    iconColor: theme.palette.warning.main,
  }));

  const { data: hmBreakdown, isLoading: hmBreakdownLoading } = useHmBreakdown({
    period_end: hmDrillDate,
    date_from: hmDrillDateFrom ?? undefined,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  // KpiHeader current-vs-YoY (2026-08-25) — pola sama persis M3/M4, current
  // = titik terakhir trend, yoy = titik terakhir yoyTrend.
  const last = trend.at(-1);
  const yoyLast = yoyTrend.at(-1);
  const periodKey = latestMonth ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';
  const periodPhrase = (latestMonth && currentPeriodStart && currentPeriodEnd)
    ? formatPeriodRangeSub(t, periodType, latestMonth, currentPeriodStart, currentPeriodEnd)
    : '';

  return (
    <>
      <Box>
        {/* 3 kartu ringkasan — pola sama persis M3/M4, semua dari `last`
            (titik terakhir trend), BUKAN dari currentBreakdown lagi (yang
            sekarang murni sumber Top 5). */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryPenetration')}
                value={`${last?.high_margin_ratio ?? 0}%`}
                sub={periodPhrase}
                color={theme.palette.success.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryBuyerCount')}
                value={(last?.high_margin_buyer_count ?? 0).toLocaleString('id-ID')}
                sub={periodPhrase}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryExisting')}
                value={(last?.existing_customers ?? 0).toLocaleString('id-ID')}
                sub={periodPhrase}
                color={theme.palette.primary.main}
                info={t('customerMetrics.m5.summaryExistingInfo')}
              />
            )}
          </Grid>
        </Grid>

        <Card>
        <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m5.sectionLabel')} icon={StarIcon} />
          <MuiTooltip
            title={t('customerMetrics.m5.tooltipInfo')}
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
                data={trendWithNotBought}
                barKey="not_bought_count"
                barLabel={t('customerMetrics.m5.notBoughtLabel')}
                // barColor (2026-08-26, koreksi user: "pakai warna lain di
                // palet, aku ingat ada konfigurasi kombinasi warna utk
                // chart/bar/line" — percobaan sebelumnya (grey solid
                // `theme.palette.text.disabled`) memang bukan lagi
                // "berbaur ke background", TAPI itu token generik MUI, BUKAN
                // dari matrix warna chart aplikasi (`PALETTES`). Diselaraskan
                // ke pola BAR STACKED yang SUDAH ADA di M3 (§36.2b):
                // bar=primary (porsi mayoritas/dasar), bar2=secondary (porsi
                // highlight) — bukan "abu-abu = tidak penting", tapi
                // "primary = bar utama, secondary = bar sorotan", sama pola
                // yg dipakai non_hm_revenue/hm_revenue M3.
                barColor={theme.palette.primary.main}
                bar2Key="high_margin_buyer_count"
                bar2Label={t('customerMetrics.m5.boughtLabel')}
                // bar2Color (2026-08-26, DIKEMBALIKAN — ronde "line2" di atas
                // SALAH, ditegur keras user: "SETIAP PALET cart ITU
                // TERGANTUNG DENGAN THEME YANG DITERAPKAN, BUKAN LU HARDCODE
                // ... aku sudah buat masing masing palet aksen punya
                // kombinasi warna chart masing masing, bukan lu yang
                // nentuin sendiri, baca dokumentasi". `line1`/`line2`/`line3`
                // didokumentasikan di `palettes.ts` KHUSUS utk LINE ("Warna 3
                // line di chart M3... tiap line dipilih kontras terhadap
                // warna BAR (primary)") — bukan pool warna bebas-pakai utk
                // BAR. `secondary` SUDAH didokumentasikan eksplisit sbg
                // warna "Bar 2" ("secondary dipakai juga sebagai warna
                // 'Bar 2' di chart 2-bar") — itu tokennya, bukan line2.
                // Kombinasi primary(bar)+secondary(bar2)+line1(garis) INI
                // pola yg sama persis dipakai M3 (bar/bar2 primary/secondary,
                // line1/line2 utk 2 garisnya) — tidak monoton di M3 karena
                // garisnya beda hue dari bar, bukan karena bar2 dipaksa beda
                // hue dari bar. Dikembalikan ke `secondary`.
                bar2Color={PALETTES[paletteKey].secondary[mode]}
                stacked
                lineKey="high_margin_ratio"
                lineLabel={t('customerMetrics.m5.centerLabel')}
                lineColor={PALETTES[paletteKey].line1[mode]}
                formatLine={(v) => `${v}%`}
                xKey="month"
                height={280}
                xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                renderTooltip={(props) => <M5Tooltip {...props} periodType={periodType} />}
                onBarClick={(d) => {
                  const month = String(d.month ?? '');
                  const range = getPeriodDateRange(periodType, month);
                  setHmDrillMonth(month);
                  setHmDrillDateFrom(range.start);
                  setHmDrillDate(clampPeriodEndToToday(periodType, month, range.end));
                }}
                headerContent={yoyLast ? (
                  <KpiHeader
                    current={last?.high_margin_ratio ?? 0}
                    yoy={yoyLast.high_margin_ratio}
                    kpiType="rate"
                    currentPeriodLabel={currentPeriodLabel}
                    comparisonLabel={yoyComparisonLabel}
                  />
                ) : undefined}
              />
            )}
          </Grid>

          {/* Top 5 + tombol "Cek Detail di Laporan" */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
            {isLoading || currentBreakdownLoading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Box>
                <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SectionLabel label={t('customerMetrics.m5.topCustomersLabel')} />
                  <MuiTooltip
                    title={t('customerMetrics.m5.topCustomersInfo')}
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                  >
                    <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <TopMoversTimeline items={top5Items} emptyMessage={t('customerMetrics.m5.emptyMessage')} />
              </Box>
            )}
            {!(isLoading || currentBreakdownLoading) && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/report/revenue?tab=hm')}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  {t('customerMetrics.m5.viewDetailInReport')}
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
        </Box>
        </Card>
      </Box>

      {/* HM Breakdown Dialog */}
      <Dialog
        open={!!hmDrillDate}
        onClose={() => { setHmDrillDate(null); setHmDrillDateFrom(null); setHmDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m5.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={hmBreakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {hmDrillMonth && hmDrillDateFrom && hmDrillDate ? formatPeriodRangeSub(t, periodType, hmDrillMonth, hmDrillDateFrom, hmDrillDate) : ''}
            </Typography>
            {([
              [t('customerMetrics.m5.dialogTotalExisting'), hmBreakdown.total_existing.toLocaleString('id-ID')],
              [t('customerMetrics.m5.dialogBought'), hmBreakdown.hm_buyer_count.toLocaleString('id-ID')],
              [t('customerMetrics.m5.dialogPenetration'), `${hmBreakdown.total_existing > 0 ? ((hmBreakdown.hm_buyer_count / hmBreakdown.total_existing) * 100).toFixed(1) : '0'}%`],
              [t('customerMetrics.m5.dialogRevenue'), formatRupiah(hmBreakdown.total_hm_revenue)],
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
          rows={(hmBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={hmColumns}
          loading={hmBreakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m5.emptyMessage')}
          mobileFields={['customer_name', 'hm_qty', 'hm_revenue']}
        />
      </Dialog>
    </>
  );
}
