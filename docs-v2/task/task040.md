# Task 040 (EDASHBOARD-TBD) - Bug Timeout M7 Expansion Breakdown + Usulan Cache Status Customer Terpusat

## Backfill histori checkpoint (2026-09-12, koreksi KERAS user: "masih ada bug yang kamu skip, timeout itu belum diperbaiki")

Sesi sebelumnya sengaja mencatat limitasi "periode historis (sebelum
checkpoint terkini) masih fallback ke LATERAL lama, bisa timeout lagi"
sbg "diketahui, di luar cakupan" - user menegur ini keras, benar: bug yang
SUDAH terbukti (dibuktikan sendiri saat testing - error persis sama,
`Gagal mengambil expansion breakdown`/`statement timeout`) TIDAK BOLEH
ditandai "cukup didokumentasikan" tanpa diperbaiki dulu.

**Fix**: `customer-status-scheduler.ts` sekarang backfill
`BACKFILL_PERIODS = 12` checkpoint ke belakang per periodType (konsisten
dgn konvensi "12 titik trend" M1-M10 di seluruh app), bukan cuma
checkpoint hari ini. Fungsi baru `backfillCheckpointDates` jalan
mundur dari checkpoint terkini via `getPreviousPeriodKey` yang sudah ada
(reuse, bukan tulis ulang). Tetap idempotent (`hasSnapshot` dicek per
kombinasi company+division+periodType+checkpoint) - run pertama 12x lebih
berat (backfill penuh), run harian berikutnya cuma nambah 1 checkpoint
baru per periodType saat rollover, 11 lainnya sudah ada di-skip.

**Verifikasi (2026-09-12, ke DB lokal)**: backfill selesai 214 detik
(sekali jalan, background, tidak mengganggu request user). Hasil:
1.020.495 total baris, 0 duplikat. Checkpoint per periodType: monthly=12
(penuh sesuai target), quarter=6, semester=3, annual=1 - SESUAI EKSPEKTASI,
BUKAN kurang/error: data invoice cuma ada sejak 2025-01-01, jadi 6
kuartal/3 semester/1 tahun itu memang SELURUH periode yang punya data
(dihitung manual: 2025-01-01 s/d checkpoint terkini = persis 6 kuartal
tertutup, 3 semester tertutup, 1 tahun tertutup). Tidak ada error di log.

**Skenario yang PALING PENTING - persis yang tadinya terbukti timeout
lagi**: company 2 (KNT), divisi e_commerce, periode Juli 2026 (checkpoint
Juni) - SEBELUM fix ini sempat error `Gagal mengambil expansion
breakdown`/`statement timeout`. SEKARANG: **`total_existing=11673`,
1208ms**. Bug ini benar-benar tuntas, bukan cuma didokumentasikan.

**Masih di luar cakupan** (disebut eksplisit dgn alasan konkret, BUKAN
"cukup didokumentasikan" tanpa alasan kuat): histori LEBIH DARI 12 periode
ke belakang TETAP fallback ke LATERAL lama begitu data historis bertambah
panjang (mis. tahun depan pas datanya sudah 2+ tahun, backfill 12 bulan
masih cukup tapi kuartal/semester/tahun mulai terpotong beneran). Kalau
ini jadi kebutuhan nyata, solusinya sama persis (naikkan
`BACKFILL_PERIODS`), bukan desain baru - parameter tunggal, gampang
diubah.

**Optimasi susulan (ditemukan lewat e2e test, bukan diduga)**: versi awal
`hasSnapshot` cek keberadaan 1 query PER kombinasi (company x division x
checkpoint) - dengan `BACKFILL_PERIODS=12` jadi ratusan round-trip
sequential bahkan saat idempotent no-op (semua sudah ada). Ini kepakai
lewat `beforeAll` test e2e yang timeout 5 detik. Diganti
`loadExistingCheckpointSet` - 1 query batch (`SELECT DISTINCT ... WHERE
checkpoint_date = ANY(...)`) per periodType, dicocokkan via `Set` di
memori. Efeknya bukan cuma test jadi lolos - production scheduler (jalan
tiap jam) juga ikut jauh lebih ringan pas idempotent no-op (kondisi normal
sehari-hari, cuma berat pas hari rollover).

### Test permanen (`scope-isolation.e2e.test.ts`, describe "Task040")

18/19 test lolos, KONSISTEN di 3x run berturut-turut setelah 2 perbaikan
timeout hook (beforeAll level-file 20 detik, beforeAll describe Task040 30
detik - keduanya legitimate butuh waktu lebih dari default 5 detik Bun,
BUKAN menyembunyikan bug: 6 `hashPassword` sekuensial + 7 login bersamaan
utk yang pertama, batch query+iterasi company/division utk yang kedua).
1 test gagal (`Task G5`, endpoint `customer-metrics` yang TIDAK disentuh
sesi ini) dikonfirmasi PRE-EXISTING via `git stash` 2x terpisah - gagal
identik di kode SEBELUM sesi ini.

