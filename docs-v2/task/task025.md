# Task 025 — Redesain Halaman KPI: Chart+Tabel per KPI, Prinsip UX Global, Fitur Intercompany Baru

> Status: 🟡 Desain final, verifikasi kode SELESAI, eksekusi BELUM dimulai
> (kecuali dinyatakan lain). Lanjutan [[task023]] (audit sidebar) dan
> [[task024]] (audit interpretasi data Dashboard) — task ini yang
> merealisasikan pola "chart atas + tabel bawah per KPI" yang disepakati di
> diskusi lanjutan kedua task tersebut.

## 0. Rantai keputusan (ringkas, supaya konteks tidak hilang)

1. [[task023]] §3 — sidebar Customer Workbench dikasih caption tier
   "Ringkasan & Tren" vs "Detail per Customer", TANPA menggabung halaman
   (Expansion tetap terpisah dari Analisis Revenue/Retention).
2. [[task024]] — audit interpretasi data Dashboard (null vs nol, polaritas,
   dll), sebagian dikerjakan, sebagian nunggu keputusan.
3. User bertanya ulang: apakah 10 halaman KPI sebaiknya 1 menu per kategori
   atau per jenis konten? → disepakati: **per kategori KPI, TABLE bukan
   pemisah menu**.
4. Diperdalam: bagaimana chart+tabel digabung? → disepakati: **1 KPI = 1
   tampilan (chart atas, tabel bawah, TANPA tab, scroll vertikal)**, dan
   "1 KPI per tampilan" ≠ "1 KPI per item menu utama" — beberapa KPI berbagi
   1 route, navigasi didalamnya lewat sub-nav/anchor.
5. User men-supply spec detail (§1-§4 di bawah) yang **sudah saya verifikasi
   satu-satu ke kode nyata** (bukan diterima mentah) — hasil verifikasi ada
   di §3 tabel mapping (kolom "Verifikasi saya").

## 0a. KEPUTUSAN BARU — Standardisasi Filter Periode ke Semua 10 KPI

Dipicu diskusi lanjutan (2026-08-07): ketidakkonsistenan jendela waktu M6
(30 hari rolling tetap) vs halaman "Analisis Pembelian Berulang" (periodType
bebas pilih) — user memutuskan menyeragamkan SEMUA 10 KPI ke 1 kerangka filter
periode yang sama, bukan tiap KPI punya jendela sendiri-sendiri seperti
sekarang.

**Keputusan final:**

