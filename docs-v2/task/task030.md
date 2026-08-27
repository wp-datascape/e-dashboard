# Task030 — Audit Performa Production + Temuan Perubahan Menggantung

**Tanggal:** 2026-08-20/21
**Status:** SEBAGIAN deploy (lihat §1), SEBAGIAN diverifikasi tapi ditahan (lihat §2), 1 temuan besar BELUM diputuskan (lihat §3)

## Latar belakang

Bermula dari laporan user: `knt.executive@semanggi.id` (scope company 2, 32.000
customer — company terbesar) selalu dapat 500 saat buka halaman Customer,
sementara `mko.executive@semanggi.id` (scope company 1, 995 customer) normal.
Audit ini meluas jadi audit performa menyeluruh, lalu menyingkap masalah
deploy-hygiene yang lebih besar (§3).

## §1. SUDAH di-deploy ke production (PR #132, #133 — merged & live)

**PR #132 — fix timeout + memory leak:**
- Index baru: `customers(company_id)`, `invoice_items(invoice_id,
  product_category_id)`, `pareto_period_snapshots(company_id, period_type,
  period_key, checkpoint)` — migration `0021`/`0022`.
- Tuning Postgres (docker-compose `command:`): `shared_buffers=1536MB`,
  `work_mem=32MB`, `maintenance_work_mem=256MB`, `effective_cache_size=3GB`
  (prod), skala lebih kecil untuk dev.
- Fix memory leak scheduler Pareto (`scheduler.ts`) — insert
  `pareto_period_snapshots`/`notifications` company besar (32.000 customer x
  7 kolom = 224.000 parameter) melebihi limit keras Postgres (65.535/
  statement), gagal-retry terus tiap scheduler jalan, tiap retry log error
  raksasa — pemicu utama backend production nempel 3,8GB RAM (49%) setelah
  14 hari jalan. Fix: chunking batch insert (`scheduler.ts`,
  `notifications.repository.ts`).
- Pool koneksi dev disamakan production (`db.ts`, 5 → 20).

**Hasil terverifikasi langsung ke production:**
| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| List Customer (company 32rb) | 500 (timeout 20s) | 200 OK, 3,4 detik |
| RAM backend | 3,8GB (leak) | ~400-700MB |

**PR #133 — matikan Postgres JIT:**
- `jit=off` (docker-compose, semua environment) — dibuktikan via
  `auto_explain`: query metrics kompleks (`fetchCustomerMetricsTrend`, M3-M7)
  buang ~37% waktu (3,2 dari 8,6 detik) HANYA untuk kompilasi JIT, padahal
  query analitik begini jarang identik berulang (parameter tanggal beda
  tiap request) — biaya compile tidak pernah balik modal. Workload aplikasi
  ini didominasi query analitik kompleks, bukan OLTP sederhana frekuensi
  tinggi, jadi `jit=off` masuk akal untuk SELURUH database.

**Hasil terverifikasi:**
| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| Dashboard Overview (production) | ~6 detik | ~4,2 detik |
| `fetchCustomerMetricsTrend` (lokal, data production) | 8,6 detik | 3,3 detik |

## §2. Diverifikasi BENAR tapi BELUM di-deploy (ditahan, lihat §3)

