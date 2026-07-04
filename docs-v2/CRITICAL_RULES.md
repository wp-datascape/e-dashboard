# CRITICAL_RULES.md — Hard Constraints & Conventions

## Tech Stack (LOCKED — do not suggest alternatives)

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Runtime    | Bun (NOT Node.js)                       |
| Backend    | Hono v4+                                |
| ORM        | Drizzle ORM                             |
| Database   | PostgreSQL 15+                          |
| Frontend   | React 19 + Vite 8 + TypeScript 6        |
| UI         | MUI v9                                  |
| Charts     | Recharts v3                             |
| Table      | MUI X DataGrid v9                       |
| Forms      | React Hook Form v7 + Zod v4             |
| Data fetch | TanStack Query v5                       |
| Mock API   | MSW v2 (DEV only)                       |
| Logger     | Winston + winston-daily-rotate-file     |
| CSV        | papaparse                               |
| Excel      | xlsx (SheetJS)                          |
| Accurate   | axios (server-side only)                |

❌ Never use: Prisma, TypeORM, Express, Next.js, Tailwind, shadcn/ui, Redux, Zustand

## Backend Conventions

### Architecture Pattern
**Feature-based + Router Orchestrator** (detail: `shared/architecture.md`)

```
backend/src/
├── index.ts        # Bootstrap only
├── router.ts       # ORCHESTRATOR — global MW + public/protected + route mount
├── features/       # Setiap domain: route + handler + service + repository
├── middleware/     # auth, permission, company-access, csrf, rate-limit
├── utils/          # response, error, jwt, audit, logger, parser, accurate, validator
└── db/             # schema + migrations
```

### Flow
Route → Handler → Service → Repository

Aturan per layer:
- **Handler**: validasi input (Zod) + panggil Service + shape response — TIDAK BOLEH query DB langsung
- **Service**: business logic + panggil Repository + panggil `logAudit()` setelah mutasi
- **Repository**: semua query Drizzle ORM — wajib filter `company_id`

### Code Rules
- Validate input with **zod** in every handler before calling service
- All responses via `utils/response` helpers — never raw `c.json()`
- All errors as `AppError` from `utils/error`
- No `catch(e) {}` without handling
- TypeScript strict mode — no `any`
- Use `async/await` only

### Router Orchestrator Rules
- `index.ts` = bootstrap saja, tidak ada route/middleware logic
- `router.ts` = satu-satunya file yang mount semua feature routes
- Auth + CompanyAccess = di `router.ts` (global untuk semua protected routes)
- Permission (`requirePermission`) = di `*.route.ts` per endpoint — bukan di `router.ts`
- Feature `*.route.ts` = TIDAK BOLEH tambah `authMiddleware` — sudah dihandle `router.ts`

### Available Utils (never rewrite)
| Package          | Exports                                              |
|------------------|------------------------------------------------------|
| `utils/response` | `success()`, `error()`, `paginated()`                |
| `utils/error`    | `AppError`, standard error constants                 |
| `utils/jwt`      | `generateToken()`, `verifyToken()`                   |
| `utils/hash`     | `hashPassword()`, `comparePassword()`                |
| `utils/csrf`     | `generateCsrfToken()`, `validateCsrfToken()`         |
| `utils/audit`    | `logAudit(ctx, opts)` → writes to `audit_logs` table |
| `utils/parser`   | `parseCsv()`, `parseExcel()`                         |
| `utils/accurate` | `fetchInvoices(companyId, params)`                   |
| `utils/validator`| `validateDto(schema, data)`                          |

### Logger Rules (Winston)
| Level   | Console | File                    |
|---------|---------|-------------------------|
| `info`  | ✅      | ❌ (console only)       |
| `warn`  | ✅      | ✅ `log/warn/YYYY-MM-DD.log` |
| `error` | ✅      | ✅ `log/error/YYYY-MM-DD.log`|

Import logger only via `utils/logger` wrapper — never import winston directly.
- **ALWAYS include `request_id`** in error logs for distributed tracing.
- **NEVER log sensitive PII data** — use Winston redaction/masking config.

### Backend i18n
- Use **i18next** for translating backend error messages, email templates, and dynamic content.
- Never hardcode user-facing strings in backend responses intended to be localized.
- i18n is for backend text only — frontend uses its own i18n (see Frontend Conventions).

### Developer Experience (DX)
- **Linting**: ESLint + Prettier enforced (no commits if linting fails).
- **Pre-commit**: Husky + lint-staged.
- **Testing**: `bun test` (preferred) or Vitest. Tests must pass before merge.
- **API Docs**: `src/docs/openapi.yaml` ditulis manual, di-serve via Swagger UI (`swagger-ui-dist`) di `/api/v1/docs` (mati di production). Auto-generate dari Zod schema (`hono-openapi`+`zod-openapi`) sudah dicoba dan di-rollback — peer-dependency Zod v4 vs project Zod v3, dan validator middleware-nya tidak bisa dibuat read-only. Detail: `features/api-docs.md`.

