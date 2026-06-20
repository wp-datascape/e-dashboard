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

const app = new Hono()

createRouter(app)

// ─── Start Server ───────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
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