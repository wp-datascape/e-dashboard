# CURRENT_STATE_BACKEND.md — Status Backend

> File ini khusus untuk tracking progress backend.
> Update setiap akhir sesi kerja backend.
> Last updated: 2026-06-25

---

## Overall Backend Progress

| Layer            | Status  | Notes                                      |
|------------------|---------|--------------------------------------------|
| Project Setup    | Done    | Bun, tsconfig, bun-types, .env             |
| Folder Structure | Done    | Feature-based + Router Orchestrator        |
| Config           | Done    | env.ts (Zod), db.ts (Drizzle)              |
| Utils            | Done    | 10 utils siap pakai (logger: Winston + PII redaction fixed) |
| Middleware       | Partial | requestId.ts + requestLogger.ts dibuat; csrf/auth/permission belum |
| DB Schema        | Done    | 19 tabel aktif, migrations applied, import data real sudah masuk |
| DB Migration     | Done    | 0000-0005 applied                          |
| DB Seed          | Done    | seed.ts dibuat                             |
| Handler Pattern  | Done    | Semua fitur punya handler.ts terpisah dengan error handling |
| Feature: Auth    | 0%      | Belum dibuat, router.ts masih commented    |
| Feature: RBAC    | Done    | roles + permissions mounted                |
| Feature: Users   | Done    | CRUD + handler — docs: `features/users.md`   |
| Feature: Companies | Done  | CRUD + branches + handler — docs: `features/companies.md` |
| Feature: Roles   | Done    | CRUD + permissions + handler — docs: `features/roles.md` |
| Feature: Permissions | Done | CRUD + assign + handler — docs: `features/permissions.md` |
| Feature: Config  | Done    | GET + PUT + Accurate credentials + handler — docs: `features/config-page.md` |
| Feature: Page    | Done    | GET + PUT + handler — docs: `features/page-settings.md` |
| Feature: Audit   | Done    | list + detail + handler — docs: `features/audit.md` |
| Feature: Products | Done   | GET categories + products dari Accurate API + handler |
| Feature: Import  | ~90%    | File upload Excel/CSV selesai + tested. Sisa: auth guard, rollback endpoint |
| Feature: Metrics | 0%      | Belum dibuat                               |
| Feature: Customers | 0%    | Belum dibuat                               |
| Feature: Transactions | 0%  | Belum dibuat                              |

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

### Feature: Metrics (Priority: HIGH — core business value)
| File | Status |
|------|--------|
| `src/features/metrics/metrics.route.ts` | Not Started |
| `src/features/metrics/metrics.handler.ts` | Not Started |
| `src/features/metrics/metrics.service.ts` | Not Started — 10 KPI logic |
| `src/features/metrics/metrics.repository.ts` | Not Started |

### Feature: Customers (Priority: MEDIUM)
### Feature: Products (Priority: MEDIUM)
### Feature: Transactions (Priority: MEDIUM)
### Feature: Audit (Priority: LOW)

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
6. [MEDIUM] Customers Feature      — list + detail, auto dari import
7. [MEDIUM] Transactions Feature   — invoice list + detail
8. [LOW]    Import Classification  — CRUD endpoint + seed rules
```

---

## Catatan Sesi

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
