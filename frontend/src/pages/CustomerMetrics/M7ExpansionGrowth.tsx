import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { Dialog, Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { useCustomerMetrics, useExpansionBreakdown } from '@/hooks/useMetrics';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';
// KpiCard reuse dari CrossSelling/HelperComponents.tsx (2026-08-23, layout
// standarisasi) — BUKAN duplikat baru; komponennya generik (label/value/sub/
// color), sudah dipakai M1/M2, jangan ditulis ulang di sini.
import { KpiCard } from '../CrossSelling/HelperComponents';
import { ExpansionChart } from './ExpansionChart';
import { useExpansionColumns } from './expansionHelpers';
import { formatRupiah } from '@/utils/format';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodRangeSub, getCurrentPeriodKey, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday, clampPeriodEndToDay, daysSincePeriodStart,
} from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';

// M7 versi tab Growth (2026-08-21, permintaan user "sekarang tab ekspansi,
// perbaiki layouting" — lanjutan rollout "M1 jadi standar layout semua
// KPI"). Komponen TERPISAH dari M7Expansion.tsx (BUKAN diganti tempatnya)
// — M7Expansion.tsx tetap dipakai apa adanya di halaman Customer Metrics
// workbench (M3-M7 ditumpuk 1 halaman tanpa KpiHeader/tab, biar konsisten
// sesama M3-M6 di sana). Versi ini KHUSUS tab Ekspansi halaman Growth (mode
// fokus 1 KPI, sama seperti M1CrossSelling.tsx/M2AvgCategory.tsx) — reuse
// ExpansionChart (chart) + useExpansionColumns (dialog drill-down) dari
// expansionHelpers.tsx, TIDAK duplikasi logic itu.
// `trend`/`isLoading` reuse fetch yang sama dgn CustomerMetrics workbench
// (1x fetch per halaman Growth, dioper dari Growth/index.tsx) — KpiHeader
// YoY-nya SAJA yang fetch terpisah sendiri (pola sama M2AvgCategory.tsx).
interface Props {
  trend: CustomerMetricsTrendPoint[];
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  periodEnd: string;
  /** Tanggal akhir periode SETELAH resolveTrendPeriod backend (elapsed-clamp/
   * apply_date_cutoff) — dipakai display kartu "Existing Customer" (2026-08-23,
   * bug: kartu ini sempat echo `periodEnd` mentah, beda dgn M1/M2 yang baca
   * tanggal hasil clamp backend). Default ke `periodEnd` kalau caller belum
   * kirim (mis. M7Expansion.tsx workbench, belum wired). */
  resolvedPeriodEnd?: string;
  /** Mode "Apply date cutoff" (2026-08-23) — dipakai drill-down (klik titik
   * chart) supaya popup ikut dipotong ke cutoff_day yang sama, bukan cuma
   * elapsed-clamp default (`clampPeriodEndToToday`). Default false biar
   * backward-compatible utk caller yang belum kirim. */
  applyDateCutoff?: boolean;
  /** Granularitas trend (task029.md §30.9, 2026-08-22) — default 'monthly'
   * biar backward-compatible utk caller yang belum kirim (tidak ada saat
   * ini, tapi jaga-jaga). */
  periodType?: PeriodGranularity;
  excludeIntercompany?: boolean;
  onlyPareto?: boolean;
}

