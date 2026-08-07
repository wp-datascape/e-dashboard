import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';
import { todayIsoDate } from './helpers';
import { M3Revenue }     from '@/components/analisis/M3Revenue';
import { M4GrossProfit } from './M4GrossProfit';
import { M5HighMargin }  from './M5HighMargin';
import { M6RepeatOrder } from './M6RepeatOrder';
import { M7Expansion }   from './M7Expansion';

export default function CustomerMetrics() {
  const { t } = useTranslation();
  const [periodEnd,  setPeriodEnd]  = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const { data, isLoading } = useCustomerMetrics({
    company_id:  companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const trend = data?.trend ?? [];
  const hm    = data?.high_margin_current;
  const ror   = data?.repeat_order_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">
          {t('customerMetrics.pageTitle')}
        </Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
          {t('customerMetrics.pageSubtitle')}
        </Typography>
      </Box>

      {/* ── Filter bar (template §1 ux-menu-mapping.md — GLOBAL apple-to-apple
          dgn semua halaman KPI lain, task025 lanjutan 2026-08-07) ── */}
      <DateScopeFilterBar
        scopeFilter={scopeFilter}
        periodEnd={periodEnd}
        onPeriodEndChange={setPeriodEnd}
        onReset={() => {
          scopeFilter.reset();
          setPeriodEnd(todayIsoDate());
        }}
      />

      {/* ── M3 ── */}
      <M3Revenue
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      {/* ── M4 ── */}
      <M4GrossProfit
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      {/* ── M5 + M6 (side by side) ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <M5HighMargin
            isLoading={isLoading}
            hm={hm}
            companyId={companyId}
            branchId={branchId === 'all' ? undefined : branchId}
            division={division || undefined}
            periodEnd={periodEnd}
            excludeIntercompany={excludeIntercompany}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <M6RepeatOrder
            isLoading={isLoading}
            value={ror?.value ?? 0}
            thresholdPct={ror?.target_pct ?? 80}
            companyId={companyId}
            branchId={branchId === 'all' ? undefined : branchId}
            division={division || undefined}
            periodEnd={periodEnd}
            excludeIntercompany={excludeIntercompany}
          />
        </Grid>
      </Grid>

      {/* ── M7 ── */}
      <M7Expansion
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />
    </Box>
  );
}
