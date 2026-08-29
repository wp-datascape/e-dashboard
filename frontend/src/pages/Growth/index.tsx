import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

import { useCrossSelling, useCustomerMetrics } from '@/hooks/useMetrics';
import { useCan } from '@/hooks/useCan';
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { M1CrossSelling } from '../CrossSelling/M1CrossSelling';
import { M2AvgCategory } from '../CrossSelling/M2AvgCategory';
import { M7ExpansionGrowth } from '../CustomerMetrics/M7ExpansionGrowth';

// Growth (task029.md §2, §8-10, §29 lalu §30.19): M1 Cross Selling, M2
// Average Product Category, M7 Customer Expansion Rate.
//
// 2026-08-22 (koreksi keras user: "kembalikan ke kondisi UI awal", "buatkan
// halaman khusus tabel, terlalu kotor jika chart digabung dengan tabel") —
// tab luar per-KPI (§29, dipasang 2026-08-19) DIHAPUS, dikembalikan ke pola
// DITUMPUK VERTIKAL (sama seperti Retention/index.tsx & Value/index.tsx —
// referensi eksplisit user), SEMUA KPI yang permission-nya dimiliki user
// dirender sekaligus, bukan 1 KPI aktif via tab. Tabel breakdown (dulu
// nempel permanen di tab "Trend Analysis" tiap KPI) DIPINDAH ke halaman
// baru terpisah, `pages/Report/Growth/index.tsx` (menu "Laporan" > "Growth",
// lihat menu.tsx) — bukan dihapus, lihat task029.md §30.19.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA (M1CrossSelling/M2AvgCategory
// dari CrossSelling/, M7Expansion dari CustomerMetrics/ — masing-masing
// sudah chart detail + tooltip + drill-down sendiri), BUKAN bikin chart baru
// dari data ringkas /dashboard (percobaan pertama yang salah, 2026-08-19 —
// koreksi user: chart lama sudah ada, jangan dibuat ulang versi simpel).
// M1/M2 dan M7 datang dari 2 hook berbeda (useCrossSelling vs
// useCustomerMetrics, mengikuti sumber data asli masing-masing di halaman
// lamanya) — TIDAK dipaksa jadi 1 fetch.
//
// Permission per-KPI (2026-08-19, perbaikan temuan routeConstants.tsx):
// route ini digate growth:view, TAPI M1/M2 & M7 masing-masing tetap dicek
// independen oleh cross.selling:view/expansion:view di endpoint aslinya —
// section yang permission-nya tidak dimiliki diganti `NoSectionAccess`
// (pola sama persis Retention/index.tsx), bukan disembunyikan total.
export default function Growth() {
  const { t } = useTranslation();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');
  const canExpansion = can('expansion:view');

  // Filter global (quick bar + panel Filter Lanjutan) — DIEKSTRAK 2026-08-28
  // ke `useAdvancedFilterBar`+`AdvancedFilterBar` (task029.md §41-lanjutan),
  // sebelumnya state+markup ini DISALIN di 6 halaman (Growth/Retention/
  // Value/Report-Growth/Report-Retention/Report-Revenue) — lihat JSDoc hook
  // itu utk riwayat lengkap & alasan ekstraksi.
  const filterBar = useAdvancedFilterBar();
  const { scopeFilter, periodEnd, applyDateCutoff, periodTypeFilter, onlyPareto } = filterBar;
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  // M1 & M2 pakai data yang sama (useCrossSelling), M7 pakai useCustomerMetrics
  // — SEMUA di-fetch sekaligus begitu halaman dibuka (bukan lagi lazy per-tab
  // aktif, sejak tab luar dihapus §30.19), masing-masing tetap `enabled` oleh
  // permission-nya sendiri (canCrossSelling/canExpansion), bukan dipaksa fetch
  // kalau user memang tidak punya akses.
  const { data: csData, isLoading: csLoading } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canCrossSelling });

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  }, { enabled: canExpansion });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filter global — 1 komponen, 1 import (task029.md §41-lanjutan),
          lihat JSDoc AdvancedFilterBar. Menggantikan judul+quick
          bar+Collapse+gate akses yang dulu ditulis manual di sini. */}
      <AdvancedFilterBar
        title={t('nav.groups.growth')}
        filter={filterBar}
        hasAccess={canCrossSelling || canExpansion}
        loading={csLoading || cmLoading}
      >
        {/* Ditumpuk vertikal (§30.19, koreksi user 2026-08-22) — SEMUA KPI
            yang permission-nya dimiliki dirender sekaligus, pola sama
            persis Retention/index.tsx & Value/index.tsx. */}
        {canCrossSelling ? (
          <M1CrossSelling
            data={csData}
            isLoading={csLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            periodType={periodTypeFilter.periodType}
            applyDateCutoff={applyDateCutoff}
            excludeIntercompany={excludeIntercompany}
            onlyPareto={onlyPareto}
          />
        ) : (
          <NoSectionAccess />
        )}

        {canCrossSelling ? (
          <M2AvgCategory
            data={csData}
            isLoading={csLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            periodType={periodTypeFilter.periodType}
            applyDateCutoff={applyDateCutoff}
            excludeIntercompany={excludeIntercompany}
            onlyPareto={onlyPareto}
          />
        ) : (
          <NoSectionAccess />
        )}

        {canExpansion ? (
          <M7ExpansionGrowth
            trend={cmData?.trend ?? []}
            isLoading={cmLoading}
            companyId={companyId}
            branchId={resolvedBranchId}
            division={resolvedDivision}
            periodEnd={periodEnd}
            // resolvedPeriodEnd (2026-08-23) — tanggal akhir SETELAH
            // resolveTrendPeriod di backend (elapsed-clamp/apply_date_cutoff),
            // BUKAN periodEnd mentah dari filter halaman — dipakai kartu
            // "Existing Customer" supaya konsisten dgn M1/M2 yang baca
            // data.period.end (backend), bukan echo state filter apa adanya.
            resolvedPeriodEnd={cmData?.period.end ?? periodEnd}
            applyDateCutoff={applyDateCutoff}
            periodType={periodTypeFilter.periodType}
            excludeIntercompany={excludeIntercompany}
            onlyPareto={onlyPareto}
          />
        ) : (
          <NoSectionAccess />
        )}
      </AdvancedFilterBar>
    </Box>
  );
}
