/**
 * router.ts — Router Orchestrator
 *
 * Satu-satunya file yang tahu semua route dan mengatur middleware chain.
 *
 * Middleware chain:
 *   CORS → CSRF → RateLimit → Auth → CompanyAccess → RequirePermission → Handler
 *
 * Layer 1 (Global)   : CORS, CSRF, RateLimit — semua request
 * Layer 2 (Public)   : /api/v1/auth/* — tanpa auth
 * Layer 3 (Protected): semua route lain — wajib auth + company access
 *
 * Permission (requirePermission) di-apply per endpoint di masing-masing *.route.ts
 * Feature *.route.ts TIDAK BOLEH menambahkan authMiddleware — sudah dihandle di sini.
 */

import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from '@/config/env'

// TODO: Import middleware saat sudah dibuat
// import { csrfMiddleware } from '@/middleware/csrf'
// import { rateLimitMiddleware } from '@/middleware/rate-limit'
// import { authMiddleware } from '@/middleware/auth'
// import { requireCompanyAccess } from '@/middleware/company-access'

// TODO: Import feature routes saat sudah dibuat
// import { authRoutes } from '@/features/auth/auth.route'
// import { metricsRoutes } from '@/features/metrics/metrics.route'
// import { importRoutes } from '@/features/import/import.route'
// import { usersRoutes } from '@/features/users/users.route'
// import { rbacRoutes } from '@/features/rbac/rbac.route'
// import { customersRoutes } from '@/features/customers/customers.route'
// import { productsRoutes } from '@/features/products/products.route'
// import { transactionsRoutes } from '@/features/transactions/transactions.route'
// import { configRoutes } from '@/features/config/config.route'
// import { auditRoutes } from '@/features/audit/audit.route'

export function createRouter(app: Hono): void {
  // ─── LAYER 1: Global — semua request ────────────────────────────────────────
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
  // TODO: Uncomment setelah middleware + features dibuat
  //
  // const { Hono: HonoApp } = await import('hono')
  // const protectedApi = new HonoApp()
  // protectedApi.use('*', authMiddleware())
  // protectedApi.use('*', requireCompanyAccess())
  //
  // protectedApi.route('/metrics',      metricsRoutes)
  // protectedApi.route('/import',       importRoutes)
  // protectedApi.route('/users',        usersRoutes)
  // protectedApi.route('/rbac',         rbacRoutes)
  // protectedApi.route('/customers',    customersRoutes)
  // protectedApi.route('/products',     productsRoutes)
  // protectedApi.route('/transactions', transactionsRoutes)
  // protectedApi.route('/config',       configRoutes)
  // protectedApi.route('/audit-logs',   auditRoutes)
  //
  // app.route('/api/v1', protectedApi)

  // Health check endpoint — selalu aktif
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
}