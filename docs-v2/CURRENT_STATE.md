# CURRENT_STATE.md — Status Pengerjaan

> Update file ini setiap sesi kerja selesai.

## Overall Progress
| Layer    | Status | Notes                          |
|----------|--------|--------------------------------|
| Frontend | ~96%   | Customer page real API (bukan mock). Modal detail responsive. Debounce + page reset filter. |
| Backend  | ~72%   | Customers feature selesai. Threshold dari business_configs (per-BU dormant + active_window). Auth, Metrics, Transactions belum. |
| Database | ~80%   | 21 tabel aktif. business_configs dipakai live oleh customers status logic. |
| Docs     | ~98%   | Updated sesi ini |

## Frontend — Page Status

### Done
| Page             | Route               | Notes                        |
|------------------|---------------------|------------------------------|
| Dashboard        | `/dashboard`        | 10 MetricCards + 9 charts    |
| Cross Selling    | `/cross-selling`    | M1 ratio + M1.1 heatmap + M2 |
| Customer Metrics | `/customer-metrics` | M3 M4 M5 M6 M7               |
| Dormant Customer | `/dormant-customer` | M8 M9 M10                    |
| Config           | `/config`           | 3 tabs: Business Rules, Integration, App Settings (theme + lang) |
| Users            | `/users`            | List + create + edit user, mock API |
| RBAC             | `/rbac`             | Role list, permission matrix, set permissions dialog, 35 permissions seeded |
| Import           | `/import`           | Form upload/Accurate + riwayat log + error detail dialog, mock API |
| Customer         | `/customers`        | DataGrid + detail modal (responsive) + ComboChart trend, **real API** |
| Products         | `/products`         | Category Performance Ledger — DataGrid kategori, revenue, GP, margin |
| High Margin      | `/products/high-margin` | 2 tabs: Category Penetration + Upsell Targets, mock API |
| Product Trend    | `/products/trend`   | M2 AreaChartWidget + KPI cards (current/prev avg + % change) |
| Order Ledger     | `/orders`           | DataGrid invoice + BU filter + detail drawer, mock API |
| Audit Log        | `/audit-log`        | DataGrid audit trail + filter action/date, custom mobile card, mock API |
| Companies        | `/companies`        | DataGrid + CRUD + branch management, mock API |
| High Margin Settings | `/settings/high-margin` | CRUD mapping produk/kategori per periode, combobox searchable, backend real API |

### Partial / Needs Refactor
| Page             | Issue                                           |
|------------------|-------------------------------------------------|
| Customer Metrics | Split into: 2.2 Expansion + 3.2 High Margin     |

### Not Built
| Page                        | Group | Priority |
|-----------------------------|-------|----------|
| Customer 360 & Segmentation | 2.1   | High     |
| Expansion & Upsell Targets  | 2.2   | High (split dari CustomerMetrics) |
| Product Performance Ledger  | 3.1   | Done — category-level (blocked for SKU detail, see decisions.md) |
| High Margin Push List       | 3.2   | Done |
| Product Trend & Velocity    | 3.3   | Done |
| Dormant Product / Dead Stock| 3.4   | Blocked (scope belum final) |
| B2B DC & B2C Order Ledger   | 4.1   | Done     |
| B2B Project Milestone       | 4.2   | Low* (open decision: MVP or v2) |
| Repeat Order & Loyalty      | 4.3   | Medium (reuse M6 chart)   |
| Import UI                   | 5.1   | High     |
| Users Management            | 5.2   | High     |
| RBAC Management             | 5.3   | High     |
| Config UI                   | 5.4   | Medium   |
| Audit Log Viewer            | 5.5   | ~~Done~~ |
| Companies Management        | 5.6   | ~~Done~~ |

*4.2 B2B Project: high complexity — konfirmasi dulu apakah masuk MVP sebelum mulai

## Frontend — Components Available (Reusable)
| Component          | Type                        | Used in              |
|--------------------|-----------------------------|----------------------|
| `Card`             | Atomic flat card (Paper wrapper) | Semua halaman — single source of truth styling card |
| `Button`           | MUI Button + `isLoading` + `mobileIconOnly` props | Semua halaman — header action buttons |
| `StatusChip`       | Oval outlined chip (6 warna) | Semua halaman — satu-satunya chip yang boleh dipakai |
| `ActionMenu`       | Dropdown menu (StyledMenu + KeyboardArrowDownIcon) | Semua tabel — action column |
| `ComboInput`       | MUI Autocomplete searchable grouped | HighMargin dialog — target picker |
| `StatCard`         | Simple line (no axes)       | Dashboard M1-M10     |
| `AreaChartWidget`  | Multi-series area           | M2                   |
| `BarChartWidget`   | Grouped/stacked/horizontal  | M1 M4 M7 M9          |
| `HeatmapWidget`    | CSS grid matrix             | M1.1                 |
| `ComboChartWidget` | Bar+Line dual-Y             | M3                   |
| `DonutChartWidget` | Pie with innerRadius        | M5                   |
| `RadialBarWidget`  | Ring progress               | M6                   |
| `LineAlertWidget`  | Line + ReferenceArea        | M8                   |
| `BulletChartWidget`| Custom CSS bullet           | M10                  |
| `ProgressBar`      | Segmented progress bar (success/error/loading shimmer) | Import page |
| `ResponsiveListView` | Responsive table (desktop DataGrid / mobile card list) | Semua halaman tabel |
| `DataTable` (removed) | — | Digantikan oleh `ResponsiveListView` |

## Backend — Status

| Feature          | Status | Notes |
|------------------|--------|-------|
| DB Schema        | ✅ Done | 21 tabel, migration konsolidasi |
| Import           | ✅ ~95% | CSV/Excel + Accurate API, streaming progress |
| Settings High Margin | ✅ 100% | CRUD + active_only filter fix |
| Config (business_configs) | ✅ 100% | GET + PUT, dipakai customers status logic |
| Audit Log        | ✅ 100% | Read-only, paginated |
| Users            | ✅ 100% | CRUD + password hash |
| RBAC             | ✅ 100% | Roles + permissions |
| Companies        | ✅ 100% | CRUD + branches |
| Products         | ✅ 100% | Local + Accurate sync |
| **Customers**    | ✅ **100%** | **GET / + GET /:id, status dari business_configs** |
| Auth             | ❌ Todo | JWT + CSRF |
| Metrics (M1-M10) | ❌ Todo | Kalkulasi + cache |
| Transactions     | ❌ Todo | Invoice ledger |

## Docs v2 — Status (SELESAI 2026-06-18)
| File | Status |
|------|--------|
| CLAUDE.md | Done |
| CRITICAL_RULES.md | Done |
| CURRENT_STATE.md | Done (file ini) |
| shared/architecture.md | Done |
| shared/data-model.md | Done |
| shared/api-conventions.md | Done |
| shared/ui-patterns.md | Done |
| executive-dashboard/overview.md | Done |
| executive-dashboard/metrics.md | Done |
| executive-dashboard/api.md | Done |
| executive-dashboard/decisions.md | Done |
| customer-workbench/overview.md | Done |
| customer-workbench/api.md | Done |
| customer-workbench/decisions.md | Done |
| product-workbench/overview.md | Done |
| product-workbench/api.md | Done |
| product-workbench/decisions.md | Done |
| transaction-workbench/overview.md | Done |
| transaction-workbench/api.md | Done |
| transaction-workbench/decisions.md | Done |
| admin/overview.md | Done |
| admin/api.md | Done |
| admin/decisions.md | Done |

## Current MSW Mock Domains (DEV)
- `auth` — login, logout, refresh, /me
- `dashboard` — metrics summary
- `metrics` — per-metric endpoints
- `products` — category performance, high margin detail, upsell targets, avg-category trend
- `transactions` — invoice list, invoice detail

