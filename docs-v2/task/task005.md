# Task 005 — Activity Log & Login Log

> Status: ✅ Complete — implementasi selesai di branch `feature/activity-login-log`
> Dibuat: 2026-07-25
> Baca juga: `features/audit.md`, `features/activity-log.md`, `features/login-log.md`, `CRITICAL_RULES.md`, `shared/architecture.md`

---

## 1. Latar Belakang & Tujuan

Proyek sudah punya `audit_logs` (Level 3 — detail before/after untuk mutasi CRUD), aktif dipakai via halaman `/audit-log`. Yang belum ada:

- **Level 1 — Page Visit**: riwayat menu/halaman apa yang dibuka user.
- **Level 2 — Action Log**: riwayat aksi/request secara umum (bukan cuma mutasi).
- **Login Log**: riwayat autentikasi — login berhasil/gagal, logout, ganti password, ganti role.

Saat ini jejak login cuma berupa **state**, bukan histori: kolom `users.last_login_at`, `failed_login_count`, `locked_until` — tidak ada catatan per kejadian (kapan, dari IP mana, berhasil/gagal, alasan gagal apa). Untuk kebutuhan audit keamanan & troubleshooting, ini gap yang perlu ditutup.

**Tujuan task ini:** tambah 2 tabel baru (`activity_logs`, `login_logs`) + middleware pencatatan otomatis + API read-only + halaman admin baru, dan restrukturisasi menu sidebar: item "Audit Log" yang sekarang berdiri sendiri dipindah jadi submenu di bawah menu induk baru **"Log"**, bersama "Activity Log" dan "Login Log".

Riset (2026-07-25) juga menemukan bug existing yang relevan: `utils/audit.ts` membaca `ctx.var.ipAddress`, tapi tidak ada middleware yang pernah men-set context var itu — jadi `audit_logs.ip_address` selalu `null` selama ini. Fix ini dibundel ke task ini (§5) karena kedua tabel baru butuh sumber IP address yang sama.

---

## 2. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Cara tracking page visit | **Gabungan**: middleware backend log semua request API (Level 2) + event eksplisit dari frontend saat route berubah (Level 1 akurat) | Middleware saja tidak 1:1 dengan "halaman dibuka" (1 halaman React bisa memicu banyak API call); event eksplisit saja tidak menangkap Level 2 |
| Scope pengerjaan | End-to-end: schema + migration + middleware + backend API + halaman admin frontend | Keputusan user |
| `company_id` di tabel baru? | Tidak ada kolom ini di `activity_logs`/`login_logs` | Request API generik tidak reliable dipetakan ke 1 company_id tanpa parsing per-route. Scoping untuk viewer non-superadmin pakai `user_id IN (SELECT user_id FROM user_companies WHERE company_id IN scopeIds)`, bukan kolom langsung |
| Isolasi data superadmin | Ikut pola `audit_logs` — sembunyikan entry milik user superadmin dari viewer non-superadmin | Konsistensi dengan `features/audit.md` §Isolasi data superadmin |
| Retensi/pruning data | Belum ada job otomatis — follow-up, di luar scope MVP ini | `activity_logs` berpotensi tumbuh cepat; job pruning bisa reuse job queue table-based yang sudah ada nanti |
| Endpoint page-view ikut ke-log oleh middleware sendiri? | Tidak — di-skip eksplisit | Cegah entry self-referential yang membingungkan |

---

## 3. Desain Schema

```
activity_logs
  id, user_id (FK users, nullable/set null), method, path, module,
  status_code, duration_ms, ip_address, user_agent, request_id, created_at

login_logs
  id, user_id (FK users, nullable/set null), email, event, reason,
  ip_address, user_agent, created_at
```

`event` (login_logs): `login_success` | `login_failed` | `logout` | `password_changed` | `role_changed` | `account_locked`

