# Task 004 — Divisi Dinamis per Company/Branch (Backend Fase 1)

> Status: ✅ Backend (Fase 1) Selesai — dimulai & selesai 2026-07-09. Frontend menyusul di task terpisah.
> Dibuat: 2026-07-09
> Baca juga: `docs-v2/features/channel-divisions.md`, `docs-v2/task/task001.md` (§3.1-3.2 hierarki Company→Branch→Division, §4.5-4.6 pola "Lainnya" sebagai baris asli)

---

## 1. Latar Belakang & Tujuan

`division` (kategori sub-channel penjualan seperti `distribution`/`project`/`e_commerce`/`intercompany`/`freelancer`/`support`/`other`) saat ini adalah **enum global hardcode**, diduplikasi di 12 lokasi berbeda di backend (Zod schema, RBAC scope, seed data, threshold config), dan diperlakukan seolah sama untuk ketiga company holding.

Padahal taksonomi 6 nilai itu spesifik untuk model bisnis **PT Mesin Kasir Online (MKO)** — channel DC/B2B/marketplace/intercompany/freelancer/support miliknya sendiri. PT KNT (Kode Niaga Tama) dan PT SKI (Solusi Kartu Indonesia) punya model bisnis berbeda:

- **KNT**: divisi "Sales Counter" (dipecah per cabang — Surabaya/Jakarta/Semarang punya Counter sendiri-sendiri; channel_name di Accurate sudah beda per cabang, mis. "COUNTER SBY") dan "U-Card" (sub-brand penjualan produk berbeda, juga dipecah per cabang).
- **SKI**: fokus manufaktur, divisi konkretnya belum diketahui — untuk sekarang cukup fallback umum ("Lainnya").

**Tujuan task ini:** division menjadi **data dinamis nyata per company (dan per branch)** — mirror pola yang sudah ada untuk `company_branches` (baris DB asli dengan id, bukan kategori virtual) — bukan enum tetap yang sama untuk semua company.

**Scope task ini: BACKEND SAJA.** Frontend (halaman Settings Divisions baru, update halaman Channel Mapping, picker RBAC, chip warna) menyusul di task terpisah setelah backend stabil.

---

## 2. Temuan Kunci (dari eksplorasi sebelum desain)

1. **12 lokasi hardcode enum** (bukan ~10 seperti perkiraan awal): `channel-divisions.schema.ts`, `channel-divisions.service.ts`, `transactions.schema.ts`, `customers.schema.ts`, `dashboard.schema.ts`, `metrics.schema.ts` (8 pemakaian), `user.schema.ts`, `auth.repository.ts`, `db/seed.ts`, `scripts/backfill-user-branch-division.ts`, `test/scope-isolation.e2e.test.ts`, `config/threshold.ts`.
2. **Kolom `division` di semua tabel adalah `varchar` biasa, BUKAN foreign key.** Logic RBAC scope (`utils/scope.ts`, `buildDivisionCondition`/`buildDivisionConditionRaw`, 24 call site total) hanya membandingkan string. Artinya division bisa dibuat dinamis per company/branch **tanpa mengubah satupun dari 24 call site itu** — cukup ganti sumber validasi dari enum hardcode ke tabel master baru.
3. **`'other'`/"Lainnya" untuk division didesain (task001.md §4.5) tapi tidak pernah benar-benar diimplementasikan** sebagai baris asli — cuma ada sebagai fallback virtual `COALESCE(division, 'other')` di query SQL. Tidak ada satupun baris `channel_divisions` dengan `division='other'` di database. Ini gap yang perlu ditutup sekalian.
4. **`threshold.ts` sudah punya mekanisme "division → bucket business unit"** (`BU_DORMANT_KEY_MAP`, memetakan ke `b2b_dc|b2b_project|b2c|manufacturing`) — ini persis konsep "division masuk kategori business unit" yang dipakai untuk threshold dormant customer. Tidak perlu mekanisme baru, cukup pindahkan mapping ini dari `Record` hardcode ke kolom `dormant_bucket` di tabel master baru.
5. **`channel_divisions.branch_id` — ditambahkan (revisi 2026-07-09).** Sempat dipertimbangkan untuk di-skip karena channel name Accurate KNT sudah unik per cabang (mis. "COUNTER SBY" vs "COUNTER JKT"), jadi RBAC per-cabang bisa "cukup" jalan lewat `invoices.branch_id` + grant `user_divisions.branch_id` tanpa `channel_divisions` tahu soal branch. **Ini keputusan salah, dikoreksi user**: mengandalkan format string channel_name untuk menyiratkan cabang itu rapuh — kalau format penamaan Accurate berubah, atau ada channel yang penamaannya tidak konsisten per cabang, mapping jadi salah tanpa ada yang sadar (tidak ada validasi DB-level apa pun). `channel_divisions` HARUS punya kolom `branch_id` (FK `company_branches`, nullable = company-wide) sebagai relasi eksplisit — bukan implisit dari nama. Konsekuensi: ~20 file yang JOIN `channel_divisions` (semua repository transactions/customers/dashboard/metrics) perlu diupdate untuk ikut match `branch_id`, mengikuti pola spesifisitas yang sama seperti `company_id` yang sudah ada (`branch_id = X OR branch_id IS NULL`, tie-break "spesifik menang" via `ORDER BY branch_id IS NULL` di tempat yang butuh single-row match).
6. **`buildDormantCaseSql` (threshold.ts) adalah dead code** — grep konfirmasi tidak dipanggil di mana pun. Dihapus, bukan didesain ulang.