### Audit Log (DB — not file)
Write to `audit_logs` table for: create, update, delete.
Call `logAudit()` in Service layer after successful mutation.

**Required audit actions:**
`invoice.import` | `user.create/update/delete` | `role.create/update/delete`
`permission.assign/revoke` | `user_role.assign/revoke` | `config.update` | `category.update`

### ORM Rule
```typescript
// ✅ Drizzle ORM
const items = await db.select().from(invoiceItems)
  .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
  .where(eq(invoices.companyId, companyId))

// ❌ Raw SQL (only if clear perf reason)
```

### Multi-entity: company_id Filter (MANDATORY)
```typescript
.where(and(
  eq(invoices.companyId, companyId),
  // other filters
))
```
`superadmin` + `admin` bypass `user_companies` check. Others: `requireCompanyAccess` middleware.

## Naming Convention

**Semua property name yang mereferensi DB column WAJIB snake_case.**

### Backend — Aturan Naming
| Scope | Convention | Contoh |
|-------|-----------|--------|
| Drizzle schema JS properties | snake_case | `is_active`, `created_at`, `updated_at`, `last_login_at`, `deleted_at` |
| Drizzle schema DB column name arg | snake_case | `boolean('is_active')`, `timestamp('created_at')` |
| Zod schema fields | snake_case | `is_active: z.boolean()`, `role_ids: z.array(...)` |
| Repository query field references | snake_case | `users.is_active`, `users.created_at` |
| Repository `.set()` object keys | snake_case | `.set({ ...data, updated_at: new Date() })` |
| Service object property access | snake_case | `before.is_active`, `after.is_active` |
| Seed insert keys | snake_case | `is_active: true`, `created_at: new Date()` |
| logAudit call parameter names | **camelCase** (JS API) | `entityId`, `companyId`, `oldValue`, `newValue` |
| Drizzle `.select({})` aliases | Any (temporary) | `rolesJson`, `companiesJson` |
| SQL template literals | Any (SQL keys) | `'is_system'` dalam `json_build_object` |

### Frontend — Aturan Naming
| Scope | Convention | Contoh |
|-------|-----------|--------|
| TypeScript type fields | snake_case | `is_active: boolean`, `last_login_at: string` |
| API adapter property access | snake_case (prefer) | `raw.is_active` (backend returns snake_case) |
| Component prop access on role object | snake_case | `role.is_system` |
| i18n keys | snake_case | `users.created_at` |
| Mock data keys | snake_case | `page_key: 'dashboard'` |
| Hooks/Component local variables | camelCase (JS internal) | `isActive` sebagai local var |

### Pengecualian
Parameter AUDIT utils (`logAudit()`) tetap camelCase karena JS API convention — internal mapping ke snake_case dilakukan di dalam function.

## Frontend Conventions

- Functional components + hooks only (no class components)
- Server state: TanStack Query (`useQuery` / `useMutation`) — no manual fetch in components
- All API calls via `src/api/` layer only
- Auth state + `permissions[]` in `AuthContext`
- Use `PermissionGuard` (not role name checks)
- Component naming: `PascalCase` | Files: `PascalCase.tsx`
- Custom hooks in `src/hooks/` | Types in `src/types/`
- New page checklist:
  1. Register in `src/route/routes.tsx`
  2. Add to `src/config/menu.tsx` NAV_ITEMS
  3. Add MSW handler in `src/mocks/handlers/`
  4. Set `ready=true` in `page.handler.ts`

### i18n Rules (WAJIB)

| Aturan | Penjelasan |
|--------|-----------|
| Semua user-facing text wajib `t('key')` | Tidak ada hardcoded string untuk teks yang terlihat pengguna |
| Setiap teks baru harus ada di `en.json` DAN `id.json` | Kedua file harus diupdate bersamaan |
| Akses hook via `useTranslation()` | `const { t } = useTranslation()` — jangan import i18n langsung |
| Komponen global/reusable juga wajib i18n | Contoh: `ResponsiveListView` pakai `t('common.errorOccurred')`, `t('common.noData')` |
| Error dari API — JANGAN pakai `err.message` | `message` dari backend hardcoded Indonesia & tidak di-i18n. Wajib resolve lewat error code: `getApiErrorMessage(err, t)` dari `@/utils/apiError` — detail: `shared/api-conventions.md` |
| Pages like NotFound/UnderMaintenance | Wajib pakai `useTranslation()` — jangan lupa hanya karena page sederhana |

