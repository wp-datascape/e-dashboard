# BACKEND AI AGENT INSTRUCTIONS

> **Hubungan dengan docs lain:**
> File ini adalah **ringkasan komprehensif backend untuk AI agent**. Ini adalah dokumen wajib baca untuk setiap task backend.
> - Rules yang overlap dengan `CRITICAL_RULES.md` → `CRITICAL_RULES.md` adalah sumber kebenaran (canonical).
> - Middleware chain & folder structure detail → `shared/architecture.md`
> - Endpoint list & error codes → `shared/api-conventions.md`
> - Pagination query standard & OpenAPI note → `shared/api-conventions.md`
> - Jika ada konflik antara file ini dan file lain di atas, **file lain yang lebih spesifik menang**.

You are an expert backend engineer working on the **Executive Dashboard — Holding Company** REST API.
This document defines the strict architectural rules, patterns, and infrastructure constraints for the backend. You MUST follow these guidelines when generating, modifying, or reviewing code.

## 1. Tech Stack (LOCKED — DO NOT SUGGEST ALTERNATIVES)
| Layer | Technology |
|---|---|
| **Runtime** | **Bun** (NOT Node.js) |
| **Backend** | Hono v4+ |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL 15+ |
| **Logger** | Winston + winston-daily-rotate-file |
| **CSV/Excel** | papaparse, xlsx (SheetJS) |
| **HTTP Client** | axios (server-side only for Accurate API) |
| **i18n** | i18next (for backend error messages & dynamic content) |

❌ **NEVER use:** Node.js, Prisma, TypeORM, Express, Pino, Next.js, Tailwind, Redux, Zustand.

## 2. Backend Folder Structure
Strictly adhere to this structure. Do not create random folders.
**Architecture: Feature-based + Router Orchestrator pattern.**
```text
backend/src/
├── index.ts              # Server bootstrap ONLY (port, env, global error handler)
├── router.ts             # ORCHESTRATOR — global MW + public/protected split + all route mounts
├── features/
│   ├── auth/
│   │   ├── auth.route.ts       # PUBLIC — no auth middleware
│   │   ├── auth.handler.ts
│   │   ├── auth.service.ts
│   │   └── auth.repository.ts
│   ├── metrics/
│   │   ├── metrics.route.ts    # requirePermission per endpoint
│   │   ├── metrics.handler.ts
│   │   ├── metrics.service.ts  # 10 KPI business logic
│   │   └── metrics.repository.ts
│   ├── import/
│   ├── users/
│   ├── roles/            # BUKAN "rbac/" — roles dan permissions dua folder feature terpisah
│   ├── permissions/
│   ├── customers/
│   ├── products/
│   ├── transactions/
│   ├── settings/         # high-margin, channel-divisions, threshold (via config)
│   ├── config/
│   ├── dashboard/
│   ├── docs/              # Swagger UI, mati di production
│   └── audit/
├── db/
│   ├── schema/           # Drizzle table definitions (snake_case plural)
│   └── migrations/       # drizzle-kit generated
├── middleware/
│   ├── auth.ts           # verifyJwt → set c.var.user + c.var.permissions. CSRF validation JUGA di sini
│   │                       (bukan file csrf.ts terpisah — X-CSRF-Token dicek inline untuk mutation methods),
│   │                       plus export resolveCompanyScope() (lihat §4 — bukan middleware, dipanggil manual per-handler)
│   ├── permission.ts     # requirePermission('resource:action')
│   ├── rate-limit.ts
│   ├── requestId.ts
│   └── requestLogger.ts
├── config/
│   ├── env.ts            # Validasi & parse environment variables via Zod — dijalankan saat startup
│   └── db.ts             # Drizzle instance + postgres client — sumber koneksi DB tunggal
├── utils/                # response, error, jwt, hash, csrf, audit, parser, accurate, validator, logger
└── types/                # Shared TypeScript types
```

**Catatan:** `middleware/company-access.ts` dan `middleware/csrf.ts` yang disebut di versi lama dokumen ini **tidak pernah dibuat sebagai file terpisah** — itu rencana arsitektur awal yang berubah saat implementasi (lihat §4 untuk pattern company-scope yang benar-benar dipakai).

