# Task 013 — Sister Company Names & Fix Celah RBAC Company-Scope

> Status: draft, belum dikerjakan. Task doc ditulis dulu sebelum coding sesuai konvensi proyek.

## 1. Masalah #1 — Filter Exclude Intercompany Bocor

Filter "Exclude Intercompany" tidak menangkap semua transaksi intercompany. Contoh nyata (production, company PT MKO): customer **KODE NIAGA TAMA, PT** (representasi PT KNT di pembukuan MKO) punya 67 invoice (2025-01-09 s.d. 2026-07-10, total Rp 24.454.990) yang masuk lewat channel `SALES SUPPORT` / `SALES SUPPORT JKT`. Channel itu di-mapping ke division **Support**, bukan **Intercompany**, jadi lolos filter.

**Root cause**: klasifikasi division sekarang murni berbasis `channel_name → division` (tabel `channel_divisions`). `channel_name` diisi dari kolom **"Tenaga Penjual"** saat import — bukan dari nama customer. Satu tenaga penjual (mis. "SALES SUPPORT") melayani campuran customer biasa (348 customer berbeda memakai channel ini) dan sister company, jadi sortir berbasis tenaga penjual/channel tidak pernah bisa akurat untuk kasus intercompany. Ini bukan bug baru dari task012 — gap ini sudah ada sejak fitur channel mapping pertama dibuat (commit `d417ef5`).

## 2. Masalah #2 — Celah RBAC Company-Scope (ditemukan saat riset task013)

`backend/src/features/settings/divisions.handler.ts` dan `channel-divisions.handler.ts` (keduanya dibuat task012) **tidak pernah memanggil `resolveCompanyScope`** sebelum meneruskan `company_id` dari body request ke service. `requirePermission` di route cuma cek "user punya izin fitur ini", bukan "company_id yang dikirim ini memang miliknya".

**Dampak nyata**: user non-superadmin dengan scope 1 company (mis. MKO) tapi punya permission `settings.division:create/update/delete` atau `settings.channel.division:*`, bisa kirim `company_id` milik company LAIN dan berhasil create/update/delete division atau channel mapping company itu — harusnya ditolak 403.

**Pola yang benar** (sudah dipakai di `high-margin.handler.ts:19-32`, jadi acuan):
```ts
export async function handleCreateHighMargin(c: Context) {
  const body = await validateBody(c, createHighMarginSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  ...
}
```
`resolveCompanyScope(c, requested)` (`backend/src/middleware/auth.ts:64-75`) — superadmin bebas pilih company mana pun; non-superadmin dilempar `AppError(FORBIDDEN, 403)` kalau `requested` di luar `companyIds` miliknya.

**Scope fix**: tambahkan `resolveCompanyScope(c, body.company_id)` (create/update lewat body, delete lewat lookup existing row dulu baru cek company-nya) di:
- `divisions.handler.ts` — `handleCreateDivision`, `handleUpdateDivision`, `handleDeleteDivision`
- `channel-divisions.handler.ts` — handler create/update/delete yang setara

Untuk update/delete (yang company_id row-nya tidak selalu ada di body/param, cuma `id`), polanya: service ambil row existing dulu (sudah ada, buat pesan NOT_FOUND), baru validasi `resolveCompanyScope(c, existing.company_id)` sebelum lanjut mutasi.

## 3. Desain Fitur Baru — Sister Company Names (per company)

Bukan pengganti mapping channel — **ditambahkan sebagai lapisan pengecualian**. Mapping channel tetap default untuk 5 division lain (distribution/project/e_commerce/freelancer/support), karena itu memang benar bergantung channel per transaksi. Cuma untuk customer yang representasi sister company, klasifikasinya harus KONSTAN apa pun channel-nya — itu yang tidak bisa ditangani mapping channel.

### 3a. Schema
- Tabel baru **`intercompany_customer_names`**: `id, company_id (FK companies, cascade), customer_name (varchar, disimpan UPPER-normalized, sama pola dedup dengan upsertCustomer), created_at, updated_at`. Unique `(company_id, customer_name)`.
- `customers` — tambah kolom `division_override_id integer references divisions(id) on delete set null`, nullable. Ini kolom ENFORCEMENT (dibaca tiap query laporan), diisi OTOMATIS lewat sync dari tabel alias di atas — bukan diedit manual per customer.