---

## 3. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Bentuk data division | Tabel master baru `divisions` (id, company_id, branch_id nullable, name, code, dormant_bucket, is_active) | Mirror `company_branches` — baris DB asli, bukan enum |
| Relasi ke `channel_divisions.division` / `user_divisions.division` | **Tetap varchar, TIDAK jadi FK/ID** | Supaya 24 call site RBAC scope (`utils/scope.ts`) sama sekali tidak perlu diubah — `code` di tabel `divisions` adalah string yang sama yang dipakai di kolom-kolom itu |
| `channel_divisions.branch_id` | **Ditambahkan** (FK `company_branches`, nullable = company-wide) | Relasi eksplisit ke branch, bukan implisit dari format channel_name — supaya mapping tidak rapuh terhadap perubahan penamaan Accurate. Konsekuensi: ~20 file JOIN `channel_divisions` perlu ikut match `branch_id` |
| Unique constraint `divisions` | `UNIQUE(company_id, branch_id, code)` + partial unique index `(company_id, code) WHERE branch_id IS NULL` | Postgres NULL tidak collide di UNIQUE biasa — perlu partial index supaya baris company-wide juga anti-duplikat |
| Delete behavior | **Soft delete** (`is_active=false`), beda dari `channel_divisions` yang hard-delete | Divisi adalah master data yang direferensikan RBAC (`user_divisions`) dan histori — hard delete bisa mengorbankan grant RBAC yang sudah ada tanpa disadari |
| Filter query params (division/business_unit di transactions/customers/dashboard/metrics) | Direlaksasi ke `z.string().optional()`, **tanpa** round-trip validasi ke DB | Filter yang invalid cukup hasilkan list kosong (sama seperti behavior `company_id`/`branch_id` filter sekarang) — validasi ketat cuma perlu di create/update DTO |
| Create/update DTO (channel-divisions, user.schema divisions array) | Validasi service-layer terhadap tabel `divisions` (`validateDivisionCode`) | Menggantikan `z.enum([...])` hardcode |
| Permission key baru | `settings.division:menu/view/create/update/delete` (dot-namespace) | Konsisten dengan `settings.channel.division:*` yang sudah ada |
| Seed dormant_bucket MKO | Preservasi mapping lama: distribution→b2b_dc, project→b2b_project, e_commerce→b2c, intercompany→b2b_project, freelancer→b2c, support→b2b_dc, other→b2b_dc | Match `BU_DORMANT_KEY_MAP` + ELSE fallback yang ada sekarang, supaya behavior MKO existing 100% tidak berubah |
| Seed dormant_bucket KNT | counter & u_card (×3 cabang) → `b2c` (placeholder, TBD), other → `b2c` | Konfirmasi user (2026-07-09) — adjustable nanti via CRUD, tidak blocking |
| Seed dormant_bucket SKI | other (Lainnya, company-wide) → `manufacturing` | Sesuai fokus bisnis SKI |