1. **Semua 10 KPI** (termasuk M8-M10 dormant/reaktivasi) pakai periodType
   selector yang sama. Untuk M8-M10: threshold bulan dormant per
   business-unit (`dormant_threshold_months.*`) TETAP terpisah sebagai
   aturan bisnis (itu definisi "siapa yang dormant", bukan "periode
   perbandingan") — yang distandarkan cuma tanggal **"as of"** evaluasinya,
   ikut periodType yang sama dengan KPI lain.
2. **Set periodType: 4 pilihan** — Bulanan, Kuartal, Semester, Tahunan.
   `ytd` DIHAPUS dari set standar (bukan cuma "digabung", betul-betul
   redundant) — **terverifikasi di kode** `pages/Analisis/index.tsx:130-131`:
   `currentRange = { start: getPeriodDateRange(periodType, periodKey).start,
   end: endDate }` — `end` SELALU tanggal yang dipilih user, bukan "akhir
   alami" periodType. Karena `annual` dan `ytd` sama-sama `start` = 1 Januari
   tahun itu, keduanya SELALU menghasilkan rentang tanggal identik untuk
   `endDate` yang sama (termasuk untuk tahun yang sudah tutup penuh —
   pilih `endDate` 31 Des tetap kasih Jan-Des utuh, sama dengan "Tahunan").
   Satu-satunya beda SEBELUMNYA cuma teks label dan langkah tombol ‹ ›, bukan
   data yang dihitung.
3. **Basis pembanding: SELALU YoY** (periode sama, 1 tahun sebelumnya) —
   konsisten dengan yang sudah berlaku di `analisis.service.ts`/
   `analisisPeriod.ts` (`getYoyPeriodKey`, "basis comparison SATU-SATUNYA").

**Prinsip final (klarifikasi user, resolve pertanyaan terbuka sebelumnya):**
Semua threshold/aturan bisnis **TIDAK berubah** — `dormant_threshold_months.*`
(per business-unit), `active_window_months` (definisi "existing customer"),
`repeat_order_target_pct`, `reactivation_target_low/high_pct` — SEMUA tetap
persis seperti sekarang, nilainya maupun aturannya. **Yang berubah HANYA
mekanisme penarikan data** (query window/frame untuk current vs comparison),
dari ad-hoc per-KPI (30 hari rolling utk M6, dst) jadi seragam periodType+YoY.
Ini menjawab tuntas pertanyaan `active_window_months` yang sebelumnya
tertunda — statusnya SAMA seperti dormant threshold: tidak disentuh.

**Dampak teknis (BELUM dieksekusi, dicatat dulu supaya scope jelas):**

- Perubahan tetap di level **repository/service backend** (bukan cuma
  frontend) — file yang kena: `metrics/repository/m1.repository.ts`,
  `avg-category.repository.ts`, `m3m7.repository.ts` (kalau ada),
  `m8m10.repository.ts`, `dashboard.service.ts`, `metrics.service.ts`. Yang
  diubah cuma BAGIAN QUERY yang menentukan rentang tanggal current/comparison
  (ganti ke periodType+YoY) — bagian yang mengevaluasi aturan (threshold
  bulan, target %) tidak disentuh sama sekali.
- **Catatan informasional (bukan tindakan wajib)**: karena jendela waktu
  ikut berubah (mis. 30 hari rolling → 1 kuartal penuh utk M6), angka %
  yang dihasilkan otomatis bergeser secara matematis (kuartal penuh kasih
  lebih banyak kesempatan customer beli 2x dibanding 30 hari) — ini efek
  samping alami dari ganti jendela, BUKAN sesuatu yang perlu "diperbaiki".
  Sekadar catatan transparansi: begitu ini live, angka M6/M3-M7 yang tampil
  akan beda dari sebelumnya walau aturan hitungnya sama persis, supaya tidak
  disangka bug kalau ada yang bertanya nanti.
- Halaman Analisis existing (`Analisis/index.tsx`, `AnalisisRetention/
  index.tsx`) — `PERIOD_TYPES` array-nya masih 5 opsi (termasuk `ytd`
  redundant) — pembersihan kecil terpisah, tidak mendesak, tidak
  mem-blok task ini.

## 0b. Komponen Terpusat — Filter/Summary/Toolbar (SELESAI dibangun, belum dipasang)

Dipicu keluhan filter bar campur-aduk tanpa pengelompokan (audit UX
2026-08-07, mockup SIAPA/KAPAN). 3 komponen baru, semua di
`components/analisis/` kecuali disebutkan lain, semua `tsc`+`eslint` bersih:

1. **`components/filters/KpiFilterBar.tsx`** — 2 baris: SIAPA (entitas/cabang/
   divisi/toggle intercompany/Reset via `ScopeFilterFields`+
   `ExcludeIntercompanyToggle`) dan KAPAN (periodType 4-pilihan dari
   `KPI_PERIOD_TYPES`/`KpiPeriodType` di `utils/analisisPeriod.ts` + DatePicker
   "per tanggal" + rentang tanggal literal terhitung otomatis). SATU-SATUNYA
   tempat layout filter KPI ditulis — halaman baru tinggal import & panggil,
   tidak menyalin filter bar manual lagi.
2. **`KpiSummaryStrip.tsx`** — evolusi `PeriodTotalBox`: chevron ‹ › di pojok
   kartu (bukan flanking kotak), 2 kotak periode berdampingan + panah →,
   kalimat pertumbuhan di bawah **kondisional** (`growthSentence` null =
   disembunyikan, dipakai utk kasus `isEmptyPeriod`/alarm palsu massal).
3. **`KpiTableToolbar.tsx`** — search + toggle "utamakan pelanggan
   besar"/Pareto (opsional, disembunyikan kalau handler tidak diisi) +
   tombol Export (opsional, SENGAJA disembunyikan bukan disabled — Export
   belum diimplementasi di mana pun, tunggu keputusan client-side vs
   server-side) + teks jumlah baris (caller yang format unit/pluralisasi).

**BELUM dipasang ke halaman manapun** — Analisis Revenue & Pembelian Berulang
masih pakai filter bar + `PeriodTotalBox` versi lama. Migrasi 2 halaman ini
jadi validasi nyata komponen baru sebelum dipakai di 8 halaman KPI lain
(langkah selanjutnya).

## 1. Prinsip UX Global (berlaku ke SEMUA halaman KPI, bukan cuma yang baru)

- Filter bar di atas tiap halaman: periodType (4 pilihan, lihat §0a) + YoY,
  entitas, divisi, toggle intercompany, tombol **Reset** (belum ada di
  halaman manapun sekarang — perlu ditambah). Ralat dari draft awal ("period_end
  date, default hari ini" — itu cuma benar utk DatePicker pendukung periodType,
  bukan pengganti periodType selector itu sendiri).
- Timestamp **"Data diperbarui: …"** di header halaman (lihat [[task024]] §3c
  — key i18n `dashboard.lastUpdated` sudah ada, belum dipakai; backend belum
  expose timestamp-nya).
- Pola halaman KPI: chart (overview) di atas → tabel detail di bawah, tinggi
  tetap + scroll internal (BUKAN tab — sudah disepakati di diskusi
  sebelumnya). Klik elemen chart → filter tabel di bawahnya (pola ini
  SEBAGIAN sudah ada tapi sebagai dialog terpisah, bukan tabel yang
  langsung ke-filter di tempat — lihat catatan per-KPI di §3).
- Semantik data: missing = gap bukan nol; badge netral utk tanpa data; warna
  delta sadar polaritas (lihat [[task024]] — BARU dikerjakan utk StatCard
  Dashboard via `metricPolarity.ts`, BELUM diterapkan ke chart widget di
  halaman-halaman ini); tick sumbu dibulatkan (SUDAH — `formatAxisTick` di
  task024 berlaku ke `BarChartWidget`/`AreaChartWidget`/`LineAlertWidget`,
  otomatis ke-cover di sini juga karena widget yang sama dipakai ulang);
  definisi via tooltip ⓘ (BELUM — masih Row terpisah di Dashboard, lihat
  [[task024]] §3d).
- Empty state: `—` + "belum ada data" + CTA "lihat periode dengan data" —
  BELUM bisa diimplementasi sampai [[task024]] §3a (null vs nol) selesai,
  karena backend belum expose flag `has_data`.

## 2. Verifikasi saya terhadap spec — ringkasan

Saya cek tiap halaman KPI yang disebut di spec, langsung ke kode (bukan
percaya deskripsi). Hasilnya: **spec akurat**, cuma 1-2 detail kecil
(nama widget persis) yang saya luruskan di §3. Temuan tambahan paling
penting: **6 dari 10 tabel detail yang diminta memang belum ada sama sekali**
(cuma dialog breakdown kecil per-bulan, bukan tabel penuh sortir/filter/
pagination) — jadi ini bukan "susun ulang", tapi juga "bangun fitur baru".

## 3. Mapping Menu → Route (slug TIDAK berubah untuk yang existing)

| # | KPI | Route saat ini | Chart saat ini (verifikasi saya) | Tabel detail |
|---|---|---|---|---|
| — | RAGAM PEMBELIAN | `/cross-selling` | | |
| 1 | Cross Selling Ratio | `/cross-selling` | `ComboChartWidget` (bar+bar+line combo — spec sebut "Bar 12bln", ini kombo bukan bar polos, tapi sama-sama sudah representatif) | ✅ **Heatmap Customer×Kategori** (`HeatmapWidget`, sudah ada, klik cell → dialog produk) |
| 2 | Avg Category per Customer | `/cross-selling` | `AreaChartWidget`, klik area → buka **dialog** breakdown (`ResponsiveListView` di dalam `Dialog`, bukan tabel persisten di halaman) | ❌ bangun — jadikan tabel persisten di bawah chart, bukan dialog |
| — | NILAI PELANGGAN LOYAL | `/customer-metrics` | | |
| 3 | Avg Revenue (M3) | `/customer-metrics` (chart) + `/analisis/revenue` (tabel, **route TERPISAH sekarang**) | `ComboChartWidget` di M3Revenue.tsx | ✅ Ada — tapi di **route lain** (`/analisis/revenue`), bukan menyatu di `/customer-metrics`. Lihat §5 risiko deep-link. |
| 4 | Avg Gross Profit (M4) | `/customer-metrics` | `BarChartWidget stacked` (tier breakdown) | ❌ bangun |
| — | PERTUMBUHAN PEMBELIAN | `/customer-metrics` | | |
| 5 | High Margin Penetration (M5) | `/customer-metrics` | `DonutChartWidget` | ❌ bangun |
| 6 | Repeat Order Rate (M6) | `/customer-metrics` (chart) + `/analisis/retention` (tabel, **route TERPISAH sekarang**) | `RadialBarWidget` | ✅ Ada — sama seperti KPI3, di route lain. Lihat §5. |
| 7 | Expansion Rate (M7) | `/customer-metrics` | `BarChartWidget stacked` (naik/tetap/turun) | ❌ bangun — sudah ada dialog breakdown (`pageSizeOptions=[25,50,100]`), tinggal diformalkan jadi tabel persisten |
| — | PELANGGAN TIDAK AKTIF | `/dormant-customer` | | |
| 8 | Dormant Rate (M8) | `/dormant-customer` | `LineAlertWidget` (ambang 10%) | ❌ bangun — TIDAK ada tabel/dialog sama sekali sekarang |
| 9 | Dormant Value (M9) | `/dormant-customer` | `BarChartWidget layout="horizontal"` (ranking) | ≈ **Data ranking-nya SUDAH ADA** (`data.value_ranking` dari API), cuma belum diformalkan jadi komponen tabel — paling murah dari 6 yang "❌ bangun" |
| 10 | Reactivation Rate (M10) | `/dormant-customer` | `BulletChartWidget` (target 15-20%) | ❌ bangun — tidak ada tabel/dialog sama sekali |
| — | AFILIASI ANTARPERUSAHAAN (baru) | `/intercompany` (slug baru) | — | — |

### Catatan penting soal slug — RISIKO KONKRET yang perlu diputuskan

Spec bilang "slug TIDAK berubah", tapi KPI 3 dan KPI 6 **saat ini py2 route
BERBEDA** untuk chart (`/customer-metrics`) vs tabel (`/analisis/revenue`,
`/analisis/retention`) — kalau digabung jadi 1 tampilan chart+tabel di
`/customer-metrics`, maka `/analisis/revenue` dan `/analisis/retention`
sebagai route akan pensiun/berubah fungsi. Saya cek: **ada deep-link
langsung ke `/analisis/revenue` dari `NotificationDetailDialog.tsx`**
(notifikasi Pareto mengarah ke sana) — kalau route ini dihapus/diganti tanpa
redirect, klik notifikasi lama akan 404 atau nyasar. Perlu diputuskan salah
satu:
- (a) `/analisis/revenue` & `/analisis/retention` jadi redirect ke
  `/customer-metrics#revenue` / `#repeat-order`, ATAU
- (b) tetap dipertahankan sebagai route hidup terpisah (tidak benar-benar
  "menyatu" ke `/customer-metrics`, cuma DITAMBAH chart di sana juga —
  duplikasi tapi zero-risk migrasi).

**Belum diputuskan** — perlu dikonfirmasi user sebelum halaman
`/analisis/revenue`/`/analisis/retention` disentuh.

## 4. Desain UX per halaman (dari spec, tidak ada koreksi substansi)

- **Ringkasan (Dashboard)** — insight banner 2-3 sinyal di atas; 10 kartu
  diurutkan berdasarkan risiko; klik kartu → deep-link ke sub-nav KPI terkait.
  (Overlap dengan [[task024]] §3d "strategis" — insight banner & reorder KPI
  belum dikerjakan.)
- **Ragam Pembelian** — KPI1: chart + heatmap (klik bar → filter heatmap ke
  bulan itu, BELUM ada — sekarang heatmap independen dari klik bar). KPI2:
  area + tabel jumlah kategori per customer (baru).
- **Nilai Pelanggan Loyal** — KPI3: reuse Analisis Revenue + kolom revenue.
  KPI4: bar stacked 3 tier + tabel kolom tier & gross profit (baru).
- **Pertumbuhan Pembelian** — KPI5: donut + tabel status per customer (baru).
  KPI6: radial (hijau ≥ target, kuning ≥75%, merah <75%) + tabel frekuensi
  transaksi (reuse Analisis Retention). KPI7: bar 100% stacked + tabel spend
  cur vs prev (baru, formalisasi dari dialog existing).
- **Pelanggan Tidak Aktif** — KPI8: LineAlert + tabel pelanggan dormant
  (baru). KPI9: bar ranking + tabel ranking + kolom estimasi rugi (formalisasi
  dari `value_ranking` yang sudah ada). KPI10: bullet + tabel pelanggan yang
  reaktivasi (baru).
- **Afiliasi Antarperusahaan** (`/intercompany`, FITUR BARU TOTAL) — 4 kartu
  KPI (jumlah transaksi, nilai, pelanggan lintas, kontribusi %) → chart tren
  → tabel pelanggan/transaksi lintas afiliasi. **Tidak ada endpoint backend
  untuk ini sama sekali sekarang** (dicek: semua hit "intercompany" di
  backend cuma parameter `exclude_intercompany` di query existing, bukan
  fitur analitik intercompany sendiri) — ini bukan restrukturisasi, murni
  fitur baru end-to-end (schema/repository/service/handler + halaman
  frontend baru).

## 5. Rencana Fasing yang Saya Usulkan

Mengingat 6 dari 10 tabel + 1 fitur backend baru total, saya usulkan:

- **Fase 0 (mulai sekarang, tanpa tabel baru, tanpa risiko route)** —
  terapkan prinsip UX global (§1) yang tidak butuh tabel baru: filter bar
  standar + tombol Reset di 3 halaman (`cross-selling`, `customer-metrics`,
  `dormant-customer`), skeleton timestamp "Data diperbarui" (tampilkan kalau
  backend sudah punya datanya — cek dulu, kalau belum, tunda ke sini juga).
- **Fase 1 — SELESAI (2026-08-07)** — KPI9 (Dormant Value ranking) — termurah,
  data sudah ada, cuma perlu dibungkus jadi komponen tabel + ditaruh di
  bawah chart yang sudah ada. Lihat "Fase 1 — progress" di bawah.
- **Fase 2** — putuskan dulu soal slug `/analisis/revenue`/`/retention`
  (§3 catatan), baru gabungkan KPI3 & KPI6 ke `/customer-metrics`.
- **Fase 3+** — KPI2, KPI4, KPI5, KPI7, KPI8, KPI10 (bangun tabel baru
  satu-satu, urutan bebas — tidak saling bergantung).
- **Fase terpisah, kapan saja** — `/intercompany` (fitur baru total, tidak
  bergantung ke fase manapun di atas).

Saya mulai dari **Fase 0** sekarang (paling aman, tidak ada keputusan
tertunda yang memblokir) — beri tahu saya kalau mau urutan lain.

### Fase 0 — progress

- **Selesai**: tombol Reset di `CrossSelling`, `CustomerMetrics`,
  `DormantCustomer` — mengembalikan entitas/cabang/divisi/toggle intercompany
  (`useScopedCompanyFilter().reset()`, method baru dipusatkan di hook supaya
  semua pemanggil hook ini otomatis dapat definisi "default" yang sama) DAN
  `periodEnd` lokal ke hari ini.
- **Ditunda** (bukan lupa): timestamp "Data diperbarui" — dicek, endpoint
  `useCrossSelling`/`useCustomerMetrics`/`useDormantCustomer` semuanya BELUM
  expose field timestamp apa pun di response-nya. Sama seperti [[task024]]
  §3c, ini technically bagian dari "expose timestamp data dari backend"
  yang belum diputuskan sumbernya (`MAX(created_at)` invoices? timestamp
  `metric_cache`?) — satu keputusan, berlaku ke Dashboard DAN 3 halaman ini
  sekaligus kalau sudah dieksekusi.
- Filter bar 3 halaman ini SUDAH match prinsip §1 dari awal (entitas, divisi,
  date, toggle intercompany semua sudah ada) — cuma tombol Reset yang kurang,
  jadi Fase 0 lebih ringkas dari dugaan.

### Fase 1 — progress (SELESAI)

- Tabel ranking KPI9 (`value_ranking`, snapshot top-20, tanpa YoY — lihat §7
  exception) dipasang di bawah bar chart M9 di `DormantCustomer/index.tsx`,
  pakai `KpiTableToolbar` (search saja, tanpa toggle prioritas/export — data
  ini tidak butuh) + `ResponsiveListView`. Kolom: Customer, Transaksi
  Terakhir, Bulan Dormant (merah+bold jika ≥6), Revenue/Bulan, Estimasi
  Nilai Hilang (merah+bold). SENGAJA tanpa kolom Selisih/Status — data
  `value_ranking` tidak punya struktur perbandingan YoY di backend.
- Filter bar KPI9 TIDAK dimigrasi ke `KpiFilterBar` (periodType selector) —
  backend M8-M10 cuma terima `period_end` tunggal, belum ada logic
  periodType/YoY. Tetap pakai `ScopeFilterFields` + DatePicker + toggle
  intercompany + Reset yang sudah ada dari Fase 0.
- Formula tooltip M8 & M9 selesai (lihat §6b di atas).
- Anti-truncation: semua kolom tabel M9 pakai `minWidth`+`flex` (bukan
  `width` tetap), diverifikasi lewat screenshot 1440px & 375px — tidak ada
  header terpotong ellipsis di kedua breakpoint.
- Diverifikasi: `tsc --noEmit` dan `eslint src` bersih (0 error) di seluruh
  frontend setelah perubahan ini.
- **Sub-nav/anchor antar section** (bagian rencana §0 poin 4 yang sempat
  belum dieksekusi) — dibuatkan komponen shared baru
  `components/analisis/KpiSectionNav.tsx`: chip sticky (M8/M9/M10) di atas
  section, klik = smooth-scroll ke anchor, highlight aktif otomatis
  mengikuti section yang sedang dilihat (IntersectionObserver). Dipasang di
  `DormantCustomer/index.tsx` — tiap section (`id="m8"/"m9"/"m10"` +
  `scrollMarginTop`) sudah ada dari struktur lama, tinggal ditandai anchor.
  Sengaja dipusatkan sebagai komponen shared (bukan ditulis langsung di
  halaman) karena pola "beberapa KPI 1 route" ini berpotensi dipakai
  halaman multi-KPI lain nanti — verifikasi visual: klik nav + scroll manual
  dicek lewat screenshot, sticky & highlight-nya bekerja benar.

## 6. Catatan Tambahan (2026-08-07, sebelum eksekusi KPI9)

Tiga hal dari user, dicatat dulu sebelum lanjut supaya tidak hilang, TIDAK
memblokir eksekusi KPI9 di bawah (masing-masing scope-nya terpisah):

### 6a. Rework menu.tsx — FASE TERPISAH, belum dikerjakan

Kategori final di `ux-menu-mapping.md` §2 (Ragam Pembelian/Nilai Pelanggan
Loyal/Pertumbuhan Pembelian/Pelanggan Tidak Aktif/Afiliasi) **sama sekali
beda** dari grup `menu.tsx` sekarang (Customer Workbench/Product &
Portfolio/Transaction & Revenue/Administration — hasil kerja [[task023]]).
Ini rework total struktur `NAV_ITEMS`, bukan tweak — perlu task/sesi sendiri
setelah cukup banyak KPI individual selesai dibangun (baru masuk akal
mengelompokkan menu kalau halamannya sudah ada). KPI9 di bawah TETAP di route
`/dormant-customer` existing, tidak pindah menu dulu.

### 6b. Rumus perhitungan KPI — ikon ⓘ + tooltip di tiap halaman KPI

Baru, belum ada di desain sebelumnya: setiap halaman KPI perlu ikon bantuan
(ⓘ) di sebelah judul chart/KPI yang saat di-hover/klik menampilkan **rumus
perhitungan sebenarnya** (bukan cuma deskripsi bahasa awam seperti "Definisi
Kunci" Dashboard) — misalnya utk Dormant Rate:
```
Dormant Rate = (Customer tidak transaksi ≥ N bulan) / (Total Existing Customer) × 100%
N = threshold per business-unit (business_configs.dormant_threshold_months.*)
```
Berlaku ke SEMUA halaman KPI (bukan cuma KPI9) — akan diterapkan bertahap
mulai dari KPI9 (Dormant Rate & Dormant Value) sebagai contoh pertama,
sumber rumus dari `docs-v2/executive-dashboard/metrics.md` (definisi bisnis
resmi per KPI) supaya tidak menebak-nebak formula sendiri.

**Selesai untuk KPI8/KPI9** — komponen baru `components/ui/FormulaHelpIcon`
(ikon ⓘ + tooltip monospace berisi rumus + catatan), dipasang di
`SectionLabel` M8 dan M9 `DormantCustomer/index.tsx`. Rumus DIVERIFIKASI ke
kode jalan (`m8m10.repository.ts`, `resolveDormantMonths()` di
`threshold.ts`), BUKAN disalin mentah dari `metrics.md` — ternyata
`metrics.md` menyebut threshold dormant "Fixed 90 hari" padahal kode
sebenarnya pakai threshold bervariasi per business-unit dari
`business_configs.dormant_threshold_months.*`. Tooltip pakai versi yang
sesuai kode. Rollout ke KPI lain menyusul di fase masing-masing.

### 6c. Penamaan file/route/permission — JANGAN pakai nama generik "Analisis"

Masalah konkret: `pages/Analisis/index.tsx` isinya REVENUE spesifik, tapi
nama file/folder/route/permission-nya generik "Analisis"
(`/analisis/revenue`, permission `analisis:menu`/`analisis:view`,
`pages/AnalisisRetention/index.tsx` → `/analisis/retention`,
`analisis.retention:menu`). Maintainer masa depan tidak bisa tahu isi
halaman dari nama file/route/permission-nya — harus buka kode dulu. Aturan
ke depan (KPI baru maupun rename existing nanti): **nama file/route/
permission HARUS spesifik sesuai konten** (mis. `pages/Revenue/`, `/revenue`,
`revenue:menu` — BUKAN `pages/Analisis/`, `/analisis/revenue`,
`analisis:menu`).

**Belum di-rename sekarang** — `/analisis/revenue` & `/analisis/retention`
sudah diputuskan jadi redirect permanen begitu dikonsolidasi ke
`/customer-metrics` (§3 catatan slug), jadi rename penuh baru masuk akal
dieksekusi BARENGAN Fase 2 (konsolidasi), bukan terpisah sekarang (dua kali
migrasi route/permission utk hal yang sama itu boros). KPI9 (halaman baru,
sekarang `/dormant-value` setelah pemecahan §7a) DIBANGUN LANGSUNG dengan
penamaan spesifik-konten dari awal — begitu juga `/dormant-rate` dan
`/reactivation-rate` — tidak ada nama "Analisis" apa pun yang perlu
dihindari di sana sejak awal.

## 7. Keputusan Final (2026-08-07, setelah baca `ux-menu-mapping.md` v8) — SELESAI DIEKSEKUSI

v8 mengoreksi 2 hal dari asumsi awal task ini — dikonfirmasi user, sudah
dieksekusi:

### 7a. Sub-nav DIBATALKAN — pola final = 1 route = 1 KPI, halaman dipecah

v8 §1 eksplisit: **"1 chart per halaman, 1 route = 1 KPI"**, **"TIDAK ADA
pola route multi-section maupun sub-nav lompat"** — beda dari asumsi §0.4
sebelumnya ("beberapa KPI boleh berbagi 1 route, navigasi lewat sub-nav").
Bundel `DormantCustomer` (M8+M9+M10 dalam 1 route) resmi berstatus
**transisi yang harus dibubarkan**, bukan pola akhir.

Keputusan: `KpiSectionNav` yang sempat dibangun (sub-nav sticky +
IntersectionObserver) **dibongkar/dihapus** — bukan cuma dari halaman ini,
komponennya sendiri dihapus dari codebase karena polanya sekarang dilarang
di semua halaman KPI (bukan cuma dormant). `/dormant-customer` dipecah jadi
3 halaman:

| KPI | Route baru | Page component | Permission |
|---|---|---|---|
| 8 · Dormant Rate | `/dormant-rate` | `pages/DormantRate` | `churn.risk:*` (reuse) |
| 9 · Dormant Value | `/dormant-value` | `pages/DormantValue` | `churn.risk:*` (reuse) |
| 10 · Reactivation Rate | `/reactivation-rate` | `pages/ReactivationRate` | `churn.risk:*` (reuse) |

Route lama `/dormant-customer` → **redirect permanen** ke `/dormant-rate`
(pola sama seperti keputusan `/analisis/revenue`|`/retention`, §0 poin 5 &
§3 tabel mapping v8) via `<Navigate replace>` statis di `App.tsx`, supaya
bookmark/deep-link lama (termasuk 3 link insight card Dashboard) tidak putus.

**Permission TIDAK dipecah 1:1 per halaman** — ketiga route baru tetap
pakai permission key **sama** (`churn.risk:menu/view/export`), TIDAK dibuat
`dormant.rate:*`/`dormant.value:*`/`reactivation.rate:*` terpisah. Alasan:
backend masih 1 endpoint gabungan (`GET /metrics/dormant-customer`,
mengembalikan trend+M8+M9+M10 sekaligus) — kalau permission dipecah tapi
data-nya tetap 1 sumber, user bisa lolos frontend guard tapi ditolak
backend (atau sebaliknya, guard salah longgar). Granularitas permission
per-KPI baru masuk akal setelah backend juga dipecah endpoint-nya per KPI —
itu scope terpisah (sama seperti CustomerMetrics M3–M7 yang juga masih
1 endpoint, splitting-nya ditunda ke Fase 2/3). Dicatat di sini supaya
tidak dianggap kelupaan.

**page_settings**: baris `dormant-customer` lama DIBIARKAN ada di DB (tidak
dihapus, tidak dipakai lagi oleh redirect statis) — 3 baris baru
(`dormant-rate`, `dormant-value`, `reactivation-rate`, `ready: true`)
ditambahkan idempotent lewat `seed.ts` (skip kalau sudah ada). ⚠️ **Perlu
dijalankan juga di DB production/VPS** setelah deploy — bukan cuma lokal —
supaya 3 route baru benar-benar muncul di sana (kalau tidak, dynamic route
matching di `App.tsx` tidak akan meng-generate route-nya sama sekali).

**Status: SELESAI dieksekusi (2026-08-07)** —
- Komponen baru: `DateScopeFilterBar` (filter scope+1 tanggal, dipusatkan
  supaya tidak diduplikasi 3x — sebelumnya identik di CrossSelling/
  CustomerMetrics/DormantCustomer), `KpiSectionLabel` (label+ikon formula,
  dipusatkan dari `SectionLabel` lokal lama).
- 3 halaman baru dibuat (`pages/DormantRate`, `pages/DormantValue`,
  `pages/ReactivationRate`), masing-masing dengan i18n namespace sendiri
  (`dormantRate.json`/`dormantValue.json`/`reactivationRate.json` — pecah
  dari `dormantCustomer.json` lama, konsisten dgn aturan penamaan §6c).
  `pages/DormantCustomer` + `KpiSectionNav` DIHAPUS dari codebase.
- Routing: `routeConstants.tsx`/`routeLazyComponents.tsx` diupdate 1→3
  entry; redirect statis `/dormant-customer`→`/dormant-rate` di `App.tsx`.
- `menu.tsx`: 1 item `churn-risk` → 3 item (`dormant-rate`/`dormant-value`/
  `reactivation-rate`), permission tetap sama, posisi/urutan grup TIDAK
  berubah (bukan rework kategori §6a).
- `dashboard.service.ts`: 3 link insight card (dormant_rate/dormant_value/
  reactivation_rate) diarahkan ke route spesifik masing-masing (sebelumnya
  ketiganya ke `/dormant-customer`).
- `seed.ts` + `Config/Features/index.tsx` (admin toggle page) diupdate;
  `bun run db:seed` sudah dijalankan di DB lokal (idempotent, 3 baris baru
  masuk, sisanya skip) — **production/VPS masih perlu langkah sama saat
  deploy**, dicatat sebagai reminder eksplisit.
- Diverifikasi END-TO-END: login sungguhan (bukan mock) ke app real +
  backend real lewat Playwright — ketiga halaman baru render benar dengan
  data asli (Dormant Rate 74.8%, ranking Nilai Hilang, Reactivation Rate
  chart), sidebar 3 item baru muncul, redirect `/dormant-customer` →
  `/dormant-rate` bekerja, 0 console error. Label sidebar `Nilai Pendapatan
  Hilang` sempat kepotong ellipsis (sidebar TIDAK ada tooltip fallback utk
  mode expanded) → diperpendek jadi `Nilai Hilang`.
- `tsc --noEmit` + `eslint src` bersih (0 error) di frontend maupun backend.

**Perbaikan susulan (2026-08-07, setelah user lapor "template tabel dan
filter belum sesuai")** — 2 gap konkret vs template §7/§1 v9:
1. **Filter bar** — versi awal `DateScopeFilterBar` cuma 1 baris inline
   (bukan Card, lebar default ScopeFilterFields 160/150/150, bukan spec
   240/160/200), dan ditaruh SEJAJAR judul (pola lama pra-KpiFilterBar),
   bukan full-width DI BAWAH judul seperti pola Analisis Revenue. Diperbaiki:
   `DateScopeFilterBar` sekarang Card+Divider+2-baris (baris 1: scope+
   toggle+reset lebar tetap 240/160/200; baris 2: cuma Per Tanggal 170,
   TANPA periodType — itu genuinely backend gap tercatat §9b, bukan
   dipalsukan), dan diposisikan full-width di bawah judul di ketiga
   halaman (DormantRate/DormantValue/ReactivationRate).
2. **Tabel M9** — kolom **Perusahaan** (wajib kolom pertama semua tabel per
   §7) sebelumnya tidak ada sama sekali — `value_ranking` query
   (`m8m10.repository.ts`) tidak pernah select company. Diperbaiki: JOIN
   `companies` ditambah di query (`cust_last`→`cust_agg`→SELECT akhir),
   field `company_name` baru di `DormantValueRow`/`DormantValueRankingRow`
   (backend+frontend types), kolom baru dipasang sebagai kolom PERTAMA di
   tabel (noWrap+title tooltip, sama pola dgn kolom Perusahaan di Analisis
   Revenue). Ini murni "penarikan data" (nambah field ke SELECT), BUKAN
   perubahan logic/threshold bisnis apa pun.
   Export & toggle Pareto TIDAK ditambahkan — dicek dulu ke
   `KpiTableToolbar`: Export memang belum diimplementasikan di halaman
   manapun (keputusan client-vs-server-side tertunda, bukan spesifik ke
   halaman ini), dan Pareto tidak relevan buat ranking yang sudah terurut
   nilai kerugian terbesar.
   Diverifikasi ulang via Playwright end-to-end (bukan cuma isolated
   harness) di ketiga halaman + mobile 375px — filter Card konsisten,
   kolom Perusahaan tampil dengan data real, tidak ada truncation baru.
   `tsc`+`eslint` bersih lagi di frontend & backend.

### 7b. Threshold dormant — kode (business_configs) yang jadi acuan, BUKAN "fixed 90 hari"

Dikonfirmasi eksplisit oleh user: **jangan ubah aturan bisnis apa pun** —
`business_configs.dormant_threshold_months.*` (per kategori bisnis: b2b_dc
3 bulan, b2b_project 12 bulan, b2c 6 bulan, manufacturing 6 bulan, resolve
via `resolveDormantMonths()`/`threshold.ts`) tetap jadi satu-satunya sumber
kebenaran runtime, TIDAK dimigrasi ke "fixed 90 hari".

`metrics.md` (baris 32, 45, 190, 234, dst.) dan `ux-menu-mapping.md` v8
(baris "Threshold dormant | Ikut metrics.md: fixed 90 hari; kode per-unit =
task migrasi") **keduanya salah/basi** pada poin ini — ditulis sebelum
fitur threshold per business-unit ada, tidak pernah diupdate. Ini
**perbaikan dokumentasi**, bukan perubahan bisnis: `metrics.md` diperbaiki
supaya bilang threshold dormant **dinamis, diambil dari DB via
business_configs + fungsi resolve per kategori bisnis** — bukan angka
tetap. `ux-menu-mapping.md` juga perlu dikoreksi di baris yang sama, tapi
itu dokumen yang di-maintain user sendiri di luar sesi ini — akan
diinfokan, tidak diedit langsung tanpa izin eksplisit.

**Aturan ke depan**: perubahan NILAI threshold apa pun (baik ke fixed 90
hari maupun angka lain) WAJIB konfirmasi eksplisit dulu — tidak diasumsikan
dari dokumen mana pun, termasuk metrics.md sendiri.

**Konfirmasi ganda** — `ux-menu-mapping.md` v9 (setelah insiden salah-paste
ke `overview.md` diperbaiki user) mengonfirmasi persis eksekusi §7a/§7b di
atas tanpa perlu direvisi: v9 §9 poin 7 *"Dormant: 3 halaman terpisah;
eksepsi section/sub-nav DITARIK"*; poin 8 *"Threshold dormant: mengikuti
database (per-unit); aturan metrics TIDAK diubah; tooltip ⓘ menampilkan
nilai efektif per-unit"*.

**Status: SELESAI dieksekusi (2026-08-07)** — `metrics.md` diperbaiki di
5 titik (parameter global §1, tabel status customer §Definisi, KPI 8
definisi+cara hitung, tabel perbandingan lama-vs-final 2 baris), semua
diberi catatan "KOREKSI 2026-08-07" + alasan supaya jejak historisnya
tetap kebaca (bukan diam-diam ditimpa). TIDAK ada perubahan kode/logic
apa pun — murni perbaikan teks dokumentasi. `ux-menu-mapping.md` sudah
dikoreksi user sendiri di v9 (baris "Threshold dormant" §0 & §9 poin 8),
selaras dengan perbaikan `metrics.md` di atas.

## 8. `ux-menu-mapping.md` v9 — update di luar §7a/§7b (2026-08-07)

Selain mengonfirmasi §7a/§7b (lihat catatan di §7b di atas), v9 menambah
2 hal baru yang belum tercatat di task ini:

### 8a. §7 Template Tabel — sekarang eksplisit "WAJIB semua menu & halaman"

v9 §7 merinci lengkap: toolbar (cari+Pareto+Export+total+chip filter
bulan), kolom (header periode = rentang aktual, chip growth per-baris
tanpa prefix panjang, status set 6 nilai), paginasi di bawah, adaptasi
snapshot untuk KPI 5/6/9, dan **anti-truncation eksplisit jadi syarat
wajib** ("tiada chip/label/header terpotong di 1440px & 375px") — bukan
cuma kebiasaan yang saya pegang sendiri selama ini, sekarang tertulis
resmi di dokumen. Tabel Analisis Revenue jadi "referensi" (§9 poin 11).

### 8b. §9 poin 10 — urutan eksekusi berikutnya ditetapkan

**"KPI9 (selesai) → Nilai Pelanggan Loyal (Keputusan A + reuse) → sisanya
→ intercompany."**

Artinya task berikutnya SETELAH KPI9 ini BUKAN KPI2/5/7/8/10 sembarang
urutan, melainkan **KPI3+4 "Nilai Pelanggan Loyal"** dulu:
- KPI3 (Jumlah pelanggan loyal): chart M3 murni revenue (garis high-margin
  dikeluarkan ke KPI5) + tabel reuse `/analisis/revenue` (Keputusan A —
  route lama jadi redirect permanen begitu dikonsolidasi ke
  `/customer-metrics`).
- KPI4 (Keuntungan dari pelanggan loyal): BarChart stacked 3 tier + tabel
  tier & gross profit — saat ini masih dialog kecil transisi, perlu
  dibangun jadi tabel.

Scope rework backend yang perlu dibangun terpisah (v9 §9 poin 9, dicatat
di sini supaya tidak hilang): (a) endpoint periodType untuk M8–M10,
(b) field timestamp "data terakhir masuk", (c) `has_data`/null-vs-zero
([[task024]]), (d) endpoint `/intercompany`, (e) endpoint tren bulanan
Afiliasi. Belum dikerjakan, menunggu giliran fase masing-masing.

## 9. Migrasi GLOBAL apple-to-apple filter/banner/toolbar (2026-08-07)

Ditegur user: "kenapa tidak membaca ketentuan" — beberapa halaman KPI masih
pakai implementasi filter LAMA (pra-`KpiFilterBar`/`DateScopeFilterBar`),
tidak konsisten dgn Analisis Revenue. Diperbaiki SEMUA sekaligus, bukan
cuma yang ditegur:

- **`AnalisisRetention`** (KPI6) — migrasi PALING BESAR: implementasi lama
  sendiri (filter 1 baris sesak dgn Select+TextField+Switch inline,
  `PeriodTotalBox` 2-kotak+panah manual, `PERIOD_TYPES` lokal yang MASIH
  menyertakan `'ytd'` yang sudah dihapus dari standar §0a). Diganti total
  ke `KpiFilterBar`+`KpiSummaryStrip`+`KpiTableToolbar` — SEKARANG struktural
  identik dgn Analisis Revenue (cuma beda 1 metrik: jumlah transaksi, bukan
  Revenue+GP). Kolom `changePercent`/`_status` juga dirapikan ke
  `minWidth`+`flex` (sebelumnya `width` tetap, berisiko truncation) +
  `hideLabel` di `TrendChip`.
- **`CrossSelling`** & **`CustomerMetrics`** — filter 1-baris lama (tanpa
  Card, lebar default beda-beda, Cabang kadang tidak kelihatan) diganti
  `DateScopeFilterBar` (sama persis dgn yang dipakai Dormant* — §7a).
- **M3 (average revenue trend 12 bulan) dipindah ke halaman Revenue** —
  instruksi user "untuk gambaranmu": chart M3 (`ComboChartWidget` bar+3
  garis avg/median/high-margin%, + dialog drill-down existing) diposisikan
  di BAWAH filter, DI ATAS banner `KpiSummaryStrip`, sesuai contoh urutan
  yang diminta. Komponen `M3Revenue` dipindah dari lokal
  `pages/CustomerMetrics/M3Revenue.tsx` ke shared
  `components/analisis/M3Revenue.tsx` (dipakai 2 halaman sekarang:
  CustomerMetrics tetap seperti semula, Analisis Revenue dapat tambahan
  trend chart via `useCustomerMetrics` yang di-reuse, `period_end` ikut
  `endDate` KpiFilterBar tapi trend-nya SENDIRI selalu 12 bulan rolling,
  TIDAK ikut `periodType`). Helper (`fmtRp`/`fmtRpDetail`/`monthToEndDate`/
  `SectionLabel`/`Row`) diinline ke file baru (bukan cross-page import).
- Urutan halaman final (semua halaman KPI): **Title → Filter → [Chart kalau
  ada] → Banner (KpiSummaryStrip, kalau ada data pembanding) → Toolbar+Tabel**.
- Diverifikasi END-TO-END (login real + backend real, bukan mock) — kelima
  halaman (Retention/CrossSelling/CustomerMetrics/Revenue+M3) screenshot
  ulang, semua konsisten, 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error) frontend & backend.

**Belum disentuh** (di luar scope teguran ini, dicek dulu tapi memang beda
kelompok menu): halaman Customer/Product/Transaction Workbench (Customers,
Products, Transactions, dst.) — bukan bagian dari 10 KPI Executive
Dashboard yang diatur `ux-menu-mapping.md`, filter-nya punya kebutuhan
berbeda (list/ledger, bukan KPI chart+banner+tabel).

## 10. DormantRate/Value/ReactivationRate disamakan PENUH ke pola Revenue (2026-08-07)

Susulan §9 — user menegaskan lagi: "halaman revenue... pattern resmi...
filter sudah komponen sendiri... reuse ke halaman lain... sekarang menu
Pelanggan Hilang, Nilai Hilang, dan Aktivasi buat sama seperti Revenue."
Sebelumnya §7a/§9 cuma menyamakan STRUKTUR filter (Card 2-baris) tapi ke-3
halaman Dormant masih pakai `DateScopeFilterBar` (tanpa periodType/YoY,
alasan: backend belum expose data pembanding). Sekarang backend DIBANGUN
supaya benar-benar apple-to-apple, bukan cuma tampilan luar:

- **Backend** (`metrics.service.ts::getDormantCustomerMetrics`) — sekarang
  hitung ulang `fetchDormantTrend`+`fetchDormantValueRanking` DUA KALI:
  sekali di `period_end` asli, sekali lagi di `period_end` digeser -1 tahun
  (`shiftDateByYears`, fungsi baru lokal). segParams (threshold/scope)
  DI-REUSE (bukan resolve ulang) — cuma `filterDate` yang diganti, supaya
  aturan bisnis (threshold dormant per kategori) TETAP konsisten di kedua
  titik waktu, TIDAK ada perubahan business rule. Response
  `DormantMetricsData` dapat 3 field baru: `dormant_rate_current.
  comparison_value`, `reactivation_current.comparison_value`,
  `value_ranking_total_current`/`value_ranking_total_comparison` (sum
  top-20 lost value, current vs setahun lalu — top-20 DIHITUNG ULANG di
  tanggal pembanding, bukan snapshot ranking yang sama).
- **Frontend** — ketiga halaman (`DormantRate`/`DormantValue`/
  `ReactivationRate`) diganti dari `DateScopeFilterBar` ke `KpiFilterBar`
  penuh (periodType+YoY) + `KpiSummaryStrip` banner sungguhan (bukan
  placeholder), growth pct dihitung client-side (`computeChangePct`, fungsi
  baru per halaman — backend cuma kasih raw value+comparison_value, bukan
  pct siap pakai seperti Revenue/Retention, jadi frontend yang hitung).
  Dormant Rate & Dormant Value pakai `inversePolarity: true` (naik = buruk);
  Reactivation Rate polaritas normal (naik = baik).
  `DormantRate` — Grid split chart+panel info lama (dormant count/total
  customer) DIHAPUS, digantikan `KpiSummaryStrip` + 1 baris caption kecil
  di bawah chart (biar info count tidak hilang total tapi tidak duplikasi
  dgn banner).
  Urutan akhir SEMUA 3 halaman: **Filter → Chart → Banner → (Tabel, kalau
  ada — cuma DormantValue yang punya)**, PERSIS urutan halaman Revenue.
- `DateScopeFilterBar` TETAP dipakai CrossSelling/CustomerMetrics (backend
  keduanya juga belum ada struktur pembanding sama sekali, beda kasus dari
  Dormant yang trend-nya sendiri sudah 12-bulan rolling jadi comparison-nya
  gampang diturunkan) — TIDAK dipaksa ikut migrasi backend yang sama,
  scope terpisah kalau nanti diminta.
- Diverifikasi END-TO-END dgn data asli: Dormant Rate 74.8% vs 39.1%
  tahun lalu (▲91.3%), Nilai Hilang Rp3.6M vs Rp259.3jt (▲999%+, growth
  ekstrem — capped display, bukan bug), Reactivation Rate 0% vs 1.9%
  ("Berhenti", correctly resolved dari currentIsZero). 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error) frontend & backend.

## 11. Tabel KPI8 & KPI10 dibangun (2026-08-07) — user tanya "mana tabel pelanggan tidak aktif dan aktivasi?"

Kedua tabel ini sebelumnya ditandai "❌ bangun" (belum ada), keluar dari
scope §7a/§9/§10 yang cuma soal filter/banner. User tanya langsung —
dibangun sekarang:

- **KPI8 (Pelanggan Tidak Aktif)** — REUSE endpoint `/customers?status=
  dormant` yang SUDAH ADA (dipakai halaman Customers), bukan endpoint baru.
  Pola sama dgn "Keputusan A" (reuse tabel Analisis Revenue/Retention di
  KPI3/6). Server-side pagination/sort/search (712 baris di data test,
  bukan snapshot top-20). Kolom: Perusahaan, Customer, Transaksi Terakhir,
  Bulan Dormant (dihitung client-side dari `last_invoice_date` vs
  `as_of_date` — endpoint ini tidak expose field itu langsung), Revenue/
  Bulan.
  ⚠️ **Konsekuensi RBAC dicatat**: butuh permission `customer:view`
  tambahan (bukan cuma `churn.risk:view`) — default role admin/user sudah
  membundel keduanya; kalau ada custom role yang PUNYA churn.risk:view
  TANPA customer:view, tabel ini akan 403. Risiko sama persis dgn yang
  sudah diterima sebelumnya utk M3Revenue di halaman Revenue
  (`expansion:view` vs `analisis:view`) — bukan pola baru, existing
  trade-off "reuse over duplication".
- **KPI10 (Aktivasi Kembali)** — endpoint BARU (tidak ada yang bisa
  di-reuse): `fetchReactivatedCustomers()` di `m8m10.repository.ts`,
  dipanggil dari `getDormantCustomerMetrics` (masih 1 endpoint gabungan,
  field baru `reactivated_customers` di response). Window definisi
  reaktivasi PERSIS sama dgn yang dipakai `fetchDormantTrend` utk hitung
  `reactivated_count` bulan terakhir (dormant sampai akhir bulan sebelum
  `period_end`, lalu ada transaksi lagi di bulan berjalan) — supaya jumlah
  baris tabel KONSISTEN dgn angka di chart/banner, bukan definisi window
  sendiri yang beda. Top-20 by tanggal reaktivasi terbaru, snapshot
  (client-side search, bukan server pagination — sama pola KPI9). Kolom:
  Perusahaan, Customer, Sebelum Dormant (transaksi terakhir sebelum
  dormant), Tanggal Aktivasi Kembali, Lama Dormant (Bulan).
- Header "Terakhir Sebelum Dormant" sempat overflow di 1440px (diverifikasi
  via `scrollWidth > clientWidth`, bukan cuma visual tebak) → dipersingkat
  jadi "Sebelum Dormant".
- Diverifikasi END-TO-END dgn data real: KPI8 nunjukkan 712 pelanggan
  dormant (real, server-paginated); KPI10 di periode 0% reaktivasi
  nunjukkan tabel kosong dgn pesan yang benar (BUKAN bug — memang tidak
  ada yang reaktivasi), lalu diuji ulang di periode dgn reaktivasi 5.6%
  (April 2026) → tabel terisi 20 baris data konsisten dgn banner.
- `tsc --noEmit` + `eslint src` bersih (0 error) frontend & backend.

## 12. Pembelahan CustomerMetrics (M3-M7) jadi 5 halaman KPI (2026-08-07)

User minta lanjut ke KPI lain; dikonfirmasi 3 keputusan lewat AskUserQuestion:
1. **Sekalian semua M3-M7** jadi 5 halaman (bukan cuma KPI3+4 dulu).
2. Nama KPI3: **`/customer-revenue`**.
3. Permission: **backend endpoint direname/disatukan** (bukan cuma nambah
   gate baru di atas endpoint lama) — risiko lebih tinggi tapi lebih bersih.

### Temuan penting sebelum eksekusi (verifikasi kode, bukan asumsi)

- M4/M5/M6/M7 SEMUANYA sudah punya breakdown table lengkap **via Dialog**
  (`useGpBreakdown`/`useHmBreakdown`/`useRorBreakdown`/`useExpansionBreakdown`,
  masing-masing keyed by `drillDate` state dari klik bar/chart) — bukan
  "❌ bangun dari nol", tapi "formalisasi dialog jadi tabel persisten"
  (BUKAN pekerjaan sekecil kelihatannya di v9 §3, tapi juga tidak
  se-berat kalau harus bikin query API baru).
- M5's "chart tren high margin 2 seri" (Kontribusi % + Penetrasi %) BISA
  dibangun dari data trend YANG SUDAH ADA — `high_margin_ratio` (=
  penetrasi, sudah dihitung backend di `m3m7.repository.ts:299`) dan
  `hm_revenue`/`total_revenue_existing` (= kontribusi, sudah dihitung
  client-side di M3Revenue). TIDAK perlu endpoint baru.
- KPI3 & KPI6 py2 sudah punya tabel YoY lengkap di `/analisis/revenue` &
  `/analisis/retention` (dipakai reuse) — TAPI M3Revenue & M6RepeatOrder
  py2 juga punya dialog breakdown SENDIRI (snapshot 1-bulan, beda dari
  tabel YoY). Diputuskan: dialog lama DIHAPUS di KPI3/KPI6 (redundan
  dgn tabel YoY yang lebih lengkap), TIDAK dihapus fungsinya tapi
  digantikan — sesuai v9 §1 "dialog transisi s.d. tabel live, lalu
  dihapus".
- ⚠️ **Risiko RBAC nyata**: permission lama (`expansion:view` gate SELURUH
  bundel M3-M7, `analisis:view`, `analisis.retention:view`) sudah dipakai
  di `role_permissions` PRODUCTION untuk role admin/user/custom manapun.
  Rename permission TANPA migrasi backfill = user existing kehilangan akses
  diam-diam. **WAJIB backfill**: role manapun yang py2 punya permission
  lama otomatis dikasih permission baru yang setara (bukan cuma update
  `seed.ts` utk instalasi baru).

### Rencana final — nama route/page/permission

| KPI | Label | Route baru | Page | Permission baru | Sumber tabel |
|---|---|---|---|---|---|
| 3 | Jumlah pelanggan loyal | `/customer-revenue` | `CustomerRevenue` | `customer.revenue:*` | Reuse tabel Analisis Revenue (YoY) |
| 4 | Keuntungan pelanggan loyal | `/customer-gross-profit` | `CustomerGrossProfit` | `customer.gross.profit:*` | Formalisasi dialog M4 → tabel persisten |
| 5 | Pembelian produk fokus (penetrasi HM) | `/high-margin-penetration` | `HighMarginPenetration` | `high.margin.penetration:*` | Formalisasi dialog M5 → tabel persisten + chart tren baru |
| 6 | Pembelian berulang | `/repeat-order` | `RepeatOrder` | `repeat.order:*` | Reuse tabel Analisis Retention (YoY) |
| 7 | Peningkatan nilai belanja | `/customer-expansion` | `CustomerExpansion` | `customer.expansion:*` | Formalisasi dialog M7 → tabel persisten |

- `high.margin.penetration` SENGAJA beda dari `high.margin:*` yang sudah
  dipakai halaman "High Margin Push" (Product & Portfolio, konsep beda:
  push = tracking produk, penetration = % customer yang beli) — dicek
  dulu tidak ada bentrok nama.
  `customer.expansion` SENGAJA beda dari `expansion:*` lama (yang di-retire)
  — bukan cuma tambahan huruf, benar-benar permission baru.
- Filter: KPI3/KPI6 pakai `KpiFilterBar` (periodType+YoY, ikut pola tabel
  yang direuse). KPI4/5/7 pakai `DateScopeFilterBar` (single-date, sesuai
  breakdown hook masing-masing yang cuma terima `period_end` tunggal).
- Tabel KPI4/5/7 di-bind LANGSUNG ke tanggal filter halaman (bukan
  `drillDate` terpisah dari klik bar) — persistent, selalu tampil,
  bukan menunggu klik. Klik bar/chart DIHAPUS (bukan filter tabel — itu
  scope lebih besar/belum ada preseden di codebase manapun, ditunda).
- `/customer-metrics` (route lama) DIHAPUS, redirect ke `/customer-revenue`
  (KPI3 = kartu pertama grup ini, entry point paling wajar).
  `/analisis/revenue` → redirect `/customer-revenue`.
  `/analisis/retention` → redirect `/repeat-order`.
- Backend: 5 permission trio baru (`:menu/:view/:export`) ditambah ke
  `seed.ts`; route lama (`expansion:*` dkk) DIBIARKAN ada di DB (harmless,
  konsisten pola `OLD_PERMISSION_NAMES`) TAPI role manapun yang py2 punya
  permission lama di-backfill otomatis dapat yang baru (SQL migrasi
  sekali jalan, dieksekusi ke local+dev, PROD nanti pas deploy).
- menu.tsx: 3 item lama (`expansion`, `analisis-revenue`, `analisis-retention`)
  diganti 5 item baru, TETAP di grup/urutan yang sama (bukan rework
  kategori §6a).

Status: eksekusi dimulai sekarang.

### Status: SELESAI dieksekusi (2026-08-07)

- **Backend**: 5 permission trio baru ditambahkan ke `seed.ts`
  (`customer.revenue`/`customer.gross.profit`/`high.margin.penetration`/
  `repeat.order`/`customer.expansion`), `analisis:*`/`analisis.retention:*`
  di-rename (route handler diupdate ke permission baru), `expansion:*`
  TETAP ada khusus utk endpoint chart gabungan `/metrics/customer-metrics`.
  Fungsi baru `migrateRenamedPermissions()` — backfill generik ke SEMUA
  role (termasuk custom, bukan cuma admin/user hardcoded) yang py2 punya
  permission lama, jalan otomatis tiap `db:seed`. `bun run db:seed` sudah
  dijalankan di DB lokal, 5 permission trio + 5 page_settings baru masuk.
- **Frontend**: `Analisis`→`CustomerRevenue`, `AnalisisRetention`→
  `RepeatOrder` (rename folder via `git mv`, konten yang sudah dibangun
  fase sebelumnya DIPERTAHANKAN utuh — filter/banner/tabel KpiFilterBar
  dkk sudah match). M6 chart (RadialBar) DITAMBAHKAN ke RepeatOrder
  (sebelumnya cuma tabel, sekarang lengkap chart+tabel). M3's line3
  (Kontribusi High Margin %) DIHAPUS dari `M3Revenue.tsx` sesuai keputusan
  "Pemisahan M3" (v9 §9 poin 5) — TIDAK dipindah ke KPI5 dalam fase ini
  (lihat catatan follow-up di bawah).
  3 halaman baru dibuat dari nol: `CustomerGrossProfit` (KPI4),
  `HighMarginPenetration` (KPI5), `CustomerExpansion` (KPI7) — masing-masing
  `DateScopeFilterBar` + chart existing (M4/M5/M7, dipindah ke
  `components/analisis/` sama pola dgn M3/M6, helper diinline bukan
  cross-page import).
  `pages/CustomerMetrics` (bundel lama) DIHAPUS total.
  Redirect permanen: `/customer-metrics`→`/customer-revenue`,
  `/analisis/revenue`→`/customer-revenue`, `/analisis/retention`→
  `/repeat-order`. `NotificationDetailDialog.tsx` (satu-satunya pemanggil
  internal ke `/analisis/revenue`) diupdate navigasi LANGSUNG ke
  `/customer-revenue` (bukan lewat redirect) — supaya query string
  (company_id/period_key/dst.) tidak hilang (`<Navigate>` statis TIDAK
  meneruskan search params).
  `routeConstants.tsx`/`routeLazyComponents.tsx`/`menu.tsx`/
  `Config/Features/index.tsx` diupdate semua (3 item lama → 5 item baru,
  posisi/urutan grup TETAP sama, bukan rework kategori §6a).
- **BELUM dikerjakan (follow-up, dicatat eksplisit, bukan dilewatkan
  diam-diam)**:
  1. Tabel persisten KPI4/5/7 — MASIH pakai dialog drill-down lama (klik
     chart → dialog), BELUM diformalkan jadi tabel persisten spt KPI8/9/10.
     Datanya sudah lengkap (breakdown hook + kolom sudah ada di dialog),
     tinggal "angkat" ke `KpiTableToolbar`+`ResponsiveListView` persisten +
     hapus dialog — kerja mekanis, bukan riset baru.
  2. Chart tren high-margin 2 seri (Kontribusi % + Penetrasi %) di KPI5 —
     BELUM dibangun. Datanya SUDAH tersedia di trend (`high_margin_ratio` +
     `hm_revenue`/`total_revenue_existing`), tinggal dibuatkan
     `AreaChartWidget`/`LineAlertWidget` 2-garis, mengikuti pola M8's
     LineAlertWidget.
- Diverifikasi END-TO-END (login real + backend real via Playwright): 5
  halaman baru render benar dengan data asli, 3 redirect (`/customer-metrics`,
  `/analisis/revenue`, `/analisis/retention`) semua mengarah ke tujuan yang
  benar, sidebar tampil 5 item baru, 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error) frontend & backend.

### Susulan (2026-08-07) — user tanya "kenapa tabel dan filternya belum menyesuaikan template sesuai revenue"

Follow-up §12 poin 1 di atas DIKERJAKAN SEKARANG (bukan ditunda lagi) untuk
KPI4/5/7 — user menegaskan filter+tabel harus benar-benar apple-to-apple,
bukan cuma halaman/route/permission-nya yang terpisah:

- **Filter**: `DateScopeFilterBar` → `KpiFilterBar` (periodType+YoY penuh)
  di ketiga halaman.
- **Banner KpiSummaryStrip**: YoY NYATA (bukan placeholder) — dihitung dari
  2x panggil `useCustomerMetrics` (endDate & `shiftDateByYears(endDate,-1)`),
  ambil scalar dari `trend.at(-1)` (`avg_gross_profit`/`high_margin_ratio`/
  `up_rate`). TIDAK perlu endpoint backend baru — trend sudah 12-bulan
  rolling per titik waktu, sama trik yang dipakai M3-di-Revenue.
- **Tabel**: dari dialog drill-down (klik bar → `drillDate` state) jadi
  PERSISTEN — breakdown hook (`useGpBreakdown`/`useHmBreakdown`/
  `useExpansionBreakdown`) langsung di-bind ke `endDate` filter, render via
  `KpiTableToolbar`+`ResponsiveListView` di bawah banner (search + count,
  server-side pagination/sort). Chart (M4/M5/M7 shared component) TIDAK
  diubah — dialog klik-bar-nya tetap ada di situ sbg drill historis
  terpisah, sekarang JUGA ada tabel persisten independen di halaman.
- `computeChangePct()` (sebelumnya diduplikasi 3x di DormantRate/
  DormantValue/ReactivationRate) DIPUSATKAN ke `utils/analisisComparison.ts`
  — dipakai 6 halaman sekarang, 3 lama diupdate importnya.
- Diverifikasi END-TO-END dgn data real: KPI4 Rp1.16jt→Rp0 ("Berhenti"),
  KPI5 0%→0% ("Belum ada data"), KPI7 27.4%→0.0% ("Berhenti") + tabel 240
  baris data asli tanpa truncation. 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error).
