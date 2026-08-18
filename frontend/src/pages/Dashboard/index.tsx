import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { currentYearMonth, resolvePeriodEnd } from '@/utils/date';

import { StatCard } from '@/components/charts/StatCard';
import { StatusChip } from '@/components/ui';
import { useDashboard } from '@/hooks/useDashboard';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import type { MetricCard, DashboardThresholds } from '@/types/dashboard';
import { StatCardSkeleton } from './components/StatCardSkeleton';
import { PeriodStrip } from './components/PeriodStrip';

// ─── Halaman Overview (task029) ────────────────────────────────────────────
//
// Rebuild di atas basis `main` (bukan lanjutan Dashboard/index.tsx versi
// `dev` — itu sengaja ditinggalkan, sumber keluhan UI "ramai": FilterBarShell/
// PeriodYoyBanner/KpiMetricCard yang berbingkai Card di mana-mana). Chrome
// minim ala main asli dipertahankan: filter TANPA Card wrapper, tiap section
// cuma dipisah label + Divider tipis, bukan kotak.
//
// Struktur ikut docs-v2/task/task029.md §3-7 + §27: Executive KPI Summary →
// Customer Growth (M1/M2/M7) → Customer Health (M6/M8/M10) → Key Alerts →
// Customer Definitions. Overview TIDAK menampilkan seluruh 10 KPI sbg chart
// besar sekaligus (prinsip §3) — cuma "signal", analisis lanjut ada di menu
// Growth/Retention/Value.
//
// Data SEMUA dari endpoint /dashboard yang sudah ada (backend dibawa dari
// dev-legacy). "Existing Customers"/"Dormant Customers" (Executive Summary)
// dari `detail` kartu dormant_rate (totalCustomers/dormantCount) — sudah
// ikut definisi task028 (Existing = bukan New, termasuk Dormant), bukan
// hitungan baru.
//
// CATATAN: "Revenue"/"Gross Profit" di draft spec aslinya contoh angka
// TOTAL perusahaan (Rp 12.4B) — belum ada endpoint agregasinya (lihat
// task029.md). Sementara dipakai avg_revenue/avg_gross_profit (M3/M4, rata-
// rata per existing customer) yang SUDAH akurat tersedia — dilabeli jujur
// via metricSubtitle (existing i18n metrics.avgRevenueDesc dst), bukan
// menyamar sbg total. Follow-up: endpoint total revenue/GP kalau memang
// dibutuhkan sbg headline utama nanti.

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

function metricSubtitle(card: MetricCard, t: TFunction): string {
  const keys = METRIC_LABEL_KEYS[card.metric_key];
  return keys ? t(keys.desc) : card.subtitle;
}