## 3. API Conventions & Response Shapes
Base URL: /api/v1
Auth: JWT httpOnly cookie.
CSRF: X-CSRF-Token header required on ALL mutations (POST/PUT/PATCH/DELETE).
Standardized JSON Response
ALL API responses MUST use utils/response helpers. Never return raw c.json().
Success (Single):
```json
{ "message": "Success", "data": {} }
```
Success (Paginated):
```json
{ "message": "Success", "data": [], "meta": { "page": 1, "per_page": 20, "total": 100 } }
```
Error:
```json
{ "error": "ERROR_CODE", "message": "Human readable message (translated via i18n if applicable)" }
```

Pagination & Query Parsing
Standardize query parsing for all list endpoints: ?page=1&per_page=20&sort=created_at:desc.
Always use a helper utility to parse and validate these query parameters safely.
## 4. Router Orchestrator & Middleware Chain

### `index.ts` — Bootstrap Only
```typescript
import { Hono } from 'hono'
import { createRouter } from './router'
const app = new Hono()
createRouter(app)
export default { port: process.env.PORT ?? 3000, fetch: app.fetch }
```

### `router.ts` — Orchestrator (satu-satunya file yang tahu semua route, disederhanakan dari aslinya)
```typescript
export function createRouter(app: Hono) {
  // LAYER 1: Global (semua request, termasuk /auth)
  app.use('*', requestIdMiddleware)
  app.use('*', requestLogger)
  app.use('*', cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }))

  // LAYER 2: Public (no auth) — rate-limit lebih ketat khusus di sini (brute-force login)
  app.route('/api/v1/auth', authRoutes)

  // LAYER 3: Protected — SATU middleware global: authMiddleware (verify JWT + validasi
  // CSRF utk mutation + load permissions dari DB). TIDAK ADA requireCompanyAccess() global
  // — company scoping dihandle manual per-handler via resolveCompanyScope() (lihat §4a), karena
  // kebutuhan scope beda-beda per fitur (single company vs 'all' vs company-agnostic).
  const protectedApi = new Hono()
  protectedApi.use('*', authMiddleware())
  protectedApi.route('/users',       usersRoutes)
  protectedApi.route('/roles',       rolesRoutes)         // BUKAN gabungan "/rbac"
  protectedApi.route('/permissions', permissionsRoutes)   // roles & permissions dua route terpisah
  protectedApi.route('/metrics',     metricsRoutes)
  protectedApi.route('/import',      importRoutes)
  protectedApi.route('/config',      configRoutes)
  protectedApi.route('/customers',   customersRoutes)
  protectedApi.route('/audit-logs',  auditRoutes)
  // ...+ companies, products, transactions (mount sbg /invoices), dashboard, settings/*, dst
  app.route('/api/v1', protectedApi)
}
```

### Feature Route — Zero Global Auth Middleware, Permission Per Endpoint
```typescript
// features/metrics/metrics.route.ts
// authMiddleware sudah dihandle router.ts — JANGAN ditambah lagi di sini.
// Permission key WAJIB dot-notation module.submodule:action (lihat features/permissions.md),
// dan HARUS sama dengan permissionKey halaman frontend yang memakai endpoint itu — bukan
// nama generik seperti 'metrics:read'/'metrics:view' (permission itu sudah deprecated, lihat
// pitfall di features/permissions.md — semua role non-superadmin sempat selalu 403 karenanya).
export const metricsRoutes = new Hono()
metricsRoutes.get('/cross-selling',    requirePermission('cross.selling:view'), handleGetCrossSelling)
metricsRoutes.get('/customer-metrics', requirePermission('expansion:view'),     handleGetCustomerMetrics)
metricsRoutes.get('/dormant-customer', requirePermission('churn.risk:view'),    handleGetDormantMetrics)
```

### Middleware Chain Order (full, protected routes):
```
RequestId → RequestLogger → CORS → Auth(+CSRF+Permissions) → RequirePermission(per-route) → Handler
```
- RequestId: generate request_id untuk tracing di log
- RequestLogger: log method+path+status+durasi
- CORS: Whitelist dari env (`CORS_ORIGIN`, bisa multi domain dipisah koma)
- Auth (`authMiddleware`, `middleware/auth.ts`): verify JWT dari httpOnly cookie → set `c.var.user` (userId, email, companyIds, isSuperAdmin); **CSRF validation inline di sini juga** (bukan middleware terpisah) untuk method POST/PUT/PATCH/DELETE; query permissions dari DB → set `c.var.permissions`
- RequirePermission (`middleware/permission.ts`): check permission string per endpoint (OR logic kalau multi-key), superadmin selalu bypass
- **Company scoping bukan bagian chain middleware** — dipanggil manual di handler lewat `resolveCompanyScope(c, query.company_id)` (lihat §4a) untuk fitur yang butuh, tidak semua endpoint butuh (mis. `/users`, `/roles` company-agnostic)

