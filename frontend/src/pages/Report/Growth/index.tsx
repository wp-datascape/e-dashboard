import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';

import { useCrossSelling, useExpansionBreakdown, useDormantBreakdown } from '@/hooks/useMetrics';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { useCan } from '@/hooks/useCan';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { getCurrentPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import { BreakdownTable } from '../../CrossSelling/BreakdownTable';
import { useExpansionColumns } from '../../CustomerMetrics/expansionHelpers';
import { ReportSummaryCards } from '../ReportSummaryCards';
import { ReportTabCard } from '../ReportTabCard';

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

  // Filter global — sejak 2026-08-28 REUSE `useAdvancedFilterBar`+
  // `AdvancedFilterBar` (task029.md §41-lanjutan), sebelumnya state+markup
  // filter DISALIN manual di sini (2026-08-23, "filternya buat sama
  // memakai filter global") — lihat JSDoc hook itu utk riwayat ekstraksi
  // lengkap. Filter halaman ini TETAP independen dari /growth (§30.19,
  // "Filter SENDIRI bukan share state dgn /growth") — instance terpisah,
  // cuma REUSE hook & komponennya, bukan state-nya.
  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, applyDateCutoff, periodTypeFilter, onlyPareto } = filterBar;
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

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
    only_pareto: onlyPareto,
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
    only_pareto: onlyPareto,
  }, { enabled: canCrossSelling && activeTab === 'cross_selling' });

  // date_from = awal periode AKTIF (granularitas-aware — bukan selalu awal
  // bulan, koreksi bug class sama M7ExpansionGrowth.tsx: tanpa ini
  // fetchExpansionBreakdown fallback ke window activeMonths lama utk
  // Kuartal/Semester/Tahun, bukan rentang penuh periode yang dipilih).
  const reportPeriodKey = getCurrentPeriodKey(periodTypeFilter.periodType, new Date(py, pm - 1, pd));
  // periodEndEffective (2026-08-26, task031.md — bug SAMA PERSIS
  // Report/Revenue: `periodEnd` mentah saat "Apply date cutoff" OFF cuma
  // tanggal 1 bulan yang dipilih (konvensi UI, bukan tanggal query
  // sungguhan) — `useExpansionBreakdown` TIDAK terima `apply_date_cutoff`
  // (beda dari `useCrossSelling` di atas yang backend-nya sendiri yang
  // urus), jadi period_end HARUS akhir periode sungguhan dari sini.
  const periodEndEffective = applyDateCutoff
    ? periodEnd
    : clampPeriodEndToToday(periodTypeFilter.periodType, reportPeriodKey, getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).end);
  const { data: expansionData, isLoading: expansionLoading } = useExpansionBreakdown({
    period_end: periodEndEffective,
    date_from: getPeriodDateRange(periodTypeFilter.periodType, reportPeriodKey).start,
    period_type: periodTypeFilter.periodType,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  // dormantData (2026-08-26, task029.md §36.23 — instruksi user: "Tambahkan
  // Total pelanggan -> All customer, Dormant, Belum dormant, aktif") —
  // `fetchExpansionBreakdown` cuma tahu populasi "belum dormant"
  // (`total_existing`), TIDAK tahu berapa yang SUDAH dormant. Reuse
  // `useDormantBreakdown` (hook yang SAMA dipakai tab Dormant Laporan
  // Retention, bukan fetch/hitungan baru) dgn scope+periode yang SAMA
  // persis, supaya "Dormant" + "Belum Dormant" di sini konsisten dgn
  // angka di tab Dormant Retention.
  // period_end/period_type/apply_date_cutoff MENTAH (2026-08-27, §36.54 —
  // sama koreksi dgn Report/Retention: backend resolve sendiri via
  // resolveDormantSnapshotBucket, bukan periodEndEffective pre-clamp lagi).
  const { data: dormantData } = useDormantBreakdown({
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    company_id: companyId,
    branch_id: resolvedBranchId,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const dormantCount = dormantData?.rows.length ?? 0;
  const belumDormantCount = expansionData?.total_existing ?? 0;
  const totalPelangganCount = dormantCount + belumDormantCount;

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
      <AdvancedFilterBar
        title={<>{t('nav.groups.report')} · {t('nav.groups.growth')}</>}
        filter={filterBar}
        hasAccess={canCrossSelling || canExpansion}
        loading={csLoading || expansionLoading}
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
            {canCrossSelling && <Tab value="cross_selling" label={t('metrics.crossSellingShort')} />}
            {canExpansion && <Tab value="expansion" label={t('metrics.expansionShort')} />}
          </Tabs>

          {activeTab === 'cross_selling' && (
            <Box sx={{ pt: 1 }}>
              {/* Kartu ringkasan (2026-08-26, task029.md §36.20 — standar
                  layout Reaktivasi diterapkan ke tab ini) — DI LUAR
                  BreakdownTable (bukan diubah internal-nya) krn komponen
                  ini SHARED dipakai jg M1CrossSelling.tsx/M2AvgCategory.tsx
                  di dashboard utama — ubah layout internalnya (Card+search
                  kiri/sort kanan) akan ikut mengubah tampilan di sana juga,
                  di luar scope permintaan user (khusus halaman Laporan). */}
              <ReportSummaryCards items={[
                { label: t('crossSelling.activeCustomerLabelFull'), value: (csData?.kpi1.active_count ?? 0).toLocaleString('id-ID'),
                  icon: PeopleOutlineIcon, info: t('crossSelling.activeCustomerInfo') },
                { label: t('crossSelling.kpi1Label'), value: `${csData?.kpi1.rate ?? 0}%`,
                  icon: SwapHorizIcon, iconColor: 'primary', highlighted: true, info: t('crossSelling.kpi1Info') },
                { label: t('crossSelling.kpi2Label'), value: String(csData?.kpi2.avg_categories ?? 0),
                  icon: CategoryIcon, info: t('crossSelling.kpi2Info') },
              ]} />
              <BreakdownTable data={csData} yoyData={yoyData} isLoading={csLoading} />
            </Box>
          )}

          {activeTab === 'expansion' && (
            <Box sx={{ pt: 1 }}>
              {/* Kartu ringkasan (2026-08-26, §36.23 — instruksi user:
                  "Tambahkan Total pelanggan -> All customer, Dormant,
                  Belum dormant, aktif") — 6 kartu berjenjang: Total
                  Pelanggan pecah jadi Dormant vs Belum Dormant, Belum
                  Dormant pecah lagi jadi Aktif (transaksi periode ini)
                  vs tidak, Aktif pecah jadi Naik vs Turun. Urutan kartu
                  MENGIKUTI urutan pecahan ini (bukan acak) supaya
                  hubungan antar angka kelihatan, bukan angka lepas yang
                  membingungkan (lihat keluhan user soal 855 vs 11.375
                  vs 1.218 di 3 tab berbeda). */}
              <ReportSummaryCards items={[
                { label: t('customerMetrics.m7.summaryTotalPelanggan'), value: totalPelangganCount.toLocaleString('id-ID'),
                  icon: PeopleOutlineIcon, info: t('customerMetrics.m7.summaryTotalPelangganInfo') },
                { label: t('dormantCustomer.dormantCountLabel'), value: dormantCount.toLocaleString('id-ID'),
                  icon: PauseCircleOutlinedIcon, iconColor: 'warning', info: t('customerMetrics.m7.summaryDormantInfo') },
                { label: t('customerMetrics.m7.summaryBelumDormant'), value: belumDormantCount.toLocaleString('id-ID'),
                  icon: CheckCircleOutlineIcon, iconColor: 'success', info: t('customerMetrics.m7.summaryExistingInfo') },
                { label: t('customerMetrics.m7.summaryAktif'), value: (expansionData?.active_count ?? 0).toLocaleString('id-ID'),
                  icon: BoltIcon, iconColor: 'primary', info: t('customerMetrics.m7.dialogActiveCountInfo') },
                { label: t('customerMetrics.m7.seriesUp'), value: (expansionData?.up_count ?? 0).toLocaleString('id-ID'),
                  icon: TrendingUpIcon, iconColor: 'primary', highlighted: true, info: t('customerMetrics.m7.seriesUpInfo') },
                { label: t('customerMetrics.m7.seriesDown'), value: (expansionData?.down_count ?? 0).toLocaleString('id-ID'),
                  icon: TrendingDownIcon, iconColor: 'error', info: t('customerMetrics.m7.seriesDownInfo') },
              ]} />
              <ReportTabCard
                searchValue={expansionSearch}
                onSearchChange={setExpansionSearch}
                searchPlaceholder={t('crossSelling.tableSearchPlaceholder')}
                sortValue={expansionSort}
                onSortChange={(v) => setExpansionSort(v as typeof expansionSort)}
                sortLabel={t('crossSelling.tableSortLabel')}
                sortOptions={[
                  { value: 'name', label: t('crossSelling.tableSortName') },
                  { value: 'revenue_desc', label: t('crossSelling.tableSortRevenueDesc') },
                  { value: 'change_desc', label: t('customerMetrics.m7.tableSortChangeDesc') },
                ]}
              >
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
              </ReportTabCard>
            </Box>
          )}
      </AdvancedFilterBar>
    </Box>
  );
}