`metric-cache.e2e.test.ts` juga dicek: fixture leftover (`products`/
`invoice_items`) dari run sebelumnya yang sempat terinterupsi dibersihkan
manual, lalu dikonfirmasi via `git stash` bahwa kegagalan bcrypt/login
timing di file itu 100% PRE-EXISTING (gagal identik di kode asli tanpa
satu pun perubahan sesi ini) - karakteristik lambat sandbox sesi yang
sudah berjalan sangat lama, bukan regresi dari `customer_status_snapshot`.

## Test isolasi RBAC (2026-09-12, ditambahkan atas permintaan eksplisit user)

User bertanya langsung: "apakah kamu sudah membuat tes case? membuktikan
isolasi data, holding, entitas all branch, branch tertentu?" - sebelumnya
CUMA diverifikasi manual pakai script sekali-pakai (sudah dihapus), belum
ada test permanen. Ditambahkan 9 test baru ke
`backend/src/test/scope-isolation.e2e.test.ts` (describe "Task040 - isolasi
RBAC pada customer_status_snapshot"), reuse fixture yang sudah ada
(`fullAccessUser`/`distributionOnlyUser`/`multiBranchAdminUser`/
`crossCompanyUser`/`narrowDivisionUser`/superadmin, task001.md Task G2-G5).

**2 bug tambahan ditemukan+diperbaiki SAAT NULIS test ini** (sebelum sempat
jadi masalah production):

1. **`isScopeEffectivelyUnrestricted` (koreksi RBAC, sudah dijelaskan di
   bawah)** - versi awal cek `!p.branchScope` mentah, salah kaprah (Map
   SELALU ada utk non-superadmin walau tidak restriktif). Sudah diperbaiki
   sebelum nulis test, lihat bagian "Batasan/fallback" bawah.
2. **`hasSnapshotForCheckpoint`** - gerbang baru, WAJIB dicek SEBELUM
   jalur cepat dipercaya. Snapshot bisa kosong genuinely (checkpoint yang
   belum pernah dihitung scheduler, mis. periode historis SEBELUM fitur
   ini di-deploy) - tanpa gerbang ini, company yang datanya banyak bisa
   diam-diam tampil `total_existing=0` (BUKAN soal RBAC lagi, soal DATA
   SALAH). Ditemukan saat coba tes checkpoint yang belum ada di snapshot -
   fallback ke LATERAL lama otomatis, TAPI utk kombinasi berat (company
   besar+divisi padat) fallback itu SENDIRI bisa timeout lagi (limitasi
   diketahui: baru checkpoint TERKINI per periodType yang di-precompute
   scheduler, histori lama belum di-backfill - di luar cakupan sesi ini).

**Temuan tambahan (bukan bug, batasan lama)**: `fetchExpansionBreakdown`
TIDAK PERNAH membaca `p.branchFilter` (parameter `branch_id` eksplisit di
URL) - beda dari `fetchCustomerMetricsTrend` (M3-M7 trend) yang
membacanya. `branch_id` di endpoint M7 drilldown ini cuma dipakai validasi
akses (`assertBranchFilterAccess`, 403 kalau bukan hak), TIDAK ikut
menyaring hasil. Dicek: ini sudah begitu SEBELUM sesi ini (CTE-nya tidak
pernah menyebut `branchFilter`), bukan regresi - dicatat di komentar test
supaya tidak disalahpahami sbg bug isolasi di kemudian hari.

**Hasil test**: 18/19 lolos (semua 9 test baru + 9 test lama lain). 1
gagal (`Task G5`, endpoint `customer-metrics`, BUKAN yang disentuh sesi
ini) dikonfirmasi PRE-EXISTING via `git stash` (gagal sama persis di kode
SEBELUM sesi ini, off-by-one di angka trend - flaky test lama, bukan
regresi baru).

> **STATUS: Bug M7 drilldown TERATASI (2026-09-11), diverifikasi ke DB
> lokal.** Tabel + compute function + scheduler SUDAH ada dan jalan
> (di-daftarkan di `index.ts`, precompute harian in-process), DAN
> `fetchExpansionBreakdown` SUDAH dipindah baca dari situ (jalur cepat),
> dgn fallback otomatis ke logika lama utk kombinasi filter yang belum
> tercakup snapshot (lihat "Batasan/fallback" bawah). Divisi yang tadinya
> timeout 20 detik (company 2/KNT, e_commerce+offline) sekarang selesai di
> bawah 1 detik. `tsc --noEmit` bersih, `metric-cache.e2e.test.ts` diverifikasi
> TIDAK ada regresi baru (dibandingkan langsung ke kode SEBELUM sesi ini via
> `git stash` - versi lama malah 1 fail LEBIH BANYAK, murni flakiness
> pre-existing tidak terkait perubahan ini). BELUM di-commit, menunggu
> instruksi eksplisit. M3-M7 trend, M8-M10, Customer Workbench (3 tempat
> lain) BELUM dipindah - lihat "Belum dikerjakan" bawah, PENTING dibaca
> sebelum deploy (ada risiko inkonsistensi cross-KPI selama masa transisi).
>
> **File yang ditambah/diubah sesi ini**:
> `backend/src/db/schema/customer_status_snapshot.ts` (+ migration 0025 &
> 0026, 0026 memperbaiki unique constraint `nullsNotDistinct` yg kelewat di
> 0025),
> `backend/src/features/metrics/repository/customer-status-snapshot.repository.ts`
> (`computeCustomerStatusSnapshot`),
> `backend/src/features/metrics/customer-status-scheduler.ts`
> (`runCustomerStatusSnapshotJob`/`startCustomerStatusScheduler`, didaftarkan
> di `backend/src/index.ts`),
> `backend/src/features/metrics/repository/m3m7.repository.ts`
> (`fetchExpansionBreakdown` - parameter baru `periodType`, CTE
> `established_not_dormant` jadi kondisional snapshot/fallback),
> `backend/src/features/metrics/metrics.service.ts` (`getExpansionBreakdown`
> - kirim `params.period_type` ke fetchExpansionBreakdown).
>
> **Lanjutan sesi berikutnya**: putuskan dulu pertanyaan terbuka di
> verifikasi menyeluruh (pola sama task039: query langsung ke DB, semua
> company x granularitas, bandingkan angka lama vs baru).

## Progres implementasi (2026-09-11)

1. **Migration** `0025_normal_triton.sql` - tabel `customer_status_snapshot`
   (`backend/src/db/schema/customer_status_snapshot.ts`), sudah diterapkan
   ke DB lokal. Kolom: `company_id, division_id(nullable), period_type,
   checkpoint_date, customer_id, status(5 nilai), is_relapsed, created_at,
   updated_at`. Unique + index lookup di (company_id, division_id,
   period_type, checkpoint_date, ...).
2. **Compute function** `computeCustomerStatusSnapshot`
   (`backend/src/features/metrics/repository/customer-status-snapshot.repository.ts`)
   - mirror CTE `fetchCustomerDormantStatusLog` (m8m10.repository.ts,
     logika dormant/reaktivasi yang sudah matang, task029 §36.28-§36.56),
     ditambah gerbang Acquisition (tidak ada di fungsi asli itu, scope-nya
     cuma existing customer).
   - **Diverifikasi ke DB lokal**: hasilnya PERSIS SAMA dgn
     `fetchCustomerDormantStatusLog` utk populasi established (company 1:
     dormant=379/active=73/reactivated=3/lapsed=529, company 2:
     dormant=16513/active=710/reactivated=69/lapsed=14355) - adaptasinya
     BENAR, bukan bug.
3. **Migration 0026** - perbaikan `unique index` jadi table-level
   `unique(...).nullsNotDistinct()` (Postgres `UNIQUE NULLS NOT DISTINCT`).
   Tanpa ini baris `division_id=NULL` ("semua divisi") bisa DUPLIKAT tiap
   scheduler run ulang, karena Postgres standar anggap NULL != NULL di
   unique constraint. Ditemukan+diperbaiki SEBELUM ada data produksi masuk.
4. **Scheduler** `customer-status-scheduler.ts` - pola SAMA PERSIS
   `analisis/scheduler.ts` (in-process, `setInterval` 1 jam + cek "ganti
   hari"), didaftarkan di `index.ts`. Idempotent: tiap kombinasi (company,
   division+null, periodType, checkpoint) dicek dulu sebelum compute -
   aman dipanggil berkali-kali, self-healing kalau server mati pas hari
   rollover. **Diverifikasi ke DB lokal**: run pertama (3 company x semua
   divisi x 4 periodType) selesai 41 detik (background, tidak terikat
   `statement_timeout` 20 detik apa pun), run kedua (idempotent check)
   503ms. 238.618 baris tersimpan, 0 duplikat.
5. **Wiring `fetchExpansionBreakdown`** (`m3m7.repository.ts`) - CTE
   `established_not_dormant` jadi 2 jalur: (a) snapshot (index lookup
   biasa, dipakai kalau `snapshotEligible`) (b) LATERAL lama APA ADANYA
   (fallback, lihat "Batasan/fallback" bawah). Parameter baru `periodType`
   (default `'monthly'`, wired dari `getExpansionBreakdown` via
   `params.period_type`).

**Hasil akhir, diverifikasi ke DB lokal**:
| Skenario | Sebelum | Sesudah |
|---|---|---|
| company 2, divisi e_commerce (id 10) | TIMEOUT 20s+ | OK, 714ms |
| company 2, divisi offline (id 8) | TIMEOUT 20s+ | OK, 266ms |
| company 1, semua divisi, bulanan | 554 (live-established lama) | 605 (checkpoint-konsisten baru, cocok PERSIS dgn precompute) |
| company 2, `only_pareto=true` (fallback path) | - | OK 698ms, TETAP pakai LATERAL lama, tidak tersentuh |
| `company_id=all` (fallback, snapshot tidak py baris agregat) | - | OK, tetap fallback benar |

`metric-cache.e2e.test.ts`: 4 fail/3 error DENGAN perubahan sesi ini, vs 5
fail/3 error TANPA perubahan (kode asli, dicek via `git stash`) - jadi
BUKAN regresi baru, pre-existing flakiness (timeout test-level krn query
`dashboard?company_id=all` lain yang lambat, tidak terkait
`fetchExpansionBreakdown`).

## Batasan/fallback jalur cepat (PENTING)

`customer_status_snapshot` BELUM py dimensi `branch_id`,
`exclude_intercompany`, `only_pareto`, ATAU RBAC scope
(`branchScope`/`divisionScope`) - di luar cakupan implementasi tahap ini.
`snapshotEligible` (`m3m7.repository.ts::fetchExpansionBreakdown`) SENGAJA
konservatif: jalur cepat HANYA aktif kalau **TIDAK SATU PUN** dari filter
itu terpasang, otomatis fallback ke LATERAL lama (lambat tapi PASTI benar,
TIDAK ada celah kebocoran data lintas company/branch/divisi RBAC).

**Koreksi PENTING (2026-09-12, ditemukan user)**: versi AWAL cek RBAC
scope cuma `!p.branchScope && !p.divisionScope` (tolak kalau Map ADA sama
sekali) - ternyata SALAH KAPRAH. `resolveBranchScope`/`resolveDivisionScope`
(`middleware/auth.ts`) SELALU isi Map utk NON-superadmin, WALAU scope itu
efektif = SEMUA cabang/divisi company mereka (tidak restriktif beneran).
Dicek langsung ke data: dari 14 user aktif ber-scope, **13 py scope = PERSIS
SEMUA cabang company-nya** (Map ada, tapi TIDAK membatasi apa-apa secara
efektif), cuma 1 akun (test e2e) yang beneran sempit. Kalau dibiarkan versi
awal, jalur cepat HAMPIR TIDAK PERNAH kepakai user asli (cuma superadmin
murni yang dapat `branchScope === undefined`) - termasuk kemungkinan user
yang MELAPORKAN bug production kemarin, tetap kena lambat/timeout walau fix
sudah ada.

**Fix**: `isScopeEffectivelyUnrestricted(p)` baru
(`customers/helper/segment.helper.ts`, di-reexport lewat
`metrics/segment.helper.ts`) - bandingkan scope ke DAFTAR LENGKAP cabang
(`company_branches`)/divisi (`divisions`) company itu, HANYA fallback kalau
BENERAN subset (kurang dari daftar lengkap). Diverifikasi ke DB lokal:
simulasi `branchScope` = semua 8 cabang KNT → jalur cepat aktif (1017ms,
angka cocok persis versi unscoped). Simulasi `branchScope` = 1 cabang
(subset asli) → tetap fallback (2387ms, angka BEDA jauh/lebih kecil sesuai
scope-nya, TIDAK ada kebocoran ke cabang lain).

Konsekuensi SISA: request dgn `branch_id`/`exclude_intercompany`/`only_pareto`
eksplisit aktif, atau dari akun yang BENERAN dibatasi RBAC-nya (subset
cabang/divisi sungguhan, saat ini cuma 1 akun test di data lokal), masih
lewat fallback lambat. Ini sisa yang wajar/kecil kemungkinannya, bukan lagi
"hampir semua user" seperti sebelum koreksi ini.

## Keputusan: definisi "established" (2026-09-11, PENTING)

Saat cross-check ke M7/M8 (SSOT hasil task039), ketemu SELISIH besar:
dormant count `fetchCustomerDormantStatusLog`-based (379/16513 di atas) vs
M7/M8 (`fetchDormantTrend`/`established_not_dormant`, 440/18760) - beda 61
(company 1) dan 2247 (company 2).

**Akar penyebab**: `fetchCustomerDormantStatusLog` pakai SATU tanggal
(`liveCalendarStart`, default = awal periode checkpoint) utk DUA hal:
gerbang established (New/Existing) DAN evaluasi dormant. M7/M8 (hasil
task039) SENGAJA pakai DUA tanggal terpisah: gerbang established tetap
LIVE (awal periode hari ini berjalan), evaluasi dormant baru pakai
checkpoint (akhir periode lalu) - persis pola bug yang task039 temukan+
perbaiki di Customer Workbench (`refDate` vs `dormantRefDate`), ternyata
ada instance KEDUA di `fetchCustomerDormantStatusLog` yang belum kena
perbaikan itu.

**Keputusan user (2026-09-11)**: snapshot `customer_status_snapshot`
pakai **1 checkpoint konsisten** utk SEMUA 5 status (established DAN
dormant sama-sama di akhir periode lalu) - BUKAN mengikuti pola
live+checkpoint campuran M7/M8 saat ini. Alasan: opsi ini yang bikin
snapshot BENAR-BENAR bisa di-precompute sekali per periode (tujuan awal
task040) - kalau established tetap live, bagian Acquisition/Active/
Reactivated/Lapsed ikut berubah tiap hari, cuma Dormant yang stabil,
mengurangi manfaat performa buat 4 status lainnya.

**Konsekuensi PENTING**: keputusan ini BUKAN cuma soal cara hitung
Dormant lagi - kalau `fetchExpansionBreakdown` (M7 drilldown) di-wire baca
dari snapshot ini, populasi "established"/"New" M7 IKUT BERGESER dari
LIVE (hari ini) jadi CHECKPOINT (akhir bulan lalu), BUKAN cuma dormant-nya
saja. Ini mengubah definisi "New" di M7, mirip persis perubahan yang
task039 sudah putuskan utk Dormant SAJA - sekarang meluas ke New/Existing
juga, KHUSUS di jalur yang dipindah ke snapshot ini. Compute function yang
sudah ditulis (`computeCustomerStatusSnapshot`) SUDAH pakai pendekatan 1
checkpoint ini (established gate = `bucket.start`, sama seperti dormant) -
tidak perlu diubah lagi, tinggal di-wire.

**Belum diputuskan**: apakah M7 (`fetchExpansionBreakdown`) dan turunannya
(M3-M7 trend, M8-M10, Customer Workbench) SEMUA ikut pindah ke definisi
checkpoint-konsisten ini sekaligus (konsisten sesama), atau M7 drilldown
dulu SENDIRIAN pakai snapshot (baca dari sana) sementara 3 tempat lain
TETAP pakai definisi live+checkpoint campuran lama - itu akan bikin M7
drilldown BEDA dari M7 trend chart-nya sendiri (mengulang PERSIS bug
awal yang melatarbelakangi task039). Kandidat paling aman: migrasi SEMUA
4 tempat SEKALIGUS ke checkpoint-konsisten, bukan satu-satu - beda dari
rencana "migrasi bertahap" awal, perlu dikonfirmasi ulang.

## Bug yang ditemukan

Toast error "Gagal mengambil expansion breakdown" muncul di production saat
user membuka tab Customer Expansion (M7) / Laporan Growth. Ditemukan lewat
laporan user (screenshot mobile, 2026-09-11).

**Root cause terverifikasi** (direproduksi langsung ke DB lokal, bukan
tebakan): `PostgresError: canceling statement due to statement timeout`.
Backend punya `statement_timeout: 20000` (`backend/src/config/db.ts:50`).
Query `fetchExpansionBreakdown` (`m3m7.repository.ts`) melewati batas itu
untuk kombinasi tertentu.

**Reproduksi**: company 2 (KNT), filter divisi `e_commerce` (id 10) atau
`offline` (id 8) → timeout di SEMUA granularitas periode (Bulanan/Kuartalan/
Semesteran/Tahunan). Divisi `other` (14) dan `ucard` (22) untuk company yang
sama justru cepat dan berhasil, karena populasi customer di 2 divisi itu
jauh lebih kecil.

**Bukan akibat task039** (checkpoint status customer, PR #200, merge
2026-09-10). Diverifikasi lewat perbandingan langsung: menjalankan
`fetchExpansionBreakdown` dengan `statusCheckpoint` kosong (persis perilaku
SEBELUM task039, `dormantAsOf` jatuh ke `filterDate` biasa) tetap timeout
sama persis untuk kombinasi yang sama. Jadi ini bug performa lama yang sudah
ada, baru ketahuan sekarang.

## Mekanisme (kenapa berat)

Satu statement SQL, CTE berurutan:

1. `established_customers` - siapa yang pernah transaksi sebelum periode ini
   (company-wide, cepat).
2. `established_not_dormant` - **bottleneck**. Untuk SETIAP established
   customer (13 ribuan+ untuk KNT), jalan LATERAL subquery tersendiri buat
   cari invoice terakhir yang cocok filter divisi, lalu bandingkan ke ambang
   dormant. Filter divisi diterapkan DI DALAM subquery per-customer, bukan
   di awal, jadi tetap iterasi semua established customer walau yang
   relevan cuma sebagian kecil.
3. `inv_current`/`inv_previous` - hitung revenue periode berjalan &
   sebelumnya, HANYA untuk customer yang lolos gerbang langkah 2. Bagian ini
   sendiri cepat (kena index `idx_invoices_company_invoice_date`), tapi
   harus menunggu langkah 2 selesai dulu karena satu statement sekuensial.

Kalau langkah 2 sendirian sudah lewat 20 detik, query tidak pernah sampai ke
langkah 3-4.

## Percobaan perbaikan yang GAGAL (jangan diulang tanpa desain ulang)

Sudah dicoba: tambah CTE `customers_in_division` (scan set-based sekali,
`SELECT DISTINCT customer_id FROM invoices WHERE ... division match`), lalu
JOIN ke `established_customers` SEBELUM masuk LATERAL, dengan tujuan
memotong kandidat LATERAL dari "semua established customer" jadi "cuma yang
pernah transaksi di divisi ini".

**Hasil setelah diverifikasi ke DB lokal**: REGRESI. Kombinasi yang tadinya
cepat (division 14, 22) justru ikut lambat/timeout setelah pre-filter
ditambahkan, kemungkinan planner Postgres berubah jadi tidak optimal begitu
CTE tambahan itu masuk campuran query yang sudah sangat kompleks (banyak
CTE, LATERAL, MATERIALIZED). Perubahan ini sudah di-revert penuh
(`git checkout`), tidak ada sisa di working tree.

**Pelajaran**: perbaikan tempel di query yang sudah sekompleks ini
berisiko tinggi regresi ke kombinasi lain. Perlu `EXPLAIN ANALYZE` yang
teliti per skenario sebelum dan sesudah, bukan cuma uji kombinasi yang
sedang bermasalah.

## Usulan arah solusi: cache status customer terpusat (BELUM diimplementasikan)

Diskusi dengan user (2026-09-11) mengarah ke akar masalah yang lebih dalam:
checkpoint status (hasil task039) itu **statis sepanjang periode berjalan**
(cuma geser saat periode baru mulai: tiap tanggal 1 bulan untuk granularitas
Bulanan, tiap awal kuartal/semester/tahun untuk granularitas lain). Tapi
status per-customer pada checkpoint itu **DIHITUNG ULANG dari nol di
tempat terpisah** oleh masing-masing KPI:

- M3-M7 (`m3m7.repository.ts::fetchCustomerMetricsTrend`)
- M8-M10 (`m8m10.repository.ts`)
- Customer Workbench (`customers.repository.ts`)
- M7 dialog drilldown (`m3m7.repository.ts::fetchExpansionBreakdown`, yang
  timeout ini)

Task039 menyatukan TANGGAL checkpoint-nya (SSOT), tapi belum menyatukan
HASIL hitungannya. Karena checkpoint statis sepanjang periode, hasil "siapa
dormant di divisi X pada checkpoint Y" seharusnya juga statis sepanjang
periode itu, jadi berpotensi dihitung sekali dan dipakai ulang oleh semua
KPI di atas, bukan dihitung ulang di setiap query.

**Kenapa cache yang ADA (`withMetricCache`) tidak membantu**: itu cache
hasil akhir per kombinasi parameter lengkap (company+division+branch+dst),
diisi HANYA setelah `compute()` berhasil (`metric-cache.helper.ts:80-82`).
Kombinasi yang selalu timeout tidak pernah sampai baris itu, jadi tidak
pernah masuk cache, cache-miss selamanya untuk kombinasi tersebut.

**Catatan penting sebelum desain**: status dormant di kode saat ini
DIVISION-SCOPED saat filter divisi aktif (dicek terhadap invoice TERAKHIR
customer DI DALAM divisi itu, bukan invoice terakhir keseluruhan) - ini
disengaja (lihat komentar `latestInvRangeCond`/`established_not_dormant` di
`m3m7.repository.ts`), bukan bug. Jadi cache/precompute yang diusulkan harus
di-key per (company, division, checkpoint), bukan cuma per (company,
checkpoint) global, kalau tidak mau mengubah perilaku yang sudah disengaja
ini.

## Refinement: precompute via scheduler, bukan on-demand (2026-09-11)

Usulan user: hitung status via cron/scheduler yang jalan di background pada
pergantian periode, bukan on-demand saat ada request. Ini langsung
menjawab kebuntuan cache biasa (lihat bagian "Kenapa cache yang ADA tidak
membantu" di atas) - job background TIDAK terikat `statement_timeout` 20
detik yang mengikat request HTTP user, jadi punya waktu sebanyak yang
dibutuhkan buat query berat itu.

**Infrastruktur scheduler SUDAH ADA, tidak perlu dibangun dari nol.**
`backend/src/features/analisis/scheduler.ts` (task016) sudah persis pola
yang dibutuhkan: in-process, `setInterval` per jam + cek `lastRunDate`
("sudah ganti hari belum"), TANPA dependency baru (bukan node-cron, karena
backend jalan sebagai proses persisten di Railway/VPS, bukan serverless).
Sudah punya pola dua-trigger (`mid_month`/`closed`) yang mirip sekali
dengan kebutuhan checkpoint di sini.

**Skala kecil**: 3 company (KNT ~4 divisi, MKO, SKI belum ada data sama
sekali) x 4 granularitas periode = puluhan kombinasi saja per rollover,
bukan ribuan. Karena checkpoint monthly/quarter/semester/annual semuanya
jatuh di tanggal 1 suatu bulan, SATU pengecekan harian "apakah hari ini
tanggal 1" sudah cukup menangkap semua granularitas sekaligus, tidak perlu
4 jadwal terpisah.

## Definisi status resmi (koreksi 2026-09-11)

Sumber kebenaran istilah status pelanggan itu Glosarium di halaman Bantuan
aplikasi (`frontend/src/i18n/locales/id/help/glossary.md`, dirujuk juga di
`en/help/glossary.md` utk versi Inggris), BUKAN penyederhanaan "New/Active/
Existing/Dormant" yang dipakai istilah internal task039/CTE (`cteEstablishedCustomers`
dst - itu istilah kode, beda axis dari status resmi di bawah).

**6 Status Dasar** (tiap pelanggan yang pernah transaksi ada di TEPAT SATU
status ini per periode, kecuali Relapsed yang penanda tambahan di atas
Dormant):

- **Acquisition** - baru pertama kali transaksi di periode berjalan.
- **Active Customer** - transaksi di periode sebelumnya DAN periode ini.
- **Reactivated** - tidak transaksi periode sebelumnya, transaksi lagi
  periode ini (bukan pelanggan baru).
- **Lapsed** - pernah transaksi, tidak transaksi periode ini, TAPI belum
  lewat ambang waktu dormant kategori bisnisnya.
- **Dormant** - pernah transaksi, sudah lewat ambang waktu dormant.
- **Relapsed** - sempat Reactivated, lalu dormant lagi periode ini
  (penanda tambahan pada subset Dormant, bukan status ke-6 berdiri
  sendiri).

**4 Angka Gabungan** (populasi penyebut tiap KPI, disusun dari kombinasi
status di atas):

| Istilah | Formula | Dipakai KPI |
| --- | --- | --- |
| Active Transacting | Acquisition + Active Customer + Reactivated | M1, M2 |
| Existing Active | Active Customer + Reactivated | M3-M6 |
| Customer Base (Addressable) | Active Customer + Reactivated + Lapsed | M7 |
| Total Customer Base | Active Customer + Reactivated + Lapsed + Dormant | M8-M10 |

**Implikasi buat desain `customer_status_snapshot`**: kolom `is_dormant
boolean` yang diusulkan di bawah TERLALU SEDERHANA dibanding 6 status
resmi ini - cuma menangkap sumbu Dormant/tidak, tidak menangkap Acquisition
vs Active Customer vs Reactivated vs Lapsed vs Relapsed. Skema perlu
direvisi supaya kolom `status` menyimpan salah satu dari 6 nilai resmi di
atas (bukan boolean), biar 1 sumber ini bisa dipakai LANGSUNG oleh semua
KPI (M1-M10) via kombinasi status yang sesuai tabel "Angka Gabungan", bukan
cuma buat gerbang dormant M7 drilldown.

## Keputusan desain (2026-09-11)

**Penyimpanan: tabel baru, BUKAN reuse `metric_cache`.** Alasan: bentuk
data yang dibutuhkan beda dari yang dilayani `metric_cache`. `metric_cache`
dirancang buat cache hasil akhir 1 endpoint (payload JSON kecil, key
`company_id + metric_key + cache_key(hash param)`, lihat
`backend/src/db/schema/metric_cache.ts`) - pas buat "hasil sudah jadi,
tinggal dikirim ke frontend". Yang dibutuhkan di sini beda bentuk: daftar
ribuan `customer_id` per kombinasi (company, divisi, checkpoint) yang harus
DI-JOIN LANGSUNG di SQL oleh 4 query repository berbeda. JSONB tidak bisa
di-JOIN natural seperti tabel biasa (perlu unnest atau ditarik ke aplikasi
dulu jadi array parameter, keduanya lebih mahal dari JOIN indeks biasa).
Tabel baru, baris per customer, bisa langsung di-JOIN persis seperti tabel
lain di CTE yang sudah ada sekarang.

Skema kasar yang diusulkan (BELUM final, perlu direview lagi sebelum
migration ditulis):

```
customer_status_snapshot
  id                serial PK
  company_id        int NOT NULL
  division_id       int NULL          -- NULL = "semua divisi" (tanpa filter)
  period_type       varchar(10) NOT NULL  -- 'monthly'|'quarter'|'semester'|'annual'
  checkpoint_date   date NOT NULL     -- hasil resolveStatusCheckpointDate
  customer_id       int NOT NULL REFERENCES customers(id)
  status            varchar(20) NOT NULL  -- salah satu 6 Status Dasar resmi
                                           -- (Acquisition/Active Customer/
                                           -- Reactivated/Lapsed/Dormant),
                                           -- Relapsed = flag terpisah (lihat bawah)
  is_relapsed       boolean NOT NULL DEFAULT false  -- penanda tambahan, cuma
                                                     -- relevan kalau status='Dormant'
  computed_at       timestamp NOT NULL DEFAULT now()
  UNIQUE (company_id, division_id, period_type, checkpoint_date, customer_id)
  INDEX (company_id, division_id, period_type, checkpoint_date)  -- utk JOIN oleh 4 KPI
  INDEX (company_id, division_id, period_type, checkpoint_date, status)  -- utk agregasi per-status (4 Angka Gabungan)
```

Dengan skema ini, 4 Angka Gabungan (Active Transacting/Existing Active/
Customer Base/Total Customer Base) tinggal `COUNT(*) WHERE status IN (...)`
sesuai tabel formula di atas - satu tabel ini berpotensi dipakai LANGSUNG
oleh M1-M10, bukan cuma M7 drilldown yang sedang timeout.

**Invalidasi/recompute saat import**: reuse hook
`invalidateMetricCache`/`deleteMetricCacheByCompany` (task038) yang sudah
dipanggil setelah commit import & mutasi lain yang berdampak - diperluas
supaya ikut hapus/tandai-stale baris `customer_status_snapshot` milik
company yang bersangkutan, lalu recompute (bukan cuma tunggu cron
berikutnya). Menjawab kasus import data historis (invoice bertanggal
mundur) yang bisa mengubah status pada checkpoint yang sudah dihitung
sebelumnya.

**Migrasi bertahap**: 4 tempat pemanggil (M3-M7, M8-M10, Customer
Workbench, M7 drilldown) dipindah SATU-SATU ke sumber baru ini, bukan
sekaligus. Urutan belum ditentukan - kandidat pertama wajar-nya M7
drilldown (`fetchExpansionBreakdown`), karena itu yang sedang timeout di
production sekarang.

> **UPDATE 2026-09-11 (akhir sesi)**: M7 drilldown SUDAH dipindah (lihat
> "Progres implementasi" atas). Catatan penting yang MUNCUL BARU dari
> implementasi nyata: M7 drilldown SEKARANG pakai definisi "established"
> checkpoint-konsisten (established+dormant sama-sama akhir periode lalu),
> SEMENTARA M3-M7 trend chart (`fetchCustomerMetricsTrend`, file YANG SAMA)
> MASIH pakai definisi lama (established live, cuma dormant checkpoint).
> Ini artinya **untuk SEKARANG, angka M7 drilldown BISA BEDA dari trend
> chart-nya sendiri** di 1 UI page (Customer Metrics M3-M7) - mengulang
> KELAS bug yang melatarbelakangi task039, walau BUKAN bug yang SAMA
> (populasinya sekarang beda krn keputusan desain, bukan bug logic). Ini
> KENAPA migrasi M3-M7 trend perlu MENYUSUL SEGERA (prioritas berikutnya,
> BUKAN opsional) - jangan deploy M7 drilldown ke production sendirian
> tanpa M3-M7 trend, supaya tidak muncul laporan bug baru "trend vs
> drilldown tidak match" versi lain.

## Belum diputuskan / perlu didesain sebelum implementasi

- Skema tabel di atas masih kasar, perlu direview (mis. apakah butuh kolom
  tambahan buat kasus "belum established sama sekali" vs "established tapi
  belum dievaluasi dormant").
- ~~Urutan pasti migrasi 4 tempat pemanggil~~ - M7 drilldown SUDAH jalan
  duluan (lihat update di atas). Sisa 3: M3-M7 trend (PRIORITAS, biar tidak
  mismatch sama M7 drilldown di 1 page yang sama), M8-M10, Customer
  Workbench.
- Snapshot BELUM py dimensi branch/pareto/exclude_intercompany/RBAC scope
  (lihat "Batasan/fallback" atas) - apakah perlu diperluas nanti, atau
  cukup dibiarkan fallback selamanya utk kombinasi itu.
- Nomor tiket Plane (EDASHBOARD-NNN).
- Belum di-commit - menunggu instruksi eksplisit user.

## Context

Ditemukan lewat laporan user (screenshot mobile, error toast di production,
2026-09-11) saat sesi lain sedang mengecek kondisi git branch
`fix/customer-status-checkpoint-and-revenue-format` (task039, sudah merge
PR #200). Root cause dan mekanisme sudah diverifikasi tuntas lewat
reproduksi langsung ke DB lokal (bukan tebakan), solusi arsitektural sudah
didiskusikan dan disepakati arahnya, tapi implementasi SENGAJA ditahan dulu
sesuai instruksi user ("Dokumentasikan") untuk didesain lebih matang sebelum
coding.
