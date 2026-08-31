import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useCan } from '@/hooks/useCan';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { shiftDateByYears } from '@/utils/analisisPeriod';
import { M3Revenue } from '../CustomerMetrics/M3Revenue';
import { M4GrossProfit } from '../CustomerMetrics/M4GrossProfit';
import { M5HighMargin } from '../CustomerMetrics/M5HighMargin';

// Value/Revenue (task029.md §2, §16-19, §33): M3 Average Revenue, M4
// Average Gross Profit, M5 High Margin Product Penetration.
//
// Filter global — sejak 2026-08-28 REUSE `useAdvancedFilterBar`+
// `AdvancedFilterBar` (task029.md §41-lanjutan), sebelumnya state+markup
// filter DISALIN manual di sini (2026-08-25, "STANDARTKAN SESUAI LAYOUT 2
// MENU SEBELUMNYA") — lihat JSDoc hook itu utk riwayat ekstraksi lengkap.
//
// Fetch YoY TERPUSAT di sini (bukan per-KPI spt M7ExpansionGrowth.tsx) —
// M3/M4/M5 sama-sama konsumsi 1 sumber `useCustomerMetrics` yang SAMA
// (beda dari Growth/Retention yang datanya dari endpoint KPI berbeda-beda),
// jadi YoY juga cukup 1 fetch dibagi 3, bukan 3 fetch YoY terpisah.
export default function Value() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');

  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, applyDateCutoff, periodTypeFilter, onlyPareto } = filterBar;
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canExpansion });

  // YoY (period_end -1 tahun, 2026-08-25) — dipakai KpiHeader M3/M4/M5,
  // pola sama M7ExpansionGrowth.tsx, cuma terpusat di sini krn 1 sumber
  // dibagi 3 KPI.
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  const { data: yoyData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: yoyPeriodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canExpansion });

  const trend = data?.trend ?? [];
  const yoyTrend = yoyData?.trend ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AdvancedFilterBar
        title={t('nav.groups.value')}
        filter={filterBar}
        hasAccess={canExpansion}
        loading={isLoading}
      >
        <M3Revenue
          trend={trend}
          yoyTrend={yoyTrend}
          isLoading={isLoading}
          periodType={periodTypeFilter.periodType}
          periodEnd={periodEnd}
          applyDateCutoff={applyDateCutoff}
          companyId={companyId}
          branchId={resolvedBranchId}
          division={resolvedDivision}
          excludeIntercompany={excludeIntercompany}
          onlyPareto={onlyPareto}
        />

        <M4GrossProfit
          trend={trend}
          yoyTrend={yoyTrend}
          isLoading={isLoading}
          periodType={periodTypeFilter.periodType}
          periodEnd={periodEnd}
          applyDateCutoff={applyDateCutoff}
          companyId={companyId}
          branchId={resolvedBranchId}
          division={resolvedDivision}
          excludeIntercompany={excludeIntercompany}
          onlyPareto={onlyPareto}
        />

        <M5HighMargin
          trend={trend}
          yoyTrend={yoyTrend}
          isLoading={isLoading}
          periodType={periodTypeFilter.periodType}
          companyId={companyId}
          branchId={resolvedBranchId}
          division={resolvedDivision}
          periodEnd={periodEnd}
          applyDateCutoff={applyDateCutoff}
          excludeIntercompany={excludeIntercompany}
          onlyPareto={onlyPareto}
        />
      </AdvancedFilterBar>
    </Box>
  );
}
