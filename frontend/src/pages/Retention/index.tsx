import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics, useDormantCustomer } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { todayIsoDate as todayIsoDateCm } from '../CustomerMetrics/helpers';
import { M6RepeatOrder } from '../CustomerMetrics/M6RepeatOrder';
import { M8DormantRate } from '../DormantCustomer/M8DormantRate';
import { M9DormantValue } from '../DormantCustomer/M9DormantValue';
import { M10ReactivationRate } from '../DormantCustomer/M10ReactivationRate';

// Retention (task029.md §2, §11-15): M6 Repeat Order Rate, M8 Dormant
// Customer Rate, M9 Dormant Customer Value, M10 Customer Reactivation Rate.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA (M6RepeatOrder dari
// CustomerMetrics/, M8/M9/M10 dari DormantCustomer/), BUKAN bikin chart baru
// dari data ringkas /dashboard (koreksi user 2026-08-19: chart lama sudah
// ada, jangan dibuat ulang versi simpel). M6 dan M8/M9/M10 dari 2 hook
// berbeda (useCustomerMetrics vs useDormantCustomer), mengikuti sumber data
// asli masing-masing di halaman lamanya.
//
// Permission per-section (2026-08-19, perbaikan temuan routeConstants.tsx):
// route ini digate retention:view, TAPI data M6 & M8/M9/M10 masing-masing
// tetap dicek independen oleh expansion:view/churn.risk:view di endpoint
// aslinya. Section disembunyikan + NoSectionAccess kalau permission
// data-nya tidak ada, query-nya sendiri di-`enabled: false`.
export default function Retention() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');
  const canChurnRisk = can('churn.risk:view');

  const [periodEnd, setPeriodEnd] = useState(todayIsoDateCm());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;
  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canExpansion });

  const { data: dcData, isLoading: dcLoading } = useDormantCustomer({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canChurnRisk });

  const ror = cmData?.repeat_order_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.retention')}</Typography>

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
        <M6RepeatOrder
          isLoading={cmLoading}
          value={ror?.value ?? 0}
          thresholdPct={ror?.target_pct ?? 80}
          companyId={companyId}
          branchId={resolvedBranchId}
          division={resolvedDivision}
          periodEnd={periodEnd}
          excludeIntercompany={excludeIntercompany}
        />
      ) : (
        <NoSectionAccess />
      )}

      {canChurnRisk ? (
        <>
          <M8DormantRate data={dcData} isLoading={dcLoading} />
          <M9DormantValue data={dcData} isLoading={dcLoading} />
          <M10ReactivationRate data={dcData} isLoading={dcLoading} />
        </>
      ) : (
        <NoSectionAccess />
      )}
    </Box>
  );
}