**Disabled (real backend):** `page`, `customers`, `users`, `rbac`, `import`, `audit`, `accurate`

## Known Blockers / Decisions Pending
| Blocker                              | Owner    | Status  | Detail |
|--------------------------------------|----------|---------|--------|
| `business_unit` field di customers   | Dev      | Todo    | Blocker untuk 2.1, 4.1 BU filter |
| `products` master table              | Dev      | ✅ Done | Diisi import parser dari kolom Nama Barang faktur. ID sistem, bukan Accurate. |
| `projects` table (B2B Project BU)    | PM/Dev   | Pending | 4.2 masuk MVP atau v2? |
| Split CustomerMetrics: alokasi kolom | Dev      | Todo    | customer-workbench/decisions.md #1 |
| Scope 3.3: M2 saja atau agregasi baru| Dev      | Todo    | product-workbench/decisions.md #2 |
| Scope 3.4: "kategori dormant" bukan "dead stock" | PM | Pending | product-workbench/decisions.md #3 |
| Accurate API key: per-company vs global | PM    | Pending | admin/decisions.md #1 |
| Import preview step (Opsi A vs B)    | PM/Dev   | Pending | admin/decisions.md #3 |
| Audit log permission: roles:manage atau audit:read | PM | Pending | admin/decisions.md #2 |

## Next Actions (Priority Order)
1. Build Auth + RBAC backend (JWT + CSRF) — unblock semua protected route
2. Build Metrics backend (M1-M10) — kalkulasi + metric_cache
3. Build Transactions backend — invoice ledger endpoint
4. Split CustomerMetrics → 2.2 Expansion + 3.2 High Margin
5. Konfirmasi keputusan terbuka di tabel blocker bersama PM/stakeholder

## Page → New Structure Mapping
| Current Page     | New Location              | Action          |
|------------------|---------------------------|-----------------|
| Dashboard        | Group 1.1 Overview        | Add BU filter   |
| CrossSelling     | Group 2.4 Cross-sell Matrix | Keep as-is    |
| CustomerMetrics  | Group 2.2 + Group 3.2     | Split into 2    |
| DormantCustomer  | Group 2.3 Churn Risk      | Keep as-is      |
| Import           | Group 5.1                 | Build UI        |
| Users            | Group 5.2                 | Build UI        |
| RBAC             | Group 5.3                 | Build UI        |
| Config           | Group 5.4                 | Build UI        |
| AuditLog         | Group 5.5                 | Build UI        |

## Catatan Sesi Terakhir

### 2026-06-26 (sesi 20): Backend Customers Feature + Customer Status dari business_configs

**Backend customers — dibangun dari nol:**
- `backend/src/features/customers/customers.schema.ts` — `customersQuerySchema` (company_id, search, status, business_unit, sort_by, sort_dir, page, per_page, as_of_date)
- `backend/src/features/customers/customers.repository.ts` — `findCustomers()` + `findCustomerDetail()` dengan Drizzle GROUP BY + aggregate
- `backend/src/features/customers/customers.handler.ts` — `handleGetCustomers`, `handleGetCustomerDetail`
- `backend/src/features/customers/customers.route.ts` — `GET /`, `GET /:id`
- `backend/src/router.ts` — uncomment + mount `app.route('/api/v1/customers', customersRoutes)`

**Status customer — logika + sumber config:**
- `new` = `last_invoice_date IS NULL` ATAU `first_invoice_date >= CURRENT_DATE - active_window_months * '1 month'`
- `dormant` = `last_invoice_date < CURRENT_DATE - dormant_threshold_months.{bu} * '1 month'` (per BU, dari business_configs)
- `active` = `last_invoice_date >= CURRENT_DATE - active_window_months * '1 month'` (dari business_configs)
- `existing` = semua yang tidak masuk ketiganya
- Status filter memakai WHERE condition langsung (bukan HAVING) — lebih efisien + konsisten
- Fix bug Drizzle: parameter integer di CASE THEN perlu `::int` cast agar tidak dianggap text (`text * interval` error)

**Config live:** ubah `active_window_months` di halaman Threshold → status customer berubah langsung tanpa deploy

**Frontend — Rename Customer 360 → Customer:**
- `frontend/src/types/customers.ts` — `CustomerRow`, `CustomerDetail`, `CustomerParams` (+ deprecated aliases Customer360*)
- `frontend/src/api/customers.api.ts` — `getCustomers()`, `getCustomerDetail()`, endpoint `/customers` + `/customers/:id`
- `frontend/src/hooks/useCustomers.ts` — `useCustomers`, `useCustomerDetail` (+ deprecated aliases)
- `frontend/src/pages/Customers/index.tsx` — import baru, tambah status `existing` ke filter dropdown
- `frontend/src/pages/Customers/components/StatusChip.tsx` — tambah `existing: 'warning'`
- `frontend/src/i18n/locales/id.json` + `en.json` — `nav.customers = "Customer"`, tambah `statusLabels.existing`
- `frontend/src/mocks/handlers.ts` — `customersHandlers` disabled (real backend)

**Frontend — CustomerDetailModal (Drawer → Dialog responsif):**
- `CustomerDetailDrawer.tsx` digantikan `CustomerDetailModal.tsx`
- `useMediaQuery(theme.breakpoints.down('sm'))` → fullscreen di mobile, modal `maxWidth="md"` di desktop
- Layout metrik: `grid` 2 kolom (lebih rapi dari flex)
- Title modal = nama customer

**Frontend — Filter UX Fix:**
- Debounce search 300ms (`useEffect` + `debouncedSearch` state)
- Reset ke halaman 1 otomatis setiap kali search/status/BU filter berubah (fix: user di halaman 2+ search → hasil kosong)

**Perubahan file:**
- `backend/src/features/customers/` — 4 file baru (schema, repository, handler, route)
- `backend/src/router.ts` — UPDATED (customers route aktif)
- `frontend/src/types/customers.ts` — UPDATED
- `frontend/src/api/customers.api.ts` — UPDATED
- `frontend/src/hooks/useCustomers.ts` — UPDATED
- `frontend/src/pages/Customers/index.tsx` — UPDATED
- `frontend/src/pages/Customers/components/StatusChip.tsx` — UPDATED
- `frontend/src/pages/Customers/components/CustomerDetailModal.tsx` — NEW
- `frontend/src/mocks/handlers.ts` — UPDATED (customers disabled)
- `frontend/src/i18n/locales/id.json` + `en.json` — UPDATED

---

### 2026-06-26 (sesi 18 & 19): UI Polish — ActionMenu, mobileIconOnly, StatusChip Enforcement, Responsif Mobile

**ActionMenu — Atomic Component Baru:**
- Lokasi: `src/components/ui/ActionMenu/index.tsx`
- Wrap MUI `StyledMenu` + `KeyboardArrowDownIcon` button menjadi satu komponen reusable
- Props: `items: ActionMenuItemDef[]` — setiap item support `label`, `icon`, `onClick`, `color`, `dividerBefore`, `hidden`, `disabled`
- Self-contained `anchorEl` state
- Diterapkan ke semua tabel action column: Users, Companies, HighMargin, Classification, BranchSection

**Button — `mobileIconOnly` Prop:**
- CSS-only responsive: `.btn-label { display: { xs: 'none', sm: 'inline' } }`
- Pada mobile: button menjadi icon-only (padding dikecilkan, label tersembunyi)
- Diterapkan ke semua header action button: Users, Companies, HighMargin, Classification, RBAC, PermissionManagement