- **Masih follow-up** (tidak berubah dari sebelumnya): chart tren 2-seri
  high-margin di KPI5 belum dibangun.

## 13. M2 (KPI2, Cross Selling) — tabel persisten (2026-08-07)

User: "tren produk KPI M2 belum dikerjakan" — M2 (Rata-rata jumlah produk
yang dibeli, `/cross-selling`) masih dialog drill-down lama per v9 §3
("❌ bangun — jadikan tabel persisten di bawah chart, bukan dialog").

- **Bukan halaman baru** — M2 tetap section di `/cross-selling` (beda dari
  M3-M7 yang dipecah jadi halaman terpisah); KPI1 (Heatmap) di halaman yang
  sama sudah persisten sejak awal, cuma M2 yang masih dialog.
- **Temuan penting**: dialog M2 sebelumnya pakai `useCrossSellingDetail`
  (endpoint TERPISAH), padahal `getCrossSelling` (hook UTAMA yang sudah
  jalan di halaman) SUDAH mengembalikan `data.detail` — array yang PERSIS
  SAMA. Dialog memanggil endpoint yang SAMA 2x dengan `period_end` sama.
  Diperbaiki: hapus `useCrossSellingDetail` + dialog, `data.detail` dari
  hook utama langsung dipakai tabel persisten — TIDAK ADA request baru.
