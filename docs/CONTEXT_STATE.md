# CONTEXT_STATE.md — Status & Konteks Pengerjaan

> Update file ini di **awal dan akhir setiap sesi kerja**.

**Terakhir diperbarui**: 2026-06-17 02:55  
**Diperbarui oleh**: AI (Claude)

---

## Status Saat Ini

**Fase**: `[x] Setup` / `[~] Development` / `[ ] Integration` / `[ ] Testing` / `[ ] MVP Done`

**Ringkasan**:
> Frontend: Layout selesai (AppBar, Sidebar, Footer, DashboardLayout). Login, Dashboard, dan CrossSelling sudah diimplementasi penuh. MSW mock server aktif untuk 4 domain (auth, page, dashboard, metrics). Dynamic routing via `/page-settings` endpoint sudah berjalan.  
> **Status**: ~50% selesai. Tinggal implementasi 7 halaman lainnya + integrasi ke backend real.  
> Backend: Belum diperiksa / belum dikerjakan.

---

## Progress Checklist

### Infrastruktur & Setup
- [ ] Struktur folder backend sesuai `ARCHITECTURE.md`
- [x] Struktur folder frontend sesuai `ARCHITECTURE.md` — **folder ada tapi KOSONG**
- [ ] `.env.example` lengkap (backend & frontend)
- [x] `docker-compose.yml` — PostgreSQL lokal
- [x] `package.json` backend + dependency terinstall
- [x] `package.json` frontend + dependency terinstall
- [x] `drizzle.config.ts` terkonfigurasi
- [ ] Koneksi DB (`src/db/index.ts`) berjalan
- [ ] Folder `log/warn/` dan `log/error/` terbuat (gitignored)

### Database Schema & Migrasi
- [ ] Schema: `companies`
- [ ] Schema: `users`, `user_companies`
- [ ] Schema: `roles`, `permissions`, `role_permissions`, `user_roles`
- [ ] Schema: `product_categories`
- [ ] Schema: `customers`
- [ ] Schema: `invoices` (header faktur)
- [ ] Schema: `invoice_items` (baris item)
- [ ] Schema: `import_logs`, `import_log_errors`
- [ ] Schema: `metric_cache`
- [ ] Schema: `audit_logs`
- [ ] Schema: `app_configs`
- [ ] Migration files generated & applied
- [ ] Seed: 3 companies, 5 roles (is_system), permissions, role_permissions default, 1 superadmin, app_configs

### Utils Backend (`src/utils/`)
- [ ] `utils/logger.ts` — Winston: info→konsol, warn→konsol+file, error→konsol+file
- [ ] `utils/jwt.ts`
- [ ] `utils/hash.ts`
- [ ] `utils/response.ts`
- [ ] `utils/error.ts` — AppError + kode error standar
- [ ] `utils/csrf.ts`
- [ ] `utils/audit.ts` — logAudit() → tulis ke tabel audit_logs
- [ ] `utils/parser.ts` — parseCsv(), parseExcel()
- [ ] `utils/accurate.ts` — wrapper Accurate Online API
- [ ] `utils/validator.ts`

### Middleware Backend
- [ ] `cors.ts`
- [ ] `csrf.ts`
- [ ] `auth.ts`
- [ ] `rbac.ts` — requirePermission(), requireRole()
- [ ] `company-access.ts`
- [ ] `rate-limit.ts`

### Backend — Modul Auth
- [ ] `POST /auth/login` — return permissions[] di response
- [ ] `POST /auth/logout`
- [ ] `POST /auth/refresh`

### Backend — Modul Users
- [ ] `GET /users/me`
- [ ] `GET /users`
- [ ] `POST /users`
- [ ] `PUT /users/:id`
- [ ] `DELETE /users/:id`

### Backend — Modul RBAC (Dinamis)
- [ ] `GET /rbac/roles`
- [ ] `POST /rbac/roles`
- [ ] `PUT /rbac/roles/:id`
- [ ] `DELETE /rbac/roles/:id` (cek is_system)
- [ ] `PUT /rbac/roles/:id/permissions`
- [ ] `GET /rbac/permissions`
- [ ] `POST /rbac/permissions`
- [ ] `PUT /rbac/users/:userId/roles`

