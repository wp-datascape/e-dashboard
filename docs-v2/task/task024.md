# Task 024 — Dashboard: Lapisan Interpretasi Data (Null vs Nol, Polaritas, Insight)

> Status: 🟡 Sebagian selesai — quick wins frontend sudah dikerjakan (§2), sisanya
> (§3) butuh keputusan produk + perubahan kontrak backend sebelum eksekusi.
> Dipicu audit UX Executive Dashboard yang di-supply user (heuristik Nielsen +
> spesifikasi empty-state/tooltip), diverifikasi ulang terhadap kode nyata
> (bukan diterima mentah) sebelum dieksekusi. Lanjutan [[task023]] (audit UX
> menyeluruh) — item bahasa & tooltip di sini overlap dengan task023 §4.

## 1. Konteks

User men-supply analisis UX Dashboard (dari sumber eksternal) yang menyimpulkan:
masalah terbesar Dashboard bukan visual, tapi **interpretasi** — sistem tidak
membedakan "belum ada data" dari "nilai nol beneran", dan warna badge delta
tidak sadar polaritas metrik (naik selalu dianggap hijau/baik, padahal untuk
Dormant Rate/Value naik itu buruk).

Setiap klaim teknis di analisis tersebut diverifikasi langsung ke kode sebelum
dieksekusi:

| Klaim | Status verifikasi |
|---|---|
| Badge warna tidak sadar polaritas (dormant naik = hijau) | **Terkonfirmasi** — `StatCard.tsx` chipColor cuma dari `trend`, tidak tahu metric_key |
| Default periode = bulan berjalan | **Terkonfirmasi** — `Dashboard/index.tsx` state awal `currentYearMonth()` |
| Glosarium "Definisi Kunci" di dasar halaman | **Terkonfirmasi** — Row 3, section terakhir |
| Redundansi StatCard ↔ chart detail (metrik sama tampil 2x) | **Terkonfirmasi** — `mCrossRatio`, `mAvgCategory`, `mHighMargin`, `mRepeatOrder`, `mExpansion`, `mDormantRate`, `mReactivation` masing-masing muncul di Row 1 (StatCard) DAN Row 2 (chart) |
| Tidak ada timestamp "data diperbarui" | **Terkonfirmasi** — tidak dirender di mana pun, TAPI key i18n `dashboard.lastUpdated` ("Terakhir diperbarui") sudah ada dari sebelumnya, tidak pernah dipakai — kemungkinan fitur ini pernah direncanakan tapi tidak dituntaskan |
| Tick sumbu tidak dibulatkan (86.02) | **Terkonfirmasi** — `AreaChartWidget`/`LineAlertWidget` tanpa `tickFormatter` sama sekali, `BarChartWidget` formatter-nya opsional/tidak selalu dipakai |
| Bahasa campur ("Window Aktif", "Overview Metrics") | **Terkonfirmasi** di `id/dashboard.json` — bahkan ada 2 key beda utk konsep sama (`activeWindow`="Jendela Aktif" vs `activeWindowStripLabel` lama="Window Aktif") |
| Data kosong digambar sebagai 0 literal (bukan gap/null) | **Terkonfirmasi, DAN lebih dalam dari dugaan** — bukan cuma bug frontend, tapi struktural: SEMUA repository metrik (`m1.repository.ts`, `avg-category.repository.ts`, `high-margin-penetration.repository.ts`, dst) pakai `generate_series()` + `COALESCE(nilai, 0)`, jadi di level SQL pun "bulan tanpa transaksi" dan "bulan dengan hasil hitung 0" sudah tidak bisa dibedakan lagi sebelum sampai ke API |
| Notifikasi cap di "99+" | Terkonfirmasi ada (`NotificationBell.tsx`), tapi ini pilihan gaya bukan bug — tidak diprioritaskan |

## 2. Sudah Dikerjakan (quick win, frontend-only, tanpa ubah kontrak API)

- **`frontend/src/utils/metricPolarity.ts`** (baru) — `INVERSE_POLARITY_METRIC_KEYS`
  (`dormant_rate`, `dormant_value`) + `isGoodTrend()`, dipusatkan supaya halaman
  lain bisa reuse kalau butuh (lihat §4 latent risk).
- **`StatCard.tsx`** — prop baru `inversePolarity`, badge warna sekarang
  `isGood ? success : error` (bukan `isPositive` mentah). Panah arah (↑/↓)
  TETAP ikut trend asli — cuma warna yang dibalik untuk metrik inverse, supaya
  tidak ada kontradiksi arah-vs-warna sebaliknya.
- **`Dashboard/index.tsx`** — pass `inversePolarity={isInversePolarityMetric(metric.metric_key)}`
  ke tiap StatCard.
- **`utils/format.ts`** — `formatAxisTick()` baru (bulatkan ke integer kalau
  dekat bulat, else 1 desimal).
- **`BarChartWidget`, `AreaChartWidget`, `LineAlertWidget`** — Y-axis
  `tickFormatter` default ke `formatAxisTick` (BarChartWidget: prop
  `yAxisFormatter` sekarang defaultnya `formatAxisTick`, bukan `undefined` —
  caller lain masih bisa override kalau perlu format lain mis. Rupiah).
- **`id/dashboard.json`** — `"Overview Metrics"` → `"Ringkasan Metrik"`,
  `"Window Aktif"` → `"Jendela Aktif"` (disamakan dengan key `activeWindow`
  yang sudah benar dari awal).