- Filter TETAP `DateScopeFilterBar` (bukan KpiFilterBar) — halaman ini
  cakupannya KPI1+KPI2 sekaligus (beda dari M3-M7 yang 1 KPI = 1 halaman),
  `getCrossSelling` juga tidak expose struktur YoY.
- Kolom tabel (`colCustomerCode`/`colCustomerName`/chip Unit-Consumable-
  Sparepart/`colCategoryCount`/`colTotalRevenue`) dikonversi `width` tetap
  → `minWidth`+`flex` (anti-truncation, pola konsisten dgn tabel KPI lain).
- Diverifikasi END-TO-END dgn data real: 201 pelanggan (periode April
  2026), semua header tabel tanpa truncation (`scrollWidth>clientWidth`
  dicek langsung, bukan tebak visual). 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error).

## 14. Pemisahan CrossSelling → 2 halaman (KPI1/KPI2) + hapus ProductsTrend (2026-08-07)

User (setelah §13 di atas selesai): "menu mana yang kamu kerjakan? menu tren
produk belum ada tabel nya?" — ternyata ada halaman TERPISAH `/products/trend`
(`ProductsTrend`, permission `product.trend:*`) yang belum disentuh. Setelah
diperiksa, `ProductsTrend` memakai endpoint SENDIRI (`/metrics/avg-category`,
`fetchAvgCategoryTrend` di `avg-category.repository.ts`) yang HANYA
mengembalikan trend agregat (`current_avg`/`prev_avg`/`change_pct`/`trend[]`) —
TIDAK ADA data per-customer sama sekali (beda dari `getCrossSelling` yang
sudah punya `data.detail`). Ditanyakan ke user via AskUserQuestion; jawaban:

