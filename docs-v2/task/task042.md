# Task 042 (HOLDINGIT-700) - Audit Menyeluruh Arsitektur Customer Status Multi-Company

> **STATUS: audit SELESAI dijalankan (2026-09-16), hasil di bawah
> "Laporan Audit". READ-ONLY sesuai rencana - TIDAK ada kode/schema yang
> diubah sesi ini, murni analisis+verifikasi langsung ke kode dan DB.**
> Dijalankan SETELAH task040 (migrasi status, 4/4 konsumen), task041
> (precompute revenue/GP, HOLDINGIT-699), dan task044 (checkpoint
> carry-forward + M11, HOLDINGIT-697/698) semua selesai - sesuai urutan
> yang direncanakan sendiri di task041.md ("audit ini paling akhir").

## Kenapa terpisah dari task040/041

Task040.md dan task041.md sudah fokus ke SATU bug konkret (timeout M7
drilldown) dan solusi terarahnya (precompute status + metrics). Audit ini
cakupannya jauh lebih luas: validasi independen menyeluruh atas SELURUH
arsitektur status pelanggan (index, concurrency, isolasi multi-company,
skenario skala sampai 500rb customer), cocok dijalankan SETELAH arah
solusi task040/041 lebih matang, sebagai pengecekan silang - bukan
prasyarat buat mulai task040/041.

## Koreksi WAJIB sebelum audit ini dijalankan (dari review 2026-09-11)

Draf prompt asli punya 3 ketidaksesuaian dengan kondisi kode aktual, harus
diperbaiki dulu supaya hasil audit tidak menyimpang:

1. **Terminologi status**: JANGAN pakai daftar NEW/EXISTING/RETAINED/
   REACTIVATED/INACTIVE/DORMANT/NEWLY_DORMANT dari draf awal. Istilah resmi
   ada di Glosarium `frontend/src/i18n/locales/id/help/glossary.md`: 6
   Status Dasar (Acquisition, Active Customer, Reactivated, Lapsed,
   Dormant, Relapsed) + 4 Angka Gabungan (Active Transacting/Existing
   Active/Customer Base/Total Customer Base). Lihat detail lengkap di
   task040.md bagian "Definisi status resmi".
2. **Skema `customer_status_monthly`**: WAJIB sertakan kolom `division_id`
   (nullable). Status dormant di kode aktual DIVISION-SCOPED saat filter
   divisi aktif (`established_not_dormant` di `m3m7.repository.ts`,
   verified 2026-09-11) - disengaja, bukan bug. Skema tanpa `division_id`
   akan salah/tidak lengkap.
3. **`customer_monthly_metrics` (revenue/GP)**: JANGAN dianggap bagian
   dari scope status. Sudah dipisah ke task041.md sebagai usulan
   tersendiri, dengan catatan penting: hanya valid utk mode
   `apply_date_cutoff` OFF (default), TIDAK BOLEH menggantikan jalur live
   saat cutoff AKTIF (keputusan desain task039).

## Cakupan audit (kondensasi dari draf asli, 13 area)

1. Inventarisasi seluruh implementasi customer status (file, fungsi, query)
   - lihat draf asli utk daftar lengkap kata kunci pencarian, SUDAH
     dikoreksi terminologinya per poin 1 di atas.
2. Analisis query: tabel dibaca, JOIN, CTE, agregasi, index terpakai,
   potensi expensive-query - task040.md sudah punya 1 temuan konkret
   (`fetchExpansionBreakdown`), audit ini perlu cek 3 tempat pemanggil
   lain (M3-M7 trend, M8-M10, Customer Workbench) dengan kedalaman sama.
3. Request flow tracing (HTTP → route → service → repository → DB),
   identifikasi duplikasi hitung status antar endpoint.
4. Historical data assessment: bisa jawab "customer X status apa bulan Y"
   tanpa bergantung ke state customer saat ini?
5. Kelayakan monthly snapshot (schema, index, unique constraint, risiko
   duplicate) - draf schema AWAL sudah ada di task040.md, audit ini
   mengevaluasi ulang lebih ketat.
