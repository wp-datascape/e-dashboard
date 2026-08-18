---
target: frontend/src/pages/CustomerRevenue/index.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-18T14-58-47Z
slug: frontend-src-pages-customerrevenue-index-tsx
---
Method: dual-agent (A: design-review subagent · B: detector-scan subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | KpiMetricCard/PeriodYoyBanner tidak punya state loading sendiri saat data pembanding masih fetching |
| 2 | Match System / Real World | 3 | Istilah "GP"/"GM"/"Pareto" muncul tanpa penjelasan di badan halaman |
| 3 | User Control and Freedom | 3 | Tombol Reset menghapus seluruh state filter sekaligus tanpa konfirmasi |
| 4 | Consistency and Standards | 2 | BarChartWidget selalu dibungkus Card, M3Revenue di sebelahnya tidak — dalam 1 baris Grid yang sama |
| 5 | Error Prevention | 4 | Guard isEmptyPeriod mencegah alarm palsu massal "-100%" — solid |
| 6 | Recognition Rather Than Recall | 1 | Warna Avg/Median Revenue berbeda antara KpiMetricCard/BarChartWidget vs M3Revenue untuk metrik yang sama persis |
| 7 | Flexibility and Efficiency | 2 | disableColumnMenu di-set eksplisit, tidak ada saved filter view, cuma 1 kolom sortable |
| 8 | Aesthetic and Minimalist Design | 1 | 5-6 Card berbobot sama, 6-8 hue aktif bersamaan, angka yang sama tampil 3-4x |
| 9 | Error Recovery | 3 | Alert isEmptyPeriod spesifik dan tepat konteks |
| 10 | Help and Documentation | 2 | Cuma 1 tooltip info di seluruh halaman, tidak merata ke istilah lain yang sama-sama butuh |
| **Total** | | **24/40** | **Acceptable — perlu perbaikan signifikan sebelum terasa "profesional"** |

## Design Specificity Verdict

**LLM assessment**: Generic, bukan spesifik untuk produk ini. Arketipe filter bar → banner → 2 kartu → 2 chart → DataGrid adalah pola paling umum dashboard admin, bisa dipasang label CRM/ERP/e-commerce apa pun tanpa terasa janggal. Tidak ada elemen yang menonjolkan konsep bisnis unik holding company 3 entitas (mis. "exclude intercompany" cuma jadi Switch generik, bukan visual yang menegaskan struktur holding). Komentar kode sendiri di `index.tsx` baris 438-442 mengakui `BarChartWidget` di halaman ini adalah "adaptasi" paksa dari referensi `executive-kpi-dashboard/KPI3View` yang aslinya menampilkan metrik berbeda ("Existing Active Count") — bukti langsung template ditarik dan dipaksakan, bukan dirancang dari kebutuhan domain.

**Deterministic scan**: `detect.mjs` terhadap `CustomerRevenue` + komponen `analisis`/`filters`/`charts`/`tables` — 2 temuan, exit code 2:
1. `side-tab` (warning/slop) — `KpiMetricCard.tsx:49`, border kiri 3px berwarna. Kemungkinan false positive murni relatif terhadap rule ini — komentar kode menyatakan ini keputusan sengaja, distandarisasi ke 9 halaman KPI (task026 §8k) — tapi secara independen berkorelasi dengan temuan P0 di bawah soal pemakaian warna aksen yang berlebihan.
2. `layout-transition` (warning/quality) — `BulletChartWidget/BulletChartWidget.tsx:106`, `transition: width` alih-alih `transform: scaleX()`. Valid, bukan false positive — berpotensi layout thrash, meski dampak kecil untuk satu bar di widget kecil.

**Visual overlays**: tidak tersedia — tidak ada browser automation tool (Playwright/Puppeteer/dsb) di sesi ini untuk inspeksi live ke `dev-dashboard.semanggi.id`. Tidak ada overlay [Human] yang bisa ditampilkan.

## Overall Impression

Keluhan "terlalu ramai dan tidak terkesan profesional" akurat dan bisa ditelusuri ke sumber konkret: 7 dari 8 item cognitive-load checklist gagal, skor heuristik terendah justru di Aesthetic/Minimalist (1/4) dan Recognition (1/4) — dua area yang paling langsung berhubungan dengan kesan "ramai". Masalah terbesar bukan kekurangan komponen, tapi PENGULANGAN: angka Avg/Median Revenue yang sama tampil di 3-4 bentuk visual berbeda dalam satu layar, dan 6-8 hue warna aktif bersamaan padahal cuma 2-3 yang benar-benar bermakna semantik. Kekuatan yang ada (filter terpusat, guard alarm palsu, mobile accordion) solid dan tidak perlu disentuh — masalahnya murni di lapisan visual/informasi, bukan arsitektur.

## What's Working

1. **Sentralisasi filter (`KpiFilterBar`/`FilterBarShell`)** — pemisahan baris "SIAPA" (scope) vs "KAPAN" (waktu), lebar field tetap, dipakai konsisten di 10 halaman KPI. Disiplin rekayasa yang baik, hasil iterasi dari feedback nyata.
2. **Guard `isEmptyPeriod`** — mengubah potensi 952 baris false-alarm "-100%" merah menjadi satu Alert netral tepat sasaran. Perbaikan yang benar-benar melindungi kepercayaan user pada data.
3. **`AutoCard` di `ResponsiveListView` untuk mobile** — accordion collapsed-by-default, pola progressive disclosure yang lebih baik dibanding kebanyakan dashboard admin yang memaksa scroll horizontal.

## Priority Issues

**[P0] Avg/Median Revenue ditampilkan 3-4x dalam bentuk visual berbeda**
- **Apa**: `index.tsx` baris 413-474 — 2× `KpiMetricCard` menampilkan Avg/Median Revenue, langsung diikuti `BarChartWidget` yang memplot ANGKA YANG SAMA PERSIS sebagai chart 1-kategori (`data={[{label, avg, median}]}`), langsung diikuti `M3Revenue` yang titik terakhirnya juga angka yang sama.
- **Kenapa penting**: kemungkinan besar sumber tunggal terbesar kesan "ramai". Bar chart 1-titik-data bukan visualisasi tren, cuma menggambar ulang angka yang sudah besar 2 langkah scroll sebelumnya.
- **Fix**: hapus `BarChartWidget` di halaman ini (komentar kode sendiri mengakui ini "adaptasi" tanpa padanan data asli), atau ganti dengan visual yang menambah info baru (distribusi/histogram revenue per customer).
- **Suggested command**: $impeccable distill

**[P0] 6-8 hue warna aktif bersamaan, dekoratif bukan bermakna**
- **Apa**: `theme.custom.data` (theme/index.ts) dipakai di `PeriodYoyBanner` (icon + tint success/error), 2× `KpiMetricCard` (border aksen), `BarChartWidget` (warna bar), `M3Revenue` (primary + 2 warna lain), `ParetoBadge` (info) — semua aktif di satu layar. Detector menandai border-kiri `KpiMetricCard.tsx:49` sebagai pattern "side-tab" (AI-slop tell paling dikenali).
- **Kenapa penting**: dashboard eksekutif B2B biasanya terasa profesional justru karena warna dijaga minim dan bermakna (1-2 aksen + merah/hijau semantik), bukan 6-8 hue untuk variasi dekoratif.
- **Fix**: batasi `theme.custom.data` multi-hue cuma untuk chart yang benar-benar butuh ≥3 seri simultan (M3); kartu/badge yang cuma butuh 1 aksen pakai `primary` atau netral saja.
- **Suggested command**: $impeccable quieter

**[P1] Warna metrik yang sama berbeda makna antar-widget bersebelahan**
- **Apa**: Avg Revenue = `data[0]` di `KpiMetricCard`/`BarChartWidget`, tapi `data[1]` di `M3Revenue` (~200px ke kanan) — untuk angka yang persis sama.
- **Kenapa penting**: melanggar "recognition rather than recall" — sistem token warna yang dirancang untuk konsistensi malah jadi tidak bisa diandalkan sebagai penanda makna.
- **Fix**: selaraskan mapping warna Avg/Median across widget, atau tambahkan legenda eksplisit.
- **Suggested command**: $impeccable harden

**[P1] 5-6 Card berbobot visual sama, tidak ada hierarki menuju tabel**
- **Apa**: FilterBarShell → PeriodYoyBanner → 2× KpiMetricCard → BarChartWidget + M3Revenue → Card tabel, semua pakai primitif Card identik (border 1px, radius 0, tanpa elevation).
- **Kenapa penting**: tidak ada sinyal visual mana yang paling penting — tabel (konten utama halaman) tidak terlihat lebih menonjol dari filter bar di atasnya.
- **Fix**: turunkan bobot visual filter bar + banner (tanpa border/shadow, cukup garis bawah tipis), biarkan cuma Card tabel yang full-styled.
- **Suggested command**: $impeccable layout

**[P2] Istilah domain (Pareto) tanpa bantuan inline**
- **Apa**: `ParetoBadge` + toggle "hanya Pareto" tidak punya tooltip, padahal pola `InfoOutlinedIcon`+tooltip sudah ada di `M3Revenue` untuk section lain.
- **Kenapa penting**: "Pareto" (aturan 80/20) tidak otomatis dipahami semua user eksekutif; pola bantuan sudah ada tapi diterapkan tidak merata.
- **Fix**: tambahkan tooltip yang sama persis dengan pola M3Revenue ke badge/toggle Pareto.
- **Suggested command**: $impeccable clarify

**[P2] Animasi `width` alih-alih `transform` di BulletChartWidget**
- **Apa**: `BulletChartWidget.tsx:106` — `transition: width 0.5s ease` (ditemukan detector, dikonfirmasi valid, bukan false positive).
- **Kenapa penting**: animasi properti layout (width/height/padding/margin) memicu layout thrash — praktik teknis, dampak kecil di widget ini tapi pola yang sebaiknya tidak diulang di widget lain.
- **Fix**: ganti ke `transform: scaleX()` dengan `transform-origin: left`.
- **Suggested command**: $impeccable optimize

## Persona Red Flags

**Alex (Power User)**: Cuma kolom `current` yang `sortable: true` — kolom `changePercent` (paling berguna untuk triase cepat) eksplisit `sortable: false`. `disableColumnMenu` di-set eksplisit, power user kehilangan quick-filter/pin kolom bawaan MUI DataGrid. Tidak ada saved filter view. Tombol Reset menghapus SELURUH state filter dalam 1 klik tanpa konfirmasi.

**Sam (Accessibility)**: Arah tren (▲/▼) dikodekan lewat glyph Unicode + warna di dalam label StatusChip, tanpa teks alternatif eksplisit — risiko screen reader kehilangan arah tren. Chart Recharts (hover-only tooltip, `onBarClick` untuk drill-down) tidak punya jalur keyboard yang jelas untuk melihat breakdown angka.

## Minor Observations

- `FONT_MONO` di theme didefinisikan sama dengan `FONT_PRIMARY` (`"Plus Jakarta Sans"`, bukan monospace) — nama konstanta menyesatkan, dipakai untuk variant `caption` seolah untuk digit tabular.
- `MuiCard`/`MuiPaper` pakai `borderRadius: 0` (kotak tajam), sementara `MuiButton` pakai radius 10 dan `StatusChip` pakai pill 999px — 3 bahasa bentuk sudut berbeda aktif bersamaan.
- Kalimat rentang tanggal "Periode aktif vs Pembanding YoY" muncul dua kali dalam ~100px vertikal (caption di KpiFilterBar, lalu blok di PeriodYoyBanner) — pengulangan info yang sama persis di 2 chrome berdekatan.
- `Grid spacing={2}` seragam untuk semua blok — tidak ada gap lebih besar antar kelompok yang secara logis tidak berhubungan (filter vs KPI vs tabel).

**Catatan lintas-halaman**: `PeriodYoyBanner`, `KpiMetricCard`, `KpiFilterBar`, `KpiTableToolbar` adalah komponen terpusat dipakai di 10 halaman KPI. Temuan P0 (hue berlebihan) dan P1 (Card berbobot sama) berlaku otomatis ke semua 10 halaman itu karena berasal dari komponen bersama. Temuan "bar chart 1-kategori redundan" kemungkinan spesifik ke halaman ini — perlu dicek satu-satu apakah 9 halaman KPI lain punya BarChartWidget dengan data multi-kategori yang lebih valid atau masalah serupa.

## Questions to Consider

- Kalau `BarChartWidget` (bar Avg vs Median) dihapus total, apakah ada informasi yang benar-benar hilang, atau halaman jadi lebih tenang tanpa kehilangan data apa pun?
- Bagaimana kalau `PeriodYoyBanner` dan 2 `KpiMetricCard` digabung jadi satu baris 3-4 tile metrik dengan SATU bahasa visual, bukan 2 pola berbeda yang bersaing merebut perhatian yang sama?
- Seperti apa halaman ini kalau dibatasi grayscale + 1 warna brand + merah/hijau semantik saja, dan hue tambahan cuma dipakai di SATU chart yang memang butuh 3+ seri simultan?