**ResponsiveListView — `_actions` Column AutoCard:**
- Kolom `field: '_actions'` dideteksi otomatis dan dirender di pojok kanan atas mobile card
- Semua halaman tabel menggunakan field name `'_actions'` untuk action column

**StatusChip — Enforcement (tidak ada MUI Chip langsung):**
- Semua `import Chip from '@mui/material/Chip'` dihapus dan diganti `StatusChip` dari `@/components/ui`
- File yang dimigrasikan:
  - `pages/Settings/HighMargin/index.tsx` — kolom type + status
  - `pages/Transactions/components/BuChip.tsx` — BU chip
  - `pages/Transactions/components/InvoiceDetailDrawer.tsx` — High Margin badge
  - `pages/ProductsHighMargin/index.tsx` — summary chips, GP margin %, BuChip untuk business unit, categories
  - `pages/Products/index.tsx` — MarginChip, is_high_margin badge
  - `pages/Customers/components/StatusChip.tsx` — local StatusChip → global
  - `pages/Customers/components/CustomerDetailDrawer.tsx` — categories_bought chips
  - `pages/Customers/index.tsx` — BuLabel (Typography) → BuChip
  - `pages/Companies/components/BranchSection.tsx` — Switch → StatusChip + ActionMenu

**BranchSection — Responsive Mobile + ActionMenu:**
- Layout cabang: `flexDirection: { xs: 'column', sm: 'row' }` — mobile stack vertikal
- Edit/Add form: TextField nama (full width) + row bawah (kode + save/cancel)
- Switch toggle aktif/nonaktif diganti: StatusChip sebagai indikator + ActionMenu (Edit / Aktifkan/Nonaktifkan / Hapus)
- Label deactivate/activate dinamis sesuai `branch.is_active`

**App Settings — Hapus Emoji:**
- Dihapus: `🌐`, `🎨` (×2), `🌙/☀️`, flag emoji di dropdown bahasa

**High Margin Filter — Responsive Mobile:**
- `flexDirection: { xs: 'column', sm: 'row' }`, `alignItems: { xs: 'stretch', sm: 'center' }`
- Select + TextField: `width/minWidth: { xs: '100%', sm: ... }`

**Classification Page — Migrasi ke ResponsiveListView:**
- Dari manual MUI `Table` → `ResponsiveListView` dengan `GridColDef`
- Columns: match_type, match_pattern (monospace), item_type (StatusChip), priority, is_active (Switch), _actions (ActionMenu)

**Bug Fix Backend:**
- `z.coerce.boolean()` salah untuk query string: `Boolean("false") === true` → semua `active_only=false` diproses sebagai `true`
- Fix: `z.string().optional().default('false').transform(v => v === 'true')` di `high-margin.schema.ts`
- `active_only` filter di repository: dari `isNull(effective_until)` saja → full date range: `effective_from <= CURRENT_DATE AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)`
- `validateQuery/validateDto/validateBody/validateParam` di `validator.ts`: `z.ZodSchema<T>` → `z.ZodType<T, any, any>` agar support schema dengan `.transform()`

**Perubahan file:**
- `backend/src/features/settings/high-margin.schema.ts` — UPDATED (z.coerce.boolean fix)
- `backend/src/features/settings/high-margin.repository.ts` — UPDATED (active_only date range)
- `backend/src/utils/validator.ts` — UPDATED (ZodSchema → ZodType<T,any,any>)
- `frontend/src/components/ui/ActionMenu/index.tsx` — NEW
- `frontend/src/components/ui/index.ts` — UPDATED (+ActionMenu)
- `frontend/src/components/ui/Button/Button.tsx` — UPDATED (+mobileIconOnly)
- `frontend/src/components/tables/ResponsiveListView/ResponsiveListView.tsx` — UPDATED (_actions AutoCard)
- `frontend/src/pages/Users/index.tsx` — UPDATED (ActionMenu + mobileIconOnly)
- `frontend/src/pages/Companies/index.tsx` — UPDATED (ActionMenu + mobileIconOnly)
- `frontend/src/pages/Companies/components/BranchSection.tsx` — UPDATED (responsive + ActionMenu + StatusChip)
- `frontend/src/pages/Settings/HighMargin/index.tsx` — UPDATED (ActionMenu + StatusChip + responsive filter)
- `frontend/src/pages/Settings/AppSettings/index.tsx` — UPDATED (hapus emoji)
- `frontend/src/pages/Config/Classification/index.tsx` — REWRITTEN (ResponsiveListView + ActionMenu)
- `frontend/src/pages/RBAC/index.tsx` — UPDATED (mobileIconOnly)
- `frontend/src/pages/RBAC/components/PermissionManagement.tsx` — UPDATED (mobileIconOnly)
- `frontend/src/pages/Transactions/components/BuChip.tsx` — UPDATED (StatusChip)
- `frontend/src/pages/Transactions/components/InvoiceDetailDrawer.tsx` — UPDATED (StatusChip)
- `frontend/src/pages/ProductsHighMargin/index.tsx` — UPDATED (StatusChip + BuChip)
- `frontend/src/pages/Products/index.tsx` — UPDATED (StatusChip)
- `frontend/src/pages/Customers/index.tsx` — UPDATED (BuChip)
- `frontend/src/pages/Customers/components/StatusChip.tsx` — UPDATED (global StatusChip)
- `frontend/src/pages/Customers/components/CustomerDetailDrawer.tsx` — UPDATED (StatusChip + BuChip)

---

### 2026-06-26 (sesi 17): Product High Margin — Schema + Backend + Frontend Settings Page

**Arsitektur High Margin (Dynamic, Time-Based):**
- `is_high_margin` boolean di `product_categories` **dihapus** — digantikan tabel `high_margin_products`
- Tabel `products` baru — diisi import parser dari kolom "Nama Barang" tiap baris faktur
- `invoice_items.product_name` dihapus (redundan), diganti `product_id FK NOT NULL`
- Re-import SI yang sama → UPDATE invoice + hapus items lama (via `resetItemsCache`), bukan error

**Backend — Schema baru:**
- `products`: id (sistem), company_id, product_name, product_category_id, UNIQUE (company_id, UPPER(product_name))
- `high_margin_products`: id, company_id, product_id|product_category_id (CHECK minimal satu), effective_from, effective_until nullable, note, created_by

**Backend — Import Service updates:**
- `upsertProduct()` di import.repository.ts — upsert by UPPER(product_name) + company_id
- `updateInvoice()` + `deleteInvoiceItemsByInvoiceId()` — handle re-import same SI
- `batchInvoiceCache` (multi-item per batch) + `resetItemsCache` (delete items sekali per invoiceId)

**Backend — Settings High Margin (new feature):**
- `GET/POST/PATCH/:id/PATCH/:id/deactivate/DELETE /api/v1/settings/high-margin`
- `GET /api/v1/products` + `GET /api/v1/products/categories` — list lokal dari DB (untuk dropdown)
- Seeded ke `page_settings`: `settings-high-margin` → `ready: true`

**Frontend — Settings High Margin page:**
- `types/highMargin.ts`, `api/highMargin.api.ts`, `hooks/useHighMargin.ts`
- `pages/Settings/HighMargin/index.tsx` — filter company/period/activeOnly, tabel mapping, action menu
- `pages/Settings/HighMargin/components/HighMarginDialog.tsx` — form create/edit
- Combobox target: MUI `Autocomplete` dengan `disablePortal`, grouped (Kategori / Produk), searchable, max height 220px
- Route `/settings/high-margin`, menu item group Admin, i18n en+id lengkap

