# Feature: Login Log

> Status: ✅ Complete — 2 endpoint read-only, di-mount di `/api/v1/login-logs`, isolasi data superadmin
> Last updated: 2026-07-25 (task005)

---

## Overview

Riwayat kejadian autentikasi & keamanan akun — beda dari `audit_logs` (mutasi entity biasa) karena tidak selalu punya `user_id` valid (mis. percobaan login ke email yang tidak terdaftar).

Tidak ada endpoint tulis publik. Insert cuma terjadi lewat `logLoginEvent()` (`utils/loginLog.ts`), dipanggil internal dari:

| Event | Dipanggil dari |
|-------|-----------------|
| `login_success` | `auth.service.ts` → `loginService()`, setelah `updateLastLogin`/`resetLoginAttempts` |
| `login_failed` | `loginService()` — email tidak ditemukan (`reason: invalid_credentials`), akun nonaktif (`account_inactive`), password salah (`invalid_credentials`), akun terkunci (`account_locked`) |
| `account_locked` | `loginService()` — saat percobaan gagal ke-N memicu lockout (`reason: too_many_attempts`), berbarengan dengan alert Telegram yang sudah ada |
| `logout` | `auth.service.ts` → `logoutService()`, dipanggil `handleLogout` sebelum cookie dihapus |
| `password_changed` | `user.service.ts` → `updateUserService()`, saat admin reset password user lain (`reason: admin_reset`) |
| `role_changed` | `user.service.ts` → `updateUserService()`, saat `role_ids` diubah — `reason` diisi daftar nama role baru |

---

## File Structure

```
src/features/login-log/
├── login-log.schema.ts     — Zod query filter
├── login-log.repository.ts — Drizzle queries (DB layer)
├── login-log.service.ts    — Business logic
├── login-log.handler.ts    — HTTP handler
└── login-log.route.ts      — Route + permission guard (read-only)

src/utils/loginLog.ts        — logLoginEvent(opts) — dipanggil auth.service.ts & user.service.ts
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/login-logs`

### `GET /login-logs`

**Permission**: `login.log:view`

| Param | Type | Keterangan |
|-------|------|------------|
| `page`, `per_page` | integer | Pagination |
| `user_id` | integer | Filter user |
| `event` | string | login_success/login_failed/logout/password_changed/role_changed/account_locked |
| `date_from`, `date_to` | string (YYYY-MM-DD) | Rentang tanggal |

### `GET /login-logs/:id`

**Permission**: `login.log:view`

---

## DB Schema

Tabel: `login_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `user_id` | int FK → users | Nullable — null kalau email tidak ditemukan saat login gagal |
| `email` | varchar(255) | Email percobaan, tetap tersimpan meski `user_id` null |
| `event` | varchar(30) | login_success \| login_failed \| logout \| password_changed \| role_changed \| account_locked |
| `reason` | varchar(255) | invalid_credentials / account_inactive / account_locked / too_many_attempts / admin_reset / nama role baru |
| `ip_address` | varchar(45) | |
| `user_agent` | varchar(500) | |
| `created_at` | timestamptz | Auto, immutable |

---

## Isolasi data & permission

Sama pola dengan `audit_logs`/`activity_logs`:
- Entry milik user superadmin disembunyikan dari viewer non-superadmin.
- Viewer non-superadmin cuma lihat login log milik user dalam scope company mereka (via `user_companies`, bukan kolom `company_id` — tabel ini tidak punya kolom itu).

Permission: `login.log:menu`, `login.log:view` — superadmin dapat semua otomatis, admin dapat view-only.

---

## Catatan terkait: fix `ip_address` di `audit_logs`

Sesi ini juga memperbaiki bug lama: `ctx.var.ipAddress` yang dibaca `utils/audit.ts` tidak pernah di-set di manapun, jadi `audit_logs.ip_address` selalu `null` sejak fitur itu ada. Diperbaiki dengan `c.set('ipAddress', getIp(c))` di `middleware/requestId.ts` (dijalankan paling awal, sebelum middleware lain) — sekaligus jadi sumber IP untuk `activity_logs`/`login_logs` yang baru. `middleware/requestLogger.ts` juga dirapikan supaya pakai `getIp()` yang sama (sebelumnya punya logic sendiri yang tidak split header `x-forwarded-for` multi-proxy).
