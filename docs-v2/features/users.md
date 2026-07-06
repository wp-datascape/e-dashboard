# Feature: Users CRUD

> Status: ✅ Complete — CRUD + role/company assignment + reset password + bulk import (template upload) + isolasi data superadmin
> Last updated: 2026-07-06 (sesi 37)
> Baca juga: `shared/api-conventions.md`, `features/roles.md`, `features/permissions.md`, `features/import.md`, `features/audit.md`

---

## File Structure

```
backend/src/features/users/
├── user.schema.ts      — Zod DTO (request & response types)
├── user.repository.ts  — Drizzle queries (DB layer)
├── user.service.ts     — Business logic (create/update/delete/bulk import)
├── user.handler.ts     — Thin HTTP handler (validate → service → response)
└── user.route.ts       — Route definitions + requirePermission per endpoint
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/users`

Semua endpoint wajib JWT cookie (`authMiddleware`) + permission `access.user:*` sesuai tabel di bawah.

| Method | Path | Permission | Deskripsi |
|---|---|---|---|
| GET | `/` | `access.user:view` | List user (paginated) |
| GET | `/template` | `access.user:create` | Download template Excel bulk-import |
| POST | `/import` | `access.user:create` | Bulk-create user dari file (multipart) |
| GET | `/:id` | `access.user:view` | Detail satu user |
| POST | `/` | `access.user:create` | Create user satu-satu |
| PUT | `/:id` | `access.user:update` | Update user (termasuk reset password) |
| DELETE | `/:id` | `access.user:delete` | Soft-delete user |

> `/template` dan `/import` didaftarkan **sebelum** `/:id` di `user.route.ts` — kalau urutannya kebalik, Hono akan menangkap `"template"`/`"import"` sebagai path param `:id` dan gagal di `userIdParamSchema`.

---

### `GET /api/v1/users`

List semua user aktif (soft delete tidak muncul) dengan pagination.