Dikerjakan sesudah PR #132/#133 merge, di branch `feat/task029-dashboard-ia-
main-base` (working tree lokal) — **tidak bisa langsung di-deploy** karena
entanglement dengan §3.

**a) Sentralisasi kondisi scope invoice** (`resolveInvoiceScopeConditions`,
baru di `customers/helper/segment.helper.ts`) — membungkus 4 pemanggilan
`buildBranchConditionRaw`/`buildDivisionConditionRaw`/
`buildCompanyConditionRaw`/`buildExcludeIntercompanyRaw` yang sebelumnya
ditulis ulang identik ~30x di 13 file repository metrics. REFACTOR MURNI
(bukan restrukturisasi) — parameter & hasil 100% sama dengan kode yang
digantikan, cuma dibungkus 1 pemanggilan. File yang berubah:
`dashboard.repository.ts`, `avg-category`, `category-performance`,
`category-products`, `customer-products`, `high-margin-penetration`,
`hm-customers`, `m3m7`, `m4`, `m5`, `m6`, `m8m10`,
`product-performance.repository.ts`.

**b) Restrukturisasi CTE M3-M7** (`m3m7.repository.ts`,
`fetchCustomerMetricsTrend`) — gabung CTE `repeat_orders` ke dalam
`active_inv_agg` (tambah kolom `invoice_count`) dan CTE `hm` ke dalam
`hm_inv_agg` (reuse existence check) — mengurangi rantai Merge Join dari 5
jadi 3 CTE customer×bulan. **Diverifikasi 0 perbedaan** di 3 scope (company
1, company 2, superadmin) × 12 bulan × 21 kolom output, dibandingkan
byte-per-byte terhadap baseline kode lama. **Catatan jujur: dampak
performa TIDAK signifikan** (tetap ~3,3 detik) — bottleneck sesungguhnya ada
di CTE `existing` (lihat §2c), bukan di 2 CTE yang digabung ini. Perubahan
ini tetap disimpan karena terbukti benar dan kodenya lebih bersih, bukan
karena mempercepat.

**c) CTE `existing` — sebagian sudah dibereskan (Langkah 1), sebagian masih
bottleneck (Langkah 2, lihat §5):**

CTE `existing` (`m3m7.repository.ts`) dan pola serupa di `m8m10.repository.ts`
(`scoped_cust`/`cxm`) mengecek 2 syarat per kombinasi customer×bulan:
1. **"Tidak baru lagi"** (first_invoice_date < cutoff bulan itu).
2. **"Punya transaksi (sesuai filter Divisi/Cabang/Exclude-Intercompany
   yang aktif) sampai bulan itu"** — via `EXISTS` per baris.

**Langkah 1 (SELESAI, 2026-08-21):** syarat #1 dulu dihitung ulang tiap
request lewat CTE `first_inv` (`SELECT customer_id, MIN(invoice_date) ...
GROUP BY customer_id`, scan 246rb+ invoice) — padahal jawabannya sudah ada
di kolom `customers.first_invoice_date` (dipelihara otomatis tiap import
lewat `upsertCustomer`, diverifikasi 2026-08-21: **0 baris beda** dari
`MIN(invoice_date)` langsung, scope-nya sama — global per customer, bukan
per divisi/cabang, jadi aman dipakai langsung). CTE `first_inv` dihapus
total dari `m3m7.repository.ts` dan `m8m10.repository.ts`, diganti baca
`c.first_invoice_date`/`sc.first_date` (dari `customers` yang memang sudah
di-JOIN). **Diverifikasi 0 perbedaan** di M3-M7, M8 (Dormant Trend), M9
(Dormant Value Ranking), M10 (Reactivated Customers) × 3 scope. Dampak
performa kecil tapi nyata: `fetchCustomerMetricsTrend` 3,3s → 3,1s (~6%).

**Langkah 2 (BELUM dikerjakan, lihat §5 untuk opsi):** syarat #2 masih
`CROSS JOIN` 32.000 customer × 12 bulan (~275.000 kombinasi sebelum
filter) + `EXISTS` per baris — ini bottleneck utama yang tersisa. BEDA dari
syarat #1: syarat #2 TIDAK BISA disederhanakan jadi tabel statis karena
scope-dependent (ikut filter Divisi/Cabang/Exclude-Intercompany yang
dipilih user per-request) — kalau dipaksa jadi tabel statis/di-cache,
laporan yang difilter akan salah hitung.

## §3. TEMUAN BESAR — perubahan lama menggantung, belum pernah di-deploy

Saat menyiapkan deploy §2, ditemukan: 13 file repository metrics yang
disentuh SUDAH membawa perubahan-perubahan LAIN yang jauh lebih tua dari
task030 ini, dan **tidak pernah ter-push/merge ke `main`** — bercampur di
working tree yang sama dengan refactor §2. Kalau tidak dicek satu-satu,
hampir ke-deploy tanpa sengaja.

**Yang ditemukan menggantung** (diverifikasi via `git diff origin/main`):

1. **task028 (2026-08-18) — redefinisi "Existing" customer.** Definisi lama:
   Existing = pernah transaksi, EXCLUDE yang sudah dormant. Definisi baru
   (di kode lokal, belum deploy): Existing = SEMUA customer kecuali New,
   **TERMASUK yang sudah dormant**. Ini universe KPI M3-M10
   (`cteEstablishedCustomers`, `segment.helper.ts`) — kalau di-deploy, akan
   mengubah ANGKA yang tampil di M3 (Revenue), M4 (GP), M5 (High Margin),
   M6 (Repeat Order), M7 (Expansion) untuk SEMUA company, bukan cuma
   performa.
2. **task026 §8e (2026-08-09)** — parameter `dateFrom` baru di
   `fetchGpBreakdown` (m4.repository.ts), memisahkan "siapa yang qualify
   sbg existing" (activeMonths, tetap) dari "rentang tanggal invoice yang
   di-SUM" (ikut filter periode).
3. **Perbaikan 2026-08-10** — `m8m10.repository.ts` (`first_inv`/
   `new_cust`) — perbaikan selisih "Aktif di DormantRate (357) vs Total
   Existing di Expansion/GP (329)" dari laporan user waktu itu.
4. **`metrics/segment.helper.ts`** — daftar export DIROMBAK TOTAL: fungsi
   lama (`getCustomerSegments`, `getActiveCount`, `getExistingCount`,
   `cteNewCustomers`, `cteActiveCustomers`, `cteExistingCustomers`,
   `cteDormantCustomers`, alias backward-compat) dihapus, diganti fungsi
   baru dari task028/task029/task030.

**Root cause diduga:** beberapa sesi kerja sebelumnya (task026, task028)
menyelesaikan perubahan kode tapi tidak pernah lanjut ke tahap PR/merge ke
`main` — kode-nya tetap ada di disk (working tree lokal), tapi git history
`main` tidak pernah mencatatnya. Production masih jalan kode versi LAMA
(pre-task026/028) untuk file-file ini.

**Keputusan user (2026-08-21):** JANGAN deploy dulu apa pun dari §2/§3.
Cukup didokumentasikan di sini dulu — keputusan lanjutan (deploy semua
sekaligus vs rekonstruksi manual per-file vs revert task028) BELUM diambil.

**Yang perlu diputuskan sebelum §2 bisa di-deploy dengan aman:**
- Apakah task028 (Existing termasuk dormant) MEMANG mau dipakai sekarang?
  Kalau ya → deploy sekaligus dengan §2, TAPI beri tahu user dulu angka M3-
  M10 akan berubah untuk semua company (belum dihitung dampak persisnya).
  Kalau belum → §2 (refactor+restrukturisasi performa) perlu dipisah
  manual dari task028/task026 sebelum bisa di-deploy sendirian — pekerjaan
  tersendiri, cukup teliti karena entangled di file yang sama.
- Cek juga apakah ada perubahan LAIN yang serupa (menggantung, belum
  di-deploy) di file-file lain di luar 13 file yang disentuh task030 ini —
  belum diaudit menyeluruh, cuma yang kebetulan ketemu di jalur kerja ini.

## §4. Fix N+1 Import — BERSIH, siap deploy kapan pun (sudah dicek terpisah)

Dari audit N+1 (2026-08-21). Sudah dicek via `git diff origin/main` khusus
file-file ini — **TIDAK ikut ter-tangle dengan §3** (isinya murni
perubahan hari ini, tidak ada task026/028 nebeng di file yang sama):
- `classifier.ts` (+ `scripts/reclassify-product-categories.ts` yang ikut
  disesuaikan) — rule klasifikasi dimuat sekali per batch import (dulu
  query ulang tiap baris, bisa puluhan ribu query redundan per file
  import).
- `import.service.ts` — cache kategori/produk per batch (aman, item_type
  tetap di-sync kalau klasifikasinya berubah — bukan cache buta), dan
  `updateInvoiceTotals` dipanggil sekali per invoice di akhir batch (dulu
  per baris item, redundan untuk invoice multi-item — SUM tetap dihitung
  dari data yang benar-benar ke-insert, tidak kehilangan akurasi).

**File-file ini bisa di-deploy TERPISAH dari §2/§3 kapan pun user siap**,
tidak perlu menunggu keputusan task028.

## §5. SARAN untuk Langkah 2 (belum dikerjakan) — hitung on-the-fly, BUKAN tabel statis

Dicatat 2026-08-21 sebagai rencana kalau nanti mau dilanjutkan. **Belum
diimplementasikan sama sekali** — ini analisis/opsi, bukan kode.

**Kenapa tabel statis (opsi awal yang dipertimbangkan) TIDAK bisa dipakai:**
syarat #2 (§2c) — "customer punya transaksi sampai bulan X" — HARUS ikut
filter Divisi/Cabang/Exclude-Intercompany yang sedang aktif di laporan.
Kalau disimpan sbg 1 nilai statis per customer (tanpa filter), laporan yang
difilter ke divisi/cabang tertentu akan salah — customer yang transaksinya
cuma di divisi LAIN (di luar filter) akan ikut kehitung padahal seharusnya
tidak. Nyimpen per kombinasi (customer × divisi × cabang × exclude-
intercompany) tidak praktis — kombinasinya bisa ribuan, dan perlu di-refresh
tiap import juga.

**Opsi yang aman — hitung SEKALI per request (bukan per kombinasi
customer×bulan), dari data yang SUDAH di-scope filter aktif:**

Insight yang sama dgn Langkah 1 (status "existing" cuma naik sekali, tidak
pernah turun dalam 1 window 12 bulan) — tapi diterapkan LIVE di query yang
sama, bukan disimpan:

```sql
-- CTE baru, TERPISAH dari raw_inv (yang sudah dibatasi 11-12 bulan ke
-- belakang) — WAJIB unbounded ke belakang (cuma dibatasi upper bound =
-- akhir bulan terakhir yang ditampilkan), supaya customer dgn transaksi
-- valid dari 2+ tahun lalu tetap kehitung "existing" di SEMUA 12 titik,
-- bukan cuma dari titik dia "pertama muncul" di jendela 11-12 bulan.
scoped_first_qualifying AS (
  SELECT i.customer_id, MIN(i.invoice_date) AS first_qualifying_date
  FROM invoices i
  LEFT JOIN channel_divisions cd ON ... -- filter SAMA PERSIS dgn EXISTS
  WHERE i.deleted_at IS NULL
    AND [company/division/branch/exclude-intercompany scope — SAMA PERSIS
         dgn kondisi di dalam EXISTS existing CTE sekarang]
    AND i.invoice_date <= [akhir bulan TERAKHIR yang ditampilkan]
  GROUP BY i.customer_id
)
```

Lalu di `existing`, ganti `EXISTS (...)` per kombinasi customer×bulan
dengan perbandingan sederhana: `m.ms + INTERVAL '1 month' - INTERVAL '1
day' >= sfq.first_qualifying_date` (JOIN ke `scoped_first_qualifying`,
bukan CROSS JOIN+EXISTS lagi).

