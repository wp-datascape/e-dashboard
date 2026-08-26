import { useMemo, useState } from 'react';
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
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';

import { useRorBreakdown, useDormantBreakdown, useDormantStatusBreakdown } from '@/hooks/useMetrics';
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
import { useRorColumns } from '../../CustomerMetrics/rorHelpers';
import { useDormantBreakdownColumns, useDormantStatusColumns } from '../../DormantCustomer/dormantHelpers';
import type { DormantCustomerStatus } from '@/types/metrics';
import { formatRupiah } from '@/utils/format';
import { ReportTabCard } from '../ReportTabCard';
import { ReportSummaryCards } from '../ReportSummaryCards';
import { ReactivationSummaryCards } from './ReactivationSummaryCards';

// Laporan > Retention (task029.md §30.19/§32, 2026-08-24) — sebelumnya
// placeholder "coming soon" (Report/Retention/index.tsx belum pernah diisi,
// lihat komentar lama di sini: "belum ada yang dipindahkan, BELUM
// diputuskan"). Instruksi user: "buat breakdown tabel di menu laporan/
// retention" — 3 tab tabel granular, pola SAMA PERSIS Report/Growth/
// index.tsx (BUKAN chart, TIDAK ada chart sama sekali di sini, chart tetap
// di /retention).
//
// M6 (Repeat Order) py tab sendiri ('ror', 1:1 dgn fetchRorBreakdown/
// useRorBreakdown, granularitas-aware — date_from dikirim, susulan fix
// task029.md §32.1). M8 (Dormant Rate) dan M9 (Dormant Value) SATU tab
// bareng ('dormant') — keduanya sumber data SAMA PERSIS
// (fetchDormantValueRanking, lihat komentar DormantBreakdownData di
// metrics.ts: "row shape reuse DormantValueRankingRow"), tidak masuk akal
// dipisah jadi 2 tabel identik. M10 (Reaktivasi) py tab sendiri
// ('reactivation') — sumber beda (status log per customer, 4 status:
// aktif/dormant/reaktivasi/reaktivasi-lalu-dormant-lagi), py filter Status
// krn populasinya JAUH lebih besar dari 3 tab lain (SEMUA customer scope,
// bukan cuma yang dormant) — comment M10ReactivationRate.tsx sudah
// mengantisipasi ini: "kategori aktif/dormant tetap tersedia utk halaman
// Laporan nanti".
//
// `useDormantBreakdown` (tab 'dormant') belum terima period_type/date_from
// sama sekali (`getDormantBreakdown` backend murni snapshot per
// `period_end`, lihat metrics.service.ts) — TIDAK dikirim di sini,
// konsisten dgn kapabilitas backend yang sebenarnya (bukan dikira-kira).
type ReportRetentionTab = 'ror' | 'dormant' | 'reactivation';

