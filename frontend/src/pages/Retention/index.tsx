import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics, useDormantCustomer } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { ParetoFilterToggle } from '@/components/filters/ParetoFilterToggle';
import { FILTER_FIELD_WIDTH } from '@/components/filters/filterFieldWidth';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { PeriodTypeFilterFields } from '@/components/filters/PeriodTypeFilterFields';
import { usePeriodTypeFilter } from '@/hooks/usePeriodTypeFilter';
import { todayIsoDate as todayIsoDateCm } from '../CustomerMetrics/helpers';
import { clampDateNotFuture } from '@/utils/date';
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
// Filter global (2026-08-24, instruksi user: "Terapkan filter global juga
// disini" — susulan standarisasi M6 ke pola Growth) — quick bar (Entitas+
// Periode+Apply date cutoff+Advanced Filters) DAN panel Filter Lanjutan
// (Cabang/Divisi/Granularitas+toggle+Reset/Terapkan) SEKARANG pola PERSIS
// Growth/index.tsx (disalin, bukan diringkas — draft-vs-applied staged
// state utk field lanjutan, quick fields auto-apply). `period_type`/
// `apply_date_cutoff` DITERUSKAN ke `useCustomerMetrics` (M6, sumber data
// sama dgn M7 Growth) — TAPI BELUM ke `useDormantCustomer` (M8/M9/M10,
// hook-nya sendiri belum terima parameter itu sama sekali, di luar scope
// "mulai dari M6" yang diminta user). M8/M9/M10 tetap hardcode bulanan
// utk sekarang, TIDAK regresi (perilaku sama persis sebelum perubahan ini).
export default function Retention() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');
  const canChurnRisk = can('churn.risk:view');

  const scopeFilter = useScopedCompanyFilter();
  const draftScopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const quickScopeFilter = {
    ...scopeFilter,
    setCompanyId: (value: number | 'all') => {
      scopeFilter.setCompanyId(value);
      draftScopeFilter.setCompanyId(value);
    },
  };

  const [periodEnd, setPeriodEnd] = useState(todayIsoDateCm());
  const [applyDateCutoff, setApplyDateCutoff] = useState(false);

  const periodTypeFilter = usePeriodTypeFilter();
  const draftPeriodTypeFilter = usePeriodTypeFilter();

  const [, setOnlyPareto] = useState(false);
  const [draftOnlyPareto, setDraftOnlyPareto] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleApplyFilter = () => {
    scopeFilter.setBranchId(draftScopeFilter.branchId);
    scopeFilter.setDivision(draftScopeFilter.division);
    scopeFilter.setExcludeIntercompany(draftScopeFilter.excludeIntercompany);
    periodTypeFilter.setPeriodType(draftPeriodTypeFilter.periodType);
    setOnlyPareto(draftOnlyPareto);
  };

  const handleResetFilter = () => {
    scopeFilter.setCompanyId('all');
    draftScopeFilter.setCompanyId('all');
    setPeriodEnd(todayIsoDateCm());
    scopeFilter.setExcludeIntercompany(false);
    draftScopeFilter.setExcludeIntercompany(false);
    periodTypeFilter.setPeriodType('monthly');
    draftPeriodTypeFilter.setPeriodType('monthly');
    setOnlyPareto(false);
    setDraftOnlyPareto(false);
    setAdvancedOpen(false);
  };

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
  }, { enabled: canExpansion });

  // M8-M10 sekarang granularitas-aware penuh (2026-08-24, susulan task029.md
  // §30.9 poin 1 — backend `getDormantCustomerMetrics` di-generalisasi,
  // pola SAMA PERSIS M3-M7) — `period_type`/`apply_date_cutoff` diteruskan
  // sekarang, workaround frontend `dormantPeriodEnd` (kirim tanggal
  // ternormalisasi manual krn backend dulu tidak bisa self-clamp) TIDAK
  // PERLU LAGI — `periodEnd` mentah aman dikirim apa adanya, backend
  // sekarang menormalisasi sendiri via `resolveTrendPeriod` (elapsed-clamp),
  // konsisten dgn M6/cmData.
  const { data: dcData, isLoading: dcLoading } = useDormantCustomer({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
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

        {(canExpansion || canChurnRisk) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <ScopeFilterFields filter={quickScopeFilter} fields={['entity']} />
            <DatePicker
              size="small" label={t('common.filters.periodDate')}
              type={applyDateCutoff ? 'date' : 'month'}
              value={applyDateCutoff ? periodEnd : periodEnd.slice(0, 7)}
              onChange={(e) => {
                const maxRaw = applyDateCutoff ? todayIsoDateCm() : todayIsoDateCm().slice(0, 7);
                const picked = clampDateNotFuture(e.target.value, maxRaw);
                setPeriodEnd(applyDateCutoff ? picked : `${picked}-01`);
              }}
              max={applyDateCutoff ? todayIsoDateCm() : todayIsoDateCm().slice(0, 7)}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applyDateCutoff}
                  onChange={(e) => {
                    setApplyDateCutoff(e.target.checked);
                    if (!e.target.checked) setPeriodEnd(`${periodEnd.slice(0, 7)}-01`);
                  }}
                />
              }
              label={t('common.filters.applyDateCutoff')}
              sx={{ ml: 0, whiteSpace: 'nowrap' }}
            />
            <Button
              size="small"
              color="inherit"
              startIcon={advancedOpen ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
              onClick={() => setAdvancedOpen((v) => !v)}
              sx={{ textTransform: 'none' }}
            >
              {t('common.filters.advancedFilters')}
            </Button>
          </Box>
        )}
      </Box>

      {!canExpansion && !canChurnRisk ? (
        <NoSectionAccess />
      ) : (
        <>
          <Collapse in={advancedOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ScopeFilterFields filter={draftScopeFilter} fields={['branch', 'division']} />
                <PeriodTypeFilterFields filter={draftPeriodTypeFilter} showNavigator={false} showDateField={false} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ExcludeIntercompanyToggle checked={draftScopeFilter.excludeIntercompany} onChange={draftScopeFilter.setExcludeIntercompany} />
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }} />
                <ParetoFilterToggle checked={draftOnlyPareto} onChange={setDraftOnlyPareto} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={handleResetFilter}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.resetFilter')}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleApplyFilter}
                  loading={cmLoading || dcLoading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.applyFilter')}
                </Button>
              </Box>
            </Box>
          </Collapse>

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
                companyId={companyId}
                branchId={resolvedBranchId}
                division={resolvedDivision}
                excludeIntercompany={excludeIntercompany}
              />
              <M9DormantValue
                data={dcData}
                isLoading={dcLoading}
                periodType={periodTypeFilter.periodType}
                companyId={companyId}
                branchId={resolvedBranchId}
                division={resolvedDivision}
                excludeIntercompany={excludeIntercompany}
              />
              <M10ReactivationRate
                data={dcData}
                isLoading={dcLoading}
                periodType={periodTypeFilter.periodType}
                companyId={companyId}
                branchId={resolvedBranchId}
                division={resolvedDivision}
                excludeIntercompany={excludeIntercompany}
              />
            </>
          ) : (
            <NoSectionAccess />
          )}
        </>
      )}
    </Box>
  );
}