**Insight data Accurate:**
- Kategori di Accurate sangat granular — satu kategori = satu model perangkat (contoh: `Z. SPARE PART RECEIPT PRINTER THERMAL MATRIX POINT TM P3250` adalah kategori, bukan produk)
- Produk individual = item baris faktur di dalam kategori tersebut

**Perubahan file:**
- `backend/src/db/schema/products.ts` — NEW
- `backend/src/db/schema/high_margin_products.ts` — NEW
- `backend/src/db/schema/invoice_items.ts` — UPDATED (product_id NOT NULL, hapus product_name)
- `backend/src/db/schema/product_categories.ts` — UPDATED (hapus is_high_margin)
- `backend/src/db/schema/index.ts` — UPDATED (export products + high_margin_products)
- `backend/src/db/migrations/0003_transactions_import.sql` — UPDATED (schema baru embed)
- `backend/src/db/seed.ts` — UPDATED (+settings-high-margin page)
- `backend/src/features/import/import.repository.ts` — UPDATED (upsertProduct, updateInvoice, deleteInvoiceItemsByInvoiceId)
- `backend/src/features/import/import.service.ts` — UPDATED (resetItemsCache, re-import flow, upsertProduct)
- `backend/src/features/settings/high-margin.schema.ts` — NEW
- `backend/src/features/settings/high-margin.repository.ts` — NEW
- `backend/src/features/settings/high-margin.service.ts` — NEW
- `backend/src/features/settings/high-margin.handler.ts` — NEW
- `backend/src/features/settings/high-margin.route.ts` — NEW
- `backend/src/features/products/products.schema.ts` — UPDATED (+localProductsQuerySchema)
- `backend/src/features/products/products.handler.ts` — UPDATED (+handleGetLocalProducts, +handleGetLocalCategories)
- `backend/src/features/products/products.route.ts` — UPDATED (GET / + GET /categories)
- `backend/src/router.ts` — UPDATED (mount /api/v1/settings/high-margin)
- `frontend/src/types/highMargin.ts` — NEW
- `frontend/src/api/highMargin.api.ts` — NEW
- `frontend/src/hooks/useHighMargin.ts` — NEW
- `frontend/src/pages/Settings/HighMargin/index.tsx` — NEW
- `frontend/src/pages/Settings/HighMargin/components/HighMarginDialog.tsx` — NEW
- `frontend/src/components/ui/ComboInput/ComboInput.tsx` — NEW (reusable)
- `frontend/src/route/routeConstants.tsx` — UPDATED
- `frontend/src/route/routeLazyComponents.tsx` — UPDATED
- `frontend/src/config/menu.tsx` — UPDATED
- `frontend/src/i18n/locales/en.json` — UPDATED (+highMargin.*, +targetPlaceholder)
- `frontend/src/i18n/locales/id.json` — UPDATED (+highMargin.*, +targetPlaceholder)
- `docs-v2/shared/data-model.md` — UPDATED (products, high_margin_products, invoice_items, product_categories)
- `docs-v2/product-workbench/decisions.md` — UPDATED (3.2 dynamic high margin, 3.1 products resolved)
- `docs-v2/admin/overview.md` — UPDATED (5.7 High Margin Settings, import status)
- `.clinerules` — UPDATED (definisi High Margin Product)

---

### 2026-06-26 (sesi 16): Import Streaming Progress + ProgressBar Component + Template Validation

**Parser — Dynamic header detection + template validation:**
- Ganti `EXCEL_COL` hardcoded indices dengan deteksi header dinamis (`detectExcelHeaders`, `validateExcelHeaders`)
- Tambah `branch_name` (Nama Cabang) dan `salesperson` (Nama Tenaga Penjual) ke `InvoiceRow` — optional
- `REQUIRED_EXCEL_HEADERS`: 9 kolom wajib. `OPTIONAL_EXCEL_HEADERS`: 2 kolom opsional
- Protect import: tolak jika ada kolom tidak dikenal ATAU kolom wajib hilang → `AppError(INVALID_FILE_FORMAT)` + pesan jelas
- Scan header di 10 baris pertama (toleransi metadata baris awal di Excel export Accurate)

**Database — branch_name di invoices:**
- Tambah `branch_name varchar(255)` ke `invoices` schema
- Migrasi konsolidasi: 3 file deskriptif (`0001_auth_system.sql`, `0002_branches_credentials.sql`, `0003_transactions_import.sql`)
- Hapus semua file ALTER TABLE terpisah — semua kolom embed langsung ke CREATE TABLE
- Journal direbuild dengan 3 entries; semua snapshot dihapus

**Import Service:**
- Status awal import log: `'failed'` (pesimistik) → diupdate ke status final di akhir. Mencegah log orphan 'partial' saat browser di-refresh
- Tambah `salesperson_name` dan `branch_name` ke `createInvoice()` call

**SSE Streaming — progress real-time:**
- Endpoint baru: `POST /import/csv/stream` — Hono `streamSSE`, emit event per baris yang diproses
- Event: `progress {processed, total, success, errors}` per baris, `done {result}` di akhir, `error {message}` jika gagal
- Hook baru: `useImportFileProgress` — native `fetch` + `ReadableStream` SSE consumer, tidak pakai axios
- State: `phase: 'idle'|'uploading'|'processing'|'done'|'error'`, `progress: {processed, total, success, errors}`

**ProgressBar — Atomic component baru:**
- Lokasi: `src/components/ui/ProgressBar/`
- Bar tersegmentasi: hijau (sukses) + merah (error) + abu (sisa/belum diproses)
- `status="loading"` → shimmer indeterminate (saat fase upload sebelum total diketahui)
- Animasi: mount pertama dari 0 via `requestAnimationFrame`, update streaming langsung (CSS transition smooth)
- Props: `success`, `error`, `total`, `status`, `size (sm/md/lg)`, `showLabel`, `animated`

**UploadFileCard — re-import fix + disabled state:**
- Reset `fileInputRef.current.value` di onSuccess, onError, dan handleSubmit — fix bug re-upload tanpa refresh
- Ganti `useImportFile` → `useImportFileProgress`
- Tampilkan ProgressBar shimmer saat `uploading`, bar aktual saat `processing` dengan label `N / T baris`

**Disable semua field saat import berlangsung:**
- `ImportPage` kelola `fileImporting` + `accurateImporting` state via `onPendingChange` callback
- `UploadFileCard` dan `AccurateApiCard` masing-masing terima `disabled` prop
- Saat salah satu card loading: card lain opacity 0.5, semua field (Select, TextField, dropzone, Button) disabled
- `CompanyPeriodFields` terima `disabled` prop, diteruskan ke `FormControl` dan `TextField`

**Perubahan file:**
- `backend/src/utils/parser.ts` — UPDATED (dynamic header, template validation, branch_name/salesperson)
- `backend/src/db/schema/invoices.ts` — UPDATED (+branch_name)
- `backend/src/db/migrations/0001_auth_system.sql` — UPDATED (+business_configs table)
- `backend/src/db/migrations/0003_transactions_import.sql` — UPDATED (+branch_name di CREATE TABLE invoices)
- `backend/src/features/import/import.service.ts` — UPDATED (onProgress callback, pessimistic status, branch_name)
- `backend/src/features/import/import.handler.ts` — UPDATED (+handleImportFileStream)
- `backend/src/features/import/import.route.ts` — UPDATED (+POST /csv/stream)
- `frontend/src/api/axios.ts` — UPDATED (+getCsrfToken export)
- `frontend/src/hooks/useImport.ts` — UPDATED (+useImportFileProgress hook)
- `frontend/src/components/ui/ProgressBar/ProgressBar.tsx` — NEW
- `frontend/src/components/ui/ProgressBar/index.ts` — NEW
- `frontend/src/components/ui/index.ts` — UPDATED (+ProgressBar export)
- `frontend/src/pages/Import/index.tsx` — UPDATED (state manajemen loading antar card)
- `frontend/src/pages/Import/components/UploadFileCard.tsx` — UPDATED (hook baru, progress bar, disabled)
- `frontend/src/pages/Import/components/AccurateApiCard.tsx` — UPDATED (disabled prop + onPendingChange)
- `frontend/src/pages/Import/components/CompanyPeriodFields.tsx` — UPDATED (+disabled prop)
- `frontend/src/pages/Import/components/ResultBanner.tsx` — UPDATED (+ProgressBar di result)