### Backend — Modul Companies
- [ ] `GET /companies`

### Backend — Modul Import
- [ ] `POST /import/file` — parsing CSV/Excel + insert invoices + invoice_items
- [ ] `POST /import/accurate` — fetch dari Accurate API + insert
- [ ] `GET /import/logs`
- [ ] `GET /import/logs/:id/errors`
- [ ] Deduplication (invoice_number + company_id)
- [ ] Upsert customers (first/last_invoice_date)
- [ ] Upsert product_categories
- [ ] logAudit('invoice.import') setelah berhasil

### Backend — Modul Metrics (10 Metrik)
- [ ] Metric cache infrastructure (get + set + invalidate)
- [ ] `GET /metrics/summary`
- [ ] Metrik 1: `GET /metrics/cross-selling`
- [ ] Metrik 1.1: `GET /metrics/cross-selling/detail`
- [ ] Metrik 2: `GET /metrics/avg-category`
- [ ] Metrik 3: `GET /metrics/avg-revenue`
- [ ] Metrik 4: `GET /metrics/avg-gross-profit`
- [ ] Metrik 5: `GET /metrics/high-margin-penetration`
- [ ] Metrik 6: `GET /metrics/repeat-order-rate`
- [ ] Metrik 7: `GET /metrics/expansion-rate`
- [ ] Metrik 8: `GET /metrics/dormant-rate`
- [ ] Metrik 9: `GET /metrics/dormant-value`
- [ ] Metrik 10: `GET /metrics/reactivation-rate`

### Backend — Modul Customers
- [ ] `GET /customers`
- [ ] `GET /customers/:id`

### Backend — Modul Config
- [ ] `GET /config` (mask is_secret values)
- [ ] `PUT /config/:key`

### Backend — Modul Product Categories
- [ ] `GET /product-categories`
- [ ] `PUT /product-categories/:id`

### Backend — Audit Log
- [ ] `GET /audit-logs`

### Frontend — Infrastruktur
- [x] Setup Vite 8 + React 19 + TypeScript 6
- [x] `package.json` dengan dependencies lengkap:
  - MUI (Material-UI) v9 + icons + x-data-grid + date-pickers
  - React Router DOM v7, TanStack Query v5
  - i18next + react-i18next (internationalization)
  - axios, react-hook-form, zod, notistack, recharts, dayjs
  - MSW v2 (dev-only mock server)
- [x] `vite.config.ts` — alias '@' ke './src', server host & port configured
- [x] `main.tsx` — Provider hierarchy: BrowserRouter → ThemeProvider → SnackbarProvider → ErrorBoundary → App (QueryClientProvider + AuthProvider di dalam App)
- [x] Error Boundary lengkap (`src/utils/errorBoundary.tsx`) — full-page & section-level
- [x] Theme System (`src/theme/`) — light & dark theme dengan MUI, localStorage persistence
- [x] ThemeContext dengan toggle & localStorage sync
- [x] i18n setup (`src/i18n/`) — Bahasa Indonesia & English
- [x] Translation files lengkap (id.json & en.json) — semua modul sudah ada terjemahan
- [x] `src/lib/queryClient.ts` — QueryClient dengan global error handler (notistack) + retry logic (skip retry jika 401/403)

### Frontend — API Layer
- [x] `src/api/axios.ts` — Axios instance + CSRF interceptor (auto-inject `X-CSRF-Token` di mutasi) + global 401 handler (redirect ke `/login?expired=true`)
- [x] `src/api/auth.api.ts` — login, me, logout
- [x] `src/api/dashboard.api.ts` — getDashboard
- [x] `src/api/page.api.ts` — getPageSettings (menggunakan native fetch, bukan axios)
- [ ] `src/api/metrics.api.ts` — belum ada
- [ ] `src/api/import.api.ts` — belum ada
- [ ] `src/api/customers.api.ts` — belum ada
- [ ] `src/api/rbac.api.ts` — belum ada
- [ ] `src/api/config.api.ts` — belum ada

