import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { useRorBreakdown, useCustomerMetrics } from '@/hooks/useMetrics';
import { formatPeriodLabelShort, formatPeriodLabel, formatPeriodRangeSub, getCurrentPeriodKey, getYoyPeriodKey, shiftDateByYears, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import { useTheme } from '@mui/material/styles';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from './HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useRorColumns } from './rorHelpers';

// Tooltip custom (2026-08-24, instruksi user: "Lengkapi tooltip pakai
// tooltip custom") — pola sama persis M1/M2/M7/HeatmapWidget, ChartTooltipCard
// atomic, hint klik dipindah ke sini (sebelumnya di subtitle chart, sekarang
// dihapus dari situ, lihat komentar di render utama).
function M6Tooltip({ active, payload, thresholdPct, periodType }: TooltipContentProps<number, string> & { thresholdPct: number; periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as { month: string; repeat_order_rate: number };

  return (
    <ChartTooltipCard
      title={t('customerMetrics.m6.tooltipTitle', { month: formatPeriodLabelShort(t, periodType, d.month) })}
      rows={[
        { label: t('customerMetrics.m6.lineLabel'), value: `${d.repeat_order_rate.toFixed(1)}%` },
        { label: t('customerMetrics.m6.thresholdLabel', { thresholdPct }), value: `${thresholdPct}%` },
      ]}
      hint={t('customerMetrics.m6.tooltipClickHint')}
    />
  );
}

interface Props {
  isLoading: boolean
  value: number
  thresholdPct: number
  /** Trend 12 bulan (2026-08-24, instruksi user: "Rubah cart menjadi trend
   * 12 titik seperti yang lainnya" — sebelumnya M6 cuma snapshot 1 titik
   * via RadialBarWidget, padahal `repeat_order_rate` SUDAH ada di tiap
   * titik trend `useCustomerMetrics` (dipakai M3-M7 juga), cuma belum
   * diteruskan ke sini). Opsional — kalau tidak dikirim, chart kosong
   * (tidak crash), caller lama tanpa trend tetap aman. */
  trend?: CustomerMetricsTrendPoint[]
  /** Granularitas trend (2026-08-24, instruksi user: "Terapkan filter global
   * juga disini" — susulan filter granularitas Growth diterapkan ke halaman
   * Retention juga). Default 'monthly' kalau caller belum wired. */
  periodType?: PeriodGranularity
  /** Tanggal akhir periode filter halaman (2026-08-24, ditegur keras user:
   * "sudah bilang Growth standar layout" — dipakai fetch YoY pembanding
   * header, pola SAMA PERSIS M7ExpansionGrowth.tsx). WAJIB kalau mau
   * header YoY tampil — opsional supaya caller lama (CustomerMetrics
   * workbench) tanpa prop ini tetap aman, cuma headernya kosong. */
  periodEnd?: string
  applyDateCutoff?: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
}

export function M6RepeatOrder({ isLoading, value, thresholdPct, trend = [], periodType = 'monthly', periodEnd, applyDateCutoff = false, companyId, branchId, division, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  // drillDateFrom (2026-08-24, koreksi user: "M6RepeatOrder.tsx SUDAH py
  // periodType, dipakai di Retention page yg SUDAH py filter granularitas
  // — klik titik chart di Kuartal/Semester/Tahun harus kirim awal bucket
  // yang diklik juga, bukan cuma akhirnya, biar populasi "existing" &
  // window agregat dialog SAMA dgn yang dipakai trend chart") — pola sama
  // persis M7's drillDateFrom/M8's drillStart.
  const [drillDateFrom, setDrillDateFrom] = useState<string | null>(null);
  // drillMonth (2026-08-25, susulan koreksi user di M1 — dialog subtitle
  // butuh label periode NATURAL titik yang diklik).
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const rorColumns = useRorColumns(t);

  // Top 5 (2026-08-24, instruksi user: "Tampilkan top 5") — breakdown
  // periode PALING BARU di trend (bukan cuma on-click spt dialog di bawah),
  // pola sama M1/M2/M7: selalu tampil di samping chart, bukan cuma muncul
  // setelah klik. `clampPeriodEndToToday`+`getPeriodDateRange` (bukan
  // `resolvePeriodEnd`, yang cuma paham "YYYY-MM" bulanan) — granularitas-
  // aware, benar utk quarter/semester/tahunan juga (2026-08-24, susulan
  // filter global diterapkan ke halaman Retention).
  const latestMonth = trend.length > 0 ? trend[trend.length - 1].month : null;
  const currentPeriodEnd = latestMonth
    ? clampPeriodEndToToday(periodType, latestMonth, getPeriodDateRange(periodType, latestMonth).end)
    : null;
  const currentPeriodStart = latestMonth ? getPeriodDateRange(periodType, latestMonth).start : undefined;
  // Sub-text kartu "TOTAL EXISTING CUSTOMER"/"CUSTOMER REPEAT ORDER"
  // (2026-08-24, instruksi user: "menu growth mencantumkan periodenya" —
  // pola sama persis M7, digeneralisasi granularitas-aware).
  const periodRangeSub = (latestMonth && currentPeriodStart && currentPeriodEnd)
    ? formatPeriodRangeSub(t, periodType, latestMonth, currentPeriodStart, currentPeriodEnd)
    : '';
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useRorBreakdown({
    period_end: currentPeriodEnd,
    date_from: currentPeriodStart,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });
  const top5 = (currentBreakdown?.rows ?? []).slice(0, 5);
  const top5Items: TopMoverItem[] = top5.map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: `${r.invoice_count}x`,
    icon: ReplayIcon,
    iconColor: theme.palette.primary.main,
  }));

  const { data: breakdown, isLoading: breakdownLoading } = useRorBreakdown({
    period_end: drillDate,
    date_from: drillDateFrom ?? undefined,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const isOnTarget = value >= thresholdPct;

  // Header perbandingan YoY (2026-08-24, ditegur keras user: "sudah bilang
  // Growth sebagai standar layout" — pola KpiHeader (current vs YoY + chip
  // delta) sudah ada di M7ExpansionGrowth.tsx, belum pernah disambung ke
  // M6. Fetch terpisah, endpoint sama cuma period_end digeser -1 tahun
  // (pola SAMA PERSIS M7/M2AvgCategory.tsx — REUSE, bukan tulis ulang).
  const [yoyPy, yoyPm, yoyPd] = (periodEnd ?? '').split('-').map(Number);
  const periodKey = periodEnd ? getCurrentPeriodKey(periodType, new Date(yoyPy, (yoyPm || 1) - 1, yoyPd || 1)) : '';
  const yoyPeriodEnd = periodEnd ? shiftDateByYears(periodEnd, -1) : undefined;
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';
  const { data: yoyData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: !!yoyPeriodEnd });
  const yoyCurrent = yoyData?.trend.at(-1);

  return (
    <>
      {/* 3 kartu ringkasan (2026-08-24, instruksi user: "Tambahkan 3 card
          sumary diatas card") — pola sama persis M1/M7: metrik utama
          (Repeat Order Rate) + 2 angka pendukung (basis populasi + jumlah
          repeat), semuanya dari data yang SUDAH di-fetch (breakdown periode
          terbaru, dipakai bareng Top 5 di atas — tidak fetch baru lagi). */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m6.summaryRate')}
              value={`${value}%`}
              sub={isOnTarget ? t('customerMetrics.m6.summaryOnTarget') : t('customerMetrics.m6.summaryOffTarget', { thresholdPct })}
              color={isOnTarget ? theme.palette.success.main : theme.palette.error.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {/* isLoading JUGA dicek di sini (2026-08-24, bug dilaporkan user:
              "2 card ini tidak pakai skeleton?" — screenshot: langsung
              tampil "0" bukan skeleton) — `currentBreakdownLoading` SENDIRIAN
              tidak cukup: query `useRorBreakdown` ini `enabled: !!currentPeriodEnd`,
              dan `currentPeriodEnd` diturunkan dari `trend` (kosong sebelum
              `isLoading` utama selesai) — selama query masih DISABLED,
              React Query baca `isLoading` sbg `false` (bukan "sedang
              loading", tapi "belum jalan sama sekali"), skeleton keliru
              dilewati, fallback `?? 0` yang kelihatan duluan. */}
          {isLoading || currentBreakdownLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m6.summaryExisting')}
              value={(currentBreakdown?.total_existing ?? 0).toLocaleString('id-ID')}
              sub={periodRangeSub}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading || currentBreakdownLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('customerMetrics.m6.summaryRepeatCount')}
              value={(currentBreakdown?.repeat_count ?? 0).toLocaleString('id-ID')}
              sub={periodRangeSub}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2.5 }}>
          {/* Judul dipindah dari LineAlertWidget (2026-08-24, instruksi user:
              "Hapus M6 · Repeat Order Rate — Bulan Berjalan, Ganti Repeat
              Order Rate — Tren 12 Bulan menjadi judul, berikan icon didepan
              judul seperti layout pada menu growth") — dulu ADA DUA judul
              (SectionLabel generik di luar + title chart sendiri di dalam),
              sekarang DISATUKAN jadi satu SectionLabel+icon, pola PERSIS
              M1/M7 (SwapHorizIcon/TrendingUpIcon). */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('customerMetrics.m6.chartTitle')} icon={ReplayIcon} />
            <MuiTooltip
              title={t('customerMetrics.m6.tooltipInfo')}
              placement="top"
              arrow
              slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
            >
              <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={280} />
              ) : (
                <LineAlertWidget
                  // title/subtitle TIDAK dikirim (2026-08-24) — judul sudah
                  // dipindah ke SectionLabel di atas, subtitle ("Target Min
                  // X% - Garis biru = realisasi bulanan - Klik untuk lihat
                  // daftar customer") DIHAPUS, digantikan legend bawaan
                  // widget (biru/merah) + hint klik di dalam tooltip custom
                  // di bawah.
                  data={trend}
                  lineKey="repeat_order_rate"
                  lineLabel={t('customerMetrics.m6.lineLabel')}
                  xKey="month"
                  threshold={thresholdPct}
                  thresholdLabel={t('customerMetrics.m6.thresholdLabel', { thresholdPct })}
                  // higherIsBetter (2026-08-25, koreksi user: "area atas
                  // target warna hijau, area bawah line target warna
                  // merah") — Repeat Order Rate "Target Min X%", makin
                  // TINGGI makin bagus (kebalikan Dormant Rate M8).
                  higherIsBetter
                  height={280}
                  variant="area"
                  yAxisMin={-5}
                  xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                  renderTooltip={(props) => <M6Tooltip {...props} thresholdPct={thresholdPct} periodType={periodType} />}
                  onPointClick={(d) => {
                    const month = String(d.month ?? '');
                    const range = getPeriodDateRange(periodType, month);
                    setDrillMonth(month);
                    setDrillDateFrom(range.start);
                    setDrillDate(clampPeriodEndToToday(periodType, month, range.end));
                  }}
                  // headerContent hanya kalau periodEnd dikirim (2026-08-24)
                  // — caller lama (CustomerMetrics workbench) belum kirim
                  // prop ini, biar tidak render KpiHeader kosong/rusak.
                  headerContent={periodEnd ? (
                    <KpiHeader
                      current={value}
                      yoy={yoyCurrent?.repeat_order_rate ?? 0}
                      kpiType="rate"
                      currentPeriodLabel={currentPeriodLabel}
                      comparisonLabel={yoyComparisonLabel}
                    />
                  ) : undefined}
                />
              )}
            </Grid>

            {/* display:flex+flexDirection:'column' (2026-08-24, ditegur user:
                "SUDAH LU KERJAIN>>>>" + screenshot pola M1) — info icon di
                judul Top 5 + tombol "Cek Detail di Laporan" pojok kanan
                bawah, pola SAMA PERSIS M1CrossSelling.tsx. */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {isLoading || currentBreakdownLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('customerMetrics.m6.overviewTopCustomersLabel')} />
                    <MuiTooltip
                      title={t('customerMetrics.m6.topCustomersInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <TopMoversTimeline items={top5Items} emptyMessage={t('customerMetrics.m6.emptyMessage')} />
                </Box>
              )}
              {!(isLoading || currentBreakdownLoading) && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/report/retention?tab=ror')}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    {t('customerMetrics.m6.viewDetailInReport')}
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* ROR Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => { setDrillDate(null); setDrillDateFrom(null); setDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m6.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Standar layout drilldown (2026-08-24, instruksi user: "periode
        // jadikan sebagai keterangan jangan judul, pindahkan dari judul" —
        // pola SAMA PERSIS dialog M1/M2/M7, title cuma nama entitas, subtitle
        // baris pertama = periode.
        //
        // formatPeriodRangeSub (2026-08-25, koreksi KERAS user di M1) —
        // granularitas lebar tampilkan label ("Kuartal 3 Tahun 2026"),
        // bukan rentang tanggal mentah.
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {drillMonth && drillDateFrom && drillDate ? formatPeriodRangeSub(t, periodType, drillMonth, drillDateFrom, drillDate) : ''}
            </Typography>
            {([
              [t('customerMetrics.m6.dialogTotalExisting'),     String(breakdown.total_existing)],
              [t('customerMetrics.m6.dialogRepeatCount'), String(breakdown.repeat_count)],
              [t('customerMetrics.m6.dialogRate'),           `${value}%`],
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
          columns={rorColumns}
          loading={breakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m6.emptyMessage')}
          mobileFields={['customer_name', 'invoice_count', 'total_revenue']}
        />
      </Dialog>
    </>
  );
}
