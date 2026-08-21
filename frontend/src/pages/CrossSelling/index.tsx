import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { useCrossSelling } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { KpiCard } from './HelperComponents';
import { todayStr } from './helpers';
import { M1CrossSelling } from './M1CrossSelling';
import { M2AvgCategory } from './M2AvgCategory';

// ─── Page ─────────────────────────────────────────────────────────────────────
// M1/M1.1/M2 diekstrak ke M1CrossSelling.tsx/M2AvgCategory.tsx (2026-08-19,
// task029) — dipakai ulang persis sama di halaman Growth, bukan diduplikasi.
export default function CrossSelling() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="pageTitle">
            {t('crossSelling.pageTitle')}
          </Typography>
          <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
            {t('crossSelling.subtitleWindow', { months: data?.period.active_months ?? '…' })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('crossSelling.filterDateEnd')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

      {/* ── KPI Summary Cards ── */}
      {/* Cards 1 dan 4 dulu tampil sekaligus tapi selalu identik: backend menormalkan
          period_end ke akhir bulan supaya KPI1 dan titik terakhir trend pakai window
          yang sama persis (metrics.service.ts:52-57), jadi keduanya menghitung angka
          yang sama - redundan di UI. Card ke-4 (crossSellRateNowLabel) dihapus, sisakan
          3 KPI card. Laporan user 2026-07-23. */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi1Label')}
              value={`${data?.kpi1.rate ?? 0}%`}
              sub={t('crossSelling.kpi1Sub', { multi: data?.kpi1.multi_cat_count ?? 0, active: data?.kpi1.active_count ?? 0 })}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi2Label')}
              value={data?.kpi2.avg_categories ?? 0}
              sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, months: data?.period.active_months ?? '…' })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.activeCustomerLabel', { months: data?.period.active_months ?? '…' })}
              value={data?.kpi1.active_count ?? 0}
              sub={t('crossSelling.activeCustomerSub', { start: data?.period.start ?? '—', end: data?.period.end ?? '—' })}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
      </Grid>

      <M1CrossSelling
        data={data}
        isLoading={isLoading}
        companyId={companyId}
        branchId={resolvedBranchId}
        division={resolvedDivision}
        periodEnd={periodEnd}
        excludeIntercompany={excludeIntercompany}
      />

      <M2AvgCategory
        data={data}
        isLoading={isLoading}
        companyId={companyId}
        branchId={resolvedBranchId}
        division={resolvedDivision}
        periodEnd={periodEnd}
        excludeIntercompany={excludeIntercompany}
      />
    </Box>
  );
}
