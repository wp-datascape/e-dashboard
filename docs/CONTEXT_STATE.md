# CONTEXT_STATE.md — Status & Konteks Pengerjaan

> Update file ini di **awal dan akhir setiap sesi kerja**.

**Terakhir diperbarui**: 2026-06-16 19:56  
**Diperbarui oleh**: AI (Kiro)

---

## Status Saat Ini

**Fase**: `[x] Setup` / `[~] Development` / `[ ] Integration` / `[ ] Testing` / `[ ] MVP Done`

**Ringkasan**:
> Frontend: Infrastruktur lengkap + App.tsx dengan routing sudah diimplementasi. AuthContext tersedia. Semua pages punya placeholder.  
> **Status**: Routing & auth layer sudah siap. Tinggal implementasi konten halaman dan layout utama.  
> Backend: Belum diperiksa.

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
- [x] Setup Vite + React 19 + TypeScript
- [x] `package.json` dengan dependencies lengkap:
  - MUI (Material-UI) v9 + icons + x-data-grid + date-pickers
  - React Router DOM v7
  - i18next + react-i18next (internationalization)
  - axios, react-hook-form, zod, notistack, recharts, dayjs
- [x] `vite.config.ts` — alias '@' ke './src', server host & port configured
- [x] `main.tsx` — Provider hierarchy: BrowserRouter → ThemeProvider → SnackbarProvider → ErrorBoundary → App
- [x] Error Boundary lengkap (`src/utils/errorBoundary.tsx`) — full-page & section-level
- [x] Theme System (`src/theme/`) — light & dark theme dengan MUI, localStorage persistence
- [x] ThemeContext dengan toggle & localStorage sync
- [x] i18n setup (`src/i18n/`) — Bahasa Indonesia & English
- [x] Translation files lengkap (id.json & en.json) — semua modul sudah ada terjemahan

### Frontend — Struktur Folder & File
- [x] Folder `src/api/` — **KOSONG** (belum ada axios instance)
- [x] Folder `src/context/` — ✅ **AuthContext.tsx sudah ada**
- [x] Folder `src/hooks/` — **KOSONG** (belum ada custom hooks)
- [x] Folder `src/components/charts/` — **KOSONG**
- [x] Folder `src/components/layout/` — **KOSONG**
- [x] Folder `src/components/tables/` — **KOSONG**
- [x] Folder `src/pages/Dashboard/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/Login/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/CrossSelling/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/CustomerMetrics/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/DormantCustomer/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/Import/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/Users/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/RBAC/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/Config/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/AuditLog/` — ✅ **Placeholder tersedia**
- [x] Folder `src/pages/NotFound/` — ✅ **Sudah diimplementasi**
- [x] Folder `src/pages/UnderMaintenance/` — ✅ **Sudah diimplementasi**

### Frontend — Routing & Auth Layer
- [x] **App.tsx dengan routing lengkap** — Routes, lazy loading, protected routes
- [x] `AuthContext` — login state + localStorage persistence + ProtectedRoute HOC
- [x] Halaman NotFound — 404 page dengan navigasi
- [x] Halaman UnderMaintenance — untuk fitur yang belum siap
- [x] Route configuration dengan flag `ready` (saat ini semua `false` → UnderMaintenance)

### Frontend — Implementasi (PLACEHOLDER / BELUM LENGKAP)
- [~] Halaman: Login — **placeholder saja, perlu form & integrasi API**
- [~] Halaman: Dashboard — **placeholder saja, perlu metrik cards & charts**
- [~] Halaman: Cross Selling — **placeholder**
- [~] Halaman: Customer Metrics — **placeholder**
- [~] Halaman: Dormant Customer — **placeholder**
- [~] Halaman: Import Data — **placeholder**
- [~] Halaman: Users — **placeholder**
- [~] Halaman: RBAC — **placeholder**
- [~] Halaman: Config — **placeholder**
- [~] Halaman: Audit Log — **placeholder**

### Frontend — Implementasi (BELUM ADA)
- [ ] Axios instance + CSRF interceptor
- [ ] `CompanyContext` — entitas aktif dengan selector
- [ ] `PermissionGuard` — cek permission dari AuthContext
- [ ] Layout utama: `AppBar`, `Sidebar`, `Content area`
- [ ] Komponen: `CompanySelector`, `PeriodFilter`, `ActiveWindowFilter`, `MetricCard`
- [ ] Implementasi lengkap halaman Login (form, validasi, error handling)
- [ ] Implementasi lengkap halaman Dashboard (10 metrik, charts)
- [ ] Implementasi lengkap semua halaman lainnya

---

## Sedang Dikerjakan

| Task | Oleh | File / Branch | Catatan |
|------|------|---------------|---------|
| _(tidak ada)_ | | | Sesi 4 selesai |

---

## Akan Dikerjakan Selanjutnya

1. **Frontend - Layout & Components dasar** (prioritas tinggi):
   - Layout utama (AppBar dengan theme toggle, Sidebar dengan menu navigasi)
   - Axios instance + interceptor (CSRF, auth token)
   - CompanyContext + CompanySelector component
   - Implementasi lengkap halaman Login (form dengan react-hook-form + zod)
   
2. **Frontend - Dashboard & Metric Components**:
   - MetricCard component untuk display metrik
   - PeriodFilter, ActiveWindowFilter components
   - Implementasi Dashboard dengan placeholder data