**Kenapa ini TIDAK mengubah akurasi:** filter scope-nya PERSIS sama dengan
yang dipakai `EXISTS` sekarang, dihitung ulang tiap request sesuai filter
AKTIF saat itu (bukan disimpan/di-cache dari request lain) — murni ganti
CARA HITUNG (1x agregat ~32rb baris vs re-check 275rb kombinasi), bukan
logikanya. Sama kategori dgn restrukturisasi CTE §2b — **restrukturisasi**,
bukan refactor murni, jadi WAJIB diverifikasi ketat (byte-per-byte, semua
scope) sebelum dipercaya, sama seperti yang sudah dilakukan utk Langkah 1
dan §2b.

**Risiko yang perlu dijaga kalau dikerjakan:** filter scope di CTE baru ini
HARUS disalin PERSIS dari `EXISTS` yang digantikan (company/division/
branch/exclude-intercompany) — kalau ada 1 kondisi kelewat/beda, populasi
"existing" per bulan bisa diam-diam salah utk laporan yang difilter,
padahal utk laporan tanpa filter (company_id=all, tanpa divisi/cabang)
kemungkinan besar tetap kelihatan benar (makanya perlu tes SPESIFIK dgn
filter divisi/cabang aktif, bukan cuma company_id=all/company tunggal
seperti yang sudah dicoba di Langkah 1/§2b).

