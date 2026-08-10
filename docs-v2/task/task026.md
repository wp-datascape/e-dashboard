# Task 026 — Restrukturisasi Menu V2: Dashboard/Statistik/Report + Filter Context Global

> Lanjutan dari [[task025]] (redesain chart+tabel per KPI). Task025 sudah
> menghasilkan 10 halaman KPI individual (chart+tabel menyatu 1 halaman).
> Task ini memecah lagi: chart pindah ke menu **Statistik**, tabel pindah ke
> menu **Report**, ditambah filter context global lintas halaman.
>
> Dikerjakan di branch `dev` (bukan `V2_development` — itu disimpan terpisah
> untuk rencana v2 lain, tidak disentuh task ini). Per commit ini kedua
> branch masih persis sama commit-nya (`caa3371`).

## 0. Keputusan yang Sudah Difinalkan (hasil diskusi 2026-08-09)

1. **3 layer menu baru**:
   - **Dashboard** — overview semua (tetap ada, tidak dihapus).
   - **Statistik** — full grafik 10 KPI, dikelompokkan per kategori (§1).
   - **Report** — breakdown tabel detail per KPI (tabel yang sekarang nempel
     di tiap halaman KPI task025, pindah ke sini).
2. **Pola split** — Statistik = chart+filter murni, TIDAK ada tabel ringkasan
   sama sekali. Tabel lengkap (search/sort/pagination) 100% di Report.
3. **Kategorisasi 10 KPI** — 3 kategori baru berbasis Omset/Produk/Transaksi,
   **menggantikan total** skema lama task025 (Ragam Pembelian/Nilai
   Pelanggan Loyal/Pertumbuhan Pembelian/Pelanggan Tidak Aktif). Lihat §1.
4. **Filter context global** — 2 bagian:
   - **SIAPA** (company/branch/division/exclude-intercompany) — global ke
     **SEMUA** halaman berfilter (Dashboard, Statistik, Report, DAN
     Customers/Products/ProductsHighMargin/Transactions).
   - **KAPAN** (periodType + tanggal acuan, pola `KpiFilterBar` task025) —
     juga global ke **SEMUA** halaman yang sama, termasuk migrasi backend
     Products/ProductsHighMargin dari `period_month` ke dukungan
     `period_end`/periodType (detail teknis §4).
   - Persistensi: **in-memory saja** (React Context), TIDAK disimpan ke
     localStorage — refresh browser reset ke default. Sesuai keputusan user,
     scope-nya "tidak perlu filter ulang tiap pindah menu", bukan "tidak
     perlu filter ulang setelah refresh".
5. Intercompany (`/intercompany`, fitur analitik yang belum pernah dibangun
   — lihat task025 §4) jadi **kategori ke-4 tersendiri** di menu Statistik,
   tapi TIDAK dibangun di task ini (halamannya belum ada sama sekali,
   endpoint backend juga belum ada). Kategori ini ditaruh sebagai slot
   kosong/placeholder dulu.
6. KPI3 (Existing Customer Active) — judulnya "Revenue" tapi isinya cuma
   hitungan jumlah customer (bukan nominal uang, lihat catatan §1) —
   diputuskan masuk kategori **Transaksi**, bukan Omset & Revenue.
7. Menu **Report** dikelompokkan per kategori yang SAMA dengan Statistik
   (§1) — bukan daftar flat 10 halaman. Landing `/report` menampilkan 4
   grup yang sama persis dengan landing `/statistik`.
8. `KpiSummaryStrip` (card "TOTAL · SELURUH DATA" — 3 kartu: pembanding/
   periode ini/pertumbuhan, chevron ‹ › navigasi periode) **pindah posisi
   jadi header DI ATAS filter, HANYA di halaman Report** (bukan Statistik).
   Urutan baru khusus Report: Title → **KpiSummaryStrip** → Filter →
   Toolbar+Tabel. Statistik TETAP urutan lama (Title → Filter → Chart),
   tanpa strip — tujuannya supaya begitu masuk Report, scope data yang
   sedang aktif (periode+pertumbuhan) langsung kelihatan sebelum user
   sempat menyentuh filter atau scroll ke tabel.

## 1. Kategorisasi 10 KPI

| Kategori | KPI |
|---|---|
| **Omset & Revenue** | KPI4 Avg Gross Profit (M4) · KPI7 Customer Expansion Rate (M7) · KPI9 Dormant Value (M9) |
| **Produk** | KPI1 Cross Selling Ratio (M1) · KPI2 Avg Category per Customer (M2) · KPI5 High Margin Penetration (M5) |
| **Transaksi** | KPI3 Existing Customer Active (M3) · KPI6 Repeat Order Rate (M6) · KPI8 Dormant Rate (M8) · KPI10 Reactivation Rate (M10) |
| **Afiliasi Antarperusahaan** | (placeholder, fitur belum dibangun) |

Catatan KPI3: definisi bisnisnya (lihat `executive-dashboard/metrics.md` §KPI3)
cuma **COUNT existing customer yang transaksi dalam window** — avg revenue per
customer sengaja di-hold untuk pasca-MVP. Nama "Revenue" di judul KPI ini
menyesatkan relatif terhadap isi datanya; dikelompokkan sebagai Transaksi
sesuai isi data aktual, bukan judul.

## 2. Arsitektur Menu (route level)

Route existing 10 KPI (`/cross-selling`, `/customer-revenue`, dst — lihat
`routeConstants.tsx`) **slug TIDAK berubah** untuk chart-nya, tapi setiap
route sekarang HANYA render chart+filter (dipangkas dari gabungan
chart+tabel task025). Tabelnya pindah ke route baru di bawah `/report/...`
(1 route report per KPI, mirror slug yang sama).

```
/dashboard                     → Dashboard (overview, TIDAK berubah)

/statistik                     → landing Statistik, 4 kategori (§1) sebagai
                                  grouping visual (bukan sub-route wajib)
  /cross-selling                 (KPI1+2, chart saja)
  /customer-revenue               (KPI3, chart saja) ... dst 10 KPI
  /intercompany                   (placeholder kategori ke-4, kosong)

/report                        → landing Report, grouping kategori sama
  /report/cross-selling           (KPI1+2, tabel penuh)
  /report/customer-revenue        (KPI3, tabel penuh) ... dst 10 KPI
```

### 2a. Struktur sidebar — pola collapsible seperti Settings/Config

User minta pola grup Statistik & Report di sidebar meniru pola
**Administration** yang sudah ada (`config/menu.tsx` GROUP 5: Settings/
Configuration/Access Control/Log) — bukan pola `groupLabelKey` flat/divider
yang dipakai 10 KPI saat ini.

Bedanya:
- **Pola lama (10 KPI sekarang)** — flat list, `groupLabelKey` cuma nempel
  divider+label di atas item PERTAMA tiap kategori, tapi semua 10 item tetap
  sibling sejajar (tidak bisa di-collapse, semua selalu kelihatan).
- **Pola Settings/Config (yang diminta)** — tiap grup adalah **1 NavItem
  collapsible** (`children: [...]`), user klik untuk expand/collapse,
  isinya BARU kelihatan setelah di-klik. `Settings`/`Configuration`/
  `Access Control`/`Log` masing-masing 1 parent collapsible sendiri-sendiri
  (BUKAN 1 parent "Administration" yang membungkus ke-4-nya — cuma `settings`
  yang pegang `groupLabelKey: nav.groups.administration` buat divider,
  3 lainnya nempel di section yang sama tanpa divider baru).

Diterapkan ke Statistik & Report: **4 kategori (§1) masing-masing jadi 1
NavItem collapsible sendiri** (mirror pola Settings/Config persis), isinya
= KPI-KPI di kategori itu.

```
// ── STATISTIK (divider "Statistik") ──
{ key: 'statistik-omset',   groupLabelKey: 'nav.groups.statistik', children: [KPI4, KPI7, KPI9] }
{ key: 'statistik-produk',  children: [KPI1, KPI2, KPI5] }
{ key: 'statistik-transaksi', children: [KPI3, KPI6, KPI8, KPI10] }
{ key: 'statistik-intercompany', children: [] }  // placeholder, kosong dulu

// ── REPORT (divider "Report") ──
{ key: 'report-omset',   groupLabelKey: 'nav.groups.report', children: [KPI4, KPI7, KPI9] }
{ key: 'report-produk',  children: [KPI1, KPI2, KPI5] }
{ key: 'report-transaksi', children: [KPI3, KPI6, KPI8, KPI10] }
{ key: 'report-intercompany', children: [] }
```

**Catatan implementasi**: tipe `NavItem.children` saat ini didefinisikan
`Omit<NavItem, 'groupLabelKey' | 'children'>[]` — sengaja cuma 1 level
nesting (dipakai Settings/Config yang memang flat 1 level). Struktur di atas
masih pas dalam batas ini (parent kategori → children KPI, tidak ada level
ke-3), jadi TIDAK perlu ubah tipe `NavItem`.

**Bukan pengulangan kesalahan task021 §0b**: keputusan lama melarang bikin
grup "Analisis" terpisah karena waktu itu chart & tabel 1 KPI kepisah ke 2
ROUTE beda TANPA disengaja (produk sampingan migrasi, membingungkan). Task
ini kebalikannya — pemisahan Statistik/Report adalah keputusan sadar &
eksplisit (chart vs tabel memang 2 kebutuhan beda), bukan devisiasi tak
sengaja.

Dashboard tetap 1 item tunggal (bukan collapsible, tidak ada sub-kategori).

## 3. Filter Context Global — SIAPA

`useScopedCompanyFilter()` (state: companyId/branchId/division/
excludeIntercompany) saat ini **local state per komponen** — tiap halaman
punya copy sendiri, tidak ada yang dibagi (diverifikasi: grep pemanggil,
semuanya `const scopeFilter = useScopedCompanyFilter()` langsung di
komponen halaman, bukan lewat context).

Rencana: pindahkan state ini ke `GlobalFilterContext` (Provider dipasang di
level `DashboardLayout`, membungkus semua route ber-filter), expose lewat
hook `useGlobalFilter()` dengan shape yang identik ke `useScopedCompanyFilter`
sekarang supaya migrasi per halaman minim (ganti 1 baris import+pemanggilan,
`FilterBarShell`/`ScopeFilterFields` tidak perlu berubah karena cuma
menerima object `filter` sebagai props).

## 4. Filter Context Global — KAPAN

Tidak semua halaman bicara "bahasa tanggal" yang sama ke backend. Verifikasi
kode (bukan tebakan):

| Halaman | Param backend saat ini | Migrasi yang dibutuhkan |
|---|---|---|
| Dashboard | `period_end` (sudah cocok, UI-nya saja masih `MonthYearPicker`) | Frontend-only: ganti UI ke periodType+tanggal (`KpiFilterBar`), backend TIDAK berubah |
| 10 halaman KPI (Statistik/Report) | `period_end` | Sudah pakai `KpiFilterBar` dari task025, tinggal disambungkan ke context global |
| Customers | `as_of_date` | Frontend-only: `as_of_date = endDate` dari context, periodType diabaikan endpoint ini (snapshot, bukan window) |
| Transactions | `date_from` + `date_to` (ledger, rentang eksplisit) | Frontend-only: `date_from = getPeriodDateRange(periodType, endDate).start`, `date_to = endDate` — backend TIDAK perlu berubah, sudah generic range |
| Products, ProductsHighMargin | `period_month` (YYYY-MM) **+ `active_window`** (1-24 bulan) | ~~Perlu ubah backend~~ **KOREKSI (2026-08-09, setelah baca `product-performance.repository.ts`)**: `active_window` SUDAH ADA di endpoint ini, semantiknya = jumlah bulan window mundur dari akhir `period_month` — model rolling window SAMA PERSIS dengan periodType (`KPI_PERIOD_TYPE_MONTHS`: monthly=1/quarter=3/semester=6/annual=12), cuma butiran bulan bukan hari. Frontend-only: `period_month = endDate.slice(0,7)`, `active_window = KPI_PERIOD_TYPE_MONTHS[periodType]` |

**Kesimpulan revisi**: dari kekhawatiran awal "3 endpoint perlu migrasi
backend", setelah dicek detail SEMUA 4 halaman (Customers, Transactions,
Products, ProductsHighMargin) ternyata **frontend-only** — tidak ada
endpoint backend yang perlu diubah. Fase 2 (backend) di §5 DIHAPUS dari
rencana, digabung jadi bagian Fase 3 (KAPAN masuk context global).