### Frontend — Mock Server (MSW)
- [x] `src/mocks/browser.ts` — MSW Service Worker setup
- [x] `src/mocks/handlers/auth.handler.ts` — POST /auth/login, GET /auth/me, POST /auth/logout
- [x] `src/mocks/handlers/page.handler.ts` — GET /page-settings (dashboard=ready, lainnya=false)
- [x] `src/mocks/handlers/dashboard.handler.ts` — GET /dashboard (10 MetricCard dengan trend 12 bulan)
- [x] `src/mocks/handlers/metrics.handler.ts` — GET /metrics/cross-selling, /customer-metrics, /dormant-customer

### Frontend — Context & Hooks
- [x] `src/context/AuthContext.tsx` — AuthProvider, useAuth, ProtectedRoute
- [ ] `src/context/CompanyContext.tsx` — belum ada
- [x] `src/hooks/useAuth.ts` — useLoginMutation, useLogoutMutation
- [x] `src/hooks/useDashboard.ts` — useQuery wrapper ke dashboardApi
- [ ] `src/hooks/useMetrics.ts` — belum ada
- [ ] `src/hooks/useImport.ts` — belum ada
- [ ] `src/hooks/useCompany.ts` — belum ada
- [ ] `src/hooks/useRbac.ts` — belum ada

### Frontend — Komponen
- [x] `src/config/menu.tsx` — NAV_ITEMS (9 item menu dengan ikon MUI)
- [x] `src/components/layout/DashboardLayout.tsx` — AppBar + Sidebar + main content + Footer, responsive (mobile/desktop), sidebar collapse
- [x] `src/components/ui/AppBar/` — DashboardAppBar (toggle sidebar, toggle theme, logout)
- [x] `src/components/ui/Sidebar/` — Sidebar collapsible (220px / 56px), active state, divider per grup
- [x] `src/components/ui/Footer/` — Footer statis (copyright, versi)
- [x] `src/components/ui/Alert/` — AppAlert (dialog modal dengan WarningIcon)
- [x] `src/components/ui/Button/` — Button wrapper MUI dengan isLoading prop
- [x] `src/components/ui/TextField/` — TextField terintegrasi react-hook-form (Controller)
- [x] `src/components/ui/Card/` — Card wrapper MUI
- [x] `src/components/ui/LogoutButton/` — LogoutButton
- [x] `src/components/charts/StatCard/` — Kartu metrik dengan sparkline (Recharts AreaChart mini)
- [x] `src/components/charts/AreaChartWidget/` — Area chart full dengan multi-series, XAxis, YAxis, Tooltip
- [x] `src/components/charts/BarChartWidget/` — Bar chart dengan stacked option
- [x] `src/components/tables/DataTable/` — Wrapper MUI X DataGrid (pagination, sort, custom styling)
- [ ] `CompanySelector` — belum ada
- [ ] `PeriodFilter` — belum ada
- [ ] `ActiveWindowFilter` — belum ada
- [ ] `PermissionGuard` — belum ada

### Frontend — Routing & Auth Layer
- [x] `src/route/routes.tsx` — routeRegistry (9 route protected, lazy-loaded) + Login/NotFound/UnderMaintenance
- [x] `App.tsx` — Dynamic routing: query `/page-settings` dari DB/MSW → render komponen asli atau UnderMaintenance berdasarkan flag `ready`
- [x] AuthContext — login state + localStorage persistence + ProtectedRoute HOC
- [x] Redirect: `/` → `/dashboard`, 404 handler

