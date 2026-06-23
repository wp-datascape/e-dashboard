// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * HTTP Request Logger untuk MSW — menampilkan log ke browser console.
 * Format:
 *   [MSW] → GET /api/v1/metrics/cross-selling
 *   [MSW] ← GET /api/v1/metrics/cross-selling 200 0ms (mocked)
 *   [MSW] ⇢ GET /api/v1/config (bypassed → real network)
 */
const MSW_STYLE = 'color:#ec4899;font-weight:bold'  // pink

function mswLogRequest(method: string, url: string): void {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
  // eslint-disable-next-line no-console
  console.log(
    `%c[MSW]%c ${ts} → ${method} ${url}`,
    MSW_STYLE,
    'color:inherit',
  )
}

function mswLogMocked(method: string, url: string, status: number): void {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
  const statusColor = status >= 400 ? '#ef4444' : '#22c55e'
  // eslint-disable-next-line no-console
  console.log(
    `%c[MSW]%c ${ts} ← ${method} ${url} %c${status}%c (mocked)`,
    MSW_STYLE,
    'color:inherit',
    `color:${statusColor};font-weight:bold`,
    'color:#94a3b8',
  )
}

function mswLogBypassed(method: string, url: string): void {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
  // eslint-disable-next-line no-console
  console.log(
    `%c[MSW]%c ${ts} ⇢ ${method} ${url} (bypassed → real network)`,
    MSW_STYLE,
    'color:#94a3b8',
  )
}

// Passthrough all unhandled requests to the real backend
// Only specific mock handlers (auth, dashboard, etc) will intercept
export const worker = setupWorker(...handlers)

// ─── MSW Lifecycle Logger — hanya di development ──────────────────────────────
if (import.meta.env.DEV) {
  // Saat request masuk ke MSW (sebelum di-handle)
  worker.events.on('request:start', ({ request }) => {
    mswLogRequest(request.method, request.url)
  })

  // Saat request berhasil di-mock oleh handler MSW
  worker.events.on('response:mocked', ({ request, response }) => {
    mswLogMocked(request.method, request.url, response.status)
  })

  // Saat request tidak di-mock dan di-pass ke real network
  worker.events.on('response:bypass', (event) => {
    const req = (event as unknown as { request: Request }).request
    mswLogBypassed(req.method, req.url)
  })
}