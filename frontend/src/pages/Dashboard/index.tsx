import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { currentYearMonth, resolvePeriodEnd } from '@/utils/date';

import { useDashboard } from '@/hooks/useDashboard';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { StatCardSkeleton } from '@/components/dashboard/StatCardSkeleton';
import { PeriodStrip } from '@/components/dashboard/PeriodStrip';
import { MetricStatCard } from '@/components/dashboard/MetricStatCard';
import { MetricChartSlot } from '@/components/dashboard/MetricChartSlot';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

// ─── Halaman Overview (task029) ────────────────────────────────────────────
//
// Tata letak PERSIS versi `main` (Row 1: 10 StatCard · Row 3: Definitions
// dalam Card berbingkai) — dikembalikan atas instruksi user (2026-08-19),
// redesign Executive Summary/Growth/Health/Key Alerts sebelumnya di commit
// 48bc443 DIBATALKAN, bukan arah yang dipakai. Penyesuaian yang tetap
// dipakai:
// 1. Field `color` sudah dihapus dari backend (docs-v2/task/task029.md,
//    dashboard.types.ts) — API sekarang kirim `chart_type` per metric,
//    warna murni urusan frontend (dipetakan di
//    components/dashboard/metricFormat.ts).
// 2. Row 2 (chart widget) DIKELOMPOKKAN Growth/Retention/Value sesuai
//    task029.md §2 — beda dari main yang urutannya flat tanpa
//    pengelompokan, DAN semua 10 KPI sekarang punya chart widget sendiri
//    (main cuma charting 7 dari 10 — M3/M4/M9 dulu cuma StatCard). Cuma
//    label section (Typography bold, bukan Card/Divider tebal) di atas
//    tiap grup, chrome tetap minim.
// 3. Halaman /growth /retention /value (1 menu, 1 halaman — task029,
//    2026-08-19) TIDAK pakai StatCard/chart ringkas dari data /dashboard —
//    itu percobaan pertama yang SALAH (koreksi user: chart lama yg sudah
//    detail di /cross-selling, /customer-metrics, /dormant-customer malah
//    ditimpa versi baru yg lebih simpel). Sekarang ketiganya reuse LANGSUNG
//    komponen chart M1-M10 yang sudah ada (M1CrossSelling/M2AvgCategory,
//    M3Revenue/M4GrossProfit/M5HighMargin/M6RepeatOrder/M7Expansion,
//    M8DormantRate/M9DormantValue/M10ReactivationRate — lihat pages/Growth,
//    pages/Retention, pages/Value). Overview di sini TETAP pakai StatCard +
//    chart ringkas dari /dashboard (cukup utk level "preview", §3 — bukan
//    dobel data-fetch M1-M10 penuh). Rendering per-metric ringkas itu
//    (MetricStatCard, renderMetricWidget, MetricChartSlot) dipusatkan di
//    components/dashboard/ — cuma dipakai di sini (Overview), TIDAK
//    dipakai lagi oleh /growth /retention /value (lihat poin 3 di atas).

const GROWTH_KEYS = ['cross_selling_ratio', 'avg_category', 'expansion_rate'];
const RETENTION_KEYS = ['repeat_order_rate', 'dormant_rate', 'dormant_value', 'reactivation_rate'];
const VALUE_KEYS = ['avg_revenue', 'avg_gross_profit', 'high_margin_penetration'];

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
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
  const findMetric = (key: string) => metrics.find((x) => x.metric_key === key);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AnnouncementBanner />

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
            period={data.period_month}
            activeWindow={data.active_window}
          />
        )}
      </Box>

      {/* ── Filter Bar ── */}
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

      {/* ── Row 1: 10 Metric Stat Cards ── */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <StatCardSkeleton />
              </Grid>
            ))
          : metrics.map((metric) => (
              <Grid
                key={metric.metric_key}
                size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}
              >
                <MetricStatCard metric={metric} />
              </Grid>
            ))}
      </Grid>

      {/* ── Row 2: Chart Widgets — dikelompokkan Growth/Retention/Value (task029.md §2) ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Growth — M1 Cross Selling, M2 Avg Category, M7 Expansion */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.growth')}
          </Typography>
          <Grid container spacing={2}>
            {GROWTH_KEYS.map((key) => (
              <Grid key={key} size={{ xs: 12, md: 4 }}>
                <MetricChartSlot metricKey={key} metric={findMetric(key)} isLoading={isLoading} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Retention — M6 Repeat Order, M8 Dormant Rate, M9 Dormant Value, M10 Reactivation */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.retention')}
          </Typography>
          <Grid container spacing={2}>
            {RETENTION_KEYS.map((key) => (
              <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricChartSlot metricKey={key} metric={findMetric(key)} isLoading={isLoading} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Value — M3 Avg Revenue, M4 Avg Gross Profit, M5 High Margin */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('nav.groups.value')}
          </Typography>
          <Grid container spacing={2}>
            {VALUE_KEYS.map((key) => (
              <Grid key={key} size={{ xs: 12, md: 4 }}>
                <MetricChartSlot metricKey={key} metric={findMetric(key)} isLoading={isLoading} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ── Row 3: Definitions Reference ── */}
      <Card sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
          {t('dashboard.definitions.title')}
        </Typography>
        <Grid container spacing={1}>
          {[
            { term: t('dashboard.definitions.activeCustomer.term'), def: t('dashboard.definitions.activeCustomer.def', { months: data?.active_window ?? 6 }) },
            { term: t('dashboard.definitions.existingCustomer.term'), def: t('dashboard.definitions.existingCustomer.def') },
            { term: t('dashboard.definitions.newCustomer.term'), def: t('dashboard.definitions.newCustomer.def') },
            { term: t('dashboard.definitions.dormantCustomer.term'), def: t('dashboard.definitions.dormantCustomer.def') },
            { term: t('dashboard.definitions.productCategory.term'), def: t('dashboard.definitions.productCategory.def') },
            { term: t('dashboard.definitions.highMarginProduct.term'), def: t('dashboard.definitions.highMarginProduct.def') },
          ].map(({ term, def }) => (
            <Grid key={term} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}>
                  {term}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {def}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
}