Violations detected via: search for hardcoded strings wrapped in `<Typography>`, `title=`, `message=`, `label=`, `placeholder=` that are NOT `t()` calls; juga search `err.message`/`error.message` di luar `utils/apiError.ts` dan `api/axios.ts`.

Anti-pattern:
```typescript
// ❌ Hardcoded
<Typography>404 - Halaman Tidak Ditemukan</Typography>

// ❌ Pesan error API ditampilkan mentah — ikut bahasa backend (Indonesia), bukan bahasa aplikasi
setErrorInfo({ title: t('auth.loginFailedTitle'), message: err.message || t('auth.loginFailedMessage') })

// ✅ i18n
<Typography>{t('notFound.title')}</Typography>
setErrorInfo({ title: t('auth.loginFailedTitle'), message: getApiErrorMessage(err, t) })
```

## Database Conventions
- Schema in `src/db/schema/` | Table names: `snake_case` plural
- Every table: `id` (serial), `created_at`, `updated_at`
- Soft delete via `deleted_at` — **never hard-delete invoice data**
- Migrations: `drizzle-kit generate` → `drizzle-kit migrate`

### ⚠️ Drizzle-kit Migration Limitation (CRITICAL)
`drizzle-kit migrate` hanya menjalankan file yang **di-generate oleh `drizzle-kit generate`**.
File SQL yang ditulis tangan di folder `migrations/` TIDAK akan dieksekusi oleh drizzle-kit.

**Untuk DDL manual (RENAME COLUMN, dll):** jalankan langsung via script postgres.js:
```bash
bun -e "
import postgres from 'postgres'
const sql = postgres(process.env.DATABASE_URL!)
await sql\`ALTER TABLE invoices RENAME COLUMN old_name TO new_name\`
await sql.end()
"
```

## Security Rules
| Aspect           | Rule                                              |
|------------------|---------------------------------------------------|
| Auth             | JWT httpOnly; Secure; `SameSite=None` di production (cross-site FE↔BE), `Lax` di dev |
| CSRF             | `X-CSRF-Token` header on ALL mutations            |
| Input            | zod schema in every handler                       |
| Password         | bcryptjs cost ≥ 12                                |
| Upload           | Validate MIME + extension whitelist               |
| Accurate key     | Stored in `app_configs` is_secret=true — never return to frontend |
| Error            | Never expose stack trace to client                |
| company_id       | Filter on every query — no exceptions             |
| Accurate API     | ALWAYS wrap with timeout + error handling (circuit breaker pattern) |

## RBAC Rules
- Fully dynamic — managed from dashboard, not hardcoded
- Permission format: `resource:action` (e.g. `metrics:read`, `users:manage`)
- Prefer `requirePermission('metrics:read')` over `requireRole('admin')`
- System roles (`is_system=true`): cannot delete or rename

### Permission Loading Strategy
**Permissions di-load dari DB per request — TIDAK disimpan di JWT payload.**
- JWT payload hanya: `{ userId, email, companyIds, isSuperAdmin }`
- `authMiddleware` verify JWT → query permissions dari DB → set `c.var.user.permissions`
- `requirePermission` cek `c.var.user.permissions` — tanpa DB hit tambahan
- Login/refresh response include `permissions[]` untuk frontend (display purposes only, bukan enforcement)
- Detail: `shared/architecture.md` → Permission Strategy Decision

## Import Rules
- Accepted: `.csv`, `.xlsx` only — max 10MB
- Idempotent: dedup key = `invoice_number + company_id`
- Partial success allowed: valid rows inserted, errors logged to `import_log_errors`
- Always call `logAudit('invoice.import')` after successful import

## Metrics Rules
- Calculate in **backend service layer only** — never in frontend
- Cache in `metric_cache` table with `expires_at`
- Required params: `company_id`, `period_month` (YYYY-MM), `active_window` (3|6|12)
- Thresholds from `app_configs` — never hardcode

## Background Jobs
- Use **PostgreSQL table-based job queue** for background tasks (e.g., large file imports).
- Metrics are computed on-demand and cached via `metric_cache` table with `expires_at`.
- No external queue system (Redis, RabbitMQ, etc.) — out of MVP scope.

## MVP Scope
✅ In scope: Auth + RBAC, invoice import (file + API), 10 metrics, filters, monthly trends, customer detail, audit log, dynamic config, PWA (installable, `vite-plugin-pwa`), PDF export drill-down tertentu (`utils/pdf/`, mis. GP breakdown), Excel import/export template per fitur
❌ Out of scope: realtime notifications, scheduled Accurate sync, native mobile app, AI forecasting, multi-DB