> "Halaman tersebut redundan, tapi halaman yang kamu kerjakan juga 1 page
> untuk 2 KPI yang harus dipisahkan itu menyalahi aturan"

Dua keputusan sekaligus:

1. **`ProductsTrend` (`/products/trend`) DIHAPUS** — redundan, cuma duplikat
   tampilan M2 pakai endpoint terpisah yang lebih lemah (tanpa tabel, tanpa
   detail per customer). Permission `product.trend:*` DIBIARKAN orphan di DB
   (konvensi lama — tidak pernah hard-delete permission), redirect statis
   `/products/trend` → route KPI2 baru.
2. **`CrossSelling` (`/cross-selling`) sendiri melanggar "1 KPI = 1 halaman"**
   — bundel KPI1 (Cross-Selling Ratio, M1+M1.1 Heatmap) + KPI2 (Rata-rata
   kategori per customer, M2) dalam 1 route. Ini sama persis pola lama
   DormantCustomer/CustomerMetrics yang sudah dibelah — harus dibelah juga,
   BUKAN dipertahankan sebagai "pengecualian sengaja" seperti klaim §13 yang
   sekarang KELIRU (§13 bilang "beda dari M3-M7 yang 1 KPI = 1 halaman" —
   ternyata itu salah baca aturan, v9 §1 tidak punya pengecualian untuk
   cross-selling).

