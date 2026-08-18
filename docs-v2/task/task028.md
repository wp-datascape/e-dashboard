# Task 028 — Redefinisi Existing Customer: Include Dormant

**Status: DIEKSEKUSI.** Dimulai 2026-08-18, branch
`feat/task028-redefine-existing-customer` (dari `feat/task026-global-filter-context`).

## 1. Definisi final (disepakati sesi ini, 2026-08-18)

- **New** = `first_invoice_date` dalam `activeMonths` bulan terakhir dari titik
  evaluasi (business_config `active_window_months`) — **TIDAK BERUBAH** dari
  kode lama.
- **Existing** = semua customer KECUALI New (first invoice-nya sudah lewat
  active window). **Existing SEKARANG TERMASUK Dormant** — ini satu-satunya
  perubahan struktural. Sebelumnya `established_customers` (SSOT lama)
  explicit EXCLUDE dormant lewat syarat tanggal kedua
  (`ix.invoice_date > filterDate - dormantMonths`).
- **Active** = sub-status DI DALAM Existing — customer Existing yang punya
  transaksi dalam periode yang sedang dilihat. Untuk kartu headline (ikut
  `periodType`: Bulanan/Kuartalan/Semesteran/Tahunan), window aktifnya ikut
  `date_from`..`endDate` periode yang dipilih user (bukan fixed activeMonths
  lagi, khusus utk agregasi headline). Untuk titik tren bulanan (chart
  12-bulan), window tiap titik tetap bulan kalendernya sendiri — TIDAK
  berubah, pola CTE `months` yang sudah ada sudah otomatis benar untuk ini.
- **Dormant** = sub-status DI DALAM Existing — tidak ada invoice dalam
  `dormant_threshold_months` sesuai kategori bisnis customer (per divisi
  channel invoice terakhir). **TIDAK BERUBAH**, tetap per-kategori (bukan
  angka flat) — lihat [[project_task027_dynamic_dormant_threshold_bug]],
  bug itu tetap PR terpisah.

**Verifikasi "New graduasi ke Existing di periode berikutnya" (contoh: New
Agustus → Existing September)**: ini SUDAH cara kerja kode lama (tidak perlu
diubah) — karena tiap titik bulan di trend query dievaluasi independen
(`m.ms` per baris, CTE `months`), first_invoice Agustus otomatis keluar dari
active window begitu dievaluasi per akhir September. Berlaku otomatis untuk
semua periodType karena agregasi periode (Kuartalan/Semesteran/Tahunan) semua
dibangun DI ATAS titik-titik bulanan ini (`averageInRange`/breakdown
`date_from`-aware), bukan mekanisme terpisah.

## 2. Supersede task027 §4

[[project_task027_dynamic_dormant_threshold_bug]] §4 mencatat model klasifikasi
lama (2026-08-10) yang bilang "Existing = bukan New DAN belum lewat ambang
dormant" (exclude dormant). Definisi itu **digantikan** oleh §1 di atas
(exclude New saja, dormant tetap masuk Existing). Konfirmasi eksplisit dari
user 2026-08-18. Bug threshold dormant per-kategori di task027 sendiri
(§1-§3) TETAP valid dan belum diperbaiki — itu concern terpisah dari
definisi Existing/Dormant.

## 3. Perubahan kode

### 3.1 `backend/src/features/customers/helper/segment.helper.ts` (SSOT)

`cteEstablishedCustomers` — lepas syarat lower-bound tanggal dormant di EXISTS
kedua (`ix.invoice_date > filterDate - dormantMonths`), sisakan cuma upper
bound (`<= filterDate`) + scope filters (division/branch/exclude-intercompany).
Efeknya: customer yang sudah dormant lama tapi tetap "pernah invoice"
sekarang lolos EXISTS ini, ikut ke populasi.

Dead code dihapus (dikonfirmasi tidak ada pemanggil di luar file ini lewat
grep): `cteNewCustomers`, `cteActiveCustomers`, `cteExistingCustomers` (versi
atomik lama), `cteDormantCustomers`, `getCustomerSegments`, `getActiveCount`,
`getExistingCount`, interface `CustomerSegmentCount`. Semua ini encode model
4-kategori-eksklusif lama yang sudah tidak relevan dan tidak pernah dipanggil
service/handler manapun.

`sqlStatusExpr`/`sqlStatusWhere` (status per-baris + filter dropdown halaman
Customer) **SENGAJA TIDAK DIUBAH** — ini tetap 4 bucket eksklusif untuk
kebutuhan tampilan 1-badge-per-baris (new/active/existing/dormant), beda
konsep dari "Existing" sbg denominator KPI. Customer yang dormant tetap
tampil badge "Dormant" di halaman ini, bukan "Existing" — itu keputusan
sadar, bukan kelalaian, karena badge per-baris butuh partisi eksklusif
sementara Existing-sbg-denominator adalah superset.

### 3.2 `backend/src/features/metrics/repository/m3m7.repository.ts`

`fetchCustomerMetricsTrend` — CTE `existing` (per-bulan, dipakai trend
M3/M4/M5/M6/M7) punya pola EXISTS yang sama dengan `cteEstablishedCustomers`
lama (2 EXISTS: not-new + not-dormant). Lepas lower-bound dormant di EXISTS
kedua, mirror perubahan §3.1.

