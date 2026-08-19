import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
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
//
// Permission (2026-08-19, perbaikan temuan routeConstants.tsx): route ini
// digate value:view, tapi M3/M4/M5 semuanya dari 1 sumber yang sama
// (expansion:view di /metrics/customer-metrics) — jadi cuma 1 gate, bukan
// per-KPI spt Growth/Retention (yang datanya benar dari 2 endpoint beda).
export default function Value() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');

  const [periodEnd, setPeriodEnd] = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;
  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canExpansion });

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

      {canExpansion ? (
        <>
          <M3Revenue
            trend={trend}
            isLoading={isLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            excludeIntercompany={excludeIntercompany}
          />

          <M4GrossProfit
            trend={trend}
            isLoading={isLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            excludeIntercompany={excludeIntercompany}
          />

          <M5HighMargin
            isLoading={isLoading}
            hm={hm}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            excludeIntercompany={excludeIntercompany}
          />
        </>
      ) : (
        <NoSectionAccess />
      )}
    </Box>
  );
}
