import type { ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import DonutSmallOutlinedIcon from '@mui/icons-material/DonutSmallOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { todayIsoDate } from '@/utils/date';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';

import { StatCard } from '@/components/charts/StatCard';
import { Card, StatusChip } from '@/components/ui';
import { useDashboard } from '@/hooks/useDashboard';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { isInversePolarityMetric, isGoodTrend } from '@/utils/metricPolarity';
import type { MetricCard, DashboardThresholds } from '@/types/dashboard';
import { StatCardSkeleton } from './components/StatCardSkeleton';
import { PeriodStrip } from './components/PeriodStrip';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METRIC_LABEL_KEYS: Record<string, { title: string; desc: string }> = {
  cross_selling_ratio: { title: 'metrics.crossSelling', desc: 'metrics.crossSellingDesc' },
  avg_category: { title: 'metrics.avgCategory', desc: 'metrics.avgCategoryDesc' },
  avg_revenue: { title: 'metrics.avgRevenue', desc: 'metrics.avgRevenueDesc' },
  avg_gross_profit: { title: 'metrics.avgGrossProfit', desc: 'metrics.avgGrossProfitDesc' },
  high_margin_penetration: { title: 'metrics.highMargin', desc: 'metrics.highMarginDesc' },
  repeat_order_rate: { title: 'metrics.repeatOrder', desc: 'metrics.repeatOrderDesc' },
  expansion_rate: { title: 'metrics.expansion', desc: 'metrics.expansionDesc' },
  dormant_rate: { title: 'metrics.dormantRate', desc: 'metrics.dormantRateDesc' },
  dormant_value: { title: 'metrics.dormantValue', desc: 'metrics.dormantValueDesc' },
  reactivation_rate: { title: 'metrics.reactivation', desc: 'metrics.reactivationDesc' },
};

function metricTitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key];
  return keys ? t(keys.title) : card.title;
}

// Deskripsi kartu — pakai angka EXACT (`card.detail`) kalau tersedia, pola
// persis referensi ("11 dari 18 customer aktif beli ≥2 kategori", dst),
// fallback ke deskripsi generik kalau metric_key ini belum punya `detail`
// (task026 §9 lanjutan, 2026-08-09, koreksi user "detail isi card referensi
// juga tidak ada di dashboard ku"). Format angka currency pakai
// formatValueByFormat yang SAMA dgn value utama kartu, biar konsisten.
function metricSubtitle(card: MetricCard, t: TFunction): string {
  const d = card.detail;
  if (d) {
    switch (card.metric_key) {
      case 'cross_selling_ratio':
        return t('dashboard.detailCrossSelling', { numerator: d.numerator, denominator: d.denominator });
      case 'avg_category':
        return t('dashboard.detailAvgCategory', { total: d.totalCategories, customers: d.activeCustomers });
      case 'avg_gross_profit':
        return t('dashboard.detailAvgGrossProfit', {
          top: formatValueByFormat(d.topTierGp, 'currency'),
          mid: formatValueByFormat(d.midTierGp, 'currency'),
        });
      case 'dormant_rate':
        return t('dashboard.detailDormantRate', { count: d.dormantCount, total: d.totalCustomers });
      case 'dormant_value':
        return t('dashboard.detailDormantValue', { count: d.dormantCount });
      case 'reactivation_rate':
        return t('dashboard.detailReactivation', { reactivated: d.reactivatedCount, prior: d.priorDormantCount });
    }
  }
  const keys = METRIC_LABEL_KEYS[card.metric_key];
  return keys ? t(keys.desc) : card.subtitle;
}