- (Dari sesi sebelumnya, [[task023]]) — glosarium "Definisi Kunci" sudah
  ditulis ulang jadi bahasa manusia (bukan `last_transaction_date >= ...`
  mentah), MonthYearPicker lebar+locale sudah dibenerin.

## 3. Belum Dikerjakan — Butuh Keputusan Produk / Perubahan Kontrak Backend

### 3a. Null vs Nol (paling besar dampaknya, paling besar effort-nya)

**Root cause**: setiap repository metrik generate 1 baris per bulan lewat
`generate_series()`, lalu `COALESCE(agregat, 0)` — bulan tanpa transaksi SAMA
PERSIS dengan bulan yang hasil hitungnya kebetulan 0. Frontend tidak mungkin
membedakan keduanya karena datanya sudah hilang sejak level SQL.

**Keputusan yang perlu diambil dulu**:
- Apakah "no data" didefinisikan per BULAN (tidak ada satu pun invoice di
  bulan itu untuk company/scope terfilter) — ini yang paling gampang dihitung
  (`EXISTS` check terpisah dari agregat utama)?
- Field baru di response: `has_data: boolean` per titik `monthly_trend`, DAN
  di level `MetricSummary` (`current_value` bisa jadi "no data" juga kalau
  bulan berjalan belum ada transaksi sama sekali)?
- Berlaku ke SEMUA 10 metrik, atau cuma yang relevan (beberapa metrik seperti
  `dormant_value` mungkin secara bisnis "0" itu valid dan jarang ambigu)?

**Scope teknis kalau dilanjutkan** (perkiraan, belum final): ubah tiap
repository di `backend/src/features/metrics/repository/*.ts` (perkiraan 8-10
file) supaya subquery agregat expose row-exists sebelum di-COALESCE, propagate
`has_data` lewat service → `MetricCard`/`MonthlyTrendPoint` type → frontend
(StatCard tampilkan "—" abu-abu bukan "0.0%", chart gambar gap bukan garis ke
titik 0, Donut/Radial/Bullet tampilkan state "Belum ada data" bukan
"✗ Di Bawah Target").

### 3b. Default periode = bulan berjalan (padahal ada lag data)

Perlu didefinisikan dulu "bulan lengkap terakhir" itu apa — bulan kalender
sebelum bulan berjalan (`period_end - 1 bulan`, sederhana tapi bisa juga masih
kosong kalau lag lebih dari 1 bulan)? Atau bulan terakhir yang punya minimal N
transaksi tercatat (butuh query tambahan saat load Dashboard)? Setelah
definisi disepakati: ganti `useState(currentYearMonth())` jadi default hasil
definisi itu, tambah tag "Data preliminer" kalau user tetap pilih bulan
berjalan secara manual.

### 3c. Timestamp "Data terakhir diperbarui"

Key i18n `dashboard.lastUpdated` sudah ada tapi tidak dipakai — kemungkinan
sisa rencana lama. Backend perlu expose kapan data terakhir di-import/dihitung
(mis. `MAX(created_at)` dari `invoices` per company scope, atau timestamp
`metric_cache` terakhir) di response `DashboardData`, baru frontend render di
`PeriodStrip`/header.

### 3d. Strategis (tidak mem-blok, tapi bernilai — urutan bebas)

- **Insight banner otomatis** (2-3 kalimat ringkasan di atas, mis. "Dormant
  naik +2,6% MoM melampaui ambang 10%") — fitur baru, perlu rule generation
  sendiri (bukan cuma UI).
- **Redundansi StatCard ↔ chart** (§1 tabel) — konsolidasi butuh keputusan
  desain: StatCard dihapus & chart jadi satu-satunya representasi, atau
  sebaliknya, atau StatCard row dibuat "ringkasan" tanpa duplikasi chart detail
  di bawahnya (chart detail cuma muncul saat card diklik/drill-down).
  Ini AKAN mengubah kembali urutan/isi grup Executive Dashboard — lihat catatan
  di [[task023]] §3c soal belum ada audit tier ringkasan/detail utk halaman
  non-Customer-Workbench.
- **Urutan KPI berdasarkan risiko** — perlu skema prioritas per metrik
  (mis. yang di bawah/di atas ambang tampil duluan), bukan urutan tetap.
- **Glosarium jadi tooltip ⓘ** — mengubah lokasi & interaksi (hover/focus/tap),
  bukan cuma teks. Halaman "Definisi Kunci" penuh bisa jadi fallback/link.
- **Audit aksesibilitas kontras** — perlu pengukuran kontras aktual (WCAG AA),
  bukan tebakan dari deskripsi visual.
- **Saved view / export / mode perbandingan MoM-YoY** — fitur baru, di luar
  perbaikan interpretasi data.

## 4. Catatan — Latent Risk Lain (belum jadi bug nyata, cuma flag)

`BarChartWidget` sendiri punya badge delta (`change` prop) dengan logic
polaritas yang SAMA seperti StatCard sebelum diperbaiki (`isPositive = change
>= 0`, warna hijau/merah tanpa tahu metric_key). Saat ini TIDAK ada bug nyata
karena kedua pemanggilnya di Dashboard (`mCrossRatio`, `mExpansion`) kebetulan
sama-sama metrik "naik = baik". Kalau nanti ada BarChartWidget dipasang untuk
metrik inverse-polarity (mis. dormant), fix yang sama (prop `inversePolarity`
dari `metricPolarity.ts`) perlu diterapkan juga di sana.
