import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics, useDormantCustomer } from '@/hooks/useMetrics';
import { useCan } from '@/hooks/useCan';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
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
//
// Filter global — sejak 2026-08-28 REUSE `useAdvancedFilterBar`+
// `AdvancedFilterBar` (task029.md §41-lanjutan), sebelumnya state+markup
// filter DISALIN manual di sini (2026-08-24, "Terapkan filter global juga
// disini") — lihat JSDoc hook itu utk riwayat ekstraksi lengkap.
// `period_type`/`apply_date_cutoff` DITERUSKAN ke `useCustomerMetrics` (M6)
// DAN `useDormantCustomer` (M8/M9/M10, sudah granularitas-aware penuh sejak
// 2026-08-24, §30.9 poin 1).
export default function Retention() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');
  const canChurnRisk = can('churn.risk:view');

  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, applyDateCutoff, periodTypeFilter, onlyPareto } = filterBar;
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canExpansion });

  const { data: dcData, isLoading: dcLoading } = useDormantCustomer({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canChurnRisk });

  const ror = cmData?.repeat_order_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AdvancedFilterBar
        title={t('nav.groups.retention')}
        filter={filterBar}
        hasAccess={canExpansion || canChurnRisk}
        loading={cmLoading || dcLoading}
      >
        {canExpansion ? (
          <M6RepeatOrder
            isLoading={cmLoading}
            value={ror?.value ?? 0}
            thresholdPct={ror?.target_pct ?? 80}
            trend={cmData?.trend}
            periodType={periodTypeFilter.periodType}
            periodEnd={periodEnd}
            applyDateCutoff={applyDateCutoff}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            excludeIntercompany={excludeIntercompany}
            onlyPareto={onlyPareto}
          />
        ) : (
          <NoSectionAccess />
        )}

        {canChurnRisk ? (
          <>
            <M8DormantRate
              data={dcData}
              isLoading={dcLoading}
              periodType={periodTypeFilter.periodType}
              applyDateCutoff={applyDateCutoff}
              periodEnd={periodEnd}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              excludeIntercompany={excludeIntercompany}
              onlyPareto={onlyPareto}
            />
            <M9DormantValue
              data={dcData}
              isLoading={dcLoading}
              periodType={periodTypeFilter.periodType}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              excludeIntercompany={excludeIntercompany}
              onlyPareto={onlyPareto}
            />
            <M10ReactivationRate
              data={dcData}
              isLoading={dcLoading}
              periodType={periodTypeFilter.periodType}
              applyDateCutoff={applyDateCutoff}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              excludeIntercompany={excludeIntercompany}
              onlyPareto={onlyPareto}
            />
          </>
        ) : (
          <NoSectionAccess />
        )}
      </AdvancedFilterBar>
    </Box>
  );
}
