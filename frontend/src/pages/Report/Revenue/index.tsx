import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

import { useRevenueBreakdown, useGpBreakdown, useHmBreakdown } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { usePeriodTypeFilter } from '@/hooks/usePeriodTypeFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { PeriodTypeFilterFields } from '@/components/filters/PeriodTypeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { ParetoFilterToggle } from '@/components/filters/ParetoFilterToggle';
import { FILTER_FIELD_WIDTH } from '@/components/filters/filterFieldWidth';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { todayIsoDate as todayStr } from '../../CustomerMetrics/helpers';
import { clampDateNotFuture } from '@/utils/date';
import { getCurrentPeriodKey, getPeriodDateRange } from '@/utils/analisisPeriod';
import { useRevenueColumns, useGpColumns, useHmColumns } from '../../CustomerMetrics/valueHelpers';

// Laporan > Revenue (task029.md §30.19/§33, 2026-08-25) — sebelumnya
// placeholder "coming soon". Instruksi user: "STANDARTKAN SESUAI LAYOUT 2
// MENU SEBELUMNYA" — 3 tab tabel granular, pola SAMA PERSIS Report/Growth
// & Report/Retention (BUKAN chart, chart tetap di /value).
type ReportRevenueTab = 'revenue' | 'gp' | 'hm';