**Estimasi dampak:** belum diukur (belum diimplementasi) — CTE `existing`
adalah kandidat kontributor terbesar sisa waktu `fetchCustomerMetricsTrend`
(~3,1 detik sesudah Langkah 1), tapi besaran pastinya baru bisa dipastikan
setelah profiling ulang pasca-implementasi.

## §6. Bug performa nyata ditemukan+diperbaiki (2026-08-27) — bukan §5 di atas

User tanya langsung: *"Kenapa untuk load grafik cart membutuhkan waktu
sampai 15-20 detik? Bagaimana cara tuning performa nya? Apakah harus
dipisah DB antara KNT dan MKO?"*. Diinvestigasi via `auto_explain` (SUDAH
aktif di Postgres lokal — tidak perlu dipasang), bukan tebakan.

**Temuan kunci #1 — BUKAN soal volume data.** Diukur `fetchCustomerMetricsTrend`
(M3-M7) untuk 2 company yang datanya njomplang jauh:

| Company | Customer | Waktu (sebelum fix) |
|---|---|---|
| PT MKO | 995 | 6,1–9,0 detik |
| PT KNT | 32.000 | 7,5–9,5 detik |

MKO yang customernya cuma 995 tetap 6+ detik — membuktikan lambatnya BUKAN
proporsional data, tapi bug PILIHAN RENCANA EKSEKUSI Postgres yang konstan
per-request, terlepas dari besar company.