---

### 2026-06-25 (sesi 15): Import Feature Fixes + Handler Pattern Refactor

**Import Parser (parser.ts) — 4 bug diperbaiki:**
- `EXCEL_COL` indices salah semua: setiap kolom Accurate export dipisah 1 cell kosong (merged cells). Fix: DATE=1, INVOICE_NO=3, CUSTOMER_NAME=5, CATEGORY=9, ITEM_NAME=11, QUANTITY=13, UNIT_PRICE=15, REVENUE=17, GROSS_PROFIT=21
- Format tanggal salah: kode expect YYYY-MM-DD, aktual Accurate kirim "DD MMM YYYY" (e.g. "02 Jun 2026"). Fix: tambah `MONTH_MAP` + regex match DD MMM YYYY
- Numeric parsing salah: `.replace(/\./g,'')` menghapus titik desimal. Format Accurate: koma=ribuan, titik di akhir=integer. Fix: `.replace(/,/g,'').replace(/\.$/,'')`
- Tambah field baru ke `InvoiceRow`: `item_name?`, `quantity?`, `unit_price?` — diisi dari kolom Nama Barang, Kuantitas, @Harga (hanya Excel Accurate)

**Import Service (import.service.ts) — 2 bug diperbaiki:**
- Multi-item invoice: setiap baris ke-2+ dengan invoice number sama dianggap duplikat. Fix: `batchInvoiceCache: Map<invoiceNumber, invoiceId>` — cache invoice yang dibuat dalam batch ini, baris berikutnya langsung `createInvoiceItem` tanpa `createInvoice` baru
- Empty file handling: kondisi `rows=0 && errors=0` fall-through ke loop kosong, return `{status:'failed', errorRows:0}` tanpa pesan jelas. Fix: throw `AppError(INVALID_FILE_FORMAT)` untuk kasus ini

**Import Repository (import.repository.ts) — 1 bug diperbaiki:**
- `findImportLogs` return flat rows (`company_id: number`, `imported_by: number`). Frontend type `ImportLog` expect `{company: {id,name}, imported_by: {id,name}}`. Fix: LEFT JOIN ke `companies` dan `users`

**Frontend ImportLogsTable — 1 bug diperbaiki:**
- `log.company.name` dan `log.imported_by.name` crash jika JOIN null. Fix: optional chaining `?.`

**Handler Pattern Refactor — 8 fitur dimigrasikan:**
- Sebelum: semua route file punya inline `async (c) => { ... }` tanpa try/catch
- Sekarang: setiap fitur punya `feature.handler.ts` — logic + error handling di sini, route file hanya register
- Pola seragam: `if (err instanceof AppError) throw err` → rethrow operational error; wrap unexpected error dengan `ErrorCode` yang kontekstual
- File baru: `audit.handler.ts`, `page.handler.ts`, `roles.handler.ts`, `permissions.handler.ts`, `user.handler.ts`, `products.handler.ts`, `config.handler.ts`, `companies.handler.ts`
- `config.handler.ts`: logger untuk unexpected error di `saveAccurateCredentials` tetap dipertahankan

**Perubahan file:**
- `backend/src/utils/parser.ts` — UPDATED (EXCEL_COL fix, date format, numeric parsing, item_name/qty/unit_price)
- `backend/src/features/import/import.service.ts` — UPDATED (batchInvoiceCache, empty file guard, AppError import)
- `backend/src/features/import/import.repository.ts` — UPDATED (findImportLogs JOIN companies+users)
- `frontend/src/pages/Import/components/ImportLogsTable.tsx` — UPDATED (optional chaining)
- `backend/src/features/audit/audit.handler.ts` — NEW
- `backend/src/features/page/page.handler.ts` — NEW
- `backend/src/features/roles/roles.handler.ts` — NEW
- `backend/src/features/permissions/permissions.handler.ts` — NEW
- `backend/src/features/users/user.handler.ts` — NEW
- `backend/src/features/products/products.handler.ts` — NEW
- `backend/src/features/config/config.handler.ts` — NEW
- `backend/src/features/companies/companies.handler.ts` — NEW
- 8 route files — UPDATED (delegate ke handler masing-masing)

---

### 2026-06-25 (sesi 14): Backend Import Feature — Schema + Classification Engine + CSV Import API

**Phase 1 — Schema & Database (7 new Drizzle schema files):**
- `product_categories.ts` — item_type (unit|consumable|sparepart|service), avg_margin_percent, is_high_margin
- `customers.ts` — customer_code nullable, business_unit, first/last_invoice_date
- `invoices.ts` — header faktur dengan UNIQUE (invoice_number, company_id), soft delete
- `invoice_items.ts` — line items dengan quantity, unit_price, revenue, gross_profit
- `import_logs.ts` — riwayat import (source file/accurate_api, status partial/success/failed)
- `import_log_errors.ts` — detail error per baris import
- `item_classification_rules.ts` — aturan klasifikasi 4-layer per company
- Update `schema/index.ts` — uncomment semua export baru

**Phase 2 — Classification Engine (utils/classifier.ts):**
- Layer 1: 22 keyword rules (CARTRIDGE→consumable, PRINTER→unit, SERVICE→service, dll)
- Layer 2: Price range heuristic (>=500k→unit, 50k-499k→consumable, <50k→sparepart)
- Layer 3: DB lookup ke `item_classification_rules` dengan priority system
- Layer 4: Fallback ke 'unit' + needs_review=true
- Export `classifyItemType()` (async, full 4-layer) dan `classifyItemTypeSync()` (sync, Layer 1+2)

**Phase 3 — Import Repository (import.repository.ts):**
- `upsertCustomer()` — lookup by UPPER(customer_name) + company_id, update first/last_invoice_date
- `upsertProductCategory()` — lookup by UPPER(name) + company_id, create if not exists
- `findInvoiceByNumber()` — dedup check UPPER(invoice_number) + company_id
- `createInvoice()` / `createInvoiceItem()` — insert with audit trail
- `updateInvoiceTotals()` — recalculate SUM revenue + gross_profit
- `createImportLog()` / `findImportLogs()` / `findImportErrors()` — import history
- `findClassificationRules()` / CRUD — manage classification rules

**Phase 4 — Import Service & API (import.service.ts + handler + route):**
- `POST /api/v1/import/csv` — multipart upload, parse CSV/Excel, classify, upsert, store
- `GET /api/v1/import/logs` — paginated import history
- `GET /api/v1/import/logs/:id` — detail import log + errors
- Validasi: MIME type, file size (10MB), ISO format periode
- Partial success: valid rows masuk, errors dicatat ke import_log_errors
- Normalisasi UPPERCASE: semua teks dikonversi saat import

**Route Registration:**
- `backend/src/router.ts` — import route mounted at `/api/v1/import`
- Import routes are currently unprotected (authMiddleware not yet active)