**Rencana pemisahan** (tanpa tanya lanjutan — mengikuti preseden penamaan
`/customer-revenue` dkk., §12):

- **KPI1** tetap di `/cross-selling` (`CrossSelling`, route/permission lama
  DIPERTAHANKAN — least churn utk bookmark/notifikasi lama): Filter →
  2-card (Cross-Sell Rate, Active Customer) → M1 ComboChart → M1.1 Heatmap +
  dialog drill produk (TETAP, ini sudah "tabel" per §7 adaptasi KPI1 = heatmap).
- **KPI2** halaman BARU `/avg-category-per-customer`
  (`AvgCategoryPerCustomer`): Filter → 1-card (Avg Kategori/Customer) → M2
  AreaChart → tabel persisten (`data.detail`, kolom sama dgn tabel M2 §13).
- **Endpoint backend TETAP 1** (`/metrics/cross-selling` via `useCrossSelling`)
  — dipanggil dari KEDUA halaman baru, sama presedennya dgn Dormant (§7a):
  data KPI1+KPI2 secara struktural nyambung 1 query (trend bulanan, heatmap,
  detail per-customer semua dihitung dari agregat customer×kategori yang
  sama), memisah jadi 2 endpoint cuma nambah round-trip tanpa manfaat nyata.
- **Permission TETAP 1** (`cross.selling:*`, reuse di 2 halaman) — sama
  alasan dgn endpoint: data sumbernya memang satu, beda dari CustomerMetrics
  (yang endpoint breakdown-nya SUDAH terpisah per-KPI sejak awal).