**Akar masalah — CTE inlining, bukan CTE `existing`/§5 di atas.** Postgres
12+ inline CTE non-`MATERIALIZED` ke query pemanggilnya. Dua CTE di
`fetchCustomerMetricsTrend` (`m3m7.repository.ts`) kena efek samping ini:

1. **`cust_dormant_threshold`** (JOIN ke `cust_division`, hasil
   `DISTINCT ON` per customer dari `cteCustDivision()`,
   `customers/helper/segment.helper.ts`) — TANPA `MATERIALIZED`, Postgres
   meng-inline-ulang seluruh komputasi `DISTINCT ON` (scan+sort SEMUA
   invoice company) **setiap kali** `cust_dormant_threshold` di-JOIN oleh
   CTE lain (9.581 kali untuk MKO — 1x per baris `bucket × customer`) —
   padahal hasilnya cuma 1 baris per customer, harusnya dihitung SEKALI.
2. **`last_inv_per_bucket`** (dulu `last_inv_unbounded LEFT JOIN ... GROUP
   BY MAX(invoice_date)`) — pola `LEFT JOIN` + `GROUP BY MAX()` bikin
   Postgres pilih rencana "scan+sort+dedup SELURUH invoice company sekali,
   lalu nested-loop-filter per baris" (bukan index-scan per customer),
   walau index `idx_invoices_customer_invoice_date(customer_id,
   invoice_date)` sudah ada dan cocok dipakai.