---

## 4. Breakdown Implementasi

### Task A — Dokumentasi
- [x] A1. Buat `docs-v2/task/task004.md` — dokumen ini

### Task B — Schema & Migration
- [x] B1. `backend/src/db/schema/schema-company.ts`: tabel baru `divisions` (id, company_id NOT NULL FK companies cascade, branch_id NULL FK company_branches cascade, name varchar(100), code varchar(50), dormant_bucket varchar(20) default 'b2b_dc', is_active boolean default true, timestamps) + `unq_division_company_branch_code` UNIQUE(company_id, branch_id, code) + partial unique index `(company_id, code) WHERE branch_id IS NULL`
- [x] B2. `bun run db:generate` → review SQL hasil generate → `bun run db:migrate`
- [x] B3. `backend/src/db/schema/schema-product.ts`: tambah `branch_id` (integer, FK `company_branches.id` cascade, nullable = company-wide) ke `channel_divisions` — migration `0010_green_chameleon.sql`, additive
- [x] B4. `backend/src/features/settings/channel-divisions.schema.ts`/`.repository.ts`/`.service.ts`: terima & validasi `branch_id` opsional di create/update (`assertValidBranchScope` — branch harus milik company yang sama, tidak boleh diisi tanpa company_id)
- [x] B5. Update 32 lokasi JOIN/lookup `channel_divisions` di 18 file supaya ikut match `branch_id` (pola sama seperti `company_id`: `branch_id = X OR branch_id IS NULL`, tie-break spesifik-menang via `ORDER BY company_id IS NULL, branch_id IS NULL` di tempat yang butuh single-row match) — `transactions.repository.ts` (3), `customers.repository.ts` (3), `customers/helper/segment.helper.ts` (7), `dashboard.repository.ts` (1), `config/threshold.ts` (1), 12 file `metrics/repository/*.ts` (16), `import/import.repository.ts`+`import.service.ts` (1, plus reorder resolve branch_id sebelum upsertCustomer). Typecheck bersih (`bunx tsc --noEmit`), `bun test` 38 pass 0 fail.

### Task C — Seed Data
- [x] C1. ~~`seedDivisions()` di `seed.ts`~~ — sempat dibuat (idempotent, MKO 7 baris + KNT 7 baris + SKI 3 baris), lalu **DIHAPUS TOTAL** di §8 (2026-07-09): katalog divisi sekarang auto-create murni dari mapping channel (`ensureDivisionCode`), bukan bootstrap hardcode
- [x] C2. Jalankan `bun run db:seed`, verifikasi via query langsung ke tabel `divisions` — 15 baris masuk (verifikasi awal, sebelum §8)

