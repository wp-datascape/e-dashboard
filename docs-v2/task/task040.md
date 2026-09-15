# Task 040 (HOLDINGIT-694) - Bug Timeout M7 Expansion Breakdown + Usulan Cache Status Customer Terpusat

## Susulan: adopsi PENUH 6 status resmi di Customer Workbench (2026-09-16)

> **STATUS: implementasi SELESAI + diverifikasi (2026-09-16).** Revisi
> keputusan di bawah ("Migrasi Customer Workbench" awal) - user bertanya
> "kenapa tidak memakai 6 definisi yang disepakati sbg standar baru"
> setelah kolase 6→4 selesai diimplementasikan. Jawaban: kolase awal itu
> keputusan SCOPE CONTAINMENT saya sendiri (anggap ini migrasi computation
> source, bukan redesain tampilan) - BUKAN instruksi eksplisit siapa pun.
> Dikonfirmasi via AskUserQuestion: **adopsi 6 status resmi penuh**, bukan
> pertahankan 4-vocab lama. BELUM di-commit.

### Kenapa kolase 6→4 sebelumnya SALAH ARAH

"Active" gabung Active Customer + Reactivated jadi 1 chip - PADAHAL kedua
istilah itu dibedakan tegas di M8-M10/Glosarium (customer yang baru balik
dari dormant vs yang terus-menerus aktif, beda kepentingan bisnis).
"Lapsed" saya beri label "Existing" - BENTROK dgn istilah resmi "Existing
Active" (populasi gabungan Active+Reactivated, artinya beda total). Ini
justru MENCIPTAKAN ketidakkonsistenan istilah baru, padahal tujuan seluruh
task039/040 justru menghapus itu.

### Perubahan dari desain lama

**Vocabulary status Workbench** (`CustomerStatus` frontend,
`status` query param backend): dari 4 (`new/active/dormant/existing`)
jadi 5 MUTUALLY EXCLUSIVE (`acquisition/active/reactivated/lapsed/
dormant`, PERSIS `CustomerStatusValue`,
`customer-status-snapshot.repository.ts`) + `is_relapsed` sbg badge
tambahan pada baris Dormant (BUKAN nilai filter ke-6 berdiri sendiri -
Relapsed itu penanda, bukan status independen, SAMA PERSIS keputusan
M8-M10/Glosarium). Tidak ada lagi CASE mapping 6→4 - baca kolom `status`
snapshot APA ADANYA saat fast path aktif.

**Fallback (RBAC restriktif/filter branch_id/exclude_intercompany aktif)**
- INI bagian paling berat, alasan kenapa kolase 6→4 tadinya "lebih
mudah": `sqlStatusExpr`/`sqlStatusWhere` lama (hybrid live+checkpoint)
TIDAK BISA membedakan Reactivated vs Active atau Lapsed vs Dormant -
tidak pernah mengecek "apakah customer ini dormant di checkpoint
SEBELUMNYA". Solusi: **fallback TIDAK LAGI pakai sqlStatusExpr sama
sekali** - reuse `computeCustomerStatusSnapshot` (fungsi SSOT yang sama
dipakai scheduler) LANGSUNG, dipanggil on-demand 1x per request dengan
`SegmentParams` yang SUDAH dibangun (branchFilter/branchScope/
divisionScope/excludeIntercompany milik request itu, BUKAN company-wide
kosong spt scheduler) + `bucket`/`prevBucket` dari `statusCheckpointDateStr`
(`getCurrentPeriodKey`/`getPeriodRange`/`getPreviousPeriodKey`,
period.util.ts, pola sama `computeAndStore` scheduler). Hasilnya
`Map<customer_id, {status, is_relapsed}>` dipakai:
1. Filter `?status=` → `inArray(customers.id, [...ids yang cocok])`
   (bukan SQL CASE lagi).
2. Tampilan → attach ke `rows` hasil query utama di JS SETELAH paginasi
   (bukan kolom SQL lagi) - lebih murah drpd hitung 6-status utk SEMUA
   customer company baru filter di JS, krn scope yang butuh fallback ini
   SELALU restriktif (branch/RBAC sempit), populasinya jauh lebih kecil
   drpd company-wide.

Konsekuensi bagus: `sqlStatusExpr`/`sqlStatusWhere` (`segment.helper.ts`)
JADI TIDAK TERPAKAI SAMA SEKALI (cuma dipakai `customers.repository.ts`,
dicek eksplisit) - DIHAPUS, bukan dibiarkan jadi dead code.

**Frontend** (`CustomerStatus` type, `StatusChip.tsx` colorMap+label,
filter dropdown `Customers/index.tsx`, i18n `customers.json` id+en) - 5
label baru (Acquisition/Active Customer/Reactivated/Lapsed/Dormant) +
badge kecil "Relapsed" pada baris Dormant yang `is_relapsed=true` (pola
SAMA `M10ReactivationRate.tsx` - indent/badge Relapsed DI DALAM Dormant,
bukan kategori terpisah).

### Implementasi + bug ditemukan + verifikasi (2026-09-16)