### Frontend — Halaman
- [x] Login — **IMPLEMENTASI LENGKAP**: form (react-hook-form + zod), show/hide password, remember me UI, error dialog, i18n, API integration
- [x] Dashboard — **IMPLEMENTASI LENGKAP**: 10 StatCard metrik, 4 AreaChartWidget tren, skeleton loading, PeriodStrip, Definisi Kunci, navigasi ke halaman detail
- [x] CrossSelling — **IMPLEMENTASI LENGKAP**: AreaChart ratio, BarChart aktif vs multi-kategori, AreaChart avg-category, DataTable detail 20 customer
- [x] NotFound — selesai (404 page)
- [x] UnderMaintenance — selesai (animasi gears)
- [~] CustomerMetrics — **PLACEHOLDER** (belum diimplementasi)
- [~] DormantCustomer — **PLACEHOLDER** (belum diimplementasi)
- [~] Import — **PLACEHOLDER** (belum diimplementasi)
- [~] Users — **PLACEHOLDER** (belum diimplementasi)
- [~] RBAC — **PLACEHOLDER** (belum diimplementasi)
- [~] Config — **PLACEHOLDER** (belum diimplementasi)
- [~] AuditLog — **PLACEHOLDER** (belum diimplementasi)

---

## Sedang Dikerjakan

| Task | Oleh | File / Branch | Catatan |
|------|------|---------------|---------|
| _(tidak ada)_ | | | Sesi 6 selesai |

---

## Akan Dikerjakan Selanjutnya

1. **Frontend — Halaman yang Belum Diimplementasi** (prioritas tinggi):
   - CustomerMetrics: AreaChart avg-revenue, avg-GP, high-margin, repeat-order, expansion-rate + DataTable
   - DormantCustomer: AreaChart dormant-rate, reactivation-rate, dormant-value + DataTable customer dormant
   - Import: form upload file CSV/XLSX + trigger API Accurate + progress feedback
   - Users: DataTable users + form create/edit/delete
   - RBAC: tabel role, permission matrix (checkbox), assign role ke user
   - Config: form update app_configs (dormant threshold, cache TTL, Accurate API key per company)
   - AuditLog: DataTable audit log dengan filter

2. **Frontend — Komponen yang Belum Ada**:
   - `CompanyContext` + `CompanySelector` — filter per entitas perusahaan
   - `PeriodFilter` + `ActiveWindowFilter` — filter periode dan window aktif di Dashboard
   - `PermissionGuard` — cek permission dari AuthContext (bukan cek nama role)

3. **Backend — Seluruh implementasi** (belum mulai):
   - Database schema + migration + seed
   - Utils backend (logger, jwt, hash, response, error, audit, parser, accurate)
   - Semua modul: auth, users, rbac, companies, import, metrics, customers, config, audit-log

---

## Hambatan / Blocker

| Masalah | Status | Lokasi | Catatan |
|---------|--------|--------|---------|
| ~~Frontend tidak ada implementasi sama sekali~~ | **RESOLVED** | frontend/ | Routing & auth layer sudah selesai |
| Format kolom CSV/Excel export Accurate belum dikonfirmasi | Open | `utils/parser.ts` | Perlu sample file dari tim |
| Endpoint & auth Accurate Online API belum dikonfirmasi | Open | `utils/accurate.ts` | Perlu dokumentasi API Accurate |
| Definisi kategori "jasa/service" di Accurate belum jelas | Open | `product_categories` | Apakah ada kode khusus atau flag manual? |

---

## Keputusan Terbaru

| Tanggal | Keputusan | Alasan |
|---------|-----------|--------|
| 2026-06-16 | App.tsx tanpa BrowserRouter | BrowserRouter sudah di main.tsx, avoid double nesting |
| 2026-06-16 | Lazy loading semua pages dengan Suspense | Optimasi performa, code splitting |
| 2026-06-16 | Route config dengan flag `ready` | Halaman belum siap otomatis ke UnderMaintenance |
| 2026-06-16 | Pakai MUI (Material-UI) bukan Tailwind + shadcn | Sudah terpasang di package.json, theme system sudah dibuat |
| 2026-06-16 | i18n wajib (ID & EN) | Sudah disetup dengan terjemahan lengkap |
| 2024-XX-XX | Satu DB, filter company_id | 3 entitas, tidak over-engineering |
| 2024-XX-XX | invoices + invoice_items (bukan 1 tabel) | Accurate: 1 invoice bisa N item produk |
| 2024-XX-XX | RBAC dinamis seperti Spatie | Fleksibilitas tanpa redeploy |
| 2024-XX-XX | Logger: activity konsol saja, warn/error ke file | Sesuai kebutuhan — audit bisnis ke DB |
| 2024-XX-XX | Audit log ke DB (audit_logs) | Bisa di-query dan ditampilkan di dashboard |
| 2024-XX-XX | Accurate API key di app_configs per company | Tiap entitas punya credential berbeda |

