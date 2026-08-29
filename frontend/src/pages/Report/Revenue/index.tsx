import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CategoryIcon from '@mui/icons-material/Category';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTranslation } from 'react-i18next';

import { useRevenueBreakdown, useGpBreakdown, useHmBreakdown } from '@/hooks/useMetrics';
import { useHighMarginProductDetail, useUpsellTargets } from '@/hooks/useProducts';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { useCan } from '@/hooks/useCan';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
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
import { ReportSummaryCards } from '../ReportSummaryCards';

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

  // Filter global — sejak 2026-08-28 REUSE `useAdvancedFilterBar`+
  // `AdvancedFilterBar` (task029.md §41-lanjutan), sebelumnya state+markup
  // filter DISALIN manual di sini — lihat JSDoc hook itu utk riwayat
  // ekstraksi lengkap.
  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, applyDateCutoff, periodTypeFilter, onlyPareto } = filterBar;
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

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

  // Kartu ringkasan sub-tab "Penetrasi Produk"/"Target Upsell" (2026-08-27
  // — instruksi user: "Tambahkan card summary di setiap halaman tab nya",
  // sebelumnya 2 sub-tab ini TIDAK punya kartu ringkasan sama sekali).
  // per_page=100 (maksimum backend, metrics.schema.ts) — pola SAMA PERSIS
  // ProductsHighMargin/index.tsx (halaman asal komponen ini), REUSE bukan
  // fetch baru yang beda cara hitung.
  const { data: penetrationSummaryData } = useHighMarginProductDetail({
    company_id: hmFilter.companyId,
    branch_id: hmFilter.branchId === 'all' ? undefined : hmFilter.branchId,
    division: hmFilter.division || undefined,
    exclude_intercompany: hmFilter.excludeIntercompany,
    period_month: hmFilter.periodMonth,
    active_window: hmFilter.activeWindow,
    page: 1,
    per_page: 100,
  });
  const penetrationProductCount = penetrationSummaryData?.meta.total ?? 0;
  const penetrationAvgRate = penetrationSummaryData?.data.length
    ? penetrationSummaryData.data.reduce((sum, r) => sum + r.penetration_rate, 0) / penetrationSummaryData.data.length
    : 0;

  const { data: upsellSummaryData } = useUpsellTargets({
    company_id: hmFilter.companyId,
    branch_id: hmFilter.branchId === 'all' ? undefined : hmFilter.branchId,
    division: hmFilter.division || undefined,
    exclude_intercompany: hmFilter.excludeIntercompany,
    period_month: hmFilter.periodMonth,
    active_window: hmFilter.activeWindow,
    page: 1,
    per_page: 100,
  });
  const upsellTargetCount = upsellSummaryData?.meta.total ?? 0;
  const upsellAvgRevenue = upsellSummaryData?.data.length
    ? upsellSummaryData.data.reduce((sum, r) => sum + r.avg_monthly_revenue, 0) / upsellSummaryData.data.length
    : 0;

  const isLoading = activeTab === 'revenue' ? revenueLoading : activeTab === 'gp' ? gpLoading : hmLoading;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AdvancedFilterBar
        title={<>{t('nav.groups.report')} · {t('nav.groups.value')}</>}
        filter={filterBar}
        hasAccess={canExpansion}
        loading={isLoading}
      >
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
              {/* Kartu ringkasan (2026-08-27 — instruksi user: "Penataan
                  layout seperti laporan yang lain") — SEBELUMNYA baris teks
                  di dalam ReportTabCard (summaryItems/ReportSummaryLine,
                  pola LAMA sebelum §36.18-20 standarisasi Reaktivasi) —
                  Growth/Retention sudah pindah ke ReportSummaryCards
                  (kartu Grid terpisah dgn ikon+tooltip), Revenue ketinggalan
                  belum ikut. Disamakan di sini. */}
              <ReportSummaryCards items={[
                { label: t('customerMetrics.m3.summaryExisting'), value: (revenueData?.total_existing ?? 0).toLocaleString('id-ID'),
                  icon: PeopleOutlineIcon, info: t('customerMetrics.m3.summaryExistingInfo') },
                { label: t('customerMetrics.m3.summaryTotalRevenue'), value: formatRupiah(revenueData?.total_revenue ?? 0),
                  icon: PaidOutlinedIcon, iconColor: 'primary', highlighted: true },
                { label: t('customerMetrics.m3.rowHmContribution'), value: formatRupiah(revenueData?.hm_revenue ?? 0),
                  icon: WorkspacePremiumIcon, iconColor: 'success' },
              ]} />
              <ReportTabCard
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
              <ReportSummaryCards items={[
                { label: t('customerMetrics.m4.summaryExisting'), value: (gpData?.total_existing ?? 0).toLocaleString('id-ID'),
                  icon: PeopleOutlineIcon, info: t('customerMetrics.m4.summaryExistingInfo') },
                { label: t('customerMetrics.m4.summaryTotalGp'), value: formatRupiah(gpData?.total_gp ?? 0),
                  icon: PaidOutlinedIcon, iconColor: 'primary', highlighted: true },
              ]} />
              <ReportTabCard
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
                  (dipindahkan dari /products/high-margin).
                  variant="scrollable" (2026-08-27 — bug ditemukan user:
                  "halaman tab target upsell di mode mobile tidak terlihat...
                  tab nya tidak bisa dipilih") — SEBELUMNYA tanpa scrollable,
                  3 label gabungan ("Top 5 Pembeli High Margin"/"Penetrasi
                  Produk"/"Target Upsell") melebihi lebar layar mobile, tab
                  ke-3 kepotong/tidak terjangkau TANPA indikator scroll sama
                  sekali — diverifikasi langsung via screenshot mobile
                  (390px), "Target Upsell" hilang total dari tampilan.
                  scrollButtons="auto"+allowScrollButtonsMobile — panah
                  navigasi tampil begitu tab melebihi lebar container, di
                  mobile MAUPUN desktop sempit. */}
              <Tabs
                value={hmInnerTab}
                onChange={(_, v) => setHmInnerTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', py: 0.5 } }}
              >
                {/* hmTransactionsTabLabel (2026-08-27, koreksi user: "isinya
                    adalah tabel customer bukan hanya 5") — key TERPISAH
                    dari customerMetrics.m5.topCustomersLabel (dipakai
                    M5HighMargin.tsx utk widget "Top 5" beneran, side panel
                    kecil + tombol "Cek Detail di Laporan") — tab INI
                    menampilkan tabel PENUH (semua customer pembeli HM,
                    dipaginasi), bukan cuma 5, jadi label "Top 5" salah
                    di sini walau benar di widget asalnya — TIDAK mengganti
                    key lama (itu akan ikut mengubah widget yang benar). */}
                <Tab value="ranking" label={t('customerMetrics.m5.hmTransactionsTabLabel')} />
                <Tab value="penetration" label={t('productsHighMargin.tabCategories')} />
                <Tab value="upsell" label={t('productsHighMargin.tabUpsellTargets')} />
              </Tabs>

              {hmInnerTab === 'ranking' && (
                <>
                  <ReportSummaryCards items={[
                    { label: t('customerMetrics.m5.summaryExisting'), value: (hmData?.total_existing ?? 0).toLocaleString('id-ID'),
                      icon: PeopleOutlineIcon, info: t('customerMetrics.m5.summaryExistingInfo') },
                    { label: t('customerMetrics.m5.summaryBuyerCount'), value: (hmData?.hm_buyer_count ?? 0).toLocaleString('id-ID'),
                      icon: ShoppingCartOutlinedIcon, iconColor: 'primary' },
                    { label: t('customerMetrics.m3.rowHmContribution'), value: formatRupiah(hmData?.total_hm_revenue ?? 0),
                      icon: WorkspacePremiumIcon, iconColor: 'success', highlighted: true },
                  ]} />
                  <ReportTabCard
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
                </>
              )}

              {/* Filter periode TERPISAH sempat ada di sini, DIHAPUS
                  2026-08-26 (ditegur user, lihat komentar hmFilter di
                  atas) — "Penetrasi Produk"/"Target Upsell" sekarang
                  IKUT "Periode" global di header halaman (via periodMonth
                  turunan `periodEnd`), TIDAK ADA kontrol tambahan di sini.
                  Kartu ringkasan (2026-08-27 — instruksi user: "Tambahkan
                  card summary di setiap halaman tab nya") — sebelumnya
                  2 sub-tab ini TIDAK punya kartu ringkasan sama sekali,
                  langsung render tabel. */}
              {hmInnerTab === 'penetration' && (
                <>
                  <ReportSummaryCards items={[
                    { label: t('productsHighMargin.summaryProductCountLabel'), value: penetrationProductCount.toLocaleString('id-ID'),
                      icon: CategoryIcon, iconColor: 'primary', info: t('productsHighMargin.summaryProductCountInfo') },
                    { label: t('productsHighMargin.summaryAvgPenetrationLabel'), value: `${penetrationAvgRate.toFixed(1)}%`,
                      icon: DonutLargeIcon, iconColor: 'success', highlighted: true, info: t('productsHighMargin.summaryAvgPenetrationInfo') },
                  ]} />
                  <HighMarginProductTab filter={hmFilter} />
                </>
              )}
              {hmInnerTab === 'upsell' && (
                <>
                  <ReportSummaryCards items={[
                    { label: t('productsHighMargin.summaryUpsellTargetLabel'), value: upsellTargetCount.toLocaleString('id-ID'),
                      icon: TrendingUpIcon, iconColor: 'primary', highlighted: true, info: t('productsHighMargin.summaryUpsellTargetInfo') },
                    { label: t('productsHighMargin.summaryUpsellAvgRevenueLabel'), value: formatRupiah(upsellAvgRevenue),
                      icon: PaidOutlinedIcon, iconColor: 'success' },
                  ]} />
                  <UpsellTargetsTab filter={hmFilter} />
                </>
              )}
            </Box>
          )}
      </AdvancedFilterBar>
    </Box>
  );
}