### 3b. Sync logic (saat alias ditambah/dihapus)
- Tambah alias → cari `customers` company itu dengan `UPPER(customer_name) = UPPER(alias)` → set `division_override_id` = id division 'intercompany' company itu (`loadDivisionFallbackIds('intercompany')`, sudah ada dari task012).
- Hapus alias → cari customer yang cocok, cek APAKAH masih ada alias lain yang match (kalau tidak) → clear `division_override_id` jadi NULL.
- `upsertCustomer` (`import.repository.ts`) — saat create customer BARU, cek juga terhadap tabel alias company itu; kalau cocok, langsung set `division_override_id` sejak awal. Saat update customer existing, JANGAN timpa `division_override_id` yang sudah ke-set (baik dari alias maupun kemungkinan override manual di masa depan).

### 3c. Titik yang perlu baca override (COALESCE, bukan cuma channel)
Semua tempat yang derive division per customer/invoice, tambah `COALESCE(customers.division_override_id, channel_divisions.division_id)`:
- `customers.repository.ts` — `findCustomers` (list+filter+RBAC scope), `findCustomerDetail`
- `transactions.repository.ts` — kolom `division`/filter `business_unit`
- `utils/scope.ts` — `buildExcludeIntercompanyCondition`/`Raw` (perlu akses `customers.division_override_id`, cek tiap call site sudah JOIN customers)
- Metrics/dashboard repository lain yang pakai `buildExcludeIntercompanyRaw`/`buildDivisionCondition` — audit satu-satu (daftar lengkap ada di context task012 sebelumnya)

### 3d. Endpoint & Permission baru
- `GET/POST/DELETE /api/v1/settings/intercompany-names` (list per company, tambah, hapus) — permission baru `settings.intercompany:view/create/delete`.
- **WAJIB** pakai `resolveCompanyScope(c, body.company_id / query.company_id)` di SEMUA handler sejak awal (jadi referensi pola benar, bukan mengulang celah §2).

### 3e. Frontend — Halaman Settings baru
- Halaman baru (atau sub-section di halaman Settings > Divisions yang sudah ada) — per company (dropdown pilih company kalau user multi-company/superadmin, otomatis terkunci ke company user kalau single-company), daftar nama + form tambah + tombol hapus per baris. Pola CRUD sederhana mirip widget Division yang sudah ada di halaman yang sama.
- Tidak perlu dropdown di `CustomerDetailDialog` (dibatalkan, diganti pendekatan ini).

### 3f. Backfill data existing
Script one-time (pola `migrate-divisions-fk.ts`): untuk KODE NIAGA TAMA dkk yang sudah diketahui, insert ke `intercompany_customer_names` company MKO, lalu jalankan sync logic (§3b) supaya `division_override_id` langsung ke-set tanpa perlu klik manual di UI setelah deploy.

### 3g. Validasi/deteksi proaktif untuk masa depan
Widget kecil di halaman Settings yang sama: **"Channel Ambigu"** — deteksi `channel_name` yang dipakai baik oleh customer ber-override MAUPUN tidak (indikasi channel itu campuran, seperti kasus SALES SUPPORT). Peringatan proaktif untuk admin sebelum salah lapor terulang di channel/entitas lain.

## 4. Test Plan
- Unit test `scope.ts` — override menang atas channel mapping.
- Unit/integration test RBAC: non-superadmin company A kirim `company_id` company B ke endpoint divisions/channel-divisions/intercompany-names → harus 403 (test regresi untuk fix §2).
- E2E — customer ber-alias, filter exclude di Transactions/Customers/Dashboard semua konsisten meng-exclude walau channel invoice-nya bukan intercompany.
- Import ulang invoice untuk customer yang sudah ke-override — pastikan tidak ke-timpa.
- Verifikasi backfill: KODE NIAGA TAMA dkk otomatis ter-override pasca deploy, exclude-intercompany filter production tidak lagi meloloskan 67 invoice itu.

## 5. Scope yang SENGAJA tidak dikerjakan sekarang
- Tidak ada UI CRUD customer penuh — customer tetap sepenuhnya lifecycle via import, `division_override_id` cuma efek samping dari alias sync.
- Tidak auto-detect sister company by fuzzy name-matching ke `companies.name` — daftar alias tetap keputusan admin manual (dibantu backfill untuk kasus yang sudah jelas).
- Tidak audit/fix seluruh kemungkinan celah `resolveCompanyScope` di fitur LAIN di luar divisions/channel-divisions — scope task ini cuma 2 fitur yang ditemukan saat riset ini.