**Fix (`m3m7.repository.ts`, `fetchCustomerMetricsTrend` +
`fetchExpansionBreakdown`, keduanya + fallback jarangnya):**
1. `cust_dormant_threshold AS MATERIALIZED (...)` — paksa Postgres hitung
   sekali, cache hasilnya, jangan inline-ulang.
2. `last_inv_per_bucket`: `LEFT JOIN last_inv_unbounded ... GROUP BY
   MAX(...)` → `LEFT JOIN LATERAL (SELECT invoice_date FROM invoices
   WHERE customer_id = e.id AND invoice_date <= b.pe AND [filter scope
   SAMA PERSIS, tidak ada yang dihapus] ORDER BY invoice_date DESC LIMIT
   1) li ON true` — bentuk `ORDER BY ... LIMIT 1` (bukan `MAX()`) memaksa
   Postgres pakai index scan mundur per customer (index-scan langsung,
   bukan scan+sort seluruh tabel). CTE `last_inv_unbounded` dihapus
   (dilebur ke dalam LATERAL).

**Hasil (diverifikasi byte-per-byte 0 beda hasil, 4 skenario granularitas
beda — bulanan/kuartalan, cutoff on/off, company tunggal/gabungan):**

| Company | Sebelum | Sesudah | Faktor |
|---|---|---|---|
| PT MKO (995 customer) | 6,1–9,0 detik | **0,68–0,82 detik** | ~9-13x |
| PT KNT (32.000 customer) | 7,5–9,5 detik | 6,5–9,4 detik | tipis |
| Semua company (cutoff aktif) | ~18-25 detik (dilaporkan user) | 8,5–14,4 detik | ~2x |

KNT membaik tipis karena setelah bug plan-choice hilang, sisa waktunya
MEMANG proporsional data asli (276.854 lookup index @ ~17µs/lookup untuk
`last_inv_per_bucket` KNT = ~4,7 detik murni kerja index-scan) — ini
BUKAN lagi bug, cuma banyaknya kombinasi customer×bucket yang genuinely
perlu dicek. Mengecilkan ini lebih lanjut butuh restrukturisasi algoritma
(mis. "asof join" 1x scan per customer alih-alih 12x lookup terpisah per
bucket) — TIDAK dikerjakan sesi ini (risiko lebih tinggi, belum ada
kebutuhan mendesak, KNT saja masih di bawah 10 detik yang sebelumnya
tercampur 15-25 detik akibat bug plan-choice).

**`m8m10.repository.ts` (M8-M10 Dormant) DICEK, TIDAK py bug yang sama** —
strukturnya beda (`scoped_cust CROSS JOIN buckets LEFT JOIN inv` dengan
`MAX(...) FILTER (WHERE ...)` sekali per bucket dalam 1 pass, bukan
LATERAL/GROUP BY berulang) — company kecil (MKO) sudah cepat dari awal
(512ms), company besar (KNT, 7 detik) juga proporsional data asli (384.000
baris grup customer×bucket) — tidak ada win murah yang ditemukan di sini,
TIDAK disentuh.

**Jawaban ke pertanyaan "apakah DB perlu dipisah KNT/MKO?": TIDAK.** Bukti
dari tabel di atas: MKO yang 32x lebih kecil dari KNT tetap kena bug
plan-choice yang HAMPIR SAMA lamanya sebelum fix (6,1-9,0 detik vs
7,5-9,5 detik) — kalau akar masalahnya volume data, MKO harusnya jauh
lebih cepat dari awal. Memisah DB tidak akan menghilangkan biaya bug
plan-choice (sudah diperbaiki di sini) maupun biaya index-scan proporsional
KNT (memang perlu, cuma pindah tempat) — dan menambah biaya baru: laporan
"Semua Entitas" (1 query gabungan sekarang) harus dipecah jadi 2 query ke
2 database + digabung di kode aplikasi, plus 2x biaya migrasi/backup/koneksi.

