# CONTEXT_STATE.md — Status & Konteks Pengerjaan

> Update file ini di **awal dan akhir setiap sesi kerja**.

**Terakhir diperbarui**: 2026-06-17 15:54  
**Diperbarui oleh**: AI (Claude)

---

## Status Saat Ini

**Fase**: `[x] Setup` / `[~] Development` / `[ ] Integration` / `[ ] Testing` / `[ ] MVP Done`

**Ringkasan**:
> Frontend: ~75% selesai. Semua halaman metrik utama (Dashboard, CrossSelling, CustomerMetrics, DormantCustomer) sudah diimplementasi penuh dengan chart types sesuai spesifikasi bisnis. 6 komponen chart baru ditambahkan. StatCard didesain ulang dengan layout 2 kolom (teks kiri + line chart kanan). MSW mock server lengkap untuk semua metrik.  
> **Backend**: Belum dikerjakan (0%).

---

## Progress Checklist

### Infrastruktur & Setup
- [ ] Struktur folder backend sesuai `ARCHITECTURE.md`
- [x] Struktur folder frontend sesuai `ARCHITECTURE.md`
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
- [ ] Metrik 1+1.1+2: `GET /metrics/cross-selling`
- [ ] Metrik 3–7: `GET /metrics/customer-metrics`
- [ ] Metrik 8–10: `GET /metrics/dormant-customer`
- [ ] `GET /dashboard` — 10 MetricCard summary

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
- [x] `main.tsx` — Provider hierarchy lengkap
- [x] Error Boundary (`src/utils/errorBoundary.tsx`)
- [x] Theme System — light & dark theme, localStorage persistence
- [x] i18n setup — Bahasa Indonesia & English
- [x] `src/lib/queryClient.ts` — QueryClient dengan global error handler

### Frontend — API Layer
- [x] `src/api/axios.ts` — Axios instance + CSRF interceptor + global 401 handler
- [x] `src/api/auth.api.ts` — login, me, logout
- [x] `src/api/dashboard.api.ts` — getDashboard
- [x] `src/api/page.api.ts` — getPageSettings
- [ ] `src/api/metrics.api.ts` — belum ada (saat ini inline di masing-masing page)
- [ ] `src/api/import.api.ts` — belum ada
- [ ] `src/api/customers.api.ts` — belum ada
- [ ] `src/api/rbac.api.ts` — belum ada
- [ ] `src/api/config.api.ts` — belum ada

### Frontend — Mock Server (MSW)
- [x] `src/mocks/browser.ts` — MSW Service Worker setup
- [x] `src/mocks/handlers/auth.handler.ts` — POST /auth/login, GET /auth/me, POST /auth/logout
- [x] `src/mocks/handlers/page.handler.ts` — GET /page-settings
- [x] `src/mocks/handlers/dashboard.handler.ts` — GET /dashboard (10 MetricCard + trend 12 bulan)
- [x] `src/mocks/handlers/metrics.handler.ts` — GET /metrics/cross-selling (incl. heatmap), /customer-metrics (incl. donut + radial data), /dormant-customer (incl. value ranking + bullet data)

### Frontend — Context & Hooks
- [x] `src/context/AuthContext.tsx` — AuthProvider, useAuth, ProtectedRoute
- [ ] `src/context/CompanyContext.tsx` — belum ada
- [x] `src/hooks/useAuth.ts` — useLoginMutation, useLogoutMutation
- [x] `src/hooks/useDashboard.ts` — useQuery wrapper ke dashboardApi
- [ ] `src/hooks/useMetrics.ts` — belum ada (inline di pages)
- [ ] `src/hooks/useImport.ts` — belum ada
- [ ] `src/hooks/useCompany.ts` — belum ada
- [ ] `src/hooks/useRbac.ts` — belum ada