- **Filter TETAP `DateScopeFilterBar`** (bukan `KpiFilterBar`) — `getCrossSelling`
  tidak expose struktur YoY comparison (`prev_period`/dua kali panggil
  dgn `shiftDateByYears` TIDAK applicable di sini karena field ratio/avg
  category historisnya perlu window bulanan yang sama, bukan snapshot
  tunggal — beda kasus dgn GP/HM/Expansion di §12-susulan yang trend-nya
  memang per-titik-waktu rolling). **Catatan follow-up**: kalau nanti user
  minta YoY juga di KPI1/KPI2, perlu endpoint baru — dicatat sbg gap, BUKAN
  dikerjakan diam-diam sekarang.
- Redirect statis di `App.tsx`: `/products/trend` → `/avg-category-per-customer`.
- Menu (`menu.tsx`): item `product-trend` (Group 3 Product & Portfolio)
  DIHAPUS; item baru `avg-category-per-customer` ditaruh di Group 2 (Customer
  Workbench), tepat setelah `cross-selling` — sama grup dgn KPI1, keduanya
  bagian dari 10 KPI Executive Dashboard yang menu-nya dikelompokkan di
  Customer Workbench (`ProductsTrend` sebelumnya salah taruh di Product &
  Portfolio gara-gara nama "produk").
- i18n namespace baru `avgCategoryPerCustomer.json` (id/en); `crossSelling.json`
  kunci M2 (`m2*`) TIDAK dihapus — masih hidup, dipindah pemakaiannya ke
  halaman baru (bukan didup­likasi ke namespace baru, biar 1 sumber string).

## 15. Rework kategori menu.tsx (§6a, dieksekusi sekarang) — 2026-08-07

User: "sekarang klasifikasikan menu sesuai dokumen ux-menu-mapping.md" — §6a
di atas menunda rework ini sampai "cukup banyak KPI individual selesai
dibangun". Sekarang seluruh 10 KPI + intercompany-nya sudah punya halaman
sendiri (KPI1-10 semua split, task025 §7a/§12/§14), jadi syarat §6a
terpenuhi.

**Masalah**: `menu.tsx` sekarang mengelompokkan SEMUA 10 halaman KPI + menu
"Customer" (list mentah) jadi satu grup `nav.groups.customerWorkbench`
("Customer Workbench") — pengelompokan PER JENIS KONTEN (semua yang
"berbau customer"), padahal `ux-menu-mapping.md` §0/§2 eksplisit: "Per
domain bisnis (4 kategori + 1 afiliasi), BUKAN per jenis konten".

**Rencana** (mengikuti §2 tree persis, label diambil verbatim dari dokumen):

| Grup baru | Isi (permission tetap, TIDAK direname) |
|---|---|
| Executive Dashboard (tetap) | Dashboard |
| **Ragam Pembelian** (baru) | Cross Selling (KPI1), Rata-rata Kategori/Pelanggan (KPI2) |
| **Nilai Pelanggan Loyal** (baru) | Customer Revenue (KPI3), Keuntungan Pelanggan (KPI4) |
| **Pertumbuhan Pembelian** (baru) | Pembelian Produk Fokus (KPI5), Pembelian Berulang (KPI6), Peningkatan Belanja (KPI7) |
| **Pelanggan Tidak Aktif** (baru) | Pelanggan Tidak Aktif (KPI8), Nilai Hilang (KPI9), Aktivasi Kembali (KPI10) |
| Afiliasi Antarperusahaan | **BELUM dibuat** — `/intercompany` masih scope tertunda (§9 poin 10); grup ini TIDAK ditambahkan ke menu dulu, tidak ada halaman utk di-link. Ditambahkan nanti begitu fitur intercompany selesai. |
| Customer Workbench (tetap, isi menyempit) | Customer (list mentah) — SATU-SATUNYA isi sekarang setelah 10 KPI dipindah keluar; tetap dipertahankan sbg grup terpisah krn ini "mikro: siapa yang beli" (CLAUDE.md), beda scope dari 10 KPI makro |
| Produk & Portofolio, Transaksi & Revenue, Administrasi | tidak berubah |