export function M7ExpansionGrowth({ trend, isLoading, companyId, branchId, division, periodEnd, resolvedPeriodEnd, applyDateCutoff = false, periodType = 'monthly', excludeIntercompany, onlyPareto }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  // snapshot=true (2026-08-23, task029.md §31) — popup drill-down di
  // halaman chart ini snapshot murni, tanpa kolom pembanding (itu tempatnya
  // di halaman Laporan, lihat komentar `useExpansionColumns`).
  const expansionColumns = useExpansionColumns(t, true);

  const current = trend[trend.length - 1];

  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  // cutoffDay = hari ke-N SEJAK AWAL PERIODE AKTIF (2026-08-23, fix bug
  // granularitas non-bulanan — laporan user: cutoff "13 Agustus" di Kuartal/
  // Semester/Tahun malah menarik 1-13 Juli/Januari krn dulu pakai `pd`
  // mentah). Dihitung SEKALI di sini, dipakai click-handler drill-down
  // (bukan `pd` langsung).
  const cutoffDay = daysSincePeriodStart(getPeriodDateRange(periodType, periodKey).start, periodEnd);
  const yoyPeriodKey = getYoyPeriodKey(periodType, periodKey);
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  const currentPeriodLabel = formatPeriodLabel(t, periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(t, periodType, yoyPeriodKey);

  // Header Current/YoY — fetch terpisah, endpoint sama cuma period_end
  // digeser -1 tahun (pola sama persis M2AvgCategory.tsx).
  const { data: yoyData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const yoyCurrent = yoyData?.trend[yoyData.trend.length - 1];

  // ─── Drill-down (klik titik chart) ───────────────────────────────────────
  // `drillDateFrom` (2026-08-23, bug class sama dgn M2 useCrossSellingDetail:
  // "sudah sesuai filtering juga?") — tanpa date_from, fetchExpansionBreakdown
  // fallback ke window activeMonths lama (mis. 1 bulan mundur) dari drillDate,
  // BUKAN rentang penuh bucket granularitas yang diklik (kuartal/semester/
  // tahun). date_from = awal bucket yang diklik (getPeriodDateRange(...).start).
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [drillDateFrom, setDrillDateFrom] = useState<string | undefined>(undefined);
  // drillMonth (2026-08-25, susulan koreksi user di M1 — dialog subtitle
  // butuh label periode NATURAL titik yang diklik, pola sama persis
  // M2AvgCategory.tsx).
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const { data: drillBreakdown, isLoading: drillLoading } = useExpansionBreakdown({
    period_end: drillDate,
    date_from: drillDateFrom,
    period_type: periodType,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  // Top Movers (tab Overview) — breakdown periode SAAT INI (bukan klik),
  // ambil 5 kenaikan revenue terbesar (data sudah terurut cur-prev DESC
  // dari backend, tinggal slice 5 teratas). date_from = awal periode saat
  // ini (periodKey), pola sama drill-down di atas. period_end pakai
  // resolvedPeriodEnd (2026-08-23, susulan fix kartu "Existing Customer" di
  // atas) — bukan periodEnd mentah, supaya ikut cutoff_day yang sama dgn
  // bagian lain, bukan echo tanggal filter apa adanya.
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useExpansionBreakdown({
    period_end: resolvedPeriodEnd ?? periodEnd,
    date_from: getPeriodDateRange(periodType, periodKey).start,
    period_type: periodType,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const topMovers = useMemo(() => (currentBreakdown?.rows ?? []).slice(0, 5), [currentBreakdown]);

  // Timeline "Top 5" di samping chart (2026-08-23, layout standarisasi —
  // pola sama persis M1/M2, pakai TopMoversTimeline shared component,
  // BUKAN lagi list StatusChip full-width di bawah). Ikon/warna 4-way
  // (up/flat/down/inactive) — reuse warna semantik yang sama dgn
  // `statusChipColor` (expansionHelpers.tsx: up=success, down=error,
  // inactive=warning, flat=default/disabled), diterjemahkan ke ikon tren.
  const topMoverItems: TopMoverItem[] = topMovers.map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: formatRupiah(r.cur_revenue),
    icon: r.status === 'up' ? TrendingUpIcon : r.status === 'down' ? TrendingDownIcon : TrendingFlatIcon,
    iconColor: r.status === 'up' ? theme.palette.success.main
      : r.status === 'down' ? theme.palette.error.main
      : r.status === 'inactive' ? theme.palette.warning.main
      : theme.palette.text.disabled,
  }));

  // Search+Sort+tabel breakdown penuh (dulu di sini, lihat comment di atas
  // <Tabs> di bawah) DIPINDAH ke Laporan > Growth (2026-08-22, koreksi user
  // "terlalu kotor jika chart digabung dengan tabel") — `pages/Report/
  // Growth/index.tsx`. `currentBreakdown`/`topMovers` di atas TETAP dipakai
  // (Top Movers tab Overview, bukan bagian yang dipindah).

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Layout standar (2026-08-23, instruksi user: "buat layout
            standarisasinya" — pola SAMA PERSIS M1CrossSelling.tsx/
            M2AvgCategory.tsx): 3 kartu KPI di ATAS card (bukan grid 5-kartu
            terpisah di bawah lagi), lalu 1 Card berisi Header (judul) ->
            Body (KpiHeader + grid chart 7fr/timeline Top-5 3fr) — divider
            antara judul dan body DIHAPUS (2026-08-24, koreksi user).
            Footer TrendSummary DIHAPUS (M1/M2 juga sudah tidak pakai lagi).
            3 kartu KPI dipilih: Naik & Turun (2 rate paling actionable,
            sudah jadi fokus KpiHeader di atas chart) + Existing Customer
            (populasi basis, pola sama "Active Customers" M1/M2) — Stabil/
            Tidak Aktif tetap terlihat lewat segmen abu di chart + tooltip
            per-bar, tidak hilang, cuma tidak lagi py kartu headline sendiri. */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m7.summaryUpRate')}
                value={`${(current?.up_rate ?? 0).toFixed(1)}%`}
                sub={t('customerMetrics.m7.customerCountValue', { count: (current?.up_count ?? 0).toLocaleString('id-ID') })}
                color={theme.palette.success.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m7.summaryDownRate')}
                value={`${(current?.down_rate ?? 0).toFixed(1)}%`}
                sub={t('customerMetrics.m7.customerCountValue', { count: (current?.down_count ?? 0).toLocaleString('id-ID') })}
                color={theme.palette.error.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m7.summaryExisting')}
                // existing_not_dormant_count (2026-08-25, task029.md
                // §34-lanjutan), BUKAN lagi existing_customers kumulatif —
                // harus konsisten dgn pembagi 4-way split di bawah (Naik/
                // Flat/Turun/Tidak Aktif harus sum ke 100% dari populasi
                // yang SAMA dgn kartu ini, kalau tidak angka "Total
                // Existing" tidak nyambung dgn breakdown-nya sendiri).
                value={(current?.existing_not_dormant_count ?? 0).toLocaleString('id-ID')}
                // formatPeriodRangeSub (2026-08-25, koreksi KERAS user di M1,
                // pola sama diterapkan di sini) — granularitas lebar
                // tampilkan label ("Kuartal 3 Tahun 2026"), bukan tanggal.
                sub={formatPeriodRangeSub(t, periodType, periodKey, getPeriodDateRange(periodType, periodKey).start, resolvedPeriodEnd ?? periodEnd)}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
        </Grid>

        <Card>
          <Box sx={{ p: 2.5 }}>
            {/* Chip "Klik untuk lihat detail" DIHAPUS (2026-08-24, koreksi
                user: "ganti sepenuhnya didalam tooltip cart" — chip
                permanen di header rawan diabaikan/makan tempat mobile,
                hint klik dipindah ke dalam ExpansionTooltip
                (ExpansionChart.tsx), muncul persis saat user sudah
                hover/tap titik chart). */}
            {/* Ikon info + rumus (2026-08-25, koreksi user: "Tambahkan di
                tooltip setiap info di card untuk rumus perhitungan nya") —
                SEBELUMNYA halaman Growth (versi standar §30.23) TIDAK
                punya ikon info sama sekali di judul chart utama, beda dari
                M1/M3/M4/M5/M6 yang semua sudah konsisten punya. Key
                `customerMetrics.m7.tooltipInfo` SUDAH ADA tapi cuma
                dipakai di M7Expansion.tsx (halaman workbench lama) —
                sekarang dipakai juga di sini, reuse bukan duplikat baru. */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SectionLabel label={t('metrics.expansion')} icon={TrendingUpIcon} />
              <MuiTooltip
                title={t('customerMetrics.m7.tooltipInfo')}
                placement="top"
                arrow
                slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
              >
                <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                  <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </MuiTooltip>
            </Box>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {/* CSS Grid manual (sx display:'grid') DIGANTI komponen `<Grid>`
                MUI (2026-08-24, instruksi user: "gabisa pakai grid col
                responsive? pakai context7" — dicek dokumentasi resmi MUI,
                pola `<Grid container><Grid size={{xs,md}}>` sudah dipakai
                konsisten di seluruh proyek ini, BUKAN CSS Grid tulisan
                tangan via sx yang berulang kali bermasalah di mobile). */}
            <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={320} />
            ) : (
              <ExpansionChart
                trend={trend}
                height={320}
                periodType={periodType}
                showHeader={false}
                // headerContent (2026-08-24, koreksi user: "masukkan header
                // cart ke dalam box cart") — KpiHeader dulu render sbg
                // sibling SEBELUM Grid, jadi visualnya di LUAR border/
                // background Card widget chart. Sekarang dikirim lewat
                // prop `headerContent` (BarChartWidget baru dapat prop ini,
                // pola sama persis ComboChartWidget M1/M2), dirender DI
                // DALAM Card widget chart itu sendiri.
                headerContent={
                  <KpiHeader
                    current={current?.up_rate ?? 0}
                    yoy={yoyCurrent?.up_rate ?? 0}
                    kpiType="rate"
                    currentPeriodLabel={currentPeriodLabel}
                    comparisonLabel={yoyComparisonLabel}
                  />
                }
                onBarClick={(d) => {
                  const month = String(d.month ?? '');
                  const range = getPeriodDateRange(periodType, month);
                  setDrillMonth(month);
                  setDrillDate(
                    applyDateCutoff
                      ? clampPeriodEndToDay(periodType, month, range.start, range.end, cutoffDay)
                      : clampPeriodEndToToday(periodType, month, range.end),
                  );
                  setDrillDateFrom(range.start);
                }}
              />
            )}
            </Grid>

            {/* display:flex + flexDirection:'column' (2026-08-24, instruksi
                user: "tombol Cek Detail pojok kanan bawah tanpa merusak
                layout") — pola sama persis M1/M2: align-items:stretch
                default MUI Grid v2 SUDAH menyamakan tinggi kolom ini
                dengan kolom chart di desktop (md+), mt:'auto' di Box
                tombol tinggal manfaatkan sisa ruang itu. Tidak menyentuh
                tinggi chart sama sekali (height chart fixed piksel). */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {isLoading || currentBreakdownLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('customerMetrics.m7.overviewTopMoversLabel')} />
                    <MuiTooltip
                      title={t('crossSelling.topCustomersComparisonInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <TopMoversTimeline items={topMoverItems} emptyMessage={t('customerMetrics.m7.emptyMessage')} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      onClick={() => navigate('/report/growth?tab=expansion')}
                      sx={{ textTransform: 'none', fontSize: 12 }}
                    >
                      {t('crossSelling.viewDetailInReport')}
                    </Button>
                  </Box>
                </>
              )}
            </Grid>
            </Grid>
          </Box>
        </Card>
      </Box>

      {/* Expansion Breakdown Dialog — klik titik chart (fitur sama persis
          M7Expansion.tsx, direuse via useExpansionColumns) */}
      <Dialog
        open={!!drillDate}
        onClose={() => { setDrillDate(null); setDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m7.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Standar layout drilldown (2026-08-23, koreksi user: "pisahkan
        // judul dan periode ini" — title cuma nama entitas, subtitle baris
        // pertama = rentang tanggal SEBENARNYA yang dipakai query
        // (drillDateFrom..drillDate, bukan cuma nama periode), pola sama
        // persis dialog drill-down M1.1/M2.
        //
        // formatPeriodRangeSub (2026-08-25, koreksi KERAS user di M1) —
        // granularitas lebar tampilkan label ("Kuartal 3 Tahun 2026"),
        // bukan rentang tanggal mentah.
        subtitle={drillBreakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {drillMonth && drillDateFrom && drillDate ? formatPeriodRangeSub(t, periodType, drillMonth, drillDateFrom, drillDate) : ''}
            </Typography>
            {([
              // .toLocaleString('id-ID') (2026-08-25, koreksi user: "gunakan
              // . untuk ribuan") — sebelumnya String() mentah tanpa pemisah
              // ribuan (mis. "14208"), tidak konsisten dgn kartu ringkasan
              // di atas yang sudah pakai toLocaleString('id-ID').
              [t('customerMetrics.m7.dialogUpCount'),         drillBreakdown.up_count.toLocaleString('id-ID')],
              // Total Customer Active (2026-08-25, susulan user: "info
              // drilldown total customer active") — cur_revenue > 0, beda
              // dari dialogUpCount (mensyaratkan naik vs periode
              // sebelumnya) — murni "genuinely bertransaksi periode ini".
              [t('customerMetrics.m7.dialogActiveCount'),     drillBreakdown.active_count.toLocaleString('id-ID')],
              [t('customerMetrics.m7.dialogTotalExisting'),   drillBreakdown.total_existing.toLocaleString('id-ID')],
              [t('customerMetrics.m7.dialogUpRate'),          `${drillBreakdown.total_existing > 0 ? ((drillBreakdown.up_count / drillBreakdown.total_existing) * 100).toFixed(1) : '0.0'}%`],
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
          rows={(drillBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={expansionColumns}
          loading={drillLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m7.emptyMessage')}
          mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
        />
      </Dialog>
    </Box>
  );
}
