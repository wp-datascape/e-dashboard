# Feature: Permissions

> Status: ✅ Complete — CRUD + Category management
> Last updated: 2026-06-22
> Baca juga: `roles.md`, `shared/api-conventions.md`

---

## Overview

Permissions adalah akses granular ke fitur/action dalam sistem. Setiap permission independent (flat structure, tidak ada hierarchy).

### Permission Format

Setiap permission mengikuti format `module:action`:
- `module`: kategori fitur (users, roles, permissions, dll.)
- `action`: menu, view, input, update, delete

### Kategori & Daftar Permissions (35 total)

| Kategori | Action | Jumlah |
|----------|--------|--------|
| Dashboard & Metrics | menu, view | 2 |
| Customers | menu, view, input, update, delete | 5 |
| Products | menu, view, input, update, delete | 5 |
| Transactions | menu, view, input, update, delete | 5 |
| Import | menu, view, input | 3 |
| Users | menu, view, input, update, delete | 5 |
| Roles | menu, view, input, update, delete | 5 |
| Config | menu, view, update | 3 |
| Audit Log | menu, view | 2 |

**Total: 35 permissions**

---

## File Structure

```
src/features/permissions/
├── permissions.schema.ts      — Zod DTO (request & response types)
├── permissions.repository.ts  — Drizzle queries (DB layer)
├── permissions.service.ts     — Business logic + audit logging
└── permissions.route.ts       — HTTP handlers + route definitions
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/permissions`

> **Catatan:** Saat ini aktif **tanpa auth** (sementara).

---

### `GET /api/v1/permissions`

List semua permissions dalam sistem.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "metrics:menu",
      "description": "Menu Dashboard",
      "category": "Dashboard & Metrics",
      "createdAt": "2026-06-21T08:00:00.000Z",
      "updatedAt": "2026-06-21T08:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/v1/permissions`

Buat permission baru.

**Request body:**
```json
{
  "name": "users:export",
  "description": "Export Users to CSV",
  "category": "Users"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | min 2, max 100, unique, format `module:action` |
| `description` | string | max 500 |
| `category` | string | max 50 |

**Response 201:**
```json
{
  "message": "Permission created",
  "data": {
    "id": 36,
    "name": "users:export",
    "description": "Export Users to CSV",
    "category": "Users",
    "createdAt": "2026-06-21T09:00:00.000Z",
    "updatedAt": "2026-06-21T09:00:00.000Z"
  }
}
```

---

### `PUT /api/v1/permissions/:id`

Update permission.

**Request body:**
```json
{
  "description": "Updated description",
  "category": "Users Management"
}
```

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 36,
    "name": "users:export",
    "description": "Updated description",
    "category": "Users Management",
    "createdAt": "2026-06-21T09:00:00.000Z",
    "updatedAt": "2026-06-21T09:05:00.000Z"
  }
}
```

---

### `DELETE /api/v1/permissions/:id`

Hapus permission. Otomatis remove dari semua role_permissions (CASCADE).

**Response:** `204 No Content`

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Field tidak valid |
| 404 | `NOT_FOUND` | Permission tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | Name sudah digunakan |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## Implementation Notes

### Audit Trail
- Create/Update/Delete permission → dicatat di audit log
- Gunakan `utils/audit.ts` untuk semua mutasi

### Soft Rules
- Jangan buat permission baru tanpa discussion (koordinasi dengan stakeholder)
- Sebelum delete permission → pastikan tidak ada role yang menggunakan
- Permission names wajib konsisten (module:action format)

---

## Yang Belum (Pending)

| Item | Menunggu |
|------|----------|
| Permission search/filter | sorting + pagination |
| Batch assign permissions | UI confirmation |

---

## References

- **Backend API**: `src/features/permissions/`
- **Database Schema**: `src/db/schema/permissions.ts`
- **Seed Data**: `src/db/seed.ts`

---

**Last Updated**: 2026-06-22
**Status**: ✅ Production Ready