`fetchRevenueBreakdown`/`fetchExpansionBreakdown` di file yang sama, serta
`fetchGpBreakdown`(m4)/`fetchHmBreakdown`(m5)/`fetchRorBreakdown`(m6) —
otomatis ikut berubah, semua reuse `cteEstablishedCustomers` dari §3.1, tidak
perlu sentuh kode masing-masing.

### 3.3 `backend/src/features/metrics/repository/m8m10.repository.ts`

**TIDAK PERLU DIUBAH.** `fetchDormantTrend`'s populasi (`total_customers`)
sudah cuma exclude "not new" (`first_date < me - activeMonths`), TANPA syarat
not-dormant — jadi sudah persis match definisi final §1 (Existing = not-new,
termasuk dormant). Ini justru penyebab selisih 357 vs 329 yang diperbaiki
2026-08-10 (m8m10 dulu "salah lebih besar" dibanding m3m7/m4 yang exclude
dormant) — sekarang setelah §3.1-3.2 diterapkan, m3m7/m4/m5/m6 akan
KONVERGEN ke populasi m8m10 (~357-style), bukan sebaliknya. `total_customers`
m8m10 dan `existing_customers`/`established` count m3m7 akan sama lagi
setelah fix ini, TAPI ke arah angka yang lebih besar dari 329 (bukan
mengecilkan 357 ke 329 seperti perbaikan sebelumnya).

`fetchDormantValueRanking`/`fetchReactivatedCustomers` juga tidak perlu
diubah — sudah tidak pernah gating "not new" dari awal.

## 4. Dampak angka (terverifikasi, bukan cuma ekspektasi)

Diverifikasi langsung ke DB dev (company_id=1, filterDate=2026-06-30,
activeMonths=1, dormantMonths=3/dominan — skenario sama persis dengan
contoh di task027 §2) — dua cara hitung independen, hasilnya cocok:

- Query manual (SQL langsung dari `cust_dates`): **927** (`existing_baru_
  include_dormant`) = 329 (`existing_lama_exclude_dormant`) + 598
  (`selisih_dormant_yg_sekarang_masuk`).
- Panggil `cteEstablishedCustomers` yang SUDAH diubah (kode asli, bukan
  reimplementasi manual): **927** — cocok persis.
- 329 dan 598 itu sendiri persis angka yang sudah didokumentasikan di
  task027 §2 (329 = "Total Existing" lama yang jadi acuan cross-check
  sesi itu; 598 = total dormant di threshold 3 bulan) — jadi perubahan
  927 = 329 + 598 ini konsisten dengan histori, bukan angka baru yang
  tidak bisa dijelaskan.

Populasi "Existing"/"Total Existing" di M3-M7 akan **naik** (sekarang
termasuk dormant), bukan turun seperti skenario "Existing = all termasuk
new" yang sempat dibahas sebelumnya (dan tidak jadi dipakai). Efek turunan:

- **M5/M6/M7 (rate metrics)** — turun, karena dormant customer masuk
  denominator tapi hampir pasti tidak beli/repeat-order/expand.
- **M3/M4 (avg revenue/GP)** — turun juga, karena "existing customer yang
  transaksi bulan ini" (denominator avg) sekarang bisa termasuk customer yang
  BARU SAJA reaktivasi dari dormant (transaksi pertama setelah lama absen),
  bukan cuma pelanggan reguler.
- **M8 (Dormant Rate)** — kemungkinan angkanya BERUBAH (naik mendekati
  angka gaya-357 dulu) karena sekarang match dgn populasi m8m10 yang sudah
  benar dari awal — bukan bug baru, cuma konvergensi ke definisi final.

Tidak ada migrasi data diperlukan (semua dihitung on-demand dari
`invoices`/`customers`, tidak ada tabel snapshot). Histori sebelumnya yang
sudah dilaporkan/screenshot tidak akan match lagi setelah query di-refresh.

## 5. Di luar scope task ini

- Halaman Customer (`customers.repository.ts`, `Customers/index.tsx`) — badge
  status per-baris & filter dropdown, sengaja tidak disentuh (§3.1).
- Label/tooltip/i18n di 29 file frontend + glossary "Definisi Kunci"
  (`dashboard.json`) — angka otomatis berubah begitu backend deploy, tapi
  teks penjelasan definisi Existing yang eksplisit menyebut window
  aktif/dormant perlu direvisi manual (belum dikerjakan sesi ini).
- `docs-v2/executive-dashboard/metrics.md`, `docs-v2/shared/metrics_docs.md`
  — formula eksak per KPI perlu direvisi (belum dikerjakan sesi ini).
- `executive-kpi-dashboard/` (prototype baru, masih untracked di git) —
  reimplementasi client-side terpisah di `kpiCalculators.ts`, tidak
  disentuh (bukan bagian dari SSOT backend, dan file ini uncommitted milik
  user).
- task027 (bug threshold dormant per-kategori) — tetap belum diperbaiki,
  concern terpisah.

## 6. Referensi

- [[project_task027_dynamic_dormant_threshold_bug]] — model lama yang
  di-supersede §2.
- [[project_task026_kpi_pages_rollout]] — pola cohort-tetap-di-endDate +
  breakdown `date_from`-aware yang jadi dasar §3.1-3.2 tetap valid dan
  reusable untuk definisi baru.
