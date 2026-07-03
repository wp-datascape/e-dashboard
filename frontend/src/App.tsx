// src/App.tsx
import { Suspense, useState } from 'react'
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

// Registry Config & Lazy Base Elements
import { routeRegistry } from './route/routeConstants'
import { Login, NotFound, Forbidden, UnderMaintenance } from './route/routes'
import { DashboardLayout } from './components/layout/DashboardLayout'

// ─── Loading Fallback Component ──────────────────────────────────────────────
function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}

// ─── Core Router Orchestrator ────────────────────────────────────────────────
function AppRouter() {
  const { data: pageSettings, isLoading } = usePageSettings()
  const { token, syncUser, isAuthenticated } = useAuth()

  // synced: false saat ada token — tunggu /me selesai dan syncUser dipanggil
  // Ini mencegah ProtectedRoute mengecek permissions dari localStorage yang stale
  const [synced, setSynced] = useState(!token)

  // Sync user & permissions dari server setiap page load — agar perubahan RBAC langsung berlaku
  const { data: meData, isLoading: isMeLoading, isError: isMeError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  })

  useEffect(() => {
    if (meData) {
      syncUser(meData.user, meData.permissions)
      setSynced(true)
    }
  }, [meData])

  // Jika /auth/me gagal (network error, 500, dll) dan bukan ditangani forceLogout,
  // unblock synced agar app tidak stuck di PageLoader selamanya
  useEffect(() => {
    if (isMeError) setSynced(true)
  }, [isMeError])

  if (isLoading || (!!token && (isMeLoading || !synced))) {
    return <PageLoader />
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

        {/* Fallback 404 Wildcard Handling */}
        <Route path="*" element={<NotFound />} />
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