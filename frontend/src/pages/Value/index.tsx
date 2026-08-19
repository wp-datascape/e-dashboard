import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { todayIsoDate } from '../CustomerMetrics/helpers';
import { M3Revenue } from '../CustomerMetrics/M3Revenue';
import { M4GrossProfit } from '../CustomerMetrics/M4GrossProfit';
import { M5HighMargin } from '../CustomerMetrics/M5HighMargin';

// Value (task029.md §2, §16-19): M3 Average Revenue, M4 Average Gross
// Profit, M5 High Margin Product Penetration.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA di CustomerMetrics/ (M3Revenue/
// M4GrossProfit/M5HighMargin — masing-masing sudah ComboChartWidget/tooltip
// detail/breakdown dialog sendiri), BUKAN bikin chart baru dari data ringkas
// /dashboard (percobaan pertama yang salah, 2026-08-19 — koreksi user: chart
// lama sudah ada, jangan dibuat ulang versi simpel). Data-fetching (useCustomerMetrics)
// juga reuse persis punya CustomerMetrics/index.tsx, bukan useDashboard.
export default function Value() {
  const { t } = useTranslation();
  const [periodEnd, setPeriodEnd] = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: periodEnd,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const trend = data?.trend ?? [];
  const hm = data?.high_margin_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.value')}</Typography>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />
          <DatePicker
            size="small" label={t('common.filters.periodDate')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

      <M3Revenue
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      <M4GrossProfit
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      <M5HighMargin
        isLoading={isLoading}
        hm={hm}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        periodEnd={periodEnd}
        excludeIntercompany={excludeIntercompany}
      />
    </Box>
  );
}