**Perubahan file:**
- `backend/src/db/schema/product_categories.ts` — NEW
- `backend/src/db/schema/customers.ts` — NEW
- `backend/src/db/schema/invoices.ts` — NEW (with unique constraint)
- `backend/src/db/schema/invoice_items.ts` — NEW
- `backend/src/db/schema/import_logs.ts` — NEW
- `backend/src/db/schema/import_log_errors.ts` — NEW
- `backend/src/db/schema/item_classification_rules.ts` — NEW
- `backend/src/db/schema/index.ts` — UPDATED (all new exports)
- `backend/src/utils/classifier.ts` — NEW (4-layer classification engine)
- `backend/src/features/import/import.schema.ts` — NEW (Zod schemas)
- `backend/src/features/import/import.repository.ts` — NEW (all DB queries)
- `backend/src/features/import/import.service.ts` — NEW (business logic)
- `backend/src/features/import/import.handler.ts` — NEW (HTTP handlers)
- `backend/src/features/import/import.route.ts` — NEW (route definitions)
- `backend/src/router.ts` — UPDATED (import route mounted)

### 2026-06-24 (sesi 13): Companies Management Page — Backend Endpoints + Frontend CRUD

**Backend — Branch CRUD (5 endpoints):**
- `branch.schema.ts` — Zod schemas for branch create/update, branch ID param validation
- `branch.service.ts` — Service layer: getBranchesByCompany, getBranchById, create/update/delete with audit logging
- `companies.route.ts` — Added 4 branch endpoints:
  - `GET /companies/:id/branches` — list branches
  - `POST /companies/:id/branches` — create branch
  - `PATCH /companies/branches/:branchId?company_id=...` — update branch
  - `DELETE /companies/branches/:branchId?company_id=...` — delete branch
- `seed.ts` — Added:
  - 5 default branches (PT MKO: Pusat, PT KNT: SBY/JKT/SMG, PT SKI: Pusat)
  - `companies:manage` permission (category: Companies)
  - `companies` page setting (ready: true)

**Frontend — Companies Management Page:**
- `types/companies.ts` — Added `CompanyBranch`, `CreateBranchPayload`, `UpdateBranchPayload`, `CompanyWithBranches`
- `api/companies.api.ts` — Added branch API calls (getBranchesByCompany, create/update/delete branch)
- `hooks/useCompanies.ts` — Added `useBranchesByCompany`, `useCreateBranch`, `useUpdateBranch`, `useDeleteBranch`
- `pages/Companies/` — Full page with 4 components:
  - `index.tsx` — DataGrid + action menu (view/edit/delete/manage branches)
  - `CompanyDialog.tsx` — Create/Edit/Delete company form dialog
  - `CompanyDetailDialog.tsx` — View company details dialog
  - `BranchSection.tsx` — Inline branch management with inline edit/create/delete
- Route registration in `routeConstants.tsx` (path: `/companies`, key: `companies`)
- Lazy import in `routeLazyComponents.tsx`
- Menu item in `menu.tsx` (Admin group, BusinessIcon)
- `page.handler.ts` — Added `companies: ready: true`
- i18n `en.json` + `id.json` — Added full `companies.*` keys (title, dialog labels, branch management)

**IntegrationTab:**
- Already uses `useCompanies()` + `useBranches()` from existing hooks — no changes needed, both hooks call the same real API endpoints (`/companies` and `/companies/:id/branches`)

**Perubahan file:**
- `backend/src/features/companies/branch.schema.ts` — NEW (Zod schemas)
- `backend/src/features/companies/branch.service.ts` — NEW (service layer)
- `backend/src/features/companies/branch.repository.ts` — existing (no changes)
- `backend/src/features/companies/companies.route.ts` — UPDATED (+4 branch endpoints)
- `backend/src/db/seed.ts` — UPDATED (+branches, +permission, +page setting)
- `frontend/src/types/companies.ts` — UPDATED (+branch types)
- `frontend/src/api/companies.api.ts` — UPDATED (+branch API calls)
- `frontend/src/hooks/useCompanies.ts` — UPDATED (+branch hooks)
- `frontend/src/pages/Companies/` — NEW (4 files)
- `frontend/src/route/routeConstants.tsx` — UPDATED
- `frontend/src/route/routeLazyComponents.tsx` — UPDATED
- `frontend/src/config/menu.tsx` — UPDATED
- `frontend/src/mocks/handlers/page.handler.ts` — UPDATED
- `frontend/src/i18n/locales/en.json` — UPDATED (fix + companies keys)
- `frontend/src/i18n/locales/id.json` — UPDATED (+companies keys)
- `docs-v2/CURRENT_STATE.md` — catatan sesi ini

---

### 2026-06-24 (sesi 12): Integrasi Accurate — Schema + Test + Frontend

**Database Schema (2 tabel baru):**
- `company_branches` — cabang perusahaan per company (Pusat, Surabaya, Jakarta, Semarang)
- `accurate_credentials` — kredensial API Token per branch (api_token, signature_secret, subdomain, company_db_id)

**Test Koneksi Accurate (HASIL ✅):**
- Flow: `POST /api/api-token.do` dengan HMAC-SHA256 signature
- Auth: Token `aat.MTAw...` + Signature Secret `3soFMSAK...`
- Response: `{"s":true,"d":{"database":{"host":"https://odin.accurate.id","alias":"Sandbox","id":2704558},"user":{"fullName":"Semanggi"}}}`
- Customer list: 5 customers (Aab, Aaf, Aal, dll)
- Invoice list: 1 invoice (SI.2026.06.00001, Rp 2,995,800)

**Frontend — Integration Tab (Config):**
- `src/types/accurate.ts` — tipe data baru
- `src/api/accurate.api.ts` — API layer (branches, credentials, test connection)
- `src/hooks/useAccurate.ts` — TanStack Query hooks
- `src/mocks/handlers/accurate.handler.ts` — MSW mock
- `src/pages/Config/components/IntegrationTab.tsx` — update besar: Company dropdown → Branch dropdown → Auth method selector (OAuth/API Token) → form credentials → test connection button
- i18n en.json + id.json — semua keys integration lengkap

**Credentials Terkonfirmasi:**
| Item | Value |
|------|-------|
| App Key | `86ed8d58-3d00-487b-8e91-661d8f60e434` |
| Signature Secret | `3soFMSAKxTdkraVPtLqyE2H1la6kGWSNM7HuHcQTzK6HHArb9YtTSTTOn4wS87E1` |
| Sandbox API Token | `aat.MTAw.eyJ2...` |
| Host | `odin.accurate.id` |
| DB ID | 2704558 |

**Dokumentasi:**
- `docs-v2/shared/data-model.md` — tambah definisi company_branches + accurate_credentials
- `docs-v2/features/config-page.md` — update detail Integration Tab
- `docs-v2/CURRENT_STATE.md` — catatan sesi ini

---

### 2026-06-23 (sesi 11): Codebase Memory Indexing Full

**Codebase memory di-index ke knowledge graph:**

- **Repository**: `home-pacman-e-dashbord` — mode `full` dengan persistence
- **Nodes**: 3,150 (Function: 508, Variable: 1,136, Interface: 148, Type: 56, Route: 34, File: 286, dll)
- **Edges**: 4,871 (CALLS: 684, IMPORTS: 439, USAGE: 338, HTTP_CALLS: 13, SEMANTICALLY_RELATED: 140, dll)
- **Languages**: TypeScript (226 files), SQL (4), YAML (2), JavaScript (2), HTML (1), CSS (1)
- **Clusters detected**: 12 komunitas — backend (62 members, 0.95 cohesion), frontend pages (RBAC, Users, Import, Customers, Transactions, Products, Config, Dashboard/Login), docs-v2
- **Hotspots**: `handleDbError` (33 callers), `usePageSettings.select` (27 callers), `error` response (10 callers), `Card` component (9 callers), `logAudit` (6 callers)
- **Entry points**: 20 functions identified (AppError, registerErrorHandlers, findAuditLogs, findAllCompanies, dll)
- **Routes**: 20 HTTP routes detected (companies, roles, permissions, config, page-settings, import, users)

