# shared/architecture.md

## Request Flow
React SPA (Vite)

| HTTPS + Cookie + X-CSRF-Token

| dev: MSW Service Worker intercepts axios

Hono Router (Bun) → `index.ts` (bootstrap) → `router.ts` (orchestrator)

| Global Middleware: CORS → CSRF → RateLimit

| Public: /api/v1/auth/* (no auth)

| Protected: authMiddleware → requireCompanyAccess → feature routes

Handler → Service → Repository → PostgreSQL

-> utils/accurate.ts -> Accurate Online API

-> utils/audit.ts   -> audit_logs table

## Folder Structure

### Backend
```
backend/src/
├── index.ts              # Server bootstrap (port, env, global error handler)
├── router.ts             # ORCHESTRATOR — global MW + public/protected split + route mount
├── features/
│   ├── auth/
│   │   ├── auth.route.ts       # PUBLIC — no middleware
│   │   ├── auth.handler.ts
│   │   ├── auth.service.ts
│   │   └── auth.repository.ts
│   ├── metrics/
│   │   ├── metrics.route.ts    # PROTECTED — requirePermission per endpoint
│   │   ├── metrics.handler.ts
│   │   ├── metrics.service.ts  # 10 KPI logic
│   │   └── metrics.repository.ts
│   ├── import/
│   ├── users/
│   ├── rbac/
│   ├── customers/
│   ├── products/
│   ├── transactions/
│   ├── config/
│   └── audit/
├── db/
│   ├── schema/           # Drizzle table definitions (snake_case plural)
│   └── migrations/       # drizzle-kit generated
├── middleware/
│   ├── auth.ts           # verifyJwt → set c.var.user
│   ├── permission.ts     # requirePermission('resource:action')
│   ├── company-access.ts # requireCompanyAccess()
│   ├── csrf.ts           # validate X-CSRF-Token on mutations
│   └── rate-limit.ts     # per IP
├── utils/                # response, error, jwt, hash, csrf, audit, parser, accurate, validator, logger
└── types/                # Shared TypeScript types
```

### Frontend
```
frontend/src/
├── api/              # All axios calls — never fetch directly in components
│   └── axios.ts     # Axios instance with CSRF interceptor
├── components/       # Reusable UI — PascalCase.tsx + index.ts re-export
│   └── charts/      # 9 chart widgets (Recharts)
├── hooks/            # Custom hooks — logic separated from UI
├── pages/            # Route-level page components
├── route/
│   └── routes.tsx   # routeRegistry — register all pages here
├── config/
│   └── menu.tsx     # NAV_ITEMS — sidebar menu definition
├── mocks/
│   ├── handlers/    # MSW handlers per domain
│   └── handlers.ts  # Imports all handlers
├── context/
│   └── AuthContext  # JWT state + permissions[]
└── types/           # API response types
```

## Router Orchestrator Pattern

### `index.ts` — Bootstrap Only
```typescript
import { Hono } from 'hono'
import { createRouter } from './router'

const app = new Hono()
createRouter(app)

export default { port: process.env.PORT ?? 3000, fetch: app.fetch }
```

### `router.ts` — Orchestrator
```typescript
export function createRouter(app: Hono) {

  // LAYER 1: Global (semua request)
  app.use('*', cors())
  app.use('*', csrfMiddleware())
  app.use('*', rateLimitMiddleware())

  // LAYER 2: Public routes (no auth)
  app.route('/api/v1/auth', authRoutes)

  // LAYER 3: Protected routes (wajib login + company access)
  const protected = new Hono()
  protected.use('*', authMiddleware())
  protected.use('*', requireCompanyAccess())

  protected.route('/metrics',    metricsRoutes)
  protected.route('/import',     importRoutes)
  protected.route('/users',      usersRoutes)
  protected.route('/rbac',       rbacRoutes)
  protected.route('/config',     configRoutes)
  protected.route('/customers',  customersRoutes)
  protected.route('/audit-logs', auditRoutes)

  app.route('/api/v1', protected)
}
```

## Permission Strategy (Hybrid)

| Layer | Responsibility |
|-------|---------------|
| `router.ts` | Auth (JWT verify) + CompanyAccess — global untuk semua protected routes |
| `*.route.ts` | `requirePermission('resource:action')` — per endpoint, karena granularity berbeda |

Contoh: `/import/logs` butuh `import:read`, `/import/file` butuh `import:write` — tidak bisa di-group di router.ts.

### Feature Route — Zero Global Middleware
```typescript
// features/metrics/metrics.route.ts
// ⚠️ TIDAK ADA authMiddleware di sini — sudah dihandle router.ts
export const metricsRoutes = new Hono()
  .get('/cross-selling', requirePermission('metrics:read'), metricsHandler.getCrossSelling)
  .get('/revenue',       requirePermission('metrics:read'), metricsHandler.getRevenue)
  .get('/dormant',       requirePermission('metrics:read'), metricsHandler.getDormant)
```

## Middleware Chain Detail
```
CORS              — whitelist dari env
CSRF              — validate X-CSRF-Token pada mutations (POST/PUT/PATCH/DELETE)
RateLimit         — per IP
Auth              — verify JWT dari httpOnly cookie → set c.var.user
CompanyAccess     — verify user punya akses ke company_id yang diminta
                   (superadmin + admin bypass ini)
RequirePermission — check permission string, e.g. "metrics:read" — per endpoint
```

## Route Categories
```
PUBLIC                    PROTECTED (auth + company)   PROTECTED + PERMISSION
─────────────────────     ────────────────────────     ──────────────────────────────
POST /auth/login          (semua route di bawah)       GET /metrics/*  [metrics:read]
POST /auth/logout                                      GET /customers/* [customers:read]
POST /auth/refresh                                     POST /import/*  [import:write]
                                                       GET /users/*    [users:manage]
                                                       GET /audit-logs [roles:manage]
```

## Dev Setup
```bash
# Database
docker-compose up -d postgres

# Backend
cd backend && cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun run dev

# Frontend
cd frontend && cp .env.example .env
bun install
bun run dev
```

## MSW Mock Domains (dev only — active when import.meta.env.DEV)
auth      — login, logout, refresh, /me

page      — page ready flags

dashboard — metrics summary

metrics   — per-metric endpoints

## Key Architecture Decisions
- Feature-based folder structure — setiap domain punya folder sendiri dengan semua layer-nya
- Router Orchestrator (`router.ts`) — satu file yang mengatur middleware chain + route mounting
- Permission di feature route — granularity per endpoint, bukan per group
- Monolith modular — single repo, single deploy, split by domain folders
- No separate microservices for MVP
- Single PostgreSQL DB, company isolation via company_id column
- Metrics computed on-demand, cached in metric_cache table
- Accurate API fetched server-side only — API key never sent to frontend
- Auth cookie: httpOnly; Secure; SameSite=Strict
- Dev auth: localStorage + MSW — migrate to httpOnly cookie when backend ready