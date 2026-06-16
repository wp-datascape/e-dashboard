# MASTER_CONTEXT.md — Dokumen Induk Executive Dashboard

> **Entry point utama untuk AI.** Baca file ini pertama, lalu baca `AI_RULES.md` dan `CONTEXT_STATE.md`.

---

## Snapshot untuk AI

```
Project      : Executive Dashboard — Holding Company
Konteks      : Dashboard statistik bisnis untuk 3 entitas perusahaan dalam satu holding
Backend      : Bun + Hono (REST API) + Drizzle ORM
Frontend     : React 19 + Vite 8 + TypeScript 6 (SPA)
Database     : PostgreSQL 15
Auth         : JWT di httpOnly Cookie + CSRF Token (dev: localStorage + MSW mock)
Logger       : Winston — activity/info ke konsol saja; warn & error ke konsol + file (log/warn/, log/error/)
Audit Log    : Mutasi create/update/delete disimpan ke tabel audit_logs di DB (bukan file)
RBAC         : Dinamis seperti Spatie — role & permission dikelola dari dashboard
Data Source  : Faktur penjualan Accurate Online — via upload file CSV/Excel + API Accurate
Mock Server  : MSW v2 (aktif di development saja — 4 domain: auth, page, dashboard, metrics)
Status       : [isi dari CONTEXT_STATE.md]
```

**Urutan baca dokumen:**
1. `MASTER_CONTEXT.md` — ini
2. `AI_RULES.md` — aturan kode, konvensi, batasan MVP
3. `CONTEXT_STATE.md` — status pengerjaan saat ini
4. `METRICS_SPEC.md` — **WAJIB sebelum kerjakan fitur metrik**
5. *(jika perlu)* `ARCHITECTURE.md` / `DATA_MODEL.md` / `API_SPEC.md`

---

## 1. Konteks Bisnis

Executive Dashboard menyajikan 10 metrik bisnis strategis untuk **holding company dengan 3 entitas perusahaan**. Data bersumber dari **faktur penjualan Accurate Online**, bisa diimport via upload file CSV/Excel atau fetch langsung dari Accurate API.

**Alur utama:**
```
Admin import faktur dari Accurate Online
  (upload file CSV/Excel ATAU trigger fetch API Accurate)
    → Sistem parsing, validasi, deduplication
    → Simpan ke invoices + invoice_items per entitas
    → Upsert master customers & product_categories
    → Sistem hitung 10 metrik secara otomatis (on-demand + cache)
    → Executive / Manager lihat dashboard dengan filter entitas, periode, window aktif
    → Sales lihat detail customer dan metrik sesuai entitas mereka
```

**Prinsip desain:**
- Tidak over-engineering — 3 entitas cukup dengan `company_id` sebagai filter
- Struktur faktur: header (`invoices`) + baris item (`invoice_items`) — 1 invoice N items
- RBAC fully dynamic — role & permission bisa diubah dari dashboard tanpa deploy ulang
- Logger: activity ke konsol saja; warn/error ke konsol + file terpisah
- Audit mutasi penting ke tabel DB, bukan ke file log

---

## 2. Hierarki Peran (Default — Bisa Dikustomisasi)

```
superadmin  → Akses penuh, semua entitas, manage RBAC & config
    admin   → Import data, manage user & RBAC, semua entitas
    manager → View semua metrik & customer semua entitas (read-only)
    sales   → View metrik & customer sesuai entitas yang di-assign
  executive → View-only dashboard semua entitas (read-only)
```

> Role dan permission bisa ditambah/diubah dari dashboard. 5 role di atas adalah default (`is_system = true`).

---

## 3. Fitur Inti MVP

| Fitur | Keterangan |
|-------|------------|
| Import faktur — file | Upload CSV/Excel export dari Accurate Online |
| Import faktur — API | Fetch langsung ke Accurate Online API per company |
| Validasi & deduplication | Cek format, kolom, duplikasi `invoice_number + company_id` |
| 10 metrik bisnis | Dihitung otomatis dari data faktur |
| Filter aktif customer | 3 klasifikasi: aktif dalam 3 / 6 / 12 bulan |
| Filter entitas | Per company atau holding view (all) |
| Filter periode | Bulanan, kuartalan, tahunan |
| RBAC dinamis | Manage role & permission dari dashboard |
| Audit trail DB | Semua mutasi penting tercatat di `audit_logs` |
| Logger file | warn → `log/warn/`, error → `log/error/` |
| Konfigurasi dinamis | High margin, dormant threshold, Accurate API key |

**Tidak ada di MVP:** Export PDF/Excel, notifikasi realtime, scheduled sync Accurate, mobile app, email alert.

---

## 4. Struktur Data Faktur (Kritis)