function formatMetricValue(card: MetricCard): string {
  const v = card.summary.current_value;
  if (card.format === 'percent') return `${v.toFixed(1)}%`;
  if (card.format === 'currency') {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
    return `Rp ${v.toLocaleString('id-ID')}`;
  }
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

function formatCount(n: number): string {
  return n.toLocaleString('id-ID');
}

// Label section (§25) — bukan Card, cuma teks + Divider tipis di bawah blok
// (pola main asli), BUKAN PeriodYoyBanner/FilterBarShell dev yang full-Card.
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

// Key Alerts (§7) — perluas alert repeat_order/dormant_rate/reactivation yang
// sudah dirintis (belum pernah dipakai di UI main, murni logic baru di sini)
// + 2 aturan tambahan (GP turun YoY, Expansion naik YoY) sesuai contoh spec.
interface AlertItem {
  severity: 'critical' | 'warning' | 'good';
  text: string;
}

function buildAlerts(
  metrics: MetricCard[],
  thresholds: DashboardThresholds | undefined,
  hasData: boolean,
  t: TFunction,
): AlertItem[] {
  if (!hasData || !thresholds) return [];
  const find = (key: string) => metrics.find((m) => m.metric_key === key);
  const alerts: AlertItem[] = [];

  const dormantRate = find('dormant_rate');
  if (dormantRate && dormantRate.summary.current_value > thresholds.dormant_rate_alert_pct) {
    alerts.push({ severity: 'critical', text: t('dashboard.alertDormantRate', { value: dormantRate.summary.current_value.toFixed(1), target: thresholds.dormant_rate_alert_pct }) });
  }
  const repeatOrder = find('repeat_order_rate');
  if (repeatOrder && repeatOrder.summary.current_value < thresholds.repeat_order_target_pct) {
    alerts.push({ severity: 'critical', text: t('dashboard.alertRepeatOrder', { value: repeatOrder.summary.current_value.toFixed(1), target: thresholds.repeat_order_target_pct }) });
  }
  const reactivation = find('reactivation_rate');
  if (reactivation && reactivation.summary.current_value < thresholds.reactivation_target_low_pct) {
    alerts.push({ severity: 'warning', text: t('dashboard.alertReactivation', { value: reactivation.summary.current_value.toFixed(1), target: thresholds.reactivation_target_low_pct }) });
  }
  const gp = find('avg_gross_profit');
  if (gp && gp.summary.change_percent < 0) {
    alerts.push({ severity: 'warning', text: t('dashboard.alertGpDecline', { value: Math.abs(gp.summary.change_percent).toFixed(1) }) });
  }
  const expansion = find('expansion_rate');
  if (expansion && expansion.summary.change_percent > 0) {
    alerts.push({ severity: 'good', text: t('dashboard.alertExpansionGrowth', { value: expansion.summary.change_percent.toFixed(1) }) });
  }
  return alerts;
}

const ALERT_COLOR: Record<AlertItem['severity'], 'error' | 'warning' | 'success'> = {
  critical: 'error',
  warning: 'warning',
  good: 'success',
};

// ─── Halaman ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const theme = useTheme();
  const { t } = useTranslation();

  const scopeFilter = useScopedCompanyFilter();
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const [periodMonth, setPeriodMonth] = useState(currentYearMonth());

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: resolvePeriodEnd(periodMonth),
    exclude_intercompany: excludeIntercompany,
  });

  const metrics = data?.metrics ?? [];
  const findMetric = (key: string) => metrics.find((m) => m.metric_key === key);

  const mCrossRatio   = findMetric('cross_selling_ratio');
  const mAvgCategory  = findMetric('avg_category');
  const mExpansion    = findMetric('expansion_rate');
  const mAvgRevenue   = findMetric('avg_revenue');
  const mAvgGp        = findMetric('avg_gross_profit');
  const mRepeatOrder  = findMetric('repeat_order_rate');
  const mDormantRate  = findMetric('dormant_rate');
  const mReactivation = findMetric('reactivation_rate');

  const existingCount = mDormantRate?.detail?.totalCustomers;
  const dormantCount = mDormantRate?.detail?.dormantCount;

  const alerts = buildAlerts(metrics, data?.thresholds, data?.has_data ?? false, t);

  const renderStat = (m: MetricCard | undefined, colorKey: 'primary' | 'success' | 'info' | 'error' = 'primary') =>
    m ? (
      <StatCard
        title={metricTitle(m, t)}
        subtitle={metricSubtitle(m, t)}
        value={formatMetricValue(m)}
        change={m.summary.change_percent}
        trend={m.summary.trend}
        data={m.monthly_trend}
        color={theme.palette[colorKey].main}
        link={m.link}
      />
    ) : <StatCardSkeleton />;

  const definitionEntries: { key: string; term: string; def: string }[] = [
    { key: 'newCustomer', term: t('dashboard.definitions.newCustomer.term'), def: t('dashboard.definitions.newCustomer.def') },
    { key: 'activeCustomer', term: t('dashboard.definitions.activeCustomer.term'), def: t('dashboard.definitions.activeCustomer.def', { months: data?.active_window ?? 1 }) },
    { key: 'existingCustomer', term: t('dashboard.definitions.existingCustomer.term'), def: t('dashboard.definitions.existingCustomer.def') },
    { key: 'dormantCustomer', term: t('dashboard.definitions.dormantCustomer.term'), def: t('dashboard.definitions.dormantCustomer.def') },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter — tanpa Card, pola main asli ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="pageTitle">{t('dashboard.overviewTitle')}</Typography>
        {!isLoading && data && <PeriodStrip period={data.period_month} activeWindow={data.active_window} />}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <ScopeFilterFields filter={scopeFilter} />
        <MonthYearPicker
          size="small"
          label={t('common.filters.period')}
          value={periodMonth}
          onChange={setPeriodMonth}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
      </Box>

      {/* ── Executive KPI Summary (§3.1) ── */}
      <Box>
        <SectionHeader title={t('dashboard.execSummaryTitle')} subtitle={t('dashboard.execSummarySubtitle')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>{renderStat(mAvgRevenue, 'primary')}</Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>{renderStat(mAvgGp, 'success')}</Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {!isLoading && existingCount !== undefined ? (
              <StatCard
                title={t('dashboard.existingCustomersTitle')}
                subtitle={t('dashboard.existingCustomersDesc')}
                value={formatCount(existingCount)}
                change={0}
                trend="stable"
                data={[]}
                color={theme.palette.info.main}
              />
            ) : <StatCardSkeleton />}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {!isLoading && dormantCount !== undefined ? (
              <StatCard
                title={t('dashboard.dormantCustomersTitle')}
                subtitle={t('dashboard.dormantCustomersDesc')}
                value={formatCount(dormantCount)}
                change={0}
                trend="stable"
                data={[]}
                color={theme.palette.error.main}
              />
            ) : <StatCardSkeleton />}
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* ── Customer Growth (§6 — M1, M2, M7) ── */}
      <Box>
        <SectionHeader title={t('dashboard.growthSectionTitle')} subtitle={t('dashboard.growthSectionSubtitle')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mCrossRatio, 'info')}</Grid>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mAvgCategory, 'success')}</Grid>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mExpansion, 'success')}</Grid>
        </Grid>
      </Box>

      {/* ── Customer Health (§5 — M6, M8, M10) ── */}
      <Box>
        <SectionHeader title={t('dashboard.healthSectionTitle')} subtitle={t('dashboard.healthSectionSubtitle')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mRepeatOrder, 'primary')}</Grid>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mDormantRate, 'error')}</Grid>
          <Grid size={{ xs: 12, md: 4 }}>{renderStat(mReactivation, 'primary')}</Grid>
        </Grid>
      </Box>

      <Divider />

      {/* ── Key Alerts (§7) ── */}
      {!isLoading && alerts.length > 0 && (
        <Box>
          <SectionHeader title={t('dashboard.alertsTitle')} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {alerts.map((a, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusChip label="●" color={ALERT_COLOR[a.severity]} size="small" />
                <Typography variant="body2" color="text.secondary">{a.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Divider />

      {/* ── Customer Definitions (§27.1) — ringkas, bukan tabel besar. Teks
          IKUT SSOT task028 (segment.helper.ts docstring), bukan tebakan.
          Reuse key i18n dashboard.definitions.* yang sudah ada di main
          (bukan bikin key baru) — cuma teks existingCustomer/dormantCustomer
          diperbarui biar akurat vs definisi baru. ── */}
      <Box>
        <SectionHeader title={t('dashboard.definitions.title')} subtitle={t('dashboard.definitionsSubtitle')} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {definitionEntries.map(({ key, term, def }) => (
            <Box key={key} sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                {term}
              </Typography>
              <Typography variant="body2" color="text.secondary">{def}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
