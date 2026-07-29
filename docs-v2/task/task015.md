# Task 015 — Audit & Fix Celah RBAC Company-Scope (lanjutan task013 §2)

> Status: draft, ditulis sebelum eksekusi sesuai konvensi proyek.
> Dipicu oleh temuan saat kerjakan [[task014]]: `GET /settings/divisions` ternyata
> tidak pernah menerapkan `resolveCompanyScope` (sudah diperbaiki langsung di sesi
> yang sama, lihat commit task014). Audit ini memperluas pengecekan yang sama ke
> seluruh endpoint lain yang menerima `company_id` (termasuk implisit lewat
> fetch-by-id), untuk pastikan tidak ada gap serupa yang tersisa.

## 1. Metodologi Audit

Dicari semua `*.schema.ts` yang punya `z.literal('all')` di query company_id (9 file:
`metrics`, `settings/high-margin`, `settings/intercompany-names`, `transactions`,
`customers`, `settings/item-types`, `settings/channel-divisions`, `settings/divisions`,
`dashboard`). Untuk tiap file, dicek handler+service:
1. Endpoint LIST — apakah `resolveCompanyScope(c, query.company_id)` dipanggil
   sebelum data di-query, hasilnya (`scopeIds`) benar-benar dipakai sebagai filter
   (bukan raw `query.company_id` yang diteruskan mentah ke repository)?
2. Endpoint UPDATE/DELETE/DETAIL by-id — apakah ada `resolveCompanyScope(ctx,
   existing.company_id)` SETELAH fetch row existing, sebelum mutasi/return data?
3. Untuk endpoint yang lolos gap teknis, dicek juga permission gate-nya di
   `*.route.ts` — kalau permission itu cuma dipegang superadmin (yang memang bypass
   semua scope by design), gap-nya defense-in-depth saja, bukan exploitable sekarang.

`dashboard`/`metrics`/`transactions`/`customers` (list) sudah benar (representative
check: `handleGetDashboard`, `handleGetInvoices`, `handleGetCustomers`,
`handleGetInvoiceDetail` semua panggil `resolveCompanyScope` dan pakai hasilnya).
`settings/high-margin` (list+create) dan `settings/intercompany-names` (semua
endpoint) juga sudah benar — jadi acuan pola yang benar untuk fix di bawah.

## 2. Temuan

### 2a. KRITIS — `GET /customers/:id` (`handleGetCustomerDetail`) tanpa scope check sama sekali
`backend/src/features/customers/customers.handler.ts:22-27` → `getCustomerDetail(id, asOfDate)`
(`customers.service.ts:22-31`) → `findCustomerDetail(customerId, asOfDate)`
(`customers.repository.ts:228`) — TIDAK ADA validasi company_id di jalur mana pun.
Permission gate `customer:view` (`customers.route.ts:8`) dipegang **role `user`
biasa** (bukan cuma admin, lihat `USER_PERMISSION_NAMES` di `seed.ts`), jadi user
privilege terendah pun bisa GET detail lengkap (omzet, riwayat transaksi, kategori)
customer company MANA PUN cuma dengan tebak/loop `id` di URL — IDOR murni.

### 2b. TINGGI — `GET /settings/channel-divisions` (`handleListChannelDivisions`) tanpa scope check
`channel-divisions.handler.ts:24-28` → `listChannelDivisionsService(query)`
(`channel-divisions.service.ts:33-40`) → `findChannelDivisions(params)`
(`channel-divisions.repository.ts:6-17`) — filter `company_id` cuma diterapkan kalau
BUKAN `'all'`; default query schema-nya `'all'` (`channel-divisions.schema.ts:20`),
dan frontend (`Divisions/index.tsx`, `useChannelDivisions`) **tidak pernah** kirim
`company_id` sama sekali. Permission `settings.channel.division:view` dipegang role
`admin` non-superadmin. Akibatnya: SETIAP kali admin buka halaman Channel Division,
dia selalu lihat mapping SEMUA company, bukan cuma company yang jadi haknya — bukan
skenario tepi, tapi perilaku default yang selalu terjadi.

### 2c. SEDANG — `PATCH /settings/high-margin/:id` dan `/:id/deactivate` tanpa scope check
`editHighMargin`/`deactivateHighMargin` (`high-margin.service.ts:50-88`) sudah fetch
`existing` (jadi tahu `existing.company_id`) tapi tidak pernah panggil
`resolveCompanyScope(ctx, existing.company_id)` sebelum mutasi — beda dengan
`createHighMargin` (sudah benar, `high-margin.handler.ts:28`) dan pola
`divisions`/`channel-divisions` yang konsisten cek scope di update/delete. Permission
`settings.product:update` dipegang role `admin` (lihat `ADMIN_PERMISSION_NAMES`) —
admin company A bisa update/nonaktifkan mapping high-margin company B kalau tahu ID.

### 2d. RENDAH (defense-in-depth) — fitur `item-types` (semua CRUD) dan `DELETE /settings/high-margin/:id` tanpa scope check
`item-types.handler.ts`/`.service.ts` — TIDAK ADA `resolveCompanyScope` di list,
create, update, MAUPUN delete. `removeHighMargin` (`high-margin.service.ts:90-105`)
juga tidak ada. **Belum exploitable oleh role non-superadmin saat ini** karena
permission gate-nya (`config.classification:*` untuk item-types — lihat komentar
`seed.ts:214-215` "hak khusus superadmin"; `settings.product:delete` untuk high-margin
delete — tidak ada di `ADMIN_PERMISSION_NAMES`) cuma dipegang superadmin, yang memang
bypass semua scope by design. Tetap diperbaiki sebagai defense-in-depth, supaya kalau
suatu saat permission itu di-grant ke role lain, tidak otomatis jadi celah baru.

