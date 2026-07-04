# Feature: Permissions

> Status: ✅ Complete — CRUD + Category management + Button-level guards + read-only view mode
> Last updated: 2026-07-04
> Baca juga: `roles.md`, `shared/api-conventions.md`

---

## Overview

Permissions adalah akses granular ke fitur/action dalam sistem. Setiap permission independent (flat structure, tidak ada hierarchy).

### Permission Format

Setiap permission mengikuti format `module.submodule:action` (dot-notation):
- `module`: kelompok besar (`settings`, `config`, `access`, `audit`)
- `submodule` *(opsional)*: fitur spesifik dalam kelompok (`company`, `branch`, `integration`)
- `action`: `menu`, `view`, `create`, `update`, `delete`, `export`, `import`, `test`, `reset`

**Contoh:**
```
dashboard:menu         — sidebar visibility Dashboard
customer:view          — membuka halaman Customer list
settings.company:create   — tombol Add Company
settings.branch:delete    — hapus branch
config.integration:test   — tombol Test Connection
access.user:update        — edit user
access.role:delete        — hapus role
audit.log:export          — export audit log
```

> Parent menu (Settings, Config, Access Control) **tidak punya permission key** — visibilitasnya diturunkan dari child-items yang visible.

### Kategori & Daftar Permissions (88 total, 24 kategori)

| Kategori | Prefix Key | Actions Tersedia |
|----------|-----------|-----------------|
| Dashboard | `dashboard` | menu, view |
| Customer | `customer` | menu, view, export |
| Expansion | `expansion` | menu, view, export |
| Churn Risk | `churn.risk` | menu, view, export |
| Cross Selling | `cross.selling` | menu, view, export |
| Product | `product` | menu, view, export |
| High Margin | `high.margin` | menu, view, export |
| Product Trend | `product.trend` | menu, view, export |
| Transaction | `transaction` | menu, view, export |
| Project | `project` | menu, view |
| App Settings | `settings.app` | menu, view, update |
| Company | `settings.company` | menu, view, create, update, delete |
| Branch | `settings.branch` | view, create, update, delete *(tidak ada menu — embedded di Company)* |
| Channel Division | `settings.channel.division` | menu, view, create, update, delete |
| Product Settings | `settings.product` | menu, view, create, update, delete |
| Threshold | `settings.threshold` | menu, view, update |
| Classification | `config.classification` | menu, view, create, update, delete |
| Import | `config.import` | menu, view, import |
| Integration | `config.integration` | menu, view, create, update, test, reset |
| Features | `config.features` | menu, view, update |
| Users | `access.user` | menu, view, create, update, delete |
| Roles | `access.role` | menu, view, create, update, delete |
| Permissions | `access.permission` | view, update *(tidak ada menu — embedded di RBAC)* |
| Audit Log | `audit.log` | menu, view, export |

**Total: 88 permissions** (source of truth: `backend/src/db/seed.ts` → `defaultPermissions`)

> **Prinsip**: setiap page memiliki `permissionKey` tersendiri. Enable `customer:menu` **tidak** otomatis menampilkan Expansion/Churn Risk — tiap menu harus diaktifkan secara eksplisit di RBAC.

---

## Button-Level Guards (`useCan` hook)

Frontend menggunakan hook `useCan` untuk conditional rendering tombol aksi:

```typescript
// frontend/src/hooks/useCan.ts
import { useAuth } from '@/context/auth.context'
export function useCan() {
  const { permissions } = useAuth()
  return (key: string) => permissions.includes(key)
}
```

**Pattern penggunaan:**
```tsx
const can = useCan()

// Tombol Create
{can('settings.company:create') && <Button>Add Company</Button>}

// ActionMenu item hidden
{ label: 'Edit', hidden: !can('settings.company:update') }
{ label: 'Delete', hidden: !can('settings.company:delete') }

// Switch disabled
<Switch disabled={!can('config.features:update')} />
```

**Pages yang sudah punya button guards:**
- Users (`access.user:create/update/delete`)
- RBAC (`access.role:create/update/delete`, `access.permission:update`)
- Companies (`settings.company:create/update/delete`, `settings.branch:view`)
- BranchSection (`settings.branch:create/update/delete`)
- Channel Divisions (`settings.channel.division:create/update/delete`)
- High Margin Settings (`settings.product:create/update/delete`)
- Threshold Settings (`settings.threshold:update`)
- Classification (`config.classification:create/update/delete`)
- Integration (`config.integration:create/update/test/reset`)
- Features (`config.features:update`)
- Import (`config.import:import`)

---

## Mode Read-Only Dialog "Set Permission" (RBAC UI)

Tombol shield "Assign Permissions" di halaman RBAC tampil untuk `access.permission:view` **atau** `:update`:
- Cuma `:view` → dialog kebuka dengan badge "Read only", semua toggle di-disable
- Punya `:update` → bisa lihat & ubah seperti biasa

Sebelumnya tombol cuma tampil untuk `:update` — role dengan `:view` saja sama sekali tidak bisa lihat permission suatu role (fixed sesi 32). `RoleCard.tsx` (versi mobile list) sempat tidak ada pengecekan permission sama sekali untuk tombol Assign Permissions/Delete — sudah disamakan dengan versi desktop.

## SetPermissionDialog — Kolom Action Dihitung Dinamis

`getActionColumns()` di `SetPermissionDialog.tsx` dulu hardcode 5 action (`menu, view, input, update, delete`). `input` adalah nama action skema **lama** (pra dot-notation, ada di `OLD_PERMISSION_NAMES`) — skema sekarang pakai `create`, bukan `input`. Akibatnya 21 dari 88 permission (semua `:create`, `:export`, `:import`, `:reset`, `:test`) tidak bisa ditoggle dari dialog ini sama sekali walau ada di database dan di-enforce backend.

**Fix (sesi 32):** kolom action dihitung dari suffix permission yang **benar-benar ada** di data (`permissionsGrouped`), bukan daftar hardcode. Kalau skema berubah lagi nanti (action baru ditambah/dihapus), dialog otomatis menyesuaikan.

## ⚠️ Pitfall: Permission Deprecated Tapi Masih Dirujuk di Kode

Dua kejadian terpisah (skema lama `metrics:view` dan `input` di atas) sama-sama root cause dari migrasi permission granular (sesi 24) yang tidak lengkap — nama permission diganti di `seed.ts`/`OLD_PERMISSION_NAMES`, tapi **konsumen lama tidak ikut di-grep & di-update**. Akibat paling parah: `metrics.route.ts` (12 endpoint metrics) masih `requirePermission('metrics:view')` — permission yang sudah tidak pernah di-seed lagi, jadi **mustahil di-assign ke role manapun lewat RBAC UI**. Semua role non-superadmin selalu 403 di halaman manapun yang datanya lewat endpoint itu, apa pun permission yang sudah diberikan (fixed sesi 32, lihat `features/metrics.md`).

**Pelajaran untuk perubahan skema permission berikutnya:** setelah rename/hapus permission key di `seed.ts`, wajib `grep -rn "requirePermission\|can(" backend/ frontend/` untuk nama key lama sebelum menganggap migrasi selesai.

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

> **Catatan:** `GET /` dan `PUT /roles/:id/permissions` butuh `access.permission:view` **atau** `:update` (lihat §Mode Read-Only di bawah); create/update/delete permission definition butuh `access.permission:update`.

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

**Last Updated**: 2026-07-04 (sesi 32/35)
**Status**: ✅ Production Ready — 88 permissions, 24 categories, button guards on all pages, read-only view mode, dynamic action columns