import { useScopedCompanyFilter } from './useScopedCompanyFilter'
import { usePeriodTypeFilter } from './usePeriodTypeFilter'
import { useFilterStore } from '@/context/filter.context'
import { useState } from 'react'

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
  // scopeFilter (applied, shared: true default) & draftScopeFilter (staged,
  // panel Filter Lanjutan, shared: false EKSPLISIT) — instance TERPISAH
  // supaya draftScopeFilter bisa fetch daftar branch/division milik company
  // yang SEDANG dipilih tanpa ikut mengubah opsi yang dipakai query data
  // aktif, DAN supaya draft tidak ikut ter-persist ke FilterContext
  // (task043.md, HOLDINGIT-696, 2026-09-15 - applied SEKARANG baca/tulis
  // FilterContext, persisten sessionStorage lintas halaman; draft TETAP
  // useState lokal biasa, di-sync dari applied setiap panel dibuka, lihat
  // `toggleAdvanced` di bawah).
  const scopeFilter = useScopedCompanyFilter()
  const draftScopeFilter = useScopedCompanyFilter(false)

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
  // Pindah ke FilterContext (task043.md) - quick bar SELALU applied
  // langsung (tidak py draft), jadi aman baca/tulis store terus-terusan.
  const filterStore = useFilterStore()
  const periodEnd = filterStore.periodEnd
  const setPeriodEnd = filterStore.setPeriodEnd

  // "Apply date cutoff" — default OFF: field Periode cuma pilih bulan+tahun
  // (`type="month"`), krn hari-nya TIDAK BERPENGARUH kecuali sedang melihat
  // periode yang masih berjalan. AKTIF -> field jadi date picker penuh, DAN
  // mengaktifkan mode semua titik trend dipotong ke hari yang sama.
  const applyDateCutoff = filterStore.applyDateCutoff
  const setApplyDateCutoff = filterStore.setApplyDateCutoff

  // Granularitas — applied (shared) & draft (lokal), dipakai cuma utk
  // `.periodType` di sini (bukan `.endDate`/navigator, lihat catatan
  // `periodEnd` di atas).
  const periodTypeFilter = usePeriodTypeFilter()
  const draftPeriodTypeFilter = usePeriodTypeFilter('monthly', false)

  // Toggle Customer Pareto — applied (shared) & draft (lokal).
  const onlyPareto = filterStore.onlyPareto
  const setOnlyPareto = filterStore.setOnlyPareto
  const [draftOnlyPareto, setDraftOnlyPareto] = useState(false)

  const [advancedOpen, setAdvancedOpen] = useState(false)

  // toggleAdvanced (task043.md) — begitu panel Filter Lanjutan DIBUKA, sync
  // draft dari nilai APPLIED yang sedang aktif (bukan lagi dari default
  // kosong tiap mount, krn applied sekarang persisten lintas halaman/reload).
  // Tanpa ini, buka panel di halaman manapun akan menampilkan draft yang
  // sudah basi (nilai draft SEBELUMNYA di render pertama hook ini, biasanya
  // default) walau applied sebenarnya sudah beda. Baca `advancedOpen`
  // langsung (closure nilai render saat ini) - BUKAN di dalam functional
  // updater setAdvancedOpen (updater harus pure, efek samping setState lain
  // di dalamnya bisa dobel-jalan di StrictMode).
  const toggleAdvanced = () => {
    if (!advancedOpen) {
      // setCompanyId LEBIH DULU (2026-09-15, bug ditemukan via verifikasi
      // browser) - draftScopeFilter instance LOKAL, fresh 'all' tiap mount
      // halaman baru (TIDAK ikut persisten spt scopeFilter/applied). Tanpa
      // ini, Branch/Division di panel tetap ke-disable (ScopeFilterFields
      // disable berdasar companyId==='all') walau company applied sudah
      // bukan 'all' - padahal quickScopeFilter.setCompanyId (di atas) cuma
      // sinkron draft SAAT company diganti lewat quick bar DALAM 1 sesi
      // mount yang sama, tidak menjangkau mount baru. setCompanyId SENDIRI
      // reset branchId/division ke default dulu (lihat setter-nya) - 2
      // baris setelah ini yang mengembalikan ke nilai applied SEBENARNYA.
      draftScopeFilter.setCompanyId(scopeFilter.companyId)
      draftScopeFilter.setBranchId(scopeFilter.branchId)
      draftScopeFilter.setDivision(scopeFilter.division)
      draftScopeFilter.setExcludeIntercompany(scopeFilter.excludeIntercompany)
      draftPeriodTypeFilter.setPeriodType(periodTypeFilter.periodType)
      setDraftOnlyPareto(onlyPareto)
    }
    setAdvancedOpen((v) => !v)
  }

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
  // perlu 2 langkah (reset lalu klik Terapkan lagi). Applied lewat
  // `filterStore.resetAll()` (task043.md) - 1 panggilan, reset SEMUA
  // primitif applied sekaligus tulis default itu ke sessionStorage (bukan
  // cuma reset di memori, supaya reload sesudahnya juga tetap default).
  // Draft (instance lokal, tidak tersentuh resetAll) tetap direset manual.
  const handleResetFilter = () => {
    filterStore.resetAll()
    draftScopeFilter.setCompanyId('all')
    draftScopeFilter.setExcludeIntercompany(false)
    draftPeriodTypeFilter.setPeriodType('monthly')
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
    toggleAdvanced,
    handleApplyFilter,
    handleResetFilter,
  }
}
