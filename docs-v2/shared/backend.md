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
│   ├── csrf.ts
│   └── rate-limit.ts
├── config/
│   ├── env.ts            # Validasi & parse environment variables via Zod — dijalankan saat startup
│   └── db.ts             # Drizzle instance + postgres client — sumber koneksi DB tunggal
├── utils/                # response, error, jwt, hash, csrf, audit, parser, accurate, validator, logger
└── types/                # Shared TypeScript types
```

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

### `router.ts` — Orchestrator (satu-satunya file yang tahu semua route)
```typescript
export function createRouter(app: Hono) {
  // LAYER 1: Global (semua request)
  app.use('*', cors())
  app.use('*', csrfMiddleware())
  app.use('*', rateLimitMiddleware())

  // LAYER 2: Public (no auth)
  app.route('/api/v1/auth', authRoutes)

  // LAYER 3: Protected (auth + company access)
  const protectedApi = new Hono()
  protectedApi.use('*', authMiddleware())
  protectedApi.use('*', requireCompanyAccess())
  protectedApi.route('/metrics',    metricsRoutes)
  protectedApi.route('/import',     importRoutes)
  protectedApi.route('/users',      usersRoutes)
  protectedApi.route('/rbac',       rbacRoutes)
  protectedApi.route('/config',     configRoutes)
  protectedApi.route('/customers',  customersRoutes)
  protectedApi.route('/audit-logs', auditRoutes)
  app.route('/api/v1', protectedApi)
}
```

### Feature Route — Zero Global Middleware, Permission Per Endpoint
```typescript
// features/metrics/metrics.route.ts
// Auth + CompanyAccess sudah dihandle router.ts — JANGAN ditambah lagi di sini
export const metricsRoutes = new Hono()
  .get('/cross-selling', requirePermission('metrics:read'), metricsHandler.getCrossSelling)
  .get('/revenue',       requirePermission('metrics:read'), metricsHandler.getRevenue)
  .get('/dormant',       requirePermission('metrics:read'), metricsHandler.getDormant)
```

### Middleware Chain Order (full):
```
CORS → CSRF → RateLimit → Auth → CompanyAccess → RequirePermission → Handler
```
- CORS: Whitelist dari env
- CSRF: Validate X-CSRF-Token pada mutations (POST/PUT/PATCH/DELETE)
- RateLimit: Per IP
- Auth: Verify JWT dari httpOnly cookie → set `c.var.user`
- CompanyAccess: Verify user akses ke `company_id` (superadmin + admin bypass)
- RequirePermission: Check permission string per endpoint, e.g. `metrics:read`

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
API Documentation: Auto-generate OpenAPI/Swagger documentation directly from Zod schemas. Keep docs in sync with code.
Developer Experience (DX):
Enforce ESLint, Prettier, and Husky (lint-staged).
No code should be committed if it fails linting or testing.
Use bun test or Vitest for testing.

## 8. Security & Secrets
Auth Cookie: httpOnly; Secure; SameSite=Strict.
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