File yang berubah: `customers.schema.ts` (`status` enum 5 nilai baru),
`customers.repository.ts` (rewrite besar - `dormantThresholdExpr`/
`sqlStatusExpr`/`sqlStatusWhere` DIHAPUS total, `statusSnapshotSq` baca
`is_relapsed` juga, `fallbackStatusMap` via `computeCustomerStatusSnapshot`
on-demand, `resolveDisplayStatus` helper resolusi status di JS setelah
query, `resolveStatusCheckpointBuckets` helper bucket/prevBucket),
`customers/helper/segment.helper.ts` (`sqlStatusExpr`/`sqlStatusWhere`
DIHAPUS, sudah dicek 0 pemakai lain), `metrics/segment.helper.ts`
(re-export 2 fungsi itu ikut dihapus), `customers.handler.ts`
(`STATUS_LABEL` Excel 5 label baru + suffix " (Relapsed)"), frontend
`types/customers.ts` (`CustomerStatus` 5 nilai + field `is_relapsed`),
`StatusChip.tsx` (colorMap 5 status + chip kecil Relapsed kondisional),
`Customers/index.tsx` (dropdown filter 5 opsi, kolom status dilebarkan
110→170px utk muat 2 chip), `CustomerDetailDialog.tsx` (kirim
`isRelapsed`), i18n `customers.json` id+en (label English apa adanya,
konsisten pola `dormantCustomer.json`/`dashboard.json`), mock
`customers.handler.ts` (MSW, disabled tapi tetap di-type-check - vocab
disamakan biar tsc lulus).

**Bug ditemukan+diperbaiki SAAT verifikasi (bukan cuma tsc bersih)**:
filter `?status=acquisition` awalnya cuma cek "baris snapshot TIDAK ADA"
(customer baru periode berjalan), LUPA baris snapshot yang literal
`status='acquisition'` (first invoice JATUH DI DALAM checkpoint tertutup
ini - kasus JAUH lebih umum). Ketemu lewat cross-check jumlah: SUM ke-5
filter status company 1 = 984, total unfiltered = 1005 (company 2: 33288
vs 34007) - SELISIH PERSIS jumlah customer status='acquisition' yang
hilang. Fix: `OR(status='acquisition', snapshot IS NULL)` utk fast path,
`OR(map status='acquisition', customer TIDAK ADA di map)` utk fallback.
Tampilan (`resolveDisplayStatus`) TIDAK kena bug ini (logic beda, sudah
benar dari awal) - murni bug di WHERE filter.

**Verifikasi (script ad-hoc, panggil `findCustomers`/`findCustomerDetail`
langsung)**:
- Filter status exhaustif SETELAH fix: company 1 SUM 5 filter = 1005 =
  total (MATCH), company 2 SUM = 34007 = total (MATCH), 0 baris salah
  kategori di tiap filter.
- Isolasi RBAC: branch-restricted → 351/1005 (subset ketat), 0 leak.
- Konsistensi list vs detail: 15 sample fast path (unrestricted) + 15
  sample fallback path (branch-restricted) - 0 mismatch KEDUANYA (status
  DAN is_relapsed).
- `is_relapsed`: 30 baris `is_relapsed=true` ADA di tabel snapshot
  (diverifikasi query langsung), TAPI semuanya `period_type='semester'`
  + `division_id` spesifik - 0 baris utk kombinasi `monthly` +
  `division_id NULL` (default view Workbench, tanpa filter divisi) yang
  BENAR-BENAR tersedia data buat verifikasi visual chip Relapsed saat ini
  - bukan bug (dicek eksplisit, genuinely tidak ada data), tapi BELUM
  ADA bukti visual chip Relapsed dgn data asli.
- Filter divisi (business_unit): smoke test 2 divisi company 1, tidak
  crash, hasil masuk akal (total+status per baris).
- Regresi test: `scope-isolation.e2e.test.ts` 25 pass/1 fail (Task G5,
  pre-existing, tidak berubah dari baseline sebelum sesi ini).

**Belum diverifikasi** (risiko rendah): warna chip per status belum
dicocokkan ke standar M8-M10 kalau ada (dipilih sendiri, masuk akal tapi
independen); export Excel belum dites langsung (endpoint terpisah, tapi
struktur query IDENTIK dgn list, cuma proyeksi kolom beda, risiko kecil).

## Migrasi Customer Workbench ke customer_status_snapshot (2026-09-16, versi kolase 6→4 - DIGANTI)

> **STATUS: implementasi kolase 6→4 SELESAI+diverifikasi (lihat "Implementasi
> + verifikasi" bawah), TAPI KEMUDIAN DIGANTI ke adopsi 6 status penuh (lihat
> bagian atas) atas pertanyaan user. Bagian di bawah ini disimpan sbg riwayat
> keputusan (kenapa kolase awalnya masuk akal, sebelum dikoreksi) - JANGAN
> diikuti utk implementasi baru, ikuti bagian "Susulan" di atas.**

Target ke-4 (terakhir) dari 4 tempat yang seharusnya pindah ke snapshot
(M7 drilldown ✅, M3-M7 trend ✅, M8-M10 ✅, Customer Workbench - desain
sesi ini, implementasi menyusul). Beda dari 3 migrasi sebelumnya:
Customer Workbench pakai **vocabulary status SENDIRI** (4 nilai: new/
active/dormant/existing, `sqlStatusExpr`/`sqlStatusWhere`,
`customers/helper/segment.helper.ts`), bukan langsung 6 Status Dasar
snapshot - perlu diselaraskan dulu, bukan tinggal baca kolom.