6. Estimasi skala: 10rb/50rb/100rb/500rb customer x 12/36/60/120 bulan -
   catatan: skala AKTUAL saat ini jauh lebih kecil (3 company, company
   terbesar KNT ~13-16rb established customer), jadi bagian ini murni
   future-proofing, bukan kebutuhan mendesak.
7. Perbandingan objektif: on-demand vs application cache vs Redis vs
   database snapshot vs materialized view vs snapshot+pre-agregasi -
   task040.md sudah simpulkan arah (snapshot table, bukan Redis/cache
   biasa), audit ini validasi ulang independen.
8. Recalculation requirement: `recalculate(month)` tanpa hitung ulang
   seluruh history - task040.md sudah putuskan reuse hook
   `invalidateMetricCache` (task038), audit ini cek kecukupannya.
9. Isolasi multi-company (`company_id`): cek potensi customer ID
   collision, agregasi lintas company, cache/snapshot key collision -
   BELUM dicek di task040.md, murni scope audit ini.
10. Concurrency & idempotency: `calculateCustomerStatus(2026-08)` dipanggil
    2x, aman atau duplicate? Rekomendasi pola UPSERT kalau sesuai - BELUM
    dicek di task040.md.
11. Index audit: `(company_id, period)`, `(company_id, period, status)`,
    `(company_id, customer_id, period)`, `(customer_id, period)` - mana
    yang perlu, mana redundant.
12. Rekomendasi arsitektur akhir (current vs recommended, diagram alur).
13. Rencana implementasi bertahap (kalau audit mengonfirmasi arah
    task040/041) - urutan aman, tanpa eksekusi.

## Output yang diharapkan