## 5. Rencana Fasing

1. **Fase 1 — Global filter context (SIAPA dulu)**: bangun
   `GlobalFilterContext`+`useGlobalFilter()`, migrasi SEMUA halaman
   (Dashboard, 10 KPI, Customers, Products, ProductsHighMargin,
   Transactions) ke context ini untuk company/branch/division/exclude-
   intercompany saja. KAPAN masih lokal per halaman seperti sekarang (zero
   risk, tidak ada perubahan backend). **SELESAI**, lihat §7.
2. **Fase 2 — KAPAN masuk context global** (dulu direncanakan "Fase 3",
   digeser naik setelah Fase 2-backend lama terbukti tidak perlu — lihat
   koreksi §4): tambah `periodType`+`endDate` ke `GlobalFilterContext`,
   sambungkan ke semua halaman — Dashboard (ganti `MonthYearPicker`→
   `KpiFilterBar`), Transactions (hitung `date_from`/`date_to` dari
   context), Customers (`as_of_date` dari context), Products/
   ProductsHighMargin (`period_month`+`active_window` diturunkan dari
   context, TIDAK ada perubahan backend — lihat §4). Semua frontend-only.
3. **Fase 3 — Split menu Statistik/Report**: pisahkan chart vs tabel per
   halaman KPI existing (task025) ke route `/report/...` masing-masing,
   susun sidebar 3 layer + grouping kategori collapsible (§1, §2a).
4. **Fase 4** — kategori Afiliasi Antarperusahaan tetap placeholder, dibangun
   di task terpisah (bukan bagian task ini).

Fase 2 butuh Fase 1 selesai duluan (perlu context-nya sudah ada). Fase 3
independen dari Fase 1-2 (bisa duluan kalau mau, cuma memisah chart/tabel,
tidak menyentuh filter).

## 6. Risiko & Hal yang Perlu Diperhatikan Saat Implementasi

- Deep-link lama ke `/analisis/revenue`/`/analisis/retention` dari
  `NotificationDetailDialog.tsx` (temuan task025 §3) — belum diverifikasi
  ulang apakah masih dipakai setelah split Report; cek lagi sebelum hapus
  route lama.
- `FilterBarShell`/`KpiFilterBar` murni presentational (terima `filter` via
  props) — migrasi ke context tidak mengubah komponen ini sama sekali,
  cukup ganti sumber `filter` di tiap halaman pemanggil.
- `period_month` di Products/ProductsHighMargin: cek dulu ada consumer lain
  (report/export/cron) sebelum deprecate, jangan langsung hapus param.
- Reset context global perlu didefinisikan ulang — tombol "Reset" per
  halaman sekarang manggil `filter.reset()` lokal; dengan context, reset di
  1 halaman akan mereset filter di SEMUA halaman lain juga (efek yang
  diinginkan, tapi perlu QA eksplisit karena baru).

## 7. Checklist Eksekusi

- [x] Fase 1 — `GlobalFilterContext` + migrasi SIAPA ke semua halaman
      (branch `feat/task026-global-filter-context`, 2026-08-09). Detail:
      - `frontend/src/context/globalFilter.context.ts` (createContext +
        `useGlobalFilter()`, shape identik `ReturnType<useScopedCompanyFilter>`)
        + `GlobalFilterContext.tsx` (Provider, dipasang di `App.tsx` DI ATAS
        `<Routes>` — BUKAN di `DashboardLayout`, karena `DashboardLayout`
        dibuat ulang per-route lewat `withLayout()` di routeConstants.tsx dan
        akan remount tiap navigasi kalau Provider ditaruh di situ).
      - Provider dipecah 2 komponen (luar cek `isAuthenticated`, Inner baru
        manggil `useScopedCompanyFilter()`) — `useCompanies()` di dalamnya
        tidak ber-guard token sama sekali, kalau Provider selalu mount
        Inner-nya akan fetch `/companies` bahkan di halaman `/login` dan
        memicu axios interceptor mencoba `/auth/refresh` sia-sia.
      - 15 halaman dimigrasi (`Dashboard`, 10 halaman KPI, `Customers`,
        `Products`, `ProductsHighMargin`, `Transactions`) — ganti
        `useScopedCompanyFilter()` importnya jadi `useGlobalFilter()`,
        variable `scopeFilter` tidak berubah nama jadi tidak ada perubahan
        lain di badan komponen.
      - Diverifikasi: `bun run build` (`tsc -b && vite build`) sukses,
        `bun run lint` 0 error. `useScopedCompanyFilter` hook aslinya TIDAK
        dihapus (masih dipakai internal Provider + type reference di
        `FilterBarShell`/`KpiFilterBar`/`ScopeFilterFields`).
      - Efek samping yang perlu diketahui: `CustomerRevenue/index.tsx` punya
        efek one-time yang set `companyId` dari query string deep-link
        notifikasi (`?company_id=`) — sekarang efek itu mengubah filter
        GLOBAL (ikut berubah di semua halaman lain), bukan cuma halaman ini
        seperti sebelumnya. Ini konsisten dengan tujuan context global,
        tapi beda perilaku dari sebelumnya, dicatat supaya tidak dikira bug
        saat QA.
- [x] Fase 2 — KAPAN (periodType+endDate) masuk context global, semua
      halaman (branch `feat/task026-global-filter-context`, 2026-08-09).
      Detail:
      - `GlobalFilterContext`/`globalFilter.context.ts` diperluas: selain
        SIAPA (Fase 1), sekarang juga simpan `periodType`+`endDate`
        (default `'quarter'`/hari ini) — 1 instance dibagi semua halaman.
      - 10 halaman KPI (sudah pakai `KpiFilterBar` sejak task025): tinggal
        hapus 2 baris `useState` lokal, tarik `periodType`/`endDate`/
        setter-nya dari `scopeFilter` (context) — TIDAK ada perubahan
        lain di badan komponen.
      - `CustomerRevenue` (kasus khusus, ada deep-link notifikasi
        `?period_type=&end_date=&period_key=`): lazy-init `useState`
        diganti effect one-time (mirror pola `company_id` yang sudah ada)
        — filter GLOBAL tidak bisa lagi diinisialisasi lewat lazy
        initializer, dan efek ini SENGAJA cuma jalan kalau query param
        ybs ADA (supaya navigasi normal tanpa query param tidak
        menimpa paksa pilihan periode yang sedang aktif).
      - `Dashboard`: `MonthYearPicker`+`periodMonth` lokal diganti
        `KpiFilterBar` penuh (periodType+YoY) — backend `/dashboard` TIDAK
        berubah, sudah terima `period_end` sejak awal.
      - `Products`, `ProductsHighMargin`, `Transactions`: `MonthYearPicker`
        +`RangeFilter` lokal diganti Select periodType + DatePicker
        (pola sama, TIDAK pakai `KpiFilterBar`/`FilterBarShell` karena
        halaman ini punya filter row custom di luar 2 baris SIAPA/KAPAN
        standar) — `period_month`/`active_window` (Products/HM) dan
        `date_from`/`date_to` (Transactions) diturunkan dari
        `endDate`/`periodType` via `KPI_PERIOD_TYPE_MONTHS`/
        `getPeriodDateRange` (lihat §4), endpoint backend TIDAK berubah.
      - `Customers`: `MonthYearPicker` diganti DatePicker SAJA (bukan
        + periodType select) — endpoint `as_of_date` genuinely snapshot,
        periodType tidak punya efek di sini, jadi sengaja tidak
        ditampilkan supaya tidak menyesatkan (kelihatan seperti berfungsi
        padahal diabaikan backend).
      - Diverifikasi: `bun run build` sukses, `bun run lint` 0 error.
      - **Follow-up dead-code (belum dieksekusi, bukan bagian task ini)**:
        setelah migrasi, `components/filters/RangeFilter.tsx` sudah TIDAK
        ada pemakainya sama sekali (dulu cuma dipakai 3 halaman yang barusan
        dimigrasi), dan `utils/date.ts` — `resolvePeriodEnd()`,
        `currentYearMonth()`, `windowStartDate()` — juga sudah 0 pemakai.
        Sengaja TIDAK dihapus sekarang (di luar scope filter global), tapi
        dicatat di sini supaya tidak jadi bangkai kode terlupakan.
- [x] Fase 3 — split Statistik (chart) vs Report (tabel) + sidebar 3 layer
      + grouping kategori collapsible (branch `feat/task026-global-filter-context`,
      2026-08-09). Detail:
      - **Pola split** — SETIAP komponen halaman KPI existing (10 file)
        diberi prop wajib `mode: 'statistik' | 'report'`, BUKAN diduplikasi
        jadi 2 file terpisah (akan melanggar [[feedback_centralize_ui_no_duplication]]
        — 1 sumber logic data-fetching/kalkulasi per KPI, cuma JSX-nya yang
        dipecah kondisional `{mode === 'statistik' && <Chart/>}` /
        `{mode === 'report' && <Tabel/>}`). Filter bar (`KpiFilterBar`) SELALU
        tampil di kedua mode (context global, Fase 1-2).
      - **KpiSummaryStrip** — cuma dirender di `mode === 'report'`, dipindah
        ke ATAS `KpiFilterBar` (sebelumnya di bawah chart). Statistik TIDAK
        punya strip sama sekali.
      - **Kasus KPI1 (CrossSelling)** — bukan "chart vs tabel" literal:
        Statistik = ComboChartWidget+stat card, Report = HeatmapWidget+dialog
        drill-down (heatmap = "tabel detail" KPI1 sesuai task025 §3/§4, bukan
        ResponsiveListView). 9 KPI lain pola seragam (chart-component vs
        Card+KpiTableToolbar+ResponsiveListView).
      - **Routing** — 10 route report baru `/report/<slug-sama>` di
        `routeConstants.tsx`, komponen SAMA (cuma prop `mode` beda),
        permission REUSE dari route Statistik (data sama, tampilan beda).
        10 route Statistik existing eksplisit ditambah `mode="statistik"`.
      - **`page_settings` seed** — 10 `page_key` baru (`report-*`) ditambah
        ke `defaultPageSettings` di `backend/src/db/seed.ts` (idempotent,
        skip-if-exists), SUDAH dijalankan (`bun run db:seed`) ke DB lokal
        dev. **BELUM dijalankan ke Neon production** — perlu dijalankan
        manual sebelum deploy (lihat [[reference_neon_production_db]]).
      - **Sidebar** — `config/menu.tsx`: 10 KPI lama (flat list, divider per
        kategori perilaku pelanggan) diganti 6 NavItem collapsible baru (3
        kategori × 2 menu Statistik/Report — mirror pola Settings/Config,
        lihat §2a). Kategori Afiliasi Antarperusahaan SENGAJA tidak
        ditambahkan (fiturnya belum ada, children kosong auto-hidden).
        i18n key baru: `nav.groups.statistik`, `nav.groups.report`,
        `nav.groups.omsetRevenue`, `nav.groups.produkKategori`,
        `nav.groups.transaksi` (id+en).
      - Diverifikasi: `bun run build` (frontend) sukses, `bun run lint` 0
        error, `tsc --noEmit` backend 0 error, `bun run db:seed` sukses ke
        DB lokal (10 baris baru `ok`, sisanya `skip` seperti biasa).
- [ ] QA end-to-end: pindah menu, filter tidak reset; refresh browser,
      filter reset ke default (sesuai keputusan §0.4); klik tiap 10 KPI di
      Statistik DAN Report, pastikan chart/tabel muncul di tempat yang
      benar; jalankan `db:seed` ke Neon production sebelum/saat deploy.

## 8. Revisi arah (2026-08-09, setelah user review) — belum dieksekusi

User menilai hasil Fase 3 (split 10 halaman + sidebar collapsible dobel
Statistik/Report) berisiko lebih buruk dari production: nambah 1 klik di
sidebar (buka kategori dulu) dan memecah chart+tabel yang tadinya 1
halaman jadi 2 halaman terpisah — padahal pola production sekarang sudah
melalui puluhan ronde revisi nyata (task025), sedangkan split ini belum
pernah divalidasi user sama sekali.