### Task D — Fitur baru: Divisions master-data CRUD
> **Klarifikasi model (2026-07-09)**: `divisions` BUKAN fitur saingan Channel Division — mirror pola Company (list utama) + Branch (nested action "Edit Branch"). Rencana UI ke depan (frontend, task terpisah): halaman "Divisions" jadi list utama (row = 1 kode divisi per company/branch), tombol Add = tambah divisi baru, row action View/Edit/**Edit Mapping** (Edit Mapping = nested kelola `channel_divisions` utk divisi itu — pengganti channel_name→division mapping yang sekarang jadi halaman utama). Permission `settings.division:*` terpisah dari `settings.channel.division:*` (persis `settings.branch:*` vs `settings.company:*`), tapi tetap 1 halaman/menu nantinya.
- [x] D1. `backend/src/features/settings/divisions.schema.ts`
- [x] D2. `backend/src/features/settings/divisions.repository.ts` (`findDivisions`, `findDivisionById`, `createDivision`, `updateDivision`, `deactivateDivision` soft-delete, `findActiveDivisionCodesForScope`, `findDormantBucket`)
- [x] D3. `backend/src/features/settings/divisions.service.ts` (CRUD + `validateDivisionCode`)
- [x] D4. `backend/src/features/settings/divisions.handler.ts`
- [x] D5. `backend/src/features/settings/divisions.route.ts` (mount `/settings/divisions`, permission `settings.division:menu/view/create/update/delete`)
- [x] D6. Daftarkan route di `router.ts`; permission `settings.division:*` di-seed (superadmin semua, admin menu/view/update — mirror pola master data lain)

### Task E — Ganti 12 lokasi enum hardcode
- [x] E1. `channel-divisions.schema.ts` / `.service.ts` — `division` jadi `z.string()`, validasi dinamis via `validateDivisionCode`; **`company_id` jadi WAJIB** (bukan nullable) di create — mengikuti alur hirarki Company→Branch→Division, "rule global" (company_id NULL) dihapus dari create/update (data existing tidak terpengaruh, semua sudah company_id terisi)
- [x] E2. `transactions.schema.ts`, `customers.schema.ts`, `dashboard.schema.ts`, `metrics.schema.ts` — `z.string().max(50).optional()`, tanpa validasi DB (filter param)
- [x] E3. `user.schema.ts` + `users.service.ts` — `divisions: z.array(z.string())`, validasi `validateCompanyAssignments()` dipanggil di awal `updateUserService`/`createUserService` (sebelum mutasi apa pun, hindari partial update kalau validasi gagal)
- [x] E4. `auth.repository.ts` (`getMyScopeTree()`) — `isFullDivisionAccess` dihitung dari query katalog `divisions` aktif per company/branch (1 query batch, bukan N+1)
- [x] E5. `threshold.ts` — hapus `BU_DORMANT_KEY_MAP` + `buildDormantCaseSql` (dead code, tidak pernah dipanggil) + `divisionToDormantKey` (juga dead code); tambah `resolveDormantBucketKey(companyId, branchId, code)` via `findDormantBucket`; `resolveDormantMonths` query diperluas ambil `i.company_id` biar tau company mana yang menang; update `customers.repository.ts` (`findCustomerDetail`) + `metrics.service.ts` (`resolveSegmentParams`)
- [x] E6. `seed.ts` (full-access loop pakai `findActiveDivisionCodesForScope` per branch) + `scripts/backfill-user-branch-division.ts` (raw SQL query ke `divisions`)
- [x] E7. `src/test/scope-isolation.e2e.test.ts` — `ALL_DIVISIONS` query ke tabel `divisions` ter-seed utk `COMPANY_ID`

Typecheck bersih di setiap langkah (`bunx tsc --noEmit`), `bun test` 38 pass 0 fail setelah semua Task E selesai.

### Task F — Verifikasi
- [x] F1. `bun test` — full suite lolos (38 pass, 0 fail, final run setelah cleanup data)
- [x] F2. Manual/curl flow (login superadmin, backend dev server lokal):
  - `GET /settings/divisions?company_id=2` → 7 baris KNT (counter×3 branch, u_card×3 branch, other company-wide) — bukan 6 kode MKO
  - `POST /settings/channel-divisions` KNT dengan `division:"distribution"` (kode MKO) → **ditolak** `400 VALIDATION_ERROR "Divisi distribution tidak valid untuk company/branch ini"` — persis bug awal yang dilaporkan user, sekarang sudah tidak bisa terjadi
  - `POST /settings/channel-divisions` KNT dengan `division:"counter"` (kode KNT asli) → **berhasil** `201 Created`
  - Data test dibersihkan setelah verifikasi (`DELETE /settings/channel-divisions/25`)
- [x] F3. Regresi MKO: `GET /customers?company_id=1` dan `GET /dashboard?company_id=1` — response identik seperti sebelum perubahan (division/business_unit ter-resolve benar: intercompany, distribution, dst)
- [x] F4. `GET /settings/divisions?company_id=3` (SKI) → 1 baris `other`/Lainnya dengan `dormant_bucket:"manufacturing"` — sesuai fokus bisnis SKI

**Cleanup tambahan ditemukan selama F2**: seed lama (sebelum fix) sempat menulis 72 baris `user_divisions` basi untuk admin@mail.com/executif@mail.com di branch KNT/SKI — kode divisi MKO lama (distribution/project/dst) yang sudah tidak valid di katalog baru. Tidak menyebabkan bug fungsional (isFullDivisionAccess cuma cek superset coverage, entri ekstra tidak mempengaruhi hasil), tapi data kotor — dibersihkan manual (query `DELETE ... WHERE NOT EXISTS (SELECT 1 FROM divisions ...)`), sisa 12 baris valid. Auto-cleanup ini tidak dimasukkan ke `seed.ts` (seed sengaja additive-only, tidak pernah menghapus) — kalau perlu direplikasi di environment lain, jalankan query yang sama.

## 6. Catatan Tambahan / Keterbatasan yang Diketahui

- ~~**Import bulk (CSV/XLSX) belum dukung kolom branch**~~ — ✅ diselesaikan di task005 §6 (2026-07-09) dengan pendekatan **auto-derive branch dari histori invoice**, bukan kolom manual (lihat task005.md untuk detail & alasan — kolom manual rawan typo/duplikat kode cabang).
- **Seed data lama bisa berisi grant `user_divisions` basi** kalau environment lain (mis. production, kalau nanti task004 di-deploy) sudah pernah menjalankan seed SEBELUM fix ini — perlu jalankan cleanup query yang sama seperti di atas setelah migrasi, bukan cuma `bun run db:seed`.

## 7. Koreksi Taksonomi MKO (2026-07-09, via API — bukan seed)

Setelah backend/frontend selesai, user menunjukkan data faktur riil MKO membuktikan `distribution` dan `project` **bukan divisi company-wide** — tiap channel konsisten cuma muncul di 1 cabang (mis. "DC WEST"=Jakarta, "DC EAST"=Surabaya, tidak pernah campur). Katalog awal (7 baris company-wide semua) tidak mencerminkan ini.

**Perbaikan dilakukan lewat API `/settings/divisions` (PATCH + POST), BUKAN edit `seed.ts`** — poin penting dari user: seed.ts itu bootstrap DB baru, bukan tempat iterasi pemahaman bisnis yang terus berubah. Begitu ada CRUD/API buat suatu data, koreksi data riil harus lewat situ, bukan hardcode ulang ke seed.

Hasil akhir katalog MKO:
```
distribution × {Jakarta, Surabaya}  (dipecah, row id=1 di-update branch_id=Jakarta, row baru id=18 utk Surabaya)
project      × {Jakarta, Surabaya}  (row id=2 di-update branch_id=Jakarta, row baru id=19 utk Surabaya)
e_commerce, intercompany, freelancer, support, other — tetap company-wide (marketplace online/
  transaksi antar-entitas/pola cabang belum jelas dari data lama, lihat catatan di bawah)
```

**Belum final** — `freelancer` (SBY UDIN) dan `support` (SALES SUPPORT vs SALES SUPPORT JKT) sengaja TIDAK dipecah karena pola cabangnya kurang jelas dari data lama (yang sudah di-reset sebelum sempat diverifikasi tuntas). **Wajib verifikasi ulang dengan query nyata begitu data faktur MKO diimpor ulang** (pola: `SELECT DISTINCT branch_id FROM invoices WHERE channel_name=X`, sama seperti yang dipakai buat konfirmasi distribution/project) sebelum menganggap struktur final.

Konsekuensi teknis dicek & aman: `divisions.code` sengaja bukan FK (varchar biasa, lihat §3), jadi 1 kode (`distribution`) boleh punya beberapa baris katalog beda `branch_id` — persis pola yang sudah dipakai KNT (`counter`, `u_card`). Test suite (`scope-isolation.e2e.test.ts`) tetap lolos karena dedup by-code, bukan by-row.

## 8. Auto-Create Katalog Divisi dari Mapping Channel — Hapus `seedDivisions()` (2026-07-09)

Setelah §7, muncul pertanyaan lanjutan dari user: kalau koreksi taksonomi dilakukan lewat API/CRUD (bukan seed), lalu **untuk apa `seedDivisions()` masih ada** — bukankah katalog `divisions` seharusnya sepenuhnya bersumber dari keputusan mapping channel (`channel_divisions`), yang sudah punya kolom `division` terisi eksplisit oleh admin di form/file import? Kalau import channel mapping dengan kode divisi baru cukup **otomatis mendaftarkan** kode itu ke katalog, tidak perlu ada mekanisme kedua ("seed dulu supaya kodenya ada" atau "bulk-import Divisions dulu") sama sekali.

**Keputusan final:**
- `divisions.service.ts` sekarang punya 2 fungsi validasi dengan filosofi berbeda untuk 2 use-case berbeda:
  - `validateDivisionCode(companyId, branchId, code)` — **STRICT, tetap menolak kode tidak dikenal.** Dipakai HANYA untuk RBAC (`user.service.ts`, assign akses user ke divisi) — tidak masuk akal auto-create divisi baru cuma karena seseorang di-assign akses ke situ.
  - `ensureDivisionCode(companyId, branchId, code)` — **auto-create kalau belum ada** (nama default = Title Case dari code, `dormant_bucket` default `'b2b_dc'`, bisa diedit belakangan lewat halaman Divisions). Dipakai di `channel-divisions.service.ts`: `createChannelDivisionService`, `updateChannelDivisionService`, `importChannelDivisionsService` — SSOT-nya adalah keputusan admin yang tertulis di form/file mapping channel_name→division itu sendiri.
- **`seedDivisions()` dan array `defaultDivisions` dihapus total dari `seed.ts`.** Katalog `divisions` sekarang murni terisi dari pemakaian nyata (create/update/import channel mapping), bukan bootstrap hardcode.
- Konsekuensi yang disadari & diterima: di DB benar-benar kosong (fresh install), `seedUserAssignments()` akan meng-grant **0 baris** `user_divisions` ke akun test admin@mail.com/executif@mail.com (loop-nya query `findActiveDivisionCodesForScope` yang sekarang kosong). Ini dianggap benar, bukan bug — sistem yang benar-benar baru memang belum punya kategorisasi bisnis apa pun untuk di-grant; begitu channel mapping pertama dibuat/diimpor, katalog terisi otomatis dan grant berikutnya (manual lewat UI atau re-run seed) akan menemukan kode yang sudah ada.
- Diverifikasi: `bunx tsc --noEmit` bersih, `bun test` 38 pass/0 fail, dan `bun run db:seed` dijalankan ulang di DB lokal (yang sudah berisi katalog divisions dari koreksi §7) — log menunjukkan tidak ada lagi baris "Seeding divisions...", langsung lanjut ke seed roles/users, dan `seedUserAssignments()` tetap berhasil grant 31 branch-division ke admin@mail.com/executif@mail.com karena katalog sudah terisi dari sesi sebelumnya.

---

**Status akhir**: ✅ Backend (Fase 1) selesai — schema, migration, CRUD divisions, validasi dinamis di 12 lokasi, RBAC scope, dormant threshold, semua terverifikasi. Taksonomi MKO dikoreksi lewat API (§7). Katalog divisi sekarang murni auto-create dari mapping channel, `seedDivisions()` dihapus (§8). Frontend (task005) selesai penuh.

---

## 5. Di Luar Scope (dicatat, tidak dikerjakan di task ini)

- Frontend: halaman Settings → Divisions (master data) baru, update halaman Channel Mapping, `AssignmentTreePicker` (RBAC picker), `DivisionChip`/`BuChip` warna dinamis — task terpisah
- Nilai `dormant_bucket` final untuk Counter & U-Card KNT — placeholder `b2c`, final value menyusul dari user
- Divisi konkret untuk SKI — baru ada fallback `other`, ditambah lewat CRUD begitu bisnisnya jelas
- Update `docs-v2/features/channel-divisions.md` mencerminkan tabel `divisions` baru

---

## 6. File Kunci

- `backend/src/db/schema/schema-company.ts` — tabel `divisions` baru
- `backend/src/db/seed.ts` — `seedDivisions()` DIHAPUS (§8), full-access loop tetap pakai `findActiveDivisionCodesForScope`
- `backend/src/features/settings/divisions.{schema,repository,service,handler,route}.ts` — fitur baru (`validateDivisionCode` strict utk RBAC + `ensureDivisionCode` auto-create utk mapping, §8)
- `backend/src/features/settings/channel-divisions.{schema,service}.ts` — swap validasi
- `backend/src/features/config/threshold.ts` — rework dormant bucket resolution
- `backend/src/features/auth/auth.repository.ts` — `getMyScopeTree()` redesign
- `backend/src/features/users/user.schema.ts`, `users.service.ts` — relaksasi + validasi RBAC assignment
- `backend/scripts/backfill-user-branch-division.ts`, `backend/src/test/scope-isolation.e2e.test.ts`