Detail lengkap kolom + tipe: lihat plan implementasi (`/home/pacman/.claude/plans/parallel-fluttering-leaf.md` — arsip sesi ini).

---

## 4. Breakdown Implementasi

### Backend
- [x] Schema `activity_logs` + `login_logs` di `schema-auth.ts`, generate migration (`bun run db:generate` → `bun run db:migrate`) — migration `0009_mysterious_romulus.sql`
- [x] Fix gap `ipAddress` — set di `requestIdMiddleware` (`middleware/requestId.ts`), `requestLogger.ts` dirapikan supaya reuse `getIp()` yang sama
- [x] Util `logActivity()` (`utils/activityLog.ts`), `logLoginEvent()` (`utils/loginLog.ts`) — pola sama `logAudit()`
- [x] Middleware `activityLogMiddleware` — auto-log semua request API, mount di `router.ts` setelah `authMiddleware()`
- [x] Fitur `features/activity-log/` — 5 file (schema/repository/service/handler/route), endpoint `GET /activity-logs`, `GET /activity-logs/:id`, `POST /activity-logs/page-view`
- [x] Fitur `features/login-log/` — 5 file, endpoint `GET /login-logs`, `GET /login-logs/:id` (read-only, tanpa endpoint tulis publik)
- [x] Hook `logLoginEvent()` di `auth.service.ts` (login sukses/gagal/lockout, logout) dan `user.service.ts` (`updateUserService` — password reset, role change)
- [x] Permission seed: `activity.log:menu/view`, `login.log:menu/view` di `seed.ts` (konvensi dot, konsisten dengan `audit.log:*`), grant ke `ADMIN_PERMISSION_NAMES`; page_settings entry `activity-log`/`login-log` (`ready: true`)

### Frontend
- [x] Halaman `pages/ActivityLog/`, `pages/LoginLog/` (mirror `pages/AuditLog/`, pakai `ResponsiveListView`) + dialog detail masing-masing
- [x] Hook `useActivityLogs`, `useLoginLogs`; API layer `activityLog.api.ts`, `loginLog.api.ts`; types `activityLog.ts`, `loginLog.ts`
- [x] Hook `usePageViewTracking` — kirim page-view event saat route berubah, dipasang di `DashboardLayout`
- [x] Restrukturisasi `config/menu.tsx`: ganti item standalone "Audit Log" jadi menu induk "Log" dengan submenu Audit Log, Activity Log, Login Log
- [x] Registrasi route baru di `route/routeConstants.tsx` + lazy import di `routeLazyComponents.tsx`
- [x] i18n: namespace `activityLog.json`, `loginLog.json` (en+id) + key `nav.log`, `nav.activityLog`, `nav.loginLog`
- [x] MSW mock — SENGAJA DI-SKIP: pola project saat ini men-disable mock utk fitur yang sudah pakai backend asli (lihat `audit.handler.ts` di-comment-out di `mocks/handlers.ts`), activity-log/login-log ikut pola sama, langsung pakai API asli

### Dokumentasi
- [x] `docs-v2/features/activity-log.md`, `docs-v2/features/login-log.md` (mirror `features/audit.md`)
- [x] Update tabel "Read Order" di `docs-v2/CLAUDE.md`

---

## 5. Verifikasi

1. `bunx tsc --noEmit` bersih (backend & frontend), `bun test` tetap pass.
2. Login sukses/gagal beberapa kali → baris baru muncul di `login_logs`, `ip_address`/`user_agent` terisi (bukan null).
3. Navigasi antar halaman frontend → baris `PAGE_VIEW` masuk ke `activity_logs`, request API biasa juga tercatat, tanpa duplikasi entry untuk endpoint page-view itu sendiri.
4. Sidebar: "Audit Log" sudah pindah jadi submenu "Log", bersama "Activity Log"/"Login Log", permission-gating tetap jalan per submenu.
5. Login sebagai admin biasa (bukan superadmin) → tidak melihat activity/login log milik akun superadmin.
