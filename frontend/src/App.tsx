// src/App.tsx
import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// MUI Components
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

// Providers & Config
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryClient } from './lib/queryClient'
import { AuthProvider, ProtectedRoute } from './context/AuthContext'
import { useAuth } from './context/auth.context'
import { usePageSettings } from './hooks/usePageSettings'
import { api } from './api/axios'
import { useThemeMode } from './theme/theme.context'
import { useTranslation } from 'react-i18next'

// Registry Config & Lazy Base Elements
import { routeRegistry } from './route/routeConstants'
import { Login, NotFound, Forbidden, UnderMaintenance } from './route/routes'
import { DashboardLayout } from './components/layout/DashboardLayout'
// Import statis (BUKAN lazy) — sengaja: fallback ini menangani kegagalan koneksi,
// kalau di-lazy-load lewat chunk terpisah, chunk-nya sendiri bisa gagal diambil pas
// network memang lagi bermasalah (persis skenario yang mau ditangani komponen ini).
import ConnectionError from './pages/ConnectionError/index'

// ─── Loading Fallback Component ──────────────────────────────────────────────
function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}

// ─── Core Router Orchestrator ────────────────────────────────────────────────
function AppRouter() {
  const { data: pageSettings, isLoading, isError: isPageSettingsError, refetch: refetchPageSettings } = usePageSettings()
  const { token, syncUser, isAuthenticated } = useAuth()
  const { applyRemotePreferences } = useThemeMode()
  const { i18n } = useTranslation()

  // Sync user & permissions dari server setiap page load — agar perubahan RBAC langsung berlaku
  const { data: meData, isLoading: isMeLoading, isError: isMeError, isSuccess: isMeSuccess } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  })

  // synced: false saat ada token — tunggu /me selesai (sukses ATAU gagal, supaya app
  // tidak stuck di PageLoader selamanya kalau /me error) sebelum ProtectedRoute
  // mengecek permissions dari localStorage yang stale. Derived langsung dari state
  // query (bukan state+effect terpisah) — tidak ada setState sinkron di dalam effect.
  const synced = !token || isMeSuccess || isMeError

  useEffect(() => {
    if (meData) {
      syncUser(meData.user, meData.permissions)
    }
  }, [meData, syncUser])

  // Task003 — begitu /auth/me resolve, terapkan preferensi tersimpan (theme/palette
  // dari backend, override cache localStorage sebelumnya; bahasa lewat i18n langsung).
  useEffect(() => {
    if (!meData?.preferences) return
    applyRemotePreferences(meData.preferences)
    if (meData.preferences.language && meData.preferences.language !== i18n.language) {
      void i18n.changeLanguage(meData.preferences.language)
    }
  }, [meData, applyRemotePreferences, i18n])

  if (isLoading || (!!token && (isMeLoading || !synced))) {
    return <PageLoader />
  }

  // Query page-settings GAGAL (network error/timeout, mis. saat AB Testing network
  // throttle aktif atau server sungguhan tidak bisa dihubungi) — BEDAKAN dari 404:
  // tanpa cabang ini, pageSettings tetap `undefined` sehingga TIDAK ADA route dinamis
  // ter-registrasi sama sekali, path apa pun (termasuk yang user PUNYA akses-nya)
  // jatuh ke catch-all "*" dan salah tampil sebagai 404 "halaman tidak ada" — padahal
  // URL-nya valid, kita cuma gagal connect utk cek page-nya. Kasus "user memang tidak
  // punya izin" TETAP ditangani terpisah oleh ProtectedRoute (redirect ke /403) begitu
  // pageSettings berhasil dimuat - tidak disentuh cabang ini.
  if (isPageSettingsError && !!token) {
    return <ConnectionError onRetry={() => refetchPageSettings()} />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Entry Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />

        {/* Root Trailing Redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />

        {/* Dynamic Generated Routes Mapping Berdasarkan Kontrol DB */}
        {pageSettings?.map(({ page_key, ready }) => {
          const registry = routeRegistry[page_key]

          // Defensif: Jika ada key baru di DB tetapi frontend belum di-deploy komponennya
          if (!registry) return null

          // Jika ready=true dari DB -> render komponen asli. Jika false -> kunci ke UnderMaintenance
          const finalElement = ready
            ? registry.element
            : <DashboardLayout><UnderMaintenance /></DashboardLayout>

          return (
            <Route
              key={registry.path}
              path={registry.path}
              element={
                registry.protected ? (
                  <ProtectedRoute permissionKey={registry.permissionKey}>{finalElement}</ProtectedRoute>
                ) : (
                  finalElement
                )
              }
            />
          )
        })}

        {/* 403 Forbidden */}
        <Route path="/403" element={<Forbidden />} />

        {/* Fallback 404 Wildcard Handling — path apa pun yang tidak match route dinamis
            di atas. BUG FIX: route dinamis di atas cuma terdaftar kalau pageSettings
            berhasil di-fetch (query itu enabled: !!token) — jadi kalau user BELUM
            login (tidak ada token) dan langsung buka path selain "/", "/login" (mis.
            bookmark ke /settings/app, atau reload di halaman dalam), TIDAK ADA route
            protected yang terdaftar sama sekali, request jatuh ke sini duluan SEBELUM
            sempat lewat ProtectedRoute (yang harusnya redirect ke /login). Cek
            isAuthenticated dulu di sini supaya user belum login selalu diarahkan ke
            /login, bukan disodori 404 palsu. NotFound asli cuma untuk user yang SUDAH
            login tapi path-nya memang tidak pernah ada — kasus pageSettings GAGAL
            fetch (network error/timeout) sudah ditangani terpisah di atas (cabang
            isPageSettingsError -> ConnectionError), jadi begitu render sampai sini
            pageSettings dijamin sudah berhasil dimuat (dari cache lama atau fetch
            baru), path yang tidak match memang benar-benar tidak terdaftar. */}
        <Route
          path="*"
          element={isAuthenticated ? <NotFound /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Suspense>
  )
}

// ─── Main Application Component Wrapper ──────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  )
}