/**
 * index.ts — Application Entry Point
 *
 * Inisialisasi aplikasi Hono + register router + start HTTP server.
 * Handle graceful shutdown untuk clean exit.
 */

import { Hono } from 'hono'
import { env } from '@/config/env'
import { createRouter } from '@/router'
import { logger } from '@/utils/logger'
import { initNetworkThrottleFromDb } from '@/middleware/network-throttle'

const app = new Hono()

createRouter(app)

// Restore mode AB Testing network throttle dari DB (fire-and-forget — tidak
// memblokir startup server, fail-safe ke 'off' selama proses load berjalan).
void initNetworkThrottleFromDb()

// ─── Start Server ───────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  // Default Bun.serve cuma 10 detik - lebih pendek dari MAX_THROTTLE_DELAY_MS (30s)
  // di fitur AB Testing (network-throttle.ts), jadi delay besar (mis. 15 detik) tidak
  // pernah benar-benar selesai - Bun sendiri yang motong koneksi duluan (connection
  // reset) sebelum setTimeout() di middleware resolve, request gagal alih-alih sukses
  // telat. 255 = nilai maksimum yang didukung Bun (internal uint8), dipakai sekalian
  // sebagai ceiling praktis mode 'offline' (hang, bukan LITERAL selamanya - browser/
  // curl user akan menyerah duluan lewat timeout sendiri jauh sebelum 255 detik).
  idleTimeout: 255,
})

logger.info(`Server running on http://localhost:${env.PORT}`)
logger.info(`Environment: ${env.NODE_ENV}`)

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info(`[${signal}] Shutting down gracefully...`)

  // Stop menerima request baru
  server.stop()

  logger.info('[shutdown] Server stopped, exiting.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))