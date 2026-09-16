import { useState, type ReactNode } from 'react'
import { FilterContext, type StoredFilterState } from './filter.context'
import { todayIsoDate } from '@/utils/date'

/**
 * context/FilterContext.tsx (task043.md, HOLDINGIT-696)
 *
 * Provider state filter GLOBAL lintas halaman (company/branch/division/
 * period/dll) — persisten selama SESI BROWSER (sessionStorage, bukan
 * localStorage - hilang kalau tab/browser ditutup, bertahan pindah halaman
 * & reload). Instruksi user 2026-09-15: "state filter global, simpan, jadi
 * setiap pindah halaman filternya tidak perlu filtering ulang" -
 * dikonfirmasi via AskUserQuestion: SEMUA dimensi filter ikut dibagi,
 * durasi sesi browser saja.
 *
 * Pola SAMA PERSIS AuthContext.tsx (lazy-init useState baca storage, tiap
 * setter tulis balik ke storage) - REUSE pola yang sudah ada, BUKAN pakai
 * Zustand (dilarang stack, lihat docs-v2/shared/backend.md).
 *
 * Field di sini SENGAJA cuma primitif filter (companyId/branchId/division/
 * dst) - BUKAN opsi dropdown (companies/branches/divisions), yang TETAP
 * di-fetch fresh via react-query per halaman (RBAC-aware, tidak boleh
 * dicache di sini - lihat hooks/useScopedCompanyFilter.ts).
 *
 * Draft (panel "Filter Lanjutan" di useAdvancedFilterBar.ts) SENGAJA TIDAK
 * di sini - draft harus tetap instance lokal per-halaman (staging sampai
 * tombol "Terapkan" diklik), lihat JSDoc useAdvancedFilterBar.ts.
 */

const STORAGE_KEY = 'e-dashboard-global-filter'

function defaultFilterState(): StoredFilterState {
  return {
    companyId: 'all',
    branchId: 'all',
    division: '',
    excludeIntercompany: false,
    periodEnd: todayIsoDate(),
    applyDateCutoff: false,
    periodType: 'monthly',
    onlyPareto: false,
  }
}

// readStored/writeStored (sessionStorage) - try/catch krn bisa gagal di
// private window/quota penuh; read WAJIB defensif krn JSON.parse bisa
// throw kalau isi storage korup/format lama berubah.
function readStored(): StoredFilterState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultFilterState()
    return { ...defaultFilterState(), ...JSON.parse(raw) }
  } catch {
    return defaultFilterState()
  }
}

function writeStored(state: StoredFilterState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // private window/quota penuh - filter tetap jalan di memori sesi ini,
    // cuma tidak persisten. Bukan kegagalan fatal, tidak perlu ditampilkan
    // ke user (sama kelas silent-degrade dgn localStorage AuthContext).
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<StoredFilterState>(readStored)

  // update() - merge partial + tulis balik ke storage 1 tempat, dipakai
  // semua setter di bawah supaya tidak ada setter yang lupa persist.
  const update = (patch: Partial<StoredFilterState>) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch }
      writeStored(next)
      return next
    })
  }

  // Company berganti -> branch+division direset (pola SAMA PERSIS
  // useScopedCompanyFilter.ts non-shared, disalin ke sini krn ini SEKARANG
  // sumber primitifnya utk mode shared).
  const setCompanyId = (value: number | 'all') => update({ companyId: value, branchId: 'all', division: '' })
  const setBranchId = (value: number | 'all') => update({ branchId: value, division: '' })
  const setDivision = (value: number | '') => update({ division: value })
  const setExcludeIntercompany = (value: boolean) => update({ excludeIntercompany: value })
  const setPeriodEnd = (value: string) => update({ periodEnd: value })
  const setApplyDateCutoff = (value: boolean) => update({ applyDateCutoff: value })
  const setPeriodType = (value: StoredFilterState['periodType']) => update({ periodType: value })
  const setOnlyPareto = (value: boolean) => update({ onlyPareto: value })

  const resetAll = () => {
    const fresh = defaultFilterState()
    writeStored(fresh)
    setStateRaw(fresh)
  }

  return (
    <FilterContext.Provider
      value={{
        ...state,
        setCompanyId,
        setBranchId,
        setDivision,
        setExcludeIntercompany,
        setPeriodEnd,
        setApplyDateCutoff,
        setPeriodType,
        setOnlyPareto,
        resetAll,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}