export default function ReportRevenue() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');

  const availableTabs: ReportRevenueTab[] = canExpansion ? ['revenue', 'gp', 'hm'] : [];

  // Query param `?tab=` (pola sama persis Report/Growth) — dipakai link
  // "Cek Detail di Laporan" M3/M4/M5.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ReportRevenueTab | null;
  const [tab, setTab] = useState<ReportRevenueTab | null>(
    (tabParam && availableTabs.includes(tabParam) ? tabParam : availableTabs[0]) ?? null,
  );
  const activeTab = tab && availableTabs.includes(tab) ? tab : (availableTabs[0] ?? null);

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

  const [periodEnd, setPeriodEnd] = useState(todayStr());
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
    setPeriodEnd(todayStr());
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

  // date_from = awal periode AKTIF (granularitas-aware, pola sama persis
  // Report/Growth Expansion tab).
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const reportPeriodKey = getCurrentPeriodKey(periodTypeFilter.periodType, new Date(py, pm - 1, pd));
  const periodStart = getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).start;

  const { data: revenueData, isLoading: revenueLoading } = useRevenueBreakdown({
    period_end: periodEnd,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  });
  const revenueColumns = useRevenueColumns(t);
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueSort, setRevenueSort] = useState<'name' | 'revenue_desc' | 'hm_desc'>('revenue_desc');
  const revenueRows = (revenueData?.rows ?? [])
    .filter((r) => !revenueSearch.trim() || r.customer_name.toLowerCase().includes(revenueSearch.trim().toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(revenueSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (revenueSort === 'hm_desc') return b.hm_revenue - a.hm_revenue;
      if (revenueSort === 'name') return a.customer_name.localeCompare(b.customer_name);
      return b.revenue - a.revenue;
    });

  const { data: gpData, isLoading: gpLoading } = useGpBreakdown({
    period_end: periodEnd,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  });
  const gpColumns = useGpColumns(t);
  const [gpSearch, setGpSearch] = useState('');
  const [gpSort, setGpSort] = useState<'name' | 'gp_desc'>('gp_desc');
  const gpRows = (gpData?.rows ?? [])
    .filter((r) => !gpSearch.trim() || r.customer_name.toLowerCase().includes(gpSearch.trim().toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(gpSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (gpSort === 'name' ? a.customer_name.localeCompare(b.customer_name) : b.gp - a.gp));

  const { data: hmData, isLoading: hmLoading } = useHmBreakdown({
    period_end: periodEnd,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  });
  const hmColumns = useHmColumns(t);
  const [hmSearch, setHmSearch] = useState('');
  const [hmSort, setHmSort] = useState<'name' | 'hm_desc'>('hm_desc');
  const hmRows = (hmData?.rows ?? [])
    .filter((r) => !hmSearch.trim() || r.customer_name.toLowerCase().includes(hmSearch.trim().toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(hmSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (hmSort === 'name' ? a.customer_name.localeCompare(b.customer_name) : b.hm_revenue - a.hm_revenue));

  const isLoading = activeTab === 'revenue' ? revenueLoading : activeTab === 'gp' ? gpLoading : hmLoading;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.report')} · {t('nav.groups.value')}</Typography>

        {canExpansion && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <ScopeFilterFields filter={quickScopeFilter} fields={['entity']} />
            <DatePicker
              size="small" label={t('common.filters.periodDate')}
              type={applyDateCutoff ? 'date' : 'month'}
              value={applyDateCutoff ? periodEnd : periodEnd.slice(0, 7)}
              onChange={(e) => {
                const maxRaw = applyDateCutoff ? todayStr() : todayStr().slice(0, 7);
                const picked = clampDateNotFuture(e.target.value, maxRaw);
                setPeriodEnd(applyDateCutoff ? picked : `${picked}-01`);
              }}
              max={applyDateCutoff ? todayStr() : todayStr().slice(0, 7)}
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

      {activeTab === null ? (
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

          <Tabs
            value={activeTab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { bgcolor: 'transparent', textTransform: 'none' },
              '& .MuiTab-root.Mui-selected': { bgcolor: 'transparent' },
            }}
          >
            <Tab value="revenue" label={t('metrics.avgRevenueShort')} />
            <Tab value="gp" label={t('metrics.avgGrossProfitShort')} />
            <Tab value="hm" label={t('metrics.highMarginShort')} />
          </Tabs>

          {activeTab === 'revenue' && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder={t('crossSelling.tableSearchPlaceholder')}
                  value={revenueSearch}
                  onChange={(e) => setRevenueSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 240 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('crossSelling.tableSortLabel')}
                  value={revenueSort}
                  onChange={(e) => setRevenueSort(e.target.value as typeof revenueSort)}
                  sx={{ width: { xs: '100%', sm: 200 } }}
                >
                  <MenuItem value="revenue_desc">{t('crossSelling.tableSortRevenueDesc')}</MenuItem>
                  <MenuItem value="hm_desc">{t('customerMetrics.m3.colHmRevenue')}</MenuItem>
                  <MenuItem value="name">{t('crossSelling.tableSortName')}</MenuItem>
                </TextField>
              </Box>

              <ResponsiveListView
                rows={revenueRows.map((r) => ({ ...r, id: r.ranking }))}
                columns={revenueColumns}
                loading={revenueLoading}
                height={560}
                pageSize={25}
                pageSizeOptions={[25, 50, 100]}
                emptyMessage={t('customerMetrics.m3.emptyMessage')}
                mobileFields={['customer_name', 'revenue', 'revenue_pct', 'tier']}
              />
            </Box>
          )}

          {activeTab === 'gp' && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder={t('crossSelling.tableSearchPlaceholder')}
                  value={gpSearch}
                  onChange={(e) => setGpSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 240 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('crossSelling.tableSortLabel')}
                  value={gpSort}
                  onChange={(e) => setGpSort(e.target.value as typeof gpSort)}
                  sx={{ width: { xs: '100%', sm: 200 } }}
                >
                  <MenuItem value="gp_desc">{t('customerMetrics.m4.colGp')}</MenuItem>
                  <MenuItem value="name">{t('crossSelling.tableSortName')}</MenuItem>
                </TextField>
              </Box>

              <ResponsiveListView
                rows={gpRows.map((r) => ({ ...r, id: r.ranking }))}
                columns={gpColumns}
                loading={gpLoading}
                height={560}
                pageSize={25}
                pageSizeOptions={[25, 50, 100]}
                emptyMessage={t('customerMetrics.m4.emptyMessage')}
                mobileFields={['customer_name', 'gp', 'gp_pct', 'tier']}
              />
            </Box>
          )}

          {activeTab === 'hm' && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder={t('crossSelling.tableSearchPlaceholder')}
                  value={hmSearch}
                  onChange={(e) => setHmSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 240 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('crossSelling.tableSortLabel')}
                  value={hmSort}
                  onChange={(e) => setHmSort(e.target.value as typeof hmSort)}
                  sx={{ width: { xs: '100%', sm: 200 } }}
                >
                  <MenuItem value="hm_desc">{t('customerMetrics.m5.colRevenueHm')}</MenuItem>
                  <MenuItem value="name">{t('crossSelling.tableSortName')}</MenuItem>
                </TextField>
              </Box>

              <ResponsiveListView
                rows={hmRows.map((r) => ({ ...r, id: r.ranking }))}
                columns={hmColumns}
                loading={hmLoading}
                height={560}
                pageSize={25}
                pageSizeOptions={[25, 50, 100]}
                emptyMessage={t('customerMetrics.m5.emptyMessage')}
                mobileFields={['customer_name', 'hm_revenue', 'hm_pct']}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
