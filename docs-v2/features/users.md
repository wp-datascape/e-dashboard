# Feature: Users CRUD

> Status: ~60% — CRUD selesai, menunggu authMiddleware + RBAC
> Last updated: 2026-06-21
> Baca juga: `shared/api-conventions.md`, `admin/api.md`

---

## File Structure

```
src/features/users/
├── user.schema.ts      — Zod DTO (request & response types)
├── user.repository.ts  — Drizzle queries (DB layer)
├── user.service.ts     — Business logic
└── user.route.ts       — HTTP handlers + route definitions
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/users`

> **Catatan:** Saat ini aktif **tanpa auth** (sementara).
> Setelah `authMiddleware` selesai, semua endpoint wajib JWT cookie + permission `users:manage`.

---

### `GET /api/v1/users`

List semua user aktif (soft delete tidak muncul) dengan pagination.

**Query params:**

| Param      | Type    | Default | Keterangan         |
|------------|---------|---------|--------------------|
| `page`     | integer | 1       | Halaman (1-based)  |
| `per_page` | integer | 20      | Max 100            |
| `sort`     | string  | —       | `field:asc\|desc`  |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "Wahyu Prasetyo",
      "email": "wahyu@company.com",
      "isActive": true,
      "createdAt": "2026-06-21T08:00:00.000Z",
      "updatedAt": "2026-06-21T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

---

### `GET /api/v1/users/:id`

Ambil satu user berdasarkan ID.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "name": "Wahyu Prasetyo",
    "email": "wahyu@company.com",
    "isActive": true,
    "createdAt": "2026-06-21T08:00:00.000Z",
    "updatedAt": "2026-06-21T08:00:00.000Z"
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "User not found" }
```

---

### `POST /api/v1/users`

Buat user baru. Password di-hash otomatis (bcrypt cost=12).

**Request body:**
```json
{
  "name": "Sari Dewi",
  "email": "sari@company.com",
  "password": "minEightChars"
}
```

| Field      | Type   | Rules                   |
|------------|--------|-------------------------|
| `name`     | string | min 2, max 255          |
| `email`    | string | valid email, unik       |
| `password` | string | min 8, max 72 chars     |

**Response 201:**
```json
{
  "message": "User created",
  "data": {
    "id": 2,
    "name": "Sari Dewi",
    "email": "sari@company.com",
    "isActive": true,
    "createdAt": "2026-06-21T08:05:00.000Z",
    "updatedAt": "2026-06-21T08:05:00.000Z"
  }
}
```

**Error:**
```json
{ "error": "DUPLICATE_ENTRY", "message": "Email already in use" }
```

---

### `PATCH /api/v1/users/:id`

Update data user. Semua field opsional.

**Request body:**
```json
{
  "name": "Sari Dewi Updated",
  "isActive": false
}
```

| Field      | Type    | Rules          |
|------------|---------|----------------|
| `name`     | string? | min 2, max 255 |
| `isActive` | boolean?| —              |

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 2,
    "name": "Sari Dewi Updated",
    "email": "sari@company.com",
    "isActive": false,
    "createdAt": "2026-06-21T08:05:00.000Z",
    "updatedAt": "2026-06-21T09:00:00.000Z"
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "User not found" }
```

---

### `DELETE /api/v1/users/:id`

Soft delete — hanya set `deleted_at`, data tidak hilang dari DB.

**Response:** `204 No Content`

**Error:**
```json
{ "error": "NOT_FOUND", "message": "User not found" }
```

---

## Error Codes

| HTTP | Code               | Kondisi                          |
|------|--------------------|----------------------------------|
| 400  | `VALIDATION_ERROR` | Field tidak valid / body bukan JSON |
| 404  | `NOT_FOUND`        | User tidak ditemukan / sudah dihapus |
| 409  | `DUPLICATE_ENTRY`  | Email sudah dipakai user lain    |
| 500  | `INTERNAL_ERROR`   | Server / DB error                |

---

## Implementation Notes

**Password tidak pernah keluar dari repository layer.**
`stripPassword()` di `user.repository.ts` otomatis menghapus field `password` dari setiap hasil query sebelum dikembalikan ke service/handler.

**Soft delete.**
`DELETE` hanya set `deletedAt = now()`. Semua query di repository sudah filter `WHERE deleted_at IS NULL`.

**Email duplicate check.**
Service layer cek email via `findUserByEmail()` sebelum insert — memberikan pesan error yang lebih jelas daripada mengandalkan DB constraint 23505.

---

## Yang Belum (Pending)

| Item | Menunggu |
|------|----------|
| JWT auth cookie wajib | `authMiddleware` |
| Permission `users:manage` | `middleware/permission.ts` |
| Assign role ke user (`role_ids`) | RBAC schema (`user_roles`) |
| Assign company ke user (`company_ids`) | RBAC schema (`user_companies`) |
| `GET /users/me` | `authMiddleware` (c.var.user) |
| Search/filter `?search=&role=` | RBAC schema selesai |