Sama seperti struktur draf asli user (Executive Summary sampai Final
Question YES/NO soal "monthly database snapshot sebagai source of truth,
Redis cuma optional read cache"), TAPI dengan seluruh referensi istilah
dan skema sudah disinkronkan ke koreksi poin 1-3 di atas, dan menyebut
eksplisit relasinya ke temuan task040.md/task041.md yang sudah ada
(validasi silang, bukan riset dari nol).

## Belum diputuskan (SEMUA resolved, dicoret)

- ~~Kapan dijalankan~~ - SETELAH task040/041/044 semua selesai, sesuai
  rencana.
- ~~Siapa/agent apa yang menjalankan~~ - sesi yang sama yang mengerjakan
  task040/041/044 (konteks penuh, bukan subagent terpisah - audit ini
  BANYAK bergantung pada detail yang cuma ada di working memory sesi ini,
  belum semua ditulis eksplisit di docs).
- ~~Nomor tiket Plane~~ - HOLDINGIT-700 (dikonfirmasi user 2026-09-16).

---

# Laporan Audit (2026-09-16)

## Executive Summary

Arsitektur `customer_status_snapshot` (task040/041/044, HOLDINGIT-694/
695/697/698/699) SUDAH LIVE dan established: 1 tabel, 1 fungsi compute SSOT
(`computeCustomerStatusSnapshot`), 1 scheduler, 5 konsumen (M7 drilldown,
M3-M7 trend, M8-M10, Customer Workbench, M11 Retention) SEMUA membaca
sumber yang SAMA lewat pola fast-path (baca precompute) + fallback
(compute on-demand via fungsi SSOT yang SAMA, BUKAN rumus terpisah).
1.154.134 baris snapshot ter-backfill (3 company, 4 granularitas, 13
checkpoint trailing), **292 MB** ukuran tabel+index.

Tidak ditemukan duplikasi logika status yang tersisa di luar SSOT.
Isolasi multi-company aman secara struktural (`customer_id` PK global,
setiap query WAJIB filter `company_id`). Kekhawatiran konkurensi
(DELETE+INSERT bukan UPSERT sejati) ADA tapi risikonya rendah secara
praktik (in-flight de-dup + transaksi tunggal per kombinasi) - direkomendasikan
diperbaiki, bukan darurat. **Jawaban Final Question**: YA, database
snapshot sebagai source of truth (bukan Redis/cache biasa) TERBUKTI benar
di praktik (bukan cuma teori) - dipakai 5 konsumen produksi, terverifikasi
cross-check berkali-kali, speedup ~10-12x di tempat yang tadinya timeout.

## Area 1-3: Inventarisasi, Analisis Query, Request Flow

**5 konsumen, SEMUA pola SAMA (fast path snapshot / fallback
`computeCustomerStatusSnapshot` on-demand)**:

| # | Konsumen | Route | Repository fn | Fallback method |
|---|---|---|---|---|
| 1 | M7 drilldown | `GET /metrics/expansion-breakdown` | `fetchExpansionBreakdown` (m3m7.repository.ts) | LATERAL lama (versi live PERTAMA, sebelum snapshot ada) |
| 2 | M3-M7 trend | `GET /metrics/customer-metrics` | `fetchCustomerMetricsTrend` (m3m7.repository.ts) | LATERAL lama |
| 3 | M8-M10 | `GET /metrics/dormant-customer` | `fetchDormantTrend` (m8m10.repository.ts) | CROSS JOIN+EXISTS lama |
| 4 | Customer Workbench | `GET /customers`, `GET /customers/:id` | `buildCustomerQueryContext`/`findCustomerDetail` (customers.repository.ts) | `computeCustomerStatusSnapshot` ON-DEMAND (BUKAN rumus terpisah - dibangun BELAKANGAN, langsung reuse SSOT) |
| 5 | M11 Retention | `GET /metrics/retention-rate`, `/retention-breakdown` | `fetchRetentionTrend`/`fetchTopRetainedCustomers`/`fetchRetentionBreakdown` (m11.repository.ts) | `computeCustomerStatusSnapshot` ON-DEMAND (KPI baru, TIDAK PERNAH py versi live lama) |

**Temuan penting**: konsumen #1-3 (yang lebih dulu dimigrasi) fallback ke
kode LATERAL/CROSS-JOIN LAMA yang berat (itulah akar masalah timeout
asli) - TETAP DIPERTAHANKAN sebagai fallback, bukan dihapus, karena masih
dibutuhkan utk kombinasi filter yang snapshot belum cakup (branch filter,
exclude_intercompany, RBAC restriktif, histori di luar 13 checkpoint
backfill). Konsumen #4-5 (dimigrasi/dibangun BELAKANGAN, setelah
`computeCustomerStatusSnapshot` sudah matang) fallback ke FUNGSI SSOT YANG
SAMA dipanggil on-demand - JAUH lebih murah dirawat (1 sumber logika,
bukan 2), TAPI belum tentu lebih cepat dari LATERAL lama utk kasus company
besar+scope sangat restriktif (belum diukur head-to-head - lihat "Belum
diverifikasi" di akhir laporan).

**Duplikasi**: NOL ditemukan. Dicek eksplisit (`grep` seluruh backend utk
`dormantCrossedSql`/`dormantThresholdCaseSql`, fungsi threshold dormant
SSOT) - HANYA dipakai `segment.helper.ts` (definisi), `customer-status-
snapshot.repository.ts` (compute), `m3m7.repository.ts`/`m8m10.repository.ts`
(fallback lama, KPI yang MASIH py jalur live), `metrics.service.ts`
(wiring), `config.service.ts` (comment/invalidasi saja, bukan compute).
`customers.repository.ts`/`m11.repository.ts` TIDAK muncul di daftar ini -
BENAR, keduanya SEPENUHNYA delegasi ke `computeCustomerStatusSnapshot`,
tidak py rumus dormant sendiri lagi.

## Area 4: Historical Data Assessment

**Bisa jawab "customer X status apa bulan Y" tanpa bergantung ke state
SAAT INI?** YA, untuk checkpoint yang ADA di tabel (`SELECT status FROM
customer_status_snapshot WHERE customer_id=X AND checkpoint_date=Y` -
independen dari data terkini, immutable sampai di-recompute eksplisit).
Tabel MENYIMPAN histori (bukan cuma titik terbaru) - 13 checkpoint
trailing per granularitas per company/division (`BACKFILL_PERIODS`), lebih
lama dari itu tabel TIDAK py baris, fallback KE compute LIVE (`fetchExpansionBreakdown`
dkk) atau `computeCustomerStatusSnapshot` on-demand (#4-5) - checkpoint
SANGAT lama (>36 bulan quarter) SECARA PRAKTIK jarang dipakai (data invoice
tertua company 2 baru 2024-12), tapi kapabilitasnya tetap ADA (LATERAL
lama tidak dibatasi rentang tanggal).

**Verified 2026-09-15** (task040.md): kombinasi periodType quarter/
semester/annual dgn window 12 titik SEMPAT melewati rentang data asli
(2025-01) - `hasSnapshotForAllCheckpoints` BENAR mendeteksi gap dan
fallback otomatis, TIDAK crash/salah data. Safety net bekerja sesuai
desain.

## Area 5: Kelayakan Schema Snapshot

Schema AKTUAL (`db/schema/customer_status_snapshot.ts`, setelah
HOLDINGIT-699): `id, company_id, division_id(nullable), period_type,
checkpoint_date, customer_id, status, is_relapsed, last_invoice_date,
revenue, gross_profit, transaction_count, created_at, updated_at`.

- **Unique constraint** `(company_id, division_id, period_type,
  checkpoint_date, customer_id)` DENGAN `nullsNotDistinct()` - WAJIB (tanpa
  ini, Postgres anggap tiap NULL division_id beda, snapshot company-wide
  bisa dobel tiap scheduler run). SUDAH benar sejak awal (migration 0025→
  0026 memperbaiki ini duluan).
- **Index lookup** `(company_id, division_id, period_type, checkpoint_date)`
  - dipakai SEMUA 5 konsumen utk gerbang/agregasi GROUP BY status. Cukup.
- **Risiko duplicate**: NOL secara struktural (unique constraint + scheduler
  SELALU DELETE dulu sebelum INSERT per kombinasi, lihat Area 10).
- **division_id NULLABLE** (bukan FK wajib) - benar dan disengaja (baris
  company-wide vs per-divisi, status dormant/reaktivasi DIVISION-SCOPED
  saat divisi aktif, verified task040.md).
- **Precision numeric(15,2)** utk revenue/gross_profit - SAMA PERSIS
  `invoices.total_revenue/total_gp`, bukan definisi presisi baru.

**Tidak ada perubahan skema yang direkomendasikan** - schema saat ini
sudah matang lewat 3 putaran migrasi (0025 unique constraint awal →
0026 fix nullsNotDistinct → 0027 last_invoice_date → 0028 revenue/GP/
transaction_count), masing-masing py alasan konkret yang sudah
terdokumentasi.

## Area 6: Estimasi Skala (angka AKTUAL, bukan proyeksi)

Diverifikasi langsung ke DB (2026-09-16):

| Company | Customers | Invoices | Snapshot rows (semua granularitas) |
|---|---|---|---|
| 1 (PT ABC/MKO) | 1.007 | 7.069 | 37.147 |
| 2 (PT KNT) | 34.019 | 255.937 | 1.116.987 |
| 3 (PT SKI) | 0 | 0 | 0 |

Total tabel snapshot: **1.154.134 baris, 292 MB** (termasuk index).
Company 3 GENUINELY kosong (belum ada data diimport) - dicek eksplisit,
BUKAN bug/gap pipeline (scheduler correctly menghasilkan 0 baris utk
company tanpa customer/invoice sama sekali, gerbang `EXISTS` di
`computeCustomerStatusSnapshot` bekerja sesuai desain).

**Skala hipotetis draf audit asli** (10rb/50rb/100rb/500rb customer x
12-120 bulan) TETAP murni future-proofing - skala AKTUAL (company terbesar
34rb customer, 13 checkpoint trailing) sudah 292 MB. Ekstrapolasi kasar
linear ke 500rb customer x 60 bulan (5 tahun, bukan 13 checkpoint) ≈
292 MB × (500rb/34rb) × (60/13) ≈ **~19,7 GB** - besar tapi BUKAN skala
yang butuh arsitektur berbeda (partitioning by checkpoint_date/company_id
bisa jadi pertimbangan DI SKALA ITU, TIDAK dibutuhkan sekarang).

## Area 7: Perbandingan Arsitektur (Validasi Independen)

| Opsi | Verdict |
|---|---|
| On-demand (query live tiap request) | Sudah TERBUKTI gagal - itu akar masalah asli (timeout `fetchExpansionBreakdown`, 20 detik statement_timeout terlampaui). |
| Application cache (`metric_cache`, sudah ada) | TIDAK cukup sendirian - cache hasil AKHIR per kombinasi parameter, diisi HANYA setelah compute() berhasil; kombinasi yang timeout TIDAK PERNAH sampai baris itu, cache-miss selamanya (temuan task040.md awal). |
| Redis | TIDAK dipertimbangkan serius - masalahnya BUKAN "butuh cache lebih cepat dari Postgres", tapi "query dasarnya terlalu mahal dihitung ulang tiap request". Redis tidak mengubah itu, cuma pindah tempat cache-miss-nya. |
| Materialized view | Mirip snapshot table, TAPI refresh materialized view Postgres itu ALL-OR-NOTHING per definisi (`REFRESH MATERIALIZED VIEW`, tidak granular per company/checkpoint) - snapshot table custom (delete+insert per kombinasi kecil) jauh lebih granular, cocok dgn pola invalidasi task040.md (per-company, per-checkpoint-terbaru). |
| **Database snapshot table + pre-agregasi (SUDAH diimplementasikan)** | **TERBUKTI benar di praktik**: M7 drilldown timeout→<1detik, M3-M7 solo speedup terverifikasi, M8-M10 ~10-12x (7,2 detik→579-762ms), Customer Workbench+M11 dibangun LANGSUNG di atas ini tanpa masalah performa. |

Validasi independen MENGKONFIRMASI arah task040 - bukan cuma "masuk akal
di atas kertas", tapi TERBUKTI dgn angka nyata dari 3 migrasi + 1 KPI baru
yang sudah live.

## Area 8: Recalculation Requirement

`invalidateCustomerStatusSnapshotForCompany(companyId)` /
`invalidateAllCustomerStatusSnapshot()` (customer-status-scheduler.ts) -
dipicu `invalidateMetricCache` hook (task038) dari 4 titik input GENUINE
(import invoice, mapping channel-divisi, daftar divisi, config threshold
dormant/active_window). `recomputePeriods: 1` (cuma checkpoint TERBARU per
periodType, bukan seluruh 13) - **trade-off eksplisit yang SUDAH
didiskusikan+diterima**: import data HISTORIS (mengubah checkpoint LAMA,
bukan checkpoint terkini) baru ke-refresh di rollover periode berikutnya,
BUKAN seketika. Percobaan awal (sentralisasi penuh ke SEMUA titik
`invalidateMetricCache`) TERBUKTI regresi performa nyata (diukur: ~146
detik per trigger utk 1 company) - keputusan mempersempit scope trigger
SUDAH divalidasi dgn pengukuran, bukan tebakan.

**Kecukupan**: CUKUP utk pola pemakaian saat ini (import rutin bulanan/
harian, config jarang berubah). RISIKO yang sudah diketahui+diterima:
koreksi data BERBULAN-BULAN ke belakang tidak langsung ter-refresh -
mitigasi: scheduler harian (`runIfNewDay`) + backfill manual
(`runCustomerStatusSnapshotJob({forceRecompute:true})`) sbg jaring
pengaman, SUDAH dipakai 2x sesi ini (HOLDINGIT-694 last_invoice_date,
HOLDINGIT-699 revenue/GP) tanpa masalah.

## Area 9: Isolasi Multi-Company

`customers.id` adalah `serial` PRIMARY KEY GLOBAL (bukan composite per-
company) - **customer ID collision antar company MUSTAHIL secara
struktural**, dikonfirmasi langsung baca schema (`schema-transaction.ts`).
`customer_status_snapshot.customer_id` mereferensikan PK global ini -
tidak ada 2 company yang bisa berbagi/bentrok customer_id yang sama.

**Agregasi lintas company**: SETIAP query (5 konsumen) WAJIB filter
`company_id` eksplisit di WHERE (`buildCompanyConditionRaw`, dipakai semua
repository) - dicek konsisten di seluruh file yang diaudit, TIDAK ada
query yang skip filter ini. `company_id='all'` (scope superadmin/holding)
ditangani via `companyScopeIds` (array eksplisit dari RBAC), BUKAN skip
filter company sepenuhnya.

**Cache/snapshot key collision**: unique constraint sudah SERTAKAN
`company_id` sbg bagian PERTAMA key - tidak mungkin 2 company berbagi baris
snapshot yang sama. `metric_cache` (layer cache terpisah) juga key-nya
sertakan `company_id` (termasuk sentinel utk `company_id='all'`, ADALAH
fokus insiden EDASHBOARD-591 yang SUDAH diperbaiki sebelumnya).

**Verdict**: isolasi multi-company AMAN secara struktural, TIDAK ditemukan
celah baru di audit ini (celah RBAC company-scope yang PERNAH ada semua
dari task015/018, sudah diperbaiki jauh sebelum task040 dimulai).

## Area 10: Concurrency & Idempotency

`computeAndStore(companyId, divisionId, periodType, checkpointDate)`:
compute HASIL di luar transaksi, LALU `db.transaction(tx => { DELETE
WHERE key; INSERT chunk[] })` - **bukan UPSERT sejati** (tidak pakai
`ON CONFLICT DO UPDATE`), tapi DELETE+INSERT SATU transaksi.

**Idempotency**: AMAN - memanggil `computeAndStore` 2x berturut-turut utk
kombinasi yang SAMA menghasilkan state akhir IDENTIK (bukan duplicate,
DELETE dulu selalu membersihkan baris lama).

**Concurrency (2 pemanggil BERSAMAAN utk kombinasi SAMA)**: SECARA TEORI
ada celah - Postgres row-level locking bikin transaksi kedua BLOCK sampai
transaksi pertama commit (bukan race yang menghasilkan data korup/
constraint violation), tapi HASIL AKHIR tergantung urutan commit (yang
commit TERAKHIR menang) - kalau kedua compute() membaca data invoice
sedikit berbeda (mis. import sedang berjalan di tengah), baris akhir bisa
dari snapshot invoice yang "lebih tua" kalau urutan commit terbalik dari
urutan mulai. **Risiko PRAKTIK rendah**: (a) `inFlightCompanyRecompute`/
`allCompaniesRecomputeInFlight` (Set-based de-dup) SUDAH mencegah sumber
overlap paling umum (trigger invalidasi beruntun dari 1 company), (b)
scheduler harian jalan 1x per hari per proses (`lastRunDate` guard), (c)
BELUM PERNAH terobservasi jadi masalah nyata di sesi manapun (3x backfill
paksa penuh dijalankan sesi ini, semua sukses bersih).

**Rekomendasi** (bukan darurat, perbaikan ketahanan): ganti DELETE+INSERT
jadi `INSERT ... ON CONFLICT (company_id, division_id, period_type,
checkpoint_date, customer_id) DO UPDATE SET status=EXCLUDED.status, ...`
- upsert sejati, aman thd race SEBENARNYA tanpa bergantung pada disiplin
caller (in-flight guard) semata. Perubahan machinery internal
`computeAndStore`, TIDAK mengubah kontrak/tanda tangan fungsi manapun -
resiko rendah kalau nanti dikerjakan, TAPI di luar cakupan audit
read-only ini (butuh testing regresi penuh spt migrasi lain sesi ini,
bukan sekadar analisis).

## Area 11: Index Audit

2 index AKTIF: unique `(company_id, division_id, period_type,
checkpoint_date, customer_id)` + lookup `(company_id, division_id,
period_type, checkpoint_date)`. TIDAK ada index `(customer_id)` atau
`(customer_id, period_type)` MURNI utk reverse-lookup "semua checkpoint
1 customer" - **TIDAK dibutuhkan sekarang** (SEMUA 5 konsumen query
dgn company+checkpoint di WHERE dulu, tidak ada yang query "checkpoint
manapun, customer_id ini saja"). Draf audit asli usulkan `(company_id,
customer_id, period)`/`(customer_id, period)` - REDUNDAN thd kombinasi
yang sudah ada, TIDAK direkomendasikan ditambah tanpa use case konkret
(index tambahan = biaya tulis lebih mahal tiap scheduler run, utk baca
yang tidak pernah terjadi).

**Verdict**: index SEKARANG SUDAH TEPAT SASARAN thd pola akses aktual
(company-first, checkpoint-scoped). Tidak ada rekomendasi penambahan.

## Area 12: Rekomendasi Arsitektur Akhir

**Current = Recommended** - arsitektur yang SUDAH berjalan (snapshot table
+ scheduler + fast-path/fallback per konsumen) SESUAI hasil audit ini,
TIDAK ada perubahan arsitektur besar yang direkomendasikan. Perbaikan
kecil yang layak dipertimbangkan (bukan urgent):
1. Upsert sejati (`ON CONFLICT`) ganti DELETE+INSERT - Area 10.
2. Konsumen #4-5 (Customer Workbench, M11) yang fallback ke
   `computeCustomerStatusSnapshot` on-demand BELUM diukur head-to-head
   vs LATERAL lama utk skenario RBAC sangat restriktif+company besar -
   worth diukur kalau ada laporan lambat dari user scope sempit di
   company 2, TAPI belum ada laporan seperti itu sampai sekarang.
3. Partitioning table by checkpoint_date/company_id - HANYA relevan di
   skala ~500rb+ customer (Area 6), bukan sekarang.

## Area 13: Sisa Pekerjaan (bukan lagi "rencana dari nol")

Task040/041/044 SUDAH mengimplementasikan hampir seluruh arah yang
diusulkan draf audit asli. Sisa yang TERCATAT eksplisit di task lain
(bukan temuan baru audit ini):
- Migrasi M3-M6 (revenue/GP existing customer) utk konsumsi kolom
  `revenue`/`gross_profit`/`transaction_count` baru - task041.md "Yang
  belum dikerjakan", scope besar, BELUM diprioritaskan.
- Upsert sejati (Area 10 di atas) - perbaikan ketahanan, belum urgent.

## Belum diverifikasi (di luar waktu audit ini)

- Benchmark head-to-head fallback `computeCustomerStatusSnapshot` on-demand
  (Customer Workbench/M11) vs LATERAL lama, utk scope RBAC sangat
  restriktif di company besar - belum ada kebutuhan/laporan yang memicu
  ini, murni proaktif kalau nanti relevan.
- Reproduksi NYATA race condition Area 10 (concurrency DELETE+INSERT) -
  cuma dianalisis dari kode+dokumentasi transaksi Postgres, TIDAK dicoba
  reproduksi paksa (butuh 2 proses simulasi trigger bersamaan, di luar
  cakupan audit read-only).

## Final Question

**Monthly database snapshot sebagai source of truth, cache (Redis/lainnya)
cuma optional read cache tambahan (bukan wajib)?**

**YA** - dikonfirmasi bukan cuma preferensi desain, tapi TERBUKTI dari
data operasional nyata sesi ini: 5 konsumen produksi berjalan di atasnya,
3x migrasi/penambahan kolom (HOLDINGIT-694/697/699) semua diverifikasi
lewat cross-check langsung ke DB tanpa penyimpangan, speedup terukur
10-12x di titik yang tadinya timeout, dan skala aktual (1,15 juta baris/
292 MB) masih jauh dari titik yang membutuhkan lapisan cache tambahan
apa pun.