**Query params:** `page` (default 1), `per_page` (default 20, max 100), `sort` (`field:asc|desc`)

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "Wahyu Prasetyo",
      "email": "wahyu@company.com",
      "is_active": true,
      "created_at": "...", "updated_at": "...", "last_login_at": null, "deleted_at": null,
      "roles": [{ "id": 3, "name": "user", "is_system": false }],
      "companies": [{ "id": 1, "code": "PT MKO", "name": "PT Mesin Kasir Online" }]
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1, "total_pages": 1 }
}
```

---

### `POST /api/v1/users` — Create user satu-satu

**Request body:**
```json
{
  "name": "Sari Dewi",
  "email": "sari@company.com",
  "password": "minEightChars",
  "role_ids": [3],
  "company_ids": [1, 2]
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | min 2, max 255 |
| `email` | string | valid email, unik |
| `password` | string | min 8, max 72 |
| `role_ids` | number[]? | opsional |
| `company_ids` | number[]? | opsional |

**Response 201:** user lengkap dengan `roles`/`companies` ter-assign (lihat Implementation Notes — ini baru benar sejak sesi ini).

**Error:** `409 DUPLICATE_ENTRY` kalau email sudah dipakai.

---

### `PUT /api/v1/users/:id` — Update user (termasuk reset password)

Semua field opsional — cuma yang dikirim yang di-update.

**Request body:**
```json
{
  "name": "Sari Dewi Updated",
  "is_active": false,
  "role_ids": [2],
  "company_ids": [1],
  "password": "newPassword123"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string? | min 2, max 255 |
| `is_active` | boolean? | — |
| `role_ids` | number[]? | replace semua role user ini |
| `company_ids` | number[]? | replace semua company user ini |
| `password` | string? | min 8, max 72 — **reset password**, di-hash sebelum simpan |

**Response 200:** user lengkap setelah update.

---

### `DELETE /api/v1/users/:id`

Soft delete — set `deleted_at`, data tidak hilang dari DB. User dengan role `is_system=true` tidak bisa dihapus (`403 FORBIDDEN`).

**Response:** `204 No Content`

---

### `GET /api/v1/users/template` — Download template bulk-import

Response biner `.xlsx` (`template_user.xlsx`). Kolom: `name` (wajib), `email` (wajib), `role` (opsional, nama role — lihat `GET /roles`), `company_code` (opsional, bisa lebih dari satu dipisah koma, mis. `"PT01,PT02"`).

---

### `POST /api/v1/users/import` — Bulk-create user dari file

**Request:** `multipart/form-data`
- `file` — `.csv` atau `.xlsx`, max 5MB
- `default_password` — string, min 8 karakter, **dipakai untuk SEMUA user baru di file ini** (bukan per-baris, bukan disimpan sebagai config server — admin isi manual tiap kali upload)

**Alur per baris:**
1. `name`/`email` wajib — kosong → error baris
2. Email sudah terdaftar → **skip** (bukan error)
3. `role` diisi tapi nama role tidak ditemukan (`findRoleByName`) → error baris
4. `company_code` diisi tapi ada kode yang tidak ditemukan (`findCompanyByCode`) → error baris
5. Lolos semua → create user dengan `default_password` (di-hash), assign role/company kalau ada

**Response 200:**
```json
{
  "message": "Import selesai: 2 ditambahkan, 1 di-skip",
  "data": {
    "added": 2,
    "skipped": 1,
    "errors": [{ "row": 4, "message": "role \"manajer\" tidak ditemukan" }]
  }
}
```

Frontend: halaman `/import`, dropdown "Tipe Import" → "User Baru" (`UploadFileCard.tsx`, reuse infrastruktur upload yang sama dengan Faktur/Divisi/Klasifikasi).

**Keamanan:** `default_password` tidak pernah masuk audit log — cuma ringkasan `{added, skipped, errors}` yang dicatat (action `user.import`).

---

## Error Codes

| HTTP | Code | Kondisi |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field tidak valid |
| 401 | `UNAUTHORIZED` | Belum login |
| 403 | `FORBIDDEN` | Hapus user dengan role system, atau permission kurang |
| 404 | `NOT_FOUND` | User tidak ditemukan / sudah dihapus |
| 409 | `DUPLICATE_ENTRY` | Email sudah dipakai user lain |
| 413 | `FILE_TOO_LARGE` | File import > 5MB |
| 422 | `INVALID_FILE_FORMAT` | File bukan `.csv`/`.xlsx` |
| 500 | `INTERNAL_ERROR` | Server / DB error |

---

## Implementation Notes

### Password tidak pernah keluar dari repository layer
Query di `user.repository.ts` tidak pernah men-select kolom `password` sama sekali untuk `findAllUsers`/`findUserById` — bukan di-strip belakangan, memang tidak pernah diminta ke DB.

### Reset password (sesi ini)
Sebelumnya **tidak ada mekanisme ganti password sama sekali** di aplikasi ini — bukan self-service, bukan admin. `updateUserSchema` sekarang terima `password?` opsional; kalau diisi, di-hash (`hashPassword`) sebelum masuk `users.password`. Audit log cuma catat `passwordReset: true`, tidak pernah catat hash/plaintext password.

Frontend: `EditUserDialog.tsx` — checkbox "Reset Password" menyembunyikan/menampilkan field password baru, default tersembunyi supaya admin tidak "tidak sengaja" reset password tiap kali edit user.

### Fix: Create User tidak pernah simpan role/company (bug lama, ditemukan & diperbaiki sesi ini)
`createUserSchema` sebelumnya cuma terima `{name, email, password}` — padahal frontend (`CreateUserDialog.tsx`) sudah lama mengirim `role_ids`/`company_ids` di payload-nya. Karena Zod object schema secara default strip field yang tidak dikenal, kedua field itu diam-diam dibuang, dan **setiap user baru yang dibuat lewat form selalu tanpa role & company** sampai di-edit manual. `createUserService` sekarang assign role/company via `replaceUserRoles`/`replaceUserCompanies` (fungsi yang sama yang sudah dipakai `updateUserService`), lalu re-fetch user lengkap sebelum dikembalikan.

### Fix: Role ter-duplikasi di response (bug lama, ditemukan & diperbaiki sesi ini)
`findAllUsers`/`findUserById` sebelumnya JOIN `user_roles`+`roles` **dan** `user_companies`+`companies` dalam satu query yang sama dengan `GROUP BY users.id` + `json_agg`. Kalau user itu punya N company, hasil pre-aggregate jadi N baris (cartesian product dari sisi company), sehingga role-nya ikut ter-duplikasi N kali di `json_agg` — kelihatan jelas di user dengan banyak company (mis. superadmin dengan 3 company: role muncul 3x, padahal cuma 1 role).

Fix: dipecah jadi 2 query terpisah (`fetchRolesAndCompaniesByUserIds()` — satu query untuk roles, satu untuk companies, dibatch pakai `inArray(user_id, ids)`), lalu digabung per-user di kode (bukan di SQL). Tidak ada lagi JOIN silang antar dua relasi many-to-many yang berbeda dalam query yang sama.

### Bulk import — pola yang sama dengan Channel Divisions/Classification Rules
`importUsersService` mengikuti pola identik `importChannelDivisionsService` (`settings/channel-divisions.service.ts`): parse CSV via `papaparse` atau XLSX via `xlsx` (scan baris pertama yang mengandung header `"email"`), validasi + insert per-baris, kumpulkan error per-baris (bukan gagal total di baris pertama yang error).

### Isolasi data superadmin — List & Detail User (2026-07-06)

Baris user dengan role `superadmin` **disembunyikan total** (bukan di-mask) dari `GET /`, `GET /:id`, `PUT /:id`, dan `DELETE /:id` kalau viewer bukan superadmin. Role-based, bukan self-only — sesama superadmin tetap saling terlihat penuh; yang di-block hanya `admin` ke bawah.

**Mekanisme:** `findAllUsers(pagination, excludeSuperAdmin)` dan `findUserById(id, excludeSuperAdmin)` (`user.repository.ts`) menambah kondisi:
```sql
NOT EXISTS (
  SELECT 1 FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = <users.id> AND r.name = 'superadmin'
)
```
`NOT EXISTS` dipakai (bukan `notInArray`) supaya baris dengan kolom nullable tetap benar secara semantik — pola yang sama dipakai lagi di `audit.md` untuk `actor_id` yang bisa `NULL` (system action).

`excludeSuperAdmin` = `!c.var.user.isSuperAdmin`, di-thread dari `user.handler.ts` → `user.service.ts` (`getUsers`, `getUserById`) → repository. `createUserService`/`updateUserService`/`deleteUserService` sudah menerima `ctx: Context`, jadi tinggal derive `ctx.var.user.isSuperAdmin` langsung tanpa ubah signature.

**Efek samping yang disengaja (defense-in-depth):** karena `updateUserService`/`deleteUserService` internal memanggil `getUserById`/`findUserById` yang sama untuk ambil state "before", non-superadmin yang mencoba update/delete akun superadmin lewat API langsung dapat `404 NOT_FOUND` (bukan `403`) — konsisten dengan "seakan tidak exist", bukan sekadar terlarang.

**Diverifikasi** langsung ke DB lokal: `findAllUsers` total 8→7 baris saat `excludeSuperAdmin=true` (baris superadmin hilang), `findUserById` return `null` untuk target superadmin saat `excludeSuperAdmin=true`. `bunx tsc --noEmit` bersih, 38 test existing tetap pass.

**Belum dikerjakan:** sisi frontend (halaman `/users`) belum disesuaikan/diverifikasi visual — murni enforcement backend untuk saat ini.

---

## Referensi File

- **Backend**: `backend/src/features/users/{user.schema,user.repository,user.service,user.handler,user.route}.ts`
- **Frontend**: `frontend/src/pages/Users/index.tsx` + `components/{CreateUserDialog,EditUserDialog,ViewUserDialog,DeleteUserDialog}.tsx`
- **Bulk import UI**: `frontend/src/pages/Import/components/UploadFileCard.tsx` (tipe `'user'` di `ImportType`)
- **API client**: `frontend/src/api/users.api.ts`, `frontend/src/hooks/useUsers.ts`
