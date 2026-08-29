import { useState } from 'react'
import { useScopedCompanyFilter } from './useScopedCompanyFilter'
import { usePeriodTypeFilter } from './usePeriodTypeFilter'
import { todayIsoDate } from '@/utils/date'

/**
 * "Filter global" — quick bar (Entitas + Periode + Apply date cutoff, auto-
 * apply) + panel Filter Lanjutan (Cabang/Divisi/Granularitas/Exclude
 * Intercompany/Pareto, staged/draft sampai tombol Terapkan diklik).
 *
 * DIEKSTRAK 2026-08-28 (task029.md §41-lanjutan) — pola ini SUDAH berulang
 * kali diinstruksikan sbg "filter global" reuseable (2026-08-20 dibangun,
 * 2026-08-23 "filternya buat sama memakai filter global" utk Report/Growth,
 * 2026-08-25 "STANDARTKAN SESUAI LAYOUT 2 MENU SEBELUMNYA" utk Value), TAPI
 * tiap kali cuma DISALIN ulang (copy-paste state+JSX) ke Growth/Retention/
 * Value/Report-Growth/Report-Retention/Report-Revenue — 6 salinan identik,
 * bukan 1 sumber. Ditegur user (2026-08-28): "Bukankah diawal aku sudah
 * bilang buat 'COMPONEN' filter global yang reuseable" — sekarang benar-
 * benar diekstrak jadi 1 hook (state+logic) + 1 komponen (`AdvancedFilterBar`,
 * presentational), dipakai ulang oleh KETUJUH halaman itu (6 lama di-
 * retrofit + Overview baru), bukan disalin lagi.
 *
 * Pola "hook = state, komponen = presentational" SAMA PERSIS
 * `useScopedCompanyFilter`+`ScopeFilterFields` dan `usePeriodTypeFilter`+
 * `PeriodTypeFilterFields` yang sudah lebih dulu dipisah begini.
 */
export function useAdvancedFilterBar() {
  // scopeFilter (applied) & draftScopeFilter (staged, panel Filter Lanjutan)
  // — instance TERPISAH (bukan 1 di-share) supaya draftScopeFilter bisa
  // fetch daftar branch/division milik company yang SEDANG dipilih tanpa
  // ikut mengubah opsi yang dipakai query data aktif.
  const scopeFilter = useScopedCompanyFilter()
  const draftScopeFilter = useScopedCompanyFilter()

  // Entitas LEVEL PALING ATAS cascade Company->Branch->Division — auto-apply
  // (quick bar), begitu diganti KEDUA instance disinkronkan bareng lewat
  // wrapper ini, supaya draftScopeFilter (Cabang/Divisi di panel lanjutan)
  // tidak nyangkut di company lama.
  const quickScopeFilter = {
    ...scopeFilter,
    setCompanyId: (value: number | 'all') => {
      scopeFilter.setCompanyId(value)
      draftScopeFilter.setCompanyId(value)
    },
  }

  // "Periode" (quick bar, auto-apply) — TERPISAH dari `usePeriodTypeFilter.endDate`
  // (hook itu punya resolusi tanggal sendiri utk navigator prev/next, TIDAK
  // dipakai di sini — showNavigator/showDateField selalu false di panel
  // lanjutan, field Periode di quick bar ini SATU-SATUNYA sumber tanggal).
  const [periodEnd, setPeriodEnd] = useState(todayIsoDate())

  // "Apply date cutoff" — default OFF: field Periode cuma pilih bulan+tahun
  // (`type="month"`), krn hari-nya TIDAK BERPENGARUH kecuali sedang melihat
  // periode yang masih berjalan. AKTIF -> field jadi date picker penuh, DAN
  // mengaktifkan mode semua titik trend dipotong ke hari yang sama.
  const [applyDateCutoff, setApplyDateCutoff] = useState(false)

  // Granularitas — applied & draft, dipakai cuma utk `.periodType` di sini
  // (bukan `.endDate`/navigator, lihat catatan `periodEnd` di atas).
  const periodTypeFilter = usePeriodTypeFilter()
  const draftPeriodTypeFilter = usePeriodTypeFilter()

  // Toggle Customer Pareto — applied & draft.
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [draftOnlyPareto, setDraftOnlyPareto] = useState(false)

  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Salin draft -> applied — CUMA field panel Filter Lanjutan (Cabang/Divisi/
  // Granularitas/Exclude Intercompany/Pareto). Entitas & Periode TIDAK di
  // sini — sudah auto-apply sendiri.
  const handleApplyFilter = () => {
    scopeFilter.setBranchId(draftScopeFilter.branchId)
    scopeFilter.setDivision(draftScopeFilter.division)
    scopeFilter.setExcludeIntercompany(draftScopeFilter.excludeIntercompany)
    periodTypeFilter.setPeriodType(draftPeriodTypeFilter.periodType)
    setOnlyPareto(draftOnlyPareto)
  }

  // Reset SEMUA field (termasuk panel lanjutan) ke default — applied DAN
  // draft sekaligus, supaya UI (baca draft) dan data yang benar-benar
  // di-fetch (baca applied) selalu konsisten begitu tombol diklik, tidak
  // perlu 2 langkah (reset lalu klik Terapkan lagi).
  const handleResetFilter = () => {
    scopeFilter.setCompanyId('all')
    draftScopeFilter.setCompanyId('all')
    setPeriodEnd(todayIsoDate())
    setApplyDateCutoff(false)
    scopeFilter.setExcludeIntercompany(false)
    draftScopeFilter.setExcludeIntercompany(false)
    periodTypeFilter.setPeriodType('monthly')
    draftPeriodTypeFilter.setPeriodType('monthly')
    setOnlyPareto(false)
    setDraftOnlyPareto(false)
    setAdvancedOpen(false)
  }

  return {
    scopeFilter,
    draftScopeFilter,
    quickScopeFilter,
    periodEnd,
    setPeriodEnd,
    applyDateCutoff,
    setApplyDateCutoff,
    periodTypeFilter,
    draftPeriodTypeFilter,
    onlyPareto,
    draftOnlyPareto,
    setDraftOnlyPareto,
    advancedOpen,
    setAdvancedOpen,
    handleApplyFilter,
    handleResetFilter,
  }
}