### Frontend — Komponen Chart
- [x] `src/components/charts/StatCard/` — **Redesigned**: layout 2 kolom (teks kiri + SimpleLineChart kanan, tanpa axes)
- [x] `src/components/charts/AreaChartWidget/` — Area chart multi-series dengan gradient
- [x] `src/components/charts/BarChartWidget/` — Bar chart: stacked, grouped, horizontal layout, tooltipFormatter
- [x] `src/components/charts/HeatmapWidget/` — **BARU**: Heatmap matrix grid (Customer × Produk, hijau/abu)
- [x] `src/components/charts/ComboChartWidget/` — **BARU**: Combo Bar+Line dengan dual Y-axis
- [x] `src/components/charts/DonutChartWidget/` — **BARU**: Donut chart dengan center label
- [x] `src/components/charts/RadialBarWidget/` — **BARU**: Radial ring progress, warna dinamis (hijau/kuning/merah)
- [x] `src/components/charts/LineAlertWidget/` — **BARU**: Line chart + red alert shading di atas threshold
- [x] `src/components/charts/BulletChartWidget/` — **BARU**: Bullet chart dengan target band
- [x] `src/components/tables/DataTable/` — Wrapper MUI X DataGrid
- [ ] `CompanySelector` — belum ada
- [ ] `PeriodFilter` — belum ada
- [ ] `ActiveWindowFilter` — belum ada
- [ ] `PermissionGuard` — belum ada

### Frontend — Halaman
- [x] Login — form + validasi + error dialog + i18n
- [x] Dashboard — **DIPERBARUI**: 10 StatCard (layout baru) + 7 chart widget sesuai spec (BarChart, AreaChart, DonutChart, RadialBar, LineAlert, BulletChart) + Definisi Kunci
- [x] CrossSelling — **IMPLEMENTASI LENGKAP**: M1 (Grouped Bar + Ratio Bar), M1.1 (Heatmap), M2 (Area Chart hijau), DataTable
- [x] CustomerMetrics — **IMPLEMENTASI LENGKAP**: M3 (ComboChart), M4 (Stacked Column), M5 (DonutChart), M6 (RadialBar), M7 (100% Stacked Horizontal Bar)
- [x] DormantCustomer — **IMPLEMENTASI LENGKAP**: M8 (LineAlert threshold 10%), M9 (Horizontal Bar Ranking), M10 (BulletChart 15–20% target)
- [x] NotFound — selesai
- [x] UnderMaintenance — selesai (animasi gears)
- [~] Import — placeholder
- [~] Users — placeholder
- [~] RBAC — placeholder
- [~] Config — placeholder
- [~] AuditLog — placeholder

---

## Sedang Dikerjakan

| Task | Oleh | File / Branch | Catatan |
|------|------|---------------|---------|
| _(tidak ada)_ | | | Sesi 9 selesai |

---

## Akan Dikerjakan Selanjutnya

1. **Frontend — Halaman yang Belum Diimplementasi**:
   - Import: form upload file CSV/XLSX + trigger API Accurate + progress feedback
   - Users: DataTable users + form create/edit/delete
   - RBAC: tabel role, permission matrix (checkbox), assign role ke user
   - Config: form update app_configs (dormant threshold, cache TTL, Accurate API key per company)
   - AuditLog: DataTable audit log dengan filter

2. **Frontend — Komponen yang Belum Ada**:
   - `CompanyContext` + `CompanySelector` — filter per entitas perusahaan
   - `PeriodFilter` + `ActiveWindowFilter` — filter periode dan window aktif di Dashboard
   - `PermissionGuard` — cek permission dari AuthContext

3. **Frontend — Refactoring (opsional)**:
   - Pindahkan inline `useQuery` di pages ke `src/hooks/useMetrics.ts`
   - Buat `src/api/metrics.api.ts` untuk centralize API calls

4. **Backend — Seluruh implementasi** (belum mulai):
   - Database schema + migration + seed
   - Utils backend (logger, jwt, hash, response, error, audit, parser, accurate)
   - Semua modul: auth, users, rbac, companies, import, metrics, customers, config, audit-log

---

## Hambatan / Blocker

| Masalah | Status | Lokasi | Catatan |
|---------|--------|--------|---------|
| ~~Frontend tidak ada implementasi sama sekali~~ | **RESOLVED** | frontend/ | Selesai sesi 5 |
| ~~CustomerMetrics placeholder~~ | **RESOLVED** | pages/CustomerMetrics | Selesai sesi 7 |
| ~~DormantCustomer placeholder~~ | **RESOLVED** | pages/DormantCustomer | Selesai sesi 7 |
| Format kolom CSV/Excel export Accurate belum dikonfirmasi | Open | `utils/parser.ts` | Perlu sample file dari tim |
| Endpoint & auth Accurate Online API belum dikonfirmasi | Open | `utils/accurate.ts` | Perlu dokumentasi API Accurate |
| Definisi kategori "jasa/service" di Accurate belum jelas | Open | `product_categories` | Apakah ada kode khusus atau flag manual? |

