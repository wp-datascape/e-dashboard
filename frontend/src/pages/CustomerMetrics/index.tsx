import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { todayIsoDate } from './helpers';
import { clampDateNotFuture } from '@/utils/date';
import { M3Revenue }     from './M3Revenue';
import { M4GrossProfit } from './M4GrossProfit';
import { M5HighMargin }  from './M5HighMargin';
import { M6RepeatOrder } from './M6RepeatOrder';
import { M7Expansion }   from './M7Expansion';

export default function CustomerMetrics() {
  const { t } = useTranslation();
  const [periodEnd,  setPeriodEnd]  = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

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
            {t('customerMetrics.pageTitle')}
          </Typography>
          <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
            {t('customerMetrics.pageSubtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('common.filters.periodDate')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(clampDateNotFuture(e.target.value, todayIsoDate()))}
            max={todayIsoDate()}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

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
            trend={data?.trend}
            companyId={companyId}
            branchId={branchId === 'all' ? undefined : branchId}
            division={division || undefined}
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
