import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCrossSelling, useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { todayStr } from '../CrossSelling/helpers';
import { M1CrossSelling } from '../CrossSelling/M1CrossSelling';
import { M2AvgCategory } from '../CrossSelling/M2AvgCategory';
import { M7Expansion } from '../CustomerMetrics/M7Expansion';

// Growth (task029.md §2, §8-10): M1 Cross Selling, M2 Average Product
// Category, M7 Customer Expansion Rate.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA (M1CrossSelling/M2AvgCategory
// dari CrossSelling/, M7Expansion dari CustomerMetrics/ — masing-masing
// sudah chart detail + tooltip + drill-down/breakdown sendiri), BUKAN bikin
// chart baru dari data ringkas /dashboard (percobaan pertama yang salah,
// 2026-08-19 — koreksi user: chart lama sudah ada, jangan dibuat ulang versi
// simpel). M1/M2 dan M7 datang dari 2 hook berbeda (useCrossSelling vs
// useCustomerMetrics, mengikuti sumber data asli masing-masing di halaman
// lamanya) — TIDAK dipaksa jadi 1 fetch.
//
// Permission per-section (2026-08-19, perbaikan temuan routeConstants.tsx):
// route ini digate growth:view, TAPI data M1/M2 & M7 masing-masing tetap
// dicek independen oleh cross.selling:view/expansion:view di endpoint
// aslinya. Kalau user cuma punya growth:view tanpa salah satunya, section
// itu SEKARANG disembunyikan + NoSectionAccess (bukan diam-diam fire
// query lalu 403) — query-nya sendiri juga di-`enabled: false` biar tidak
// nembak API yang memang bakal ditolak.
export default function Growth() {
  const { t } = useTranslation();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');
  const canExpansion = can('expansion:view');

  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;
  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  const { data: csData, isLoading: csLoading } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canCrossSelling });

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canExpansion });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.growth')}</Typography>

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

      {canCrossSelling ? (
        <>
          <M1CrossSelling
            data={csData}
            isLoading={csLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            excludeIntercompany={excludeIntercompany}
          />

          <M2AvgCategory
            data={csData}
            isLoading={csLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            excludeIntercompany={excludeIntercompany}
          />
        </>
      ) : (
        <NoSectionAccess />
      )}

      {canExpansion ? (
        <M7Expansion
          trend={cmData?.trend ?? []}
          isLoading={cmLoading}
          companyId={companyId}
          branchId={resolvedBranchId}
          division={resolvedDivision}
          excludeIntercompany={excludeIntercompany}
        />
      ) : (
        <NoSectionAccess />
      )}
    </Box>
  );
}