function formatValueByFormat(v: number, format: MetricCard['format']): string {
  if (format === 'percent') return `${v.toFixed(1)}%`;
  if (format === 'currency') {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
    return `Rp ${v.toLocaleString('id-ID')}`;
  }
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

function formatMetricValue(card: MetricCard): string {
  return formatValueByFormat(card.summary.current_value, card.format);
}


// Pill kategori pojok kanan atas tiap kartu — pola PERSIS referensi
// executive-kpi-dashboard/OverviewView.tsx (koreksi user 2026-08-09,
// "SAMAKAN RUBAH MENJADI SAMA DENGAN REFRENSI"), dipetakan per metric_key
// (bukan per nomor KPI, urutan metric kita beda dari referensi — lihat
// task026 §9). Warna TETAP token StatusChip (default/success/warning/error),
// BUKAN 7 hue lepas hardcode spt referensi (purple/emerald/amber/dst) — itu
// balik lagi ke pola "1 warna dipakai byk peran" yang sudah dibongkar di
// task026 §8r/§8t. 'default' = label murni deskriptif, 'success'/'error' =
// genuinely threshold-based (repeat_order_rate on-target/tidak).
function metricBadge(card: MetricCard, thresholds: DashboardThresholds | undefined, t: TFunction): { label: string; color: 'default' | 'success' | 'warning' | 'error' } {
  switch (card.metric_key) {
    case 'cross_selling_ratio':
      return { label: t('dashboard.badgeMultiProduct'), color: 'default' };
    case 'avg_category':
      return { label: t('dashboard.badgePenetration'), color: 'default' };
    case 'avg_revenue':
      return { label: t('dashboard.badgeRevenue'), color: 'default' };
    case 'avg_gross_profit':
      return { label: t('dashboard.badgeProfitability'), color: 'default' };
    case 'high_margin_penetration':
      return { label: t('dashboard.badgeMemoBase'), color: 'default' };
    case 'repeat_order_rate': {
      const target = thresholds?.repeat_order_target_pct ?? 0;
      const onTarget = card.summary.current_value >= target;
      return { label: t('dashboard.badgeTarget', { pct: target }), color: onTarget ? 'success' : 'error' };
    }
    case 'expansion_rate':
      return { label: t('dashboard.badgeGrowth'), color: 'default' };
    case 'dormant_rate':
      return { label: t('dashboard.badgeThresholdDinamis'), color: 'default' };
    case 'dormant_value':
      return { label: t('dashboard.badgeEstimatedLoss'), color: 'default' };
    case 'reactivation_rate':
      return {
        label: t('dashboard.badgeTargetRange', { low: thresholds?.reactivation_target_low_pct ?? 0, high: thresholds?.reactivation_target_high_pct ?? 0 }),
        color: 'default',
      };
    default:
      return { label: '', color: 'default' };
  }
}

// Aksen warna per kartu overview — koreksi user 2026-08-09: "chart di
// dashboard jenisnya sama kan dengan chart di halaman masing-masing KPI".
// BUKAN skema kategori/bundel buatan sendiri lagi — tiap warna di sini
// adalah warna LITERAL yang dipakai metrik ybs di chart utama halaman
// KPI-nya sendiri (diaudit satu-satu, bukan tebakan):
//   cross_selling_ratio      → CrossSelling (ComboChartWidget, seri "ratio")     → info
//   avg_category              → AvgCategoryPerCustomer (AreaChartWidget)         → success
//   avg_revenue                → CustomerRevenue/M3Revenue (ComboChartWidget bar) → primary
//   high_margin_penetration  → M5HighMargin (LineChartWidget, "penetration_pct")  → info
//   repeat_order_rate         → M6RepeatOrder (LineChartWidget tren "rate")        → primary
//   expansion_rate             → M7Expansion (BarChartWidget, "up_rate")           → success
//   dormant_rate                → DormantRate (LineAlertWidget)                      → error
//   dormant_value               → DormantValue (BarChartWidget)                      → error
// `avg_gross_profit` (stacked-bar) TIDAK butuh entri — StatCard abaikan
// `color` utk chartType itu, selalu pakai `theme.custom.rank` (3-tier).
function metricAccentColor(metric: MetricCard, theme: Theme): string {
  switch (metric.metric_key) {
    case 'cross_selling_ratio':
    case 'high_margin_penetration':
      return theme.palette.info.main;
    case 'avg_category':
    case 'expansion_rate':
      return theme.palette.success.main;
    case 'avg_revenue':
    case 'repeat_order_rate':
    case 'reactivation_rate':
      return theme.palette.primary.main;
    case 'dormant_rate':
    case 'dormant_value':
      return theme.palette.error.main;
    default:
      return theme.palette.primary.main;
  }
}

// Garis threshold di mini chart — pola sama dgn LineAlertWidget di halaman
// KPI (DormantRate/ReactivationRate), belum ada sebelumnya (koreksi user
// 2026-08-10: "halaman KPI reactivation ada line threshold nya" — mini
// chart Dashboard kelewat elemen ini). Cuma 2 metrik yang genuinely punya
// garis threshold di halaman aslinya (LineAlertWidget dipakai KHUSUS di
// situ, bukan semua metrik 'line').
function metricThreshold(metricKey: string, thresholds: DashboardThresholds | undefined): number | undefined {
  switch (metricKey) {
    case 'dormant_rate':
      return thresholds?.dormant_rate_alert_pct;
    case 'reactivation_rate':
      return thresholds?.reactivation_target_low_pct;
    default:
      return undefined;
  }
}

// Ikon per kartu — pola referensi executive-kpi-dashboard (`<Grid/> KPI 1 •
// Cross Selling`, dst), belum ada sebelumnya (koreksi user 2026-08-09).
// 1 ikon per metric_key, tanpa warna sendiri (diwarnai lewat prop `color`
// StatCard, lihat metricAccentColor).
const METRIC_ICONS: Record<string, ReactNode> = {
  cross_selling_ratio: <GridViewOutlinedIcon />,
  avg_category: <LayersOutlinedIcon />,
  avg_revenue: <PaidOutlinedIcon />,
  avg_gross_profit: <SavingsOutlinedIcon />,
  high_margin_penetration: <DonutSmallOutlinedIcon />,
  repeat_order_rate: <RepeatOutlinedIcon />,
  expansion_rate: <TrendingUpOutlinedIcon />,
  dormant_rate: <ErrorOutlineOutlinedIcon />,
  dormant_value: <MoneyOffOutlinedIcon />,
  reactivation_rate: <RestartAltOutlinedIcon />,
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation();
  const theme = useTheme();

  const scopeFilter = useGlobalFilter();
  const {
    companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter;

  // Awal rentang periode aktif dari dropdown Periode (Bulanan/Kuartalan/
  // Semester/Tahunan) — pola SAMA PERSIS dgn 10 halaman KPI individual
  // (task026 §9 lanjutan, 2026-08-09, koreksi user "kenapa filter periode
  // ... tidak bekerja"). Dikirim ke backend via `period_start` supaya
  // headline+YoY tiap kartu genuinely ikut dropdown ini, bukan cuma tampil
  // di caption doang.
  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate));
  const periodStart = getPeriodDateRange(periodType, periodKey).start;
  const currentRangeText = formatDateRange({ start: periodStart, end: endDate });
  const comparisonDate = shiftDateByYears(endDate, -1);
  const comparisonRangeText = formatDateRange({
    start: shiftDateByYears(periodStart, -1),
    end: comparisonDate,
  });

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: endDate,
    period_start: periodStart,
    exclude_intercompany: excludeIntercompany,
  });

  const todayStr = todayIsoDate();

  const metrics = data?.metrics ?? [];

  // ── Alert banner + hero callout (task026 §9, 2026-08-09, referensi
  // executive-kpi-dashboard/OverviewView.tsx) — threshold sudah ada di
  // `loadThresholds()` sejak awal, baru sekarang diekspos ke response &
  // dipakai di sini. Teks alert dirender via i18n (BUKAN string hardcode
  // di backend spt referensi — beda krn app ini ber-i18n). ──
  const findMetric = (key: string) => metrics.find((m) => m.metric_key === key);
  const repeatOrder = findMetric('repeat_order_rate');
  const dormantRate = findMetric('dormant_rate');
  const reactivation = findMetric('reactivation_rate');
  const dormantValue = findMetric('dormant_value');
  const thresholds = data?.thresholds;

  // `has_data` guard (2026-08-09, ditemukan dari screenshot user) — company
  // yang belum punya customer/invoice sama sekali selalu 0% di semua rate,
  // yang matematis "di bawah target manapun" tapi menyesatkan kalau
  // ditampilkan sbg peringatan performa (bukan performa jelek, memang
  // belum ada data). Alert cuma dihitung kalau company ini PUNYA data.
  const alerts: string[] = [];
  if (data?.has_data) {
    if (repeatOrder && thresholds && repeatOrder.summary.current_value < thresholds.repeat_order_target_pct) {
      alerts.push(t('dashboard.alertRepeatOrder', { value: repeatOrder.summary.current_value.toFixed(1), target: thresholds.repeat_order_target_pct }));
    }
    if (dormantRate && thresholds && dormantRate.summary.current_value > thresholds.dormant_rate_alert_pct) {
      alerts.push(t('dashboard.alertDormantRate', { value: dormantRate.summary.current_value.toFixed(1), target: thresholds.dormant_rate_alert_pct }));
    }
    if (reactivation && thresholds && reactivation.summary.current_value < thresholds.reactivation_target_low_pct) {
      alerts.push(t('dashboard.alertReactivation', { value: reactivation.summary.current_value.toFixed(1), target: thresholds.reactivation_target_low_pct }));
    }
  }

  const dormantValueGood = dormantValue ? isGoodTrend('dormant_value', dormantValue.summary.trend) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="pageTitle">
          {t('dashboard.overviewTitle')}
        </Typography>
        {!isLoading && data && (
          <PeriodStrip
            // Rentang tanggal PENUH (ikut dropdown Periode), bukan
            // `data.period_month` (1 bulan tetap) lagi — task026 §9 lanjutan,
            // 2026-08-09: itu penyebab badge atas ("Periode: 2026-08") tidak
            // pernah berubah walau dropdown Periode diganti Kuartalan dst.
            period={currentRangeText}
            comparisonPeriod={comparisonRangeText}
            activeWindow={data.active_window}
          />
        )}
      </Box>

      {/* ── Filter Bar — KpiFilterBar (task026 Fase 2, 2026-08-09) —
          sebelumnya baris 2 cuma MonthYearPicker (bulan tunggal, "Ringkasan
          genuinely multi-KPI bulanan, bukan 1 metrik dgn pembanding YoY"),
          sekarang diseragamkan ke periodType+tanggal seperti 10 halaman KPI
          supaya filter KAPAN benar-benar 1 context global (bukan cuma
          SIAPA) — lihat task026.md §0.4/§5. Backend `/dashboard` sudah
          terima `period_end` sejak awal (bukan `period_month`), jadi tidak
          ada perubahan endpoint. ── */}
      <KpiFilterBar
        filter={scopeFilter}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetExtra={() => {
          setPeriodType('quarter');
          setEndDate(todayStr);
        }}
      />

      {/* ── Hero callout (Dormant Value) + alert banner threshold-aware —
          task026 §9 (2026-08-09), referensi executive-kpi-dashboard/
          OverviewView.tsx. Digabung 1 Card (bukan 2 banner terpisah) biar
          tidak menambah boilerplate. Alert cuma tampil kalau ADA metrik yg
          melewati threshold (repeatOrderTargetPct/dormantRateAlertPct/
          reactivationTargetLow dari business_configs, lihat
          dashboard.service.ts). ── */}
      {!isLoading && dormantValue && (
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: (t) => t.custom.soft(t.palette.error.main),
                color: 'error.main',
              }}>
                <TrendingDownOutlinedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'text.secondary', textTransform: 'uppercase', display: 'block' }}>
                  {t('dashboard.heroLostValueLabel')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {formatMetricValue(dormantValue)}
                </Typography>
              </Box>
            </Box>
            {dormantValueGood !== null && (
              <StatusChip
                label={`${dormantValueGood ? '▼' : '▲'} ${Math.abs(dormantValue.summary.change_percent).toFixed(1)}% ${t('dashboard.vs')}`}
                color={dormantValueGood ? 'success' : 'error'}
              />
            )}
          </Box>

          {alerts.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderTopColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <WarningAmberOutlinedIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0, mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'block', mb: 0.5 }}>
                  {t('dashboard.alertsTitle')}
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {alerts.map((alertText, idx) => (
                    <Typography key={idx} component="li" variant="caption" color="text.secondary">
                      {alertText}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {/* ── Row 1: 10 Metric Stat Cards — grid 3 kolom (xs:1/md:2/xl:3), PERSIS
          referensi executive-kpi-dashboard (`grid-cols-1 md:grid-cols-2
          xl:grid-cols-3`), BUKAN 5 kolom (lg:2.4) spt sebelumnya — itu murni
          keputusan saya sendiri, bukan instruksi (koreksi user 2026-08-09,
          "kamu membuat aturan sendiri atau mengikuti perintahku?"). Kartu
          reactivation_rate full-width (xs/md/xl: 12), sama spt KPI10 di
          referensi yang di-span 2/3 kolom (jadi 1 baris penuh sendiri). ── */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, md: 6, xl: 4 }}>
                <StatCardSkeleton />
              </Grid>
            ))
          : metrics.map((metric) => {
              const badge = metricBadge(metric, data?.thresholds, t);
              const isFullWidth = metric.metric_key === 'reactivation_rate';
              return (
                <Grid
                  key={metric.metric_key}
                  size={isFullWidth ? { xs: 12, md: 12, xl: 12 } : { xs: 12, md: 6, xl: 4 }}
                >
                  <StatCard
                    title={metricTitle(metric, t)}
                    subtitle={metricSubtitle(metric, t)}
                    value={formatMetricValue(metric)}
                    change={metric.summary.change_percent}
                    trend={metric.summary.trend}
                    data={metric.monthly_trend}
                    color={metricAccentColor(metric, theme)}
                    icon={METRIC_ICONS[metric.metric_key]}
                    chartType={metric.chart_type}
                    link={metric.link}
                    inversePolarity={isInversePolarityMetric(metric.metric_key)}
                    periodLabel={data ? currentRangeText : undefined}
                    comparisonLabel={data ? comparisonRangeText : undefined}
                    comparisonValue={formatValueByFormat(metric.summary.previous_value, metric.format)}
                    badgeLabel={badge.label}
                    badgeColor={badge.color}
                    threshold={metricThreshold(metric.metric_key, data?.thresholds)}
                  />
                </Grid>
              );
            })}
      </Grid>
    </Box>
  );
}