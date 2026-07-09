# CURRENT_STATE.md — Status Pengerjaan

> Update file ini setiap sesi kerja selesai.

## Overall Progress
| Layer    | Status | Notes                          |
|----------|--------|--------------------------------|
| Frontend | ~99%   | Button-level CRUD guards (useCan hook) di semua halaman. Filter bar (entitas+divisi+periode) di semua halaman metrics. Sidebar collapsed submenu flyout fix (sesi 26). Fix logout tidak invalidasi sesi server (sesi 29). PWA installable (service worker + icon, sesi 31), fix status bar iOS + tabel tablet (sesi 33). Semua dialog konsisten pakai komponen `Dialog` bersama — 6 raw MUI Dialog + 4 drawer detail dimigrasikan (sesi 34). Error API di-i18n via kode (`getApiErrorMessage`), 9 i18n key hilang ditambahkan, audit log action i18n dibangun ulang (13→28 action), fix bug logout redirect 404 (sesi 36). **Logo/favicon/PWA icon baru (four-leaf clover), fix bug scope-leak dropdown Company/Branch/Division (`companyId==='all'` — komponen baru `ScopeFilterFields` dipasang di 9 halaman), fix icon date/month picker invisible di light mode (7 halaman → komponen `DatePicker`), preferensi user (theme/palette/bahasa) tersimpan ke akun + avatar menu pengganti tombol Logout, AppBar ikut palette (sesi 38, Task003)**. **Fix responsive mobile (`ScopeFilterFields` full-width, `Box`+`gap` bukan `Stack`+`spacing`, word-break `ResponsiveListView`), variant Typography baru `pageTitle`/`pageSubtitle` ikut palette (22 halaman + Dialog), 3 palette baru Purple/Rose/Indigo (total 6), logo jadi outline putih transparan, fix `ThemeToggle` beda tampilan mobile-desktop (`flexShrink:0`), stagger debounce chart (sesi 39)**. |
| Backend  | ~98%   | Auth selesai. requirePermission di semua route. M1–M2, M8–M10, Product Trend (avg-category), Transactions, Dashboard live (real backend). API Docs (Swagger UI) 83 operasi/63 path (sesi 29). Users bulk import + reset password (sesi 30). Backend di-Dockerize + obfuscate untuk deploy Railway (sesi 31). **Fix bug RBAC: `metrics.route.ts` pakai permission deprecated (semua role non-superadmin selalu 403), `GET /companies` & High Margin List kini pakai `resolveCompanyScope` (sesi 32/34)**. Seed baseline permission otomatis utk role `admin`/`user` (sesi 32). **Isolasi data superadmin — List User & Audit Log disembunyikan total dari viewer non-superadmin (sesi 37)**. **Fix query dashboard timeout `company_id=all` (index invoices + `statement_timeout`), fix unique constraint dedup invoice yang tidak pernah ke-generate, `branch_division_enforcement_enabled` default diubah jadi `true`, endpoint self-service baru `PATCH /auth/me/preferences` (sesi 38, Task003)**. |
| Database | ~80%   | 21 tabel aktif + 88 permissions (kategori `Order` di-rename `Transaction`, permission key `order:*` → `transaction:*`). `business_configs` tambah 3 key baru (dormant alert + reactivation target). **`users` tambah kolom `preferences` (JSONB) + 2 index baru di `invoices` (`customer_id`/`company_id` + `invoice_date`) (sesi 38, migration 0006-0008 — baru jalan lokal, BELUM di production, lihat `docs-v2/task/task003.md` §5)**. |
| Docs     | ✅ ~100%   | metrics.md, transactions.md, dashboard.md, permissions.md, ui-patterns.md, deployment.md, users.md — lihat riwayat sesi untuk detail per-file. Diaudit & disinkronkan menyeluruh sesi 35 (2026-07-04). |
| i18n     | ✅ 100%   | **Zero hardcode** — seluruh `pages/**`+`components/**` full i18n (react-i18next), 841/841 key parity EN/ID (sesi 27). |

## Frontend — Page Status

### Done
| Page             | Route               | Notes                        |
|------------------|---------------------|------------------------------|
| Dashboard        | `/dashboard`        | 10 MetricCards + 9 charts — **real backend (sesi 26)**, agregator dari 3 service metrics existing + 1 query baru (dormant_value) |
| Cross Selling    | `/cross-selling`    | M1 ratio + M1.1 heatmap (item_type) + M2 — **real backend, filter Entitas+Divisi+Tanggal** |
| Customer Metrics | `/customer-metrics` | M3 Revenue, M4 Gross Profit, M5 High Margin, M6 Repeat Order, M7 Expansion — **real API from DB** |
| Classification Rules | `/settings/classification` | CRUD classification rules, backend real API |
| Threshold Settings | `/settings/threshold` | Konfigurasi threshold metrik, backend real API |
| App Settings | `/settings/app` | Theme + language settings |
| Integration | `/config/integration` | Accurate integration config |
| Features | `/config/features` | Feature flags management |
| Dormant Customer | `/dormant-customer` | M8 M9 M10 — **real backend, threshold dinamis dari DB, filter Entitas+Divisi+Periode** |
| Config           | `/config`           | 3 tabs: Business Rules, Integration, App Settings (theme + lang) |
| Users            | `/users`            | List + create + edit user, mock API |
| RBAC             | `/rbac`             | Role list, permission matrix, set permissions dialog, **57 permissions seeded** |
| Import           | `/import`           | Form upload/Accurate + riwayat log + error detail dialog, mock API |
| Customer         | `/customers`        | DataGrid + detail modal (responsive) + ComboChart trend, **real API** |
| Products         | `/products`         | Category Performance Ledger — DataGrid kategori, revenue, GP, margin |
| High Margin      | `/products/high-margin` | 2 tabs: Category Penetration + Upsell Targets, mock API |
| Product Trend    | `/products/trend`   | M2 AreaChartWidget + KPI cards (current/prev avg + % change) — **real backend `GET /metrics/avg-category` (sesi 26)**, `active_window` dari `business_configs.active_window_months` (bukan hardcode) |
| Transactions (dulu "Order Ledger") | `/transactions` | DataGrid invoice + BU filter + detail dialog (dulu drawer, dikonversi sesi 34) — **real backend `GET /invoices` (sesi 26)**, menu & permission `order:*` di-rename `transaction:*` |
| Audit Log        | `/audit-log`        | DataGrid audit trail + filter action/date, custom mobile card, mock API |
| Companies        | `/companies`        | DataGrid + CRUD + branch management, mock API |
| High Margin Settings | `/settings/high-margin` | CRUD mapping produk/kategori per periode, combobox searchable, backend real API. Filter default "All Companies" (sesi 34), di-scope `resolveCompanyScope` — buka halaman langsung tampil data sesuai company yang jadi hak akses user |
| Channel Divisions    | `/settings/divisions`   | CRUD mapping channel_name → division, filter + search, backend real API |

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
| **Customers**    | ✅ **100%** | **GET / + GET /:id, status dari business_configs, channel division filter via JOIN** |
| **Metrics M3–M7**| ✅ **Live** | GET /metrics/customer-metrics + gp/hm/ror-breakdown. Filter company+division+period. |
| **Metrics M8–M10**| ✅ **Live** | GET /metrics/dormant-customer. Trend 12 bulan (CTE last_at_me/last_at_prev_me), value ranking, threshold dari business_configs. Fix `::bigint` untuk revenue >2.1M. |
| **Metrics M1–M2**| ✅ **Live** | GET /metrics/cross-selling. KPI1 (multi-cat rate), KPI2 (avg kategori), trend 30d rolling, heatmap per item_type, detail semua customer (no LIMIT). |
| Auth             | ✅ Done | JWT httpOnly cookie + CSRF token |
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
- `auth` — login, logout, refresh, /me (dipakai di dev sebelum backend auth live)
- `dashboard` — metrics summary cards
- `metrics` — **crossSellingHandlers, customerMetricsHandlers, dormantHandlers semua DISABLED** (real backend)
- `products` — category performance, high margin detail, upsell targets, avg-category trend
- `transactions` — invoice list, invoice detail

## Sesi 28 — Obstacle (2026-06-30)

### ⚠ Obstacle: CS_INV_CTE bukan SSOT murni

**Masalah:**
`CS_INV_CTE` di `backend/src/features/metrics/repository/m1.repository.ts` memiliki logika sendiri (inline EXISTS + is_placeholder filter) yang **tidak** memanggil fungsi dari `segment.helper.ts`. Akibatnya:

- Jika definisi "active customer" diubah di `segment.helper.ts`, perubahan **tidak otomatis propagate** ke KPI 1–2
- Ada 2 tempat yang harus diubah secara manual → rawan inkonsistensi

**Ditemukan dari:** Investigasi kenapa `active_count` KPI 1 = 161 sedangkan SSOT active_customer = 135.
Root cause: `CS_INV_CTE` menghitung semua customer ber-invoice (termasuk 25 new customer + 1 placeholder), sedangkan SSOT `active_customer` hanya non-new + non-placeholder.

**Fix sementara:** `CS_INV_CTE` ditambahkan filter `is_placeholder = false` dan EXISTS subquery untuk exclude new customer — sehingga angka sekarang konsisten (135 = 135).

**Fix permanen yang belum dikerjakan:**
Refactor `CS_INV_CTE` menggunakan `cteActiveCustomers` dari `segment.helper.ts` agar benar-benar SSOT. Dengan begitu, 1 perubahan di helper cukup untuk semua consumer.

**File terdampak:**
- `backend/src/features/metrics/repository/m1.repository.ts` — CS_INV_CTE (obstacle ada di sini)
- `backend/src/features/customers/helper/segment.helper.ts` — SSOT yang harus jadi acuan

---

## Sesi 27 — Perubahan (2026-06-30)

### Investigasi & Refactor — Gap Jumlah Customer (Halaman Customer vs Halaman Expansion)

**Root cause yang ditemukan (4 penyebab perbedaan active=136/160, existing=390/348):**
1. **Halaman Customer pakai `customers.last_invoice_date` (stale)** — tidak update saat reimport atau soft-delete; Halaman Expansion query live dari `invoices`
2. **Dormant threshold berbeda**: Halaman Customer pakai per-customer threshold (`buildDormantCaseSql`) per divisi masing-masing customer; Halaman Expansion pakai threshold divisi dominan company (`resolveDormantMonths`)
3. **`is_placeholder` filter**: Halaman Expansion filter `is_placeholder = false`; Halaman Customer tidak
4. **Definisi "existing" Halaman Customer salah**: excludes active (hanya `last_invoice_date >= dormantCutoff AND < activeCutoff`), seharusnya inklusif (semua yang tidak dormant termasuk active)

**Refactor selesai — days → months (lebih akurat):**
- `segment.helper.ts`: rename `activeDays` → `activeMonths`, `dormantDays` → `dormantMonths`; SQL pakai `INTERVAL '1 month'` (bukan `× 30 * INTERVAL '1 day'`)
- `metrics.service.ts`: `resolveDormantDays` → `resolveDormantMonths`, hapus semua `* 30`
- `metrics.repository.ts`: destructuring dan semua SQL window pakai `INTERVAL '1 month'`
- TypeScript compile: `npx tsc --noEmit` — **pass, 0 error**

**Blocker dicatat di dokumentasi:**
- `features/import.md` — section `## ⚠ Blockers / Known Issues` baru
- `CURRENT_STATE.md` — 2 baris baru di tabel Known Blockers

**File yang diubah:**
- `backend/src/features/metrics/segment.helper.ts` — rename days→months, SQL interval
- `backend/src/features/metrics/metrics.service.ts` — resolveDormantMonths, hapus ×30
- `backend/src/features/metrics/metrics.repository.ts` — destructuring + SQL interval semua query
- `docs-v2/features/import.md` — blocker section baru
- `docs-v2/CURRENT_STATE.md` — 2 blocker baru + sesi ini

**Pending (belum dikerjakan):**
1. Fix `customers.repository.ts`: ganti `last_invoice_date` → live query, tambah `is_placeholder=false`, fix definisi "existing" inklusif (blocked by customer pivot key)
2. Fix `metrics.service.ts` `resolveDormantMonths` → per-customer threshold (align dengan Halaman Customer)
3. Konfirmasi: apakah Accurate CSV export include kolom `customer_code`?

---

## Sesi 26 — Perubahan (2026-06-30)

### Backend
- `GET /metrics/cross-selling` — endpoint baru, 4 repository functions (KPI, Trend, Detail, Heatmap)
  - KPI 1: customer >1 product_category / active (%)
  - KPI 2: avg distinct categories per active customer
  - Trend: 12 bulan rolling 30-day window
  - Heatmap: top 30 customer × item_type (unit/sparepart/consumable)
  - Detail: semua customer aktif tanpa LIMIT, DataGrid yang paginate
- `GET /metrics/dormant-customer` — endpoint baru, M8/M9/M10
  - Trend 12 bulan via CTE `last_at_me`/`last_at_prev_me` (historically accurate)
  - M9 value ranking: fix `::bigint` (mengganti `::int` yang overflow untuk revenue > 2.1M)
  - Threshold `dormant_rate_alert_pct`, `reactivation_target_low_pct`, `reactivation_target_high_pct` dari business_configs
- `business_configs` — seed 3 key baru: dormant_rate_alert_pct (10), reactivation_target_low_pct (15), reactivation_target_high_pct (20)
- `threshold.ts` — ThresholdConfig + DEFAULTS + parseThresholdConfigs untuk 3 field baru

### Frontend
- `CrossSelling/index.tsx` — tulis ulang total:
  - Filter bar: Entitas + Divisi + Tanggal Akhir (date picker)
  - 4 KPI cards summary
  - Bar chart trend 12 bulan (aktif vs multi-kategori + ratio chart)
  - M1.1 Heatmap kolom item_type (Unit/Sparepart/Consumable)
  - M2 Area chart full width (hapus Grid wrapper)
  - Detail table semua customer, DataGrid paginated