**Metodologi verifikasi:** `ANALYZE` dicoba dulu (statistik basi?) — TIDAK
berpengaruh, konfirmasi ini murni soal bentuk query. `auto_explain`
(`log_min_duration_statement=0` on database lokal, di-reset lagi setelah
selesai) dipakai membaca rencana eksekusi asli, bukan menebak dari nama
CTE. Hasil sebelum/sesudah dibandingkan byte-per-byte (`JSON.stringify`
identik) sebelum perubahan dianggap aman.

### §6b. Lanjutan sama hari — user tanya "masih 14 detik, apa lagi?"

**Temuan #2 — 12x lookup index terpisah per customer, seharusnya 1x scan
dipakai ulang.** `last_inv_per_bucket` (sesudah fix §6 di atas) sudah pakai
index per (customer × bucket) — TAPI itu tetap 12 index-descent TERPISAH
per customer (1x per titik bulan), padahal daftar invoice seorang customer
TIDAK BERUBAH antar 12 titik, cuma batas atas tanggalnya yang beda tiap
titik. Diukur KNT: 276.854 lookup index @ ~17µs = ~4,7 detik SENDIRIAN.

**Fix:** CTE baru `customer_inv_dates AS MATERIALIZED` — `array_agg(invoice_date
ORDER BY invoice_date)` per customer, **1x scan** (bukan 12x). `last_inv_per_bucket`
diganti dari `LEFT JOIN LATERAL (... ORDER BY ... LIMIT 1)` jadi
`(SELECT MAX(d) FROM unnest(cid.dates) AS d WHERE d <= b.pe)` — filter di
memori dari array yang sudah di-scan sekali, bukan index-descent ulang.

**Temuan #3 — 3 CTE agregat (`active_inv_agg`/`prev_inv_agg`/`hm_inv_agg`)
dirujuk berkali-kali (avg_revenue, top_contrib, gp_median, dst) tanpa
`MATERIALIZED`** — Postgres re-inline+re-hitung ulang agregasinya tiap
rujukan (diukur: scan `active_inv_agg` 17.763 baris makan ~1,9 detik
SENDIRIAN, padahal cuma scan hasil materialized biasa harusnya <1ms).
Fix: tambah `MATERIALIZED` di ketiganya — pola SAMA PERSIS §6.

**Hasil kumulatif §6+§6b (diverifikasi ulang byte-per-byte, 0 beda),
diukur di kondisi TIDAK ada beban bersamaan:**

| Company | Awal (sebelum §6) | Sesudah §6 | Sesudah §6b |
|---|---|---|---|
| PT MKO (995 customer) | 6,1–9,0 detik | 0,68–0,82 detik | ~0,6–0,8 detik (tak berubah, sudah optimal) |
| PT KNT (32.000 customer) | 7,5–9,5 detik | 6,5–9,4 detik | **~6 detik** (variasi tinggi kalau server dipakai bersamaan, sampai 14 detik teramati — BUKAN regresi, murni kontensi resource, lihat catatan di bawah) |
| Semua company (cutoff aktif) | ~18-25 detik (dilaporkan user) | 8,5–14,4 detik | **~7-8 detik** bersih |

**Sisa bottleneck (belum disentuh, effort/risiko lebih tinggi drpd
sisa gain):** `last_inv_per_bucket` sendiri masih ambil ~5 detik dari
276.854 pemanggilan `unnest()` (1 per baris bucket×customer) — overhead
pemanggilan fungsi set-returning per baris, bukan lagi index-descent.
Cara hilangkan ini butuh restrukturisasi lebih dalam: gabung array tanggal
customer + 12 batas bucket jadi 1 urutan per customer, lalu 1x window
function "merge scan" (asof-join pattern) — BUKAN dikerjakan sesi ini,
effort besar + risiko ketepatan lebih tinggi drpd 2 perbaikan di atas.

