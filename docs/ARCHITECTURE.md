# ARCHITECTURE.md — Arsitektur Executive Dashboard

---

## 1. Gambaran Umum

```
[React SPA — Vite]
    │ HTTPS + httpOnly Cookie + X-CSRF-Token
    ▼
[Hono Router — Bun Runtime]
    │
[Middleware Stack]
  CORS → CSRF → RateLimit → Auth (JWT) → RBAC (Permission) → CompanyAccess
    │
[Handler Layer]       ← validasi input (zod), format response
    │
[Service Layer]       ← business logic, kalkulasi metrik
    │
[Repository Layer]    ← query database via Drizzle ORM
    │
[PostgreSQL 15]
    │
[Utils]
  logger | jwt | hash | response | error | audit | parser | accurate | csrf
```

---

## 2. Struktur Folder

### Backend (`/backend`)

```
backend/
├── src/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── companies.ts
│   │   │   ├── invoices.ts           ← header faktur
│   │   │   ├── invoice-items.ts      ← baris item per faktur
│   │   │   ├── customers.ts
│   │   │   ├── product-categories.ts
│   │   │   ├── import-logs.ts
│   │   │   ├── metric-cache.ts
│   │   │   ├── audit-logs.ts
│   │   │   └── app-configs.ts
│   │   ├── migrations/
│   │   └── index.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.handler.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts
│   │   ├── users/
│   │   ├── companies/
│   │   ├── rbac/                     ← modul RBAC dinamis
│   │   │   ├── rbac.handler.ts       ← CRUD role, permission, assign
│   │   │   ├── rbac.service.ts
│   │   │   ├── rbac.repository.ts
│   │   │   ├── rbac.routes.ts
│   │   │   └── rbac.schema.ts
│   │   ├── import/                   ← gabungan upload file + API Accurate
│   │   │   ├── import.handler.ts
│   │   │   ├── import.service.ts     ← orchestrate file & accurate source
│   │   │   ├── import.repository.ts
│   │   │   ├── import.routes.ts
│   │   │   ├── import.schema.ts
│   │   │   └── sources/
│   │   │       ├── file.source.ts    ← parsing CSV/Excel
│   │   │       └── accurate.source.ts ← fetch dari Accurate API
│   │   ├── metrics/
│   │   │   ├── metrics.handler.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── metrics.repository.ts
│   │   │   ├── metrics.routes.ts
│   │   │   └── calculators/
│   │   │       ├── cross-selling.ts
│   │   │       ├── avg-category.ts
│   │   │       ├── avg-revenue.ts
│   │   │       ├── avg-gross-profit.ts
│   │   │       ├── high-margin-penetration.ts
│   │   │       ├── repeat-order-rate.ts
│   │   │       ├── expansion-rate.ts
│   │   │       ├── dormant-rate.ts
│   │   │       ├── dormant-value.ts
│   │   │       └── reactivation-rate.ts
│   │   ├── customers/
│   │   └── config/
│   │
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── csrf.ts
│   │   ├── auth.ts
│   │   ├── rbac.ts                   ← requirePermission(), requireRole()
│   │   ├── company-access.ts
│   │   └── rate-limit.ts
│   │
│   ├── utils/
│   │   ├── logger.ts                 ← winston wrapper (lihat §Logger)
│   │   ├── response.ts
│   │   ├── error.ts
│   │   ├── jwt.ts
│   │   ├── hash.ts
│   │   ├── csrf.ts
│   │   ├── audit.ts                  ← logAudit() → tulis ke DB
│   │   ├── parser.ts                 ← parseCsv(), parseExcel()
│   │   ├── accurate.ts               ← wrapper Accurate Online API
│   │   └── validator.ts
│   │
│   ├── types/
│   │   ├── hono.d.ts
│   │   └── index.ts
│   │
│   └── app.ts
│
├── log/                              ← folder log file (gitignored)
│   ├── warn/
│   └── error/
│
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

### Frontend (`/frontend`) — Status Aktual

```
frontend/
├── src/
│   ├── api/
│   │   ├── axios.ts                  ✅ axios instance + CSRF interceptor + 401 redirect
│   │   ├── auth.api.ts               ✅ login, me, logout
│   │   ├── dashboard.api.ts          ✅ getDashboard
│   │   ├── page.api.ts               ✅ getPageSettings (native fetch)
│   │   ├── metrics.api.ts            ☐ belum ada (inline di pages)
│   │   ├── import.api.ts             ☐ belum ada
│   │   ├── customers.api.ts          ☐ belum ada
│   │   ├── rbac.api.ts               ☐ belum ada
│   │   └── config.api.ts             ☐ belum ada
│   │
│   ├── config/
│   │   └── menu.tsx                  ✅ NAV_ITEMS (9 item dengan ikon MUI)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx           ✅ AuthProvider, useAuth, ProtectedRoute
│   │   └── CompanyContext.tsx        ☐ belum ada
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                ✅ useLoginMutation, useLogoutMutation
│   │   ├── useDashboard.ts           ✅ useQuery → dashboardApi
│   │   ├── useMetrics.ts             ☐ belum ada (inline di pages)
│   │   ├── useImport.ts              ☐ belum ada
│   │   ├── useCompany.ts             ☐ belum ada
│   │   └── useRbac.ts                ☐ belum ada
│   │
│   ├── lib/
│   │   └── queryClient.ts            ✅ QueryClient + global error handler
│   │
│   ├── mocks/                        ✅ MSW mock server (aktif di dev saja)
│   │   ├── browser.ts
│   │   ├── handlers.ts
│   │   └── handlers/
│   │       ├── auth.handler.ts       ✅ login, me, logout
│   │       ├── page.handler.ts       ✅ page-settings (dashboard=ready, lainnya=false)
│   │       ├── dashboard.handler.ts  ✅ 10 MetricCard + trend 12 bulan
│   │       └── metrics.handler.ts    ✅ cross-selling (+ heatmap), customer-metrics, dormant-customer
│   │
│   ├── pages/
│   │   ├── Login/                    ✅ form + validasi + error dialog + i18n
│   │   ├── Dashboard/                ✅ 10 StatCard + 7 chart widgets (spec-matched) + Definisi Kunci
│   │   ├── CrossSelling/             ✅ M1 GroupedBar + M1.1 Heatmap + M2 AreaChart + DataTable
│   │   ├── CustomerMetrics/          ✅ M3 Combo + M4 Stacked + M5 Donut + M6 Radial + M7 HorizStacked
│   │   ├── DormantCustomer/          ✅ M8 LineAlert + M9 HorizRanking + M10 BulletChart
│   │   ├── Import/                   ☐ placeholder
│   │   ├── Users/                    ☐ placeholder
│   │   ├── RBAC/                     ☐ placeholder
│   │   ├── Config/                   ☐ placeholder
│   │   ├── AuditLog/                 ☐ placeholder
│   │   ├── NotFound/                 ✅
│   │   └── UnderMaintenance/         ✅ animasi gears
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Alert/                ✅ AppAlert (dialog modal)
│   │   │   ├── AppBar/               ✅ DashboardAppBar
│   │   │   ├── Button/               ✅ dengan isLoading prop
│   │   │   ├── Card/                 ✅
│   │   │   ├── Footer/               ✅
│   │   │   ├── LogoutButton/         ✅
│   │   │   ├── Sidebar/              ✅ collapsible 220px/56px
│   │   │   └── TextField/            ✅ Controller react-hook-form
│   │   ├── charts/
│   │   │   ├── StatCard/             ✅ layout 2-kolom: teks kiri + SimpleLineChart kanan (no axes)
│   │   │   ├── AreaChartWidget/      ✅ multi-series area chart dengan gradient
│   │   │   ├── BarChartWidget/       ✅ grouped/stacked/horizontal + tooltipFormatter
│   │   │   ├── HeatmapWidget/        ✅ matrix grid Customer × Produk (hijau/abu)
│   │   │   ├── ComboChartWidget/     ✅ Bar+Line dual Y-axis (Recharts ComposedChart)
│   │   │   ├── DonutChartWidget/     ✅ donut chart dengan center label overlay
│   │   │   ├── RadialBarWidget/      ✅ ring progress warna dinamis (hijau/kuning/merah)
│   │   │   ├── LineAlertWidget/      ✅ line + red alert shading di atas threshold
│   │   │   └── BulletChartWidget/    ✅ custom bullet chart dengan target band
│   │   ├── tables/
│   │   │   └── DataTable/            ✅ wrapper MUI X DataGrid
│   │   └── layout/
│   │       └── DashboardLayout.tsx   ✅ AppBar + Sidebar + main + Footer
│   │   ── CompanySelector.tsx        ☐ belum ada
│   │   ── PeriodFilter.tsx           ☐ belum ada
│   │   ── ActiveWindowFilter.tsx     ☐ belum ada
│   │   ── PermissionGuard.tsx        ☐ belum ada (cek permission, bukan role)
│   │
│   ├── route/
│   │   └── routes.tsx                ✅ routeRegistry (9 route lazy-loaded)
│   │
│   ├── theme/
│   │   ├── index.ts                  ✅ lightTheme + darkTheme
│   │   └── ThemeContext.tsx          ✅ toggle + localStorage
│   │
│   ├── types/
│   │   ├── api.ts                    ✅
│   │   ├── auth.ts                   ✅
│   │   ├── dashboard.ts              ✅ MetricCard, DashboardData, MonthlyTrendPoint
│   │   └── page.ts                   ✅ PageSetting
│   │
│   ├── i18n/
│   │   ├── index.ts                  ✅
│   │   └── locales/
│   │       ├── en.json               ✅
│   │       └── id.json               ✅
│   │
│   └── utils/
│       └── errorBoundary.tsx         ✅
│
├── public/                           (MSW service worker di sini)
├── vite.config.ts
└── package.json
```

---

## 3. Logger — Aturan Output

Winston dikonfigurasi dengan transport yang berbeda per level:

| Level | Konsol | File |
|-------|--------|------|
| `info` (activity, HTTP request) | ✅ | ❌ |
| `warn` | ✅ | ✅ `log/warn/YYYY-MM-DD.log` |
| `error` | ✅ | ✅ `log/error/YYYY-MM-DD.log` |

```typescript
// utils/logger.ts — konfigurasi winston
const logger = winston.createLogger({
  transports: [
    // Konsol: semua level
    new winston.transports.Console({ level: 'info' }),

    // File warn: hanya level warn
    new winston.transports.DailyRotateFile({
      level: 'warn',
      filename: 'log/warn/%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),

    // File error: hanya level error
    new winston.transports.DailyRotateFile({
      level: 'error',
      filename: 'log/error/%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
})
```

> Gunakan `winston-daily-rotate-file` untuk rotasi otomatis harian.
> Folder `log/` masuk `.gitignore`.

---

## 4. Audit Log — Database

Audit log **create/update/delete** disimpan ke tabel `audit_logs` di PostgreSQL, bukan ke file.

```typescript
// utils/audit.ts
export async function logAudit(ctx: HonoContext, opts: {
  action: string      // 'invoice.import', 'user.update', dll
  entity?: string
  entityId?: number
  meta?: Record<string, unknown>
}) {
  await db.insert(auditLogs).values({
    actorId:   ctx.get('user').id,
    action:    opts.action,
    entity:    opts.entity,
    entityId:  opts.entityId,
    meta:      opts.meta,
    ipAddress: ctx.req.header('x-forwarded-for') ?? ctx.req.raw.headers.get('x-real-ip'),
  })
}
```

Dipanggil di **Service layer** — bukan di handler, bukan di middleware.

---

## 5. RBAC — Dinamis

Middleware mengecek permission dari DB (atau cache), bukan dari hardcoded array.

```typescript
// middleware/rbac.ts

// Cek permission — PREFER ini
export const requirePermission = (...permissions: string[]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user')
    const userPermissions = await rbacRepository.getUserPermissions(user.id)
    const hasPermission = permissions.some(p => userPermissions.includes(p))
    if (!hasPermission) throw new AppError('FORBIDDEN', 403)
    await next()
  }

// Cek role — hanya jika benar-benar perlu
export const requireRole = (...roles: string[]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user')
    const hasRole = roles.some(r => user.roles.includes(r))
    if (!hasRole) throw new AppError('FORBIDDEN', 403)
    await next()
  }
```

Permission di-cache dalam JWT payload atau Redis (MVP: cache di memory per request).

---

## 6. Import Flow (File + API Accurate)

```
[Upload File]                          [API Accurate]
     │                                      │
import.handler.ts                    import.handler.ts
     │                                      │
     └──────────── import.service.ts ───────┘
                          │
                   sumber data → sources/file.source.ts
                                  atau sources/accurate.source.ts
                          │
                   normalized InvoiceRow[]
                          │
                   validasi & deduplication
                   (invoice_number + company_id)
                          │
                   ┌──────┴──────┐
                   │             │
              insert invoices   upsert customers
              insert invoice_items
                   │
              update import_logs
              logAudit('invoice.import')
```

---

## 7. Metrics Calculation Flow

```
GET /metrics/cross-selling?company_id=1&period_month=2024-01&active_window=6
    │
metrics.handler.ts
    ├── validateDto(metricsQuerySchema, query)
    └── metrics.service.getCrossSelling(params)
        ├── cek metric_cache → jika hit & belum expires, return
        ├── calculators/cross-selling.ts
        │     ├── query invoice_items JOIN invoices JOIN customers
        │     ├── filter: company_id, invoice_date dalam period_month
        │     ├── filter: is_service = false (hanya produk)
        │     ├── hitung total_active_customers (berdasarkan active_window)
        │     └── hitung customer dengan COUNT(DISTINCT category) > 1
        ├── simpan ke metric_cache
        └── return result
```

---

## 8. Keamanan

| Aspek | Implementasi |
|-------|--------------|
| JWT | httpOnly; Secure; SameSite=Strict cookie |
| CSRF | Double-submit, header X-CSRF-Token |
| Password | bcryptjs cost ≥ 12 |
| Company isolation | Middleware + filter company_id wajib semua query |
| Accurate API key | Simpan di app_configs dengan is_secret=true, tidak pernah di-return ke frontend |
| Upload | Validasi MIME + ekstensi whitelist + max size |
| Rate limiting | Per-IP, terutama login & import |
| Error response | Tidak ada stack trace ke client |
| Audit | Mutasi penting → tabel audit_logs |

---

## 9. Konfigurasi Dinamis

Disimpan di `app_configs`, bisa diubah dari dashboard tanpa redeploy:

| Key (global) | Default | Keterangan |
|---|---|---|
| `dormant_threshold_months` | `3` | Bulan tidak transaksi = dormant |
| `metric_cache_ttl_minutes` | `60` | TTL cache metrik |
| `upload_max_file_size_mb` | `10` | Max ukuran file upload |

| Key (per company) | Keterangan |
|---|---|
| `accurate_api_key` | API key Accurate (is_secret=true) |
| `accurate_company_db` | ID database di Accurate |
| `high_margin_category_ids` | Array ID kategori high margin |

---

## 10. ADR — Architecture Decision Records

### ADR-001: Drizzle ORM
**Keputusan**: Drizzle ORM, bukan Prisma  
**Alasan**: Lebih cocok dengan Bun runtime, type-safe tanpa codegen saat runtime, performa query analitik lebih baik

### ADR-002: Satu database, filter company_id
**Keputusan**: Tidak pakai schema/database terpisah per entitas  
**Alasan**: 3 entitas saja, tidak over-engineering

### ADR-003: Kalkulasi metrik di backend
**Keputusan**: Semua kalkulasi di service layer  
**Alasan**: Konsistensi, bisa di-cache, tidak expose raw data ke frontend

### ADR-004: Metric cache di PostgreSQL
**Keputusan**: Cache di tabel `metric_cache`, bukan Redis  
**Alasan**: Mengurangi beban query tanpa dependency tambahan di MVP

### ADR-005: invoices + invoice_items (bukan satu tabel)
**Keputusan**: Pisah header faktur dan item detail  
**Alasan**: Accurate Online mengeluarkan faktur dengan N item — struktur ini akurat secara data dan memudahkan kalkulasi per kategori

### ADR-006: Audit log ke DB, activity log ke konsol saja
**Keputusan**: Mutasi penting → `audit_logs` DB. HTTP activity → konsol Winston saja  
**Alasan**: Audit bisnis perlu bisa di-query dan ditampilkan di UI. Log HTTP tidak perlu persistent.

### ADR-007: RBAC dinamis
**Keputusan**: Role & permission dikelola dari dashboard, tidak hardcoded  
**Alasan**: Fleksibilitas bisnis — role bisa berubah tanpa redeploy

### ADR-008: Accurate API key di app_configs per company
**Keputusan**: Credential Accurate disimpan di DB (encrypted flag is_secret), bukan .env  
**Alasan**: Tiap dari 3 entitas punya credential Accurate berbeda