---

## Keputusan Terbaru

| Tanggal | Keputusan | Alasan |
|---------|-----------|--------|
| 2026-06-17 | **ARSITEKTUR FINAL: Menu struktur Makro-Mikro** | Executive Dashboard = Group 1 (Makro/Primary), Customer/Product/Transaction Workbenches = Groups 2-4 (Mikro/Supporting). Entity-driven navigation. Lihat `FINALIZED_MENU_STRUCTURE.md` |
| 2026-06-17 | StatCard redesign: layout 2 kolom (teks kiri + SimpleLineChart kanan) | Tampilan lebih modern, mengikuti screenshot referensi |
| 2026-06-17 | SimpleLineChart tanpa axes di StatCard | Hanya line murni, no X/Y axis, no grid — cleaner look |
| 2026-06-17 | 6 chart components baru: Heatmap, Combo, Donut, RadialBar, LineAlert, BulletChart | Sesuai spesifikasi teknis 10 metrik bisnis |
| 2026-06-17 | Dashboard row-2 menggunakan chart types sesuai spec per metrik | Konsistensi visual antara overview dan halaman detail |
| 2026-06-17 | BarChartWidget diperluas: layout horizontal + tooltipFormatter | Dibutuhkan untuk M7 (100% stacked horizontal) dan M9 (ranking) |
| 2026-06-16 | App.tsx tanpa BrowserRouter | BrowserRouter sudah di main.tsx |
| 2026-06-16 | Lazy loading semua pages | Optimasi performa, code splitting |
| 2026-06-16 | Route config dengan flag `ready` | Halaman belum siap otomatis ke UnderMaintenance |
| 2026-06-16 | Pakai MUI (Material-UI) bukan Tailwind | Sudah terpasang, theme system sudah dibuat |

---

## Catatan Sesi Terakhir

