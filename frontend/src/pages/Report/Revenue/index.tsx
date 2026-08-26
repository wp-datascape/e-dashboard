import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
import { getCurrentPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import { useRevenueColumns, useGpColumns, useHmColumns } from '../../CustomerMetrics/valueHelpers';
// HighMarginProductTab/UpsellTargetsTab/FilterState (2026-08-26,
// task031.md §10 — instruksi user: "pindahkan ke menu laporan") — REUSE
// LANGSUNG dari ProductsHighMargin/index.tsx, BUKAN diduplikasi, jadi
// sub-tab "Penetrasi Produk"/"Target Upsell" di sini bareng "Ranking
// Customer" (M5) yang sudah ada di tab "hm". periodMonth diturunkan dari
// `periodEnd` global (lihat komentar hmFilter di bawah) — tidak perlu
// helper todayMonth lagi.
import { HighMarginProductTab, UpsellTargetsTab } from '../../ProductsHighMargin';
import type { FilterState as HmFilterState } from '../../ProductsHighMargin';
import { formatRupiah } from '@/utils/format';
import { ReportTabCard } from '../ReportTabCard';

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

  const [onlyPareto, setOnlyPareto] = useState(false); // task029.md §35
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
  // periodEndEffective (2026-08-26, bug ditemukan user: "data nya kosong
  // jika di filter" — periodEnd MENTAH saat "Apply date cutoff" OFF cuma
  // menyimpan tanggal 1 bulan yang dipilih (`${picked}-01`, lihat
  // DatePicker onChange di bawah — konvensi "tanggal 1 = penanda bulan
  // ini", BUKAN tanggal query sungguhan), tapi dikirim APA ADANYA sbg
  // `period_end` ke 3 hook di bawah — window query jadi cuma 1 HARI
  // (date_from = period_end = tanggal 1) krn periodStart JUGA tanggal 1
  // bulan yang sama. Diverifikasi langsung ke DB: query dgn period_end=
  // date_from='2026-06-01' persis reproduksi laporan user (total_existing
  // 67, hm_buyer_count 0) — versi benar (period_end=akhir bulan) hasilnya
  // total_existing 1561, hm_buyer_count 70. Fix: turunkan akhir periode
  // SUNGGUHAN dari getPeriodDateRange (SAMA pola periodStart di atas),
  // clamp ke hari ini kalau periode masih berjalan (pola SAMA PERSIS
  // clampPeriodEndToToday M1-M10). Saat applyDateCutoff AKTIF, periodEnd
  // MEMANG tanggal presisi yang dipilih user — TIDAK diubah.
  const periodEndEffective = applyDateCutoff
    ? periodEnd
    : clampPeriodEndToToday(periodTypeFilter.periodType, reportPeriodKey, getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).end);

  const { data: revenueData, isLoading: revenueLoading } = useRevenueBreakdown({
    period_end: periodEndEffective,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
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
    period_end: periodEndEffective,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const gpColumns = useGpColumns(t);
  const [gpSearch, setGpSearch] = useState('');
  const [gpSort, setGpSort] = useState<'name' | 'gp_desc'>('gp_desc');
  const gpRows = (gpData?.rows ?? [])
    .filter((r) => !gpSearch.trim() || r.customer_name.toLowerCase().includes(gpSearch.trim().toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(gpSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (gpSort === 'name' ? a.customer_name.localeCompare(b.customer_name) : b.gp - a.gp));

  const { data: hmData, isLoading: hmLoading } = useHmBreakdown({
    period_end: periodEndEffective,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const hmColumns = useHmColumns(t);
  const [hmSearch, setHmSearch] = useState('');
  const [hmSort, setHmSort] = useState<'name' | 'hm_desc'>('hm_desc');
  const hmRows = (hmData?.rows ?? [])
    .filter((r) => !hmSearch.trim() || r.customer_name.toLowerCase().includes(hmSearch.trim().toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(hmSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (hmSort === 'name' ? a.customer_name.localeCompare(b.customer_name) : b.hm_revenue - a.hm_revenue));

  // Sub-tab tab "hm" (2026-08-26, task031.md §10 — instruksi user:
  // "pindahkan ke menu laporan") — "Ranking Customer" (di atas, dataset
  // periodEnd/periodStart SAMA dgn Revenue/GP), lalu "Penetrasi Produk"/
  // "Target Upsell" dari /products/high-margin, REUSE komponen langsung.
  //
  // Filter periode terpisah (periodMonth+activeWindow + picker sendiri)
  // SEMPAT ditambah, TAPI ditegur user: "data nya kosong jika di filter...
  // untuk filter data gunakan filter global saja" — filter lokal itu tidak
  // sinkron dgn "Periode" global di atas (2 kontrol beda paradigma
  // gampang bikin salah pilih kombinasi kosong). DIHAPUS — periodMonth
  // SEKARANG DITURUNKAN dari `periodEnd` global (irisan bulan yang sama),
  // activeWindow FIXED 6 bulan (tidak ada padanan konsep di filter global
  // manapun — nilai default ProductsHighMargin sebelumnya, bukan dibuat
  // baru). Company/branch/division/excludeIntercompany TETAP reuse scope
  // filter halaman (tidak berubah).
  type HmInnerTab = 'ranking' | 'penetration' | 'upsell';
  const [hmInnerTab, setHmInnerTab] = useState<HmInnerTab>('ranking');
  const hmFilter: HmFilterState = {
    companyId, branchId, division,
    periodMonth: periodEnd.slice(0, 7), activeWindow: 6,
    excludeIntercompany,
  };

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
              <ReportTabCard
                summaryItems={[
                  { label: t('customerMetrics.m3.summaryExisting'), value: (revenueData?.total_existing ?? 0).toLocaleString('id-ID') },
                  { label: t('customerMetrics.m3.summaryTotalRevenue'), value: formatRupiah(revenueData?.total_revenue ?? 0) },
                  { label: t('customerMetrics.m3.rowHmContribution'), value: formatRupiah(revenueData?.hm_revenue ?? 0) },
                ]}
                searchValue={revenueSearch}
                onSearchChange={setRevenueSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={revenueSort}
                onSortChange={(v) => setRevenueSort(v as typeof revenueSort)}
                sortLabel={t('crossSelling.tableSortLabel')}
                sortOptions={[
                  { value: 'revenue_desc', label: t('crossSelling.tableSortRevenueDesc') },
                  { value: 'hm_desc', label: t('customerMetrics.m3.colHmRevenue') },
                  { value: 'name', label: t('crossSelling.tableSortName') },
                ]}
              >
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
              </ReportTabCard>
            </Box>
          )}

          {activeTab === 'gp' && (
            <Box sx={{ pt: 1 }}>
              <ReportTabCard
                summaryItems={[
                  { label: t('customerMetrics.m4.summaryExisting'), value: (gpData?.total_existing ?? 0).toLocaleString('id-ID') },
                  { label: t('customerMetrics.m4.summaryTotalGp'), value: formatRupiah(gpData?.total_gp ?? 0) },
                ]}
                searchValue={gpSearch}
                onSearchChange={setGpSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={gpSort}
                onSortChange={(v) => setGpSort(v as typeof gpSort)}
                sortLabel={t('crossSelling.tableSortLabel')}
                sortOptions={[
                  { value: 'gp_desc', label: t('customerMetrics.m4.colGp') },
                  { value: 'name', label: t('crossSelling.tableSortName') },
                ]}
              >
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
              </ReportTabCard>
            </Box>
          )}

          {activeTab === 'hm' && (
            <Box sx={{ pt: 1 }}>
              {/* Sub-tab (2026-08-26, task031.md §10) — "Ranking Customer"
                  (M5, sudah ada) + "Penetrasi Produk"/"Target Upsell"
                  (dipindahkan dari /products/high-margin). */}
              <Tabs
                value={hmInnerTab}
                onChange={(_, v) => setHmInnerTab(v)}
                sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', py: 0.5 } }}
              >
                <Tab value="ranking" label={t('customerMetrics.m5.topCustomersLabel')} />
                <Tab value="penetration" label={t('productsHighMargin.tabCategories')} />
                <Tab value="upsell" label={t('productsHighMargin.tabUpsellTargets')} />
              </Tabs>

              {hmInnerTab === 'ranking' && (
                <ReportTabCard
                  summaryItems={[
                    { label: t('customerMetrics.m5.summaryExisting'), value: (hmData?.total_existing ?? 0).toLocaleString('id-ID') },
                    { label: t('customerMetrics.m5.summaryBuyerCount'), value: (hmData?.hm_buyer_count ?? 0).toLocaleString('id-ID') },
                    { label: t('customerMetrics.m3.rowHmContribution'), value: formatRupiah(hmData?.total_hm_revenue ?? 0) },
                  ]}
                  searchValue={hmSearch}
                  onSearchChange={setHmSearch}
                  searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                  sortValue={hmSort}
                  onSortChange={(v) => setHmSort(v as typeof hmSort)}
                  sortLabel={t('crossSelling.tableSortLabel')}
                  sortOptions={[
                    { value: 'hm_desc', label: t('customerMetrics.m5.colRevenueHm') },
                    { value: 'name', label: t('crossSelling.tableSortName') },
                  ]}
                >
                  <ResponsiveListView
                    rows={hmRows.map((r) => ({ ...r, id: r.ranking }))}
                    columns={hmColumns}
                    loading={hmLoading}
                    height={560}
                    pageSize={25}
                    pageSizeOptions={[25, 50, 100]}
                    emptyMessage={t('customerMetrics.m5.emptyMessage')}
                    mobileFields={['customer_name', 'hm_qty', 'hm_revenue', 'hm_pct']}
                  />
                </ReportTabCard>
              )}

              {/* Filter periode TERPISAH sempat ada di sini, DIHAPUS
                  2026-08-26 (ditegur user, lihat komentar hmFilter di
                  atas) — "Penetrasi Produk"/"Target Upsell" sekarang
                  IKUT "Periode" global di header halaman (via periodMonth
                  turunan `periodEnd`), TIDAK ADA kontrol tambahan di sini. */}
              {hmInnerTab === 'penetration' && <HighMarginProductTab filter={hmFilter} />}
              {hmInnerTab === 'upsell' && <UpsellTargetsTab filter={hmFilter} />}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
