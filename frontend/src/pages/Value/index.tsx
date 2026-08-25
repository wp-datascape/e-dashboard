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

import { useCustomerMetrics } from '@/hooks/useMetrics';
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
import { shiftDateByYears } from '@/utils/analisisPeriod';
import { M3Revenue } from '../CustomerMetrics/M3Revenue';
import { M4GrossProfit } from '../CustomerMetrics/M4GrossProfit';
import { M5HighMargin } from '../CustomerMetrics/M5HighMargin';

// Value/Revenue (task029.md §2, §16-19, §33): M3 Average Revenue, M4
// Average Gross Profit, M5 High Margin Product Penetration.
//
// Distandarkan ke pola Growth/Retention (2026-08-25, instruksi user:
// "STANDARTKAN SESUAI LAYOUT 2 MENU SEBELUMNYA JANGAN ADA YANG TERLEWAT
// SAMA SEKALI") — quick bar (Entitas+Periode+Apply date cutoff+Advanced)
// DAN panel Filter Lanjutan (Cabang/Divisi/Granularitas/Exclude
// Intercompany/Pareto) SEKARANG pola PERSIS Growth/Retention (disalin,
// bukan diringkas). `useCustomerMetrics` SEKARANG kirim `period_type`/
// `apply_date_cutoff` (sebelumnya sama sekali tidak, hardcode bulanan).
//
// Fetch YoY TERPUSAT di sini (bukan per-KPI spt M7ExpansionGrowth.tsx) —
// M3/M4/M5 sama-sama konsumsi 1 sumber `useCustomerMetrics` yang SAMA
// (beda dari Growth/Retention yang datanya dari endpoint KPI berbeda-beda),
// jadi YoY juga cukup 1 fetch dibagi 3, bukan 3 fetch YoY terpisah.
export default function Value() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');

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
    setApplyDateCutoff(false);
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

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
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
  }, { enabled: canExpansion });

  const trend = data?.trend ?? [];
  const yoyTrend = yoyData?.trend ?? [];
  const hm = data?.high_margin_current;
  const yoyHm = yoyData?.high_margin_current;

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

        {canExpansion && (
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

      {!canExpansion ? (
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
                  loading={isLoading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.applyFilter')}
                </Button>
              </Box>
            </Box>
          </Collapse>

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
          />

          <M5HighMargin
            isLoading={isLoading}
            hm={hm}
            yoyHm={yoyHm}
            periodType={periodTypeFilter.periodType}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            applyDateCutoff={applyDateCutoff}
            excludeIntercompany={excludeIntercompany}
          />
        </>
      )}
    </Box>
  );
}
