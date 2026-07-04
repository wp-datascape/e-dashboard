# Feature: Roles

> Status: ✅ Complete — CRUD + Role-Permission mapping + baseline seed admin/user
> Last updated: 2026-07-04
> Baca juga: `permissions.md`, `shared/api-conventions.md`

---

## Overview

Roles adalah kumpulan permissions yang bisa di-assign ke user. Setiap role memiliki N:M relationship dengan permissions dan users.

**System Roles (built-in via seed, `backend/src/db/seed.ts`):**
| Role | isSystem | Default Permissions |
|------|----------|-------------------|
| **superadmin** | true | Semua 88 permissions (`seedRolePermissions()` — assign otomatis SEMUA row di tabel `permissions`, bukan angka hardcode) |
| **admin** | false | Baseline otomatis (sesi 32, `ADMIN_PERMISSION_NAMES`): full akses menu bisnis inti (Dashboard, Customer Workbench, Product & Portfolio, Transaction & Revenue). Grup Administration cuma sampai Settings — Company/Branch, Channel Division, Product Settings hanya view+update (TANPA create/delete). Configuration sama sekali tidak termasuk (eksklusif superadmin). Access Control (Users/Roles/Permissions) & Audit Log cuma view. |
| **user** | false | Baseline otomatis (sesi 32, `USER_PERMISSION_NAMES`): view+export saja di menu bisnis inti, nol menu Administration. |

Baseline `admin`/`user` di-seed via `seedRoleDefaultPermissions()` — **idempotent & aditif** (cuma menambah yang belum ada, tidak pernah mencabut kustomisasi manual lewat RBAC UI). Sebelum sesi 32, kedua role ini kosong total dari seed — instalasi baru butuh setup manual dari nol.

System roles (`is_system=true`, cuma `superadmin`) tidak bisa dihapus. `admin`/`user` **bukan** system role (bisa dihapus/di-rename) tapi tetap dapat baseline permission otomatis di atas.

---

## File Structure

```
src/features/roles/
├── roles.schema.ts       — Zod DTO (request & response types)
├── roles.repository.ts   — Drizzle queries (DB layer)
├── roles.service.ts      — Business logic + audit logging
└── roles.route.ts        — HTTP handlers + route definitions
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/roles`

> **Catatan:** butuh `access.role:view` (GET), `access.role:create/update/delete` (mutasi masing-masing). `PUT /:id/permissions` butuh `access.permission:update` (lihat `permissions.md` §Mode Read-Only untuk kenapa bukan `access.role:update`).

---

### `GET /api/v1/roles`

List semua roles dengan permissions embedded.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "superadmin",
      "description": "Full access to all features",
      "isSystem": true,
      "createdAt": "2026-06-21T08:00:00.000Z",
      "updatedAt": "2026-06-21T08:00:00.000Z",
      "permissions": [
        { "id": 1, "name": "dashboard:menu" },
        { "id": 2, "name": "dashboard:view" }
      ]
    }
  ]
}
```

---

### `GET /api/v1/roles/:id`

Ambil satu role dengan permissions.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "name": "superadmin",
    "description": "Full access to all features",
    "isSystem": true,
    "createdAt": "2026-06-21T08:00:00.000Z",
    "updatedAt": "2026-06-21T08:00:00.000Z",
    "permissions": [
      { "id": 1, "name": "dashboard:menu" }
    ]
  }
}
```

---

### `GET /api/v1/roles/:id/permissions`

List permissions untuk role tertentu, lengkap dengan detail permission.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "dashboard:menu",
      "description": "Menu Dashboard",
      "category": "Dashboard"
    }
  ]
}
```

---

### `POST /api/v1/roles`

Buat role baru (hanya custom roles).

**Request body:**
```json
{
  "name": "editor",
  "description": "Editor Role"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | min 2, max 100, unique |
| `description` | string? | max 500 |

**Response 201:**
```json
{
  "message": "Role created",
  "data": {
    "id": 4,
    "name": "editor",
    "description": "Editor Role",
    "isSystem": false,
    "createdAt": "2026-06-21T09:00:00.000Z",
    "updatedAt": "2026-06-21T09:00:00.000Z"
  }
}
```

---

### `PATCH /api/v1/roles/:id`

Update role. System roles hanya bisa update description.

**Request body:**
```json
{
  "description": "Updated description"
}
```

**Response 200:** Sama seperti GET detail.

---

### `DELETE /api/v1/roles/:id`

Hapus role. System roles tidak bisa dihapus.

**Response:** `204 No Content`

---

### `PUT /api/v1/roles/:id/permissions`

Assign permissions ke role (replace existing).

**Request body:**
```json
{
  "permission_ids": [1, 2, 3, 4, 5]
}
```

| Field | Type | Rules |
|-------|------|-------|
| `permission_ids` | integer[] | min 1 item, must exist |

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 4,
    "name": "editor",
    "roleId": 4,
    "permission_ids": [1, 2, 3, 4, 5],
    "updatedAt": "2026-06-21T09:10:00.000Z"
  }
}
```

**Audit:** Permission assignment dicatat via `logAudit()` dengan action `role.permissions.update`.

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Field tidak valid |
| 404 | `NOT_FOUND` | Role tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | Nama sudah digunakan |
| 403 | `FORBIDDEN` | Tidak bisa hapus/edit system role |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## N:M Mapping

- `role_permissions`: role_id + permission_id (primary key = composite)
- `user_roles`: user_id + role_id (primary key = composite)
- Auto cascade delete (jika role/user dihapus, mapping otomatis dihapus)

---

## References

- **Backend API**: `src/features/roles/`
- **Database Schema**: `src/db/schema/roles.ts`
- **Frontend Types**: `frontend/src/types/roles.ts`
- **Seed Data**: `src/db/seed.ts`

---

## Sudah Selesai (dulu tercatat Pending di sini)

| Item | Selesai sejak | Catatan |
|------|---------------|---------|
| Middleware `requirePermission()` | sesi 25 | `backend/src/middleware/permission.ts` — OR logic, superadmin bypass, dipasang di semua route |
| User role assignment | — | Bukan endpoint terpisah — `role_ids`/`company_ids` dikirim langsung di `POST /users` dan `PUT /users/:id` (lihat `features/users.md`) |

## Yang Belum (Pending)

| Item | Menunggu | Catatan |
|------|----------|---------|
| Permission inheritance | design decision | Sub-permissions (`users:view` includes `users:menu`) — belum diputuskan, saat ini setiap action independen |

---

**Last Updated**: 2026-07-04 (sesi 32/35)
**Status**: ✅ Production Ready — baseline permission otomatis utk admin/user (sesi 32)