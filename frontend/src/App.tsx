// src/App.tsx
import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// MUI Components
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

// Providers & Config
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider, ProtectedRoute } from './context/AuthContext'
import { useAuth } from './context/auth.context'
import { usePageSettings } from './hooks/usePageSettings'

// Registry Config & Lazy Base Elements
import { routeRegistry } from './route/routeConstants'
import { Login, NotFound, UnderMaintenance } from './route/routes'
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
  // Fetch status ready (true/false) halaman secara real-time dari DB/MSW Mock
  const { data: pageSettings, isLoading } = usePageSettings()

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Tampilkan screen loader penuh jika konfigurasi rute belum selesai dimuat
  if (isLoading || isAuthLoading) {
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dynamic Generated Routes Mapping Berdasarkan Kontrol DB */}
        {pageSettings?.map(({ pageKey, ready }) => {
          const registry = routeRegistry[pageKey]

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
                  <ProtectedRoute>{finalElement}</ProtectedRoute>
                ) : (
                  finalElement
                )
              }
            />
          )
        })}

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