- `DormantCustomer/index.tsx` — baru:
  - Filter bar: Entitas + Divisi + Periode
  - Threshold dinamis dari response backend (bukan hardcode)
  - M8 LineAlertWidget + stat card, M9 BarChartWidget horizontal, M10 BulletChart + Line
- `Settings/Threshold/index.tsx` — tambah 3 KPI rows baru di section "Target KPI"
- `hooks/useMetrics.ts` — `useCrossSelling` + `useDormantCustomer` terima params (queryKey reaktif)
- `mocks/handlers/metrics.handler.ts` — semua crossSelling + dormant handler dinonaktifkan

**Disabled (real backend):** `page`, `customers`, `users`, `rbac`, `import`, `audit`, `accurate`

## Known Blockers / Decisions Pending
| Blocker                              | Owner    | Status  | Detail |
|--------------------------------------|----------|---------|--------|
| `business_unit` di customers (historis) | Dev   | ✅ Resolved | Division filter pakai `channel_divisions.division` via JOIN — bukan `customers.business_unit` yang null. Tidak perlu backfill. |
| `products` master table              | Dev      | ✅ Done | Diisi import parser dari kolom Nama Barang faktur. ID sistem, bukan Accurate. |
| `projects` table (B2B Project BU)    | PM/Dev   | Pending | 4.2 masuk MVP atau v2? |
| Split CustomerMetrics: alokasi kolom | Dev      | Todo    | customer-workbench/decisions.md #1 |
| Scope 3.3: M2 saja atau agregasi baru| Dev      | Todo    | product-workbench/decisions.md #2 |
| Scope 3.4: "kategori dormant" bukan "dead stock" | PM | Pending | product-workbench/decisions.md #3 |
| Accurate API key: per-company vs global | PM    | Pending | admin/decisions.md #1 |
| Import preview step (Opsi A vs B)    | PM/Dev   | Pending | admin/decisions.md #3 |
| Audit log permission: roles:manage atau audit:read | PM | Pending | admin/decisions.md #2 |
| **[BLOCKER] Customer pivot key tidak stabil** | PM/Dev | **Open** | Import dedup customer pakai `UPPER(name)+company_id` — rentan mismatch jika nama berubah. Fix butuh `customer_code` dari Accurate. **Pertanyaan**: apakah CSV export Accurate include kolom `customer_code`? Detail: `features/import.md#blockers` |
| **[BLOCKER] Customer page — status inakurat** | Dev | Blocked | Halaman `/customers` pakai `customers.last_invoice_date` (stale, tidak update saat reimport). Harus diganti live query `MAX(invoices.invoice_date)`. Blocked by pivot key di atas + perlu tambah `is_placeholder=false` filter + fix definisi "existing" (inklusif active). |

## Next Actions (Priority Order)
1. Build Auth + RBAC backend (JWT + CSRF) — unblock semua protected route
2. **Lanjutkan Metrics backend:**
   - ~~Fix denominator M5/M6/M7~~ ✅ Selesai
   - Build `GET /metrics/cross-selling` — M1, M1.1, M2 (gantikan MSW)
   - Build `GET /metrics/dormant-customer` — M8, M9, M10 (gantikan MSW)
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

### 2026-07-09 (sesi 40): Division Dinamis per Company/Branch (Task004 backend + Task005 frontend) — Postmortem Sesi Berbelok-belok

> Baca detail teknis lengkap di `docs-v2/task/task004.md` (backend) dan `docs-v2/task/task005.md` (frontend, 4 sesi A-D). Bagian ini fokus ke **narasi & pelajaran** — sesi ini terasa "kacau tanpa arah" karena beberapa kali berbelok akibat bukti data yang muncul belakangan, bukan karena scope creep asal-asalan. Penting dibaca dulu sebelum lanjut sesi berikutnya supaya tidak mengulang jalan yang sama.

**Masalah awal**: `division` (kategori sub-channel penjualan: distribution/project/e_commerce/intercompany/freelancer/support/other) adalah **enum hardcode global 7-nilai**, dipakai sama rata untuk 3 company holding (MKO/KNT/SKI). Taksonomi itu sebenarnya cuma milik PT MKO — KNT (model bisnis: Sales Counter + U-Card, dipecah per cabang) dan SKI (fokus manufaktur, Sales/Marketing) dipaksa masuk kategori yang tidak relevan.

**Alur berbelok (kronologis, kenapa tiap belokan terjadi):**
1. **Task004 (backend)** dibangun: tabel master baru `divisions` (mirip `company_branches`, per company+branch), ganti ~12 titik enum hardcode, RBAC scope TIDAK disentuh (division tetap `varchar`, cuma sumber validasinya yang jadi dinamis). Selesai & lolos test.
2. **Task005 (frontend)**, sengaja dipecah 4 sesi kerja terpisah (A filter dropdown, B halaman admin Divisions, C RBAC picker, D warna chip) — masing-masing diverifikasi sebelum lanjut ke sesi berikutnya.
3. **Titik belok #1** — saat verifikasi ulang, user tunjukkan bukti data faktur riil: channel "DC WEST" SELALU Jakarta, "DC EAST" SELALU Surabaya. Katalog seed awal menandai `distribution`/`project` MKO sebagai **company-wide**, padahal faktanya branch-specific. Bukan bug kode, tapi katalog yang salah merepresentasikan bisnis.
4. **Titik belok #2** — perbaikan sempat mau dilakukan dengan **edit seed.ts langsung**. User tolak keras: *"kenapa harus seed kalau ada fungsi import?"* — koreksi data bisnis harus lewat API/CRUD yang sudah ada (`PATCH/POST /settings/divisions`), bukan hardcode ulang ke bootstrap script. Ini dieksekusi lewat API.
5. **Titik belok #3 (paling penting)** — pertanyaan itu berkembang jadi pertanyaan arsitektur: kalau taksonomi sudah dikoreksi lewat API, **untuk apa `seedDivisions()` masih ada sama sekali**? Jawaban akhir: `channel_divisions` (mapping channel_name→division) SUDAH berisi keputusan admin soal kode divisi yang berlaku — tidak masuk akal ada langkah terpisah "daftarkan dulu kode divisinya" (baik lewat seed maupun lewat fitur bulk-import Divisions baru yang sempat diusulkan dan ditolak user).

**Resolusi final (bukan cuma tambal, tapi keputusan desain permanen)**:
- `divisions.service.ts` punya **2 fungsi validasi dengan filosofi beda** untuk 2 use-case beda:
  - `validateDivisionCode()` — STRICT, tolak kode tak dikenal. Dipakai HANYA untuk RBAC assign user (`user.service.ts`) — assign akses ke divisi tidak boleh auto-create divisi baru.
  - `ensureDivisionCode()` — auto-create kalau kode belum ada di katalog. Dipakai di `channel-divisions.service.ts` (create/update/import) — mapping ini sendiri adalah SSOT keputusan kode divisi.
- **`seedDivisions()`/`defaultDivisions` dihapus total dari `seed.ts`.** Katalog `divisions` sekarang murni terisi dari pemakaian nyata, bukan bootstrap hardcode. Konsekuensi diterima: di DB benar-benar kosong (fresh install), akun test admin/executif akan dapat 0 grant division sampai mapping channel pertama dibuat — dianggap benar (sistem baru memang belum ada kategorisasi bisnis apa pun untuk di-grant), bukan bug.
- Bonus temuan sepanjang jalan: kolom `branch_id` baru ditambahkan ke `channel_divisions` (awalnya sempat mau di-skip karena `channel_name` KNT "sudah unik per cabang", dikoreksi user — jangan andalkan format string implisit, harus relasi eksplisit, lihat `feedback_no_shortcuts_explicit_relations` di memory); import bulk CSV/XLSX auto-derive `branch_id` dari histori `invoices.branch_id` (bukan kolom manual — dihindari karena rawan typo/duplikat kode cabang, mis. "SMG" vs "SMRG").

**Pelajaran untuk sesi berikutnya**:
- Kalau user menunjukkan bukti data riil (invoice/faktur) yang kontradiktif dengan asumsi desain, itu **prioritas di atas rencana yang sudah disepakati** — jangan defensif mempertahankan desain awal.
- Kalau ada CRUD/API yang sudah dibuat untuk suatu data, **jangan pernah "jalan pintas" edit seed.ts** untuk koreksi data bisnis — seed cuma bootstrap DB baru, bukan tempat iterasi pemahaman bisnis yang terus berubah.
- Sebelum menambah mekanisme baru ("perlu didaftarkan dulu di tempat X"), cek dulu apakah data yang sudah ada (di sini: form mapping channel_divisions) sebenarnya SUDAH menyiratkan keputusan yang dicari — kalau iya, auto-derive/auto-create dari situ, jangan bikin sumber kebenaran baru yang terpisah.

**Verifikasi akhir**: `bunx tsc --noEmit` bersih (FE+BE), `bun test` backend 38 pass/0 fail, `bun run db:seed` dijalankan ulang tanpa `seedDivisions()` — sukses, tetap grant 31 branch-division ke akun test karena katalog sudah terisi dari koreksi API sesi ini.

**Technical debt ditemukan lewat diskusi post-mortem (dicatat, belum dikerjakan)**: akar dari sebagian besar belokan di atas adalah keputusan awal membuat `divisions.code` tetap `varchar` (bukan FK numerik `division_id → divisions.id`), demi menghindari perubahan di 24 titik `utils/scope.ts`. Konsekuensinya: `channel_divisions` terpaksa punya `branch_id` duplikat (bukan otomatis ikut lewat FK), integritas kode divisi cuma dijaga application-code (bukan constraint DB — persis yang memicu perdebatan reject-vs-auto-create di atas), dan 1 kode bisa ambigu di banyak baris (perlu tie-break manual di ~32 JOIN). Detail & opsi perbaikan: `task/task004.md` §9.

**Status commit**: dikerjakan di branch `dev`, di-commit & push ke branch baru `Feature` (bukan `dev` langsung) — belum di-merge, menunggu review.

---

### 2026-07-08 (sesi 39): Perf Chart + Fix Responsive Mobile + Theme pageTitle/pageSubtitle + 3 Palette Baru + Logo & Toggle

