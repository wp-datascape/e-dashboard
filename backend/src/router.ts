/**
 * router.ts — Router Orchestrator
 *
 * Satu-satunya file yang tahu semua route dan mengatur middleware chain.
 *
 * Middleware chain:
 *   RequestID → CORS → CSRF → RateLimit → Auth → CompanyAccess → RequirePermission → Handler
 *
 * Layer 1 (Global)   : RequestID, CORS, CSRF, RateLimit — semua request
 * Layer 2 (Public)   : /api/v1/auth/* — tanpa auth
 * Layer 3 (Protected): semua route lain — wajib auth + company access
 *
 * Permission (requirePermission) di-apply per endpoint di masing-masing *.route.ts
 * Feature *.route.ts TIDAK BOLEH menambahkan authMiddleware — sudah dihandle di sini.
 */

import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from '@/config/env'
import { registerErrorHandlers } from '@/errors'
import { requestIdMiddleware } from '@/middleware/requestId'
import { requestLogger } from '@/middleware/requestLogger'

// TODO: Import middleware saat sudah dibuat
// import { csrfMiddleware } from '@/middleware/csrf'
// import { rateLimitMiddleware } from '@/middleware/rate-limit'
// import { authMiddleware } from '@/middleware/auth'
// import { requireCompanyAccess } from '@/middleware/company-access'

// TODO: Import feature routes saat sudah dibuat
// import { authRoutes } from '@/features/auth/auth.route'
// import { metricsRoutes } from '@/features/metrics/metrics.route'
// import { importRoutes } from '@/features/import/import.route'
import { usersRoutes } from '@/features/users/user.route'
import { pageRoutes } from '@/features/page/page.route'
import { companiesRoutes } from '@/features/companies/companies.route'
import { rolesRoutes } from '@/features/roles/roles.route'
import { permissionsRoutes } from '@/features/permissions/permissions.route'
// import { customersRoutes } from '@/features/customers/customers.route'
// import { productsRoutes } from '@/features/products/products.route'
// import { transactionsRoutes } from '@/features/transactions/transactions.route'
import { configRoutes } from '@/features/config/config.route'
import { auditRoutes } from '@/features/audit/audit.route'

// ─── Health Check ──────────────────────────────────────────────────────────────

/**
 * GET /health
 * Untuk load balancer / monitoring — cek apakah aplikasi hidup + koneksi DB.
 *
 * Response:
 *   { status: 'ok', timestamp: '...', uptime: 1234, db: 'connected' }
 */
import { db } from '@/config/db'
import { sql } from 'drizzle-orm'

// ─── Router Factory ─────────────────────────────────────────────────────────────

export function createRouter(app: Hono): void {
  // ─── ERROR HANDLERS — pasang PERTAMA sebelum semua middleware dan route ──────
  // Menangkap: AppError, ZodError, unknown error → response JSON yang konsisten
  // DILARANG: expose stack trace ke client
  registerErrorHandlers(app)

  // ─── LAYER 1: Global — semua request ────────────────────────────────────────
  app.use('*', requestIdMiddleware)
  app.use('*', requestLogger)
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  )

  // TODO: Uncomment setelah middleware dibuat
  // app.use('*', csrfMiddleware())
  // app.use('*', rateLimitMiddleware())

  // ─── LAYER 2: Public routes — tidak butuh auth ──────────────────────────────
  // TODO: Uncomment setelah auth feature dibuat
  // app.route('/api/v1/auth', authRoutes)

  // ─── LAYER 3: Protected routes — wajib auth + company access ────────────────
  // TODO: Uncomment auth middleware setelah dibuat
  //
  // const protectedApi = new Hono()
  // protectedApi.use('*', authMiddleware())
  // protectedApi.use('*', requireCompanyAccess())
  // ...
  // app.route('/api/v1', protectedApi)

  // Sementara tanpa auth — hapus saat authMiddleware sudah siap
  app.route('/api/v1/users', usersRoutes)
  app.route('/api/v1/page-settings', pageRoutes)
  app.route('/api/v1/companies', companiesRoutes)
  app.route('/api/v1/roles', rolesRoutes)
  app.route('/api/v1/permissions', permissionsRoutes)
  app.route('/api/v1/config', configRoutes)
  app.route('/api/v1/audit-logs', auditRoutes)
  // ─── Health check — selalu aktif, tanpa auth ────────────────────────────────
  // Cek: aplikasi hidup + koneksi DB responsif
  app.get('/health', async (c) => {
    let dbStatus = 'connected'
    try {
      await db.execute(sql`SELECT 1`)
    } catch {
      dbStatus = 'disconnected'
    }

    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
    })
  })
}