## 4a. Company Scoping Pattern — `resolveCompanyScope()`

Bukan middleware global — dipanggil manual di handler untuk endpoint yang datanya per-company:

```typescript
// backend/src/middleware/auth.ts
export function resolveCompanyScope(c: Context, requested: number | 'all'): number[] | undefined {
  const { companyIds, isSuperAdmin } = c.var.user
  if (isSuperAdmin) {
    if (requested === 'all') return undefined       // superadmin + 'all' → tanpa filter
    return [requested]
  }
  if (requested === 'all') return companyIds          // non-superadmin + 'all' → scope ke company sendiri
  if (!companyIds.includes(requested)) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Akses ke company ini tidak diizinkan', 403)
  }
  return [requested]
}
```

Dipakai di handler (`customers`, `transactions`, `metrics`, `products`, `import`, `audit`, `high-margin` — cek pemakaian aktual via `grep -rn resolveCompanyScope backend/src/features`):
```typescript
export async function handleListX(c: Context) {
  const query = validateQuery(c, schema)
  const scopeIds = resolveCompanyScope(c, query.company_id)  // number[] | undefined
  const result = await listXService(query, scopeIds)
  return success(c, result)
}
```
Di repository: `scopeIds` array → `inArray(table.company_id, scopeIds)`; `undefined` → tidak ada filter sama sekali. **Selalu guard `scopeIds.length === 0` → return kosong duluan** sebelum `inArray()` — drizzle-orm error kalau dipanggil dengan array kosong.

## 5. Database & ORM Rules (Drizzle)
Schema: Tables are snake_case plural. Every table has id, created_at, updated_at. Soft delete via deleted_at.
MANDATORY FILTER: Every query MUST filter by company_id. No exceptions.
No Raw SQL: Use Drizzle query builder unless there is a clear performance reason.
Soft Delete Only: Never hard-delete invoice data.
Idempotency: Dedup key for imports = invoice_number + company_id.

## 6. Layer Responsibilities (MANDATORY ARCHITECTURE)

```
Repository  → raw DB query only. Boleh lempar PostgresError mentah.
     ↓
Service     → business logic + tangkap raw DB error → terjemahkan ke AppError
               isNotFoundError(err)  → AppError(NOT_FOUND, '...', 404)
               isDuplicateError(err) → AppError(DUPLICATE_ENTRY, '...', 409)
               err instanceof AppError → re-throw
               else → AppError(INTERNAL_ERROR, '...', 500)
     ↓
Handler     → validate input → call service → return response
               TIDAK ADA try-catch, TIDAK ADA AppError, TIDAK ADA error logic
     ↓
Global Error Handler → tangkap semua AppError → kirim HTTP response
```

**Handler wajib tipis (thin):**
```ts
export async function handleGetX(c: Context) {
  const query = validateQuery(c, schema)   // validate saja
  const result = await serviceFn(query)    // delegasi ke service
  return paginated(c, result.data, {...})  // kembalikan response
}
```

**Service wajib tangkap raw DB error:**
```ts
export async function getX(params) {
  try {
    return await repositoryFn(params)
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, '...', 409)
    if (isNotFoundError(err)) throw new AppError(ErrorCode.NOT_FOUND, '...', 404)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, '...', 500)
  }
}
```

Setiap fitur WAJIB punya 4 layer: Route → Handler → Service → Repository. Jika belum ada service, buat dulu sebelum handler disentuh.

## 7. Core Utilities (NEVER REWRITE)
Always import and use these existing utilities:

| Package          | Exports                                                  | Usage                                                                                                    |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `utils/response` | `success()`, `error()`, `paginated()`                    | Wrap **all handler responses** in a standardized API response format.                                    |
| `utils/response` | `isNotFoundError(err)`, `isDuplicateError(err)`          | Helper deteksi jenis raw DB error di **service layer**. Import dari sini, bukan buat sendiri.            |
| `utils/error`    | `AppError`, `ErrorCode`                                  | Throw application errors. **Selalu pass status code** sebagai arg ke-3 — default 500 salah untuk NOT_FOUND/DUPLICATE. |
| `utils/logger`   | Winston wrapper                                          | `info` → console only; `warn` → file + console; `error` → file + console.                               |
| `utils/audit`    | `logAudit(ctx, opts)`                                    | Call in the **Service layer** after every successful data mutation (`create`, `update`, `delete`, etc.). |
| `utils/parser`   | `parseCsv()`, `parseExcel()`                             | Parse and validate uploaded CSV and Excel files.                                                         |
| `utils/accurate` | `fetchInvoices(companyId, params)`                       | Fetch invoice data from Accurate Online using company context and query parameters.                      |

## 7. API Design, i18n & Developer Experience (DX)
Backend i18n: Use i18next for translating backend error messages, email templates, and dynamic content. Never hardcode user-facing strings in the backend response if it's meant to be localized.
API Documentation: `src/docs/openapi.yaml` ditulis manual, di-serve via Swagger UI di `/api/v1/docs` (mati di production). Auto-generate dari Zod schema sudah dicoba & di-rollback (peer-dependency Zod v4 vs project Zod v3) — lihat `features/api-docs.md`.
Developer Experience (DX):
Enforce ESLint, Prettier, and Husky (lint-staged).
No code should be committed if it fails linting or testing.
Use bun test or Vitest for testing.

## 8. Security & Secrets
Auth Cookie: httpOnly; Secure; `SameSite=None` di production (`backend/src/features/auth/auth.handler.ts` — `SAME_SITE = SECURE ? 'None' : 'Lax'`), `Lax` di dev. Diputuskan sebelum proxy Vercel→Railway (`shared/deployment.md` §5a) ada — belum diverifikasi ulang apakah `None` masih genuinely perlu sekarang request sudah same-origin dari sisi browser lewat proxy itu; kalau ada waktu, uji turunkan ke `Lax` dan cek apakah cookie tetap terkirim.
Secrets: Accurate API keys stored in app_configs with is_secret=true. NEVER return them to the frontend (mask as ***).
Passwords: bcryptjs cost >= 12.
Uploads: Validate MIME + extension whitelist. Max 10MB.

## 9. Background Jobs & Caching
Metrics Cache: Computed on-demand in backend service layer. Cached in metric_cache table with expires_at.
Job Queue: Use PostgreSQL table-based job queue for simple background tasks (e.g., large imports).

⚠️ STRICT AI AGENT DIRECTIVES ⚠️
When generating backend code, you MUST:
NEVER use Node.js, Prisma, Express, or Pino. The stack is strictly locked to Bun, Drizzle, Hono, and Winston.
NEVER return raw Drizzle objects or raw arrays directly from a handler. Always wrap in success(), error(), or paginated() from utils/response.
NEVER put database query logic inside a Handler. Handlers only validate (Zod) and call Services. Services call Repositories.
NEVER put try-catch or AppError in a Handler. Error logic belongs in the Service layer.
NEVER create an AppError without explicit status code (3rd argument) — `new AppError(NOT_FOUND, '...', 404)`. Default is 500 which is wrong for NOT_FOUND/DUPLICATE.
NEVER call repository functions directly from a handler. Always go through a service.
NEVER write a query without filtering by company_id (unless explicitly bypassed for superadmin holding view).
NEVER hardcode business thresholds (e.g., dormant months). Fetch them from app_configs table.
NEVER import winston directly. Always use the utils/logger wrapper.
NEVER log sensitive PII data. Always use the configured Winston redaction/masking.
NEVER make external API calls (like Accurate) without a timeout and error handling (Circuit breaker).
NEVER skip logAudit() in the Service layer for create, update, or delete operations.
ALWAYS use Zod for validating incoming request data (body, query, param) and environment variables.
ALWAYS include request_id in error logs for tracing.
ALWAYS require X-CSRF-Token header validation on all POST/PUT/PATCH/DELETE routes.
ALWAYS write code in strict TypeScript. Avoid any at all costs. Use async/await only.
