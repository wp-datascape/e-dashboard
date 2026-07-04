# CURRENT_STATE_BACKEND.md — Status Backend

> File ini khusus untuk tracking progress backend.
> Update setiap akhir sesi kerja backend.
> Last updated: 2026-07-04 (sesi 32)
>
> **Catatan**: bagian "Setup & Infrastructure", "DB Schema", "Middleware", "Features — Not Started"
> di bawah ini adalah skeleton perencanaan awal proyek yang SUDAH TIDAK AKURAT — item-item yang
> ditandai "Not Started" di situ sebagian besar sudah lama selesai (lihat tabel "Overall Backend
> Progress" di bawah untuk status yang benar). Belum dibersihkan/disinkron ulang — jangan jadikan acuan, cek
> `docs-v2/features/*.md` per fitur untuk status akurat.

---

## Overall Backend Progress

| Layer            | Status  | Notes                                      |
|------------------|---------|--------------------------------------------|
| Project Setup    | Done    | Bun, tsconfig, bun-types, .env             |
| Folder Structure | Done    | Feature-based + Router Orchestrator        |
| Config           | Done    | env.ts (Zod), db.ts (Drizzle)              |
| Utils            | Done    | 10 utils siap pakai (logger: Winston + PII redaction fixed) |
| Middleware       | ✅ Done | requestId, requestLogger, auth (JWT+CSRF), rate-limit, **permission** (requirePermission) |
| DB Schema        | Done    | 21 tabel aktif (+ channel_divisions, products). Kolom `salesperson_name` direname → `channel_name` via migration 0004 (dieksekusi manual, bukan drizzle-kit). |
| DB Migration     | Done    | Konsolidasi 3 file deskriptif: 0001_auth_system, 0002_branches_credentials, 0003_transactions_import |
| DB Seed          | Done    | 88 permissions (24 kategori, dot-notation), 3 companies, 5 branches, 3 roles. DB di-drop + re-seed 2026-06-29. |
| Handler Pattern  | Done    | Semua fitur punya handler.ts terpisah dengan error handling |
| Feature: Auth    | ✅ Done | login/logout/refresh/me + authMiddleware + rate-limit. Pending: refresh token revocation, audit log auth events |
| Feature: RBAC    | Done    | roles + permissions mounted                |
| Feature: Users   | Done    | CRUD + handler — docs: `features/users.md`   |
| Feature: Companies | Done  | CRUD + branches + handler — docs: `features/companies.md` |
| Feature: Roles   | Done    | CRUD + permissions + handler — docs: `features/roles.md` |
| Feature: Permissions | Done | CRUD + assign + handler — docs: `features/permissions.md` |
| Feature: Config  | Done    | GET + PUT + Accurate credentials + handler — docs: `features/config-page.md` |
| Feature: Page    | Done    | GET + PUT + handler — docs: `features/page-settings.md` |
| Feature: Audit   | Done    | list + detail + handler — docs: `features/audit.md` |
| Feature: Products | Done   | GET categories + products dari Accurate API + handler |
| Feature: Import  | ~95%    | File upload + SSE streaming + template validation + branch_name. Sisa: auth guard, rollback endpoint |
| Feature: Metrics | ✅ ~98%  | M1–M2, M3–M7, M8–M10 LIVE dari real DB. Endpoint produk (category-performance, high-margin-penetration, customer-products, avg-category/Product Trend) juga live. `avg-category` `active_window` sekarang default dari `business_configs.active_window_months` (sesi 26), bukan hardcode. **Fix sesi 32: 12 endpoint di `metrics.route.ts` pakai permission `metrics:view` yang sudah deprecated (tidak pernah bisa di-assign lewat RBAC UI) — semua role non-superadmin selalu 403. Diganti permission granular per halaman (`cross.selling:view`, `expansion:view`, `churn.risk:view`, `product:view`, `high.margin:view`, `product.trend:view`).** |
| Feature: Customers | ✅ 100% | GET / + GET /:id, status logic, channel division filter aktif |
| Feature: Transactions | ✅ Done (sesi 26) | GET /invoices + GET /invoices/:id real backend — docs: `features/transactions.md`. Menu/permission di-rename Order → Transaction. |
| Feature: Dashboard | ✅ Done (sesi 26) | GET /dashboard — agregator 10 metric card dari service metrics existing — docs: `features/dashboard.md` |
| Feature: Companies | ✅ Done (sesi 32) | `GET /companies` tidak lagi wajib `settings.company:view` — cukup login, sudah difilter ke `companyIds` user dari JWT. `GET /:id` + CRUD tetap terproteksi. |
| Feature: Channel Divisions | ✅ Done (sesi 32) | Endpoint baru `GET /settings/channel-divisions/values` — nilai divisi unik tanpa `channel_name`, tanpa permission (dipakai dropdown filter di 8 halaman). Mapping lengkap (`GET /`) tetap `settings.channel.division:view`. |
| Feature: High Margin Settings | ✅ Done (sesi 34) | `company_id: number\|'all'` (default `'all'`) di LIST, pakai `resolveCompanyScope()` — superadmin+`all` lihat semua, non-superadmin+`all` auto-scope ke company sendiri. Scope check ditambah juga di CREATE (sebelumnya bisa create ke company mana pun tanpa validasi). Response tambah `company_name` (join `companies`). |
| Deploy Infra | ✅ Done (sesi 31) | `backend/Dockerfile` multi-stage (`oven/bun`) + `scripts/build-prod.ts` (Bun.build + javascript-obfuscator) — Railway/Render tidak punya runtime Bun native. SSL Postgres dideteksi dari hostname `DATABASE_URL`, bukan `NODE_ENV` (migration lokal→production butuh SSL walau `NODE_ENV=development`). |
| RBAC Seed | ✅ Done (sesi 32) | `seedRoleDefaultPermissions()` — baseline permission otomatis utk role `admin` (full akses bisnis inti + Settings view/update, Access Control & Audit Log view-only, Configuration eksklusif superadmin) dan `user` (view+export bisnis inti saja). Idempotent & aditif, tidak mencabut kustomisasi manual. |

---

## Setup & Infrastructure — Done

### Files yang Sudah Ada
| File | Status | Keterangan |
|------|--------|------------|
| `package.json` | Done | Entry point diupdate ke `src/index.ts` |
| `tsconfig.json` | Done | bun-types, paths `@/*`, tanpa baseUrl |
| `.env` | Done | Dev values, JWT_SECRET + CSRF_SECRET >= 32 chars |
| `.env.example` | Done | Template untuk onboarding developer baru |
| `src/index.ts` | Done | Bootstrap — port dari env, mount router |
| `src/router.ts` | Done | Orchestrator stub — CORS aktif, /health endpoint |

---

## Config — Done

| File | Status | Exports |
|------|--------|---------|
| `src/config/env.ts` | Done | `env` — Zod-validated, single source of truth |
| `src/config/db.ts` | Done | `db` — Drizzle ORM instance, postgres-js pool |

---

## Utils — Done (10/10)

| File | Status | Exports | Keterangan |
|------|--------|---------|------------|
| `src/utils/logger.ts` | Done | `logger`, `logHttpRequest`, `logHttpResponse` | Winston wrapper, PII redaction, daily rotate file; **Fixed**: Symbol(level) preservation for file transports |
| `src/utils/error.ts` | Done | `AppError`, `ErrorCode`, `isAppError`, `ERROR_STATUS` | 14 error codes |
| `src/utils/response.ts` | Done | `success()`, `paginated()`, `error()`, `noContent()` | Standardized API responses |
| `src/utils/jwt.ts` | Done | `generateToken()`, `generateRefreshToken()`, `verifyToken()`, `verifyRefreshToken()` | Payload tanpa permissions (Opsi B) |
| `src/utils/hash.ts` | Done | `hashPassword()`, `comparePassword()` | bcryptjs cost=12 |
| `src/utils/csrf.ts` | Done | `generateCsrfToken()`, `validateCsrfToken()` | HMAC-SHA256 + timingSafeEqual |
| `src/utils/audit.ts` | Done | `logAudit()` | old_value + new_value + request_id + ip_address |
| `src/utils/parser.ts` | Done | `parseCsv()`, `parseExcel()` | Partial success, error per-row |
| `src/utils/accurate.ts` | Done | `fetchInvoices()` | Axios + 15s timeout + circuit breaker |
| `src/utils/validator.ts` | Done | `validateBody()`, `validateQuery()`, `validateParam()`, `validateDto()`, `paginationSchema`, `metricQuerySchema` | Zod helpers + common schemas |

---

## DB Schema — Not Started

File yang perlu dibuat di `src/db/schema/`:

| Schema File | Status | Depends On |
|-------------|--------|------------|
| `companies.ts` | Not Started | — |
| `users.ts` | Done | — (tidak ada FK langsung, relation via user_roles) |
| `roles.ts` | Not Started | — |
| `permissions.ts` | Not Started | — |
| `user_roles.ts` | Not Started | users, roles |
| `role_permissions.ts` | Not Started | roles, permissions |
| `user_companies.ts` | Not Started | users, companies |
| `product_categories.ts` | Not Started | companies |
| `customers.ts` | Not Started | companies |
| `invoices.ts` | Not Started | companies, customers, import_logs |
| `invoice_items.ts` | Not Started | invoices, product_categories |
| `import_logs.ts` | Not Started | companies, users |
| `import_log_errors.ts` | Not Started | import_logs |
| `metric_cache.ts` | Not Started | companies |
| `audit_logs.ts` | Not Started | users, companies |
| `app_configs.ts` | Not Started | companies |

Setelah semua schema dibuat, jalankan:
```bash
bun run db:generate   # drizzle-kit generate migration
bun run db:migrate    # apply migration ke PostgreSQL
bun run db:seed       # (buat dulu) seed superadmin + roles + permissions
```

---

## Middleware — Not Started

File yang perlu dibuat di `src/middleware/`:

| File | Status | Responsibility |
|------|--------|----------------|
| `csrf.ts` | Not Started | Validate X-CSRF-Token header pada mutations |
| `rate-limit.ts` | Not Started | Per-IP rate limiting |
| `auth.ts` | Not Started | Verify JWT → load permissions dari DB → set c.var.user |
| `company-access.ts` | Not Started | Verify user.companyIds includes requested company_id |
| `permission.ts` | Not Started | requirePermission('resource:action') |

**Catatan penting untuk `auth.ts`:**
- Verify JWT (payload: userId, email, companyIds, isSuperAdmin)
- Query permissions dari DB: `user_roles → role_permissions → permissions`
- Set `c.var.user = { userId, email, companyIds, isSuperAdmin, permissions: string[] }`
- Detail: `shared/architecture.md` → Permission Strategy Decision

---

## Features — Not Started

### Feature: Auth (Priority: HIGH — semua feature lain depend on ini)
| File | Status |
|------|--------|
| `src/features/auth/auth.route.ts` | Not Started |
| `src/features/auth/auth.handler.ts` | Not Started |
| `src/features/auth/auth.service.ts` | Not Started |
| `src/features/auth/auth.repository.ts` | Not Started |

**Endpoints:** POST /auth/login, POST /auth/logout, POST /auth/refresh

### Feature: RBAC (Priority: HIGH)
| File | Status |
|------|--------|
| `src/features/rbac/rbac.route.ts` | Not Started |
| `src/features/rbac/rbac.handler.ts` | Not Started |
| `src/features/rbac/rbac.service.ts` | Not Started |
| `src/features/rbac/rbac.repository.ts` | Not Started |

### Feature: Users (Priority: HIGH) — ~60%
| File | Status |
|------|--------|
| `src/features/users/user.schema.ts` | Done |
| `src/features/users/user.repository.ts` | Done |
| `src/features/users/user.service.ts` | Done |
| `src/features/users/user.route.ts` | Done |

Detail endpoint & implementation notes → `docs-v2/features/users.md`

### Feature: Import (Priority: HIGH — unblock data entry)
| File | Status |
|------|--------|
| `src/features/import/import.route.ts` | Not Started |
| `src/features/import/import.handler.ts` | Not Started |
| `src/features/import/import.service.ts` | Not Started |
| `src/features/import/import.repository.ts` | Not Started |

### Feature: Config (Priority: MEDIUM)
| File | Status |
|------|--------|
| `src/features/config/config.route.ts` | Not Started |
| `src/features/config/config.handler.ts` | Not Started |
| `src/features/config/config.service.ts` | Not Started |
| `src/features/config/config.repository.ts` | Not Started |

### Feature: Metrics (Priority: HIGH — core business value) — ✅ ~98% LIVE (update sesi 32)
| File | Status | Notes |
|------|--------|-------|
| `src/features/metrics/metrics.route.ts` | ✅ Done | Semua endpoint M1-M10 + avg-category (Product Trend) live. Permission per endpoint diperbaiki sesi 32 (lihat Catatan Sesi). |
| `src/features/metrics/metrics.handler.ts` | ✅ Done | Thin handler pattern — validasi + service call |
| `src/features/metrics/metrics.service.ts` | ✅ Done | M1-M2 (Cross Selling), M3-M7 (Customer Metrics), M8-M10 (Dormant), avg-category (Product Trend) |
| `src/features/metrics/metrics.repository.ts` + `repository/*.ts` | ✅ Done | Query kompleks dari invoices + invoice_items + customers, dipecah per-metrik ke `repository/` sejak sesi 26 |
| `src/features/metrics/metrics.schema.ts` | ✅ Done | Zod schemas untuk query params |
| `src/features/metrics/metrics.types.ts` | ✅ Done | Type definitions untuk metrics results |
| `src/features/metrics/segment.helper.ts` | ✅ Done | Helper untuk segmentasi data metrik |
| `src/features/config/threshold.ts` | ✅ Done | Threshold business_configs untuk metrik |

**Semua M1-M10 sudah live dari real DB sejak sesi 26** — baris "masih via MSW mock" di versi lama catatan ini sudah tidak akurat, dibiarkan sempat tertinggal sampai audit sesi 35.

### Feature: Customers (Priority: MEDIUM) — ✅ 100% LIVE
| File | Status |
|------|--------|
| `src/features/customers/customers.route.ts` | ✅ Done |
| `src/features/customers/customers.handler.ts` | ✅ Done |
| `src/features/customers/customers.service.ts` | ✅ Done |
| `src/features/customers/customers.repository.ts` | ✅ Done (329 lines — full CRUD + status logic + division filter) |
| `src/features/customers/customers.schema.ts` | ✅ Done |

### Feature: Products (Priority: MEDIUM) — ✅ Done
| File | Status |
|------|--------|
| `src/features/products/products.route.ts` | ✅ Done |
| `src/features/products/products.handler.ts` | ✅ Done |
| `src/features/products/products.service.ts` | ✅ Done |
| `src/features/products/products.repository.ts` | ✅ Done |
| `src/features/products/accurate-products.service.ts` | ✅ Done (498 lines — Accurate API sync) |

### Feature: Settings (Priority: MEDIUM) — ✅ All Done
- High Margin: CRUD mapping produk/kategori per periode ✅
- Channel Divisions: CRUD mapping channel_name → division ✅
- Classification: CRUD classification rules ✅
- Threshold: Config threshold metrik ✅

### Feature: Transactions (Priority: MEDIUM) — ✅ Done (sesi 26)
GET /invoices + GET /invoices/:id, docs: `features/transactions.md`. Baris "belum dibuat" di versi lama catatan ini sudah tidak akurat.

### Feature: Audit (Priority: LOW) — ✅ Done
Read-only, paginated, filter by action/date

---
## Known Decisions (Architecture)

| Keputusan | Status | Detail |
|-----------|--------|--------|
| Feature-based folder + Router Orchestrator | **Finalized** | `shared/architecture.md` |
| Permission load dari DB per request (bukan JWT) | **Finalized** | `shared/architecture.md` → Permission Strategy |
| JWT payload: `{ userId, email, companyIds, isSuperAdmin }` | **Finalized** | `src/utils/jwt.ts` |
| Audit log wajib old_value + new_value | **Finalized** | `src/utils/audit.ts`, `data-model.md` |
| Accurate API credentials dari app_configs (is_secret=true) | **Finalized** | `src/utils/accurate.ts` |
| PostgreSQL job queue (bukan Redis/RabbitMQ) | **Finalized** | `CRITICAL_RULES.md` |

---

## Next Actions (Priority Order)

```
1. [HIGH]   Auth Feature           — login, logout, refresh + authMiddleware
2. [HIGH]   Middleware             — csrf, rate-limit, auth, company-access, permission
3. [HIGH]   Metrics Feature        — 10 KPI (M1-M10), query berat pakai window functions
4. [MEDIUM] Import: Rollback       — DELETE /import/logs/:id (hapus invoice batch gagal)
5. [MEDIUM] Import: Auth Guard     — pasang authMiddleware di import routes
6. [DONE]   Customers Feature      — list + detail + channel division filter ✅
7. [DONE]   Transactions Feature   — invoice list + detail ✅ (sesi 26)
8. [LOW]    Import Classification  — CRUD endpoint + seed rules
```

---

## Catatan Sesi

### 2026-07-04 (sesi 32 — RBAC Bug Hunt: Permission Deprecated + Scope Fix)

Detail lengkap FE+BE gabungan ada di `CURRENT_STATE.md` § "sesi 32". Ringkasan sisi backend:
- `metrics.route.ts` — 12 endpoint pakai `metrics:view` (permission deprecated, sudah dipindah ke `OLD_PERMISSION_NAMES` sejak sesi 24 tapi routing-nya tidak ikut di-update) → semua role non-superadmin selalu 403. Diganti permission granular per halaman.
- `companies.route.ts` — `GET /` dilonggarkan (tidak wajib `settings.company:view` lagi, cukup authMiddleware) karena `handleGetCompanies` sudah difilter ke `companyIds` JWT.
- `channel-divisions.route.ts` — endpoint baru `GET /values` (nilai divisi unik, tanpa permission) untuk dropdown filter, terpisah dari mapping lengkap yang tetap terproteksi.
- `db/seed.ts` — `seedRoleDefaultPermissions()` baru, dipanggil untuk role `admin` dan `user` dengan daftar permission masing-masing (`ADMIN_PERMISSION_NAMES`, `USER_PERMISSION_NAMES`). Idempotent (skip yang sudah ada), tidak mencabut kustomisasi manual.

### 2026-07-03/04 (sesi 31 — Dockerize + SSL Fix, deploy Railway)

Detail lengkap di `CURRENT_STATE.md` § "sesi 31". Ringkasan sisi backend:
- `backend/Dockerfile` (NEW) — multi-stage, `oven/bun:1`, source `.ts`/`node_modules` tidak ikut image final
- `backend/scripts/build-prod.ts` (NEW) — `Bun.build` + `javascript-obfuscator`, `controlFlowFlattening`/`deadCodeInjection` OFF (beda dari frontend) karena backend jalan di hot path tiap request
- `backend/src/config/db.ts` — SSL Postgres dideteksi dari hostname `DATABASE_URL` (bukan `NODE_ENV`) — migration/seed dari lokal ke DB production butuh SSL walau `NODE_ENV=development`

### 2026-07-04 (sesi 34 — High Margin Settings default filter 'all')

Detail lengkap di `CURRENT_STATE.md` § "sesi 34". Ringkasan sisi backend:
- `high-margin.schema.ts` — `company_id: number|'all'` (default `'all'`)
- `high-margin.handler.ts` — pakai `resolveCompanyScope()` di LIST dan CREATE (CREATE sebelumnya tidak ada validasi company sama sekali)
- `high-margin.repository.ts` — `findHighMargins` terima `scopeIds?: number[]` (bukan `company_id: number` wajib), join `companies` untuk `company_name`

### 2026-07-02 (sesi 26 — Product Trend + Transactions + Dashboard backend)

Detail lengkap ada di `CURRENT_STATE.md` § "2026-07-02 (sesi 26)" (satu log gabungan FE+BE). Ringkasan sisi backend:
- `GET /metrics/avg-category` (Product Trend) — real backend baru, `active_window` default dari `business_configs.active_window_months`
- `GET /invoices` + `GET /invoices/:id` (Transactions) — real backend baru, permission `order:*` → `transaction:*`
- `GET /dashboard` — real backend baru, agregator dari service metrics existing + 1 query baru (`fetchDormantValueTrend`)
- `resolveSegmentParams` di-export dari `metrics.service.ts`

### 2026-06-29 (sesi 25 — requirePermission Middleware)

**`backend/src/middleware/permission.ts` — baru:**
```typescript
export function requirePermission(...keys: string[])
```
- OR logic: user harus punya setidaknya satu dari `keys`
- Superadmin (`isSuperAdmin=true`) selalu bypass — tidak cek permissions
- Throw `AppError(FORBIDDEN, 403)` jika permission tidak mencukupi
- Dipasang SETELAH `authMiddleware` — butuh `c.var.user` + `c.var.permissions`

**Pemetaan permission per route (13 file diupdate):**

| Route | Permission yang dipasang |
|-------|--------------------------|
| `users.route.ts` | `access.user:view/create/update/delete` |
| `companies.route.ts` | `settings.company:view/create/update/delete`, `settings.branch:view/create/update/delete` |
| `roles.route.ts` | `access.role:view/create/update/delete`, `access.permission:view` |
| `permissions.route.ts` | `access.permission:view/update` |
| `audit.route.ts` | `audit.log:view` |
| `customers.route.ts` | `customer:view` |
| `metrics.route.ts` | `metrics:view` |
| `import.route.ts` | `config.import:import` (POST), `config.import:view` (GET) |
| `classification.route.ts` | `config.classification:view/create/update/delete` |
| `config.route.ts` | `settings.threshold:view/update`, `config.integration:view/create/update/test` |
| `high-margin.route.ts` | `settings.product:view/create/update/delete` |
| `channel-divisions.route.ts` | `settings.channel.division:view/create/update/delete` |
| `products.route.ts` | `settings.product:view` (local), `config.integration:view` (Accurate) |

`page.route.ts` tidak dipasang permission — dipakai app sendiri untuk routing internal.

**Verified (manual test):**
- Tanpa token → `401 UNAUTHORIZED` ✅
- User tanpa permission → `403 FORBIDDEN` ✅
- Superadmin → 200 bypass ✅

**File yang berubah:**
- `backend/src/middleware/permission.ts` — NEW
- 13 route files — ditambah `requirePermission` per endpoint

---

### 2026-06-29 (sesi 24 — inArray Empty Guard + Permission Seed Overhaul + DB Drop/Re-seed)

**DB Drop + Re-seed:**
- Drop schema `public` + `drizzle`, lalu `bun run db:migrate` + `bun run db:seed`
- Semua business data hilang (customers, invoices, products) — user re-import via Import page
- Lesson learned: harus drop kedua schema (`public` dan `drizzle`) agar migrate tidak skip

**Seed — 88 Permissions (dari 57):**
- `cleanupOldPermissions()` ditambahkan ke seed untuk hapus keys lama sebelum insert baru
- Format baru: dot-notation `module.submodule:action` (contoh: `settings.company:create`, `audit.log:export`)
- 24 kategori granular — setiap halaman punya category sendiri di RBAC UI
- Source of truth: `backend/src/db/seed.ts` → `defaultPermissions`

**`inArray` Empty Array Fix (4 repository):**
- drizzle-orm melempar `"inArray requires at least one value"` jika array kosong
- Terjadi saat non-superadmin user belum punya company assigned → `scopeIds = []`
- `companies.repository.ts`: `if (companyIds !== undefined && companyIds.length === 0) return []`
- `customers.repository.ts`: `if (scopeIds.length === 0) return { data: [], total: 0 }`
- `import.repository.ts`: ternary guard `scopeIds && scopeIds.length > 0 ? inArray(...) : undefined`
- `audit.repository.ts`: `else if (scopeIds && scopeIds.length > 0) conditions.push(...)`

**File yang berubah:**
- `backend/src/db/seed.ts` — 88 permissions, 24 categories, dot-notation, cleanupOldPermissions()
- `backend/src/features/companies/companies.repository.ts` — inArray empty guard
- `backend/src/features/customers/customers.repository.ts` — inArray empty guard
- `backend/src/features/import/import.repository.ts` — inArray empty guard
- `backend/src/features/audit/audit.repository.ts` — inArray empty guard

---

### 2026-06-29 (sesi 10 — Permission Granular + Sidebar Smart Groups + M7 Color Fix)

**Permission Sub-page Granular:**
- Sebelumnya: semua sub-page Customer (Expansion, Dormant, Cross Selling) berbagi `customers:menu`
- Fix: tiap sub-page punya `permissionKey` sendiri
- 11 permission baru ditambahkan ke seed.ts + sudah ada di DB:
  - `customers-expansion:menu/view`, `dormant-customer:menu/view`, `cross-selling:menu/view`
  - `products-high-margin:menu/view`, `products-trend:menu/view`, `projects:menu/view`
- `frontend/src/config/menu.tsx` — tiap item pakai permissionKey yang spesifik
- `frontend/src/route/routeConstants.tsx` — route guard pakai `<key>:view` yang spesifik

**Sidebar Smart Group Visibility:**
- Problem: Divider + label group ("Admin", "Customer Workbench") ter-render ke DOM meski semua menu di group tersebut tidak visible
- Fix: Refactor `Sidebar.tsx` — pre-group `NAV_ITEMS` menjadi sections via `buildNavSections()`
- `isNavItemVisible(item, canSee)` — cek visibility item + children sebelum render
- Jika `hasVisible === false` di suatu section → `return null` — tidak ada DOM trace sama sekali
- Jika `settings:menu` tidak visible tapi `config:menu` visible → section "Admin" tetap muncul (look-ahead handled oleh pre-grouping)

**M7 Expansion Chart — Color Fix:**
- `flat_down_rate` bar: ganti dari `grey[400]` → `action.disabledBackground` (pola M5/M6 untuk segmen inaktif)
- `BarSeries` interface: tambah field opsional `labelColor?: string`
- `BarChartWidget`: render `s.labelColor ?? getContrastText(s.color)` untuk teks label
- M7: `labelColor: theme.palette.text.primary` untuk `flat_down_rate` (karena `action.disabledBackground` semi-transparan)

**companyIds Fresh dari DB:**
- `authMiddleware` membaca `companyIds` dari DB setiap request (bukan dari JWT yang bisa stale)
- `getUserCompanyIds()` di `auth.repository.ts` — dipanggil parallel dengan `getUserPermissions()`

**Race Condition Fix (RBAC):**
- `App.tsx`: tambah `synced` state — block route render sampai `syncUser()` selesai dipanggil
- Sebelumnya: `ProtectedRoute` cek permissions dari localStorage stale sebelum `/me` response tiba → redirect ke `/403`

**Halaman 403:**
- `frontend/src/pages/Forbidden/index.tsx` dibuat — lock icon + pesan + tombol kembali ke Dashboard
- Route `/403` ditambahkan di `App.tsx`

**File yang berubah:**
- `frontend/src/config/menu.tsx` — permissionKey granular per item
- `frontend/src/route/routeConstants.tsx` — permissionKey granular per route
- `frontend/src/components/ui/Sidebar/Sidebar.tsx` — smart group visibility
- `frontend/src/components/charts/BarChartWidget/BarChartWidget.tsx` — labelColor support
- `frontend/src/pages/CustomerMetrics/M7Expansion.tsx` — action.disabledBackground + labelColor
- `frontend/src/pages/Forbidden/index.tsx` — NEW
- `frontend/src/App.tsx` — synced state + /403 route
- `backend/src/middleware/auth.ts` — companyIds fresh dari DB
- `backend/src/db/seed.ts` — 11 permission baru + channel_divisions 25 entries

---

### 2026-06-27 (sesi 9 — Channel Division + Rename salesperson_name → channel_name)

**Rename DB column:**
- `invoices.salesperson_name` → `channel_name` (varchar 255)
- `channel_divisions.salesperson_name` → `channel_name` (varchar 255)
- Migration file: `0004_rename_salesperson_to_channel_name.sql` — TIDAK dieksekusi drizzle-kit, dijalankan manual via postgres.js
- **LESSON LEARNED**: `drizzle-kit migrate` tidak menjalankan hand-written SQL — lihat CRITICAL_RULES.md

**Customers Repository — Division Filter Fix:**
- Sebelumnya: `eq(customers.business_unit, business_unit)` → 0 results (semua null)
- Fix: `eq(channel_divisions.division, business_unit)` via LEFT JOIN pada `channel_name`
- JOIN `channel_divisions` ditambah ke COUNT query juga (tidak hanya main SELECT)
- Subquery `latest_sp` menggunakan `selectDistinctOn([invoices.customer_id])` untuk ambil `channel_name` dari invoice terbaru per customer
- Verified working: `distribution` → 225, `intercompany` → 2

**Customers Detail — channel field:**
- `findCustomerDetail()` returns `channel: invoices.channel_name` (nama asli) + `division: channel_divisions.division`

**Import Service + Parser — channel_name:**
- `parser.ts`: `InvoiceRow.channel_name`, header key `channel_name` (label "Nama Tenaga Penjual")
- `import.service.ts`: `channel_name: row.channel_name` di 2 tempat
- `import.repository.ts`: `upsertCustomer` lookup via `channel_name`

**Perubahan file backend:**
- `backend/src/db/schema/invoices.ts` — UPDATED (salesperson_name → channel_name)
- `backend/src/db/schema/channel_divisions.ts` — UPDATED (salesperson_name → channel_name)
- `backend/src/db/migrations/0004_rename_salesperson_to_channel_name.sql` — NEW (manual execution only)
- `backend/src/features/customers/customers.repository.ts` — UPDATED (channel_name, division filter)
- `backend/src/features/import/import.repository.ts` — UPDATED (channel_name)
- `backend/src/features/import/import.service.ts` — UPDATED (channel_name)
- `backend/src/utils/parser.ts` — UPDATED (channel_name)

---

### 2026-06-26 (sesi 8 — Import SSE Streaming + Template Validation + Migration Konsolidasi)

**Parser — dynamic header + protect import:**
- `detectExcelHeaders()`: scan 10 baris pertama, cari baris yang punya "Tanggal" AND "Sales Invoice"
- `validateExcelHeaders()`: 2-stage — required columns MUST exist, unknown columns REJECTED
- `REQUIRED_EXCEL_HEADERS` (9 kolom), `OPTIONAL_EXCEL_HEADERS` (branch_name, salesperson)
- Menolak template salah dengan pesan error spesifik kolom yang hilang / tidak dikenal

**Schema + Migration:**
- `invoices.ts`: tambah `branch_name varchar(255)` nullable
- Konsolidasi migrasi: hapus semua ALTER TABLE terpisah (0003, 0004, 0006), embed ke CREATE TABLE
- 3 file final: `0001_auth_system.sql`, `0002_branches_credentials.sql`, `0003_transactions_import.sql`
- `business_configs` yang hilang ditemukan dan ditambahkan ke `0001_auth_system.sql`
- DB di-reset dan re-migrate dengan struktur bersih

**Import Service:**
- `onProgress` callback di `ImportFileOptions` — dipanggil setiap baris selesai diproses
- Status awal log: `'failed'` (bukan `'partial'`) — pessimistic init
- `salesperson_name` dan `branch_name` disimpan ke `invoices` table

**SSE Streaming (endpoint baru):**
- `handleImportFileStream` di `import.handler.ts` pakai Hono `streamSSE`
- Emit `progress` event setiap baris, `done` event di akhir, `error` event jika gagal
- Route: `POST /api/v1/import/csv/stream`
- Endpoint lama `POST /csv` tetap ada (one-shot response, tidak dihapus)

**Perubahan file:**
- `backend/src/utils/parser.ts` — UPDATED (dynamic header, template validation, branch_name/salesperson)
- `backend/src/db/schema/invoices.ts` — UPDATED (+branch_name)
- `backend/src/db/migrations/0001_auth_system.sql` — UPDATED (+business_configs)
- `backend/src/db/migrations/0003_transactions_import.sql` — UPDATED (+branch_name di invoices CREATE TABLE)
- `backend/src/db/migrations/meta/_journal.json` — REBUILT (3 entries)
- `backend/src/features/import/import.service.ts` — UPDATED (onProgress, pessimistic status, branch_name)
- `backend/src/features/import/import.handler.ts` — UPDATED (+handleImportFileStream)
- `backend/src/features/import/import.route.ts` — UPDATED (+POST /csv/stream)

---

### 2026-06-25 (sesi 7 — Import Feature Fixes + Handler Pattern Refactor)

**Import Parser — 4 bug diperbaiki:**
- `EXCEL_COL` indices semua salah: Accurate export pakai merged cells, setiap kolom diikuti 1 cell kosong. Indeks yang benar: INVOICE_NO=3, CUSTOMER_NAME=5, CATEGORY=9, ITEM_NAME=11, QUANTITY=13, UNIT_PRICE=15, REVENUE=17, GROSS_PROFIT=21
- Format tanggal: Accurate kirim "DD MMM YYYY" (e.g. "02 Jun 2026"), bukan YYYY-MM-DD. Tambah `MONTH_MAP` + regex
- Numeric parsing: `.replace(/\./g,'')` menghapus titik desimal. Format Accurate: koma=ribuan, titik akhir=integer tanpa desimal. Fix: `.replace(/,/g,'').replace(/\.$/,'')`
- Field baru di `InvoiceRow`: `item_name?`, `quantity?`, `unit_price?` dari kolom Nama Barang/Kuantitas/@Harga

**Import Service — 2 bug diperbaiki:**
- Multi-item invoice: `batchInvoiceCache: Map<invoiceNumber, invoiceId>` — invoice di-cache per batch. Baris ke-2+ dengan invoice sama langsung `createInvoiceItem` tanpa buat invoice baru
- Empty file: guard `rows=0 && errors=0` → throw `AppError(INVALID_FILE_FORMAT)`

**Import Repository — 1 bug diperbaiki:**
- `findImportLogs`: LEFT JOIN ke `companies` dan `users` — return `{company: {id,name}, imported_by: {id,name}}`

**Frontend ImportLogsTable — 1 bug diperbaiki:**
- Crash `log.company.name` → fix dengan `log.company?.name ?? '—'`

**Handler Pattern — semua fitur dimigrasikan:**
- 8 handler baru: audit, page, roles, permissions, users, products, config, companies
- Pola: `try/catch` per handler, `AppError` di-rethrow, unexpected error di-wrap dengan `ErrorCode` kontekstual
- Route files sekarang hanya register handler (2-10 baris)
- `config.handler.ts`: logger dipertahankan di `handleSaveAccurateCredentials` untuk 5xx error tracking

**Perubahan file:**
- `backend/src/utils/parser.ts` — UPDATED
- `backend/src/features/import/import.service.ts` — UPDATED
- `backend/src/features/import/import.repository.ts` — UPDATED
- `frontend/src/pages/Import/components/ImportLogsTable.tsx` — UPDATED
- 8 handler files baru di masing-masing feature folder
- 8 route files — UPDATED (delegate ke handler)

### 2026-06-25 (sesi 6 — Backend Import Feature: Schema + Classification Engine + CSV Import API)

**Phase 1 — Schema Database (7 file baru):**
- `product_categories.ts` — item_type (unit|consumable|sparepart|service), avg_margin_percent, is_high_margin
- `customers.ts` — customer_code nullable, business_unit, first/last_invoice_date
- `invoices.ts` — header faktur, UNIQUE (invoice_number, company_id), soft delete
- `invoice_items.ts` — line items, quantity, unit_price, revenue, gross_profit
- `import_logs.ts` — riwayat import, status partial/success/failed
- `import_log_errors.ts` — detail error per baris import
- `item_classification_rules.ts` — aturan klasifikasi 4-layer per company
- `schema/index.ts` — uncomment semua export baru

**Phase 2 — Classification Engine (utils/classifier.ts):**
- Layer 1: 22 keyword rules (CARTRIDGE→consumable, PRINTER→unit, SERVICE→service)
- Layer 2: Price range heuristic (>=500k→unit, 50k-499k→consumable, <50k→sparepart)
- Layer 3: DB lookup ke `item_classification_rules` with priority
- Layer 4: Fallback ke 'unit' + needs_review=true
- Export `classifyItemType()` dan `classifyItemTypeSync()`

**Phase 3 — Import Repository (import.repository.ts):**
- `upsertCustomer()` — lookup UPPER name + company_id, auto update dates
- `upsertProductCategory()` — lookup UPPER name + company_id, create if not exists
- `findInvoiceByNumber()` — dedup check UPPER invoice_number
- `createInvoice()` / `createInvoiceItem()` / `updateInvoiceTotals()`
- Logs: `createImportLog()`, `findImportLogs()`, `findImportErrors()`
- Rules: `findClassificationRules()`, CRUD operations

**Phase 4 — Import Service & API (import.service.ts + handler + route):**
- `POST /api/v1/import/csv` — multipart upload CSV/Excel, parse, classify, upsert, store
- `GET /api/v1/import/logs` — paginated import history
- `GET /api/v1/import/logs/:id` — detail + errors
- Validasi: MIME type, file size 10MB, partial success, UPPERCASE normalization

**Route Registration:**
- `router.ts` — import route mounted at `/api/v1/import`

**Status: Feature Import dari 0% → ~70%** (backend siap, tinggal migration apply + seed rules + testing)

### 2026-06-24 (sesi 5 — Logger & Schema Fixes)
- **Logger Root Cause FIXED**: Winston `redactFormat` menggunakan `Object.fromEntries()` yang menghilangkan Symbol properties
  - Root cause: Plain object baru tidak preserve Symbol(level) milik Winston
  - Solution: Mutate object in-place agar Symbol properties tetap ada
  - Hasil: Log file kini berfungsi (error.log & warn.log dengan daily rotate)
- **Error Logging Added**: Try-catch di `PUT /config/accurate/credentials/:branchId`
  - Hanya log 5xx errors ke file (bukan 4xx AppError yang expected/operational)
  - Error 5xx sekarang tercatat dengan stack trace di `backend/log/error/YYYY-MM-DD.log`
- **Database Schema Updated**: accurate_credentials token columns
  - Problem: Accurate API token sangat panjang (JWT multi-part) + AES-256-GCM encryption → overflow varchar(500)
  - Solution: `api_token`, `signature_secret`, `client_secret`, `access_token`, `refresh_token` dari varchar → text
  - Migration: `0004_accurate_credentials_text.sql` generated (status: pending apply dengan `make db-migrate`)
- Test verified: Error handling pipeline complete — validation → error log → file persistence ✅

### 2026-06-23 (sesi 4)
- Dokumentasi backend diupdate berdasarkan kondisi aktual kode
- Tambah `docs-v2/features/audit.md` — feature audit sudah selesai tapi belum ada docs
- Update `CURRENT_STATE_BACKEND.md` — status banyak yang sudah Done tapi belum dicatat
- Fitur aktif di router: users, page, companies, roles, permissions, config, audit
- Fitur belum dibuat: auth, import, metrics, customers, products, transactions
- `make check` frontend: lint + TypeScript errors diperbaiki (3 error, 0 warning tersisa)

### 2026-06-21 (sesi 2 Backend)
- **users schema**: Buat `src/db/schema/users.ts` dengan Drizzle ORM
  - Kolom: id, name, email (unique), password, is_active, created_at, updated_at, deleted_at (soft delete)
  - Tipe: serial PK, varchar, boolean, timestamp withTimezone
  - Ekspor: `User` (select) dan `NewUser` (insert) types
- **Barrel export**: Update `src/db/schema/index.ts` — uncomment export untuk users
- Status: `DB Schema` dari 0% → ~6%

### 2026-06-20 (sesi 1 Backend)
- Setup project: Bun v1.3.14, bun-types, tsconfig (paths alias `@/*`)
- Folder structure: feature-based + Router Orchestrator
- Config: `env.ts` (Zod), `db.ts` (Drizzle + postgres-js)
- Router: `index.ts` (bootstrap) + `router.ts` (stub dengan /health endpoint)
- Utils: 10 utils dibuat (logger, error, response, jwt, hash, csrf, audit, parser, accurate, validator)
- Architecture decisions dicatat: permission Opsi B (DB per request), audit old/new value
- `data-model.md` diupdate: audit_logs tambah `old_value`, `new_value`, `company_id`, `request_id`
- Server running: `GET /health` → 200 OK