**Perf — frame drop saat toggle sidebar (lanjutan sesi 38's `contain:layout`/`will-change`):**
- Diukur pakai `requestAnimationFrame` timing di halaman dengan 5+ chart sekaligus (Customer Metrics): semua `ResponsiveContainer` pakai `debounce=200` yang SAMA, redraw SVG-nya numpuk di 1 tick JS pas transisi selesai — satu long-task 100ms (setara 6x waktu frame normal). Fix: debounce dibedakan per tipe widget (50-380ms, lihat komentar `StatCard.tsx`) supaya redraw menyebar ke beberapa frame, bukan numpuk.

**Fix responsive mobile (dilaporkan lewat screenshot user, halaman High Margin Push List & Audit Log):**
1. `ScopeFilterFields.tsx` (dipakai 9 halaman) — tiap dropdown Entity/Branch/Division cuma punya `minWidth` tetap, tidak full-width di mobile → field wrap 2/baris lewat `flexWrap` tapi ukurannya kepotong/numpuk. Fix: `width:{xs:'100%', sm:<value>}`.
2. `ProductsHighMargin/index.tsx` — satu-satunya dari 9 halaman pemakai `ScopeFilterFields` yang masih pakai `Stack spacing` (bukan `Box gap`). `Stack` pakai margin negatif utk spacing yang TIDAK menangani jarak antar-baris dengan benar saat `flexWrap:'wrap'` aktif (keterbatasan dikenal MUI) — field yang wrap ke baris baru nempel tanpa jarak vertikal (label field bertumpuk sama border field di atasnya). **Pattern baru dicatat di `shared/ui-patterns.md`**: SELALU pakai `Box` + CSS `gap`, bukan `Stack` + `spacing`, untuk container yang `flexWrap:'wrap'`.
3. `ResponsiveListView.tsx` (`AutoCard`, mobile card fallback) — field value fallback tidak ada `wordBreak` sama sekali, teks panjang tanpa spasi (mis. `entity_key`/URL) mendorong Box lebih lebar dari Card, keluar dari batas card. Fix: `minWidth:0` di container (wajib — default flex item tidak bisa menyusut di bawah lebar kontennya) + `wordBreak:'break-word'`.

**Theme — variant Typography baru `pageTitle`/`pageSubtitle`:**
- Judul+subjudul halaman sebelumnya pakai `variant="h5"` + `sx` manual per halaman (warna default `text.primary`, netral). User minta warna ikut palette aktif — TIDAK bisa override `h5` langsung karena `h5` JUGA dipakai untuk angka besar di `StatCard`/`DonutChartWidget` (nilai data, bukan judul).
- Solusi: custom Typography variant (`theme/index.ts`, module augmentation `@mui/material/styles` + `@mui/material/Typography`) — warna `primary.light/dark` ikut palette, didefinisikan SEKALI di `createAppTheme()`. Diterapkan ke 22 halaman + `Dialog.tsx` (judul dialog) + `ResponsiveListView.tsx` (judul Card tabel desktop).
- **Gotcha ditemukan setelah deploy pertama**: custom variant TIDAK otomatis dapat `variantMapping` MUI (mapping variant→elemen HTML), fallback ke `<span>` (inline) alih-alih block seperti `h5`/`body2` sebelumnya — title+subtitle jadi nempel 1 baris tanpa line break. Fix: `components.MuiTypography.defaultProps.variantMapping` eksplisit (`pageTitle`→`h1`, `pageSubtitle`→`p`). **Pattern dicatat**: custom Typography variant WAJIB didaftarkan di `variantMapping` juga, bukan cuma di `typography` object.

**3 varian palette warna baru — Purple, Rose, Indigo (`theme/palettes.ts` + `backend/auth.schema.ts` `COLOR_PALETTES`):**
- Total sekarang 6 pilihan (sebelumnya 3: Blue/Green/Yellow dari Task003). Warna dipilih menghindari tabrakan dengan warna semantik (success/warning/error/info) dan secondary color palette lain yang sudah ada (mis. Indigo pakai secondary sky, BUKAN cyan — persis sama dengan warna semantik `info`).
- **Wajib sinkron 2 tempat** kalau nambah palette baru: `frontend/src/theme/palettes.ts` (sumber utama, `PaletteKey` type) DAN `backend/src/features/auth/auth.schema.ts` (`COLOR_PALETTES` — validasi `PATCH /auth/me/preferences`, request akan di-reject kalau tidak disinkronkan).

**Logo (`AppLogo.tsx` + `favicon.svg` + icon PWA) — 3 iterasi sampai sesuai:**
- Iterasi 1: badge lingkaran hitam solid → dihapus, semanggi diisi fill gelap + outline putih di sekeliling siluetnya.
- Iterasi 2 (revisi user — "lingkaran DI LUAR icon"): ditambah `<circle>` outline (stroke, `fill="none"`) mengelilingi icon, bukan cuma outline nempel di garis semanggi.
- Iterasi 3 (revisi user — "hilangkan warna hitam"): SEMUA elemen (lingkaran + semanggi) jadi `fill="none"`, murni outline putih, transparan total.
- **Konsekuensi iterasi 3**: outline putih murni tidak kebaca di background putih (Login card, `background.paper` light mode) — putih di atas putih. Fix: bungkus `AppLogo` dengan `Box` lingkaran gelap KHUSUS di `Login/index.tsx` saja (bukan di `AppLogo.tsx` sendiri — AppBar tidak butuh ini, backgroundnya selalu gelap/berwarna secara alami).
- PNG icon (`icon-192`, `icon-512`, `apple-touch-icon`) di-generate ulang dari `favicon.svg` tiap iterasi (script sementara, dihapus setelah pakai — bukan bagian dari `scripts/gen-icons.mjs` yang lama, itu file STALE dari desain lightning-bolt sebelum clover, jangan dipakai). `icon-maskable-512` sengaja TIDAK ikut berubah (tetap fill solid + background opaque) — OS crop icon maskable ke bentuk lain, transparansi di situ bisa terlihat rusak tergantung OS.

**ThemeToggle — root cause "tampilan mobile beda dari desktop":**
- Setelah 2 iterasi fix kosmetik (KNOB_SIZE presisi tepi track) yang TIDAK menyelesaikan masalah, akar masalah sebenarnya ditemukan lewat pengukuran `getBoundingClientRect()` dengan kode PERSIS sama di 2 viewport: box toggle 64px pas di desktop (1280px), tapi susut jadi 63.58px di mobile (390px).
- Penyebab: parent `Toolbar`/`Box` (AppBar) flex row, `ThemeToggle` punya default `flexShrink:1` — kalau ruang Toolbar mepet (mobile, menu+judul+toggle+avatar berdesakan), browser boleh mengompres elemen ini walau `width:64` sudah eksplisit (`width` cuma jadi flex-basis, TETAP bisa dikompres tanpa `flexShrink:0`). Knob (posisi absolute pakai `translateX` piksel TETAP) jadi tidak presisi di tepi track yang sudah menyusut duluan.
- Fix: `flexShrink:0` di root `Box` toggle. **Pattern dicatat**: elemen fixed-size (`width`/`height` eksplisit) di dalam flex container yang bisa kehabisan ruang (AppBar mobile) WAJIB `flexShrink:0`, kalau tidak `width` cuma jadi target awal yang tetap bisa dikompres.

**Deploy:** PR #23 (`dev`→`main`, 17 commit) di-merge setelah semua check hijau (6/6) + Vercel preview sukses — sudah live di production.

---

### 2026-07-07 (sesi 38): Fix Bertubi-tubi (Dashboard/RBAC/i18n/DatePicker) + Task003 (Preferensi User + Avatar Menu) + CI Dependabot

**Fix bug (ditemukan lewat testing manual production, bukan dari rencana awal):**
1. **Dashboard timeout `company_id=all`** — query full-scan `invoices` per customer tanpa index (superadmin/company='all' memang seharusnya tidak difilter, itu bukan bug — yang bug adalah performanya). Fix: 2 partial index (`customer_id`/`company_id` + `invoice_date`, `WHERE deleted_at IS NULL`) + `statement_timeout: 20000` di `config/db.ts` sbg jaring pengaman generik.
2. **Unique constraint dedup invoice tidak pernah aktif** — `uq_invoices_number_company` di schema pakai format object literal lama yang bukan `IndexBuilder` valid, jadi `drizzle-kit generate` diam-diam tidak pernah menghasilkan SQL untuknya sejak awal. Diganti `uniqueIndex()`, diverifikasi tidak ada data existing yang melanggar sebelum migration di-apply.
3. **Nested `<li>` di `HighMarginDialog`** — `ListSubheader` (default render `<li>`) dibungkus `<li>` manual utk grouping Autocomplete → React DOM nesting warning. Fix: `component="div"` di `ListSubheader`.
4. **Bug scope-leak dropdown Company/Branch/Division** — `getScopedBranches()`/`getScopedDivisions()` (`scopeFilters.ts`) memperlakukan `companyId==='all'` selalu unrestricted, padahal cuma boleh utk superadmin. User non-superadmin yang company dropdown-nya tersembunyi (cuma 1 company, `companyId` stuck di `'all'`) — opsi branch/division dropdown jatuh ke daftar mentah tanpa scope (leak). Fix + sekalian konsolidasi 9 halaman jadi 1 komponen reusable `components/filters/ScopeFilterFields.tsx` (gating `showCompanyFilter`/`showBranchFilter`/`showDivisionFilter` konsisten — sebelumnya disalin-tempel beda-beda, ada yang division-nya tanpa gate sama sekali). Detail: `docs-v2/task/task001.md` §Task H5.
5. **i18n tercampur di Settings/Threshold** — kolom "Notes" render `item.description` mentah dari DB (selalu Bahasa Indonesia dari `seed.ts`), sementara label UI sekitarnya ikut bahasa aktif. Tambah key translation utk BU threshold + general settings, fallback ke raw description kalau key belum ada.
6. **Icon date/month picker invisible di light mode** — `index.css` set `color-scheme: light dark` global, warna icon native picker ikut preferensi OS (`prefers-color-scheme`), BUKAN toggle tema di app — kalau OS dark tapi app di-set light (atau sebaliknya), icon jadi warna yang blend ke background. Komponen `components/ui/DatePicker` sudah benar override ini tapi cuma dipakai di 1 halaman (`AuditLog`) — 7 pemakaian `TextField type="date"/"month"` mentah lain diganti jadi `DatePicker` (di-extend supaya support `type="month"` juga).
7. **Logo/favicon/PWA icon** — ganti `AutoAwesomeIcon` generic + favicon lama jadi logo custom four-leaf clover (komponen baru `AppLogo`), semua icon PWA (`icon-192/512`, `maskable-512`, `apple-touch-icon`) di-regenerate.

**Task003 (`docs-v2/task/task003.md`) — Preferensi User + Avatar Menu, selesai penuh:**
- Preferensi (theme mode + color palette + bahasa) sekarang tersimpan ke akun (kolom `preferences` JSONB baru di `users`, bukan cuma `localStorage` per-browser) — ikut ke mana pun user login. Endpoint self-service pertama di codebase ini: `PATCH /auth/me/preferences` (`authMiddleware()` saja, tanpa permission tambahan, merge partial).
- 3 palette warna baru: **Blue** (default, sama persis warna sebelumnya), **Green**, **Yellow** — cuma `primary`+`secondary` yang ikut ganti per palette, `success`/`warning`/`error`/`info` tetap warna semantik yang sama di semua palette. `theme/index.ts` diubah dari 2 tema statis jadi 1 factory `createAppTheme(mode, paletteKey)`.
- Sentuhan akhir: `AppBar` background ikut palette juga — light mode pakai warna palette penuh, dark mode versi nyaris hitam yang tetap ber-tint palette-nya (bukan `background.paper` generik).
- Tombol Logout polos di `AppBar` diganti avatar (inisial nama) — klik buka menu: nama/email/company/branch/division (ringkas + "+N lainnya") + tombol Settings + tombol Logout.
- **Belum dikerjakan:** upload foto avatar (perlu storage eksternal — Railway tidak punya filesystem persisten, kandidat Vercel Blob) sengaja di-skip, jadi task terpisah kalau dibutuhkan nanti.
- **Belum di-deploy:** migration kolom `preferences` baru jalan di database lokal, belum di production — lihat §5 di `task003.md` utk runbook.

**CI/CD & housekeeping:**
- `branch_division_enforcement_enabled` default diubah dari `'false'` jadi `'true'` (keputusan eksplisit user — rollout bertahap dianggap sudah tidak perlu lagi).
- 9 PR Dependabot (bun ecosystem backend+frontend, github_actions) direview satu-satu (2 di antaranya "major" versi tapi ternyata `uuid`/`@mui/x-date-pickers` tidak dipakai sama sekali di kode — risiko nol) lalu di-merge ke `main`.
- Semua kerjaan sesi ini di-merge `dev → main` (PR #13), CI (Backend+Frontend, typecheck+lint+test+build) hijau di semua push.

**Rencana masa depan (dicatat, BELUM dikerjakan):** ganti semua primary key tabel dari `serial` (integer) jadi UUID — perubahan besar & invasif (semua skema, FK, Zod schema, tipe TypeScript frontend), belum mulai.

**File yang diubah:** terlalu banyak untuk dilist satu-satu (backend: `auth.*`, `schema-auth.ts`, `config/db.ts`, `schema-transaction.ts`, migration 0006-0008; frontend: `theme/*`, `components/ui/{AppLogo,UserMenu,DatePicker}`, `components/filters/ScopeFilterFields.tsx`, `utils/scopeFilters.ts`, `App.tsx`, `hooks/useAuth.ts`, 9+ halaman pages) — lihat commit log `dev`/`main` (6 commit: `8be557c`..`3688eed`) untuk detail lengkap per-file.

---

### 2026-07-06 (sesi 37): Isolasi Data Superadmin — List User & Audit Log

**Latar belakang:** permintaan user — data superadmin (List User maupun Audit Log) harus HANYA terlihat oleh sesama superadmin, tidak boleh terlihat `admin` ke bawah walaupun role itu punya permission `access.user:view`/`audit.log:view`.

**Keputusan desain (dikonfirmasi via pertanyaan ke user sebelum implementasi):**
1. **Role-based visibility**, bukan self-only — sesama superadmin saling terlihat penuh (kalau ada >1 akun superadmin), yang di-block cuma `admin` ke bawah.
2. **List User:** baris superadmin disembunyikan **total** dari response (bukan field-nya di-mask/disabled).
3. **Audit Log:** entry dengan aktor superadmin **di-drop total** dari response DAN dari `total`/pagination count (bukan tetap kehitung dengan konten redacted).

**Implementasi:** kondisi `NOT EXISTS` (bukan `notInArray`) ditambahkan ke query — dipilih `NOT EXISTS` supaya kolom nullable (`actor_id` audit log untuk system action) tidak ikut ke-exclude secara salah (`NULL NOT IN (...)` di SQL evaluasinya `UNKNOWN`, bukan `true`).
- `user.repository.ts` — `findAllUsers(pagination, excludeSuperAdmin)`, `findUserById(id, excludeSuperAdmin)`
- `audit.repository.ts` — `findAuditLogs(query.excludeSuperAdminActors)`, `findAuditLogById(id, excludeSuperAdminActors)`

Flag diturunkan dari `!c.var.user.isSuperAdmin`, di-thread lewat handler → service → repository di kedua fitur. **Efek samping yang disengaja:** karena `updateUserService`/`deleteUserService` reuse `getUserById`/`findUserById` yang sama untuk ambil state "before", non-superadmin yang mencoba update/delete akun superadmin lewat API otomatis kena `404 NOT_FOUND` juga (bukan cuma tidak terlihat di list).

**Diverifikasi** langsung ke DB lokal (bukan cuma baca kode): `findAllUsers` total 8→7 saat exclude aktif (baris superadmin hilang), `findUserById` return `null` untuk target superadmin, `findAuditLogs` total 13→0 saat exclude aktif. `bunx tsc --noEmit` bersih, 38 test existing tetap pass (0 fail).

**Belum dikerjakan:** sisi frontend (halaman `/users` dan `/audit-log`) belum disesuaikan/diverifikasi visual — murni enforcement backend untuk saat ini.

**File yang diubah:**
- `backend/src/features/users/{user.repository,user.service,user.handler}.ts`
- `backend/src/features/audit/{audit.repository,audit.service,audit.handler}.ts`
- `docs-v2/features/{users,audit}.md`

---

### 2026-07-04 (sesi 36): i18n Error Handling (Option A) + Audit Log Action i18n + Fix Logout 404

**Masalah awal:** notifikasi/alert dari backend tetap tampil bahasa Indonesia walau app di-set English. Root cause: backend selalu kirim `{ error: CODE, message }`, tapi frontend hanya pernah baca `message` mentah (hardcoded Indonesia di 96 pemanggilan `AppError`, dan `i18next` sama sekali belum pernah dipasang di backend meski `CRITICAL_RULES.md` sudah mensyaratkannya).

**Fix — Option A (error code based, bukan i18next di backend):**
`message` dari backend sekarang dianggap log-only, tidak pernah dirender ke UI. Ditambah `frontend/src/utils/apiError.ts` → `getApiErrorMessage(err, t)`: resolve `err.error` (kode) ke `t('error.codes.<CODE>')`, fallback ke `error.generic`. Diterapkan ke 10 titik yang sebelumnya render `err.message`/`error.message` langsung (`CreateUserDialog`, `EditUserDialog`, `ViewAuditLogDialog`, `PermissionDialog`, `DivisionMappingDialog`, `HighMarginDialog`, `Config/Integration`, `ResponsiveListView`, `useImport.ts` — termasuk SSE stream import yang sebelumnya cuma kirim `message` tanpa kode, sekarang `import.handler.ts` ikut kirim `error: code`). `Login` sengaja dikecualikan — semua kegagalan login cuma berarti "email/password salah", jadi tetap pakai copy statis `auth.loginFailedMessage`, bukan kode `UNAUTHORIZED` generik yang kurang pas ("silakan login kembali" aneh ditampilkan di halaman login itu sendiri). `ErrorCodeType` di `types/api.ts` disinkronkan dengan `ErrorCode` enum backend (sebelumnya beda daftar). `errorBoundary.tsx` (crash screen) ternyata sudah lama punya key `error.boundary.*` yang tidak pernah dipakai — title/subtitle/tombol masih hardcoded Indonesia, sekalian disambungkan.

**Audit: 9 key i18n hilang** (button/label render raw key path, mis. literal teks `common.deactivate` muncul di UI) — ditemukan lewat script yang bandingkan semua static `t('key')` call vs isi `en/id` locale JSON. Ditambahkan ke `common.json` (`activate`/`deactivate`), `rbac.json` (`permission_name`, `category`, `description`, `add_permission`), `users.json` (`view_user`, `no_last_login`, rename `createdAt`→`created_at` snake_case sesuai konvensi). **Catatan:** key baru sempat ditulis camelCase (`permissionName`, `addPermission`, dst) mengikuti gaya key tetangga di file yang sama — ini salah, tidak ada instruksi yang membenarkan camelCase, `CRITICAL_RULES.md` eksplisit bilang i18n key wajib snake_case. Sudah dikoreksi ke `permission_name`/`add_permission`/dst.

**Audit log action i18n:** map terjemahan `auditLog.actions.*` sudah ada tapi basi — cuma 13 entry, 5 di antaranya (`invoice.import`, `user_role.assign/revoke`, `category.update`) sudah tidak ada di backend, sementara 20 action asli (`branch.*`, `channel_division.*`, `classification_rule.*`, `company.*`, `high_margin.*`, `import.file`, `page_setting.update`, `user.import`) belum punya key sama sekali — jadi kebanyakan baris Audit Log tampil kode mentah. Ditulis ulang mengikuti 28 action asli dari `grep logAudit(` di backend, dipasang di 4 titik render (kolom DataGrid, kartu mobile, dropdown filter, dialog detail) via `t(..., { defaultValue: action })` supaya action baru yang belum di-translate tidak error. `getActionColor` (duplikat di 2 file) disederhanakan dari map per-action (butuh update manual tiap action baru) jadi rule generik per akhiran verb (`create`→hijau, `update`→biru, `delete`→merah, dst).

**Fix bug: Logout redirect ke /dashboard tapi dapat 404.** `useLogoutMutation` panggil `logout()` (set token context `null`) dan `queryClient.clear()` (hapus cache `page-settings`) **sebelum** `window.location.href = '/login'` — padahal assignment `location.href` tidak langsung unload halaman, ada jeda React sempat re-render. `App.tsx` generate seluruh route table dari `pageSettings`; begitu cache-nya kosong & `token` jadi `null`, route table jadi kosong dan URL lama (mis. `/dashboard`) jatuh ke wildcard `*` → render `<NotFound/>` sebelum redirect sempat terjadi. Fix: hard reload sudah otomatis buang semua state React & cache di memori, jadi `logout()`/`queryClient.clear()` sebenarnya redundant sekaligus penyebab race — diganti hapus `localStorage` langsung lalu redirect tanpa jeda.

**File yang diubah:**
- `frontend/src/utils/apiError.ts` (NEW)
- `frontend/src/types/api.ts` — sinkronisasi `ErrorCodeType`
- `frontend/src/i18n/locales/{en,id}/error.json` — tambah `codes.*`
- `frontend/src/i18n/locales/{en,id}/{common,rbac,users,auditLog}.json` — key hilang + rebuild `actions.*`
- `frontend/src/pages/{Users/components/{CreateUserDialog,EditUserDialog,ViewUserDialog},index}.tsx`
- `frontend/src/pages/AuditLog/{index,components/ViewAuditLogDialog}.tsx`
- `frontend/src/pages/RBAC/components/{PermissionDialog,PermissionManagement}.tsx`
- `frontend/src/pages/Settings/{Divisions/components/DivisionMappingDialog,HighMargin/components/HighMarginDialog}.tsx`
- `frontend/src/pages/Config/Integration/index.tsx`, `frontend/src/pages/Login/index.tsx`
- `frontend/src/components/tables/ResponsiveListView/ResponsiveListView.tsx`
- `frontend/src/utils/errorBoundary.tsx`
- `frontend/src/hooks/{useImport,useAuth}.ts`
- `backend/src/features/import/import.handler.ts` — SSE error event tambah field `error` (code)
- `clinerules` — path `docs/` (sudah tidak ada) → `docs-v2/`, stack lama (React 18/shadcn) → React 19/MUI v9
- `docs-v2/CRITICAL_RULES.md`, `docs-v2/shared/api-conventions.md`, `docs-v2/features/{auth,audit}.md`

---

### 2026-07-04 (sesi 35): Audit & Sinkronisasi Dokumentasi Menyeluruh

Update dokumentasi `docs-v2/` untuk menyusul seluruh pekerjaan sesi 31-34 yang belum tercatat, plus perbaikan beberapa klaim usang di `CRITICAL_RULES.md` yang sudah tidak sesuai kode sejak sebelum sesi ini (`SameSite=Strict` → sudah `None` di production sejak sesi deployment; "auto-generate OpenAPI dari Zod" → sudah diputuskan pakai spec statis manual sejak sesi 29; MVP scope bilang PDF/Excel export "out of scope" padahal `utils/pdf/` dan banyak template Excel sudah ada).

**File yang diubah:** `CRITICAL_RULES.md`, `CURRENT_STATE.md`, `CURRENT_STATE_BACKEND.md`, `features/permissions.md`, `features/roles.md`, `features/high-margin-products.md`, `features/channel-divisions.md`, `features/companies.md`, `features/metrics.md`, `shared/ui-patterns.md`, `shared/deployment.md`.

---

### 2026-07-04 (sesi 34): Konsistensi Dialog — Refactor Modal + Konversi Drawer

**Refactor komponen `Dialog` bersama (`@/components/ui/Dialog`):**
Audit menemukan 6 dialog masih pakai MUI `Dialog` langsung dengan style berbeda-beda (sudut persegi vs bulat, border title-content ada/tidak, padding action tidak seragam, tombol close pakai karakter "✕" manual). `Dialog.tsx` diperluas 3 prop baru tanpa mengubah perilaku 13 dialog existing yang sudah pakai komponen ini:
- `subtitle?: ReactNode` — konten sekunder di title bar (statistik ringkasan drill-down)
- `headerActions?: ReactNode` — icon button tambahan di title bar (mis. export PDF)
- `showCloseButton?: boolean` — tombol X asli (`CloseIcon`), default `false` (dialog dengan tombol Cancel/Close di footer tidak berubah)

6 dialog dimigrasikan: `CustomerMetrics/{M4GrossProfit,M5HighMargin,M6RepeatOrder}.tsx`, `Config/Classification/index.tsx` (Add/Edit + Delete Confirm — Delete sebelumnya tanpa teks konfirmasi sama sekali, sekarang ikut pola `DeleteRoleDialog`), `Import/components/ErrorDetailDialog.tsx`, `Settings/Divisions/components/DivisionMappingDialog.tsx`.

**Konversi drawer detail → dialog:**
4 komponen pakai MUI `Drawer` (`anchor="right"`) untuk tampilan detail — bermasalah di mobile (lebar dipaksa 100% viewport, ketutup keyboard virtual saat ada input, scroll berbeda dari dialog biasa):
- `Transactions/InvoiceDetailDrawer.tsx` → `InvoiceDetailDialog.tsx`
- `Products/CategoryProductsDrawer.tsx` → `CategoryProductsDialog.tsx` (dipakai juga dari `ProductsHighMargin`)
- `ProductsHighMargin/UpsellCustomerDrawer.tsx` → `UpsellCustomerDialog.tsx`
- `Customers/CustomerDetailDrawer.tsx` — **dihapus**, ternyata kode mati (tidak diimport di mana pun), sudah lama digantikan `CustomerDetailModal.tsx` yang sudah pakai `Dialog`

`CustomerDetailModal.tsx` sendiri (sudah pakai `Dialog` sebelumnya, jadi tidak ikut migrasi drawer) ternyata gayanya beda sendiri (`fullScreen` di mobile + tombol Close di footer) dari 3 dialog yang baru dikonversi (ukuran normal + tombol X header) — disamakan ke pola baru, sekaligus rename jadi `CustomerDetailDialog.tsx`.

**High Margin Settings — filter default "all":**
Filter company sebelumnya default `''` (kosong) — `useHighMargins` di-disable total (`enabled: !!company_id`) sampai user pilih company manual, buka halaman langsung kosong. Backend (`listHighMarginQuerySchema`) juga belum punya mode `'all'` sama sekali (`company_id` wajib angka). Fix pakai helper `resolveCompanyScope()` (sudah dipakai endpoint lain: customers, transactions, metrics, products) — `company_id: number | 'all'`, default `'all'`; superadmin+`'all'` → tanpa filter, non-superadmin+`'all'` → otomatis di-scope ke company miliknya sendiri, `company_id` spesifik di luar akses → 403. Endpoint **create** juga ditambah scope check yang sama (sebelumnya bisa create mapping untuk company mana pun tanpa validasi). Repository join ke `companies` untuk `company_name` (kolom baru di tabel, dibutuhkan saat tampilkan data gabungan lintas company). Tombol "Add Mapping" otomatis disabled saat "All Companies" dipilih.

**Diverifikasi:** visual Playwright (M6 dialog, Classification Add Rule, Invoice Detail, Category Products, Customer Detail — semua konsisten sekarang), curl end-to-end untuk High Margin scoping (superadmin+`all` lihat semua, user ter-scope company lain dapat hasil kosong/403 sesuai kasus, create ke company di luar akses → 403).

**File yang diubah:**
- `frontend/src/components/ui/Dialog/Dialog.tsx` — 3 prop baru
- `frontend/src/pages/CustomerMetrics/{M4GrossProfit,M5HighMargin,M6RepeatOrder}.tsx`
- `frontend/src/pages/Config/Classification/index.tsx`
- `frontend/src/pages/Import/components/ErrorDetailDialog.tsx`
- `frontend/src/pages/Settings/Divisions/components/DivisionMappingDialog.tsx`
- `frontend/src/pages/Transactions/components/InvoiceDetailDialog.tsx` (NEW, gantikan Drawer)
- `frontend/src/pages/Products/components/CategoryProductsDialog.tsx` (NEW, gantikan Drawer)
- `frontend/src/pages/ProductsHighMargin/components/UpsellCustomerDialog.tsx` (NEW, gantikan Drawer)
- `frontend/src/pages/Customers/components/CustomerDetailDialog.tsx` (rename dari CustomerDetailModal.tsx)
- `frontend/src/pages/Customers/components/CustomerDetailDrawer.tsx` — DELETED (dead code)
- `frontend/src/pages/{Transactions,Products,ProductsHighMargin,Customers}/index.tsx` — update import
- `frontend/src/i18n/locales/{en,id}/transactions.json` — subtitle "...detail drawer" → "...detail dialog"
- `backend/src/features/settings/high-margin.{schema,handler,service,repository}.ts` — `company_id: number|'all'`, `resolveCompanyScope`, join `companies`
- `frontend/src/pages/Settings/HighMargin/index.tsx`, `frontend/src/types/highMargin.ts`, i18n `highMargin.json` — filter default 'all', kolom Company

---

### 2026-07-04 (sesi 33): PWA Responsive Fixes — Status Bar iOS + Tabel Tablet + KPI Card Mobile

**iOS: tombol menu ketutup status bar.**
`apple-mobile-web-app-status-bar-style: black-translucent` (di-set sesi 31) bikin status bar iOS jadi overlay transparan di PWA standalone, bukan mendorong konten ke bawah — `AppBar` (`position="fixed"`) tanpa padding jadi ketutup status bar, termasuk tombol buka-sidebar di dalamnya, sama sekali tidak bisa di-tap. Fix: `paddingTop: env(safe-area-inset-top)` di `AppBar`, plus spacer `Toolbar` di `DashboardLayout` & `Sidebar` (drawer mobile) disamakan tingginya. `env()` resolve ke 0 di browser/Android biasa — tidak ada perubahan visual di luar iOS PWA.

**Tablet: tabel tidak responsive.**
`ResponsiveListView` switch ke tampilan kartu di breakpoint `sm` (600px) — tablet portrait (mis. iPad ~768px) masih di atas itu, tetap render `DataGrid` multi-kolom lebar yang tidak muat tanpa scroll horizontal canggung. Breakpoint dinaikkan ke `md` (900px), disamakan dengan breakpoint yang sudah dipakai `DashboardLayout` untuk switch sidebar temporary/permanent. Diverifikasi di viewport 768×1024 (iPad portrait) — render kartu, bukan tabel kepotong.

**Threshold Settings — section "KPI Target" overflow di mobile.**
Section "BU Threshold" di halaman yang sama sudah punya fallback kartu untuk mobile (`Table` di `sm`+, `Stack` kartu di `xs`), tapi section "KPI Target" cuma render `<Table>` polos — kolom Notes (deskripsi panjang) meluber keluar batas card di layar sempit. Fix: terapkan pola fallback kartu yang sama.

**File yang diubah:**
- `frontend/src/components/ui/AppBar/AppBar.tsx` — `paddingTop: env(safe-area-inset-top)`
- `frontend/src/components/layout/DashboardLayout.tsx`, `frontend/src/components/ui/Sidebar/Sidebar.tsx` — spacer Toolbar disesuaikan
- `frontend/src/components/tables/ResponsiveListView/ResponsiveListView.tsx` — breakpoint `sm` → `md`
- `frontend/src/pages/Settings/Threshold/index.tsx` — fallback kartu mobile utk section KPI Target

---

### 2026-07-04 (sesi 32): RBAC Bug Hunt — Permission Deprecated, Scope Fix, UI Dialog Fix

Rangkaian bug ditemukan lewat laporan user langsung (bukan audit terjadwal), semuanya root-cause dari migrasi skema permission granular (sesi 24) yang tidak lengkap — beberapa tempat masih rujuk skema/permission lama.

**`metrics.route.ts` pakai `metrics:view` yang sudah deprecated.**
`metrics:view` ada di `OLD_PERMISSION_NAMES` (`db/seed.ts`) — sudah digantikan permission granular per-halaman (`expansion:view`, `cross.selling:view`, dst) dan **tidak pernah di-seed lagi** ke tabel `permissions`. Tapi 12 endpoint di `metrics.route.ts` masih `requirePermission('metrics:view')` — permission yang mustahil di-assign lewat RBAC UI ke role manapun. Akibatnya **semua role non-superadmin selalu 403** di halaman Customer/Product Workbench manapun yang datanya lewat `/metrics/*`, apa pun permission yang sudah diberikan. Dashboard tidak kena (endpoint sendiri pakai `dashboard:view`), jadi kelihatan seolah cuma halaman lain yang bermasalah. Fix: permission tiap endpoint disamakan dengan `permissionKey` halaman frontend yang memakainya (ditelusuri dari kode, bukan tebakan) — `cross.selling:view`, `expansion:view` (customer-metrics + gp/hm/ror-breakdown, drill-down M4/M5/M6 sama-sama di halaman Customer Metrics), `churn.risk:view`, `product:view`, `high.margin:view`, `product.trend:view`.

**`GET /companies` terlalu ketat.**
Dipakai 12+ halaman sebagai dropdown filter perusahaan (`useCompanies()`), tapi mewajibkan `settings.company:view` (permission "kelola company", bukan "lihat dropdown"). Role dengan permission halaman yang benar tetap 403 begitu halaman itu coba isi dropdown company. Dilonggarkan jadi cuma butuh login — `handleGetCompanies` sudah difilter ke `companyIds` user dari JWT, jadi aman. `GET /:id` dan CRUD tetap terproteksi seperti biasa.

**`GET /settings/channel-divisions` — pola sama, solusi beda.**
Dipakai 8 halaman sebagai dropdown filter divisi, mewajibkan `settings.channel.division:view`. Beda dari companies, endpoint ini balikin `channel_name` **asli** (nama channel penjualan riil), jadi tidak bisa dilonggarkan langsung. Solusi: endpoint baru `GET /settings/channel-divisions/values` — cuma balikin nilai divisi unik tanpa `channel_name`, tanpa permission khusus. Endpoint mapping lengkap (`GET /`) tetap terproteksi seperti semula.

**Dialog "Set Permission" tidak punya kolom "Create".**
`getActionColumns()` hardcode 5 action (`menu, view, input, update, delete`) — `input` adalah nama action lama (skema deprecated sama seperti `metrics:view`), skema sekarang pakai `create`. 21 dari 88 permission (semua `:create`, `:export`, `:import`, `:reset`, `:test`) sama sekali tidak bisa ditoggle dari dialog ini walau ada di database. Fix: kolom action dihitung dinamis dari suffix permission yang benar-benar ada di data, bukan daftar hardcode — otomatis menyesuaikan kalau skema berubah lagi nanti.

**`ActionMenu` tidak hilang walau semua item hidden.**
Item di dalam dropdown sudah difilter per permission (`hidden: !can(...)`), tapi tombol "Actions" itu sendiri selalu dirender — role yang cuma punya `:view` tetap lihat tombol, begitu diklik dropdown-nya kosong. Fix: `ActionMenu` return `null` kalau tidak ada item visible sama sekali. Berlaku otomatis di 6 halaman yang pakai komponen ini.

**RBAC — mode read-only untuk `access.permission:view`.**
Tombol shield "Assign Permissions" di list Role sebelumnya cuma tampil untuk `access.permission:update` — role dengan `:view` saja sama sekali tidak bisa lihat permission suatu role. Fix: tombol tampil untuk `view` **atau** `update`; kalau cuma `view`, dialog kebuka dengan badge "Read only", semua toggle di-disable. Sekalian dibenahi: `RoleCard` (versi mobile) ternyata sama sekali tidak ada pengecekan permission untuk tombol Assign Permissions/Delete (selalu tampil ke siapa saja) — disamakan dengan versi desktop yang sudah benar pakai `can()`.

**Seed baseline permission otomatis untuk role `admin` & `user`.**
Role `admin`/`user` sebelumnya kosong total dari seed (cuma `superadmin` yang di-assign semua permission) — instalasi baru manapun butuh setup RBAC manual dari nol. Baseline `admin`: akses penuh menu bisnis inti (Dashboard, Customer Workbench, Product & Portfolio, Transaction & Revenue); grup Administration cuma sampai Settings (Company/Branch, Channel Division, Product Settings hanya view+update TANPA delete — hapus data master ini berdampak besar ke data transaksi); Configuration sama sekali tidak termasuk (eksklusif superadmin); Access Control (Users/Roles/Permissions) & Audit Log cuma view. Baseline `user`: view+export saja di menu bisnis inti, nol menu Administration. `seedRoleDefaultPermissions()` idempotent & aditif (pola sama seperti superadmin) — cuma nambah yang belum ada, **tidak pernah** mencabut permission yang sudah di-assign manual lewat RBAC UI.

**File yang diubah:**
- `backend/src/features/metrics/metrics.route.ts` — permission per endpoint disamakan dengan frontend
- `backend/src/features/companies/companies.route.ts` — `GET /` tanpa requirePermission
- `backend/src/features/settings/channel-divisions.{route,handler,service,repository}.ts` — endpoint `/values` baru
- `frontend/src/api/channelDivisions.api.ts`, `frontend/src/hooks/useChannelDivisions.ts`, `frontend/src/hooks/useDivisionOptions.ts` — pakai endpoint `/values`
- `frontend/src/pages/RBAC/components/SetPermissionDialog.tsx` — kolom action dinamis
- `frontend/src/components/ui/ActionMenu/index.tsx` — return null kalau semua item hidden
- `frontend/src/pages/RBAC/{index.tsx,components/RoleCard.tsx,components/SetPermissionDialog.tsx}` — mode read-only + fix RoleCard permission check
- `frontend/src/i18n/locales/{en,id}/rbac.json` — key action baru + "Read only"
- `backend/src/db/seed.ts` — `ADMIN_PERMISSION_NAMES`, `USER_PERMISSION_NAMES`, `seedRoleDefaultPermissions()`

---

### 2026-07-03/04 (sesi 31): Rollback Riwayat Git + Rewrite Deploy Infra (Docker, PWA, Proxy Railway)

**Konteks:** 8 commit hasil sesi Claude Code lain (di luar percakapan ini) mengandung trailer `Co-Authored-By: Claude Sonnet 5` di pesan commit — bertentangan dengan instruksi permanen user untuk proyek ini (tidak boleh ada atribusi AI). Commit di-rollback (`git reset` ke commit terakhir yang bersih) lalu isi fungsionalnya ditulis ulang manual dari nol (bukan cherry-pick) sebagai commit baru tanpa trailer AI, diverifikasi ulang satu-satu, baru di-force-push menggantikan history lama.

**Fix SSL Postgres:** dideteksi dari hostname `DATABASE_URL` (`localhost`/`127.0.0.1` → off, host lain → `require`), bukan dari `NODE_ENV` — `make db-migrate`/`db-seed` dijalankan dari lokal (`NODE_ENV=development`) tapi target ke DB production, deteksi berbasis `NODE_ENV` bikin migration lokal→production gagal "connection is insecure".

**Fix root `/` redirect:** cek `isAuthenticated` dulu sebelum redirect ke `/dashboard` (sebelumnya unconditional, visitor tanpa token kena 404 karena tabel route dinamis kosong saat belum login — root cause sama dengan fix `usePageSettings` sebelumnya).

**Fix cache React Query saat logout:** `queryClient.clear()` dipanggil + hard redirect (`window.location.href`, bukan `navigate()` SPA) di logout manual maupun auto-logout sesi expired — sebelumnya data KPI user lama bisa sempat kelihatan kalau user lain login di browser yang sama tanpa reload penuh.

**Dockerize backend + obfuscate untuk deploy Railway:**
Railway/Render tidak punya runtime Bun native di dropdown Language — pakai `backend/Dockerfile` multi-stage (image `oven/bun`). Stage builder bundle (`Bun.build`) + obfuscate (`javascript-obfuscator`) jadi satu file `dist/index.js`; stage final cuma `COPY` file itu, source `.ts`/`node_modules`/devDependencies tidak pernah ikut ke image final. `controlFlowFlattening`/`deadCodeInjection` (dipakai di frontend) sengaja OFF di backend — backend jalan di hot path tiap request, overhead 2-10x tidak sepadan.

**PWA — installable di iOS/Android:** `vite-plugin-pwa` (workbox `generateSW`), manifest+service-worker digenerate otomatis saat build. Icon PNG (192/512/maskable-512/apple-touch-icon) digenerate dari logo SVG existing. Workbox sengaja **tidak** cache `/api/*` — data KPI sensitif harus selalu network-fresh. `start_url` manifest `/` (bukan `/dashboard`, yang cuma ada sebagai route dinamis dan kosong kalau dibuka tanpa token dari icon home-screen iOS).

**Proxy Vercel → Railway:** `vercel.json` rewrite `/api/*` ke domain backend Railway supaya request FE tetap same-origin dari sisi klien (URL/infra backend sebelumnya kelihatan langsung di DevTools Network tab).

**File yang diubah:** `backend/src/config/db.ts`, `backend/Dockerfile` (NEW), `backend/scripts/build-prod.ts` (NEW), `backend/package.json`, `frontend/src/App.tsx`, `frontend/src/api/axios.ts`, `frontend/src/hooks/useAuth.ts`, `frontend/vite.config.ts` (VitePWA), `frontend/index.html`, `frontend/public/icons/*` (PNG baru, SVG lama dihapus), `frontend/public/manifest.json` (dihapus, digantikan plugin), `frontend/vercel.json`, `docs-v2/shared/deployment.md` (Docker wajib, bukan opsional; §2a Proteksi Source Code baru).

---

### 2026-07-03 (sesi 30): Users — Bulk Import Template + Reset Password + 2 Bug Fix

**Bulk import user baru (permintaan awal sesi ini):**
- Template Excel (`GET /users/template`): kolom `name`, `email`, `role` (opsional, by nama), `company_code` (opsional, multi dipisah koma)
- Upload (`POST /users/import`, multipart): admin isi `default_password` di form saat upload (bukan per-baris, bukan config server) — dipakai untuk semua user baru di file itu
- Pola parsing/validasi identik `importChannelDivisionsService` (skip duplikat email, error per-baris dengan nomor baris, tidak gagal total di baris pertama yang error)
- Frontend: reuse halaman `/import` yang sudah ada — `user` jadi tipe ke-4 di dropdown (`UploadFileCard.tsx`), bukan halaman terpisah

**Reset password di Edit User (ditemukan saat desain bulk-import: sistem ini tidak punya mekanisme ganti password sama sekali sebelumnya):**
- `updateUserSchema` terima `password?` opsional, di-hash sebelum simpan. Audit log cuma catat `passwordReset: true`, tidak pernah catat password
- Frontend: checkbox "Reset Password" di `EditUserDialog.tsx`, default tersembunyi

**Fix — Create User tidak pernah simpan role/company (bug lama, ditemukan saat cek alur bulk-import):**
- `createUserSchema` sebelumnya cuma `{name, email, password}` — `role_ids`/`company_ids` yang dikirim frontend di-strip diam-diam oleh Zod. Semua user baru dari form selalu tanpa role/company sampai di-edit manual
- Fix: `createUserService` sekarang assign role/company pakai `replaceUserRoles`/`replaceUserCompanies` yang sama dengan update, lalu re-fetch sebelum return

**Fix — role ter-duplikasi di response (bug lama, ditemukan saat verifikasi manual — role "superadmin" muncul 3x untuk admin dengan 3 company):**
- `findAllUsers`/`findUserById` sebelumnya JOIN `user_roles`+`roles` DAN `user_companies`+`companies` dalam satu query + `GROUP BY` → cartesian product, role ter-duplikasi sebanyak jumlah company user itu
- Fix: dipecah jadi 2 query terpisah (`fetchRolesAndCompaniesByUserIds`, dibatch pakai `inArray`), digabung per-user di kode, bukan di SQL

**Tidak ada migration DB** — semua fitur pakai tabel yang sudah ada (`users`, `user_roles`, `user_companies`).

**Verifikasi:** end-to-end lewat curl ke backend real (bukan baca kode doang) — login, download template, bulk-upload (berhasil + skip duplikat + error per-baris + role/company ter-assign benar), login pakai password default hasil bulk-upload, reset password (password lama ditolak, baru diterima), create user dengan role+company, konfirmasi bug duplikasi hilang untuk user lama (admin) maupun baru. Data test dibersihkan setelah selesai.

**File yang diubah:**
- Backend: `backend/src/features/users/{user.schema,user.repository,user.service,user.handler,user.route}.ts`
- Frontend: `frontend/src/api/users.api.ts`, `frontend/src/pages/Users/components/EditUserDialog.tsx`, `frontend/src/pages/Import/components/UploadFileCard.tsx`, `frontend/src/types/users.ts`, i18n `en/id` × `import.json`+`users.json`
- Docs: `features/users.md` (update menyeluruh)

---

### 2026-07-02 (sesi 29): API Docs (Swagger UI, spec statis) + Fix Logout Tidak Invalidasi Sesi

**API Docs — Swagger UI di `/api/v1/docs`, spec statis manual (bukan auto-generate):**
- Sempat coba `hono-openapi`+`zod-openapi` (auto-generate dari Zod schema existing) — di-rollback karena peer-dependency rapuh (`zod-openapi` v6 butuh Zod v4, project masih Zod v3) dan `validator()` middleware-nya ternyata selalu bisa blokir request (tidak bisa dibuat read-only untuk docs doang)
- Pindah ke pendekatan spec statis: `src/docs/openapi.yaml` ditulis manual (pilot 6 endpoint: Auth lengkap + Dashboard + Metrics/cross-selling), di-serve via `features/docs/docs.route.ts` pakai `swagger-ui-dist` (cuma static assets, 1 dependency ringan tanpa peer-dependency Zod)
- Route **di dalam `protectedApi`** — wajib login utk akses (`authMiddleware()`), non-aktif kalau `NODE_ENV=production`. Response docs pakai `Cache-Control: no-store` supaya browser tidak cache halaman protected ini
- "Try it out" pakai cookie & CSRF **asli** dari login sungguhan — `requestInterceptor` custom baca cookie `csrf_token` (non-httpOnly) dan pasang ke header `X-CSRF-Token` otomatis. Diverifikasi end-to-end: login → GET protected endpoint (data asli) → POST mutasi (CSRF tervalidasi server)
- Catatan (bukan bug, disengaja): karena `POST /auth/login` didokumentasikan, user yang sudah pernah masuk `/api/v1/docs` bisa re-login lewat form Swagger kapan saja tanpa buka app utama — akses ke docs itu sendiri tetap terkunci di belakang auth normal

**Fix — tombol Logout tidak invalidasi sesi server (ditemukan saat testing docs protected):**
- `AppBar.tsx` & `LogoutButton.tsx` sebelumnya panggil `useAuth().logout()` (`AuthContext.tsx`) — cuma clear state React + localStorage, **tidak pernah** panggil `POST /auth/logout`. Cookie httpOnly (`access_token`/`refresh_token`/`csrf_token`) tetap valid di server walau UI sudah redirect ke `/login`
- Fix: ganti ke `useLogoutMutation()` (`hooks/useAuth.ts`) — hook yang sudah ada tapi belum pernah dipakai di mana pun. Sekarang benar-benar memanggil endpoint logout (hapus 3 cookie server-side) sebelum clear state lokal

**Dokumentasi baru**: `features/api-docs.md`

**File yang diubah (sesi ini):**
- `backend/src/docs/openapi.yaml` (NEW), `backend/src/features/docs/docs.route.ts` (NEW)
- `backend/src/router.ts` — mount `/docs` di dalam `protectedApi`, gated `NODE_ENV !== 'production'`
- `backend/package.json`, `backend/bun.lock` — tambah `swagger-ui-dist`
- `frontend/src/components/ui/AppBar/AppBar.tsx`, `frontend/src/components/ui/LogoutButton/LogoutButton.tsx` — logout pakai `useLogoutMutation()`

**Susulan (sesi 29, dilengkapi): pilot 6 endpoint → 83 operasi/63 path, seluruh `protectedApi`.**
- Ditambah: Users, Page Settings, Companies (+branches), Roles, Permissions, Config (+Accurate credentials/test-connection), Audit Log, Customers, Products (lokal + proxy live Accurate), Import (upload multipart + SSE stream), Classification Rules, Settings High Margin, Settings Channel Divisions, 10 endpoint Metrics tambahan (customer-metrics, gp/hm/ror-breakdown, dormant-customer, category-performance/products, high-margin-penetration/detail+customers, customer-products, avg-category), Transactions (invoices)
- File download (.xlsx template ×3), multipart upload (×4), dan SSE stream (`/import/csv/stream`) didokumentasikan bentuk request/response-nya sesuai kemampuan OpenAPI 3.1, bukan lewat auto-generate
- Ditemukan & dicatat apa adanya saat menulis spec (bukan diperbaiki di sesi ini): `GET /config/accurate/credentials/:branchId` return `api_token`/`signature_secret` plaintext; `POST /settings/high-margin` ambil `created_by` dari header `x-user-id` bukan session; delete di `settings/high-margin` & `settings/channel-divisions` return `200 {id}` sedangkan fitur lain `204`
- Diverifikasi live: login via curl → `GET /api/v1/docs/openapi.yaml` (200, isi identik file sumber) → `GET /api/v1/docs` (200, Swagger UI HTML)
- Detail lengkap: `features/api-docs.md`

---

### 2026-07-02 (sesi 28): Refactor i18n — Split Locale Jadi Per-Namespace

`frontend/src/i18n/locales/en.json` dan `id.json` sudah tumbuh jadi 992 baris/28 namespace dalam 1 file — susah dinavigasi. Di-split jadi 1 file JSON per namespace: `locales/en/<namespace>.json` + `locales/id/<namespace>.json` (56 file total, terbesar `config.json` 126 baris). `i18n/index.ts` gabung otomatis via `import.meta.glob('./locales/en/*.json', { eager: true })` — hasil merge tetap satu object flat per bahasa, jadi **semua pemanggilan `t('namespace.key')` di komponen tidak berubah sama sekali**, murni reorganisasi file sumber. File `locales/en.json`/`id.json` lama dihapus.

**File yang diubah**: `frontend/src/i18n/index.ts` (merge logic), `frontend/src/i18n/locales/en.json`+`id.json` dihapus → `frontend/src/i18n/locales/{en,id}/*.json` (56 file baru).

---

### 2026-07-02 (sesi 27): i18n Full Audit (Zero Hardcode) + Dashboard/AppSettings Text Bug Fix

**Audit i18n menyeluruh — seluruh `frontend/src/pages/**` dan `frontend/src/components/**`:**
- Survei awal (subagent Explore) memetakan ~40 file dengan hardcode string UI (label, placeholder, pesan error/snackbar, kolom DataGrid, konstanta label) — dikerjakan bertahap per grup: Dashboard/DormantCustomer/Forbidden/Projects/CustomerMetrics (full hardcode), drawer & dialog kompleks, chart widget reusable (LineAlertWidget/BulletChartWidget/HeatmapWidget/StatCard/RadialBarWidget), UI dasar (Footer/Alert/ProgressBar/LogoutButton/Dialog/AppBar), menu.tsx+Sidebar+Config Features, lalu 4 batch cleanup partial-hardcode (Products/CrossSelling/AuditLog/RBAC, Users Zod+Threshold+AppSettings, Import+Config Integration/Classification, Customers/Transactions/ProductsHighMargin)
- Total 54 file diubah, +305 key baru di `en.json`/`id.json`, **parity 841/841 key** (diverifikasi via script — tidak ada key yang timpang antar locale)
- Pola yang dipakai konsisten dengan precedent existing: factory function `getXxxLabels(t)` untuk konstanta module-level yang butuh `t()` (Zod schema, kolom DataGrid, label map), key shared `common.filters.*` untuk filter bar yang berulang di banyak halaman
- Verifikasi: `tsc -b` bersih, sapuan grep ulang (2x, oleh subagent independen) untuk pola hardcode tersisa, browser check via Playwright ke 10+ halaman

**Bug ditemukan saat verifikasi manual oleh user (2 kasus, keduanya class bug yang sama — teks Indonesia tampil walau locale di-set English):**
1. `Settings/AppSettings/index.tsx` — deskripsi Dark/Light Mode pakai `t('theme.darkModeDesc', 'Tema gelap — ...')`. Key `theme.darkModeDesc`/`theme.lightModeDesc` **tidak pernah didaftarkan** di locale manapun → i18next selalu fallback ke default value hardcode Indonesia di argumen ke-2, apa pun bahasa aktif. Fix: daftarkan key asli `config.appSettings.darkModeDesc`/`lightModeDesc` di kedua locale, hapus pola fallback-string.
2. **Dashboard 10 KPI card** — `metric.title`/`metric.subtitle` dirender apa adanya dari response `GET /dashboard`. Backend (`dashboard.service.ts`, `buildCard()`) generate title/subtitle sebagai literal Indonesia hardcode di kode backend (mis. `'Customer beli >1 kategori / Total customer aktif'`) — field ini **bukan** hasil translasi FE, jadi ganti locale FE ke English tidak berpengaruh ke teks ini. Fix: FE override title/subtitle via mapping lokal `METRIC_LABEL_KEYS: metric_key → {title, desc}` di `Dashboard/index.tsx`, memakai namespace `metrics.*` di locale (10 pasang title+desc yang ternyata sudah ada tapi belum pernah dipakai/orphaned sebelum sesi ini). Response API `GET /dashboard` sendiri **tidak diubah** — field `title`/`subtitle` backend tetap ada apa adanya untuk backward-compat, FE sekarang mengabaikannya dan pakai key i18n sendiri berbasis `metric_key`.
- Sapuan lanjutan mengonfirmasi pola bug #1 (`t(key, 'literal string')` dengan key hilang) dan #2 (raw `.title`/`.subtitle` dari API tanpa `t()`) **hanya** terjadi di 2 file di atas — halaman lain (CrossSelling, DormantCustomer, CustomerMetrics M3–M7, dst) semuanya sudah generate title/subtitle chart via `t()` FE murni, tidak konsumsi field teks dari API.

**File yang diubah (sesi ini)**: 54 file di `frontend/src/pages/**` + `frontend/src/components/**`, `frontend/src/i18n/locales/{en,id}.json` (+305 key), `docs-v2/features/dashboard.md`, `docs-v2/CURRENT_STATE.md`. Tidak ada perubahan backend.

---

### 2026-07-02 (sesi 26): Product Trend Backend + Transactions Feature + Dashboard Backend + Sidebar Fix

**Product Trend — endpoint `GET /metrics/avg-category` real backend:**
- Sebelumnya cuma mock MSW, route belum ada di backend sama sekali
- Tambah `repository/avg-category.repository.ts` (`fetchAvgCategoryTrend`, pola CTE sama dengan `fetchCrossSellingTrend` tapi tanpa filter division), service `getAvgCategoryTrend`, handler, route — mount di `metrics.route.ts`
- Frontend: hapus hardcode `period_month: '2024-01'` → `todayMonth()`; matikan mock di `products.handler.ts`
- **Fix lanjutan**: `active_window` awalnya hardcode `6` (Zod default + FE) → bikin titik trend rolling 6-bulan, bulan berjalan tanpa transaksi tetap nunjuk angka lama. Diganti fallback ke `business_configs.active_window_months` (SSOT sama dengan cross-selling/dormant) — sekarang tiap titik self-contained per bulan kalender, bulan berjalan tanpa transaksi tampil `0`. Override manual via query param masih didukung.

**Transactions feature — endpoint `GET/invoices` + `GET /invoices/:id` real backend:**
- `backend/src/features/transactions/` sebelumnya kosong total, route di-comment di `router.ts`
- List: join `customers`/`companies`/`channel_divisions`/`import_logs`, `category_count` via `COUNT(DISTINCT invoice_items.product_category_id)`, filter `business_unit`/`customer_search`/`date_from`/`date_to`, sort `invoice_date`/`total_revenue`/`total_gp`
- Detail: line items + `is_high_margin` per item (EXISTS subquery ke `high_margin_products`, window `effective_from`/`effective_until` relatif ke `invoice_date`, match `product_id` ATAU `product_category_id`)
- Detail endpoint di-scope ke company user (`resolveCompanyScope(c, 'all')`) untuk cegah IDOR walau FE tidak kirim `company_id`
- **Rename Order → Transaction**: menu label, permission key (`order:menu/view/export` → `transaction:menu/view/export`, kategori "Order" → "Transaction"). Permission lama dipindah ke `OLD_PERMISSION_NAMES` di `seed.ts` (auto-dibersihkan saat reseed). Aman karena cuma `superadmin` yang punya `order:*` sebelumnya.
- Mock `transactionsHandlers` dimatikan

**Dashboard — endpoint `GET /dashboard` real backend (agregator):**
- `backend/src/features/dashboard/` baru — bukan sumber kalkulasi baru, murni agregasi 10 metric card dari 3 service metrics yang sudah live (`getCrossSellingMetrics`, `getCustomerMetrics`, `getDormantCustomerMetrics`)
- Satu-satunya query baru: `fetchDormantValueTrend` (total nilai dormant SEMUA customer per bulan — versi lama `fetchDormantValueRanking` di-`LIMIT 20`, tidak cocok untuk agregat)
- `resolveSegmentParams` di-export dari `metrics.service.ts` (sebelumnya private) supaya bisa direuse
- Tidak ada company scoping eksplisit — mewarisi keterbatasan arsitektur metrics existing (`resolveCompanyScope` di handler lain juga cuma buat cek otorisasi, hasilnya tidak dipakai membatasi query)
- Mock `dashboardHandlers` dimatikan

**Fix — Sidebar submenu tidak bisa dipilih saat collapsed/mini:**
- `NavGroup` (grup menu dengan children) saat collapsed sebelumnya hardcode navigasi ke `visibleChildren[0]`, child ke-2 dst sama sekali tidak bisa diakses
- Fix: flyout MUI `Menu` popover berisi seluruh `visibleChildren` saat ikon grup diklik dalam mode collapsed. Mode full (sidebar terbuka) tidak berubah.
- Diverifikasi via Playwright: popover muncul dengan 5 item grup Settings, klik item ke-2 ("Companies") berhasil navigasi

**Dokumentasi baru/diupdate**: `features/transactions.md` (baru), `features/dashboard.md` (baru), `features/metrics.md`, `features/permissions.md`, `shared/ui-patterns.md`, `CLAUDE.md`

**File yang diubah (sesi ini):**
- `backend/src/features/metrics/repository/avg-category.repository.ts` (NEW), `metrics.schema.ts`, `metrics.service.ts` (export `resolveSegmentParams`, `getAvgCategoryTrend` fallback threshold), `metrics.handler.ts`, `metrics.route.ts`, `metrics.types.ts`, `metrics.repository.ts`
- `backend/src/features/transactions/` (NEW: schema, repository, service, handler, route)
- `backend/src/features/dashboard/` (NEW: types, repository, service, handler, route)
- `backend/src/router.ts` — mount `/invoices`, `/dashboard`
- `backend/src/db/seed.ts` — rename `order:*` → `transaction:*`, `OLD_PERMISSION_NAMES`
- `frontend/src/pages/ProductsTrend/index.tsx` — `todayMonth()`, hapus hardcode `active_window`
- `frontend/src/components/ui/Sidebar/Sidebar.tsx` — flyout `Menu` untuk `NavGroup` collapsed
- `frontend/src/config/menu.tsx`, `frontend/src/route/routeConstants.tsx` — rename Order → Transaction
- `frontend/src/i18n/locales/{en,id}.json` — label "Orders"/"Pesanan" → "Transactions"/"Transaksi"
- `frontend/src/mocks/handlers.ts`, `frontend/src/mocks/handlers/products.handler.ts` — matikan mock avg-category, transactions, dashboard

---

### 2026-06-29–30 (sesi 25): Import Terpusat + Template XLSX + Auth Fix

**Import Page — Sentralisasi Semua Tipe Import:**
- `UploadFileCard` di-rewrite total: satu halaman untuk faktur, channel divisions, dan klasifikasi
- Dropdown "Tipe Import" menentukan field, endpoint, dan template yang diunduh
- Tombol **Download Template** selalu tampil, download XLSX sesuai tipe terpilih
- `Settings/Divisions` dan `Config/Classification` dibersihkan dari tombol import — hanya tombol Add yang tersisa

**Template XLSX — 3 tipe:**
- **Faktur** (`GET /import/template`): 11 kolom, title row + description row + header row + 3 contoh data
- **Channel Divisions** (`GET /settings/channel-divisions/template`): 2 kolom, title + deskripsi + header + 10 contoh
- **Klasifikasi** (`GET /classification-rules/template`): 3 kolom, title + deskripsi panjang (tinggi 80pt) + header + 16 contoh
- Semua template return `ArrayBuffer` (via `buf.buffer.slice(byteOffset, byteOffset+byteLength)`) agar `new Response()` menerima langsung

**Import Massal — Channel Divisions & Klasifikasi:**
- Endpoint baru: `POST /settings/channel-divisions/import` dan `POST /classification-rules/import`
- **`company_id` wajib** di FormData — data diisolasi per company
- Dedup per company: `findChannelDivisionByNameAndCompany(name, companyId)` — bukan global
- **Dynamic header detection**: parser scan baris yang mengandung kolom key (`channel_name` / `match_type`) — tidak hardcode row pertama; toleransi template dengan title/description rows di atas header
- `priority` auto-assign dari `MATCH_TYPE_PRIORITY` saat import klasifikasi

**Bug Fix — Axios Default Content-Type:**
- Root cause: `axios.create({ headers: { 'Content-Type': 'application/json' } })` override multipart boundary yang dibuat browser untuk FormData
- Fix: hapus default `Content-Type` dari `axios.create()` — browser generate boundary otomatis jika tidak ada override
- Error sebelumnya: `TypeError: Can't decode form data from body because of incorrect MIME type/boundary`

**Auth Fix — Force Logout:**
- Root cause: DB belum di-seed → tidak ada user → login gagal → tidak ada cookie → setiap request 401 → refresh gagal → `forceLogout()`
- Fix: jalankan `bun run db:seed`
- Bug tambahan di `App.tsx`: jika `/auth/me` gagal dengan non-401 error, `synced` tidak pernah jadi `true` → app stuck di `PageLoader` selamanya
- Fix: tambah `useEffect(() => { if (isMeError) setSynced(true) }, [isMeError])`

**File yang diubah (sesi ini):**
- `backend/src/features/import/import.handler.ts` — `handleGetFakturTemplate` (NEW)
- `backend/src/features/import/import.route.ts` — `GET /template`
- `backend/src/features/import/classification.service.ts` — `importClassificationRulesService`, `getClassificationRulesTemplate` (NEW)
- `backend/src/features/import/classification.handler.ts` — `handleImportClassificationRules`, `handleDownloadClassificationTemplate` (NEW)
- `backend/src/features/import/classification.route.ts` — `POST /import`, `GET /template`
- `backend/src/features/settings/channel-divisions.repository.ts` — `findChannelDivisionByNameAndCompany` (NEW)
- `backend/src/features/settings/channel-divisions.service.ts` — `importChannelDivisionsService`, `getChannelDivisionsTemplate`, dynamic header scan
- `backend/src/features/settings/channel-divisions.handler.ts` — `handleImportChannelDivisions`, `handleDownloadChannelDivisionsTemplate` (NEW)
- `backend/src/features/settings/channel-divisions.route.ts` — `POST /import`, `GET /template`
- `frontend/src/api/axios.ts` — hapus default `Content-Type: application/json` dari `axios.create()`
- `frontend/src/api/import.api.ts` — `downloadFakturTemplate()` (NEW)
- `frontend/src/api/channelDivisions.api.ts` — `importCsv(file, companyId)` tambah `company_id`
- `frontend/src/api/classification.api.ts` — `importClassificationRules(file, companyId)` tambah `company_id`
- `frontend/src/pages/Import/components/UploadFileCard.tsx` — REWRITTEN (dropdown tipe, 3 mutation, template download)
- `frontend/src/pages/Settings/Divisions/index.tsx` — hapus tombol import/template
- `frontend/src/pages/Config/Classification/index.tsx` — hapus tombol import/template
- `frontend/src/App.tsx` — tambah `isMeError` handler untuk unblock synced

---

### 2026-06-29 (sesi 24): RBAC Button Guards + Permission Categories + inArray Fix + staleTime Fix

**DB Drop & Re-seed:**
- DB di-drop penuh (schema `public` + `drizzle`) dan di-rebuild ulang dari migrations
- Semua business data (customers, invoices, products) hilang — perlu re-import via Import page
- Seed baru: 88 permissions (24 kategori granular)

**Permission Categories — Granular (24 kategori):**
- Sebelumnya: semua halaman sub-customer dimasukkan ke kategori "Customer", semua admin ke "Settings" → RBAC UI menampilkan 8 accordion lebar
- Fix: tiap halaman/fitur punya `category` sendiri → RBAC UI menampilkan 24 accordion spesifik
- 24 kategori: Dashboard, Customer, Expansion, Churn Risk, Cross Selling, Product, High Margin, Product Trend, Order, Project, App Settings, Company, Branch, Channel Division, Product Settings, Threshold, Classification, Import, Integration, Features, Users, Roles, Permissions, Audit Log

**Permission Format Baru — Dot-notation:**
- Format lama: `customers:menu`, `config-integration:update` (tidak konsisten)
- Format baru: `module.submodule:action` — contoh: `settings.company:create`, `config.integration:test`, `access.user:delete`, `audit.log:export`
- Parent menu (Settings, Config, Access Control) tidak punya permission key — visibilitas diturunkan dari child
- **Total: 88 permissions** (vs 57 sebelumnya)

**`useCan` Hook — Button-Level Guards:**
- Hook baru: `frontend/src/hooks/useCan.ts` — wrapper tipis `permissions.includes(key)`
- Diterapkan ke 11 halaman/komponen: Users, RBAC, Companies, BranchSection, Channel Divisions, High Margin Settings, Threshold Settings, Classification, Integration, Features, Import
- Pattern: `{can('settings.company:create') && <Button>}`, `hidden: !can('settings.company:update')`

**Backend — `inArray` Empty Array Fix:**
- drizzle-orm melempar error jika `inArray()` dipanggil dengan array kosong
- Terjadi saat non-superadmin user belum punya company di-assign → `companyIds = []`
- Fix di 4 repository: companies, customers, import, audit
- Pattern: `if (scopeIds !== undefined && scopeIds.length === 0) return []` (early return)

**React Query — `staleTime: 0` Global:**
- Sebelumnya: `staleTime: 5 minutes` di `queryClient.ts` → navigasi kembali ke halaman tidak refetch
- Fix: `staleTime: 0` global — semua CRUD page selalu refetch saat mount
- Analytics hooks (useMetrics, useDashboard) yang berat tetap punya `staleTime: 5 min` override sendiri
- Juga: hapus hardcoded `staleTime: 5 * 60 * 1000` dari `usePageSettings()` dan `useConfig()`

**Bug Fix — Pre-existing TS Error:**
- `frontend/src/mocks/handlers.ts`: `authHandlers` diimport tapi tidak dipakai → comment import

**File yang diubah (sesi ini):**
- `backend/src/db/seed.ts` — 88 permissions, 24 categories, dot-notation keys, `cleanupOldPermissions()`
- `backend/src/features/companies/companies.repository.ts` — `inArray` empty guard
- `backend/src/features/customers/customers.repository.ts` — `inArray` empty guard
- `backend/src/features/import/import.repository.ts` — `inArray` empty guard
- `backend/src/features/audit/audit.repository.ts` — `inArray` empty guard
- `frontend/src/hooks/useCan.ts` — NEW hook
- `frontend/src/lib/queryClient.ts` — `staleTime: 0`
- `frontend/src/hooks/usePageSettings.ts` — hapus hardcoded staleTime
- `frontend/src/mocks/handlers.ts` — comment authHandlers import
- `frontend/src/pages/Users/index.tsx` — button guards
- `frontend/src/pages/RBAC/index.tsx` — button guards
- `frontend/src/pages/Companies/index.tsx` — button guards
- `frontend/src/pages/Companies/components/BranchSection.tsx` — button guards
- `frontend/src/pages/Settings/Divisions/index.tsx` — button guards
- `frontend/src/pages/Settings/HighMargin/index.tsx` — button guards
- `frontend/src/pages/Settings/Threshold/index.tsx` — button guards
- `frontend/src/pages/Config/Classification/index.tsx` — button guards
- `frontend/src/pages/Config/Integration/index.tsx` — button guards
- `frontend/src/pages/Config/Features/index.tsx` — button guards
- `frontend/src/pages/Import/components/UploadFileCard.tsx` — button guards
- `frontend/src/pages/Import/components/AccurateApiCard.tsx` — button guards
- `docs-v2/features/permissions.md` — diupdate (88 perms, 24 cat, useCan pattern)

**Pending (belum dikerjakan):**
- Export buttons: permission key `:export` sudah ada di 10 halaman, tapi tombol belum dibuat
- `settings.app:update` guard: AppSettings page hanya localStorage/i18n — tidak perlu API guard
- Permission count gap: user expect 95, aktual 88 — 7 permission unaccounted (belum dikonfirmasi)
- Re-import data: DB kosong setelah drop/re-seed, user sedang import via Import page

---

### 2026-06-28/29 (sesi 23): M6 Repeat Order Rate + M7 Expansion Rate — Formula & UI Fix

**M6 — Repeat Order Rate (formula direvisi):**
- Numerator: existing dengan `COUNT(DISTINCT invoice_id) > 1` dalam 30 hari aktif (sebelumnya: ≥1 invoice)
- CTE `repeat_orders` di `fetchCustomerMetricsTrend` — `HAVING COUNT(DISTINCT ri.invoice_id) > 1`
- Threshold configurable via `business_configs.repeat_order_target_pct` (default 80)
- `loadThresholds()` dijalankan paralel di `getCustomerMetrics()` untuk ambil `repeatOrderTargetPct`
- Response `repeat_order_current: { value, target_pct }` (bukan angka scalar)

**M6 — RadialBarWidget Fix:**
- Domain `[0, thresholdGreen]` (bukan `[0, 100]`) — lingkaran penuh = target
- Warna proporsional: `pct = value / thresholdGreen × 100`, hijau ≥ 100%, kuning ≥ 75%, merah < 75%
- Prop baru: `onChartClick` — klik area chart membuka modal

**M6 — ROR Breakdown Modal:**
- Endpoint baru: `GET /metrics/ror-breakdown?month=&company_id=&division=`
- `fetchRorBreakdown()` di repository — `HAVING COUNT(DISTINCT i.id) > 1`, return `repeat_count + total_existing + rows`
- Modal `ResponsiveListView` dengan `StatusChip` untuk kolom `invoice_count`
- `useRorBreakdown()` hook di `useMetrics.ts`

**M6 — Settings Threshold (Target KPI):**
- DB migration `0005_repeat_order_config.sql` — insert `repeat_order_target_pct = 80`
- `ThresholdConfig.repeatOrderTargetPct` di `threshold.ts`
- Settings/Threshold page: section "Target KPI" dengan `EditablePctCell`
- `useUpdateConfig` invalidate `['metrics']` cache setelah update agar dashboard refresh otomatis

**M7 — Expansion Rate (formula direvisi):**
- Window sebelumnya: `(period_end - 60 hari, period_end - 30 hari]` — bukan bulan kalender sebelumnya
- CTE baru `prev_inv_agg` menggantikan `LEFT JOIN active_inv_agg prev ON prev.ms = m.ms - 1 month`
- Numerator: `COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0)` — customer 0→sesuatu dihitung sebagai "naik"
- Denominator: `COUNT(DISTINCT e.id)` — semua existing

**M7 — BarChartWidget Labels:**
- Prop baru `showLabels` + `labelFormatter` di `BarChartWidget`
- Menggunakan `LabelList` Recharts, skip jika nilai < 5
- M7 aktifkan `showLabels`, `labelFormatter={(v) => '${v.toFixed(1)}%'}`
- Subtitle: "Hijau = % spending naik vs 30 hari sebelumnya · Abu-abu = % flat/turun"

**File yang diubah:**
- `backend/src/features/metrics/metrics.repository.ts` — CTE `prev_inv_agg`, `repeat_orders`, formula M6/M7, `fetchRorBreakdown()`
- `backend/src/features/metrics/metrics.types.ts` — `RorBreakdownRow`, `RorBreakdownData`, `RepeatOrderCurrent`
- `backend/src/features/metrics/metrics.schema.ts` — `rorBreakdownQuerySchema`
- `backend/src/features/metrics/metrics.service.ts` — `getRorBreakdown()`, parallel `loadThresholds()`, `repeat_order_current.target_pct`
- `backend/src/features/metrics/metrics.handler.ts` — `handleGetRorBreakdown`
- `backend/src/features/metrics/metrics.route.ts` — `GET /ror-breakdown`
- `backend/src/features/config/threshold.ts` — `ThresholdConfig.repeatOrderTargetPct`, `DEFAULTS`, `parseThresholdConfigs`
- `backend/src/db/migrations/0005_repeat_order_config.sql` — NEW (DB seed config)
- `backend/src/db/seed.ts` — `repeat_order_target_pct`
- `frontend/src/types/metrics.ts` — `RorBreakdownRow`, `RorBreakdownData`, `RepeatOrderCurrent`
- `frontend/src/api/metrics.api.ts` — `getRorBreakdown()`
- `frontend/src/hooks/useMetrics.ts` — `useRorBreakdown()`
- `frontend/src/hooks/usePageSettings.ts` — `useUpdateConfig` invalidate `['metrics']`
- `frontend/src/pages/CustomerMetrics/M6RepeatOrder.tsx` — REWRITTEN (RadialBarWidget + ROR modal)
- `frontend/src/pages/CustomerMetrics/M7Expansion.tsx` — UPDATED (showLabels + subtitle fix)
- `frontend/src/pages/CustomerMetrics/index.tsx` — UPDATED (`thresholdPct` prop)
- `frontend/src/pages/Settings/Threshold/index.tsx` — UPDATED (Target KPI section + EditablePctCell)
- `frontend/src/components/charts/RadialBarWidget/RadialBarWidget.tsx` — UPDATED (domain, color, onChartClick)
- `frontend/src/components/charts/BarChartWidget/BarChartWidget.tsx` — UPDATED (showLabels, labelFormatter)
- `docs-v2/executive-dashboard/metrics.md` — UPDATED (M6, M7 definisi direvisi)
- `docs-v2/executive-dashboard/api.md` — UPDATED (+/metrics/customer-metrics, +/metrics/ror-breakdown)
- `docs-v2/shared/metrics_docs.md` — UPDATED (+M6, +M7 full documentation)
- `docs-v2/shared/ui-patterns.md` — UPDATED (RadialBarWidget domain/color, BarChartWidget showLabels)

---

### 2026-06-27 (sesi 22): BuChip Defensive + Mock Data Migration + Layout Fixes Channel Divisions

**Bug Fix — `BuChip.tsx` crash pada nilai BU lama:**
- Error: `Cannot destructure property 'label' of 'map[bu]' as it is undefined` — terjadi karena mock data Transactions & Products masih pakai nilai lama (`b2b_dc`, `b2b_project`, `b2c`, `manufacturing`) sementara map sudah update ke Division values
- Fix 1: `BuChip` sekarang defensive — `const entry = map[bu]; if (!entry) return <StatusChip label={bu} color="default" />`
- Fix 2: `mocks/handlers/transactions.handler.ts` — semua nilai lama diganti: `b2b_dc→distribution`, `b2b_project→project`, `b2c→e_commerce`, `manufacturing→intercompany`
- Fix 3: `mocks/handlers/products.handler.ts` — idem: `b2c→e_commerce`, `b2b_dc→distribution`, `b2b_project→project`

**Layout Fix — Channel Divisions Settings page (desktop):**
- `DivisionMappingDialog`: `<DialogContent dividers>` — `dividers` prop tambah separator + proper padding, field Channel Name tidak tertutup DialogTitle
- `Divisions/index.tsx`: hapus outer `<Card>` wrapper di sekitar `ResponsiveListView` — komponen sudah punya Card sendiri di desktop; double-wrap menyebabkan flex column collapse jadi 0-width
- Kolom `channel_name`: `flex: 2` → `flex: 1, minWidth: 180` (mencegah collapse)
- Kolom `company_name`: `width: 160` (fixed) → `flex: 1, minWidth: 140` (lebih proporsional)

**Perubahan file:**
- `frontend/src/pages/Transactions/components/BuChip.tsx` — UPDATED (defensive guard)
- `frontend/src/mocks/handlers/transactions.handler.ts` — UPDATED (Division values)
- `frontend/src/mocks/handlers/products.handler.ts` — UPDATED (Division values)
- `frontend/src/pages/Settings/Divisions/index.tsx` — UPDATED (hapus outer Card, flex+minWidth kolom)
- `frontend/src/pages/Settings/Divisions/components/DivisionMappingDialog.tsx` — UPDATED (dividers)
- `docs-v2/shared/ui-patterns.md` — UPDATED (ResponsiveListView anti-pattern: jangan double-wrap Card + catatan flex column minWidth)

---

### 2026-06-27 (sesi 21): Channel Division Frontend + Rename salesperson_name → channel_name

**Frontend — Channel Division Display:**
- `frontend/src/types/customers.ts` — `Division` type (distribution|project|e_commerce|intercompany|freelancer|support|null), `CustomerRow.division`, `CustomerDetail.division + channel`
- `frontend/src/pages/Customers/components/DivisionChip.tsx` — chip berwarna per divisi (NEW)
- `frontend/src/pages/Customers/index.tsx` — kolom `division` dengan DivisionChip, filter divisionFilter, param `business_unit`
- `frontend/src/pages/Customers/components/CustomerDetailModal.tsx` — tampilkan `division` (DivisionChip) + `channel` (text)
- `frontend/src/pages/Customers/components/CustomerDetailDrawer.tsx` — sama dengan modal
- `frontend/src/pages/Transactions/components/BuChip.tsx` — update label/color map ke Division values
- `frontend/src/pages/Customers/components/BuLabel.tsx` — update label map ke Division values
- `frontend/src/mocks/handlers/customers.handler.ts` — mock data: `division` + `channel` field, filter via `c.division`
- `frontend/src/i18n/locales/en.json` + `id.json` — `customers.detail.division` + `customers.detail.channel`

**Backend — Rename `salesperson_name` → `channel_name`:**
- `backend/src/db/schema/invoices.ts` — kolom `channel_name` (was `salesperson_name`)
- `backend/src/db/schema/channel_divisions.ts` — kolom `channel_name` (was `salesperson_name`)
- `backend/src/db/migrations/0004_rename_salesperson_to_channel_name.sql` — ALTER TABLE statements (dieksekusi manual via postgres.js, bukan drizzle-kit)
- `backend/src/features/customers/customers.repository.ts` — subquery + JOIN pakai `channel_name`
- `backend/src/features/import/import.repository.ts` — `upsertCustomer` pakai `channel_name`
- `backend/src/features/import/import.service.ts` — `channel_name: row.channel_name` (2 tempat)
- `backend/src/utils/parser.ts` — `InvoiceRow.channel_name`, `OPTIONAL_EXCEL_HEADERS` key `channel_name`

**Backend — Division Filter Fix:**
- Filter `business_unit` sebelumnya pakai `customers.business_unit` (null semua) → sekarang `channel_divisions.division`
- JOIN channel_divisions ditambah ke COUNT query (tidak hanya main query)
- Verified: `intercompany` → 2 results, `distribution` → 225 results

**Pelajaran Penting:**
- `drizzle-kit migrate` hanya menjalankan file yang di-generate oleh `drizzle-kit generate` — TIDAK menjalankan file SQL manual di folder migrations
- Fix kolom rename: jalankan `ALTER TABLE` langsung via postgres.js one-liner

**Perubahan file:**
- `frontend/src/types/customers.ts` — UPDATED (Division type, division + channel fields)
- `frontend/src/pages/Customers/components/DivisionChip.tsx` — NEW
- `frontend/src/pages/Customers/index.tsx` — UPDATED (DivisionChip, divisionFilter)
- `frontend/src/pages/Customers/components/CustomerDetailModal.tsx` — UPDATED (division + channel)
- `frontend/src/pages/Customers/components/CustomerDetailDrawer.tsx` — UPDATED (division + channel)
- `frontend/src/pages/Transactions/components/BuChip.tsx` — UPDATED (Division values)
- `frontend/src/pages/Customers/components/BuLabel.tsx` — UPDATED (Division values)
- `frontend/src/mocks/handlers/customers.handler.ts` — UPDATED (division + channel mock data)
- `frontend/src/i18n/locales/en.json` + `id.json` — UPDATED (division + channel keys)
- `backend/src/db/schema/invoices.ts` — UPDATED (channel_name)
- `backend/src/db/schema/channel_divisions.ts` — UPDATED (channel_name)
- `backend/src/features/customers/customers.repository.ts` — UPDATED (division filter via JOIN)
- `backend/src/features/import/import.repository.ts` — UPDATED (channel_name)
- `backend/src/features/import/import.service.ts` — UPDATED (channel_name)
- `backend/src/utils/parser.ts` — UPDATED (channel_name)

---

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

### 2026-06-27: Backend Architecture Refactor + Menu Permission via RBAC

**Backend — Thin Handler Pattern (semua handler direfactor):**
- Handler sekarang tipis: hanya validate input → call service → return response. TIDAK ADA try-catch di handler.
- Error handling & translation pindah ke service layer (isNotFoundError → 404, isDuplicateError → 409, unknown → 500)
- 4 service baru dibuat:
  - `customers/customers.service.ts` — wrap findCustomers + findCustomerDetail
  - `settings/channel-divisions.service.ts` — CRUD channel divisions + isDuplicateError
  - `products/products.service.ts` — wrap findProducts + getLocalCategories
  - `import/classification.service.ts` — wrap CRUD classification rules
- 6 service yang ada diupdate: tambah `isDuplicateError` import + try-catch di fungsi create/update: companies, branch, roles, users, permissions, high-margin
- Bug fix: `config.service.ts` — `AppError(NOT_FOUND)` tanpa status code diperbaiki ke `404`
- Rules terdokumentasi di `docs-v2/CLAUDE.md`, `.clinerules`, dan `docs-v2/shared/backend.md`

**Frontend — Menu Visibility via Permissions:**
- `auth.context.ts` + `AuthContext.tsx`: tambah `permissions: string[]` ke context; simpan di localStorage sebagai `auth_permissions`
- `hooks/useAuth.ts`: ekstrak `permissions` dari login response, pass ke `login()`
- `config/menu.tsx`: tambah `permissionKey` ke setiap `NavItem` (contoh: `customers:menu`, `audit:menu`)
- `Sidebar.tsx`: filter items dengan `canSee(permissionKey)` — group otomatis hilang jika semua child tersembunyi
- `mocks/handlers/auth.handler.ts`: update mock permissions ke format yang benar (`metrics:menu` dll)
- Cara pakai: Admin atur permission `customers:menu` per role di halaman RBAC → Set Permission → toggle kolom "Menu"

**Aturan baru:**
- Handler wajib tipis — no try-catch, no AppError
- Service wajib catch raw DB errors dan translate ke AppError dengan status code eksplisit
- `isNotFoundError()` dan `isDuplicateError()` dari `utils/response` adalah standard helper
- `AppError` selalu harus punya arg ke-3 (status code) — tidak boleh andalkan default

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

### 2026-06-29: Sinkronisasi dokumentasi dengan kondisi aktual project (audit kode menyeluruh)

**Verifikasi backend — semua file dibaca isinya:**
- ✅ Semua route files (17 file) — endpoint terdaftar
- ✅ Semua handler files — thin handler pattern
- ✅ Semua service files — business logic
- ✅ Semua repository files — DB queries
- ✅ Schema files (21 tabel) — lengkap
- ✅ Seed data — companies, branches, roles, permissions, users, configs, classification rules
- ✅ Middleware — hanya requestId + requestLogger
- ✅ Router.ts — semua route terdaftar (kecuali auth + transactions)
- ✅ Tidak ada: `backend/src/features/auth/` atau `backend/src/features/transactions/`

**Frontend — verifikasi halaman & API:**
- ✅ Semua halaman di routeConstants.tsx (25+ entries) sudah ada komponennya
- ✅ Semua API modules (17 file) — dipanggil via TanStack Query hooks
- ✅ MSW handlers (14 file) — mock untuk dev

**Dokumentasi diupdate:**
- `CLAUDE.md` — progress Frontend ~97%, Backend ~80%
- `CURRENT_STATE.md` — status per fitur akurat, tabel halaman diperbarui
- `CURRENT_STATE_BACKEND.md` — Metrics dari 0% → ~70%, fitur lain diverifikasi

---

### 2026-06-18: Refactor dokumentasi docs-v2 selesai. Semua 23 file sudah lengkap. Konten bersumber dari docs/backup/ (AI_AGENT_GUIDE, API_SPEC, FINALIZED_MENU_STRUCTURE, METRICS_SPEC, DATA_MODEL, ARCHITECTURE) yang direfactor menjadi struktur modular per-domain. File-file yang sebelumnya kosong (product-workbench/api.md, product-workbench/decisions.md, transaction-workbench/*, admin/*) sudah diisi. Anti-pattern dari AI_AGENT_GUIDE.md sudah ada di shared/ui-patterns.md.