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

import { Hono } from 'hono'
import type { Hono as HonoType } from 'hono'
import { env } from '@/config/env'
import { registerErrorHandlers } from '@/errors'
import { requestIdMiddleware } from '@/middleware/requestId'
import { requestLogger } from '@/middleware/requestLogger'
import { securityHeadersMiddleware, corsMiddleware } from '@/middleware/security'
import { authMiddleware } from '@/middleware/auth'
import { networkThrottleMiddleware } from '@/middleware/network-throttle'
import { authRoutes } from '@/features/auth/auth.route'
import { metricsRoutes } from '@/features/metrics/metrics.route'
import { dashboardRoutes } from '@/features/dashboard/dashboard.route'
import { importRoutes } from '@/features/import/import.route'
import { classificationRoutes } from '@/features/import/classification.route'
import { usersRoutes } from '@/features/users/user.route'
import { pageRoutes } from '@/features/page/page.route'
import { companiesRoutes } from '@/features/companies/companies.route'
import { rolesRoutes } from '@/features/roles/roles.route'
import { permissionsRoutes } from '@/features/permissions/permissions.route'
import { customersRoutes } from '@/features/customers/customers.route'
import { productsRoutes } from '@/features/products/products.route'
import { transactionsRoutes } from '@/features/transactions/transactions.route'
import { configRoutes } from '@/features/config/config.route'
import { auditRoutes } from '@/features/audit/audit.route'
import { highMarginRoutes } from '@/features/settings/high-margin.route'
import { channelDivisionsRoutes } from '@/features/settings/channel-divisions.route'
import { docsRoutes } from '@/features/docs/docs.route'
import { abTestingRoutes } from '@/features/ab-testing/ab-testing.route'

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

export function createRouter(app: HonoType): void {
  // ─── ERROR HANDLERS — pasang PERTAMA sebelum semua middleware dan route ──────
  // Menangkap: AppError, ZodError, unknown error → response JSON yang konsisten
  // DILARANG: expose stack trace ke client
  registerErrorHandlers(app)

  // ─── LAYER 1: Global — semua request ────────────────────────────────────────
  // Konfigurasi security headers + CORS ada di middleware/security.ts (Task002 §3 Task A)
  app.use('*', requestIdMiddleware)
  app.use('*', requestLogger)
  app.use('*', securityHeadersMiddleware)
  app.use('*', corsMiddleware)

  // ─── LAYER 2: Public routes — tidak butuh auth ──────────────────────────────
  app.route('/api/v1/auth', authRoutes)

  // ─── LAYER 3: Protected routes — wajib auth ─────────────────────────────────
  // authMiddleware: verify JWT cookie + CSRF token (untuk mutasi) + load permissions
  const protectedApi = new Hono()
  protectedApi.use('*', authMiddleware())
  // AB Testing — simulasi network 3G/4G GLOBAL (lihat middleware/network-throttle.ts).
  // Sengaja di sini (bukan Layer 1), supaya /health & /auth/* tidak ikut ter-delay.
  protectedApi.use('*', networkThrottleMiddleware)

  protectedApi.route('/users', usersRoutes)
  protectedApi.route('/page-settings', pageRoutes)
  protectedApi.route('/companies', companiesRoutes)
  protectedApi.route('/roles', rolesRoutes)
  protectedApi.route('/permissions', permissionsRoutes)
  protectedApi.route('/config', configRoutes)
  protectedApi.route('/audit-logs', auditRoutes)
  protectedApi.route('/customers', customersRoutes)
  protectedApi.route('/products', productsRoutes)
  protectedApi.route('/import', importRoutes)
  protectedApi.route('/classification-rules', classificationRoutes)
  protectedApi.route('/settings/high-margin', highMarginRoutes)
  protectedApi.route('/settings/channel-divisions', channelDivisionsRoutes)
  protectedApi.route('/metrics', metricsRoutes)
  protectedApi.route('/invoices', transactionsRoutes)
  protectedApi.route('/dashboard', dashboardRoutes)
  protectedApi.route('/ab-testing', abTestingRoutes)
  // Docs sengaja DI DALAM protectedApi — wajib login utk buka Swagger UI.
  // Non-aktif di production by default.
  if (env.NODE_ENV !== 'production') {
    protectedApi.route('/docs', docsRoutes)
  }

  app.route('/api/v1', protectedApi)
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