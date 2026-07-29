# Task 012 — Division Dinamis per Company (FK-based, v2)

> Status: ✅ Done — diimplementasi & diverifikasi 2026-07-29
> Dibuat: 2026-07-29 (v1 varchar/soft-reference DIBATALKAN setelah ditemukan branch `dev` sudah
> punya percobaan lain — task004/005/006, "division FK refactor" — 2026-07-10, arsip di
> `git stash list` sebagai `task012-v1-varchar-softref-superseded-by-FK-redesign`)
> Baca juga: `docs-v2/task/task001.md` (RBAC Company→Branch→Division), `docs-v2/task/task011.md`
> (pola dasar dinamis-per-company, tapi v1-nya, BUKAN dipakai lagi untuk division)

---

## 1. Kenapa Ganti Arsitektur (v1 → v2)

v1 (dibatalkan) mirror pola `item_types` (task011) persis: tabel baru `divisions` dengan
`key` varchar, direferensikan oleh `channel_divisions.division`/`user_divisions.division`
lewat KONVENSI (soft-reference), bukan FK. Sudah selesai diimplementasi & dites, TAPI:

1. Ditemukan branch `dev` (76 commit ketinggalan dari `main`, tidak pernah di-merge) sudah
   pernah mengerjakan fitur SAMA dengan arsitektur BEDA — FK integer, plus granularitas
   per-branch (bukan cuma per-company) — under task004/005/006. Task006 "99% complete,
   1 TS error" — tidak pernah selesai.
2. User mengonfirmasi FK integer memang arsitektur yang lebih benar (dipakai HAMPIR SEMUA
   tabel lain di app ini — `companies.id`, `company_branches.id`, `product_categories.id`,
   dst — string soft-reference di `channel_divisions.division`/`item_types.key` itu
   penyimpangan, bukan pola default proyek ini).

v2 ini: FK integer PENUH termasuk RBAC scope-check (`utils/scope.ts`), TAPI didesain ulang
dari nol lawan kode `main` TERKINI (bukan port `dev` yang stale+inconsistent — contoh:
`transactions.schema.ts` di `dev` sudah pakai `business_unit: number`, tapi
`customers.schema.ts`/`metrics.schema.ts` di `dev` yang SAMA masih `string` — tidak
konsisten, bukti task006 memang berhenti di tengah jalan).

---

## 2. Keputusan Desain Kunci

### a. Granularitas: per-branch (opsional), bukan cuma per-company
Tabel `divisions` baru: `branch_id` NULLABLE — `NULL` = berlaku company-wide (semua branch),
diisi = spesifik 1 branch (mis. "Sales Counter" KNT beda per cabang). Mirror `branch_divisions`
di `dev`, TAPI nama tabel/kolom TETAP `divisions`/`division_id` (tidak ikut rename
`channel_divisions`→`division_channels` yang `dev` lakukan — itu cuma kosmetik, menambah
blast radius ~50 file tanpa manfaat fungsional, tidak diperlukan untuk dapat FK+per-branch).

### b. FK integer PENUH — termasuk RBAC scope-check
`channel_divisions.division` (varchar) → `division_id` integer NOT NULL FK → `divisions.id`.
`user_divisions.division` (varchar) → `division_id` integer NOT NULL FK → `divisions.id`
(`ON DELETE CASCADE`). `utils/scope.ts` `buildDivisionCondition`/`-Raw` ikut kerja dengan
`division_id` (integer), BUKAN string lagi.