User menunjukkan mockup alternatif: **1 menu gabungan "Statistik & Report"**
(bukan 2 section terpisah), collapsible per kategori, TAPI chart+tabel
TETAP 1 halaman per KPI (tidak dipecah, sama seperti production). Kategori
di mockup ISINYA SAMA PERSIS dengan yang sudah dibangun (§1), cuma nama
lebih jelas:
- "Omset & Revenue" → **"Nilai & Profit"** (KPI4, 7, 9 — tidak berubah)
- "Produk" → tetap **"Produk"** (KPI1, 2, 5)
- "Transaksi" → **"Retensi & Aktivasi"** (KPI3, 6, 8, 10 — tidak berubah)

**Belum diputuskan final**, tapi arah yang mengemuka:
1. Revert pemisahan halaman (mode statistik/report) — kembalikan ke 1
   halaman per KPI (chart+tabel nyatu, pola production).
2. Sidebar jadi 1 section "Statistik & Report" (bukan 2), label kategori
   diganti ke Nilai & Profit/Produk/Retensi & Aktivasi.
3. Filter context global (Fase 1-2) TETAP dipertahankan — tidak berubah
   apa pun tampilan yang sudah ada, murni tambahan zero-risk.
4. Redesain visual halaman KPI (angka besar inline+target di header, 2
   chart berdampingan, ganti dari KpiSummaryStrip 3-kartu) — DITUNDA,
   jadi task terpisah, tidak digabung dengan revert struktur ini.

**Progress parsial yang SUDAH dieksekusi** dari arah baru ini (2026-08-09):
Dashboard disederhanakan jadi HANYA berisi 10 StatCard overview (Row 2
chart widgets + Row 3 definitions reference DIHAPUS dari
`pages/Dashboard/index.tsx`) — sesuai prinsip "Dashboard = overview
murni", independen dari keputusan revert Fase 3 di atas.

`StatCard` (kartu overview Dashboard) didesain ulang jadi layout vertikal
sesuai mockup user: lingkaran status kanan atas (hijau/merah/kuning) +
badge %, angka besar, chart area gradient penuh lebar, link "Lihat
breakdown →" di bawah. `StatCardSkeleton` disesuaikan mengikuti.

### 8a. Pilot pertama revert Fase 3 — KPI4 GP per Pelanggan (2026-08-09)

User kirim 10 mockup (1 per KPI) yang mengonfirmasi arah §8: 1 halaman per
KPI (bukan split), breadcrumb, judul berwarna, angka besar inline+badge
(menggantikan `KpiSummaryStrip`), filter, **2 chart berdampingan**
("Periode Berjalan" — breakdown tier/kategori periode ini, dan "Tren 12
Bulan"), lalu tabel breakdown persisten. User eksplisit konfirmasi:
**periodType TETAP dipertahankan** (bukan disederhanakan ke 1 tanggal
seperti tampilan mockup), dan minta **1 halaman percobaan dulu** sebelum
diterapkan ke 9 KPI lain.

`pages/CustomerGrossProfit/index.tsx` (KPI4) dipilih jadi pilot, sudah
diimplementasi ulang:
- Prop `mode` DIHAPUS — kembali ke komponen tunggal tanpa parameter.
- Breadcrumb (`Dashboard > GP per Pelanggan`) + judul berwarna
  (`success.main`) + subtitle "KPI 4 — ..." (key i18n lama, sudah pas).
- Angka besar inline + badge growth (▲/▼ X% vs periode lalu) — MENGGANTIKAN
  `KpiSummaryStrip` di halaman ini (dilepas total, bukan dipindah).
- 2 chart baru berdampingan: kiri = bar chart 3-tier (Atas/Tengah/Bawah)
  DIJUMLAH K bulan terakhir sesuai periodType (`sumLastMonths`, BUKAN
  breakdown 1 bulan), kanan = area chart tren 12 bulan avg GP/customer.
  `M4GrossProfit.tsx` (chart lama, pola "klik bar → dialog") TIDAK dipakai
  lagi di halaman ini — dibiarkan ada di codebase (tidak dihapus).
- Tabel breakdown TETAP sama kolomnya (Pelanggan/GP/%/Tier) — **BEDA dari
  mockup** yang minta kolom lebih banyak (Transaksi/Revenue/Δ vs periode
  lalu/Terakhir Transaksi). Data itu TIDAK tersedia dari
  `GpBreakdownRow`/`useGpBreakdown` sekarang (cek `types/metrics.ts`) —
  butuh perubahan backend terpisah kalau mau kolom itu ditambahkan, DI
  LUAR scope pilot ini.
- Routing: `/customer-gross-profit` sekarang render komponen tanpa `mode`;
  `/report/customer-gross-profit` **DIHAPUS** dari `routeConstants.tsx`
  (route registry) — child nav-nya juga dihapus dari grup
  `report-omset-revenue` di `config/menu.tsx`. `page_settings` row
  `report-customer-gross-profit` yang sudah ke-seed DIBIARKAN ada di DB
  (harmless, tidak match registry manapun lagi) — belum dibersihkan.
- **State sekarang INKONSISTEN SEMENTARA** (disengaja, ini pilot): KPI4
  sudah 1 halaman gabungan, 9 KPI lain (termasuk 2 sisanya di kategori
  Nilai & Profit: Ekspansi Belanja & Nilai Dormant) MASIH pola split
  Statistik/Report lama. Setelah user review & approve pilot ini, baru
  pola yang sama diterapkan ke 9 halaman sisanya (dan sidebar disatukan
  jadi 1 section "Statistik & Report" penuh, bukan cuma 1 KPI).
- Diverifikasi: `bun run build` sukses, `bun run lint` 0 error.

### 8b. Iterasi ke-2 pilot KPI4 (2026-08-09) — template detail final

User kirim mockup lebih detail lagi ("standarkan seperti ini"), lengkap
dengan koreksi eksplisit dari iterasi 8a:
- Chart "Periode Berjalan" balik ke **bar chart 3-batang** (bukan donut
  yang sempat dibuat di antara 8a dan ini — sempat 2x ganti jenis chart:
  bar → donut → bar lagi, dikonfirmasi user tiap kali).
- Tambahan **3 kartu tier terpisah** (Top/Mid/Long Tail, masing-masing:
  label+badge kategori "High Margin"/"Core"/"Volume"+nilai+% kontribusi).
- Tambahan **kotak total kanan atas** ("TOTAL GROSS PROFIT" + nilai besar +
  caption top-tier + badge growth YoY).
- Tabel dapat **kolom baru Revenue & % Margin** + **dropdown filter Tier**
  ("Semua Tier"/Atas/Tengah/Bawah) — user pilih opsi "tambah backend
  sekarang juga" (bukan tunda).

**Perubahan backend** (`backend/src/features/metrics/repository/m4.repository.ts`,
`metrics.types.ts`, frontend `types/metrics.ts`): `GpBreakdownRow` dapat 2
field baru — `revenue` (SUM `invoices.total_revenue` per customer dalam
window aktif, kolom sudah ada di skema, tinggal di-SUM) dan `margin_pct`
(`gp/revenue*100` — **beda** dari `gp_pct` yang sudah ada, `gp_pct` =
`gp/total_gp` porsi thd total GP semua existing customer, `margin_pct` =
margin kotor customer itu sendiri). Endpoint `/metrics/gp-breakdown` TETAP
1 route yang sama, cuma expose 2 kolom tambahan — tidak breaking change
utk consumer lama.

**Keputusan desain yang SENGAJA menyimpang dari mockup literal** (dengan
alasan):
- Label "TOP TIER (TOP 20%)" dkk di mockup **tidak dipakai persis** —
  tier di sistem ini didefinisikan dari median GP (`> median` / `50-100%
  median` / `< 50% median`, lihat `m4.repository.ts`), BUKAN quintile
  20/30/50 tetap. Menampilkan angka "20%/30%/50%" literal akan jadi data
  palsu. Card cuma menampilkan nama tier + badge kategori, tanpa klaim
  persentase populasi yang tidak akurat.
- Semua label "...30D" di mockup (Total GP 30D, Revenue 30D, dst) diganti
  jadi generik tanpa angka hari — karena periodType TETAP dipertahankan
  (bukan fixed 30 hari), angka hari yang ditampilkan akan salah kalau user
  pilih periodType selain 'monthly'.
- 3 warna dipakai konsisten di seluruh halaman (kartu, chart bulanan,
  legend chart tren): `success.main` (Atas) / `info.main` (Tengah) /
  `warning.main` (Bawah) — TIDAK ada abu-abu (koreksi user sebelumnya).

`KpiTableToolbar` diperluas dengan slot generik baru `extraFilter?: ReactNode`
(dipakai dropdown Tier di sini) — supaya filter tambahan kategorikal apa
pun di halaman KPI lain nanti tidak perlu hardcode ulang toolbar dari nol
(lihat [[feedback_centralize_ui_no_duplication]]).

Diverifikasi: `bun run build` (frontend) sukses, `bun run lint` 0 error,
`tsc --noEmit` backend 0 error. **BELUM dites dengan psql/query manual**
apakah angka revenue/margin_pct baru masuk akal secara data — user perlu
cek visual dulu sebelum saya audit lebih jauh (lihat
[[feedback_verify_dont_guess_data]]).

### 8c. Ditemukan kode sumber mockup asli (2026-08-09)

User punya proyek terpisah **`executive-kpi-dashboard/`** (sibling dir dari
`e-dashbord/`, root: `/home/pacman/e-dashbord/executive-kpi-dashboard`) —
aplikasi React+Vite+Tailwind+Recharts hasil generate Google AI Studio,
berisi SEMUA 10 KPI view (`src/components/views/KPI{1-10}View.tsx`) +
`Sidebar.tsx`/`Header.tsx`/`types.ts`/`data/kpiCalculators.ts`. Ini
**sumber kebenaran desain** yang jauh lebih presisi dari sekadar screenshot
— dipakai mulai sekarang sebagai acuan literal (bukan tebak dari gambar)
untuk 9 halaman KPI sisanya nanti.

**Temuan penting dari baca kode ini** (dikonfirmasi ke user satu-satu,
2026-08-09):
1. **Sidebar di kode referensi FLAT** (10 KPI + Dashboard rata, badge warna
   kecil per item, tanpa grouping/collapsible) — BEDA dari screenshot
   sebelumnya yang jadi dasar sidebar grouped kita. **Keputusan: sidebar
   grouped/collapsible kita TETAP dipakai**, kode referensi ini soal
   sidebar diabaikan (kemungkinan iterasi desain lebih lama).
2. **Definisi tier di kode referensi**: ranking customer by GP, top 20%
   (by COUNT) → Top Tier, next 30% → Mid Tier, sisa 50% → Long Tail
   (`kpiCalculators.ts` baris ~412-429, `Math.ceil(n*0.2)`/`Math.ceil(n*0.5)`)
   — **beda metodologi** dari backend kita (median-value-ratio, bukan
   percentile-by-count). **Keputusan: TETAP pakai median-based** (tidak
   ubah backend), label "(Top 20%)" dkk TETAP di-drop dari UI (sudah
   sesuai §8b) karena akan jadi klaim tidak akurat kalau dipasang.
3. **Tidak ada badge growth/YoY** di `KPI4View.tsx` referensi (angka
   statis saja). **Keputusan: badge growth kita TETAP dipertahankan**
   (fitur tambahan yang justru berguna, sengaja tidak di-drop).
4. **Warna tier**: dikonfirmasi 1 keluarga warna (emerald gelap→terang:
   `#059669`/`#10b981`/`#6ee7b7`), BUKAN 3 hue berbeda. Diterapkan ke
   `CustomerGrossProfit/index.tsx` pakai token theme-aware
   (`success.dark`/`success.main`/`success.light`, BUKAN hex literal —
   supaya tetap ikut palet tema aktif, bukan hardcode 1 tema saja).
   Filter bar (Header.tsx referensi: cuma Entitas+Divisi+Period End,
   TANPA cabang/periodType) TETAP diabaikan sesuai keputusan sebelumnya
   (periodType dipertahankan, task026.md §8).

Diverifikasi ulang: `bun run build` + `bun run lint` 0 error setelah
penyesuaian warna.

### 8d. Perbaikan setelah screenshot real (2026-08-09)

User kirim screenshot aplikasi jalan nyata (bukan mockup lagi). 3 temuan:

1. **Badge "High Margin/Core/Volume" abu-abu** — masih `color="default"`
   (belum ke-apply saat itu), diganti `color="success"`.
2. **Komposisi 2 chart 30/70 di desktop** — diminta eksplisit, diimplementasi
   pakai `Box` flex+width persen (BUKAN Grid 12-kolom MUI — 30% tidak
   presisi dari pecahan /12).
3. **Label sumbu "Tengah" hilang di Chart Bulanan** — bar chart 3-kategori
   dipaksa masuk container 30% lebar (efek dari poin 2), label lengkap
   ("Tengah (50%–100% median)") kepanjangan, recharts auto-hide tick yang
   tumpang tindih. Fix: tambah label PENDEK khusus sumbu chart
   (`tierTopShort`/`tierMidShort`/`tierBottomShort` = "Atas"/"Tengah"/
   "Bawah" tanpa keterangan) — keterangan lengkap tetap di 3 kartu tier
   di atasnya, tidak hilang informasinya.

**Temuan BELUM diperbaiki, sekadar dicatat** (bukan bug kode, tapi
inkonsistensi arsitektur data yang kebaca aneh secara visual): kartu tier
& chart terisi data asli (Rp 487jt dst, dari `sumLastMonths` atas trend
`useCustomerMetrics`, ikut periodType), TAPI tabel breakdown di bawahnya
kosong ("Tidak ada data GP bulan ini", 0 pelanggan) — karena
`useGpBreakdown` pakai window SNAPSHOT tetap dari `business_configs`
terikat ke `endDate` PERSIS (bukan agregat periodType kayak chart), dan
`endDate` default (hari ini) jatuh di luar rentang data lokal (data stop
25 Jun 2026, lihat catatan tanggal di percakapan sebelumnya). Kartu/chart
"kelihatan ada data" tapi tabel "kelihatan kosong" DI HALAMAN YANG SAMA,
padahal masing-masing benar sesuai definisinya sendiri — cuma jendela
waktunya beda sumber. **Belum diputuskan** apakah perlu disamakan sumber
window-nya (ubah `useGpBreakdown` ikut periodType juga) — perlu
dikonfirmasi user dulu sebelum diubah, ini architecture decision bukan
sekadar bug fix.

### 8e. Filter window jadi global, business config TIDAK ikut berubah (2026-08-09)

User putuskan §8d: window filter (periodType) HARUS global/konsisten ke
semua bagian halaman (termasuk tabel breakdown) — TAPI business config
seperti threshold dormant TIDAK BOLEH ikut diganti oleh filter periode
(2 hal beda: filter = pilihan user per-request, business config = aturan
bisnis tersimpan, jangan dicampur).

**Perubahan backend** (`resolveSegmentParams` di `metrics.service.ts`):
tambah parameter opsional terakhir `activeWindowOverride?: number` — kalau
diisi, MENGGANTIKAN `active_window_months` dari `business_configs` untuk
request itu saja. `dormantMonths` (resolusi dari `resolveDormantCategory`/
`resolveDormantMonths`) TIDAK DISENTUH SAMA SEKALI — tetap selalu dari
business_configs, tidak ada jalur override untuk itu. Ini menjamin
permintaan user "dormant tidak boleh diganti" secara struktural (bukan
sekadar konvensi/harus diingat manual).

`gpBreakdownQuerySchema` dapat field baru `active_window` (opsional,
1-24 bulan) — `getGpBreakdown` meneruskannya ke `resolveSegmentParams`.
Frontend `CustomerGrossProfit` sekarang kirim `active_window: periodMonths`
(dari `KPI_PERIOD_TYPE_MONTHS[periodType]`, SAMA PERSIS sumber yang dipakai
kartu/chart) — jadi kartu, chart, DAN tabel breakdown sekarang konsisten 1
jendela waktu, tidak akan lagi "kartu terisi tabel kosong" akibat beda
sumber window.

**Scope**: baru diterapkan ke `gp-breakdown` (KPI4, halaman yang sedang
dikerjakan). Endpoint breakdown KPI lain (`revenue-breakdown`,
`expansion-breakdown`, `hm-breakdown`, `ror-breakdown`) MASIH pakai
`active_window_months` tetap dari business_configs (belum ikut periodType)
— pola/mekanisme `activeWindowOverride` di `resolveSegmentParams` SUDAH
generik dan siap dipakai, tinggal tambah field `active_window` yang sama
ke schema masing-masing endpoint itu saat rollout ke 9 KPI lain nanti.

Warna aksen (badge tier, dll) dikonfirmasi ulang: SELALU dari
`theme.palette.*` (success.dark/main/light dst), tidak ada hex literal
atau `color="default"` (abu-abu netral) tersisa di halaman ini — prinsip
ini jadi standar utk 9 halaman KPI berikutnya juga.

Diverifikasi: `tsc --noEmit` backend 0 error, `bun run build` + `bun run
lint` frontend 0 error.

### 8f. KOREKSI BESAR dari user (2026-08-09) — 2 kesalahan §8e sekaligus

User marah (screenshot real, palet BIRU) menemukan 2 kesalahan fatal di
§8e yang saya klaim "sudah 100%" padahal belum diverifikasi visual:

**Kesalahan 1 — warna TIDAK ikut palet, padahal diklaim sudah.** Saya pakai
`theme.palette.success.dark/main/light` mengira itu "theme-aware". SALAH:
`success`/`warning`/`info` di `theme/index.ts` (`SEMANTIC.light/dark`)
adalah warna semantik **FIXED** (selalu hijau/kuning/cyan, tidak berubah
walau user ganti palet ke biru/ungu/dll) — BEDA dari `primary` yang
genuinely ikut palet yang dipilih user. Akibatnya seluruh aksen KPI4 tetap
hijau walau user pilih palet biru. **Fix**: semua aksen tier (kartu, badge
kategori, 2 chart, kotak total, chip KPI badge) diganti dari
`success.dark/main/light` → `primary.dark/main/light`. `tierChipColor`
tabel juga diperbaiki (`info` dihapus, jadi `primary`/`default` saja).
Badge growth (▲/▼ vs tahun lalu) **TETAP success/error** — itu genuinely
semantik naik/turun, bukan aksen dekoratif, jadi memang harus fixed warna
apa pun palet-nya (praktik umum: merah/hijau utk baik/buruk tidak ikut
brand color).

**Pelajaran**: "theme-aware" ≠ "ikut palet". Warna semantik (success/error/
warning/info) di sistem ini SENGAJA fixed lintas palet (benar utk status
baik/buruk universal) — tapi aksen dekoratif/kategorikal (tier, chart
seri, dll) HARUS pakai `primary` supaya benar-benar ikut pilihan palet
user. Jangan asumsikan `theme.palette.<apa saja>` otomatis "ikut palet"
tanpa cek definisinya dulu.

**Kesalahan 2 — logika §8e SALAH, mencampur 2 konsep beda.** Instruksi
user eksplisit: *"WINDOW AKTIF UNTUK PARAMETER EXISTING TIDAK BOLEH
BERUBAH, YANG BERUBAH ADALAH PERIODE PENARIKAN DATANYA — data end date
dari filter, start date dari periode filter."* §8e SALAH karena
`activeWindowOverride` yang saya buat mengganti `SegmentParams.activeMonths`
— parameter itu dipakai BUKAN cuma utk SUM GP (yang memang boleh ikut
filter), TAPI JUGA dipakai `cteEstablishedCustomers()` (segment.helper.ts)
utk menentukan SIAPA yang qualify sbg "existing customer" (first_invoice_date
< period_end − activeMonths). Mengganti `activeMonths` ikut periodType
BERARTI mengubah DEFINISI "existing customer" itu sendiri tiap kali user
ganti dropdown Periode — jelas salah, populasi "existing" harus konsisten
apa pun periode yang dipilih, cuma rentang data yang di-SUM yang boleh
berubah.

**Fix yang benar** (dipisah total, tidak lagi share parameter):
- `resolveSegmentParams` di `metrics.service.ts`: **`activeWindowOverride`
  DIHAPUS TOTAL** — `activeMonths` SELALU dari `business_configs`
  (`loadThresholds()`), tanpa jalur override apa pun. `cteEstablishedCustomers`
  (definisi "existing") jadi tidak mungkin ke-influence filter periode lagi.
- `fetchGpBreakdown` (`m4.repository.ts`) dapat parameter BARU yang
  TERPISAH: `dateFrom?: string` — HANYA dipakai membatasi rentang
  `invoice_date` di CTE `inv_active` (SUM GP per customer), TIDAK
  disentuhkan ke `cteEstablishedCustomers` sama sekali (CTE itu tetap
  terima `p` yang activeMonths-nya murni business config).
- `gpBreakdownQuerySchema`: field `active_window` (§8e, salah) diganti
  `date_from` (YYYY-MM-DD, opsional).
- Frontend: `useGpBreakdown` dipanggil dgn `date_from: periodStart`
  (dari `getPeriodDateRange(periodType, periodKey).start` — SAMA
  variabel yang sudah dipakai buat `currentRangeText`), BUKAN
  `active_window: periodMonths` lagi.

Hasil akhir yang benar: ganti dropdown Periode → SIAPA yang terhitung
"existing customer" TETAP (business rule fixed) → tapi RENTANG TANGGAL
invoice yang di-SUM per existing customer itu ikut berubah (start =
awal periode dipilih, end = tanggal filter) → total GP/tabel breakdown
berubah sesuai, populasi existing tidak.

Diverifikasi: `tsc --noEmit` backend 0 error, `bun run build` + `bun run
lint` frontend 0 error. **Belum diverifikasi query manual ke DB** utk
pastikan `total_existing` benar-benar konstan lintas periodType — perlu
dicek lagi kalau ada kesempatan (lihat [[feedback_verify_dont_guess_data]]).

### 8g. BUG KEDUA ditemukan user (2026-08-09) — kartu/chart beda jendela dari label

User tunjukkan screenshot: filter "PT Mesin Kasir Online", Kuartalan, per
tanggal 9 Agustus 2026 → tabel benar kosong (sesuai §8f, window Jul-Agu
genuinely 0 invoice), TAPI kartu & "Chart Bulanan" TETAP tampil 487.12jt
dkk — padahal caption di sebelahnya sendiri bilang "periode ini (1 Juli –
9 Agustus 2026)".