> **Sesi 9 — Review Project & Update Dokumentasi Agent (2026-06-17 15:54)**
>
> ### Yang Diimplementasi:
>
> **1. Dokumen Baru: `AI_AGENT_GUIDE.md`**
> - ✅ Panduan praktis lengkap untuk AI Agent dalam mengerjakan project ini
> - ✅ Katalog semua komponen frontend yang sudah ada beserta props API dan contoh penggunaan
> - ✅ Pola kode yang wajib diikuti: struktur halaman baru (5 langkah), TanStack Query pattern, API layer, custom hooks, MSW mock handler, loading/error state
> - ✅ Konvensi penamaan (PascalCase komponen, camelCase hooks/functions, dll)
> - ✅ Checklist pre-submit: frontend halaman baru, frontend komponen baru, backend endpoint baru
> - ✅ Anti-pattern yang dilarang (fetch manual, any type, console.log, query tanpa company_id, dll)
> - ✅ Panduan arsitektur menu Makro-Mikro dan 5 group navigasi
> - ✅ Pola page-settings & Under Maintenance pattern
> - ✅ i18n bilingual support pattern
> - ✅ Auth & Permission pattern + blueprint PermissionGuard
> - ✅ Status snapshot semua komponen, halaman, dan API layer
> - ✅ Urutan pengerjaan yang disarankan (Prioritas 1-4)
> - ✅ Daftar blocker & pertanyaan terbuka
>
> **2. Update `MASTER_CONTEXT.md`**
> - ✅ Tambah `AI_AGENT_GUIDE.md` ke urutan baca dokumen (posisi ke-4)
> - ✅ Tambah referensi di tabel "Referensi Dokumen"
>
> ### Hasil:
> - ✅ Agent baru dapat langsung memahami komponen apa yang sudah ada dan cara pakainya
> - ✅ Tidak ada duplikasi komponen karena panduan yang jelas
> - ✅ Checklist implementasi mencegah missing steps (i18n, routing, page-settings)
> - ✅ Anti-pattern terdokumentasi sehingga tidak perlu review berulang
>
> ---
>
> **Sesi 8 — Finalisasi Arsitektur Menu & Sinkronisasi i18n (2026-06-17 15:07)**
>
> ### Yang Diimplementasi:
>
> **1. Dokumentasi Arsitektur Final**
> - ✅ `docs/FINALIZED_MENU_STRUCTURE.md` — Arsitektur menu Makro-Mikro dengan Executive Dashboard sebagai Group 1 (Primary)
> - ✅ Update `MASTER_CONTEXT.md` — Tambah referensi ke dokumen arsitektur final
> - ✅ Update `CONTEXT_STATE.md` — Tambah keputusan arsitektur di "Keputusan Terbaru"
>
> **2. Sinkronisasi i18n (en.json & id.json)**
> - ✅ Perpendek semua menu labels untuk UX lebih baik (1-2 kata saja)
> - ✅ Tambah 10 menu item baru (customers, expansionTargets, churnRisk, crossSellMatrix, productLedger, highMarginPush, productTrend, orderLedger, projectMilestone)
> - ✅ Bilingual support lengkap (English & Bahasa Indonesia)
>
> **3. Placeholder Pages untuk Menu Baru**
> - ✅ `/pages/Customers/index.tsx` — Customer 360 & Segmentation
> - ✅ `/pages/Products/index.tsx` — Product Performance Ledger
> - ✅ `/pages/ProductsHighMargin/index.tsx` — High Margin Push List
> - ✅ `/pages/ProductsTrend/index.tsx` — Product Trend & Velocity
> - ✅ `/pages/Transactions/index.tsx` — Order Ledger
> - ✅ `/pages/Projects/index.tsx` — Project Milestone Ledger
>
> **4. Update Routing System**
> - ✅ Tambah 6 lazy imports di `routes.tsx`
> - ✅ Tambah 11 routes ke `routeRegistry` (customers, customers-expansion, products, products-high-margin, products-trend, transactions, projects)
> - ✅ Update `page.handler.ts` — Tambah 6 pageKey baru dengan flag `ready: false`
> - ✅ Set halaman existing ke `ready: true` (dashboard, cross-selling, customers-expansion, dormant-customer)
>
> **5. Menu Structure Final**
> - Group 1: Executive Dashboard (Makro) — 1 menu
> - Group 2: Customer Workbench (Mikro) — 4 menu
> - Group 3: Product & Portfolio (Mikro) — 3 menu
> - Group 4: Transaction & Revenue (Mikro) — 2 menu
> - Group 5: Admin — 5 menu
> - **Total: 15 menu items** dengan group labels untuk context
>
> ### Hasil:
> - ✅ Tidak ada lagi 404 error untuk menu baru
> - ✅ Menu yang belum ready otomatis redirect ke UnderMaintenance
> - ✅ Semua menu terintegrasi dengan page-settings dinamis
> - ✅ Menu labels singkat dan user-friendly
> - ✅ Dokumentasi arsitektur lengkap dan terstruktur
>
> ---
>
> **Sesi 7 — Implementasi Chart Widgets Sesuai Spesifikasi Bisnis (2026-06-17 11:20)**
>
> ### Yang Diimplementasi:
>
> **1. Komponen Chart Baru (6 buah)**
> - ✅ `HeatmapWidget` — Matriks grid Customer × Produk. Hijau tua = Ya (ada transaksi), Abu = Tidak. Dengan MUI Tooltip per cell.
> - ✅ `ComboChartWidget` — Recharts ComposedChart: Bar (Y-kiri) + Line (Y-kanan) dual axis. Untuk M3 (Total Revenue + Avg Revenue).
> - ✅ `DonutChartWidget` — Recharts PieChart dengan innerRadius (donut). Label % di dalam slice. Center label overlay. Untuk M5 (High Margin Penetration).
> - ✅ `RadialBarWidget` — Recharts RadialBarChart ring progress. Warna dinamis: hijau ≥80%, kuning 60–79%, merah <60%. Center value overlay. Untuk M6 (Repeat Order Rate).
> - ✅ `LineAlertWidget` — Recharts ComposedChart: Line + ReferenceArea merah transparan di atas threshold + ReferenceLine dashed. Untuk M8 (Dormant Rate threshold 10%).
> - ✅ `BulletChartWidget` — Custom CSS bullet chart: background track + target band + actual bar + tick axis. Warna berubah saat dalam target. Untuk M10 (Reactivation Rate 15–20%).
>
> **2. BarChartWidget Diperbarui**
> - ✅ Tambah prop `layout?: 'vertical' | 'horizontal'` — horizontal = BarChart rotated (untuk M7 stacked horizontal + M9 ranking)
> - ✅ Tambah prop `tooltipFormatter` — custom tooltip formatter
>
> **3. StatCard Redesign**
> - ✅ Layout berubah dari `flexDirection: 'column'` → `flexDirection: 'row'`
> - ✅ Kiri: Title (uppercase) + Value (h5) + Change badge + Subtitle
> - ✅ Kanan: Recharts `LineChart` sederhana, tanpa XAxis/YAxis/CartesianGrid/Tooltip — hanya `<Line>` murni, width 90px
>
> **4. Halaman Diimplementasi**
> - ✅ **CrossSelling** — Diperbarui: M1 (Grouped Bar + sidebar Ratio Bar + tooltip), M1.1 (HeatmapWidget), M2 (AreaChart hijau). DataTable tetap ada.
> - ✅ **CustomerMetrics** — Baru: M3 (ComboChartWidget), M4 (Stacked Column 3-tier), M5 (DonutChartWidget), M6 (RadialBarWidget), M7 (100% Stacked Horizontal BarChartWidget).
> - ✅ **DormantCustomer** — Baru: M8 (LineAlertWidget threshold 10%), M9 (Horizontal Bar Ranking descending), M10 (BulletChartWidget target 15–20%) + stat card inline.
> - ✅ **Dashboard** — Diperbarui: Row-2 chart widgets diganti dari semua AreaChart → chart type sesuai spec per metrik (Bar M1, Area M2, Donut M5, RadialBar M6, Bar M7, LineAlert M8, Bullet M10). Semua clickable → navigate ke detail page.
>
> **5. Mock Data Diperluas**
> - ✅ `metrics.handler.ts` — `/metrics/cross-selling` ditambah `heatmap` (15 customer × 5 produk deterministik) + `categories`
> - ✅ `/metrics/customer-metrics` ditambah `high_margin_current`, `repeat_order_current`, `gp_tier1/tier2/tier3`, `up_rate/flat_down_rate`
> - ✅ `/metrics/dormant-customer` ditambah `value_ranking` (sorted descending by estimated_lost_value) + `reactivation_current`
>
> ### Status Progress:
> - Infrastruktur: 100% ✅
> - Routing & Auth Layer: 100% ✅
> - Layout Components: 100% ✅
> - Chart Components: 100% (9 komponen) ✅
> - API Layer (frontend): ~30% (hanya auth, dashboard, page-settings)
> - Mock Server (MSW): 100% untuk semua domain metrik ✅
> - Halaman metrik: **~75%** (5 dari 9 halaman utama selesai: Dashboard, CrossSelling, CustomerMetrics, DormantCustomer + Login)
> - Backend: 0% ❌
>
> ### Catatan Penting:
> - ⚠️ Auth token masih di `localStorage` (dev/MSW). Produksi → httpOnly Cookie
> - ⚠️ Inline `useQuery` di masing-masing page (belum dipindah ke `src/hooks/useMetrics.ts`)
> - ⚠️ `page-settings` MSW — semua halaman masih `ready: false` kecuali dashboard. Halaman yg sudah diimplementasi bisa diakses langsung via URL tapi melalui sidebar akan diredirect ke UnderMaintenance. Update `page.handler.ts` jika ingin mengaktifkan.
>
> ---
>
> **Sesi 6 — Fix TypeScript Errors (2026-06-17 02:55)**
> - ✅ `frontend/tsconfig.json` — fix `baseUrl` deprecated + `lib: ES2022`
> - Hasil: `npx tsc --noEmit` → **0 errors** ✅
>
> ---
>
> **Sesi 5 — Implementasi Layout, API Layer, Dashboard, Login, CrossSelling (2026-06-17)**
> - ✅ API Layer, MSW mock, Layout, Login, Dashboard, CrossSelling pertama kali
>
> ---
>
> **Perlu dikonfirmasi sebelum mulai kode backend:**
> 1. Sample file CSV/Excel export Accurate (format kolom aktual)
> 2. Dokumentasi / endpoint Accurate Online API
> 3. Apakah kategori "jasa" di Accurate punya kode khusus atau perlu flag manual?