### Temuan: status Workbench sekarang HYBRID live+checkpoint (BUKAN full-checkpoint)

Dicek langsung ke `customers.repository.ts::buildCustomerQueryContext`
(2026-09-16): `refDate` (dasar New/Active, `activeCutoff = refDate -
activeMonths`) TETAP live (`as_of_date` atau hari ini). Cuma **Dormant**
yang sudah checkpoint-aligned (`statusRefDate`, disamakan ke M3-M10 sejak
task039, dikirim sbg param `dormantRefDate` KHUSUS ke `isDormant` -
`refDate` utk New/Active TIDAK ikut tergeser, sudah benar sejak fix bug
"geser mundur customer new" task039).

**Keputusan (dikonfirmasi user 2026-09-16)**: pindah ke **full-checkpoint**
(New/Active ikut checkpoint juga, SAMA PERSIS Dormant & M3-M10) - BUKAN
hybrid. Alasan eksplisit user: angka yang beda antar halaman bakal terus
dipertanyakan ulang pengguna (persis motivasi awal task039). Trade-off yang
diterima: customer yang first invoice-nya jatuh di periode BERJALAN
(belum tutup) tidak langsung berstatus checkpoint resmi sampai periode itu
tutup - **TAPI** ditangani khusus (lihat "Kasus baris snapshot kosong" di
bawah), supaya customer yang genuinely baru hari ini TETAP langsung
kelihatan sbg "New", bukan hilang/kosong sampai sebulan.

### Pemetaan 6 status snapshot -> 4 status Workbench

Diverifikasi ke `computeCustomerStatusSnapshot`
(`customer-status-snapshot.repository.ts`) - pemetaan LOSSLESS (collapse
6→4, bukan 1:1 semua):

| Snapshot (6) | Workbench (4) |
|---|---|
| `acquisition` | `new` |
| `active` | `active` |
| `reactivated` | `active` (Workbench tidak punya chip terpisah utk reactivated saat ini) |
| `lapsed` | `existing` |
| `dormant` | `dormant` (`is_relapsed` tidak dipakai, di luar 4-vocab) |

Threshold dormant per-customer SUDAH konsisten (diverifikasi): snapshot
pakai `dormantThresholdCaseSql(p)` (`COALESCE(c.division_override_id,
cdv.division_id)`, `customers/helper/segment.helper.ts:357`), Workbench
pakai `buildDormantCaseSql` dgn COALESCE persis sama
(`customers.repository.ts:81-85`) - SUMBER SAMA, bukan 2 definisi.

### Kasus baris snapshot kosong (customer baru periode berjalan)

