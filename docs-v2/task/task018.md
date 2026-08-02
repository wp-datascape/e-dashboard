# Task 018 — Fix Isolasi Branch/Division Customer (lanjutan task015)

> Status: SELESAI, dikerjakan & diverifikasi 2026-08-02. Ditemukan saat evaluasi
> isolasi data lanjutan setelah [[task016]] (i18n notifikasi) selesai — user
> bertanya "apakah isolasi data sudah clear, per perusahaan per cabang dan per
> divisi?".

## 1. Latar Belakang

[[task015]] (2026-07-29) mengaudit dan memperbaiki celah RBAC di level **company**
saja. Audit lanjutan (2026-08-02) memperluas pengecekan ke level **branch** dan
**division** — ditemukan 2 celah baru di fitur Customer, keduanya di file yang
SAMA yang task015 sudah sentuh untuk company-scope (`customers.repository.ts`)
tapi belum pernah dicek branch/division-nya.

## 2. Temuan

### 2a. `GET /customers/:id` — TIDAK PERNAH cek branch/division sama sekali

`customers.handler.ts` (`handleGetCustomerDetail`) hanya panggil
`resolveCompanyScope` — beda dari endpoint kembarannya `handleGetInvoiceDetail`
(`transactions.handler.ts`) yang sudah benar panggil `resolveBranchScope`/
`resolveDivisionScope` juga. Akibatnya `findCustomerDetail` (`customers.
repository.ts`) mengagregasi revenue trend, invoice terbaru, dan category count
dari **SELURUH** invoice customer itu, tanpa peduli branch/division-nya —
kalau `branch_division_enforcement_enabled=true`, user yang scope-nya cuma 1
cabang tetap bisa buka detail customer yang transaksinya (sebagian atau
seluruhnya) di cabang lain, dan melihat angka gabungan lintas cabang.

### 2b. `GET /customers` (list) — gate visibility benar, TAPI angka agregat bocor

Ditemukan saat investigasi 2a: list customer ternyata SUDAH benar soal
*visibility* (customer cuma muncul kalau invoice TERBARUnya ada di scope
viewer, via subquery `latestSalespersonSq`) — tapi begitu customer itu lolos
gate dan tampil, **angka-angka yang ditampilkan** (`lifetime_value`,
`avg_monthly_revenue`, `total_invoices`, `category_count`, tanggal invoice
pertama/terakhir) dihitung dari subquery `liveDatesSq` dan ekspresi
`invCountExpr`/`catCountExpr` yang **agregasi SEMUA invoice customer itu tanpa
filter branch/division apa pun**. Root cause sama persis dengan 2a — cuma
manifestasinya beda (gate vs angka), makanya baru ketahuan sekarang walau
task015 sudah pernah cek file yang sama.

## 3. Fix

Kedua celah diperbaiki dengan pola yang sama: reuse `buildBranchCondition`/
`buildDivisionCondition` (`utils/scope.ts`) — sama persis dengan yang sudah
dipakai `findInvoices`/`findInvoiceDetail` — dipasang sebagai guard di SETIAP
`CASE WHEN`/`WHERE` yang menyentuh tabel `invoices`, bukan cuma di satu
tempat.

**`customers.repository.ts` — `findCustomers` (list):**
- `otherIdByBranch` dipindah dihitung lebih awal (dipakai `liveDatesSq`).
- `liveDatesSq` sekarang JOIN `channel_divisions` + scope guard di tiap
  `CASE WHEN` (live_first/live_last/lifetime_value/avg_monthly_revenue).
- `invCountExpr`/`catCountExpr` (di query utama) tambah scope guard juga —
  perlu JOIN `channel_divisions` KEDUA yang di-alias (`cdInv`, via
  `drizzle-orm/pg-core`'s `alias()`) karena join `channel_divisions` yang SUDAH
  ADA di query itu resolve dari `latestSalespersonSq.channel_name` (channel
  invoice TERBARU customer, buat kolom "division" display), BUKAN dari channel
  invoice yang SEDANG dihitung di CASE WHEN — 2 hal berbeda, tidak bisa reuse 1
  join yang sama.

**`customers.repository.ts` — `findCustomerDetail`:**
- Tambah param `branchScope`/`divisionScope`.
- Tambah pre-check `anyInv` (unscoped) vs `latestInv` (scope-guarded) — kalau
  customer PUNYA invoice tapi TIDAK SATU PUN dalam scope viewer → return `null`
  (404 di service), BUKAN tampil kosong. Kalau customer memang belum pernah
  transaksi sama sekali (unrelated ke RBAC) → tetap tampil kosong seperti
  perilaku lama (tidak berubah).
- `latestInv` (sumber channel/divisi yang ditampilkan) sekarang scope-guarded —
  menampilkan divisi dari invoice terbaru yang TERLIHAT viewer, bukan true-latest
  yang bisa dari branch di luar aksesnya.
- Semua 5 query yang agregasi invoice (`row`/`catRows`/`trendRows`/
  `recentRows`) tambah scope guard — `trendRows` (raw SQL) pakai
  `buildBranchConditionRaw`/`buildDivisionConditionRaw`, sisanya pakai varian
  Drizzle query-builder.

**`customers.service.ts`/`customers.handler.ts`:**
- `getCustomerDetail` diubah signature dari `(id, asOfDate, ctx: Context)` jadi
  `(id, asOfDate, scopeIds?, branchScope?, divisionScope?)` — konsisten dengan
  pola `getInvoiceDetail`/`getCustomers` yang lain (resolve scope di handler,
  service jadi pure function tanpa `Context`).
- `handleGetCustomerDetail` sekarang panggil `resolveCompanyScope` →
  `resolveBranchScope` → `resolveDivisionScope` (urutan wajib) sebelum panggil
  service, mirror persis `handleGetInvoiceDetail`.

## 4. Verifikasi

- `bunx tsc --noEmit` bersih.
- `bun test` — 82 pass / 0 fail (suite existing, tidak ada regresi).
- Verifikasi manual terhadap DB dev (bukan mock) — 2 customer riil dengan invoice
  lintas 3 branch:
  - Customer "CHAROEN POKPHAND INDONESIA TBK, PT" (id 58, invoice branch 1/2/3):
    list unscoped `total_invoices=18` (1+11+6) → scoped branch `[3]` saja
    `total_invoices=6` → scoped branch `[2,3]` `total_invoices=17` (11+6). Semua
    angka cocok persis hitungan manual dari DB.
  - Customer "PELANGGAN UMUM" (id 81, invoice branch 1/2/3): detail unscoped
    `recent_invoices.length=5` → scoped branch `[1]` saja `recent_invoices.
    length=3` (persis jumlah invoice branch 1 customer ini) → scoped branch
    `[99]` (branch yang tidak pernah ditransaksikan customer ini) → `null`
    (404, bukan tampil kosong) → customer id yang tidak exist → tetap `null`
    (perilaku lama utk 404 genuine tidak berubah).

## 5. Catatan Lanjutan

Pola audit ini (cek SEMUA query yang menyentuh `invoices` per fitur, bukan cuma
gate visibility-nya) reusable kalau nanti ada fitur lain yang perlu di-audit
ulang — kemungkinan ada pola serupa (gate benar, tapi agregat di dalamnya
bocor) di fitur lain yang belum dicek. Lihat juga [[project_rbac_scope_audit_task015]].