**Architecture Decision Record (ADR) dibuat:**
- Menyimpan arsitektur lengkap: project structure, backend layer pattern (Route→Handler→Service→Repository), frontend data flow (Page→Hook→API→Axios), component inventory, progress status
- Disimpan di codebase-memory knowledge graph untuk persistensi antar sesi

**Perubahan file:**
- `.codebase-memory/artifact.json` — diupdate (kompresi graph ke .zst)
- `.codebase-memory/graph.db.zst` — artifact baru untuk team sharing
- `docs-v2/CURRENT_STATE.md` — catatan sesi ini
- ADR disimpan di knowledge graph internal

---

### 2026-06-23 (sesi 10): Audit Penamaan Variabel — Backend Drizzle Schema + Zod + Repository

**Standarisasi naming ke snake_case (seluruh backend):**

**Database Schema (10 file Drizzle):**
- `db/schema/companies.ts`: `createdAt` → `created_at`, `updatedAt` → `updated_at`
- `db/schema/users.ts`: `isActive` → `is_active`, `createdAt` → `created_at`, `updatedAt` → `updated_at`, `lastLoginAt` → `last_login_at`, `deletedAt` → `deleted_at`
- `db/schema/roles.ts`: `isSystem` → `is_system`, `createdAt` → `created_at`, `updatedAt` → `updated_at`
- `db/schema/permissions.ts`: `createdAt` → `created_at`, `updatedAt` → `updated_at`
- `db/schema/role_permissions.ts`: `roleId` → `role_id`, `permissionId` → `permission_id`, `createdAt` → `created_at`
- `db/schema/user_roles.ts`: `userId` → `user_id`, `roleId` → `role_id`, `createdAt` → `created_at`
- `db/schema/user_companies.ts`: `userId` → `user_id`, `companyId` → `company_id`, `createdAt` → `created_at`
- `db/schema/audit_logs.ts`: `actorId` → `actor_id`, `entityId` → `entity_id`, `companyId` → `company_id`, `ipAddress` → `ip_address`, `requestId` → `request_id`, `oldValue` → `old_value`, `newValue` → `new_value`, `createdAt` → `created_at`
- `db/schema/page_settings.ts`: `pageKey` → `page_key`, `createdAt` → `created_at`, `updatedAt` → `updated_at`
- `db/schema/business_configs.ts`: `createdAt` → `created_at`, `updatedAt` → `updated_at`