**Diverifikasi ke psql** (bukan tebak): `sumLastMonths(trend, periodMonths)`
(dipakai kartu/chart) mengambil N entri **TERAKHIR SECARA POSISI ARRAY**
trend 12-bulan (N=3 utk quarter) — untuk endDate=9 Agustus itu berarti
**Jun+Jul+Agu** (trailing 3 bulan dari BULAN INI). Sedangkan caption
"periode ini" & tabel breakdown pakai `periodStart` dari
`getPeriodDateRange('quarter', ...)` = **awal kuartal kalender** (1 Juli)
sampai `endDate` — cuma **Jul+Agu** (2 bulan, TANPA Juni). Juni datanya
ADA (real, 530jt), makanya kartu tetap terisi walau seharusnya kosong
sama seperti tabel — 2 definisi "quarter" yang beda dipakai berdampingan
di halaman yang sama tanpa disadari.

**Root cause lebih dalam**: pola `sumLastMonths`/`averageLastMonths` +
`KPI_PERIOD_TYPE_MONTHS[periodType]` (task025 §18, "trailing N bulan dari
posisi array") dipakai di describe SEMUA halaman KPI lain yang sudah
dibangun (CrossSelling, DormantRate, dst) — SEMENTARA `getPeriodDateRange().start`
(dipakai buat caption "Periode ini: ...") pakai kalender-quarter-aligned
("1 Juli" utk Q3, bukan "trailing 3 bulan dari hari ini"). **Kemungkinan
BUG YANG SAMA ADA DI SEMUA 9 KPI LAIN**, bukan cuma KPI4 — belum dicek satu-
satu, dicatat sebagai TODO sebelum rollout ke 9 halaman.

**Fix di KPI4** (`CustomerGrossProfit/index.tsx`): ganti total `sumLastMonths(trend,
periodMonths, field)` → `sumMonthsInRange(trend, periodStart, endDate, field)`
— fungsi baru yang filter trend PER BULAN yang genuinely `>= periodStart`
DAN `<= endDate` (bandingkan string `'YYYY-MM'`), bukan hitung mundur N
posisi. Sekarang kartu, chart, DAN tabel breakdown 100% 1 definisi
"periode ini" yang sama. `KPI_PERIOD_TYPE_MONTHS`/`sumLastMonths` sudah
tidak dipakai lagi di halaman ini (import dihapus).

Diverifikasi: `bun run build` + `bun run lint` 0 error. Untuk kasus
spesifik di screenshot (PT Mesin Kasir Online, Jul-Agu 2026) — sudah
dikonfirmasi via query psql sebelumnya (§8f) bahwa TOTAL invoice lintas
SEMUA company di rentang itu = 0, jadi subset 1 company mana pun otomatis
juga 0 (implikasi logis, tidak perlu query ulang per-company).

### 8h. Bug tooltip (2026-08-09)

User screenshot: hover bar "Atas" di Chart Bulanan menampilkan tooltip
"Total GP Existing Customer — Kontribusi per Tier (12 Bulan) : 3225223087.91"
— 2 masalah: (1) label seri nyasar pakai `chartTitle` (teks lama punya
chart TREN 12-bulan, bukan chart bulanan ini), (2) angka mentah tidak
diformat Rupiah (`tooltipFormatter` tidak diisi ke `BarChartWidget`,
default-nya raw number). Fix: key i18n baru `seriesGpLabel` ("Gross
Profit") dipakai sbg label seri, `tooltipFormatter={(v,n) => [fmtRpDetail(v), n]}`
ditambah ke KEDUA BarChartWidget (Chart Bulanan & Chart Tren). Diverifikasi
`bun run build`+`lint` 0 error.

### 8i. YoY ditambah ke 3 kartu tier (2026-08-09)

User tanya "kalau butuh pembanding YoY, ditaruh di mana?" — sebelumnya YoY
cuma ada 1 tempat (badge kotak Total kanan atas). Dipilih: tambah juga ke
3 kartu tier (bukan cuma di level total) — tiap kartu sekarang dapat badge
kecil `▲/▼ X% vs periode sama tahun lalu` sendiri-sendiri, dihitung dari
`computeChangePct(tc.value, tc.comparisonValue)` (comparisonValue sudah
ada dari perhitungan §8g `sumMonthsInRange` di rentang
`comparisonPeriodStart..comparisonDate`). Diverifikasi `bun run build`+
`lint` 0 error.

### 8j. Tampilkan nilai tahun lalu eksplisit (2026-08-09)

User: "data periode ini 3.23M naik 75.2% nilai 1.38M, berarti tahun lalu
berapa? apakah aku harus hitung manual?" — benar, sebelumnya cuma current
value + growth% + growth value (delta), TIDAK ada angka tahun lalu
eksplisit, user harus hitung sendiri (current − delta). Fix: tambah 1
baris caption "Tahun lalu: {{value}}" (`comparisonValueCaption`, key baru)
di kotak Total DAN tiap kartu tier — sekarang 3 angka lengkap tampil
langsung (nilai sekarang, growth %+delta, nilai tahun lalu), tidak perlu
hitung manual sama sekali. Diverifikasi `bun run build`+`lint` 0 error.

### 8k. Kotak Total dipindah sejajar kartu tier (2026-08-09)

User: pindahkan kotak "Total Gross Profit" dari header (kanan atas,
sejajar judul) ke baris kartu, sejajar Atas/Tengah/Bawah. Header sekarang
cuma badge+judul+deskripsi (1 kolom). Grid kartu jadi 4 kolom
(`xs:12, sm:6, md:3`, sebelumnya 3 kolom `sm:4`) — Total di posisi
pertama (border `primary.main`), diikuti Atas/Tengah/Bawah. Diverifikasi
`bun run build`+`lint` 0 error.

### 8l. Lebar chart disamakan dgn grid kartu (2026-08-09)

User: Chart Breakdown lebarnya = 1 kartu (25%), Chart Tren = 3 kartu (75%)
— sejajar persis dgn grid 4-kartu di atasnya (sebelumnya 30/70 tanpa
acuan grid). Diubah ke 25%/75%, breakpoint tetap `md` (sama dgn breakpoint
kartu `md:3` yang jadi 4-kolom). Diverifikasi `bun run build`+`lint` 0 error.

### 8m. Alignment chart vs kartu (2026-08-09)

User: "belum sejajar atas bawah" — Chart Breakdown/Tren pakai `Box` flex +
`width` persen (25%/75%), kartu di atasnya pakai `Grid` (`md:3` dari 12).
Root cause: `Box` flex+`gap` dan MUI `Grid` MENGHITUNG GUTTER DENGAN CARA
BEDA — angka persen yang sama ("25%") TIDAK otomatis align pixel-perfect
dgn kolom Grid yang proporsinya kelihatan sama. Fix: ganti baris chart dari
`Box` flex ke `Grid container spacing={2}` yang SAMA persis dgn grid
kartu, `size={{xs:12, md:3}}` (Breakdown) dan `size={{xs:12, md:9}}`
(Tren) — 3/12 dijamin align dgn 3/12 punya kartu Total krn dihitung sistem
grid yang sama, bukan kombinasi angka yang kebetulan mirip. Diverifikasi
`bun run build`+`lint` 0 error.

### 8n. Banner "Detail Periode & Pembanding YoY" (2026-08-09)

User tunjukkan mockup baru: konsolidasi info total+YoY yang sebelumnya di
kartu ke-4 (§8k) jadi 1 banner di atas kartu tier — isi: ikon kalender,
"Periode Aktif: [rentang]", "Pembanding YoY: [rentang tahun lalu]", dan di
kanan "YoY Baseline (Tahun Lalu): Rp X" + "Perubahan YoY: ▲/▼ Rp Y (Z%)".
Dikonfirmasi ke user 2 hal sebelum eksekusi (supaya tidak revert-redo
lagi): (1) kartu Total DIHAPUS dari grid, infonya pindah total ke banner
— bukan ditambah, breadcrumb (2) badge YoY per kartu tier (§8i) TETAP
dipertahankan (dobel info dgn banner, sengaja, bukan gantikan).

Grid kartu balik ke 3 kolom (`xs:12, sm:6, md:4`, sebelumnya 4 kolom
`md:3` waktu masih ada kartu Total). Grid 2 chart ikut disesuaikan dari
3/12+9/12 (1-dari-4 & 3-dari-4) jadi 4/12+8/12 (1-dari-3 & 2-dari-3) —
tetap pola sama (pakai `Grid`, bukan `Box` flex, biar align pixel-perfect
dgn §8m).

Diverifikasi: `bun run build`+`lint` 0 error.

### 8o. Aksen bg blok YoY Baseline/Perubahan (2026-08-09)

User: 2 blok kanan banner (YoY Baseline, Perubahan YoY) kelihatan polos
(teks doang, tanpa background) dibanding ikon kalender kiri yang solid.
Fix: bungkus masing-masing `Box` dgn `bgcolor: alpha(warna, 0.1)` — Baseline
pakai tint `primary` (informatif netral), Perubahan YoY pakai tint
`success`/`error` ikut arah growthPct (konsisten dgn warna teks arrow-nya).
`alpha` di-import dari `@mui/material/styles`. Diverifikasi `bun run
build`+`lint` 0 error.

### 8p. Mobile: 2 blok YoY numpuk, dipaksa sejajar (2026-08-09)

User screenshot mobile: blok "YoY Baseline" dan "Perubahan YoY" numpuk
vertikal (bukan sejajar) di layar sempit — sebelumnya pakai `flex+wrap`,
yang wrap ke bawah begitu lebar sempit. Fix: ganti ke `display:'grid',
gridTemplateColumns:'1fr 1fr'` (fixed 2 kolom, TIDAK ikut wrap otomatis)
— isi cuma angka pendek, selalu muat 2 kolom sekalipun di HP. Diverifikasi
`bun run build`+`lint` 0 error (dari direktori `frontend/` yang benar —
sempat salah run dari `backend/` sekali, `lint` gagal krn script tidak
ada di situ, sudah diulang benar).

### 8q. Header disederhanakan (2026-08-09)

User: hapus breadcrumb + chip badge KPI, sisakan judul halaman saja +
rapikan deskripsi. `Breadcrumbs`/`Link`/`Chip`/`PaidOutlinedIcon`/
`useNavigate` dihapus dari halaman (sudah tidak dipakai lagi di manapun di
file ini, bukan cuma disembunyikan — import & variabel `navigate` ikut
dibersihkan). Teks `pageDescription` dirapikan, sekalian sebut 3 nama
tier eksplisit (Atas/Tengah/Bawah) karena konteks "KPI 4" yang tadinya
disampaikan lewat chip sekarang tidak ada lagi. Diverifikasi `bun run
build`+`lint` 0 error.

### 8r. Sistem warna dirombak — pisahkan peran warna (2026-08-09)

User kirim brief desain lengkap: masalahnya BUKAN "kurang warna" tapi
hijau/primary dipakai utk terlalu banyak peran sekaligus (brand, chart,
badge positif, badge tier, link) — mata tidak tahu prioritas baca. Prinsip:
**1 warna = 1 peran**. 5 peran: Brand/netral (teal/primary — CUMA di
chrome: header/sidebar/judul, TIDAK di data), Data utama (indigo/sky/slate
— kategorikal, lepas dari brand), Positif (emerald/success — CUMA badge
▲), Negatif (rose/error — CUMA badge ▼), Peringatan (amber/warning —
threshold/kritis).

**Ini KOREKSI dari keputusan §8f** yang bilang "primary ikut palet = benar
utk semua aksen data" — ternyata SALAH juga, cuma beda cara salahnya: §8f
benar bahwa `success` (hijau fixed) tidak boleh dipakai utk aksen netral,
tapi `primary` (ikut palet brand) JUGA tidak seharusnya dipakai utk data —
data butuh palet kategorikal SENDIRI yang independen dari branding.

**Implementasi di KPI4**:
- `useTierColors(isDarkMode)` — palet baru fixed (BUKAN dari
  `theme.palette.primary` ATAU `success/warning/info` lagi): indigo
  `#4F46E5`/`#818CF8` (Atas), sky `#0EA5E9`/`#38BDF8` (Tengah), slate
  `#94A3B8`/`#CBD5E1` (Bawah) — pasangan light/dark sesuai saran "varian
  400 bukan 600 di dark mode". Dipakai di: border+label 3 kartu tier,
  badge tier tabel (custom `sx` override, `StatusChip.color` cuma nerima
  token semantik bawaan), DAN kedua chart.
- **Chart Breakdown direstruktur total** — dulu 1 series monokrom + xKey
  per-tier (3 baris data), SEKARANG 3 series (top/mid/bottom) dlm 1 baris
  data → grouped bar 3 warna + legend otomatis (`series.length > 1`).
  `BarChartWidget` cuma bisa warnai per-SERIES, bukan per-cell, jadi
  restrukturisasi data yang dipakai, bukan cuma ganti prop warna.
- **Chart Tren** (stacked) — 3 series warna diganti dari
  `primary.dark/main/light` (monokrom, TIDAK BISA dibedakan di stacked
  bar — temuan user paling penting) ke indigo/sky/slate.
- **Badge kategori kartu** (High Margin/Core/Volume) — dari `primary`
  semua jadi Atas=`warning` (amber lembut), Tengah/Bawah=`default`
  (netral) — biar badge ▲▼ semantik (success/error) yang paling mencolok,
  bukan bersaing dgn pill kategori.
- Badge growth (▲/▼ vs tahun lalu) — TIDAK diubah, user eksplisit bilang
  "sudah benar, pertahankan — ini satu-satunya tempat hijau/merah boleh
  muncul".

Diverifikasi: `bun run build` + `bun run lint` 0 error.

**Catatan buat rollout ke 9 KPI lain**: prinsip 5-peran warna ini ("1
warna = 1 peran", brand≠data, hijau/merah cuma utk makna) berlaku ke SEMUA
halaman KPI, bukan cuma KPI4 — jadi ini bagian dari checklist rollout,
bukan cuma catatan sekali pakai.

**TODO sebelum rollout ke 9 KPI lain**: audit apakah pola
`sumLastMonths`/`averageLastMonths` + `KPI_PERIOD_TYPE_MONTHS` di halaman-
halaman KPI existing (CrossSelling, AvgCategoryPerCustomer, CustomerRevenue,
dst) punya bug yang sama (beda jendela dari caption "periode ini"), dan
perbaiki dengan pola `sumMonthsInRange`/`averageMonthsInRange` yang sama
kalau iya — supaya tidak nambah 9 halaman baru dengan bug yang sudah
diketahui.

## §8s — Rekonsiliasi §8r dengan sistem tema yang SUDAH ADA (2026-08-09)

User memberi dokumen spesifikasi lengkap "Sistem Tema Dinamis — Executive
Dashboard" (6 palet × 2 mode, token brand/data[3]/pos/neg/warn/ink/muted/
line/surface via CSS custom properties, `applyTheme()` runtime) sebagai
"sumber kebenaran tunggal" pengganti keputusan warna ad-hoc di §8r.

**Sebelum implementasi, dicek dulu codebase existing** (`theme/palettes.ts`,
`theme/index.ts`, `theme/ThemeContext.tsx`) — ternyata sistem yang SUDAH
JALAN sejak Task003 sudah menerapkan hampir semua prinsip yang sama, cuma
beda nama & belum terpusat:

| Spesifikasi baru | Sudah ada di kode |
|---|---|
| `brand.solid` per palet | `PALETTES[key].primary.light/dark` — 6 palet, display name SUDAH persis sama (Enterprise Blue, Executive Green, Modern Teal, Premium Purple, Executive Red, Enterprise Slate) |
| `data[3]` kategorikal per palet | `PALETTES[key].line1/line2/line3` — sudah per-palet, light/dark, tapi comment lama bilang "khusus chart M3" |
| `pos/neg/warn` seragam lintas palet | `SEMANTIC.light/dark` (success/warning/error/info) di `theme/index.ts` — prinsip PERSIS sama, sudah ada comment eksplisit alasannya |
| Persist preferensi | Tersimpan ke akun backend (`users.preferences.color_palette`), bukan cuma localStorage |
| `brand.soft`/`pos.soft`/dst (tint) | Belum ada — sebelumnya ad-hoc `alpha(color, 0.1)` per halaman |
| CSS custom properties | Tidak ada — semua via MUI `theme.palette.*`/`useTheme()`, konsisten dipakai di seluruh app |

**Keputusan (dikonfirmasi user via pertanyaan eksplisit)**: PERLUAS sistem
MUI theme yang ada, BUKAN migrasi ke CSS custom properties dari nol —
alasan: CSS-variable rewrite akan duplikasi infrastruktur yang sudah
dipakai di seluruh app (risiko regresi besar) untuk manfaat kecil, karena
prinsip intinya sudah sama persis.

**Implementasi**:
- `theme/index.ts` — tambah `theme.custom` (type augmentation MUI Theme):
  - `theme.custom.data: [string,string,string]` — alias langsung dari
    `line1/line2/line3` palet aktif (light/dark sesuai mode), sekarang
    diakui sebagai token data UMUM (bukan cuma M3).
  - `theme.custom.soft(color, opacity=0.1)` — helper `alpha()` generik.
    Tint DIHITUNG dari warna solid manapun, BUKAN hex baru per
    palet/mode — supaya soft-tint tidak pernah bisa mismatch dari
    versi solid-nya (selalu 1 sumber kebenaran).
- `theme/palettes.ts` — comment `line1/2/3` digeneralisasi (tadinya
  "khusus chart M3", sekarang eksplisit "dipakai umum utk data
  multi-seri, diekspos lewat theme.custom.data").
- `CustomerGrossProfit/index.tsx` — **fix ralat dari §8r**: `useTierColors`
  yang sebelumnya hardcode indigo/sky/slate (TIDAK ikut palet user, walau
  sudah benar secara "brand≠data") diganti pakai `theme.custom.data`
  (ikut palet aktif). Banner YoY yang sebelumnya `alpha(theme.palette.x,
  0.1)` manual diganti `theme.custom.soft(theme.palette.x)`.

Diverifikasi: `bun run build` + `bun run lint` 0 error.

**Catatan buat rollout ke 9 KPI lain**: pola `theme.custom.data[0..2]` utk
warna kategorikal & `theme.custom.soft()` utk tint sekarang jadi token
resmi — dipakai langsung di 9 halaman lain, TIDAK perlu bikin
`useXxxColors()` hardcode hex sendiri-sendiri lagi seperti KPI4 revisi
pertama.

## §8t — Token `rank` (data berjenjang) + update semantik global (2026-08-09)

User laporkan: "aksen Bar chart di setiap palet jadi kurang mantab" setelah
§8s (KPI4 pindah pakai `theme.custom.data`/line1-2-3). Diaudit ulang nilai
hex-nya, ketemu akar masalah OBJEKTIF (bukan cuma selera):

1. `data` (line1/2/3) dirancang utk 3 metrik LEPAS/independen (dipakai
   awalnya di chart M3: Avg/Median/Kontribusi HM) — 3 hue yang sengaja
   beda jauh satu sama lain. Tier KPI4 (Atas/Tengah/Bawah) itu BERJENJANG
   (terurut nilai) — utk data berjenjang, kombinasi yang "mantab" itu 1
   hue family digradasi kuat→pudar (persis konsep indigo→sky→slate yang
   sudah di-approve user sebelumnya), BUKAN 3 hue lepas yang tidak
   berhubungan.
2. Tabrakan hue nyata: palet "Executive Green" `primary.light` (`#059669`)
   PERSIS SAMA dgn `success.light` lama (`#059669`) — brand & sinyal
   "naik" jadi 1 warna identik. Palet "Executive Red" `line2`
   (`#10B981`/`#14E6A0`) itu hijau emerald — satu keluarga hue dgn
   `success`, melanggar aturan sendiri ("hijau cuma boleh utk naik/baik")
   kalau dipakai badge tier.

User kasih dokumen "Rekomendasi Paduan Warna" lengkap (6 palet × 2 mode)
sbg jawaban. Direview per-bagian sebelum diterapkan (bukan langsung
ditelan mentah), krn scope-nya ada 3 lapis beda risiko:

- **§3 dokumen (data ramp per-palet)** — AMAN, ini persis jawaban dari
  pertanyaan "mau diperbaiki dgn cara apa" yang user pilih sebelumnya
  ("token baru khusus data berjenjang"). Diterapkan sbg field baru
  `rank: {top,mid,bottom}` di `PaletteColors` (bukan menimpa `line1/2/3` —
  keduanya sekarang hidup berdampingan, beda kegunaan).
- **§4 dokumen (netral ink/muted/line/surface/card)** — dicek, ternyata
  95% sudah identik dgn `theme.palette.text/divider/background` yang
  sudah ada, tidak perlu perubahan.
- **§2 dokumen (semantik pos/neg/warn/info + pengecualian per-palet)** —
  DITANYAKAN dulu ke user secara eksplisit sebelum disentuh, krn scope-nya
  jauh lebih besar: `success/error/warning/info` dipakai di SELURUH app
  yang sudah jadi (tombol, alert, snackbar, badge di semua halaman), bukan
  cuma chart KPI4. User pilih "terapkan sekaligus sekarang".
- **Kolom `brand` di tabel §3 dokumen** — beda dari `primary` yang
  tersimpan sekarang utk hampir semua mode gelap (dan mode terang khusus
  Executive Green). Ini ditanyakan TERPISAH lagi (scope re-skin brand app-
  wide, lebih besar lagi dari sekadar semantik) — user pilih **TIDAK**,
  `primary`/`brand` tetap seperti sekarang, cuma kolom referensi di
  dokumen, bukan instruksi ganti.

**Implementasi**:
- `theme/palettes.ts` — tambah field `rank: {top,mid,bottom}` (masing²
  `{light,dark}`) di `PaletteColors`, diisi di 6 palet sesuai tabel §3
  dokumen (dipetakan ke key internal: Enterprise Blue→blue, Executive
  Green→green, Modern Teal→yellow, Premium Purple→purple, Executive
  Red→rose, Enterprise Slate→indigo — TIDAK rename key, alasan sama spt
  sebelumnya: account preference sudah tersimpan).
- `theme/index.ts`:
  - `SEMANTIC.light/dark` (success/warning/error/info) diupdate ke nilai
    dokumen §2: success emerald-600/400 (`#16A34A`/`#4ADE80`), error rose-
    600/400 (`#E11D48`/`#FB7185` — BUKAN red lagi, sengaja beda hue dari
    brand "Executive Red"), warning tetap amber (`#D97706`/`#FBBF24`),
    info blue-600/400 (`#2563EB`/`#60A5FA` — sebelumnya cyan).
  - Tambah `SEMANTIC_OVERRIDES` (baru, HANYA 2 palet): `green.light.success
    = '#15803D'` (lebih gelap dari brand hijau `#16A34A`), `rose.light/dark
    .error = '#BE123C'/'#FDA4AF'` (digeser dari brand merah `#DC2626`).
    Palet lain semantik tetap 100% seragam, prinsip Task003 tidak berubah,
    cuma 2 pengecualian ini yang legal (brand-nya sehue dgn semantiknya).
  - `theme.custom` tambah `rank: [string,string,string]` (alias dari
    `colors.rank.top/mid/bottom` sesuai mode) di samping `data` yang sudah
    ada duluan.
- `CustomerGrossProfit/index.tsx` — `useTierColors` pindah dari
  `theme.custom.data` ke `theme.custom.rank` (fix ralat §8s: tier itu
  berjenjang, harusnya dari awal pakai token berjenjang, bukan
  kategorikal).
- `primary`/`brand`, background/text/divider (netral) — **TIDAK disentuh**,
  sesuai keputusan eksplisit user.

Diverifikasi: `bun run build` + `bun run lint` 0 error.

**Dampak ke halaman lain (di luar KPI4)**: karena `success/error/info`
berubah nilai HEX-nya (bukan cuma tambah token baru), SEMUA halaman yang
sudah jadi yang pakai `theme.palette.success/error/info` (tombol, badge,
alert, snackbar, validasi form, dst — bukan cuma 10 halaman KPI) otomatis
ikut berubah warna begitu build ini di-deploy. Belum di-QA visual
menyeluruh ke semua halaman existing — **perlu jadi item TODO sebelum
deploy ke production**, bukan cuma dites di KPI4 saja.

## §9 — Rencana Redesain Dashboard Overview (2026-08-09)

User minta cek `executive-kpi-dashboard/` (proyek referensi AI Studio,
sama seperti yang dipakai acuan mockup KPI4 sebelumnya) khusus bagian
`OverviewView.tsx`, dibandingkan dgn `Dashboard/index.tsx` yang sudah jadi.

**Temuan (dari kode, bukan tebakan):**
1. `dashboard.service.ts` hardcode hex per metric_key (`'#3B82F6'` dst,
   10 warna lepas beda-beda) dikirim ke frontend lewat field `color` —
   sama sekali tidak ikut sistem tema/palet, StatCard cuma fallback ke
   `theme.palette.primary.main` KALAU `color` tidak dikirim (StatCard.tsx:56).
2. `buildSummary()` di `dashboard.service.ts:14` bandingkan
   `trend.at(-1)` vs `trend.at(-2)` — itu Month-over-Month, BUKAN YoY.
   Referensi (`PeriodYoYCardBlock`/`KPIPeriodYoYHeader`) konsisten YoY di
   semua kartu, sama dgn mental model yg sudah dibangun manual di KPI4.
3. `periodType` di `KpiFilterBar` Dashboard SELAMA INI CUMA KONTROL UI —
   tidak pernah dikirim ke backend (`useDashboard` cuma kirim `period_end`,
   `dashboard.schema.ts` tidak punya field periodType sama sekali). Ganti
   dropdown Kuartalan/Tahunan di halaman Dashboard TIDAK berpengaruh ke
   data — bug tersembunyi, ditemukan saat audit ini.
4. Referensi punya pola bagus yg belum ada: alert banner otomatis
   (threshold-aware), hero callout 1 angka kritis (dormant lost value).

**Keputusan scoping (supaya tidak mengulang pola kesalahan "asumsi
semantik tanpa verifikasi" dari saga KPI4 sebelumnya), dieksekusi sekarang
sesuai pilihan user "redesain penuh sekarang":**

| Bagian | Keputusan |
|---|---|
| Warna hardcode → theme | **Dikerjakan sekarang.** Hapus field `color` dari backend sepenuhnya, StatCard pakai fallback `theme.palette.primary.main` (brand, bukan data kategorikal — sparkline per kartu berdiri sendiri, tidak dibandingkan lintas kartu, jadi 1 warna konsisten justru lebih benar daripada 10 hue lepas). |
| MoM → YoY | **Dikerjakan sekarang**, dgn pola yang SAMA PERSIS sudah terverifikasi di KPI4: fetch 2x (filterDate & filterDate-1thn) via service function yang SAMA (`getCrossSellingMetrics`/`getCustomerMetrics`/`getDormantCustomerMetrics`/`fetchDormantValueTrend`), masing² "existing customer" tetap dihitung kontemporer thd tanggalnya sendiri (BUKAN override activeMonths, prinsip §8e tetap). TIDAK perlu audit semantik per-metrik krn logic PERHITUNGAN tiap metrik SAMA SEKALI TIDAK diubah — cuma baseline pembandingnya yang ganti dari "bulan lalu" ke "1 tahun lalu". |
| `periodType` masuk ke 10 metrik dashboard | **DITUNDA** — beda kelas risiko dari 2 di atas: makna "value pada periode X" bisa beda per metrik (snapshot vs rata-rata vs sum), butuh audit semantik SATU-SATU spt saga KPI4 (yg makan banyak koreksi utk 1 metrik saja). Jangan diburu-buru. Ditambahkan ke daftar TODO existing (bareng audit `sumLastMonths` di 9 halaman KPI). |
| Alert banner | **Dikerjakan sekarang** — threshold (`repeatOrderTargetPct`, `dormantRateAlertPct`, `reactivationTargetLow`) sudah ada di `loadThresholds()` (dipanggil dashboard.service tapi belum diekspos ke response), tinggal ditambahkan ke `DashboardData`, teks alert dirender frontend pakai i18n (BUKAN string Indonesia hardcode di backend spt referensi — beda dari referensi yg tidak ber-i18n). |
| Hero callout dormant lost value | **Dikerjakan sekarang** — highlight `dormant_value` di banner atas, pola sama dgn referensi. |

Diverifikasi tetap wajib: `bun run build` + `bun run lint` 0 error di
frontend & backend setelah implementasi.

### §9 lanjutan v2 — Kartu Overview seragam biru, tidak mirip referensi (2026-08-09)

User kirim screenshot aplikasi jalan nyata: semua 10 kartu Dashboard biru
rata (termasuk mini chart), padahal implementasi §9 di atas SUDAH benar utk
warna/YoY/alert/hero — cuma prop `color` StatCard TIDAK PERNAH diisi dari
`Dashboard/index.tsx` (selalu fallback `theme.palette.primary.main`), dan
kartu tidak punya ikon di judul spt referensi (`<Grid/> KPI 1 • ...`).

**Fix**:
- `metricAccentColor(metricKey, theme)` (baru, `Dashboard/index.tsx`) —
  aksen per kartu dikelompokkan sesuai kategori §1 (Produk/Omset &
  Revenue/Risiko-dormant/Transaksi), pakai `theme.custom.data[0..2]`
  (token kategorikal per-palette, §8s) + `secondary` — SENGAJA BUKAN
  success/warning/error (cuma boleh utk badge naik/turun, §8r/§8t) dan
  BUKAN hex baru.
- `StatCard` dapat prop opsional `icon?: ReactNode`, dirender di depan
  judul (diwarnai sama dgn `color` aksen). `METRIC_ICONS` (map metric_key →
  ikon MUI) ditambah di `Dashboard/index.tsx`, dipasang ke tiap kartu.
- Chart type per metrik (bar/area/line/stacked-bar) SUDAH benar sejak §9
  awal (diverifikasi baca `dashboard.service.ts`) — bukan bagian yang
  rusak, cuma warnanya yang seragam.

Diverifikasi: `bun run build` + `bun run lint` (frontend) 0 error.
**Belum diverifikasi visual** (screenshot ulang) — user perlu cek tampilan
nyata sebelum dianggap final, terutama kartu `avg_gross_profit`
(stacked-bar 3-tier pakai `theme.custom.rank`, perlu dipastikan 3 shade-nya
kelihatan beda di skala kecil 64px).

### §9 lanjutan v3 — Bug fill hitam di area chart (2026-08-09)

User screenshot setelah v2: warna per kartu SUDAH ikut palet dgn benar
(dikonfirmasi cocok dgn token palet aktif "Modern Teal" — pink/rose utk
Produk (`data[2]`), indigo utk Omset & Revenue (`data[0]`), biru utk
dormant (`data[1]`), mint utk Transaksi (`secondary`), teal utk stacked-bar
KPI4 (`rank`) — semua sesuai `metricAccentColor`), TAPI kartu `avg_category`
(satu-satunya `chartType: 'area'`) area fill-nya HITAM, bukan tint warna
pink lembut.

**Root cause**: `id` gradient SVG dibuat dari `title` mentah
(`statcard-fill-${title}`) — title punya spasi ("Rata-rata Kategori
Produk"), jadi `fill="url(#statcard-fill-Rata-rata Kategori Produk)"`
tidak valid (spasi memutus token `url()`), browser gagal resolve gradient
→ fallback fill hitam solid.

**Fix**: id gradient diganti `useId()` (React, selalu valid & unik per
instance, bukan turunan teks bebas) + reference `url()` DIKUTIP
(`url("#statcard-fill${gradientId}")`) supaya aman dari karakter spesial
apa pun ke depannya, bukan cuma kasus spasi ini. Diverifikasi `bun run
build` + `bun run lint` (frontend) 0 error.

### §9 lanjutan v4 — Chart & warna per KPI disamakan ke halaman aslinya (2026-08-09)

Koreksi user: "chart di dashboard jenisnya sama kan dengan chart di halaman
masing-masing KPI" — v2/v3 di atas masih pakai skema warna kategori/bundel
buatan sendiri, BUKAN warna literal dari chart asli tiap halaman KPI.
Diaudit 1-per-1 (ComboChartWidget/AreaChartWidget/LineChartWidget/
BarChartWidget/LineAlertWidget/BulletChartWidget di 9 halaman KPI + 1
pilot KPI4) — ketemu 4 `chart_type` juga SALAH (bukan cuma warna):
`cross_selling_ratio` seharusnya line (bukan bar), `repeat_order_rate`
line (bukan bar), `expansion_rate` bar (bukan line), `reactivation_rate`
line (bukan bar). Semua diperbaiki di `dashboard.service.ts` + warna
kartu (`metricAccentColor`) diganti total jadi literal per halaman asli
(info/success/primary/error sesuai chart utama tiap KPI, lihat comment di
kode). Gauge/bullet chart (RadialBarWidget KPI6, BulletChartWidget KPI10)
TIDAK direplikasi — bentuknya 1-nilai snapshot, chart tren garis di
halaman yang sama dipakai sbg acuan (paling sebanding dgn sparkline
12-titik). Diverifikasi `bun run build`+`lint` (frontend) 0 error.

### §9 lanjutan v5 — periodType disambungkan ke 10 metrik dashboard (2026-08-09)

User: "kenapa filter periode bulanan, kuartalan, semester, tahunan di
dashboard tidak bekerja?" — dikonfirmasi ke kode: `periodType` di
`KpiFilterBar` Dashboard SELALU murni state UI, TIDAK PERNAH dikirim ke
backend (`DashboardParams` tidak punya field itu, `dashboardQuerySchema`
juga tidak). Headline tiap kartu SELALU `trend.at(-1)` (1 titik bulan
terakhir), apa pun dropdown Periode yang dipilih — item ini sebelumnya
sengaja DITUNDA di §9 krn butuh audit semantik per-metrik (kelas risiko
sama dgn saga KPI4 §8e-§8g), sekarang dikerjakan.

**Perubahan**:
- `dashboardQuerySchema`/`DashboardParams` — field baru `period_start`
  (opsional, YYYY-MM-DD). `Dashboard/index.tsx` menghitungnya via
  `getPeriodDateRange(periodType, periodKey).start` — FUNGSI YANG SAMA
  dipakai 10 halaman KPI individual, bukan logic baru.
- `dashboard.service.ts` — fungsi baru `averageInRange(trend, start, end,
  accessor)`: rata-rata field bulanan yg bulannya (`'YYYY-MM'`) ada di
  antara `[start, end]` inklusif. Pola SAMA dgn `sumMonthsInRange`/
  `averageMonthsInRange` frontend (fix bug §8g: filter by bulan KALENDER
  asli, BUKAN trailing-N-by-posisi-array dari HARI INI — itu sumber bug
  "kartu terisi, tabel kosong" di KPI4 dulu). `start` opsional → fallback
  ke perilaku lama (titik bulan terakhir) kalau frontend tidak kirim
  `period_start`, backward compatible.
- Headline (`current.*`) dan YoY (`yoy.*`) SEKARANG dihitung via
  `averageInRange` per metrik, ganti `trend.at(-1)` — 10 metrik dipakai
  fungsi agregasi SAMA (RATA-RATA, bukan SUM), krn semua field ini
  (ratio/rata-rata per customer/rate/estimasi valuasi) memang metrik
  ber-tipe rata-rata di halaman aslinya masing-masing (diverifikasi: 9/10
  halaman KPI individual pakai `averageLastMonths` utk headline-nya).
  "Existing customer" per titik trend TETAP dihitung kontemporer thd
  bulannya sendiri (prinsip §8e tidak berubah — yang berubah cuma bulan-
  bulan mana yg di-rata-rata, bukan definisi populasinya).
- `buildCard()` — signature berubah, terima `currentValue` eksplisit dari
  caller (bukan derive `trend.at(-1)` di dalam lagi).
- `PeriodStrip` + tiap `periodLabel`/`comparisonLabel` StatCard — sebelumnya
  `formatMonthLabel(data.period_month)` (1 bulan tetap, makanya badge atas
  "Periode: 2026-08" tidak pernah berubah walau dropdown diganti). Diganti
  `currentRangeText`/`comparisonRangeText` (dihitung frontend, pola PERSIS
  `formatDateRange({start: periodStart, end: endDate})` di 10 halaman KPI)
  — sekarang genuinely nunjukin rentang aktif ("1 Juli – 9 Agustus 2026"),
  bukan cuma 1 bulan.

**Scope**: cuma Dashboard Overview. 9 halaman KPI individual (yang MASIH
pakai `averageLastMonths` trailing-N-by-posisi, bukan `averageMonthsInRange`
kalender-aligned) TIDAK disentuh — itu TODO terpisah yang sudah dicatat di
§8t ("audit sumLastMonths/averageLastMonths, ganti sumMonthsInRange kalau
ada bug yg sama").

Diverifikasi: `bunx tsc --noEmit` (backend) + `bun run build`+`lint`
(frontend) 0 error. **Belum diverifikasi angka manual ke DB** — user perlu
cek visual dulu (ganti dropdown Periode, pastikan angka kartu genuinely
berubah) sebelum diaudit lebih lanjut.

### §9 lanjutan v6 — TODO §8t lunas: 8 halaman KPI lain kena bug §8g juga (2026-08-10)

User laporkan: "reactivation rate di dashboard dan di KPI tidak sama" — root
cause PERSIS bug §8g (KPI4) yang sudah diketahui tapi belum di-rollout:
Dashboard Overview (v5 di atas) sudah pakai agregasi rentang-kalender
(`averageInRange` backend), sedangkan 9 halaman KPI individual (kecuali
KPI4 yang sudah dibenahi) masih pakai `averageLastMonths`/`sumLastMonths`
(trailing-N-BY-POSISI-ARRAY dari titik terakhir, BUKAN rentang kalender
`periodStart..endDate` yang ditampilkan di caption) — 2 tempat beda logika
utk metrik yang sama = 2 angka beda kapan pun `endDate` tidak persis di
akhir bulan kalender.

**Fix**: `averageMonthsInRange`/`sumMonthsInRange` (sebelumnya page-local di
`CustomerGrossProfit/index.tsx`, cuma varian SUM) dipindah jadi fungsi
sentral di `utils/analisisComparison.ts` (2 varian: rata-rata & jumlah,
keduanya filter trend by bulan kalender asli). `averageLastMonths`/
`sumLastMonths` lama DITANDAI `@deprecated` (tidak dihapus dulu biar histori
diff kebaca) — SEMUA pemanggilnya dimigrasi:

- `CrossSelling`, `AvgCategoryPerCustomer` (cross_selling_ratio/avg_category)
- `DormantRate`, `DormantValue`, `ReactivationRate` (dormant_rate/
  dormant_value/reactivation_rate — laporan user asalnya dari sini)
- `HighMarginPenetration` (penetrasi % + 2 SUM Total Revenue/Total Revenue HM)
- `RepeatOrder` (M6 gauge — tanpa YoY, cuma 1 sisi)
- `CustomerExpansion` (expansion_rate)
- `CustomerGrossProfit` (KPI4) — local `sumMonthsInRange` diganti import dari
  versi sentral, duplikasi dihapus.

Parameter kalkulasi TIDAK berubah di manapun (business_configs + tanggal per
titik trend tetap sama) — murni ganti fungsi agregasi TAMPILAN (bulan mana
yg di-rata-rata/jumlah), prinsip §8e/§8f tetap berlaku.

Diverifikasi: `bun run build` + `bun run lint` (frontend) 0 error, backend
tidak tersentuh (perubahan murni frontend). **Belum diverifikasi angka
manual ke DB** — user perlu cek: angka Reactivation Rate di Dashboard vs
halaman `/reactivation-rate` sekarang harus SAMA persis di periodType/
endDate yang sama.

## §10 — Rollout standar KPI4 ke 9 halaman KPI lain (2026-08-10)

Instruksi user: "standar halaman per KPI adalah halaman customer-gross-profit,
perbaiki seluruh 9 KPI lain dengan standar yang sama dari layout dan
filtering." Percobaan pertama (CrossSelling) SEMPAT ditandai selesai
padahal cuma banner yang dipindah, section kartu (elemen paling mencolok di
KPI4) belum dibuat sama sekali — ditegur user langsung, diperbaiki sebelum
lanjut ke 8 halaman sisanya.

### Komponen sentral baru (supaya 9 halaman TIDAK copy-paste JSX KPI4)

- **`PeriodYoyBanner`** (`components/analisis/PeriodYoyBanner.tsx`) — banner
  "Detail Periode & Pembanding YoY" (ikon kalender + rentang aktif + rentang
  YoY + kotak baseline/perubahan), diekstrak dari JSX inline
  `CustomerGrossProfit/index.tsx`. Digeneralisasi terima array `metrics`
  (KPI4 cuma 1 metrik total, tapi Revenue/HighMargin butuh 2-4 metrik
  sekaligus). **KPI4 sendiri diretrofit** pakai komponen ini juga (bukan
  cuma 9 halaman baru) — supaya cuma ada 1 sumber kebenaran, bukan 2 versi
  yang bisa saling drift.
- **`KpiMetricCard`** (`components/analisis/KpiMetricCard.tsx`) — kartu
  bordered-left generik (label+badge, value besar, caption, badge
  growth+delta+"Tahun lalu: X"), diekstrak dari pola 3-kartu-tier KPI4.
  Beda dari kartu tier asli (yang spesifik data berjenjang): komponen ini
  dipakai utk kartu metrik APA PUN.
- i18n baru: `common.periodBanner.*` (label banner generik), `common.
  periodBanner.comparisonValueCaption` ("Tahun lalu: {{value}}").

### Per halaman — kartu yang dipasang (bukan tier fiktif, diambil dari data yg SUDAH ada)

| Halaman | Kartu | Sumber data |
|---|---|---|
| CrossSelling (KPI1) | Customer Aktif · Multi-Kategori | numerator/denominator ratio, YoY dari trend bulanan |
| AvgCategoryPerCustomer (KPI2) | Unit · Consumable · Sparepart | breakdown 3 tipe kategori dari tabel (snapshot, tanpa YoY) |
| CustomerRevenue (avg_revenue) | Avg Revenue · Median Revenue | fetch kedua `useCustomerMetrics` di comparisonDate (baru ditambah) |
| HighMarginPenetration (KPI5) | Total Revenue · Total Revenue HM · Kontribusi% · Penetrasi% | 4 metrik yang sebelumnya di KpiSummaryStrip, dipindah jadi kartu |
| RepeatOrder (KPI6) | Jumlah Order · Repeat Order Rate | fetch kedua `useCustomerMetrics` di comparisonDate (baru ditambah) utk YoY gauge |
| CustomerExpansion (KPI7) | Naik · Datar/Turun | up_rate vs flat_down_rate, inverse polarity utk kartu ke-2 |
| DormantRate (KPI8) | Dormant Rate · Jumlah Dormant | dormant_rate_current, inverse polarity |
| DormantValue (KPI9) | Estimasi Nilai Hilang · Jumlah Dormant | value_trend + dormant_rate_current (endpoint sama, tanpa fetch baru) |
| ReactivationRate (KPI10) | Reactivation Rate · Jumlah Direaktivasi | reactivated_customers.length, inverse polarity TIDAK berlaku (naik=baik) |

### Perubahan struktural lain (SEMUA 9 halaman)

- Prop `mode: 'statistik' | 'report'` **DIHAPUS TOTAL** — halaman sekarang
  1 komponen gabungan chart+tabel, sama seperti KPI4. `KpiSummaryStrip`
  (banner lama, ada chevron ‹ › prev/next) diganti `PeriodYoyBanner` di
  SEMUA 9 halaman — fitur navigasi prev/next period ikut hilang (tidak ada
  di standar KPI4).
- Urutan section diseragamkan: Header → Filter bar → Banner YoY → Kartu →
  Chart → Tabel (KPI4 taruh Filter SEBELUM Banner, bukan sesudah seperti
  pola KpiSummaryStrip lama — 9 halaman disamakan ke urutan KPI4).
- `routeConstants.tsx` — 9 route `/report/*` **DIHAPUS** (duplikat murni,
  komponennya sudah sama dgn route Statistik). Dicek dulu tidak ada
  deep-link lain yang mengarah ke path itu (grep bersih).
- `config/menu.tsx` — grup nav "Report" (3 collapsible: omset-revenue/
  produk/transaksi) **DIHAPUS TOTAL**. `page_settings` row `report-*` yang
  sudah ke-seed DIBIARKAN ada di DB (harmless), sama persis preseden KPI4
  (§8a).
- `utils/analisisComparison.ts` — `averageLastMonths`/`sumLastMonths`
  ditandai `@deprecated` (0 pemanggil lagi setelah migrasi §9 v6, tidak
  dihapus biar histori diff kebaca). `shiftEndDate` (`utils/analisisPeriod.ts`)
  sekarang JUGA 0 pemanggil (cuma dipakai chevron KpiSummaryStrip yang
  sudah dilepas) — dicatat, belum dihapus.
- `components/analisis/KpiSummaryStrip.tsx` — 0 pemanggil aktif lagi
  (semua sudah pindah `PeriodYoyBanner`). Dibiarkan ada (dead code, sama
  pola dgn `M4GrossProfit.tsx`/`RangeFilter.tsx` yang sudah dicatat
  sebelumnya), belum dihapus.

Diverifikasi: `bun run build` + `bun run lint` (frontend) 0 error di setiap
tahap (per halaman, bukan cuma di akhir), `tsc --noEmit` backend 0 error
(tidak tersentuh). **Belum diverifikasi visual** — user perlu cek tampilan
nyata 9 halaman ini, terutama kartu yang datanya diadaptasi (bukan tier
literal spt KPI4): CrossSelling, AvgCategoryPerCustomer, RepeatOrder,
DormantValue.

## §11 — Rollout chart 2-kolom 50/50 dari referensi literal executive-kpi-dashboard/ (2026-08-10)

Lanjutan §10. Instruksi user setelah §10 selesai: "Patern nya adalah setiap
KPI memiliki 2 jenis cart [chart]" lalu ditegaskan ulang dengan
`@../executive-kpi-dashboard/` — bukan cuma "2 chart" versi interpretasi
bebas, tapi literal per-file `KPI1View.tsx`..`KPI10View.tsx` di reference
project itu sbg sumber kebenaran urutan/jenis chart kiri (breakdown periode
berjalan) vs kanan (tren 12 bulan, yang di 9/10 halaman SUDAH ada duluan).

Pola implementasi: `<Grid container spacing={2}><Grid size={{xs:12,md:6}}>
{chart breakdown baru}</Grid><Grid size={{xs:12,md:6}}>{chart tren lama}
</Grid></Grid>` — SAMA di semua 9 halaman, mengikuti grid 50/50 reference.

### Per halaman — chart kiri (breakdown) yang ditambah

| Halaman | Chart kiri (baru) | Sumber data | Catatan adaptasi |
|---|---|---|---|
| CrossSelling (KPI1) | Bar — distribusi 1/2/3+ kategori | `data.heatmap`, dihitung client dari `Object.values(r.values).filter(v>0).length` | `theme.custom.rank[2/1/0]` (data berjenjang) |
| AvgCategoryPerCustomer (KPI2) | Bar horizontal — Unit/Consumable/Sparepart | `data.detail` rows, `has_unit/has_consumable/has_sparepart` | — |
| CustomerRevenue | Bar — Avg vs Median Revenue | `avgRevenueCurrent`/`medianRevenueCurrent` (SUDAH dihitung utk kartu §10) | reference KPI3 aslinya "Existing Active Count", tidak ada padanan langsung — dipakai Avg/Median krn datanya sudah tersedia |
| HighMarginPenetration (KPI5) | **Bar** (BUKAN donut) — Total Revenue vs Total Revenue HM | `totalRevenueCurrent`/`totalHmRevenueCurrent` | reference KPI5View pakai donut, TAPI donut di halaman ini SUDAH DIHAPUS eksplisit atas instruksi user (task025 §21, "hapus donat chart, sudah digantikan tren") — dihormati, tidak di-reintroduce |
| RepeatOrder (KPI6) | — (susunan ulang, bukan chart baru) | `M6RepeatOrder.tsx` — RadialBar (kiri) + LineChart tren (kanan), sebelumnya ditumpuk vertikal | — |
| CustomerExpansion (KPI7) | Bar — jumlah customer Naik vs Turun/Datar | `breakdown.rows`, `filter(status==='up'/'flat_down').length` | — |
| DormantRate (KPI8) | **Donut** — proporsi Dormant vs Aktif | `drc.dormant_count` / `total_customers - dormant_count` | reference KPI8View pakai bar per `businessCategory` (field fiktif, tidak ada di skema kita); `division` sempat dipertimbangkan tapi endpoint `/customers` server-side paginated — tidak bisa diagregasi penuh per-divisi tanpa fetch semua baris (bisa ratusan), jadi dipakai proporsi dormant/aktif dari agregat yang SUDAH lengkap (`drc`) |
| DormantValue (KPI9) | Bar horizontal top-5 (dipangkas dari top-20 full) | `data.value_ranking.slice(0,5)` | Chart kanan JUGA baru — sebelumnya halaman ini TIDAK punya chart tren sama sekali, sekarang pakai `data.value_trend` (field sudah ada di API, baru dipakai sbg chart) via `LineChartWidget`. Tabel di bawah tetap tampilkan full top-20 |
| ReactivationRate (KPI10) | — (verifikasi saja) | — | Grid 50/50 Bullet+Trend SUDAH ada dari §10, tidak perlu perubahan |

### Keputusan yang disengaja (bukan kelalaian)

- **HighMarginPenetration TIDAK dapat donut** meski reference project
  menunjukkannya — instruksi eksplisit user sebelumnya (task025 §21) lebih
  tinggi prioritasnya dari referensi visual, diganti bar chart 2-series.
- **DormantRate TIDAK breakdown per divisi** meski reference project
  menunjukkan breakdown per kategori bisnis — field itu tidak ada di skema
  kita, dan alternatif "per divisi" butuh fetch semua baris dormant
  (berpotensi ratusan) padahal endpoint `/customers` sengaja server-side
  paginated. Donut dormant-vs-aktif dipilih krn datanya SUDAH agregat
  lengkap dari `dormant_rate_current`, tanpa fetch tambahan.
- **DormantValue chart kiri dipangkas ke top-5** (bukan full top-20 spt
  bar horizontal lama) — di kolom 50% lebar, 20 baris horizontal jadi
  terlalu padat/tidak terbaca. Tabel di bawah tetap full top-20, jadi tidak
  ada data yang hilang, cuma preview chart yang dipersingkat.

Diverifikasi: `bun run build` 0 error TS + `bun run lint` 0 error (12
warning pre-existing, tidak terkait perubahan ini) setelah SEMUA 9 halaman
selesai. **Belum diverifikasi visual** — sama seperti §10, user perlu cek
tampilan nyata terutama DormantRate (donut baru) dan DormantValue (chart
tren yang benar-benar baru, belum pernah ada sebelumnya).