```
Invoice INV-2024-001          ← tabel: invoices (1 baris)
  ├── Item: Scanner            ← tabel: invoice_items (N baris)
  ├── Item: Printer
  └── Item: Ribbon
```

- `invoices`: header — nomor, tanggal, customer, total revenue, total GP
- `invoice_items`: detail per produk/kategori — revenue, GP per item
- Deduplication key: `invoice_number + company_id`
- Metrik berbasis kategori (Cross Selling, Avg Category) → query dari `invoice_items`

---

## 5. 10 Metrik Bisnis (Ringkasan)

> Detail definisi, rumus, edge case → `METRICS_SPEC.md`

| # | Metrik | Basis Data |
|---|--------|------------|
| 1 | Cross Selling Ratio | invoice_items — COUNT DISTINCT category per customer |
| 2 | Avg Product Category per Customer | invoice_items |
| 3 | Avg Revenue per Existing Customer | invoices.total_revenue |
| 4 | Avg Gross Profit per Existing Customer | invoices.total_gp |
| 5 | High Margin Product Penetration | invoice_items JOIN product_categories |
| 6 | Repeat Order Rate | invoices + customers |
| 7 | Customer Expansion Rate | invoices — bandingkan 2 periode |
| 8 | Dormant Customer Rate | customers.last_invoice_date |
| 9 | Dormant Customer Value | AVG revenue × bulan dormant |
| 10 | Customer Reactivation Rate | customers + invoices |

**Definisi kunci:**
- **Customer Aktif**: `last_invoice_date >= (period_start - active_window bulan)`
- **Existing Customer**: `first_invoice_date < awal period_month`
- **New Customer**: `first_invoice_date` jatuh dalam `period_month`
- **Dormant**: `last_invoice_date < (period_start - dormant_threshold_months)`

---

## 6. Tech Stack Ringkasan

| Layer | Stack |
|-------|-------|
| Backend | Bun + Hono v4 + Drizzle ORM |
| Frontend | React 19 + Vite 8 + TypeScript 6 + MUI v9 |
| Database | PostgreSQL 15 |
| Logger | Winston (konsol + file rotate harian) |
| Charts | Recharts v3 |
| Tabel | MUI X DataGrid v9 |
| Form | React Hook Form v7 + Zod v4 |
| Data Fetching | TanStack Query v5 |
| Mock API (dev) | MSW v2 |
| Accurate | axios server-side via `utils/accurate.ts` |

---

## 7. Arsitektur Singkat

```
[React SPA — Vite 8]
    │ HTTPS + Cookie + X-CSRF-Token
    │ (dev: MSW Service Worker intercept — axios tetap jalan normal)
    ▼
[Hono Router — Bun Runtime]
    │
[Middleware: CORS → CSRF → RateLimit → Auth → RequirePermission → CompanyAccess]
    │
[Handler → Service → Repository → PostgreSQL]
    │                    │
[utils/accurate.ts]  [utils/audit.ts → audit_logs DB]
    │
[Accurate Online API]
```

---

## 8. API Overview

**Base URL**: `/api/v1`

| Domain | Endpoint Utama |
|--------|----------------|
| Auth | POST /auth/login, /auth/logout, /auth/refresh |
| Users | GET/PUT /users/me, CRUD /users |
| RBAC | CRUD /rbac/roles, CRUD /rbac/permissions, PUT /rbac/users/:id/roles |
| Companies | GET /companies |
| Import | POST /import/file, POST /import/accurate, GET /import/logs |
| Metrics | GET /metrics/summary, GET /metrics/:metric-name |
| Customers | GET /customers, GET /customers/:id |
| Config | GET /config, PUT /config/:key |
| Product Categories | GET/PUT /product-categories |
| Audit Log | GET /audit-logs |

---

## 9. Cara Menjalankan (Development)

```bash
# 1. Database
docker-compose up -d postgres

# 2. Backend
cd backend && cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun run dev

# 3. Frontend
cd frontend && cp .env.example .env
bun install
bun run dev
```

---

## 10. Referensi Dokumen

| File | Isi |
|------|-----|
| `AI_RULES.md` | Konvensi kode, aturan logger, audit, RBAC, batasan MVP |
| `ARCHITECTURE.md` | Struktur folder, layer, middleware, ADR |
| `DATA_MODEL.md` | Skema tabel (invoices + invoice_items), RBAC dinamis, urutan migrasi |
| `API_SPEC.md` | Semua endpoint, request/response, error codes |
| `METRICS_SPEC.md` | Definisi bisnis lengkap 10 metrik |
| `CONTEXT_STATE.md` | Status pengerjaan, checklist, blocker |
| `MASTER_CONTEXT.md` | File ini |
