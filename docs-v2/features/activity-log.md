# Feature: Activity Log

> Status: ✅ Complete — 3 endpoint aktif, di-mount di `/api/v1/activity-logs`, isolasi data superadmin
> Last updated: 2026-07-25 (task005)

---

## Overview

Riwayat "Level 1 + 2" dari kebutuhan activity tracking — beda dari `audit_logs` yang cuma mencatat mutasi CRUD dengan diff before/after.

Dua sumber tulis ke tabel yang sama:
- **Otomatis (Level 2 — Action Log)**: `activityLogMiddleware` (`middleware/activityLog.ts`) mencatat SEMUA request API terautentikasi — method, path, status code, durasi.
- **Eksplisit (Level 1 — Page Visit)**: frontend kirim `POST /activity-logs/page-view` tiap kali route React Router berubah (`usePageViewTracking` hook, dipasang di `DashboardLayout`), method disimpan sebagai `'PAGE_VIEW'`.

Endpoint `POST /activity-logs/page-view` SENGAJA di-skip oleh `activityLogMiddleware` sendiri (cek prefix path) — supaya tidak menghasilkan entry "request logging tentang request logging".

Log bersifat **immutable**. Tidak ada kolom `company_id` — scoping data untuk viewer non-superadmin dilakukan via subquery `user_companies` (lihat §Isolasi data), bukan kolom langsung, karena request API generik tidak reliable dipetakan ke 1 company tanpa parsing per-route.

---

## File Structure

```
src/features/activity-log/
├── activity-log.schema.ts     — Zod: query filter + body page-view
├── activity-log.repository.ts — Drizzle queries (DB layer)
├── activity-log.service.ts    — Business logic, termasuk createPageView()
├── activity-log.handler.ts    — HTTP handler
└── activity-log.route.ts      — Route + permission guard

src/middleware/activityLog.ts  — Auto-log semua request API (Level 2)
src/utils/activityLog.ts       — logActivity(ctx, opts) — dipanggil middleware & service
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/activity-logs`

### `POST /activity-logs/page-view`

Self-report navigasi user sendiri. Tidak butuh permission khusus (cukup login).

**Body:** `{ "path": "/customers", "module": "customers" }` (`module` opsional, fallback ke segmen pertama `path`)

### `GET /activity-logs`

**Permission**: `activity.log:view`

| Param | Type | Keterangan |
|-------|------|------------|
| `page`, `per_page` | integer | Pagination |
| `user_id` | integer | Filter user |
| `module` | string | Filter modul |
| `method` | string | GET/POST/PUT/PATCH/DELETE/PAGE_VIEW |
| `date_from`, `date_to` | string (YYYY-MM-DD) | Rentang tanggal |

### `GET /activity-logs/:id`

**Permission**: `activity.log:view`

---

## DB Schema

Tabel: `activity_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `user_id` | int FK → users | Nullable (set null) |
| `method` | varchar(10) | GET/POST/PUT/PATCH/DELETE/PAGE_VIEW |
| `path` | varchar(500) | Route pattern (API) atau frontend path (page-view) |
| `module` | varchar(100) | Segmen pertama path |
| `status_code` | integer | Null untuk page-view |
| `duration_ms` | integer | Null untuk page-view |
| `ip_address` | varchar(45) | |
| `user_agent` | varchar(500) | |
| `request_id` | varchar(100) | |
| `created_at` | timestamptz | Auto, immutable |

---

## Isolasi data & permission

Sama pola dengan `audit_logs` (lihat `features/audit.md`):
- Entry milik user superadmin disembunyikan dari viewer non-superadmin (`NOT EXISTS` subquery ke `user_roles`).
- Viewer non-superadmin cuma lihat activity log milik user dalam scope company mereka — resolve via `SELECT DISTINCT user_id FROM user_companies WHERE company_id IN (scopeIds)`, bukan kolom `company_id` langsung.

Permission: `activity.log:menu`, `activity.log:view` — superadmin dapat semua otomatis, admin dapat view-only.
