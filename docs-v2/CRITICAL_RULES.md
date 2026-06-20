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
- **API Docs**: Auto-generate OpenAPI/Swagger documentation from Zod schemas — keep docs in sync with code.

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
| Error message fallback | Error dari API pakai `err.message || t('...')` — jangan hardcoded string manual |
| Pages like NotFound/UnderMaintenance | Wajib pakai `useTranslation()` — jangan lupa hanya karena page sederhana |

Violations detected via: search for hardcoded strings wrapped in `<Typography>`, `title=`, `message=`, `label=`, `placeholder=` that are NOT `t()` calls.

Anti-pattern:
```typescript
// ❌ Hardcoded
<Typography>404 - Halaman Tidak Ditemukan</Typography>
setErrorInfo({ title: 'Login Gagal', message: 'Terjadi kesalahan' })

// ✅ i18n
<Typography>{t('notFound.title')}</Typography>
setErrorInfo({ title: t('auth.loginFailedTitle'), message: err.message || t('auth.loginFailedMessage') })
```

## Database Conventions
- Schema in `src/db/schema/` | Table names: `snake_case` plural
- Every table: `id` (serial), `created_at`, `updated_at`
- Soft delete via `deleted_at` — **never hard-delete invoice data**
- Migrations: `drizzle-kit generate` → `drizzle-kit migrate`

## Security Rules
| Aspect           | Rule                                              |
|------------------|---------------------------------------------------|
| Auth             | JWT httpOnly; Secure; SameSite=Strict             |
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
✅ In scope: Auth + RBAC, invoice import (file + API), 10 metrics, filters, monthly trends, customer detail, audit log, dynamic config
❌ Out of scope: PDF/Excel export, realtime notifications, scheduled Accurate sync, mobile app, AI forecasting, multi-DB
