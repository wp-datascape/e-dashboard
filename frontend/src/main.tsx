import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'

// Offline fonts
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'

// i18n — harus diimport sebelum komponen apapun
import './i18n/index'

// Theme
import { ThemeProvider } from './theme/ThemeContext'

// Error Boundary
import { ErrorBoundary } from './utils/errorBoundary'

// App
import App from './App'

// Global CSS
import './index.css'

// Mock Service Worker (hanya aktif di development)
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) {
    return;
  }
  const { worker } = await import('./mocks/browser');
  // Pastikan worker benar-benar resolved sebelum mengembalikan void
  await worker.start({
    onUnhandledRequest: 'bypass', // Agar aset internal web seperti CSS/JS tidak terblokir
  });
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element tidak ditemukan. Cek index.html.')

enableMocking().then(() => {
createRoot(rootEl).render(
  <StrictMode>
    {/*
      Urutan provider (dari luar ke dalam):
      1. BrowserRouter    — routing context
      2. ThemeProvider    — MUI theme + CssBaseline + toggle
      3. SnackbarProvider — notifikasi global (notistack)
      4. ErrorBoundary    — tangkap error tak terduga di level app
      5. App              — routing + auth context
    */}
    <BrowserRouter>
      <ThemeProvider>
        <SnackbarProvider
          maxSnack={4}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={4000}
        >
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
}).catch((err: unknown) => {
  // Fail-safe jika proses load dinamis msw gagal di browser
  console.error('Gagal melakukan bootstrap aplikasi:', err);
});
