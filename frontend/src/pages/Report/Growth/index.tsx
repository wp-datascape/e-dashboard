import { useMemo, useState } from 'react';
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

import { useCrossSelling, useExpansionBreakdown } from '@/hooks/useMetrics';
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
import { todayStr } from '../../CrossSelling/helpers';
import { clampDateNotFuture } from '@/utils/date';
import { getCurrentPeriodKey, getPeriodDateRange } from '@/utils/analisisPeriod';
import { BreakdownTable } from '../../CrossSelling/BreakdownTable';
import { useExpansionColumns } from '../../CustomerMetrics/expansionHelpers';

// Laporan > Growth (task029.md §30.19, 2026-08-22) — tabel breakdown Cross
// Selling/Category (BreakdownTable, sama komponen persis M1CrossSelling.tsx/
// M2AvgCategory.tsx sebelum dipindah) + Expansion (ResponsiveListView, sama
// pola M7ExpansionGrowth.tsx sebelum dipindah). Halaman KHUSUS TABEL, TIDAK
// ada chart sama sekali (koreksi keras user: "kembalikan ke kondisi UI
// awal", "terlalu kotor jika chart digabung dengan tabel", "buatkan saja
// halaman khusus tabel") — chart-nya TETAP di /growth (Growth/index.tsx),
// halaman ini murni pelengkap breakdown-nya.
//
// M1 dan M2 SAMA PERSIS 1 dataset (`useCrossSelling`, `BreakdownTable`
// generik utk keduanya — lihat BreakdownTable.tsx) — makanya di sini cuma
// 1 tab "Cross Selling" (bukan 2 tab M1+M2 terpisah yang isinya duplikat
// tabel yang sama).
//
// Filter SENDIRI (bukan share state dgn /growth) — halaman terpisah, user
// bisa lihat tabel utk scope/periode berbeda dari yang sedang dilihat di
// halaman chart. Struktur+PERILAKU filter SEKARANG SAMA PERSIS Growth/
// index.tsx (2026-08-23, instruksi user: "filternya buat sama memakai
// filter global") — quick bar (Entitas + Periode + Apply date cutoff) auto-
// apply, panel Filter Lanjutan (Cabang/Divisi/Granularitas/Exclude
// Intercompany/Pareto) staged (draft) sampai tombol Terapkan diklik. Field
// Periode sebelumnya TextField type="date" polos (tanpa batas masa depan,
// tanpa mode "Apply date cutoff") — DIGANTI `DatePicker` yang sama, REUSE
// bukan tulis ulang.
type ReportGrowthTab = 'cross_selling' | 'expansion';

export default function ReportGrowth() {
  const { t } = useTranslation();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');
  const canExpansion = can('expansion:view');

  const availableTabs: ReportGrowthTab[] = [
    ...(canCrossSelling ? (['cross_selling'] as const) : []),
    ...(canExpansion ? (['expansion'] as const) : []),
  ];
  // Query param `?tab=` (2026-08-23, task029.md §31) — dipakai link "Cek
  // Detail" di bawah Top 5/Top Movers (M1CrossSelling.tsx/M2AvgCategory.tsx/
  // M7ExpansionGrowth.tsx) supaya mendarat langsung ke tab yang relevan
  // ("cross_selling" utk M1/M2, "expansion" utk M7), bukan selalu tab
  // pertama. Cuma penentu tab AWAL — filter (Entitas/Periode/dst) di
  // halaman ini TETAP independen (§30.19, "Filter SENDIRI bukan share
  // state dgn /growth"), TIDAK ikut dibawa lewat query param apapun.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ReportGrowthTab | null;
  const [tab, setTab] = useState<ReportGrowthTab | null>(
    (tabParam && availableTabs.includes(tabParam) ? tabParam : availableTabs[0]) ?? null,
  );
  const activeTab = tab && availableTabs.includes(tab) ? tab : (availableTabs[0] ?? null);

  // Filter: quick (auto-apply) vs advanced (staged/draft) — pola SAMA PERSIS
  // Growth/index.tsx (lihat komentar di sana utk alasan lengkap kenapa
  // scopeFilter/periodTypeFilter di-instantiate 2x, draft+applied).
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

  const { data: csData, isLoading: csLoading } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canCrossSelling && activeTab === 'cross_selling' });

  // YoY (period_end -1 tahun) — dibutuhkan BreakdownTable utk kolom YoY
  // Category Count/Revenue YoY/Cross Sell Status, pola sama M1/M2.
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const yoyPeriodEnd = `${py - 1}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}`;
  const { data: yoyData } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: yoyPeriodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canCrossSelling && activeTab === 'cross_selling' });

  // date_from = awal periode AKTIF (granularitas-aware — bukan selalu awal
  // bulan, koreksi bug class sama M7ExpansionGrowth.tsx: tanpa ini
  // fetchExpansionBreakdown fallback ke window activeMonths lama utk
  // Kuartal/Semester/Tahun, bukan rentang penuh periode yang dipilih).
  const reportPeriodKey = getCurrentPeriodKey(periodTypeFilter.periodType, new Date(py, pm - 1, pd));
  const { data: expansionData, isLoading: expansionLoading } = useExpansionBreakdown({
    period_end: periodEnd,
    date_from: getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).start,
    period_type: periodTypeFilter.periodType,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  });

  const expansionColumns = useExpansionColumns(t);
  const [expansionSearch, setExpansionSearch] = useState('');
  const [expansionSort, setExpansionSort] = useState<'name' | 'revenue_desc' | 'change_desc'>('name');
  const expansionRows = useMemo(() => {
    const rows = expansionData?.rows ?? [];
    const q = expansionSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered];
    if (expansionSort === 'revenue_desc') sorted.sort((a, b) => b.cur_revenue - a.cur_revenue);
    else if (expansionSort === 'change_desc') sorted.sort((a, b) => (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity));
    else sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    return sorted;
  }, [expansionData, expansionSearch, expansionSort]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.report')} · {t('nav.groups.growth')}</Typography>

        {(canCrossSelling || canExpansion) && (
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
                  loading={csLoading || expansionLoading}
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
            {canCrossSelling && <Tab value="cross_selling" label={t('metrics.crossSellingShort')} />}
            {canExpansion && <Tab value="expansion" label={t('metrics.expansionShort')} />}
          </Tabs>

          {activeTab === 'cross_selling' && (
            <Box sx={{ pt: 1 }}>
              <BreakdownTable data={csData} yoyData={yoyData} isLoading={csLoading} />
            </Box>
          )}

          {activeTab === 'expansion' && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder={t('crossSelling.tableSearchPlaceholder')}
                  value={expansionSearch}
                  onChange={(e) => setExpansionSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 240 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('crossSelling.tableSortLabel')}
                  value={expansionSort}
                  onChange={(e) => setExpansionSort(e.target.value as typeof expansionSort)}
                  sx={{ width: { xs: '100%', sm: 200 } }}
                >
                  <MenuItem value="name">{t('crossSelling.tableSortName')}</MenuItem>
                  <MenuItem value="revenue_desc">{t('crossSelling.tableSortRevenueDesc')}</MenuItem>
                  <MenuItem value="change_desc">{t('customerMetrics.m7.tableSortChangeDesc')}</MenuItem>
                </TextField>
              </Box>

              <ResponsiveListView
                rows={expansionRows.map((r) => ({ ...r, id: r.ranking }))}
                columns={expansionColumns}
                loading={expansionLoading}
                height={560}
                pageSize={25}
                pageSizeOptions={[25, 50, 100]}
                emptyMessage={t('customerMetrics.m7.emptyMessage')}
                mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