## 3. Rencana Perbaikan

Semua pakai pola yang SAMA dan SUDAH TERBUKTI benar di `intercompany-names`/`divisions`
(diperbaiki task014)/`high-margin` (list+create): fetch row dulu → `resolveCompanyScope(ctx,
existing.company_id)` → lempar 403 kalau di luar akses, ATAU untuk list: `resolveCompanyScope(c,
query.company_id)` → hasil `scopeIds` dipakai sebagai SATU-SATUNYA filter company di
repository (bukan raw `query.company_id`).

- **2a**: `getCustomerDetail(id, asOfDate, ctx)` — tambah param `ctx`, panggil
  `resolveCompanyScope(ctx, detail.company_id)` setelah fetch (return NOT_FOUND kalau
  403, konsisten pola "tidak expose keberadaan row di luar scope" seperti
  `findInvoiceDetail`).
- **2b**: `findChannelDivisions` ganti signature dari `{ division, company_id, search
  }` jadi `{ division, scopeIds, search }`, filter pakai `inArray` bukan `eq`.
  Handler panggil `resolveCompanyScope(c, query.company_id)` dulu.
- **2c**: Tambah `resolveCompanyScope(ctx, existing.company_id)` di 3 fungsi
  (`editHighMargin`, `deactivateHighMargin`, `removeHighMargin`) setelah fetch
  `existing`, sebelum mutasi.
- **2d**: `item-types` — list ganti ke pola `scopeIds` (mirror 2b), create tambah
  `resolveCompanyScope(ctx, body.company_id)` di handler (mirror `divisions`), update/delete
  tambah `resolveCompanyScope(ctx, existing.company_id)` di service (mirror 2c).

## 4. Test Plan
- Regresi: `bun test src/test/task013-intercompany.e2e.test.ts` tetap hijau (tidak
  disentuh langsung, tapi pola `resolveCompanyScope` yang diperluas harus tidak
  merusak alur superadmin yang dites di situ).
- Manual/logic check: superadmin (`isSuperAdmin=true`) tetap bebas akses semua
  company di semua endpoint yang diperbaiki (resolveCompanyScope return `undefined`
  untuk superadmin, tidak pernah throw).
- Tidak ada test otomatis khusus untuk skenario "admin scoped ke 1 company coba akses
  company lain" di endpoint-endpoint ini sebelum task ini — di luar scope untuk
  menulis test baru sekarang (dicatat sebagai potential follow-up, bukan blocker).

## 5. Status Perbaikan

**Semua 4 temuan sudah diperbaiki (2026-07-29), typecheck bersih, test regresi hijau.**

- **2a** (`customers.handler.ts`/`.service.ts`) — `getCustomerDetail` sekarang terima
  `ctx`, panggil `resolveCompanyScope(ctx, 'all')` setelah fetch lalu manual-check
  `scopeIds.includes(detail.company.id)` — kalau di luar scope, dilempar `NOT_FOUND`
  (bukan 403) supaya tidak bocorin keberadaan row di company lain, konsisten pola
  `findInvoiceDetail`.
- **2b** (`channel-divisions.repository.ts`/`.service.ts`/`.handler.ts`) —
  `findChannelDivisions` ganti signature jadi `{ division?, scopeIds?, search? }`
  (`FindChannelDivisionsParams`, exported type baru), filter pakai `inArray`. Handler
  panggil `resolveCompanyScope(c, query.company_id)` sebelum ke service.
- **2c** (`high-margin.service.ts`) — `editHighMargin`, `deactivateHighMargin`,
  `removeHighMargin` masing-masing tambah `resolveCompanyScope(ctx,
  existing.company_id)` setelah fetch, sebelum mutasi.
- **2d** (`item-types.repository.ts`/`.service.ts`/`.handler.ts`) — `findItemTypes`
  ganti ke pola `scopeIds` (sama seperti 2b/divisions). List, create, update, delete
  keempatnya sekarang panggil `resolveCompanyScope`. Efek samping: 1 script one-off
  (`scripts/seed-item-types-existing-companies.ts`) ikut disesuaikan pemanggilan
  `findItemTypes(c.id)` → `findItemTypes([c.id])` karena signature berubah dari
  `number | 'all'` jadi `scopeIds?: number[]`.

**Verifikasi**: `bunx tsc --noEmit` bersih di semua perubahan, `bun test` (seluruh
suite, 6 file test) — 82 pass, 2 skip (pre-existing, tidak terkait), 0 fail. Tidak
ada test otomatis baru ditulis khusus untuk 4 temuan ini (dicatat sebagai gap di §4,
bukan blocker untuk fix ini).

**Belum dilakukan**: commit/push/PR — menunggu instruksi eksplisit user (kerjaan ini
ditemukan saat proses PR #64/[[task014]] yang masih open, belum diputuskan apakah
digabung ke situ atau PR terpisah).
