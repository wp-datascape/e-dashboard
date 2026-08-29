import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import MuiTooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
import { Card } from '@/components/ui';
import { ClickableChart } from '@/components/dashboard/ClickableChart';
import { useDashboard } from '@/hooks/useDashboard';
import { useCrossSellingSummary } from '@/hooks/useMetrics';
import { useCan } from '@/hooks/useCan';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { PeriodStrip } from '@/components/dashboard/PeriodStrip';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import { SectionLabel } from '@/pages/CrossSelling/HelperComponents';
import { formatIDR } from '@/utils/format';
import { formatPeriodLabelShort } from '@/utils/analisisPeriod';
import type { MetricCard } from '@/types/dashboard';

type Badge = { label: string; color: 'success' | 'error' | 'warning' | 'default' };

// Header custom tiap card chart kecil (2026-08-29, task029.md §49 — user:
// "pindahkan angka angkanya ke dalam card di atas, sejajar judul") — judul
// di kiri, angka+badge di kanan, 1 baris ("sejajar") — GANTI dari §48
// (angka polos di `StatItem` TERPISAH di luar/di atas card, chart cuma py
// title). Dipakai sbg `headerContent` SEMUA 9 widget chart (menggantikan
// title/subtitle bawaan widget) — RadialBarWidget/BulletChartWidget baru
// dapat prop `headerContent` di commit ini (sebelumnya cuma 4 widget lain
// yang punya).
function ChartCardHeader({ title, value, badge, info }: { title: string; value: string; badge?: Badge; info?: string }) {
  const badgeColor = badge ? (badge.color === 'default' ? 'text.secondary' : `${badge.color}.main`) : undefined;
  return (
    // `flexWrap:'nowrap'` di baris LUAR (2026-08-29, bug ditemukan user via
    // screenshot: "kenapa ini tidak sejajar judul?" — kartu High Margin
    // Penetration) — badge "poin persentase" dieja PENUH (§43, tidak boleh
    // disingkat "pp") jadi cukup panjang, digabung judul "High Margin
    // Penetration" (juga panjang) di kolom sempit 1/3 lebar, `flexWrap:
    // 'wrap'` LAMA bikin SELURUH baris (judul+angka) turun jadi 2 baris.
    // Fix: baris luar TIDAK PERNAH wrap (`nowrap`), yang boleh wrap cuma
    // JUDUL sendiri (`minWidth:0`+`flex:1`, teksnya bisa lipat ke baris ke-2
    // internal kalau kepanjangan) — angka+badge di kanan (`flexShrink:0`)
    // SELALU nempel sejajar baris pertama judul, tidak pernah ikut turun.
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'nowrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
        {info && (
          <MuiTooltip title={info} placement="top" arrow slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help', flexShrink: 0 }} />
          </MuiTooltip>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0, whiteSpace: 'nowrap' }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>{value}</Typography>
        {badge && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: badgeColor }}>
            {badge.label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Halaman Overview — card chart kecil, angka sejajar judul, clickable ──
//
// 2026-08-29 (task029.md §49) — REVISI dari §48 (angka polos TERPISAH di
// atas grid chart) — user minta angka DIPINDAH ke DALAM tiap card, sejajar
// judul (1 baris: judul kiri, angka+badge kanan) — `StatItem` terpisah
// DIHAPUS, `ChartCardHeader` (di atas) dipakai sbg `headerContent` semua
// widget. Juga ditambah: SELURUH card sekarang clickable, navigasi ke
// halaman detail KPI-nya (`metric.link`, field yang SUDAH ada dari
// backend sejak lama, dipakai lagi via `ClickableChart` yang dipulihkan).
export default function Dashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');

  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, periodTypeFilter } = filterBar;
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany } = scopeFilter;
  const periodType = periodTypeFilter.periodType;

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: periodEnd,
    exclude_intercompany: excludeIntercompany,
    period_type: periodType,
  });

  const metrics = data?.metrics ?? [];
  const findMetric = (key: string) => metrics.find((x) => x.metric_key === key);
  const thresholds = data?.thresholds;

  // Breakdown Cross-Selling ("349 dari 1.218 pelanggan", "rata-rata 1.58
  // kategori") — data ini TIDAK ADA di /dashboard (cross_selling_ratio di
  // sana cuma rata-rata periode, tanpa breakdown), endpoint ringan terpisah
  // dari sesi sebelumnya (task029.md §42), TIDAK berubah.
  const { data: csData } = useCrossSellingSummary({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: periodEnd,
    exclude_intercompany: excludeIntercompany,
    period_type: periodType,
  }, { enabled: canCrossSelling });

  const xAxisFormatter = (label: string) => formatPeriodLabelShort(t, periodType, label);

  // Badge % relatif YoY (dipakai kartu value/rate biasa) — higherIsBetter
  // menentukan warna (naik hijau/turun merah, atau dibalik).
  const yoyBadge = (metric: MetricCard | undefined, higherIsBetter: boolean): Badge | undefined => {
    if (!metric) return undefined;
    const pct = metric.summary.change_percent;
    const isGood = pct === 0 ? null : (pct > 0) === higherIsBetter;
    return {
      label: `${pct >= 0 ? '+' : ''}${pct}%`,
      color: isGood === null ? 'default' : isGood ? 'success' : 'error',
    };
  };

  // Badge poin persentase (High Margin Penetration) — dieja penuh "poin
  // persentase", BUKAN disingkat "pp" (koreksi keras user 2026-08-19,
  // lihat JSDoc KpiHeader.tsx: "PP di summary itu apa? Jangan disingkat").
  const ppBadge = (metric: MetricCard | undefined, higherIsBetter: boolean): Badge | undefined => {
    if (!metric) return undefined;
    const pp = metric.summary.current_value - metric.summary.previous_value;
    const isGood = pp === 0 ? null : (pp > 0) === higherIsBetter;
    return {
      label: t('dashboard.kpiHeader.ppValue', { value: `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}` }),
      color: isGood === null ? 'default' : isGood ? 'success' : 'error',
    };
  };

  const growthCard = findMetric('cross_selling_ratio');
  const avgCategoryCard = findMetric('avg_category');
  const repeatOrderCard = findMetric('repeat_order_rate');
  const dormantRateCard = findMetric('dormant_rate');
  const reactivationCard = findMetric('reactivation_rate');
  const avgRevenueCard = findMetric('avg_revenue');
  const avgGpCard = findMetric('avg_gross_profit');
  const highMarginCard = findMetric('high_margin_penetration');

  // Badge status target (Retention, 3 kartu) — bandingkan angka terkini vs
  // `data.thresholds` (config admin asli, task029.md §45 — BUKAN hardcode).
  // Format teks (2026-08-29, task029.md §54 — instruksi user, tabel status
  // eksplisit): Above Target "> Target X%", On Target "= Target X%", Below
  // Target "< Target X%", Critical "Critical >X%" — simbol perbandingan
  // literal, bukan frasa deskriptif lama ("Below target"/"On Target" polos).
  const repeatOrderBadge: Badge | undefined = repeatOrderCard && thresholds
    ? (repeatOrderCard.summary.current_value > thresholds.repeat_order_target_pct
      ? { label: t('dashboard.overview.retention.aboveTarget', { target: thresholds.repeat_order_target_pct }), color: 'success' }
      : repeatOrderCard.summary.current_value === thresholds.repeat_order_target_pct
        ? { label: t('dashboard.overview.retention.onTarget', { target: thresholds.repeat_order_target_pct }), color: 'success' }
        : { label: t('dashboard.overview.retention.belowTarget', { target: thresholds.repeat_order_target_pct }), color: 'error' })
    : undefined;
  const dormantRateBadge: Badge | undefined = dormantRateCard && thresholds
    ? (dormantRateCard.summary.current_value > thresholds.dormant_rate_alert_pct
      ? { label: t('dashboard.overview.retention.critical', { threshold: thresholds.dormant_rate_alert_pct }), color: 'error' }
      : { label: t('dashboard.overview.retention.safe', { threshold: thresholds.dormant_rate_alert_pct }), color: 'success' })
    : undefined;
  const reactivationBadge: Badge | undefined = reactivationCard && thresholds
    ? (reactivationCard.summary.current_value < thresholds.reactivation_target_low_pct
      ? { label: t('dashboard.overview.retention.belowTargetRange', { low: thresholds.reactivation_target_low_pct }), color: 'warning' }
      : reactivationCard.summary.current_value > thresholds.reactivation_target_high_pct
        ? { label: t('dashboard.overview.retention.aboveTargetRange', { high: thresholds.reactivation_target_high_pct }), color: 'default' }
        : { label: t('dashboard.overview.retention.inTargetRange', { low: thresholds.reactivation_target_low_pct, high: thresholds.reactivation_target_high_pct }), color: 'success' })
    : undefined;

  // Chart Value (stacked bar Revenue Reguler + High Margin, line Avg
  // Revenue/Customer) — `non_hm_revenue` DERIVED di frontend (total - HM),
  // pola PERSIS M3Revenue.tsx ("non_hm_revenue (DERIVED, total - HM)").
  const valueChartData = (avgRevenueCard?.monthly_trend ?? []).map((r) => ({
    ...r,
    non_hm_revenue: (r.total_revenue_existing ?? 0) - (r.hm_revenue_raw ?? 0),
  }));

  // Priority Alert (task029.md §47/§48) — reuse badge yang SUDAH dihitung
  // di atas, TANPA logic/data baru. Kumpulkan kartu yang badge-nya BUKAN
  // 'success'/'default' (artinya sedang bermasalah), urut error dulu.
  type AlertItem = { label: string; value: string; badge: Badge };
  const alertCandidates: (AlertItem | null)[] = [
    growthCard && { label: t('dashboard.overview.growth.crossSellLabel'), value: `${growthCard.summary.current_value.toFixed(1)}%`, badge: yoyBadge(growthCard, true) },
    avgCategoryCard && { label: t('dashboard.overview.growth.avgCategoryLabel'), value: avgCategoryCard.summary.current_value.toFixed(2), badge: yoyBadge(avgCategoryCard, true) },
    repeatOrderCard && { label: t('dashboard.overview.retention.repeatOrderLabel'), value: `${repeatOrderCard.summary.current_value.toFixed(1)}%`, badge: repeatOrderBadge },
    dormantRateCard && { label: t('dashboard.overview.retention.dormantRateLabel'), value: `${dormantRateCard.summary.current_value.toFixed(1)}%`, badge: dormantRateBadge },
    reactivationCard && { label: t('dashboard.overview.retention.reactivationLabel'), value: `${reactivationCard.summary.current_value.toFixed(1)}%`, badge: reactivationBadge },
    avgRevenueCard && { label: t('dashboard.overview.value.avgRevenueLabel'), value: formatIDR(avgRevenueCard.summary.current_value), badge: yoyBadge(avgRevenueCard, true) },
    avgGpCard && { label: t('dashboard.overview.value.avgGpLabel'), value: formatIDR(avgGpCard.summary.current_value), badge: yoyBadge(avgGpCard, true) },
    highMarginCard && { label: t('dashboard.overview.value.highMarginLabel'), value: `${highMarginCard.summary.current_value.toFixed(1)}%`, badge: ppBadge(highMarginCard, true) },
  ].map((x) => (x && x.badge && x.badge.color !== 'success' && x.badge.color !== 'default' ? (x as AlertItem) : null));
  const severityOrder: Record<string, number> = { error: 0, warning: 1 };
  const alerts = alertCandidates
    .filter((x): x is AlertItem => x !== null)
    .sort((a, b) => (severityOrder[a.badge.color] ?? 2) - (severityOrder[b.badge.color] ?? 2));
  const alertSeverity: 'error' | 'warning' = alerts.some((a) => a.badge.color === 'error') ? 'error' : 'warning';

  // Chart Active Transacting (2026-08-29) — bar count per bulan, dari
  // field `total_active` yang SUDAH ditambahkan ke monthly_trend
  // cross_selling_ratio (task029.md §46, reuse data yang sama, tanpa
  // query baru). Link ikut halaman Growth Cross Selling (`growthCard.link`)
  // — angka ini derivasi langsung dari data cross-selling yang sama.
  const activeTransactingData = (growthCard?.monthly_trend ?? []).map((r) => ({ month: r.month, value: r.total_active ?? 0 }));
  const growthLink = growthCard?.link ?? '/growth';

  const chartSkeleton = <Skeleton variant="rounded" height={230} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AnnouncementBanner />

      <AdvancedFilterBar
        title={t('dashboard.overviewTitle')}
        titleAdornment={!isLoading && data ? (
          <PeriodStrip period={data.period_month} activeWindow={data.active_window} />
        ) : undefined}
        filter={filterBar}
        hasAccess
        loading={isLoading}
        showParetoAndDateCutoff={false}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!isLoading && alerts.length > 0 && (
            // `sx` target `.MuiAlert-message` (2026-08-29, task029.md §53 —
            // user lapor "kenapa di browserku masih menyisakan ruang di
            // kanan?", diukur langsung via DOM, BUKAN soal breakpoint Grid
            // §51/§52 sama sekali) — `Alert` root MUI `display:flex` (ikon
            // + message), TAPI `.MuiAlert-message` bawaan TIDAK stretch
            // ikut lebar sisa flex, cuma menyusut sesuai kontennya sendiri
            // (dikonfirmasi: `.MuiAlert-message`/`.MuiGrid-container`
            // sama-sama cuma 906px padahal `alertRoot` 1652px di layar
            // lebar user — GridContainer SUDAH benar mengisi penuh wadah
            // `.MuiAlert-message`-nya sendiri, wadahnya yang sempit).
            <Alert severity={alertSeverity} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <AlertTitle sx={{ fontWeight: 700 }}>
                {t('dashboard.overview.alerts.title', { count: alerts.length })}
              </AlertTitle>
              {/* Grid card kecil, breakpoint TETAP (2026-08-29, task029.md
                  §52 — user kirim ulang pola persis 2x: `size={{xs:12,
                  sm:6, md:2}}` — GANTI dari formula dinamis §51
                  `Math.ceil(12/min(alerts.length,6))` yang sempat dibuat
                  utk menghindari sisa ruang kosong kalau alert <6. Ikuti
                  literal contoh user, bukan formula sendiri. `height:
                  '100%'` di Card TETAP dipertahankan (fix tinggi seragam
                  §51, bukan bagian yang dikoreksi). */}
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                {alerts.map((a, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 2 }}>
                    <Card sx={{ p: 1.25, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {a.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.value}</Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ display: 'block', fontWeight: 600, color: a.badge.color === 'default' ? 'text.secondary' : `${a.badge.color}.main` }}
                      >
                        {a.badge.label}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Alert>
          )}

          {/* Growth — Cross-Selling Rate, Rata-rata Kategori, Active Transacting */}
          <Box>
            <SectionLabel label={t('nav.groups.growth')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={growthLink}>
                    <BarChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.growth.crossSellLabel')}
                          value={growthCard ? `${growthCard.summary.current_value.toFixed(1)}%` : '—'}
                          badge={yoyBadge(growthCard, true)}
                          info={t('dashboard.overview.growth.crossSellInfo')}
                        />
                      )}
                      data={growthCard?.monthly_trend ?? []}
                      series={[{ key: 'value', label: t('dashboard.charts.crossSellingRatioLabel'), color: theme.palette.primary.main }]}
                      xKey="month"
                      height={180}
                      xAxisFormatter={xAxisFormatter}
                      tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={avgCategoryCard?.link ?? growthLink}>
                    <AreaChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.growth.avgCategoryLabel')}
                          value={avgCategoryCard ? avgCategoryCard.summary.current_value.toFixed(2) : '—'}
                          badge={yoyBadge(avgCategoryCard, true)}
                          info={t('dashboard.overview.growth.avgCategoryInfo')}
                        />
                      )}
                      data={avgCategoryCard?.monthly_trend ?? []}
                      series={[{ key: 'value', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
                      xKey="month"
                      height={180}
                      xAxisFormatter={xAxisFormatter}
                      tooltipFormatter={(v: number, n: string) => [v.toFixed(2), n]}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={growthLink}>
                    <BarChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.growth.activeTransactingLabel')}
                          value={csData ? csData.kpi1.active_count.toLocaleString('id-ID') : '—'}
                          info={t('dashboard.overview.growth.activeTransactingInfo')}
                        />
                      )}
                      data={activeTransactingData}
                      series={[{ key: 'value', label: t('dashboard.overview.growth.barLabel'), color: theme.palette.secondary.main }]}
                      xKey="month"
                      height={180}
                      xAxisFormatter={xAxisFormatter}
                      tooltipFormatter={(v: number, n: string) => [v.toLocaleString('id-ID'), n]}
                    />
                  </ClickableChart>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Retention — Repeat Order Rate, Dormant Rate, Reactivation Rate */}
          <Box>
            <SectionLabel label={t('nav.groups.retention')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={repeatOrderCard?.link ?? '/retention'}>
                    <RadialBarWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.retention.repeatOrderLabel')}
                          value={repeatOrderCard ? `${repeatOrderCard.summary.current_value.toFixed(1)}%` : '—'}
                          badge={repeatOrderBadge}
                          info={thresholds ? t('dashboard.overview.retention.repeatOrderInfo', { target: thresholds.repeat_order_target_pct }) : undefined}
                        />
                      )}
                      value={repeatOrderCard ? parseFloat(repeatOrderCard.summary.current_value.toFixed(1)) : 0}
                      thresholdGreen={thresholds?.repeat_order_target_pct ?? 80}
                      height={180}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={dormantRateCard?.link ?? '/retention'}>
                    <LineAlertWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.retention.dormantRateLabel')}
                          value={dormantRateCard ? `${dormantRateCard.summary.current_value.toFixed(1)}%` : '—'}
                          badge={dormantRateBadge}
                          info={thresholds ? t('dashboard.overview.retention.dormantRateInfo', { threshold: thresholds.dormant_rate_alert_pct }) : undefined}
                        />
                      )}
                      data={dormantRateCard?.monthly_trend ?? []}
                      lineKey="value"
                      lineLabel={t('dashboard.charts.dormantRateLabel')}
                      xKey="month"
                      threshold={thresholds?.dormant_rate_alert_pct ?? 10}
                      height={180}
                      variant="area"
                      yAxisMin={-5}
                      higherIsBetter={false}
                      xAxisFormatter={xAxisFormatter}
                      tooltipFormatter={(v: number, n: string) => [`${v}%`, n]}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={reactivationCard?.link ?? '/retention'}>
                    <BulletChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.retention.reactivationLabel')}
                          value={reactivationCard ? `${reactivationCard.summary.current_value.toFixed(1)}%` : '—'}
                          badge={reactivationBadge}
                          info={thresholds ? t('dashboard.overview.retention.reactivationInfo', { low: thresholds.reactivation_target_low_pct, high: thresholds.reactivation_target_high_pct }) : undefined}
                        />
                      )}
                      value={reactivationCard ? parseFloat(reactivationCard.summary.current_value.toFixed(1)) : 0}
                      targetLow={thresholds?.reactivation_target_low_pct ?? 15}
                      targetHigh={thresholds?.reactivation_target_high_pct ?? 20}
                      max={30}
                      unit="%"
                    />
                  </ClickableChart>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Value — Avg Revenue, Avg Gross Profit, High Margin Penetration */}
          <Box>
            <SectionLabel label={t('nav.groups.value')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={avgRevenueCard?.link ?? '/value'}>
                    <ComboChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.value.avgRevenueLabel')}
                          value={avgRevenueCard ? formatIDR(avgRevenueCard.summary.current_value) : '—'}
                          badge={yoyBadge(avgRevenueCard, true)}
                          info={t('dashboard.overview.value.avgRevenueInfo')}
                        />
                      )}
                      data={valueChartData}
                      barKey="non_hm_revenue"
                      barLabel={t('dashboard.overview.value.regularRevenueLabel')}
                      barColor={theme.palette.primary.main}
                      bar2Key="hm_revenue_raw"
                      bar2Label={t('dashboard.overview.value.hmRevenueLabel')}
                      bar2Color={theme.palette.secondary.main}
                      stacked
                      formatBar={formatIDR}
                      lineKey="value"
                      lineLabel={t('dashboard.charts.avgRevenueLabel')}
                      lineColor={theme.palette.success.main}
                      formatLine={formatIDR}
                      xKey="month"
                      height={180}
                      xAxisFormatter={xAxisFormatter}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={avgGpCard?.link ?? '/value'}>
                    <AreaChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.value.avgGpLabel')}
                          value={avgGpCard ? formatIDR(avgGpCard.summary.current_value) : '—'}
                          badge={yoyBadge(avgGpCard, true)}
                          info={t('dashboard.overview.value.avgGpInfo')}
                        />
                      )}
                      data={avgGpCard?.monthly_trend ?? []}
                      series={[{ key: 'value', label: t('dashboard.charts.avgGrossProfitLabel'), color: theme.palette.info.main }]}
                      xKey="month"
                      height={180}
                      xAxisFormatter={xAxisFormatter}
                      yAxisFormatter={formatIDR}
                      tooltipFormatter={(v: number, n: string) => [formatIDR(v), n]}
                    />
                  </ClickableChart>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {isLoading ? chartSkeleton : (
                  <ClickableChart link={highMarginCard?.link ?? '/value'}>
                    <DonutChartWidget
                      headerContent={(
                        <ChartCardHeader
                          title={t('dashboard.overview.value.highMarginLabel')}
                          value={highMarginCard ? `${highMarginCard.summary.current_value.toFixed(1)}%` : '—'}
                          badge={ppBadge(highMarginCard, true)}
                          info={t('dashboard.overview.value.highMarginInfo')}
                        />
                      )}
                      data={[
                        { name: t('dashboard.charts.highMarginBought'), value: highMarginCard ? parseFloat(highMarginCard.summary.current_value.toFixed(1)) : 0, color: theme.palette.warning.main },
                        { name: t('dashboard.charts.highMarginNotBought'), value: highMarginCard ? parseFloat((100 - highMarginCard.summary.current_value).toFixed(1)) : 100, color: theme.palette.action.hover },
                      ]}
                      centerValue={highMarginCard ? `${highMarginCard.summary.current_value.toFixed(1)}%` : '—'}
                      centerLabel={t('dashboard.charts.highMarginCenterLabel')}
                      height={180}
                    />
                  </ClickableChart>
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </AdvancedFilterBar>
    </Box>
  );
}
