# CURRENT_STATE.md — Status Pengerjaan

> Update file ini setiap sesi kerja selesai.

## Overall Progress
| Layer    | Status | Notes                          |
|----------|--------|--------------------------------|
| Frontend | ~75%   | Core pages done, Admin pending |
| Backend  | 0%     | Not started                    |
| Database | 0%     | Schema designed, not migrated  |
| Docs     | 100%   | docs-v2 refactor selesai semua 23 file |

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
| RBAC             | `/rbac`             | Role list, permission matrix, delete dialog |
| Import           | `/import`           | Form upload/Accurate + riwayat log + error detail dialog, mock API |

### Partial / Needs Refactor
| Page             | Issue                                           |
|------------------|-------------------------------------------------|
| Customer Metrics | Split into: 2.2 Expansion + 3.2 High Margin     |

### Not Built
| Page                        | Group | Priority |
|-----------------------------|-------|----------|
| Customer 360 & Segmentation | 2.1   | High     |
| Expansion & Upsell Targets  | 2.2   | High (split dari CustomerMetrics) |
| Product Performance Ledger  | 3.1   | Blocked (lihat product-workbench/decisions.md) |
| High Margin Push List       | 3.2   | Medium (split dari CustomerMetrics) |
| Product Trend & Velocity    | 3.3   | Medium (reuse M2 chart) |
| Dormant Product / Dead Stock| 3.4   | Blocked (scope belum final) |
| B2B DC & B2C Order Ledger   | 4.1   | Medium   |
| B2B Project Milestone       | 4.2   | Low* (open decision: MVP or v2) |
| Repeat Order & Loyalty      | 4.3   | Medium (reuse M6 chart)   |
| Import UI                   | 5.1   | High     |
| Users Management            | 5.2   | High     |
| RBAC Management             | 5.3   | High     |
| Config UI                   | 5.4   | Medium   |
| Audit Log Viewer            | 5.5   | Medium   |

*4.2 B2B Project: high complexity — konfirmasi dulu apakah masuk MVP sebelum mulai

## Frontend — Components Available (Reusable)
| Component          | Type                        | Used in              |
|--------------------|-----------------------------|----------------------|
| `Card`             | Atomic flat card (Paper wrapper) | Semua halaman — single source of truth styling card |
| `StatCard`         | Simple line (no axes)       | Dashboard M1-M10     |
| `AreaChartWidget`  | Multi-series area           | M2                   |
| `BarChartWidget`   | Grouped/stacked/horizontal  | M1 M4 M7 M9          |
| `HeatmapWidget`    | CSS grid matrix             | M1.1                 |
| `ComboChartWidget` | Bar+Line dual-Y             | M3                   |
| `DonutChartWidget` | Pie with innerRadius        | M5                   |
| `RadialBarWidget`  | Ring progress               | M6                   |
| `LineAlertWidget`  | Line + ReferenceArea        | M8                   |
| `BulletChartWidget`| Custom CSS bullet           | M10                  |
| `ResponsiveListView` | Responsive table (desktop DataGrid / mobile card list) | Customers, Users, RBAC, CrossSelling |
| `DataTable` (removed) | — | Digantikan oleh `ResponsiveListView` |

## Backend — Status
Nothing built. Start with:
1. DB schema + migrations (`shared/data-model.md`)
2. Auth + RBAC endpoints (`admin/api.md`)
3. Import endpoints (`admin/api.md`)
4. Metrics endpoints (`executive-dashboard/api.md`)
5. Customer 360 endpoint (`customer-workbench/api.md`)
6. Invoice ledger endpoint (`transaction-workbench/api.md`)

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
- `page` — page ready flags
- `dashboard` — metrics summary
- `metrics` — per-metric endpoints

## Known Blockers / Decisions Pending
| Blocker                              | Owner    | Status  | Detail |
|--------------------------------------|----------|---------|--------|
| `business_unit` field di customers   | Dev      | Todo    | Blocker untuk 2.1, 4.1 BU filter |
| `products` master table              | PM/Dev   | Pending | Konfirmasi Accurate punya SKU/qty? |
| `projects` table (B2B Project BU)    | PM/Dev   | Pending | 4.2 masuk MVP atau v2? |
| Split CustomerMetrics: alokasi kolom | Dev      | Todo    | customer-workbench/decisions.md #1 |
| Scope 3.3: M2 saja atau agregasi baru| Dev      | Todo    | product-workbench/decisions.md #2 |
| Scope 3.4: "kategori dormant" bukan "dead stock" | PM | Pending | product-workbench/decisions.md #3 |
| Accurate API key: per-company vs global | PM    | Pending | admin/decisions.md #1 |
| Import preview step (Opsi A vs B)    | PM/Dev   | Pending | admin/decisions.md #3 |
| Audit log permission: roles:manage atau audit:read | PM | Pending | admin/decisions.md #2 |

## Next Actions (Priority Order)
1. Konfirmasi keputusan terbuka di tabel blocker bersama PM/stakeholder
2. Tambah `customers.business_unit` ke schema — unblock 2.1, 4.1, dan BU filter semua halaman
3. Build DB schema + migrations (`shared/data-model.md`)
4. Build Auth + RBAC backend
5. Build Import backend (file + Accurate API)
6. Build Import UI (5.1) — unblock pengisian data
7. Build Metrics backend (M1-M10)
8. Build Customer 360 page (2.1)
9. Split CustomerMetrics → 2.2 Expansion + 3.2 High Margin

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