---

## File Aktif Dikerjakan

```
frontend/tsconfig.json — fix TypeScript 6 errors
docs/CONTEXT_STATE.md — diupdate dengan hasil sesi 6
```

---

## Catatan Sesi Terakhir

> **Sesi 6 — Fix TypeScript Errors (2026-06-17 02:55)**
>
> ### Yang Diperbaiki:
>
> **`frontend/tsconfig.json`** — 2 error diperbaiki:
> 1. ✅ Hapus `"baseUrl": "."` (deprecated di TS 6) → gunakan `paths` standalone tanpa `baseUrl`. TS 6 mendukung `paths` tanpa `baseUrl` sehingga tidak perlu `ignoreDeprecations`.
> 2. ✅ Ubah `"lib": ["ES2020", ...]` → `"lib": ["ES2022", ...]` → menghilangkan `TS2550: Property 'at' does not exist on type` (Array.prototype.at() tersedia mulai ES2022)
>
> ### Hasil: `npx tsc --noEmit` → **0 errors** ✅
>
> ---
>
> **Sesi 5 — Implementasi Layout, API Layer, Dashboard, Login, CrossSelling (2026-06-17)**
>
> ### Yang Sudah Diimplementasi:
>
> **1. API Layer & Mock Server**
> - ✅ `src/api/axios.ts` — Axios instance dengan CSRF interceptor + global 401 redirect
> - ✅ `src/api/auth.api.ts`, `dashboard.api.ts`, `page.api.ts`
> - ✅ `src/lib/queryClient.ts` — QueryClient dengan global error via notistack, retry logic pintar (skip jika 401/403/COMPANY_ACCESS_DENIED)
> - ✅ MSW mock server aktif untuk 4 domain: auth, page, dashboard, metrics
> - ✅ Dynamic routing: App.tsx query `/page-settings` → hanya `dashboard` yang `ready=true`
>
> **2. Layout Utama**
> - ✅ `DashboardLayout` — wrapper dengan AppBar fixed + Sidebar collapsible + main scrollable + Footer pinned
> - ✅ `DashboardAppBar` — toggle sidebar, toggle light/dark, logout
> - ✅ `Sidebar` — collapsible (220px/56px), active state, group divider, tooltip saat collapsed, mobile temporary drawer
> - ✅ `Footer` — statis (copyright + versi)
> - ✅ `src/config/menu.tsx` — 9 NAV_ITEMS dengan ikon MUI
>
> **3. Komponen UI & Chart**
> - ✅ `StatCard` — kartu metrik dengan sparkline Recharts + trend badge + navigasi ke detail
> - ✅ `AreaChartWidget` — multi-series area chart dengan XAxis, YAxis, Tooltip, Legend
> - ✅ `BarChartWidget` — bar chart dengan stacked option
> - ✅ `DataTable` — wrapper MUI X DataGrid dengan custom styling (borderRadius 0, uppercase header)
> - ✅ `TextField`, `Button`, `Card`, `Alert`, `LogoutButton` — komponen UI dasar
>
> **4. Halaman yang Diimplementasi**
> - ✅ **Login** — form react-hook-form + zod, show/hide password, remember me (UI only), error dialog, i18n, redirect ke halaman asal setelah login
> - ✅ **Dashboard** — 10 StatCard (grid 5 kolom), 4 AreaChartWidget tren, skeleton loading, PeriodStrip, tabel Definisi Kunci
> - ✅ **CrossSelling** — AreaChart ratio 12 bulan, BarChart aktif vs multi-kategori, AreaChart avg-category, DataTable 20 baris customer detail
>
> **5. Routes yang Tersedia**
> ```
> /login              → Login page (public, redirect ke /dashboard jika sudah auth)
> /                   → redirect ke /dashboard
> /dashboard          → Dashboard (protected, AKTIF — ready=true di MSW)
> /cross-selling      → CrossSelling (protected, UnderMaintenance — ready=false)
> /customer-metrics   → CustomerMetrics (protected, UnderMaintenance)
> /dormant-customer   → DormantCustomer (protected, UnderMaintenance)
> /import             → Import (protected, UnderMaintenance)
> /users              → Users (protected, UnderMaintenance)
> /rbac               → RBAC (protected, UnderMaintenance)
> /config             → Config (protected, UnderMaintenance)
> /audit-log          → AuditLog (protected, UnderMaintenance)
> /*                  → 404 NotFound
> ```
>
> ### Provider Hierarchy (FINAL):
> ```
> main.tsx:
>   BrowserRouter
>     ThemeProvider (MUI + CssBaseline + localStorage)
>       SnackbarProvider (notistack)
>         ErrorBoundary
>           App.tsx:
>             QueryClientProvider
>               AuthProvider
>                 AppRouter (query /page-settings → dynamic routes)
>                   Suspense → Routes → Route...
> ```
>
> ### Catatan Penting:
> - ⚠️ Auth token disimpan di `localStorage` (bukan httpOnly Cookie) — ini untuk dev/MSW mock. Saat integrasi backend real, perlu migrasi ke httpOnly Cookie sesuai desain di `AI_RULES.md`
> - ⚠️ `rememberMe` di Login hanya UI — belum ada logika (persist session lebih lama)
> - ⚠️ `useLogoutMutation` tidak membersihkan React Query cache setelah logout (ada TODO di komentar)
> - ⚠️ CrossSelling page sudah diimplementasi penuh tapi MSW `page-settings` masih `ready=false`, jadi user yang ke `/cross-selling` akan melihat UnderMaintenance
>
> ### Status Progress:
> - Infrastruktur: 100% ✅
> - Routing & Auth Layer: 100% ✅
> - Layout Components: 100% ✅
> - API Layer (frontend): ~30% (hanya auth, dashboard, page-settings)
> - Mock Server (MSW): 100% untuk domain yang ada ✅
> - Halaman: ~35% (3 dari 9 halaman utama selesai)
> - Backend: 0% ❌
>
> ### Kesimpulan:
> Proyek sekarang **~50% frontend selesai**.
>
> **Next Step**:
> 1. Implementasi CustomerMetrics, DormantCustomer (chart + table)
> 2. Buat MSW mock untuk masing-masing halaman, set `ready=true` di page-settings
> 3. Tambah CompanyContext + CompanySelector
> 4. Mulai backend (schema DB)
>
> ---
>
> **Sesi 4 — Implementasi Routing & Auth Layer (2026-06-16 19:56)**
> - ✅ App.tsx routing + lazy loading + ProtectedRoute
> - ✅ AuthContext (user state, localStorage, login, logout, useAuth hook)
> - ✅ NotFound, UnderMaintenance pages
> - ✅ Semua 10 halaman placeholder tersedia
> - ⚠️ Semua route masih `ready: false` saat itu
>
> ---
>
> **Sesi 2–3 — Review & Revisi Dokumen (2026-06-16)**
> - Revisi docs: logger, audit, RBAC, struktur faktur, sumber data Accurate
> - Review kode: infrastruktur selesai, implementasi 0%
>
> ---
>
> **Perlu dikonfirmasi sebelum mulai kode backend:**
> 1. Sample file CSV/Excel export Accurate (format kolom aktual)
> 2. Dokumentasi / endpoint Accurate Online API
> 3. Apakah kategori "jasa" di Accurate punya kode khusus atau perlu flag manual?