**PENTING — variasi waktu tinggi teramati (6-14 detik utk query yang
SAMA) saat testing:** dicek langsung, penyebabnya browser user AKTIF
memakai dashboard yang SAMA (dev server lokal) bersamaan dengan script
pengukuran — 2 beban berat rebutan koneksi/CPU database yang sama, BUKAN
fix ini yang tidak stabil. Angka "bersih" di tabel atas diambil saat tidak
ada request lain berjalan.

### §6c. Verifikasi ketat susulan — user tanya "untuk fungsi dan data tidak berubah?"

Verifikasi §6/§6b sebelumnya cuma menutup `fetchCustomerMetricsTrend`
(byte-per-byte). `fetchExpansionBreakdown` (drilldown M7, ikut direstruktur
di §6) baru dicek "masuk akal" (angka tidak nol/error), BELUM dibandingkan
ketat ke versi asli. Ditutup sekarang pakai `git stash` (aman, belum
di-commit) — jalankan versi ASLI (stash push file), simpan hasil, `git
stash pop` (kembalikan fix), jalankan lagi, bandingkan byte-per-byte utk
`fetchCustomerMetricsTrend` (4 skenario) + `fetchExpansionBreakdown` (4
skenario) + `fetchRevenueBreakdown` (2 skenario, tidak direstruktur tapi
ikut dicek utk kelengkapan).

**Ketemu 1 perbedaan** — `fetchExpansionBreakdown` company MKO: 3 customer
(AWET SARANA SUKSES, BADAN CIPTA KARYA AGUNG ABADI, WINGS SURYA) punya
selisih `cur_revenue - prev_revenue` **PERSIS SAMA** (-670.000). Query ASLI
(sebelum disentuh sama sekali) `ORDER BY (cur_revenue - prev_revenue) DESC`
TANPA tie-breaker kedua — urutan di antara nilai yang sama persis TIDAK
PERNAH dijamin stabil oleh Postgres (celah LAMA, sudah ada sebelum
restrukturisasi performa apa pun). Restrukturisasi §6 mengubah rencana
eksekusi fisik, jadi 2 dari 3 customer itu tukar posisi ranking (453↔455)
— **data per-customer itu sendiri (revenue, cabang, channel, status) 100%
identik**, cuma nomor ranking utk yang seri yang goyah.

**Dikonfirmasi BUKAN bug data** — dibandingkan sbg SET (urutan diabaikan,
kolom `ranking` dikecualikan): seluruh baris di 4 skenario `fetchExpansionBreakdown`
+ 4 skenario `fetchCustomerMetricsTrend` + 2 skenario `fetchRevenueBreakdown`
100% identik ke versi asli.

**Ditutup sekalian** (bukan cuma didiamkan) — ditambah tie-breaker `id
DESC` (customer id, deterministik) di KEDUA `ORDER BY (cur_revenue -
prev_revenue) DESC` di `fetchExpansionBreakdown` (window function ranking
+ ORDER BY akhir query) — perlu kualifikasi `combined.id` (bukan `id`
polos, ambiguous krn `company_branches`/`divisions` yang di-JOIN sama-sama
py kolom `id`). Diverifikasi jalan 2x berturut-turut menghasilkan output
byte-identik (deterministik), dan hasil (diabaikan `ranking`) tetap sama
persis ke data asli.

**Kesimpulan ke user:** fungsi dan data TIDAK berubah — satu-satunya efek
adalah urutan tampil utk customer yang nilainya PERSIS sama (kasus langka),
dan itu sekarang malah LEBIH BENAR (dulu acak/tidak stabil, sekarang
deterministik) drpd sebelumnya, bukan regresi.