**Subtlety "other" fallback** (kenapa ini AMAN, bukan resiko tinggi seperti sempat saya
salah duga): `'other'` dulu literal string tunggal di COALESCE, sekarang jadi row BEDA per
company (id beda-beda). TAPI `buildDivisionCondition` SUDAH loop per-branch untuk build SQL
clause-nya, dan tiap branch pasti 1 company — jadi "ID division 'other' milik company branch
ini" bisa di-resolve SEKALI di TypeScript (query kecil `SELECT company_id, id FROM divisions
WHERE key='other'`, lalu di-join ke `branchScopes` yang sudah punya `company_id` per
`branch_id`) SEBELUM SQL dibangun — bukan subquery runtime per row. Sama sekali tidak nambah
kompleksitas query, cuma nambah 1 map lookup di kode.

### c. Company_id WAJIB di `channel_divisions` (hapus opsi "Global")
`channel_divisions.company_id` sekarang NOT NULL (dulu nullable = rule global lintas company).
Konsekuensi logis dari `divisions` yang company-scoped — rule global tidak punya `division_id`
yang valid untuk di-point (tidak ada "division row" yang berlaku utk semua company sekaligus).
**Dicek aman**: 0 baris `channel_divisions` dengan `company_id IS NULL` di DB sekarang (query
`isNull(channel_divisions.company_id)` = 0 rows) — tidak ada data yang hilang/rusak.

### d. Query/filter level (report) JUGA numeric ID — konsisten penuh (REVISI 2026-07-29)
**Keputusan awal (string key) DIBATALKAN** — premisnya salah: dikira division itu kategori
yang harus semakna lintas company (mis. "distribution" harus berarti sama di MKO/KNT/SKI).
Faktanya TIDAK — `distribution` cuma dipakai PT MKO (KNT/SKI tidak punya sama sekali), dan
tiap company pada dasarnya bebas punya set division sendiri (custom, tidak wajib overlap).
Jadi kasus "1 key sama dipakai beberapa company sekaligus" itu jarang/tidak signifikan —
kalaupun ada 2 company sama-sama punya "Project", itu memang 2 division BEDA (row/ID beda),
bukan 1 kategori yang perlu disatukan.

`business_unit`/`division` di query param `GET /customers`, `GET /invoices`,
`GET /metrics/*`, `GET /dashboard` **jadi numeric `division_id` (integer)**, sama seperti
kolom FK-nya. Ini justru MENYEDERHANAKAN kode:
- Repository filter langsung `WHERE division_id = ?` / `IN (?)` — tidak perlu JOIN/subquery
  resolve string→ID(s) lagi.
- Frontend `useDivisionOptions()`/dropdown filter TIDAK perlu dedup-by-key lagi (tiap ID
  sudah unik secara alami) — cukup ambil daftar division aktif dalam scope (`useActiveDivisions`),
  tampilkan `.label`, kirim `.id` sebagai value filter.
- Company_id='all' → dropdown tampilkan SEMUA division aktif lintas company dalam scope user
  (kalau kebetulan 2 company punya label sama, tampil 2 entry terpisah — itu benar, bukan bug).

Response API tetap balikin `division`/`business_unit` sebagai STRING (`.label`, utk display)
DI SAMPING `division_id` kalau FE butuh — resolve lewat JOIN ke `divisions` di SELECT
(bukan lagi soal filter, cuma soal apa yang ditampilkan ke user).

Semua field yang berkaitan dengan division (filter query param MAUPUN body create/update
relasi FK seperti `channel_divisions`/`user_divisions` assignment) sekarang SATU jenis
tipe: `division_id` (number). Tidak ada lagi percabangan string-vs-number tergantung
konteks endpoint.

### e. Value terproteksi `'other'` — sama seperti v1
`is_protected` boolean, `true` khusus row `key='other'` per company, tidak bisa
dihapus/dinonaktifkan via API. Tidak berubah dari v1.

### f. `dormant_category` — sama seperti v1
Field wajib saat create division baru (`b2b_dc|b2b_project|b2c|manufacturing`, 4 kategori
tetap, bukan dinamis — sudah dikonfirmasi user sebelumnya). Tidak berubah dari v1.

### g. Permission — sama seperti v1
`settings.division:view/create/update/delete` (baru, tanpa `:menu`, mirror
`settings.branch:*`). Tidak berubah dari v1.

---

## 3. Skema DB Baru

```
divisions
  id                 serial PK
  company_id         integer NOT NULL → companies (cascade)
  branch_id          integer NULL → company_branches (cascade) — NULL = company-wide
  key                varchar(30) NOT NULL
  label              varchar(50) NOT NULL
  dormant_category   varchar(20) NOT NULL
  is_protected       boolean NOT NULL DEFAULT false
  is_active          boolean NOT NULL DEFAULT true
  created_at/updated_at
  UNIQUE (company_id, branch_id, key)              -- kombinasi biasa
  UNIQUE (company_id, key) WHERE branch_id IS NULL  -- partial index, cegah duplikat company-wide
                                                        (Postgres: NULL tidak collide di UNIQUE biasa)
```

```
channel_divisions   (existing table, diubah)
  company_id   integer NOT NULL → companies        -- DULU nullable (global), SEKARANG wajib (§2c)
  division_id  integer NOT NULL → divisions (cascade)  -- DULU varchar `division`
  -- channel_name, timestamps: tidak berubah
```

```
user_divisions   (existing table, diubah)
  user_id, branch_id: tidak berubah
  division_id  integer NOT NULL → divisions (cascade)  -- DULU varchar `division`
  -- PK tetap (user_id, branch_id, division_id)
```

**Validasi (service layer, bukan constraint DB — beda company/branch kombinasi terlalu
dinamis utk CHECK constraint)**: `division_id` yang di-assign ke suatu `branch_id` (baik di
`channel_divisions` maupun `user_divisions`) HARUS salah satu dari: (a) `divisions.branch_id
IS NULL` (company-wide, berlaku semua branch company itu), ATAU (b) `divisions.branch_id =
branch_id` yang sama persis. Ditolak 400 kalau melanggar (mis. division khusus branch A
di-assign ke branch B).

---

## 4. Migrasi Data (urutan WAJIB, satu migration script bertahap)

1. Buat tabel `divisions` (migration SQL biasa)
2. Seed 7 division default per company EXISTING, `branch_id=NULL` (company-wide) — mirror
   pola `dormant_category` v1 (persis `BU_DORMANT_KEY_MAP` lama biar tidak ada regresi
   dormant threshold)
3. Tambah kolom `channel_divisions.division_id` (nullable dulu, sementara)
4. Backfill: `UPDATE channel_divisions SET division_id = (SELECT id FROM divisions WHERE
   company_id = channel_divisions.company_id AND key = channel_divisions.division)` — SEMUA
   baris harus ke-resolve (0 global rows sudah dikonfirmasi aman, lihat §2c)
5. Set `channel_divisions.division_id` NOT NULL, drop kolom `division` (varchar) lama,
   drop kolom `company_id` nullable constraint (jadi NOT NULL)
6. Sama persis untuk `user_divisions`: tambah `division_id` nullable → backfill (lookup
   company lewat `company_branches.company_id` dari `branch_id`) → NOT NULL → drop `division`
7. Tambah FK constraints + index yang belum ada

Script backfill idempotent, dry-run dulu (print apa yang akan diubah) sebelum `--apply` —
mirror pola `reclassify-product-categories.ts` (task011).

---

## 5. Breakdown File yang Kena Dampak

### Backend — Schema & Migration
- `db/schema/schema-product.ts` — tabel `divisions` baru; `channel_divisions.division`→`division_id`, `company_id` NOT NULL
- `db/schema/schema-company.ts` — `userDivisions.division`→`division_id`
- Migration SQL manual (bukan cuma `drizzle-kit generate` — perlu backfill step di antara ALTER TABLE, lihat §4)

### Backend — RBAC/Scope (PALING KRITIS)
- `utils/scope.ts` — `buildDivisionCondition`/`-Raw` kerja dengan `division_id` integer +
  `otherIdByBranch: Map<number, number>` param baru (resolusi fallback, §2b).
  `buildExcludeIntercompanyCondition`/`-Raw` — sama, butuh resolusi `intercompany` id per
  company/branch (bukan literal string lagi)
- `middleware/auth.ts` — `resolveDivisionScope()` return `Map<branchId, number[]>`.
  Tambah resolusi `otherIdByBranch`/`intercompanyIdByBranch` (query kecil sekali per
  request, join ke `branchScopes` yang sudah ada)
- `features/auth/auth.repository.ts` — `getUserDivisionScopes()` return `division_id`
  bukan `division` string. `getMyScopeTree()` `isFullDivisionAccess` bandingkan Set of IDs

### Backend — Konsumen `channel_divisions.division` (query yang JOIN & SELECT langsung)
- `features/customers/customers.schema.ts`/`transactions.schema.ts`/`dashboard.schema.ts`/
  `metrics.schema.ts` — `business_unit`/`division` query param: `z.string()` →
  `z.coerce.number().int().positive()` (§2d REVISI, konsisten numeric di semua endpoint)
- `features/customers/customers.repository.ts` — filter LANGSUNG `eq(channel_divisions.division_id, businessUnit)` (tidak perlu JOIN resolve lagi, §2d). SELECT tetap JOIN `divisions` utk ambil `.label` (response API tetap tampilkan teks, bukan angka) — baris ~126, 158, 184, 225, 236, 335 versi lama
- `features/transactions/transactions.repository.ts` — sama pola (baris ~38, 77, 98)
- `features/metrics/*.repository.ts`, `segment.helper.ts` — SQL CASE/JOIN raw yang refer `cd.division` → refer `cd.division_id` langsung (filter) + JOIN `divisions d` kalau butuh `.label` utk response
- `features/config/threshold.ts` — `resolveDormantCategory()`/`resolveDormantMonths()` tetap ambil `dormant_category` dari `divisions`, sekarang query by `id` (dari `division_id` yang sudah di-resolve dari invoice/channel JOIN) — LEBIH SEDERHANA dari v1 (tidak perlu fallback `?? 'b2b_dc'` berbasis string key lagi, tinggal `WHERE id = ?`)

### Backend — CRUD & Validasi
- `features/settings/divisions.{schema,repository,service,handler,route}.ts` — CRUD baru,
  mirror v1 TAPI `company_id`+`branch_id` di create/update, proteksi `is_protected`
- `features/settings/channel-divisions.schema.ts`/`.service.ts` — `division` field jadi
  `division_id` (number), validasi FK exists + branch-scope rule (§3)
- `features/users/user.schema.ts`/`.service.ts`/`.repository.ts` — `divisions: number[]`
  (division_id), validasi sama

### Backend — `db/seed.ts`
- Seed `divisions` per company (company-wide, branch_id NULL) SEBELUM `seedUserAssignments()`
  (urutan sama seperti v1)
- `seedUserAssignments()` — assign `division_id` (bukan string) ke superadmin/admin test user

### Frontend
- `types/divisions.ts`, `api/divisions.api.ts`, `hooks/useDivisions.ts` — field `id` sudah
  ada, tambah `branch_id` nullable di tipe
- `types/channelDivisions.ts` — `division: string` → `division_id: number` di payload
  create/update; response tetap balikin `division`/`division_label` string utk display
- `types/users.ts` `BranchAssignment.divisions` → `number[]`
- `pages/Users/components/AssignmentTreePicker.tsx` — checkbox `value` jadi `division.id`
  (number), bukan `division.key` (string)
- `pages/Settings/Divisions/components/DivisionMappingDialog.tsx` — Select `division` submit
  `division_id`, tapi opsi tetap sumber dari `useActiveDivisions(companyId)` yang punya `.id`
- `pages/Settings/Divisions/index.tsx` — kolom tabel "Divisi" tetap tampilkan string
  (`row.division_label`), tidak berubah tampilannya
- **BERUBAH** (§2d, REVISI): `hooks/useDivisionOptions.ts` — value filter jadi
  `division_id` (number), bukan string key lagi. Semua halaman yang pakai (Dashboard,
  Customers, Products, Transactions, Metrics — 8+ halaman via `ScopeFilterFields`) ikut
  kirim `division_id` di query param. `useDivisionOptions()` sumbernya GANTI dari distinct
  `channel_divisions.division` (string) jadi `useActiveDivisions(companyId)` (division
  aktif dalam scope company yang dipilih, sudah punya `.id`+`.label`) — TIDAK perlu dedup
  lagi (§2d)
- `components/filters/ScopeFilterFields.tsx` — value division di state filter jadi `number
  | ''` bukan `string | ''`
- `pages/Customers/components/DivisionChip.tsx`/`pages/Transactions/components/BuChip.tsx`
  — terima `division_id`+lookup label, ATAU tetap terima label string kalau response API
  sudah expose `division_label` langsung (lebih sederhana — chip cuma nampilin teks, tidak
  perlu tau ID)

### Tidak disentuh
- `customers.business_unit`/`invoices.business_unit` (varchar) — kolom RAW hasil import
  Accurate, TIDAK direferensikan FK ke `divisions` (beda konteks — itu snapshot data
  historis dari source system, bukan relasi tabel)
- Rename `channel_divisions`→`division_channels` (kosmetik `dev`, di-skip, §2a)

---

## 6. Verifikasi (setelah implementasi) — ✅ SEMUA SELESAI 2026-07-29
1. [x] Migration bertahap (0011 additive → `migrate-divisions-fk.ts` backfill → 0012 drop
   kolom lama) jalan bersih di DB lokal — 25 `channel_divisions` + 245 `user_divisions`
   rows 100% ke-resolve (0 gagal), 21 divisions ter-seed (7×3 company)
2. [x] `tsc -b` bersih FE+BE. `bun test` backend: 77 pass/2 skip/0 fail (termasuk
   `scope-isolation.e2e.test.ts` dan `transactions-filter.e2e.test.ts` yang di-adaptasi ke
   division_id dinamis, dan `scope.test.ts` — 25 test baru utk `buildDivisionCondition`/
   `buildExcludeIntercompanyCondition` versi ID-based)
3. [x] `'other'` ditolak keras via curl langsung — `DELETE`/`PATCH{is_active:false}` sama-sama
   409 `RESOURCE_IN_USE`, walau tidak "in use"
4. [x] RBAC scope check dites via `bun test` (unchanged pass) + live curl (`GET /customers`,
   `GET /invoices`, `GET /metrics/*` semua 200, filter by `division_id` bekerja benar,
   `exclude_intercompany` toggle company-keyed jalan)
5. [x] Filter report (`?business_unit=<division_id>`) dites live di halaman Customers —
   dropdown company_id='all' benar menampilkan 3× "Distribution" terpisah (1 per company,
   BUKAN dedup — sesuai keputusan §2d revisi), klik salah satu mengirim `business_unit=15`
   (numeric) ke API, hasil terfilter benar
6. [x] `AssignmentTreePicker` dites live end-to-end (Playwright): pilih Company → Branch
   muncul → pilih Branch → Division checkbox muncul dengan label dinamis dari DB
   ("Distribution", "E-Commerce", dst, bukan lagi 7 value hardcode)
7. [x] `DivisionMappingDialog` cascading dites live: pilih company "PT Kode Niaga Tama" →
   dropdown Division berubah isi ke 7 division company itu (sebelumnya kosong/disabled saat
   company belum dipilih, sesuai desain company_id wajib)
8. [x] Company baru (`POST /companies`, dites live lalu dihapus) → otomatis 7 default division
   (company-wide, `branch_id=null`), cascade delete company juga bersih
9. [x] Permission `settings.division:*` dites live: `user@mail.com` (role `user`) → `GET
   /settings/divisions` 403, `GET /settings/divisions/values` tetap 200 (endpoint publik)
10. [x] Division CRUD widget (Settings/Divisions page) dites live: tambah division baru
    (dengan `dormant_category` wajib) → langsung muncul sebagai chip, hapus (delete icon
    chip) → hilang. Proteksi `'other'` di UI: chip "Lainnya (wajib ada)" tanpa tombol
    hapus/toggle