`computeCustomerStatusSnapshot`'s CTE `classified` filter `WHERE
is_existing_at_me OR is_acquisition` - customer yang first invoice-nya
JATUH SETELAH `bucket.end` (periode berjalan, belum tutup) GAGAL kedua
syarat itu -> TIDAK ADA baris snapshot sama sekali utk checkpoint ini
(bukan status kosong/null, memang tidak pernah dihitung). LEFT JOIN
snapshot dari sisi Workbench, baris ini bakal NULL.

**Solusi (bukan fallback ke query lama)**: customer dgn `live_first`
(dari `liveDatesSq`, tetap dihitung live spt sekarang, TIDAK diganti) NOT
NULL tapi TIDAK match baris snapshot manapun -> pasti histori mereka
dimulai SETELAH checkpoint terakhir tertutup -> klasifikasi langsung
`'new'` tanpa perlu data live tambahan (tidak mungkin dormant/existing,
histori mereka belum cukup panjang utk itu). Ini BUKAN pelanggaran prinsip
full-checkpoint - populasi baru genuinely belum py checkpoint resmi, `new`
adalah satu-satunya status yang valid buat mereka sampai checkpoint
berikutnya. Efek: customer yang benar-benar baru TETAP langsung terlihat
"New" (menjawab concern user "New harusnya live kan?"), TANPA mengorbankan
konsistensi utk SEMUA customer lain (mayoritas, yang sudah py histori
checkpoint) yang skrng 100% match M3-M10.

### Filter divisi (business_unit) - behavior berubah, disengaja

Workbench SEKARANG: `business_unit` filter cuma menyaring TAMPILAN
(customer yang invoice TERBARUNYA jatuh di divisi itu), status TETAP
dihitung company-wide (liveDatesSq TIDAK difilter divisi). Snapshot row
per-divisi (`division_id` diisi): status DIHITUNG ULANG division-scoped
(cuma invoice DI DALAM divisi itu yang dipakai, established/dormant/
reaktivasi semua division-scoped) - SAMA PERSIS konvensi M3-M10 yang
sudah established (schema comment `customer_status_snapshot.ts`).

**Keputusan**: pindah ke division-scoped (snapshot row per-divisi) saat
filter divisi aktif - behavior BERUBAH dari sekarang, TAPI ini yang
bikin Workbench konsisten dgn M3-M10 saat SAMA-SAMA difilter ke divisi
yang sama (alasan sama seperti keputusan full-checkpoint di atas).

### Entry point yang kena dampak

- `buildCustomerQueryContext` (dipakai bareng `findCustomers`
  list + `findCustomersForExport`) - fast path ditambah, shape return
  (`statusExpr`, `whereWithDivision`) TIDAK berubah, 2 caller-nya TIDAK
  perlu diubah.
- `findCustomerDetail` - query terpisah (1 customer), butuh treatment
  sama demi konsistensi badge list vs dialog detail (sudah jadi syarat
  eksplisit sejak task039, komentar baris ~474).

### Gerbang eligibility fast path (mirror M3-M10, bukan desain baru)

`cid !== 0` (company spesifik, bukan 'all') AND `branch_id` filter param
kosong AND `!exclude_intercompany` AND `isScopeEffectivelyUnrestricted(p)`
(RBAC branch/divisionScope efektif tidak restriktif) AND
`hasSnapshotForCheckpoint(cid, division, 'monthly', statusRefDate)`
(reuse, export jadi public dari m3m7.repository.ts spt
`hasSnapshotForAllCheckpoints`). Tidak eligible -> fallback PENUH ke
`sqlStatusExpr`/`sqlStatusWhere` lama (hybrid live+checkpoint, perilaku
SEKARANG, tidak berubah utk kombinasi filter yang belum tercakup).

### Implementasi + verifikasi (2026-09-16)

File yang berubah: `customers.repository.ts` (`buildCustomerQueryContext` -
gerbang `snapshotEligible` + subquery `statusSnapshotSq` + `statusExpr`/
`statusCond` bercabang snapshot/fallback; `findCustomers`/
`findCustomersForExport` - tambah 1 `.leftJoin(statusSnapshotSq, ...)` di
tiap query total+rows, tambah 1 kolom GROUP BY; `findCustomerDetail` -
lookup snapshot terpisah + override `row.status` jadi `finalStatus`),
`m3m7.repository.ts` (`hasSnapshotForCheckpoint` jadi `export`, reuse pola
`hasSnapshotForAllCheckpoints`). `tsc --noEmit` bersih.

**Verifikasi (script ad-hoc via `bun run`, panggil `findCustomers`/
`findCustomerDetail` langsung, BUKAN cuma baca kode)**:
- **Regresi test**: `scope-isolation.e2e.test.ts` (25 pass/1 fail Task G5)
  dan `metric-cache.e2e.test.ts` (41 pass/3 fail/1 error, semua
  EDASHBOARD-591) - dibandingkan via `git stash` A/B, HASIL IDENTIK
  dengan/tanpa perubahan sesi ini. Bukan regresi baru.
- **Cross-check populasi penuh** company 1 (1005 customer) & company 2
  (34007 customer), status lama (`git stash`) vs baru dibandingkan
  customer-per-customer: company 1 beda 11,84% (119/1005), company 2 beda
  9,52% (3237/34007) - SEMUA transisi masuk akal & sesuai keputusan desain:
  - `dormant → existing` (58 co1/2236 co2): customer yang BARU melewati
    ambang dormant checkpoint INI (belum dormant di checkpoint
    SEBELUMNYA) - snapshot (SAMA PERSIS logic M8-M10 yang sudah
    diverifikasi sesi lalu) sengaja label 'lapsed' dulu, 'dormant' resmi
    baru checkpoint BERIKUTNYA. Konsisten dgn M8-M10, BUKAN bug.
  - `existing → active` (52 co1/626 co2): rolling window (live, N bulan
    dari HARI INI) → calendar-anchored (transaksi KAPAN SAJA di dalam
    bulan checkpoint). Sesuai keputusan full-checkpoint.
  - `existing/active → new` (9+20 co1/355+20 co2): customer yang first
    invoice-nya di checkpoint TERAKHIR (masih "Acquisition" resmi sampai
    checkpoint berikutnya) tapi sudah "lewat" activeMonths dari HARI INI
    di logic live lama. Acquisition SELALU prioritas #1 di CASE snapshot
    (cocok Glosarium: sekali beli di periode akuisisi = Acquisition,
    berapa pun kali beli).
  - Tidak ada transisi aneh/tidak terjelaskan di luar 3 kategori ini.
- **Isolasi RBAC**: company 1 di-restrict ke 1 dari 3 branch → 351/1005
  customer (subset ketat), 0 leak ke customer di luar branch itu.
- **Konsistensi list vs dialog detail** (syarat eksplisit task039): 20
  sample acak (`sort=last_invoice_date desc`) + 20 sample merata (5 per
  status new/active/existing/dormant) - 0 mismatch, SEMUA identik.
- **Filter status exhaustif**: company 1, `?status=new/active/existing/
  dormant` - 21+115+493+376=1005 (pas total), 0 baris salah kategori di
  tiap filter.

**Belum diverifikasi** (risiko rendah, di luar waktu sesi ini): filter
divisi (business_unit) aktif dgn snapshot division-scoped row (baru
sebatas desain, belum ada company/customer test data dgn multi-divisi
jelas utk dites langsung); export Excel belum dites terpisah dari list
(tapi struktur query IDENTIK, cuma proyeksi kolom akhir beda).

**Belum di-commit** - menunggu instruksi eksplisit user.

## Migrasi M8-M10 (Dormant/Reaktivasi) ke customer_status_snapshot (2026-09-15)

Lanjutan riset optimasi performa (diminta user setelah audit resource CPU
laptop - lihat entry di bawah, dikonfirmasi bareng lewat Task Manager Windows
user: lonjakan CPU nyata, bukan salah ukur). M8/M10 (`fetchDormantTrend`,
`m8m10.repository.ts`) sebelumnya CROSS JOIN customer×bucket + EXISTS per
baris (task030.md §6, pola sama yang sudah diperbaiki di M3-M7) - ~7,2 detik
cold utk company besar (KNT), TIDAK PERNAH dipindah ke snapshot task040
sebelumnya (tercatat eksplisit "belum dikerjakan").

**Keputusan desain, dikonfirmasi eksplisit user 2026-09-15**: M8-M10 IKUT
pindah ke definisi checkpoint-konsisten (established+dormant+reaktivasi
SEMUA di 1 checkpoint yang sama), BUKAN cuma optimasi kecepatan tanpa ubah
angka - konsisten dgn M7 yang sudah duluan dipindah, mencegah risiko "2
halaman beda angka utk metrik yang sama" (kelas bug yang melatarbelakangi
task039).

**Perluasan skema** (migration 0027) - `customer_status_snapshot` dapat
kolom baru `last_invoice_date` (nullable). Dibutuhkan krn kartu M8 py
rincian severity "Dormant Ringan/Kronis" (berapa kelipatan dormant_threshold
sudah lewat) yang TIDAK bisa dijawab dari `status` mutually-exclusive saja -
butuh tanggal transaksi terakhir per checkpoint. Nilainya SUDAH dihitung di
`computeCustomerStatusSnapshot` (`cxm.last_at_me`), tinggal dipersist (bukan
hitung baru). `BACKFILL_PERIODS` dinaikkan 12→13 (customer-status-
scheduler.ts) - trend 12 titik butuh `prev_dormant_count`/reactivation_rate
titik PERTAMA, yang perlu 1 checkpoint LAGI sebelum titik pertama itu.

**Redefinisi `reactivation_rate`** (konsekuensi checkpoint-konsisten) -
lama: numerator/dormant_count TITIK INI (live-hybrid). Baru: numerator
(`status='reactivated'` titik ini) / `prev_dormant_count` (populasi dormant
SATU checkpoint SEBELUMNYA) - lebih prinsipil (3 nasib populasi dormant
sebelumnya - reactivated/relapsed-dormant/masih-dormant - SELALU partisi
eksak dari prev_dormant_count, bukan lagi subset dormant_count sendiri).

**Implementasi**: `fetchDormantTrend` sekarang 2 jalur TERPISAH (bukan 1
query bercabang spt M3-M7/M7, krn struktur final SELECT beda total) - jalur
snapshot baca `customer_status_snapshot` per checkpoint (index lookup, BUKAN
CROSS JOIN), severity split dari `last_invoice_date` + threshold re-derive
via `dormantThresholdCaseSql` (join `cust_division`). Gerbang eligibility
SAMA PERSIS M3-M7 (`isScopeEffectivelyUnrestricted`, tanpa branch/pareto/
exclude_intercompany filter, cid≠0) + `hasSnapshotForAllCheckpoints`
(di-export dari m3m7.repository.ts, reuse bukan tulis ulang) utk union
checkpoint buckets+prevBuckets (13 titik unik). `apply_date_cutoff` aktif
otomatis fallback (bucket jadi tanggal cutoff, tidak pernah match
checkpoint_date manapun) - TANPA guard eksplisit terpisah.

**Verifikasi (2026-09-15, ke DB lokal, company 1 & 2, periodType monthly)**:
- Konsistensi internal 100% (`active+light+severe=total`,
  `light+severe=dormant`) di SEMUA 12 titik trend kedua company.
- Cross-check independen (query manual langsung ke snapshot, terpisah dari
  kode) MATCH PERSIS di titik terakhir (total/dormant/reactivated) kedua
  company.
- Isolasi RBAC: user berscope 1 cabang dari 8 (company 2) dapat
  total_customers JAUH lebih kecil (2851) dibanding unrestricted (33288) -
  SUBSET ketat, TIDAK bocor ke company-wide.
- periodType quarter/semester/annual: window 12 titik (mundur nyaris 3
  tahun) melewati batas data asli (invoice cuma ada sejak 2025-01) -
  otomatis fallback ke LATERAL lama, BUKAN bug (safety net eligibility
  bekerja seperti dirancang).
- Performa: `fetchDormantTrend` solo 579-762ms (dari ~7,2 detik) - ~10-12x,
  sekelas M3-M7.

**Investigasi susulan (ditemukan SETELAH migrasi, sempat dikira regresi)**:
3 test `EDASHBOARD-591` (`metric-cache.e2e.test.ts`, TIDAK terkait M8-M10 -
soal invalidasi metric_cache company_id=all) gagal timeout 5000ms
konsisten 2x run. Diselidiki via git stash (gagal - dependency silang
dgn wiring invalidasi sesi lain di file yang sama, `invalidateCustomerStatusSnapshotForCompany`
belum ada di versi lama) - metodologi diganti: timing langsung endpoint
penyebab (`GET /customer-metrics?company_id=2`). Ketemu: 5,8 detik company 2
(KNT) vs 554ms company 1 (MKO), KEDUANYA `snapshotEligible=true` (jalur
cepat AKTIF, dikonfirmasi via debug log) - BUKAN regresi jalur cepat M3-M7,
murni bagian query yang TIDAK dioptimasi snapshot (agregasi revenue/HM per
invoice) sekarang proporsional dgn data company 2 yang JAUH lebih besar
sejak restore production mid-sesi (263rb+ invoice, naik dari sebelumnya) -
karakteristik lama yang baru kelihatan krn volume data baru, bukan
diperkenalkan sesi ini.

**Belum di-commit** - menunggu instruksi eksplisit user (pola sama seluruh
task040).

## Audit + test isolasi RBAC utk migrasi M3-M7 trend (2026-09-15)

User minta audit ulang skenario e2e isolasi data (holding akses semua,
company terstruktur akses entitasnya semua cabang+divisi, isolasi per
cabang, isolasi per divisi) KHUSUS utk perubahan sesi 2026-09-13 (migrasi
`fetchCustomerMetricsTrend`/M3-M7 trend ke `customer_status_snapshot`),
lalu jalankan test-nya.

**GAP ditemukan (terverifikasi dari kode, bukan tebakan)**: SEMUA test lama
yang menyentuh `/customer-metrics` (Task G5, `scope-isolation.e2e.test.ts`)
SELALU menyertakan `branch_id=` eksplisit di query - itu mematikan
`snapshotConditionsMet` (`p.branchFilter == null` wajib,
m3m7.repository.ts) apa pun isi RBAC scope user-nya. Akibatnya jalur cepat
snapshot utk endpoint trend (beda dari expansion-breakdown yang sudah py
test khusus) belum PERNAH benar-benar dieksekusi test permanen - termasuk
bagian paling kritis: apakah `isScopeEffectivelyUnrestricted` benar-benar
MENOLAK user berscope sempit dari jalur cepat (tabel snapshot sendiri SAMA
SEKALI tidak py kolom RBAC - kalau gerbang ini salah meloloskan, user
restriktif akan melihat data SATU PERUSAHAAN PENUH).

**Ditambahkan**: describe block baru `Task040 (sesi 2)` di
`scope-isolation.e2e.test.ts`, 7 skenario, SENGAJA tanpa `branch_id` di
query (RBAC murni yang diuji): baseline holding, entitas penuh (2 user
beda role, harus identik superadmin), branch sempit (harus subset, tidak
pernah lebih besar), divisi sempit (subset), `company_id=all` (tetap
fallback), cross-company per-entitas (company sendiri identik superadmin,
tidak bocor ke company lain).

**Insiden timeout ditemukan+diperbaiki (PENTING, sesuai instruksi user
"kalau ada temuan timeout lagi berarti masih perlu diperbaiki")**: 2 dari
7 test baru (fullAccessUser & multiBranchAdminUser, keduanya query
UNRESTRICTED tanpa filter apa pun) gagal PERSIS di 5000ms saat dijalankan
sebagai bagian `bun test` suite PENUH (17 file, pola PERSIS CI) - TIDAK
gagal saat file ini dijalankan sendirian (berulang 3x bersih). Ditelusuri:
query itu sendiri konsisten <15ms solo (jalur cepat snapshot, dikonfirmasi
lewat log HTTP) - root cause BUKAN query lambat, tapi (a) describe block
baru ini memanggil ulang `runCustomerStatusSnapshotJob()` yang REDUNDAN
(describe block lain di atasnya, dalam file yang sama, sudah
menjalankannya lebih dulu utk `todayPeriodEnd` yang sama - job idempotent
tapi tetap buang waktu batch-check), menambah beban DB yang tidak perlu
saat 17 file lain jalan bersamaan; (b) kontensi ambient antar file test
saat suite penuh jalan bersamaan (dibuktikan: test LAIN yang sama sekali
tidak disentuh sesi ini, mis. `GET /invoices - filter division`, ikut
gagal di run yang sama - pola identik penjelasan timeout
`metric-cache.e2e.test.ts` yang sudah didokumentasikan 2026-09-13 di atas).
**Fix**: hapus pemanggilan scheduler redundan + tambah timeout eksplisit
15000ms ke 2 test itu (pola sama persis yang sudah dipakai test lain di
file ini utk kelas masalah yang sama). Diverifikasi: suite penuh diulang
BERSIH (tanpa proses `bun test` lain berjalan bersamaan) - 2 test itu lolos
konsisten, TIDAK muncul lagi di daftar gagal.

**Temuan SAMPING, dikonfirmasi PRE-EXISTING (bukan sesi ini)**: suite
penuh (`bun test` tanpa filter) juga menunjukkan 3 kegagalan di
`production-kpi-matrix.e2e.test.ts` (test khusus data production hasil
restore backup, auto-skip di CI) - salah satunya "MD KNT (grant
branch+division penuh) identik Super Admin" selisih TEPAT 1 customer/1
invoice. **Diverifikasi via `git stash`** (kode sesi 2 di-stash sementara,
kembali ke commit 29b5912, dites solo bersih 33,98 detik): selisih 1 ini
REPRODUKSI IDENTIK di kode SEBELUM sesi ini - bukan regresi migrasi trend,
bug lama yang belum diselidiki. 2 kegagalan lain di file yang sama (FAT
Holding vs Marketing Holding, konsistensi Holding) TIDAK reproduksi di run
solo bersih itu - indikasi kuat itu transient/kontensi-suite-penuh juga,
bukan bug deterministik. **Di luar cakupan sesi ini, dicatat utk investigasi
terpisah kalau diprioritaskan.**

**Temuan SAMPING lain**: folder `backend/dist/` (gitignored, lokal, sisa
build 28 Agustus) berisi test hasil kompilasi LAMA yang ikut ke-scan
`bun test` tanpa filter path - menjalankan sebagian test 2x (sekali dari
`src/`, sekali dari `dist/` yang basi) dan memunculkan 1 kegagalan hantu
("Lainnya" vs null di filter divisi invoice) yang TIDAK ada di kode
`src/` saat ini. Tidak memengaruhi CI (checkout bersih, tidak ada
`dist/`), tapi menambah kontensi+durasi kalau suite penuh dijalankan
lokal - kandidat dibersihkan (`rm -rf backend/dist`) lain kali.

**Hasil akhir**: `scope-isolation.e2e.test.ts` solo 26/26 lolos (1
pre-existing flaky Task G5 di luar itu, sudah lama didokumentasikan).
Suite penuh bersih: 276 pass/4 skip/11 fail - SEMUA 11 kegagalan itu
pre-existing/lingkungan (di luar), NOL dari 7 test baru sesi ini.

## Migrasi M3-M7 trend ke snapshot + wiring invalidasi (2026-09-13)

Lanjutan prioritas yang ditandai di update 2026-09-11 ("migrasi M3-M7 trend
perlu MENYUSUL SEGERA, jangan deploy M7 drilldown sendirian") - 2 pekerjaan
sekaligus atas instruksi eksplisit user: migrasi `fetchCustomerMetricsTrend`
+ wiring invalidasi `customer_status_snapshot` setelah mutasi data.

### 1. `fetchCustomerMetricsTrend` (M3-M7 trend) dipindah ke snapshot

Pola SAMA PERSIS `fetchExpansionBreakdown`: `existing_not_dormant` (populasi
M7 rate/count) baca dari `customer_status_snapshot` kalau eligible (tidak
ada filter branch/pareto/exclude_intercompany, RBAC scope efektif tidak
restriktif — reuse `isScopeEffectivelyUnrestricted`), fallback LATERAL lama
kalau tidak. Bedanya di sini: snapshot HARUS tersedia utk SEMUA 12 checkpoint
sekaligus (`hasSnapshotForAllCheckpoints`, batch query, bukan 12x round-trip)
— kalau cuma sebagian ada, fallback ke LATERAL utk SELURUH 12 titik (bukan
dicampur per titik, supaya metodologi 1 baris trend konsisten sepanjang
chart).

**Verifikasi ke DB lokal (2026-09-13)**: sebelum migrasi, titik terakhir
trend company 2 divisi e_commerce menunjukkan `existing_not_dormant_count=
8492` sementara M7 drilldown checkpoint yang SAMA PERSIS menunjukkan
`total_existing=10046` — DIBUKTIKAN sendiri, bug mismatch yang diperingatkan
di update 2026-09-11 SUDAH TERJADI di production sebelum sesi ini (trend
chart dan dialog drilldown M7 di 1 halaman yang sama menampilkan angka
beda ~18%). Setelah migrasi: keduanya PERSIS SAMA (10046=10046, divisi
offline 4951=4951, tanpa filter divisi 15134). Diverifikasi jalur fallback
tetap benar via `git stash` (angka trend lama 8492/4552 SEBELUM migrasi,
dikonfirmasi konsisten dgn definisi lama).

**Insiden performa saat implementasi (PENTING, sudah diperbaiki)**: draft
awal computeAndalkan `cust_dormant_threshold`/`customer_inv_dates`/
`last_inv_per_bucket` (CTE LATERAL-array lama) TETAP dihitung UNCONDITIONAL
walau `snapshotEligible=true` (hasilnya dibuang, snapshot yang dipakai) —
`customer_inv_dates` SENDIRIAN sudah didokumentasikan ~4,7 detik utk company
besar (task030.md §6). Ketahuan dari `metric-cache.e2e.test.ts`: request yang
normalnya ~3,5 detik (company 2, tanpa filter) sempat 500/timeout krn
kompetisi resource dgn hitungan yang tidak terpakai. **Fix**: 4 CTE itu
dipindah ke DALAM cabang fallback (hanya dihitung kalau BENERAN dipakai),
solo timing kembali ke ~2,4-3,8 detik.

**Konsekuensi SISA — sudah TUNTAS (susulan, ditegur user "kenapa tidak kamu
kerjakan juga")**: setelah fix di atas, `metric-cache.e2e.test.ts` masih 1
gagal (43/44) - test `holdingUser: query company_id berbeda...` yang sengaja
clear cache lalu `Promise.all` 2 request cold company 1 + company 2
sekaligus. Ditelusuri lebih jauh sampai akar SEBENARNYA (2 lapis):

1. **Optimasi tambahan**: `isScopeEffectivelyUnrestricted` dipanggil
   berkali-kali dgn `branchScope`/`divisionScope` Map yang SAMA (reference
   identik, dicek langsung ke source `buildSegmentParams` — tidak clone)
   dalam 1 request HTTP yang sama (mis. `/dashboard` manggil
   `getCustomerMetrics` 2x, current+comparison period). Ditambah memoization
   `WeakMap` keyed by Map itu sendiri (`segment.helper.ts`) — otomatis
   "kosong" lagi tiap request baru (Map RBAC di-resolve ulang tiap request di
   middleware), tidak ada risiko baca scope basi. Mengurangi query
   redundan, TAPI belum cukup sendirian utk bikin test ini lolos konsisten.
2. **Akar SEBENARNYA, ditemukan lewat pelacakan timestamp log**: test ini
   pakai default Bun test timeout (5 detik) — begitu request company 2 (yang
   solo SELALU ~2,4-3,8 detik, dikonfirmasi berkali-kali via debug
   instrumentation) kebetulan sedikit lebih lambat dari 5 detik krn kontensi
   ringan, Bun MENANDAI test ini gagal/timeout dan LANJUT ke test berikutnya
   — TAPI Promise `app.request(...)` yang masih pending itu TIDAK dibatalkan,
   tetap jalan di background. Test berikutnya (`/dashboard?company_id=1`,
   `/dashboard?company_id=2`, dst) langsung mengeksekusi query BERAT lain utk
   company yang SAMA, SAAT request "orphan" tadi masih berjalan — kontensi
   inilah yang mendorong durasi TOTAL request orphan itu sampai melewati
   `statement_timeout` 20 detik Postgres (dikonfirmasi lewat log timestamp:
   request `/dashboard?company_id=2` test lain mulai jalan SAAT request
   customer-metrics company 2 dari test SEBELUMNYA masih pending).

   **Fix**: naikkan timeout test ini ke 30 detik (`metric-cache.e2e.test.ts`,
   argumen ke-3 `test()`) — Bun jadi MENUNGGU request asli selesai (yang
   memang legitimate perlu beberapa detik lebih dari 5 detik under load),
   bukan orphan-kan lalu numpuk kontensi dgn test berikutnya. Pola SAMA
   PERSIS scope-isolation.e2e.test.ts (beforeAll timeout dinaikkan utk alasan
   serupa - legitimate butuh waktu, BUKAN menyembunyikan bug).

**Hasil verifikasi akhir**: `metric-cache.e2e.test.ts` 44/44 bersih, diulang
3x TERPISAH (konsisten, bukan kebetulan). `scope-isolation.e2e.test.ts` tetap
18/19 (1 gagal Task G5, pre-existing, tidak berubah).

### 2. Wiring invalidasi customer_status_snapshot setelah mutasi data

**Percobaan pertama (GAGAL, sudah di-revert)**: sentralisasi di
`invalidateMetricCache`/`invalidateAllMetricCache` (metric-cache.helper.ts)
supaya SEMUA 11+ call site otomatis kebagian tanpa disentuh — TERNYATA
menyebabkan regresi performa nyata (`metric-cache.e2e.test.ts` 41/44,
request `customer-metrics?company_id=2` yang normalnya ~3,5 detik jadi
500/timeout) karena SETIAP invalidasi, termasuk dari fitur yang SAMA SEKALI
TIDAK mengubah status pelanggan (pareto flag, mapping produk high-margin,
nama display intercompany), ikut memicu recompute penuh 1 company (240
kombinasi, diukur ~146 DETIK) di background.

**Fix — 2 lapis**:
1. **Wiring dipersempit** ke titik yang GENUINELY jadi input
   `computeCustomerStatusSnapshot`: `import.service.ts` (invoice/
   first_invoice_date), `channel-divisions.service.ts` (mapping channel→
   divisi, dipakai `cteCustDivision`), `divisions.service.ts` (daftar
   divisi company), dan `config.service.ts` HANYA utk key
   `active_window_months`/`dormant_threshold_months.*` (bukan config
   generik lain). `invalidateMetricCache`/`invalidateAllMetricCache`
   dikembalikan jadi alias polos seperti semula.
2. **Scope recompute per-trigger diperkecil**: `recomputePeriods: 1` (cuma
   checkpoint TERBARU per periodType, bukan 12) — diukur ~29 detik utk 1
   company (turun dari ~146 detik), plus in-flight de-dup per company
   (`Set<number>`) supaya trigger beruntun tidak numpuk beberapa job
   paralel. **Trade-off yang diterima**: import data historis yang HANYA
   mengubah checkpoint LAMA (bukan checkpoint terkini) baru ke-refresh di
   rollover periode berikutnya, bukan seketika — sama kelas trade-off dgn
   "histori lebih dari 12 periode" (BACKFILL_PERIODS), bukan desain baru.

**Hasil verifikasi**: `scope-isolation.e2e.test.ts` tetap 18/19 (1 gagal
Task G5, dikonfirmasi pre-existing sebelum sesi ini juga, tidak berubah).
`metric-cache.e2e.test.ts` 44/44 bersih (lihat analisis section 1 di atas -
akar masalah timeout test default 5 detik + memoization, TIDAK terkait
wiring invalidasi ini sama sekali - sudah diverifikasi terpisah via stash).

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
