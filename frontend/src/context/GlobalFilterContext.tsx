import { useState, type ReactNode } from 'react'
import { useAuth } from './auth.context'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { todayIsoDate } from '@/utils/date'
import type { KpiPeriodType } from '@/utils/analisisPeriod'
import { GlobalFilterContext } from './globalFilter.context'

/**
 * Filter global SIAPA (perusahaan/cabang/divisi/exclude-intercompany) —
 * task026 Fase 1. Sebelumnya tiap halaman (Dashboard, 10 KPI, Customers,
 * Products, dst) punya instance `useScopedCompanyFilter()` sendiri-sendiri
 * (state lokal React, hilang begitu pindah halaman) — sekarang 1 instance
 * dipasang di sini dan dibagi ke semua halaman lewat `useGlobalFilter()`.
 *
 * Dipasang di App.tsx DI ATAS `<Routes>`, BUKAN di dalam `DashboardLayout` —
 * DashboardLayout dibuat ulang tiap route lewat `withLayout()` di
 * routeConstants.tsx (`<Route element={<DashboardLayout><Page/></DashboardLayout>}>`),
 * jadi Provider yang dipasang di situ akan ikut remount tiap pindah halaman
 * dan filter tidak akan pernah ke-persist — harus di level yang tidak ikut
 * di-swap React Router.
 *
 * Dipecah 2 komponen (luar + Inner) supaya hook company/division di dalam
 * `useScopedCompanyFilter` (useCompanies dkk — TIDAK ber-guard token, lihat
 * task026) tidak ikut fetch di halaman publik (/login) sebelum user login,
 * yang berisiko memicu axios interceptor mencoba /auth/refresh sia-sia.
 * Inner cuma mount setelah `isAuthenticated` true, unmount lagi saat logout
 * (state ikut reset ke default — sudah sesuai keputusan in-memory-only,
 * tidak perlu bertahan lewat logout/refresh browser).
 */
export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <>{children}</>
  }

  return <GlobalFilterProviderInner>{children}</GlobalFilterProviderInner>
}

function GlobalFilterProviderInner({ children }: { children: ReactNode }) {
  const filter = useScopedCompanyFilter()

  // KAPAN (task026 Fase 2) — periodType+endDate, dulu di-declare lokal per
  // halaman (`useState<KpiPeriodType>('quarter')` + `useState<string>(todayIsoDate())`,
  // pola KpiFilterBar task025), sekarang 1 instance dibagi semua halaman
  // berfilter (termasuk Dashboard — MonthYearPicker-nya diganti KpiFilterBar,
  // lihat Dashboard/index.tsx).
  const [periodType, setPeriodType] = useState<KpiPeriodType>('quarter')
  const [endDate, setEndDate] = useState<string>(todayIsoDate())

  return (
    <GlobalFilterContext.Provider value={{ ...filter, periodType, setPeriodType, endDate, setEndDate }}>
      {children}
    </GlobalFilterContext.Provider>
  )
}