- **Permission TIDAK berubah sama sekali** — ini murni pengelompokan visual
  (`groupLabelKey` per item), bukan rename/pindah permission. Setiap item
  KPI cuma pindah grup, path/permissionKey persis sama dgn sebelumnya.
- **Urutan dalam grup** ikut urutan KPI di §2 dokumen (1→10), BUKAN urutan
  lama (yang sebelumnya taruh Dormant sebelum Cross Selling).
- **`tierLabelKey: 'nav.tiers.overview'`** (nempel di `customer-revenue`)
  DIHAPUS — sisa dari skema 2-tier "Ringkasan/Tren vs Detail per Customer"
  task023 §3a yang cuma relevan SELAMA M3-M7 masih 1 halaman gabungan
  (`/customer-metrics`). Sekarang tiap KPI sudah 1 halaman sendiri isi
  chart+tabel sekaligus, jadi pembedaan tier itu tidak berlaku lagi — kalau
  dibiarkan cuma nongol sbg caption aneh di atas 1 item doang. Key i18n
  `nav.tiers.*` (sudah tidak dipakai di mana pun lagi setelah ini) ikut
  dihapus.
- `Config/Features/index.tsx` (`GROUP_KEY_MAP`, `GROUP_KEY_ORDER`,
  `ITEM_ORDER`) ikut diupdate supaya toggle fitur di halaman admin
  konsisten dgn pengelompokan sidebar yang baru — halaman itu render grup
  berdasarkan map yang sama, kalau tidak disinkronkan tampilannya beda dgn
  sidebar sungguhan.
- i18n: 4 key grup baru (`nav.groups.purchaseVariety/loyalCustomerValue/
  purchaseGrowth/inactiveCustomers`) ditambahkan id/en; `nav.groups.
  customerWorkbench` label TETAP dipakai (bukan dihapus) krn masih
  menaungi menu Customer list.

## 16. Susulan §14 — parity penuh KpiFilterBar + audit i18n (2026-08-07)

User, 3 pesan berturut-turut setelah §15 selesai:
1. "filter beberapa halaman masih pakai filter template lama, bukankah
   seharusnya komponen filter sudah 1 kesatuan atomic komponen..."
2. "lalu juga card diatas tabel informasi summary belum kamu pasang"
3. "bukankah sudah jelas aku bilang template standar baru adalah seperti
   halaman revenue\nlalu penamaan menu dan i18n belum konsisten masih
   banyak yang bahasanya campuran indonesia dan inggris\naudit menyeluruh
   dan perbaiki semua all page all komponen"

**Temuan filter**: 3 keluarga filter hidup — `KpiFilterBar` (8 halaman,
"template resmi"), `DateScopeFilterBar` (CrossSelling+AvgCategoryPerCustomer
saja, TANPA YoY, sengaja dicatat sbg gap di komponennya sendiri §13/§14),
`ScopeFilterFields` inline (Dashboard/Customers/Products/Transactions/
ProductsHighMargin — beda use-case, bukan halaman KPI single-metric, TIDAK
disentuh — Dashboard genuinely multi-KPI monthly-only, bukan kandidat
KpiFilterBar).

**Perbaikan**: `useCrossSelling` trend SUDAH 12-bulan rolling per titik
waktu (persis sama sifatnya dgn `useCustomerMetrics` yang dipakai trik YoY
di §12-susulan) — jadi gap "backend belum expose YoY" yang dicatat di
`DateScopeFilterBar.tsx`/task025 §14 ternyata BISA ditutup tanpa endpoint
baru. CrossSelling & AvgCategoryPerCustomer diubah:
`DateScopeFilterBar`→`KpiFilterBar`, banner `KpiSummaryStrip` YoY nyata
(2x panggil `useCrossSelling`, endDate & `shiftDateByYears(endDate,-1)`,
scalar dari `trend.at(-1)?.ratio`/`?.avg_category`). Sekarang SEMUA 10
halaman KPI pola filter+banner-nya identik (Revenue = referensi).
Dead code `useCrossSellingDetail` (hook tak terpakai sejak §13) dihapus.

**Audit i18n** (temuan `nav.json` dkk campuran ID/EN tanpa pola jelas):
- Login page SEBENARNYA sudah benar (auth.json id sudah "Masuk"/"Kata
  Sandi" dst) — screenshot awal yang kelihatan Inggris cuma karena browser
  test (Playwright headless) defaultnya locale `en-US`, BUKAN bug aplikasi.
  Diverifikasi ulang dgn `context: { locale: 'id-ID' }` — benar Indonesia.
- Bug NYATA yang ditemukan: banyak value di `id/*.json` literal berisi kata
  Inggris ("Customer", "Division", "Setting High Margin", kalimat penuh
  "Top Dormant Customer — Ranked by Estimated Lost Value" di
  `dormantValue.json`). Prinsip perbaikan yang dipakai (bukan translate
  buta semua): **kata benda umum dalam kalimat** → Indonesia penuh
  ("customer"→"pelanggan", "Division"→"Divisi"); **nama metrik/istilah
  formal Title Case** (mis. "Dormant Customer Rate", "Existing Customer",
  "Customer Expansion Rate", "Executive Dashboard", "Customer Workbench")
  DIBIARKAN — ini istilah teknis/nama-metrik resmi yang dipakai konsisten
  di formula/dokumentasi (metrics.md) dan nama arsitektur (CLAUDE.md), body
  desimal Bahasa Indonesia yang kaku memaksa terjemahkan justru melanggar
  [[feedback_bahasa_natural]]. Loanword universal (Email, Login, Export,
  Import, Dashboard, PDF, API) juga dibiarkan — sudah lazim dipakai apa
  adanya di software bisnis Indonesia.
- File diperbaiki: `nav.json` (id+en, + hapus 10 key orphan peninggalan
  bundle lama: crossSelling/customerMetrics/dormantCustomer/analisis/
  analisisRevenue/analisisRetention/expansionTargets/churnRisk/profile/
  highMarginSettings), `crossSelling.json` (id+en, ditulis ulang bersih —
  hapus 21 key orphan dari iterasi chart/dialog lama), `customerMetrics.json`
  (hapus 2 key root orphan, translate ~15 kalimat), `dormantRate.json`,
  `dormantValue.json` (translate 1 chart title yang FULL bahasa Inggris),
  `reactivationRate.json`, `divisionManagement.json` (id+en), `divisions.json`,
  `customerIntercompany.json`, `paretoCustomers.json`, `highMargin.json`,
  `common.json`, `customers.json`, `notifications.json`, `products.json`,
  `productsHighMargin.json`, `config.json`, `analisis.json`.
- **BELUM selesai** (scope 40 file id/*.json, sisanya belum diaudit satu-
  satu): halaman admin lain (Users/RBAC/AuditLog/dll), teks MUI DataGrid
  bawaan ("Rows per page", "1–10 of 21" — perlu `LocalizationProvider`+
  `localeText` MUI, bukan sekadar t() aplikasi). Dicatat sbg follow-up,
  BUKAN diklaim selesai 100%.
- Diverifikasi END-TO-END dgn `context: { locale: 'id-ID' }` (Playwright) —
  7 halaman dicek visual, 0 console error, JSON semua file valid
  (`JSON.parse` check).
- `tsc --noEmit` + `eslint src` bersih (0 error) frontend.

## 17. FilterBarShell — Dashboard ikut disatukan (2026-08-07)

User (pesan berikutnya, setelah §16 di-PR): "dashboard utama masih memakai
filter lama". Benar — baris 1 KpiFilterBar & bekas-DateScopeFilterBar
SUDAH identik (copy-paste), tapi Dashboard punya versi ke-3 yang beda
chrome-nya sama sekali: `<Box>` polos (bukan `Card`+2-baris), `ScopeFilterFields`
TANPA lebar tetap (stretch), TANPA tombol Reset.

- **`components/filters/FilterBarShell.tsx`** (baru) — memusatkan baris 1
  ("SIAPA": Perusahaan/Cabang/Divisi lebar tetap 240/160/200 + toggle
  intercompany + Reset, dibungkus `Card`+`Divider`) yang SEBELUMNYA
  di-copy-paste identik antara `KpiFilterBar` dan bekas-`DateScopeFilterBar`.
  Baris 2 ("KAPAN") SENGAJA tidak dipusatkan — kontrolnya genuinely beda
  per halaman (periodType+tanggal / tanggal tunggal / bulan), caller kirim
  lewat `children` (pemisahan SIAPA/KAPAN ini sudah ada di ux-menu-mapping.md
  §1 sejak awal, cuma implementasinya belum benar-benar disatukan).
- `KpiFilterBar` direfactor pakai `FilterBarShell` — behavior/tampilan
  TIDAK berubah, cuma baris 1 sekarang 1 sumber.
- **`DateScopeFilterBar` DIHAPUS TOTAL** — sejak §16 (CrossSelling/
  AvgCategoryPerCustomer pindah ke `KpiFilterBar`), komponen ini sudah
  tidak dipakai halaman manapun (0 import, cuma nyisa di komentar).
- **Dashboard** (`/dashboard`) sekarang pakai `FilterBarShell` juga — baris
  2 isinya `MonthYearPicker` (Ringkasan genuinely multi-KPI bulanan, bukan
  1 metrik dgn pembanding YoY, jadi TIDAK pakai periodType+YoY seperti
  KpiFilterBar). Reset sekarang benar-benar reset scope+periode (sebelumnya
  Dashboard malah tidak punya tombol Reset sama sekali).
- Diverifikasi visual (Playwright, locale id-ID): Dashboard, Revenue,
  Cross Selling, Rata-rata Kategori, Dormant Rate — chrome filter bar
  (lebar field, posisi Reset, Card+Divider) identik piksel-demi-piksel di
  semua halaman. 0 console error.
- `tsc --noEmit` + `eslint src` bersih (0 error).