**Zod Schema (features/*/):**
- `user.schema.ts`: `isActive` → `is_active`, `createdAt` → `created_at`, `updatedAt` → `updated_at`

**Repository files (6 files):**
- `users/user.repository.ts`, `roles/roles.repository.ts`, `companies/companies.repository.ts`
- `permissions/permissions.repository.ts`, `audit/audit.repository.ts`, `config/config.repository.ts`
- `page/page.repository.ts` — semua Drizzle query references di-update ke snake_case

**Service files & seed:**
- `users/user.service.ts`: `before.isActive` → `before.is_active`
- `utils/audit.ts`: parameter names diupdate dari camelCase ke snake_case
- `db/seed.ts`: semua insert key names diupdate ke snake_case

**Prinsip:**
- DB column names dan JSON property names AWS konsisten snake_case
- Tidak mengubah nama yang bersifat JavaScript internal (function parameter, variable lokal) — hanya nama property yang map ke Drizzle schema atau DB JSON response
- Konsistensi: Sekarang semua JS property name yang mereferensi kolom database menggunakan snake_case

**Perubahan file Backend:**
- 10 schema files di `db/schema/` — snake_case property names
- 7 feature schema files — Zod field names snake_case
- 7 repository files — Drizzle query references snake_case
- 2 service files — object access snake_case
- 1 seed file — insert keys snake_case
- 1 util file — audit utils parameter names snake_case

**Frontend:**
- Frontend types (`src/types/users.ts`) sudah snake_case untuk `is_active`, `last_login_at`, `created_at` ✅
- Frontend API adapter `adaptUser()` di `users.api.ts` masih ada — akan di-refactor saat backend response service dikonfigurasi
- Frontend lainnya belum diaudit (perlu sesi terpisah)

---

### 2026-06-21 (sesi 9): Backend RBAC + Dokumentasi

**Backend RBAC (5.3 Admin) — 100% SELESAI:**
- Roles CRUD: GET /roles, GET /roles/:id, POST /roles, PATCH /roles/:id, DELETE /roles/:id
- Permissions CRUD: GET /permissions, POST /permissions, PUT /permissions/:id, DELETE /permissions/:id
- Role-Permission mapping: GET /roles/:id/permissions, PUT /roles/:id/permissions
- Database: 35 permissions seeded (9 kategori), 3 system roles (superadmin, admin, user)
- Audit logging: semua mutasi (role.create, role.update, role.delete, permission.create, permission.update, permission.delete)
- Error handling: NOT_FOUND, DUPLICATE_ENTRY, FORBIDDEN (system role), VALIDATION_ERROR

**Dokumentasi:**
- File baru: `docs-v2/features/rbac.md` (comprehensive guide + API docs)
- Updated: `docs-v2/CURRENT_STATE.md` (progress update, catatan sesi)

**Perubahan file backend:**
- 4 file roles feature: roles.route.ts (tambah GET /:id/permissions), roles.service.ts, roles.repository.ts (tambah findRolePermissions)
- 4 file permissions feature: permissions.route.ts, permissions.service.ts, permissions.repository.ts, permissions.schema.ts
- db/seed.ts: 35 permissions + role-permission mapping
- db/migrations/0000_init_schema.sql: semua tables (companies, users, roles, permissions, role_permissions, user_roles, user_companies, page_settings, audit_logs)

---

### 2026-06-20 (sesi 8): Audit Log Viewer (5.5 Admin)

**Audit Log (5.5):**
- Halaman read-only untuk audit trail sistem
- DataGrid dengan 6 kolom: Waktu, Aksi (StatusChip color-coded), Pelaku, Entity, Entity ID, IP Address
- Filter: Action dropdown (8 action types) + Date From + Date To
- Server-side pagination + custom mobile card renderer (responsive 2-kolom layout)
- Filter section menggunakan pola `Box flexDirection: { xs: 'column', sm: 'row' }` — konsisten dengan halaman lain

**Perubahan file:**
- 4 file baru: `types/audit.ts`, `api/audit.api.ts`, `hooks/useAuditLogs.ts`, `mocks/handlers/audit.handler.ts`
- 1 file diupdate: `pages/AuditLog/index.tsx` (placeholder → full page)
- handlers.ts: ditambahkan `auditHandlers`
- page.handler.ts: `audit-log → ready: true`
- i18n en.json + id.json: keys `auditLog.*` (description, table, filterAction, allActions, filterDateFrom, filterDateTo, dll)
- CURRENT_STATE.md: Audit Log dipindah dari "Not Built" → "Done"

---

### 2026-06-19 (sesi 6+7): Product Workbench + Order Ledger

**Product Workbench (Group 3):**
- 3.1 Category Performance Ledger: DataGrid kategori (revenue, GP, margin, customer count, sortable server-side)
- 3.2 High Margin Push List: 2 tab (Category Penetration + Upsell Targets) dengan progress bar penetration rate
- 3.3 Product Trend & Diversity: KPI cards + AreaChartWidget M2 (avg category per customer, 12 month trend)

**Order Ledger (4.1):**
- DataGrid invoice dengan 10 kolom (invoice number, date, customer, BU, company, revenue, GP, margin, categories, source)
- Filter BU + customer search
- Drawer detail invoice (header, KPI revenue/GP, line items dengan category chips)
- Server-side pagination + sorting

**Perubahan file:**
- 5 file baru: `types/transactions.ts`, `api/transactions.api.ts`, `hooks/useTransactions.ts`, `mocks/handlers/transactions.handler.ts`
- 1 file diupdate: `pages/Transactions/index.tsx` (placeholder → full page)
- page.handler.ts: `transactions → ready: true`
- i18n en.json + id.json: keys `transactions.*`
- CURRENT_STATE.md: progress ~86%

### 2026-06-19 (sesi 5): i18n Full Compliance + Architecture Audit

**i18n Audit & Perbaikan:**
- Audit semua 15+ page file dan komponen reusable
- Fix hardcoded string di 4 file: `NotFound` (3 string), `UnderMaintenance` (2 string), `Login` (error title/message), `ResponsiveListView` (error/empty)
- Tambah missing i18n keys di `en.json`: `notFound.*`, `maintenance.*`, `auth.loginFailed*`
- Rule baru di `docs-v2/CRITICAL_RULES.md` section **"i18n Rules (WAJIB)"** — 6 aturan + anti-pattern

**Architecture Audit & Perbaikan:**
- 2 violations: Import page punya `useQuery` + `api.get` inline → pindahkan ke `getCompanies()` di API layer + `useCompanies()` di hooks
- Users page punya `useQuery` + `rbacApi.getRoles()` inline → pindahkan ke `getRoles()` di API layer + `useRoles()` di hooks
- Semua page sekarang: Page → hooks → API layer → axios (tidak ada inline query)

**Status Compliance Checklist:**
| Aturan | Status |
|--------|--------|
| Semua API call via `src/api/*` | ✅ |
| Semua `useQuery`/`useMutation` di `src/hooks/*` | ✅ |
| Semua tipe di `src/types/*` | ✅ |
| Semua halaman terdaftar di route + menu | ✅ |
| Semua user-facing text via `t()` i18n | ✅ |
| No `any` types | ✅ |
| `ResponsiveListView` pakai i18n untuk error/empty | ✅ |

---

### 2026-06-19 (sesi 4): DataTable Dihapus — ResponsiveListView Jadi Standar Tunggal

**`DataTable` dihapus:**
- `src/components/tables/DataTable/` — folder dihapus
- Semua halaman sudah migrasi ke `ResponsiveListView` sebelumnya
- Tidak ada import `DataTable` yang tersisa

**`ResponsiveListView` sekarang satu-satunya komponen tabel:**
- Desktop: `DataGrid` MUI X
- Mobile: card list auto-generated
- Server-side pagination: `rowCount`, `paginationModel`, `sortModel` — sudah support
- Semua state built-in: loading skeleton, error alert, empty state

**Dokumentasi:**
- `docs-v2/shared/ui-patterns.md` — diupdate: "Single Component: ResponsiveListView (replaces DataTable)"
- `docs-v2/CURRENT_STATE.md` — tabel komponen diupdate

---

### 2026-06-19 (sesi 3): ResponsiveListView — Atomic Component for Mobile-Ready Tables

**New component: `ResponsiveListView`**
- Lokasi: `src/components/tables/ResponsiveListView/ResponsiveListView.tsx`
- Barrel: `src/components/tables/ResponsiveListView/index.ts`
- Deskripsi: satu komponen yang otomatis render `DataGrid` di desktop dan card list di mobile (breakpoint `< sm`)
- Fitur: loading skeleton (responsive), error alert, empty state, onRowClick, auto-card dari column definitions, custom renderCard, mobileFields filter

**Dokumentasi:**
- `docs-v2/shared/ui-patterns.md` — tambah section "Table Pattern" dengan sub "Mobile: Auto-generated Card List via ResponsiveListView" + prop table + anti-pattern

**Aturan baru:**
- Jangan buat manual `if/else isMobile` untuk DataTable vs card list — gunakan `ResponsiveListView`
- Semua loading/error/empty state sudah built-in, tidak perlu duplicate

---

### 2026-06-19 (sesi 2): Layout Fix — Config + Import Pages

**Config page layout consistency:**
- `Config/index.tsx`: Ganti `Paper` → `Card` dari `@/components/ui`. Hapus `Card` wrapper di parent untuk Tab 1 & 2.
- `IntegrationTab.tsx`: `CardContent` → `Card sx={{ p: 3 }}` — konsisten dengan BusinessRulesTab.
- `AppSettingsTab.tsx`: `CardContent` → `Card sx={{ p: 3 }}` — konsisten dengan BusinessRulesTab.
- Hasil: semua 3 tab sekarang pakai container yang sama (`Card` with border 1px solid divider).

**Import page TypeScript errors fixed:**
- `display="block"` pada Typography caption → pindah ke `sx={{ mt: 0.5, display: 'block' }}` (MUI v7 strict props).
- `color="secondary"` di StatusChip → ganti `"info"` (StatusChip tipe tidak punya `secondary`).
- `alignItems="stretch"` di Grid → pindah ke `sx={{ alignItems: 'stretch' }}` (MUI v7 Grid strict props).

**Aturan baru yang terdokumentasi:**
- Jangan gunakan `CardContent` dari MUI — selalu pakai `Card sx={{ p: 3 }}` untuk isi.
- `StatusChip` hanya menerima `StatusChipColor`: `'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'` — tidak ada `'secondary'`.

---

### 2026-06-19 (sesi 1): UI Admin + Refactor Card System

**Config page (5.4) diperbaiki:**
- Bug: `useTheme` tidak ada di `@/theme/theme.context` (nama benar: `useThemeMode`)
- Fix: hapus duplikat inline `AppSettingsTab` & `IntegrationTab`, impor dari `Config/components/` yang sudah benar
- Struktur tab: Business Rules (dormant threshold per BU, editable inline), Integration (OAuth / API Token), App Settings (dark mode toggle + language)

**Flat design — hapus semua rounded corner pada card:**
- Tambah override `borderRadius: 0` ke `MuiCard` dan `MuiPaper` di kedua tema (light + dark) di `src/theme/index.ts`
- Hapus semua inline `borderRadius` yang ada di `DetailCard`, `RoleCard`, `AppSettingsTab`, `Card`

**Atomic `Card` component (`src/components/ui/Card/Card.tsx`):**
- Tulis ulang menjadi single source of truth untuk semua card styling di aplikasi
- Wrap `MuiPaper` dengan default: `elevation=0`, `square=true`, `border: 1px solid divider`, `bgcolor: background.paper`
- Caller hanya pass `sx` untuk override spesifik (padding, height, dll)
- 15 file dimigrasikan: semua chart widget (8), DataTable, StatCard, Dashboard, Config, Login, RoleCard, DetailCard, DeleteRoleDialog

**Aturan ke depan:** Jangan pernah import `Paper` atau `MuiCard` langsung untuk container halaman — selalu gunakan `import { Card } from '@/components/ui'`.

---

### 2026-06-18: Refactor dokumentasi docs-v2 selesai. Semua 23 file sudah lengkap. Konten bersumber dari docs/backup/ (AI_AGENT_GUIDE, API_SPEC, FINALIZED_MENU_STRUCTURE, METRICS_SPEC, DATA_MODEL, ARCHITECTURE) yang direfactor menjadi struktur modular per-domain. File-file yang sebelumnya kosong (product-workbench/api.md, product-workbench/decisions.md, transaction-workbench/*, admin/*) sudah diisi. Anti-pattern dari AI_AGENT_GUIDE.md sudah ada di shared/ui-patterns.md.