3. **Backend - Utils & Infrastruktur** (parallel):
   - Database schema + migration + seed
   - Utils backend (logger, jwt, hash, response, error, audit)

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
docs/CONTEXT_STATE.md — diupdate dengan hasil implementasi routing & auth
```

---

## Catatan Sesi Terakhir

> **Sesi 4 — Implementasi Routing & Auth Layer (2026-06-16 19:56)**
>
> ### Yang Sudah Diimplementasi:
> 
> **1. App.tsx — Routing Lengkap**
> - ✅ Routes configuration dengan lazy loading (code splitting optimal)
> - ✅ AuthProvider wrapping semua routes
> - ✅ ProtectedRoute HOC untuk routes yang butuh auth
> - ✅ Suspense dengan PageLoader fallback (CircularProgress)
> - ✅ Route config dengan flag `ready: boolean` untuk toggle UnderMaintenance
> - ✅ Redirect root `/` ke `/dashboard`
> - ✅ 404 handler dengan NotFound page
> - ⚠️ **PENTING**: Tidak ada BrowserRouter di App.tsx (sudah di main.tsx)
>
> **2. AuthContext (`src/context/AuthContext.tsx`)**
> - ✅ User state management (id, name, email, role)
> - ✅ Token management dengan localStorage persistence
> - ✅ `isAuthenticated` dan `isLoading` state
> - ✅ `login()` dan `logout()` functions
> - ✅ `useAuth()` hook
> - ✅ `ProtectedRoute` component untuk route guarding
> - ✅ Auto-redirect ke `/login` jika belum auth
>
> **3. Halaman-Halaman (Placeholder)**
> - ✅ NotFound (`/pages/NotFound/index.tsx`) — lengkap dengan navigasi
> - ✅ UnderMaintenance (`/pages/UnderMaintenance/index.tsx`) — untuk fitur belum siap
> - ✅ Login, Dashboard, CrossSelling, CustomerMetrics, DormantCustomer — placeholder
> - ✅ Import, Users, RBAC, Config, AuditLog — placeholder
> - ⚠️ Semua route saat ini `ready: false` → akan ke UnderMaintenance
>
> **4. Routes yang Tersedia**
> ```
> /login              → Login page (public)
> /                   → redirect ke /dashboard
> /dashboard          → Dashboard (protected, UnderMaintenance)
> /cross-selling      → Cross Selling (protected, UnderMaintenance)
> /customer-metrics   → Customer Metrics (protected, UnderMaintenance)
> /dormant-customer   → Dormant Customer (protected, UnderMaintenance)
> /import             → Import Data (protected, UnderMaintenance)
> /users              → Users (protected, UnderMaintenance)
> /rbac               → RBAC (protected, UnderMaintenance)
> /config             → Config (protected, UnderMaintenance)
> /audit-log          → Audit Log (protected, UnderMaintenance)
> /*                  → 404 NotFound
> ```
>
> ### Provider Hierarchy (BENAR):
> ```
> main.tsx:
>   BrowserRouter
>     ThemeProvider
>       SnackbarProvider
>         ErrorBoundary
>           App.tsx:
>             AuthProvider
>               Suspense
>                 Routes
>                   Route...
> ```
>
> ### Status Progress:
> - Infrastruktur: 100% ✅
> - Routing & Auth Layer: 100% ✅
> - Layout Components: 0% ❌
> - Page Implementation: 5% (placeholder only)
> - API Integration: 0% ❌
>
> ### Kesimpulan:
> Proyek sekarang **~25% selesai**. Foundation sudah solid.
> 
> **Next Step**: 
> 1. Buat Layout utama (AppBar + Sidebar)
> 2. Implementasi halaman Login yang lengkap
> 3. Setup axios instance dengan interceptor
>
> ---
>
> **Sesi 3 — Review Kode Frontend (2026-06-16 19:38)**
>
> ### Yang Sudah Ada (Infrastruktur):
> - ✅ Setup modern: React 19, TypeScript, Vite
> - ✅ Dependencies lengkap: MUI v9, React Router v7, i18next, axios, react-hook-form, zod
> - ✅ Error boundary komprehensif (full-page & section-level)
> - ✅ Theme system dengan light/dark mode + localStorage persistence
> - ✅ i18n support lengkap (ID & EN) dengan translation untuk semua modul
> - ✅ Provider hierarchy proper di main.tsx
> - ✅ Vite config dengan alias '@' dan server setup
>
> ### Masalah Kritis:
> - ❌ **App.tsx masih template default Vite** (logo, counter) — tidak ada routing atau logika app
> - ❌ **SEMUA folder kosong**: pages (10 folder), components (3 folder), api, context, hooks
> - ❌ Tidak ada satupun komponen React yang diimplementasi
> - ❌ Tidak ada axios instance atau API client
> - ❌ Tidak ada AuthContext atau CompanyContext
> - ❌ Tidak ada custom hooks
>
> ### Kesimpulan:
> Proyek baru 15% selesai (infrastruktur saja). Implementasi fitur 0%.
> 
> **Next Step**: Mulai implementasi dari routing + auth + layout.
>
> ---
>
> **Sesi 2 — Revisi dokumen berdasarkan input:**
> 1. Logger: info/activity → konsol saja; warn → konsol + log/warn/; error → konsol + log/error/
> 2. Audit log → DB tabel audit_logs (bukan file)
> 3. RBAC dinamis — tambah modul /rbac/ di backend dan halaman RBAC di frontend
> 4. Struktur faktur: invoices (header) + invoice_items (N baris per invoice)
> 5. Sumber data Accurate Online: upload file + API Accurate (keduanya di MVP)
> 6. Nama tabel: transactions → invoices + invoice_items; upload → import
>
> **Perlu dikonfirmasi sebelum mulai kode:**
> 1. Sample file CSV/Excel export Accurate (format kolom aktual)
> 2. Dokumentasi / endpoint Accurate Online API
> 3. Apakah kategori "jasa" di Accurate punya kode khusus atau perlu flag manual?