export default function ReportRetention() {
  const { t } = useTranslation();
  const can = useCan();
  const canExpansion = can('expansion:view');
  const canChurnRisk = can('churn.risk:view');

  const availableTabs: ReportRetentionTab[] = [
    ...(canExpansion ? (['ror'] as const) : []),
    ...(canChurnRisk ? (['dormant', 'reactivation'] as const) : []),
  ];

  // Query param `?tab=` (pola sama persis Report/Growth) — dipakai link
  // "Cek Detail di Laporan" M6/M8/M9/M10.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ReportRetentionTab | null;
  const [tab, setTab] = useState<ReportRetentionTab | null>(
    (tabParam && availableTabs.includes(tabParam) ? tabParam : availableTabs[0]) ?? null,
  );
  const activeTab = tab && availableTabs.includes(tab) ? tab : (availableTabs[0] ?? null);

  // Filter: quick (auto-apply) vs advanced (staged/draft) — pola SAMA PERSIS
  // Report/Growth/index.tsx & Retention/index.tsx.
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
  // Report/Growth Expansion tab) — dipakai M6 saja (satu-satunya endpoint
  // di halaman ini yang benar-benar mendukungnya, lihat komentar atas).
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const reportPeriodKey = getCurrentPeriodKey(periodTypeFilter.periodType, new Date(py, pm - 1, pd));
  const periodStart = getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).start;
  // periodEndEffective (2026-08-26, task031.md — bug SAMA PERSIS
  // Report/Revenue/Report/Growth: `periodEnd` mentah saat "Apply date
  // cutoff" OFF cuma tanggal 1 bulan yang dipilih, bukan tanggal query
  // sungguhan — useRorBreakdown/useDormantBreakdown/useDormantStatusBreakdown
  // TIDAK terima `apply_date_cutoff`, jadi period_end HARUS akhir periode
  // sungguhan dari sini.
  const periodEndEffective = applyDateCutoff
    ? periodEnd
    : clampPeriodEndToToday(periodTypeFilter.periodType, reportPeriodKey, getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).end);

  const { data: rorData, isLoading: rorLoading } = useRorBreakdown({
    period_end: periodEndEffective,
    date_from: periodStart,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const rorColumns = useRorColumns(t);
  const [rorSearch, setRorSearch] = useState('');
  const [rorSort, setRorSort] = useState<'name' | 'revenue_desc' | 'order_desc'>('name');
  const rorRows = useMemo(() => {
    const rows = rorData?.rows ?? [];
    const q = rorSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered];
    if (rorSort === 'revenue_desc') sorted.sort((a, b) => b.total_revenue - a.total_revenue);
    else if (rorSort === 'order_desc') sorted.sort((a, b) => b.invoice_count - a.invoice_count);
    else sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    return sorted;
  }, [rorData, rorSearch, rorSort]);

  const { data: dormantData, isLoading: dormantLoading } = useDormantBreakdown({
    period_end: periodEndEffective,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const dormantColumns = useDormantBreakdownColumns(t);
  const [dormantSearch, setDormantSearch] = useState('');
  const [dormantSort, setDormantSort] = useState<'name' | 'loss_desc' | 'months_desc'>('loss_desc');
  const dormantRows = useMemo(() => {
    const rows = dormantData?.rows ?? [];
    const q = dormantSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered];
    if (dormantSort === 'months_desc') sorted.sort((a, b) => b.months_dormant - a.months_dormant);
    else if (dormantSort === 'name') sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    else sorted.sort((a, b) => b.estimated_lost_value - a.estimated_lost_value);
    return sorted;
  }, [dormantData, dormantSearch, dormantSort]);
  // dormantTotals (2026-08-26, task029.md §36.16) — DormantBreakdownData
  // TIDAK punya field agregat top-level (beda dari Revenue/GP/HM), cuma
  // `rows` — dijumlah di sini. AMAN krn `useDormantBreakdown` (backend
  // `getDormantBreakdown`) SUDAH limit=null (SEMUA dormant customer, bukan
  // top-N), bukan pola bug task031.md §12 (sum dari array terpotong).
  const dormantTotals = useMemo(() => {
    const rows = dormantData?.rows ?? [];
    return {
      count: rows.length,
      lostValue: rows.reduce((acc, r) => acc + r.estimated_lost_value, 0),
      lostGp: rows.reduce((acc, r) => acc + r.estimated_lost_gp, 0),
    };
  }, [dormantData]);

  const { data: statusData, isLoading: statusLoading } = useDormantStatusBreakdown({
    period_end: periodEndEffective,
    date_from: periodStart,
    period_type: periodTypeFilter.periodType,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const statusColumns = useDormantStatusColumns(t);
  const [statusSearch, setStatusSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DormantCustomerStatus | 'all'>('all');
  // Ringkasan per status (2026-08-24) — pola sama persis `counts` di dialog
  // M10ReactivationRate.tsx, dihitung dari SEMUA baris hasil fetch.
  const statusCounts = useMemo(() => {
    const rows = statusData?.rows ?? [];
    return {
      active:      rows.filter((r) => r.status === 'active').length,
      dormant:     rows.filter((r) => r.status === 'dormant').length,
      reactivated: rows.filter((r) => r.status === 'reactivated').length,
      relapsed:    rows.filter((r) => r.status === 'relapsed').length,
    };
  }, [statusData]);
  const statusRows = useMemo(() => {
    const rows = statusData?.rows ?? [];
    const byStatus = statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter);
    const q = statusSearch.trim().toLowerCase();
    return q
      ? byStatus.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : byStatus;
  }, [statusData, statusFilter, statusSearch]);

  const isLoading = activeTab === 'ror' ? rorLoading : activeTab === 'dormant' ? dormantLoading : statusLoading;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.report')} · {t('nav.groups.retention')}</Typography>

        {(canExpansion || canChurnRisk) && (
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
            {canExpansion && <Tab value="ror" label={t('metrics.repeatOrderShort')} />}
            {canChurnRisk && <Tab value="dormant" label={t('metrics.dormantShort')} />}
            {canChurnRisk && <Tab value="reactivation" label={t('metrics.reactivationShort')} />}
          </Tabs>

          {activeTab === 'ror' && (
            <Box sx={{ pt: 1 }}>
              {/* Standar layout Reaktivasi diterapkan (2026-08-26,
                  task029.md §36.18/§36.19 — keputusan user: "layout
                  reaktivasi adalah layout standar untuk menu laporan") —
                  kartu ringkasan ikon+persentase, di LUAR ReportTabCard. */}
              {/* info tooltip (2026-08-26, task029.md §36.20 — instruksi
                  user: "verifikasi setiap data nya dan berikan info
                  tooltip agar user tidak salah faham") — "Total Existing
                  Customer" di sini HANYA yang aktif periode ini, angkanya
                  jauh lebih kecil dari "Jumlah Dormant" tab sebelah
                  (populasi SELURUH customer established) — diverifikasi
                  langsung ke DB (bukan bug, beda window). */}
              <ReportSummaryCards items={[
                { label: t('customerMetrics.m6.summaryExisting'), value: (rorData?.total_existing ?? 0).toLocaleString('id-ID'), icon: PeopleOutlineIcon,
                  info: t('customerMetrics.m6.summaryExistingInfo') },
                { label: t('customerMetrics.m6.summaryRepeatCount'), value: (rorData?.repeat_count ?? 0).toLocaleString('id-ID'),
                  pct: rorData && rorData.total_existing > 0 ? `${((rorData.repeat_count / rorData.total_existing) * 100).toFixed(1)}%` : null,
                  icon: RefreshIcon, iconColor: 'primary', highlighted: true, info: t('customerMetrics.m6.summaryRepeatCountInfo') },
              ]} />
              <ReportTabCard
                searchValue={rorSearch}
                onSearchChange={setRorSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={rorSort}
                onSortChange={(v) => setRorSort(v as typeof rorSort)}
                sortLabel={t('crossSelling.tableSortLabel')}
                sortOptions={[
                  { value: 'name', label: t('crossSelling.tableSortName') },
                  { value: 'revenue_desc', label: t('crossSelling.tableSortRevenueDesc') },
                  { value: 'order_desc', label: t('customerMetrics.m6.colOrderCount') },
                ]}
              >
                <ResponsiveListView
                  rows={rorRows.map((r) => ({ ...r, id: r.ranking }))}
                  columns={rorColumns}
                  loading={rorLoading}
                  height={560}
                  pageSize={25}
                  pageSizeOptions={[25, 50, 100]}
                  emptyMessage={t('customerMetrics.m6.emptyMessage')}
                  mobileFields={['customer_name', 'invoice_count', 'total_revenue']}
                />
              </ReportTabCard>
            </Box>
          )}

          {activeTab === 'dormant' && (
            <Box sx={{ pt: 1 }}>
              {/* info tooltip (2026-08-26, §36.20) — "Jumlah Dormant" di
                  sini mencakup SELURUH customer established (tidak
                  dibatasi periode berjalan), makanya jauh lebih besar
                  dari "Total Existing Customer" tab Repeat Order — sudah
                  diverifikasi ke DB, bukan bug. */}
              <ReportSummaryCards items={[
                { label: t('dormantCustomer.dormantCountLabel'), value: dormantTotals.count.toLocaleString('id-ID'), icon: PauseCircleOutlinedIcon, iconColor: 'warning', highlighted: true,
                  info: t('dormantCustomer.dormantCountInfo') },
                { label: t('dormantCustomer.m9TotalLossLabel'), value: formatRupiah(dormantTotals.lostValue), icon: TrendingDownIcon, iconColor: 'error',
                  info: t('dormantCustomer.m9TotalLossInfo') },
                { label: t('dormantCustomer.m9TotalLossGpLabel'), value: formatRupiah(dormantTotals.lostGp), icon: TrendingDownIcon, iconColor: 'error',
                  info: t('dormantCustomer.m9TotalLossGpInfo') },
              ]} />
              <ReportTabCard
                searchValue={dormantSearch}
                onSearchChange={setDormantSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={dormantSort}
                onSortChange={(v) => setDormantSort(v as typeof dormantSort)}
                sortLabel={t('crossSelling.tableSortLabel')}
                sortOptions={[
                  { value: 'loss_desc', label: t('dormantCustomer.colEstimatedLoss') },
                  { value: 'months_desc', label: t('dormantCustomer.colMonthsDormant') },
                  { value: 'name', label: t('crossSelling.tableSortName') },
                ]}
              >
                <ResponsiveListView
                  rows={dormantRows.map((r) => ({ ...r, id: r.customer_id }))}
                  columns={dormantColumns}
                  loading={dormantLoading}
                  height={560}
                  pageSize={25}
                  pageSizeOptions={[25, 50, 100]}
                  emptyMessage={t('dormantCustomer.m8TopCustomersEmpty')}
                  mobileFields={['customer_name', 'months_dormant', 'estimated_lost_value', 'estimated_lost_gp']}
                />
              </ReportTabCard>
            </Box>
          )}

          {activeTab === 'reactivation' && (
            <Box sx={{ pt: 1 }}>
              {/* ReactivationSummaryCards (2026-08-26, task029.md §36.17 —
                  instruksi user: "Summary Stats Redesign", kartu Avatar+ikon
                  ganti baris caption ReportSummaryLine lama) — DI LUAR
                  ReportTabCard (bukan summaryItems lagi), krn spec pisahkan
                  "Summary Stats" dari "Filter Bar" sbg 2 blok visual beda. */}
              <ReactivationSummaryCards
                total={statusData?.rows.length ?? 0}
                active={statusCounts.active}
                dormant={statusCounts.dormant}
                reactivated={statusCounts.reactivated}
                relapsed={statusCounts.relapsed}
              />
              <ReportTabCard
                searchValue={statusSearch}
                onSearchChange={setStatusSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={statusFilter}
                onSortChange={(v) => setStatusFilter(v as typeof statusFilter)}
                sortLabel={t('dormantCustomer.colStatus')}
                sortOptions={[
                  { value: 'all', label: t('dormantCustomer.statusAll') },
                  { value: 'active', label: t('dormantCustomer.statusActive') },
                  { value: 'dormant', label: t('dormantCustomer.statusDormant') },
                  { value: 'reactivated', label: t('dormantCustomer.statusReactivated') },
                  { value: 'relapsed', label: t('dormantCustomer.statusRelapsed') },
                ]}
              >
                <ResponsiveListView
                  rows={statusRows.map((r) => ({ ...r, id: r.customer_id }))}
                  columns={statusColumns}
                  loading={statusLoading}
                  height={560}
                  pageSize={25}
                  pageSizeOptions={[25, 50, 100]}
                  emptyMessage={t('dormantCustomer.m10ReactivationEmpty')}
                  mobileFields={['customer_name', 'status', 'dormant_duration', 'reactivation_date']}
                />
              </ReportTabCard>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
