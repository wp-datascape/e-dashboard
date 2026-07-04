# Feature: Audit Logs

> Status: ✅ Complete — 2 endpoints aktif, di-mount di `/api/v1/audit-logs`
> Last updated: 2026-07-04

---

## Overview

Setiap mutasi data (create/update/delete) wajib menghasilkan audit log entry via `logAudit()` dari `utils/audit.ts`. Log bersifat **immutable** — tidak ada endpoint update/delete.

Semua query wajib include `company_id` (data isolation multi-tenant).

---

## File Structure

```
src/features/audit/
├── audit.schema.ts     — Zod schema untuk query params
├── audit.repository.ts — Drizzle queries (DB layer)
├── audit.service.ts    — Business logic
└── audit.route.ts      — HTTP handlers
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/audit-logs`

---

### `GET /api/v1/audit-logs`

List audit logs dengan pagination dan filter.

**Query params:**

| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `page` | integer | 1 | Halaman (1-based) |
| `per_page` | integer | 50 | Max per halaman |
| `action` | string | — | Filter by aksi (e.g. `user.create`) |
| `actor_id` | integer | — | Filter by user pelaku |
| `company_id` | integer | — | Filter by perusahaan |
| `date_from` | string | — | Format: YYYY-MM-DD |
| `date_to` | string | — | Format: YYYY-MM-DD |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "company_id": 1,
      "action": "user.create",
      "entity": "users",
      "entity_id": 42,
      "entity_key": "john@example.com",
      "actor_id": 1,
      "actor_name": "Admin",
      "old_value": null,
      "new_value": { "name": "John", "email": "john@example.com" },
      "ip_address": "192.168.1.1",
      "request_id": "req_abc123",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 450,
    "total_pages": 9
  }
}
```

---

### `GET /api/v1/audit-logs/:id`

Ambil satu audit log berdasarkan ID.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "company_id": 1,
    "action": "user.update",
    "entity": "users",
    "entity_id": 42,
    "entity_key": "john@example.com",
    "actor_id": 1,
    "actor_name": "Admin",
    "old_value": { "name": "John Old", "is_active": true },
    "new_value": { "name": "John New", "is_active": false },
    "ip_address": "192.168.1.1",
    "request_id": "req_abc123",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "Audit log not found" }
```

---

## Action Naming Convention

Format: `{entity}.{verb}`

| Action | Trigger |
|--------|---------|
| `branch.create` / `branch.update` / `branch.delete` | CRUD cabang perusahaan |
| `channel_division.create` / `.update` / `.delete` / `.import` | CRUD + import mapping channel → division |
| `classification_rule.create` / `.update` / `.delete` / `.import` | CRUD + import classification rule |
| `company.create` / `.update` / `.delete` | CRUD perusahaan |
| `config.create` / `config.update` | Buat/update config value (`business_configs`) |
| `high_margin.create` / `.update` / `.delete` / `.deactivate` | CRUD + deaktivasi mapping high margin |
| `import.file` | Import faktur (CSV/Excel/Accurate) |
| `page_setting.update` | Update page setting (`ready` flag) |
| `permission.assign` / `permission.revoke` | Assign/revoke permission ke role |
| `role.create` / `.update` / `.delete` | CRUD role |
| `user.create` / `.update` / `.delete` / `.import` | CRUD + bulk import user |

> Daftar ini harus tetap sinkron dengan seluruh pemanggilan `logAudit({ action: '...' })` di `*.service.ts` — cek dengan `grep -rn "logAudit(" backend/src/features` jika ragu.

**i18n label (frontend):** action code di atas ditampilkan human-readable via `t(\`auditLog.actions.${action}\`, { defaultValue: action })` di `pages/AuditLog/index.tsx` dan `ViewAuditLogDialog.tsx` — key-nya didefinisikan di `i18n/locales/{en,id}/auditLog.json` → `actions.*`. Action baru yang belum ada key-nya tetap tampil (fallback ke kode mentah), tapi harus ditambahkan ke kedua file locale supaya konsisten dengan bahasa aplikasi yang aktif.

---

## Usage di Service Layer

```typescript
import { logAudit } from '@/utils/audit'

// Panggil setelah mutasi berhasil:
await logAudit(db, {
  company_id:  ctx.company_id,
  actor_id:    ctx.user_id,
  action:      'user.create',
  entity:      'users',
  entity_id:   newUser.id,
  entity_key:  newUser.email,
  old_value:   null,
  new_value:   newUser,
  ip_address:  ctx.ip,
  request_id:  ctx.requestId,
})
```

---

## DB Schema

Tabel: `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `company_id` | int FK → companies | Wajib, data isolation |
| `actor_id` | int FK → users | Nullable (system action) |
| `action` | varchar | Format `entity.verb` |
| `entity` | varchar | Nama tabel |
| `entity_id` | integer | ID record yang diubah |
| `entity_key` | varchar | Label human-readable |
| `old_value` | jsonb | State sebelum perubahan |
| `new_value` | jsonb | State setelah perubahan |
| `ip_address` | varchar | IP address pelaku |
| `request_id` | varchar | Request ID untuk tracing |
| `created_at` | timestamptz | Auto, immutable |

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Query param tidak valid |
| 404 | `NOT_FOUND` | Log tidak ditemukan |
| 500 | `INTERNAL_ERROR` | Server / DB error |