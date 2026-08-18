# Task 029 — Dashboard Information Architecture & KPI Mapping (Spec)

**Status: SPEC/PLANNING, BELUM DIEKSEKUSI.** Rekap dari dokumen desain lengkap
yang dikirim user (2026-08-19) — restrukturisasi IA (navigasi, pengelompokan
10 KPI, halaman Overview baru, pola breakdown, filter persisten). Ini
menggantikan/menyempurnakan hasil critique UI sebelumnya (task028 bagian UI,
lihat `.impeccable/critique/`) — user menilai treatment dev branch saat ini
("standarisasi 10 halaman KPI ke template KPI4", commit 48dc858) tidak bagus,
dan minta pakai basis UI yang ada di branch `main` sebagai starting point,
BUKAN yang ada di `dev` sekarang. Detail keputusan itu menyusul setelah
investigasi perbedaan main vs dev — belum final di dokumen ini.

Dokumen ini murni REKAP spec asli user, disusun ulang jadi markdown supaya
mudah dirujuk — bukan rencana implementasi (fase/prioritas belum diputuskan).

---

## 1. Struktur Navigasi

**Keputusan final (user, 2026-08-19): TANPA parent menu "Matrix".** Growth/
Retention/Value jadi menu utama mandiri, sejajar dengan Overview — bukan
sub-menu bersarang. Draft awal spec sempat menyebut opsi "Matrix" sebagai
parent (dicoret di bawah, disimpan sebagai riwayat keputusan, BUKAN struktur
final).

```
DASHBOARD
│
├── Overview
├── Growth
├── Retention
└── Value
```

**Konsep:**
- Overview → Executive Summary
- Growth → Customer & business expansion
- Retention → Customer health & engagement
- Value → Revenue & profitability

~~Draft awal: Growth, Retention, dan Value sebagai sub-menu dari parent
menu "Matrix" (Dashboard → Overview / Matrix → Growth/Retention/Value).
Ditolak user — langsung 4 menu utama sejajar, tanpa Matrix.~~

## 2. Pengelompokan 10 KPI

| KPI | Growth | Retention | Value |
|---|:---:|:---:|:---:|
| M1 — Cross Selling | ✓ | | |
| M2 — Average Product Category | ✓ | | |
| M3 — Average Revenue / Existing Customer | | | ✓ |
| M4 — Average Gross Profit / Existing Customer | | | ✓ |
| M5 — High Margin Product Penetration | | | ✓ |
| M6 — Repeat Order Rate | | ✓ | |
| M7 — Customer Expansion Rate | ✓ | | |
| M8 — Dormant Customer Rate | | ✓ | |
| M9 — Dormant Customer Value | | ✓ | |
| M10 — Customer Reactivation Rate | | ✓ | |

**Catatan M9:** Dormant Customer Value ditempatkan di Retention karena
konteks utamanya "berapa besar value customer yang sedang berisiko akibat
dormant?". KPI ini tetap boleh ditampilkan sebagai supporting metric di area
Value kalau diperlukan, tapi tidak perlu jadi KPI kedua di sana.

## 3. Overview

**Tujuan:** dalam 10–15 detik management tahu kondisi bisnis secara
keseluruhan. Overview TIDAK menampilkan seluruh 10 KPI sebagai chart besar —
cuma ambil summary dari Growth, Retention, dan Value.

```
Overview
│
├── Executive KPI Summary
├── Revenue & Profit
├── Customer Health
├── Customer Growth
└── Key Alerts
```

### 3.1 Executive KPI Summary

Menampilkan KPI bisnis paling penting, contoh:

| Metrik | Nilai | Perubahan |
|---|---|---|
| Revenue | Rp 12.4B | +Rp 1.37B (+12.4%) |
| Gross Profit | Rp 2.1B | -Rp 80M (-3.2%) |
| Existing Customers | 326 | +16 (+5.2%) |
| Dormant Customers | 204 | +25 (+13.9%) |

**Prinsip:** jangan cuma "Revenue +12.4%" — tapi Current Value, Comparison
Value, Absolute Change, Percentage Change sekaligus.

## 4. Revenue & Profit

Overview cukup 2 chart utama (Revenue, Gross Profit), masing-masing:
nilai besar + delta YoY (▲/▼ absolut + %) + Area/Line Chart. Tooltip tetap
seperti yang sudah dipakai sekarang.

## 5. Customer Health

Ambil KPI M6 (Repeat Order Rate), M8 (Dormant Customer Rate), M10
(Customer Reactivation Rate) — 3 kartu berdampingan, tiap kartu: nilai +
delta (pp) + mini chart. Tujuan: indikasi cepat customer base sehat/tidak.

## 6. Customer Growth

Ambil M1 (Cross Selling), M2 (Avg Product Category), M7 (Customer
Expansion Rate) — 3 kartu berdampingan. Overview cuma kasih signal; analisis
lanjutan masuk ke menu Growth.

## 7. Key Alerts

Ambil kondisi dari rule/threshold tiap KPI, contoh:

- 🔴 Dormant Customer Rate — 62.6% (above critical threshold)
- 🔴 Repeat Order Rate — 49.1% (below target)
- 🟡 Gross Profit — -Rp 80M (-3.2%) YoY
- 🟢 Customer Expansion — +Rp 320M (+24.8%) YoY

Dengan §3-7, Overview jadi **Business Status Dashboard**, bukan sekadar
kumpulan grafik.

## 8. Growth

```
Growth
│
├── M1 Cross Selling
├── M2 Average Product Category
└── M7 Customer Expansion Rate
```

### 8.1 M1 — Cross Selling

**Tujuan:** seberapa banyak existing customer beli >1 kategori/produk.

**Main Visualization:** 100% Stacked Bar (Cross-Selling Customers vs
Single-Category Customers).

**KPI Summary:** Current Rate 38.4% · Comparison 36.5% · Change +1.9pp

**Tooltip** (contoh, Aug 2026): Cross-Selling Customers 126 · Single-Category
Customers 200 · Existing Customers 326 · Cross Selling Rate 38.7% · Avg
Categories/Customer 2.4

**Breakdown** (Customer Breakdown): Customer · Categories · Products ·
Revenue · Cross Selling (Yes/No) · Δ YoY

## 9. M2 — Average Product Category

**Tujuan:** rata-rata jumlah kategori produk yang dibeli existing customer.

**Main Visualization:** Distribution Bar (1 category / 2 categories / 3 /
4 / 5+).

**KPI Summary:** Current 2.4 · Comparison 2.1 · Change +0.3

**Tooltip:** Avg Categories/Customer 2.4 · Existing Customers 326 · Total
Categories Purchased 782 · Median Categories 2 · YoY Change +0.3

**Breakdown** (Customer/Category Breakdown): Customer · Categories · Top
Category · Revenue · Last Order

## 10. M7 — Customer Expansion Rate

**Tujuan:** customer yang mengalami peningkatan purchase/value.

**Main Visualization:** 100% Stacked Bar (Expanded / Stable / Contracted).

**KPI Summary:**
- Expanded Customers — Current 16 · Comparison 13 · Change +3 customers
- Expansion Rate — Current 5.0% · Comparison 4.1% · Change +0.9pp

**Monetary Impact** (value growth): Customer Revenue — Current Rp 4.12B ·
Comparison Rp 3.80B · Change +Rp 320M · Growth +8.4%

**Breakdown** (Customer Expansion Breakdown): Customer · Previous Revenue ·
Current Revenue · Change · Growth % · Status (Expanded/Contracted/Stable)

## 11. Retention

```
Retention
│
├── M6 Repeat Order Rate
├── M8 Dormant Customer Rate
├── M9 Dormant Customer Value
└── M10 Customer Reactivation Rate
```

## 12. M6 — Repeat Order Rate

**Main Visualization:** 100% Stacked Bar (Repeat / Non-repeat).

**KPI Summary:** Current 49.1% · Comparison 54.8% · Change -5.7pp; Current
Customers 160 · Comparison Customers 179 · Change -19

**Breakdown** (Customer Order Behavior): Customer · Orders · Revenue · Last
Order · Previous Order · Status (Repeat/New/Dormant)

## 13. M8 — Dormant Customer Rate

**Main Visualization:** Area Chart + Critical Threshold.

**KPI Summary:**
- Dormant Customers — Current 204 · Comparison 179 · Change +25 customers
- Dormant Rate — Current 62.6% · Comparison 54.9% · Change +7.7pp

**Tooltip:** Dormant Rate 62.6% · Dormant Customers 204 · Existing Customers
326 · Critical Threshold 10% · Above Threshold +52.6pp · 45+ Days Without
Order 204

**Breakdown** (Dormant Customer Breakdown): Customer · Last Order · Days
Inactive · Previous Revenue · Lifetime Revenue · Status (Critical/Dormant)

## 14. M9 — Dormant Customer Value

**Tujuan:** value/revenue yang berisiko akibat customer dormant.

**Main Visualization:** Area Chart.

**KPI Summary:** Dormant Customer Value — Current Rp 2.84B · Comparison
Rp 2.35B · Change +Rp 490M · Growth +20.9%; Dormant Customers 204 vs 179
(+25)

**Breakdown** (Dormant Value at Risk): Customer · Last Revenue · GP · Last
Order · Days Inactive · Revenue at Risk · Priority (High/Medium)

## 15. M10 — Customer Reactivation Rate

**Main Visualization:** Bar + Line (bar = jumlah reactivated, line = rate).

**KPI Summary:**
- Reactivated Customers — Current 2 · Comparison 5 · Change -3
- Reactivation Rate — Current 0.5% · Comparison 1.5% · Change -1.0pp

**Monetary Impact:** Reactivated Revenue — Current Rp 82M · Comparison
Rp 140M · Change -Rp 58M · Growth -41.4%

**Breakdown** (Reactivated Customer Breakdown): Customer · Dormant Since ·
Reactivated · Reactivation Date · Revenue · Orders · GP

## 16. Value

```
Value
│
├── M3 Average Revenue / Existing Customer
├── M4 Average Gross Profit / Existing Customer
└── M5 High Margin Product Penetration
```

## 17. M3 — Average Revenue / Existing Customer

**Main Visualization:** Area + Line.

**KPI Summary:** Current Rp 151.1K · Comparison Rp 180.4K · Change -Rp 29.3K
· Growth -16.2%

**Tooltip** (pola sudah dipakai sekarang): Existing Customer Revenue
Rp 4.93M · Total Established 32,600 · Avg Revenue/Customer Rp 151.1K ·
Median Threshold Rp 630.0K · High Margin Contribution Rp 531.54M ·
Contribution Percentage 10.8%

**Breakdown** (Customer Revenue Breakdown): Customer · Revenue · Avg
Revenue · Share · Orders · Δ YoY

## 18. M4 — Average Gross Profit / Existing Customer

**Main Visualization:** Area + Line.

**KPI Summary:** Current Rp 97.2K · Comparison Rp 104.8K · Change -Rp 7.6K
· Growth -7.3%

**Breakdown** (Customer Gross Profit Breakdown): Customer · Revenue · Gross
Profit · GP Margin · Share GP · Δ YoY

## 19. M5 — High Margin Product Penetration

**Main Visualization:** 100% Stacked Bar + Target (High Margin Revenue vs
Other Revenue).

**KPI Summary:**
- High Margin Revenue — Current Rp 531.54M · Comparison Rp 620M · Change
  -Rp 88.46M · Growth -14.3%
- Contribution — Current 10.8% · Comparison 13.2% · Change -2.4pp
- Target 20.0% · Gap -9.2pp

**Tooltip:** High Margin Revenue Rp 531.54M · Other Revenue Rp 4.40B ·
Total Revenue Rp 4.93B · Contribution 10.8% · Target 20.0% · Gap -9.2pp

**Breakdown** (Product Breakdown): Product · Revenue · Gross Profit · GP
Margin · Revenue Share · High Margin (Yes/No)

## 20. Standard Comparison

Dashboard cuma pakai YoY sebagai satu-satunya comparison — seluruh KPI pakai
pola yang sama.

**Monetary KPI:** Current · Comparison · Absolute Change · Growth %

**Count KPI:** Current · Comparison · Absolute Change · Growth %

**Rate KPI:** pakai **percentage point (pp)**, BUKAN relative % — contoh
Current 49.1% · YoY 54.8% · Change **-5.7pp** (bukan -10.4%, supaya tidak
rancu antara relative growth dan percentage-point change).

## 21. Standard Periode

Semua menu pakai standar YoY:

| Period | Current | Comparison |
|---|---|---|
| Monthly | Aug 2026 | Aug 2025 |
| Quarterly | Q3 2026 | Q3 2025 |
| Semester | H2 2026 | H2 2025 |
| Annual | FY 2026 | FY 2025 |

**Tidak perlu** MoM, QoQ, Previous Period/Month/Quarter — tujuannya jaga
dashboard tetap sederhana.

## 22. Global Filter

Filter konsisten di seluruh layer, termasuk Breakdown.

**Holding Level:**
```
Company       [ All ▼ ]
Period        [ Monthly ▼ ]
Period Value  [ Aug 2026 ▼ ]
```
Holding bisa pilih: All Companies / Company A / Company B / Company C.

**Company Level** (setelah user berada di 1 company, filter Company tidak
perlu ditampilkan lagi karena sudah jadi context):
```
Branch        [ All ▼ ]
Division      [ All ▼ ]
Channel       [ All ▼ ]

Period        [ Monthly ▼ ]
Period Value  [ Aug 2026 ▼ ]
```

## 23. Filter Harus Persistent sampai Breakdown

Contoh: user set Company=PT A, Period=Q3 2026 di level atas → masuk menu
Retention → Dormant Customer → Breakdown → tabel otomatis pakai
Company=PT A, Period=Q3 2026, Comparison=Q3 2025 tanpa perlu di-set ulang.
User baru boleh mempersempit lebih lanjut (Branch/Division/Channel) di level
breakdown itu.

## 24. Generic Table Filter

Semua tabel breakdown pakai pola filter yang konsisten:

```
┌─────────────────────────────────────────────────────────────┐
│ Search...                                                    │
│                                                               │
│ Branch ▼    Division ▼    Channel ▼    Status ▼    Sort ▼   │
└─────────────────────────────────────────────────────────────┘
```

Filter tambahan bersifat context-aware, contoh:
- **Customer table**: Search Customer, Branch, Division, Channel, Status
- **Product table**: Search Product, Category, Brand, Status

Tapi global context (Company, Period, YoY Comparison) tetap sama di semua
tabel.

## 25. Pola UI Setiap KPI

Semua halaman KPI sebaiknya konsisten strukturnya:

```
┌─────────────────────────────────────────────────────────────┐
│ KPI NAME                                                     │
│                                                                │
│ CURRENT VALUE                                                 │
│ Rp 4.93B                                                       │
│                                                                │
│ Comparison     Rp 4.32B                                        │
│ Change         +Rp 610M                                        │
│ Growth         +14.1%                                          │
│                                                                │
│ ─────────────────────── CHART ───────────────────────────────  │
│                                                                │
│ [ Analysis ]                              [ Breakdown ]        │
└─────────────────────────────────────────────────────────────┘
```

**Tab Analysis** berisi: KPI value, Comparison, Absolute change, Growth/pp,
Chart, Tooltip, Target/threshold (kalau ada).

**Tab Breakdown** berisi: detail customer/product, Search, Filter, Sorting,
Pagination, Comparison value kalau relevan.

## 26. Prinsip Utama Dashboard

```
                                DASHBOARD
                                    │
        ┌───────────┬──────────────┼──────────────┬───────────┐
        │           │              │              │           │
     OVERVIEW     GROWTH       RETENTION         VALUE     (menu lain)
        │
┌───────┼────────┐
│       │        │
Revenue Customer Alerts
Profit  Health
```

(Tanpa parent "Matrix" — lihat §1, keputusan final user.)

Tiap KPI mengikuti alur: Current Value → Comparison Value (YoY) → Absolute
Change → Growth/pp → Chart → Tooltip → Breakdown (Search, Generic Filters,
Sort, Pagination).

**Inti desain:**
- Overview menjawab: "Bagaimana kondisi bisnis?"
- Growth menjawab: "Apakah customer/business kita berkembang?"
- Retention menjawab: "Apakah kita mempertahankan customer?"
- Value menjawab: "Seberapa besar revenue dan profit yang dihasilkan?"
- Breakdown menjawab: "Customer/product mana yang menyebabkan angka
  tersebut?"

Untuk semua KPI yang dibandingkan: jangan cuma tampilkan `+12.4%`. Tampilkan
Current → Comparison → Absolute Change → Growth %, supaya user tahu nilai
sekarang, nilai pembanding, selisih, dan persentase perubahannya sekaligus.

---

## Catatan tambahan (2026-08-19, sesi ini)

User eksplisit tidak suka arah visual di `dev` (hasil task026 "standarisasi
ke template KPI4" + fix task028) dan minta basis UI diambil dari branch
`main` sebagai starting point untuk implementasi spec di atas.

**Investigasi konkret (bukan asumsi):**

`main` (14 commit unik dari merge-base, kebanyakan security/RBAC fix) TIDAK
PERNAH menerima task025 (split M3-M7 jadi 10 halaman terpisah) maupun
task026 (standarisasi ke template KPI4: `FilterBarShell`, `PeriodYoyBanner`,
`KpiMetricCard` — semua pola bordered-Card yang jadi sumber keluhan "ramai").
`dev` 37 commit unik dari merge-base, mencakup SEMUA redesign itu.

Struktur `main` untuk M3-M7: **1 halaman bundel** `pages/CustomerMetrics/
index.tsx` (bukan 10 halaman terpisah) — filter minimal (`ScopeFilterFields`
+ `DatePicker` + toggle, TANPA Card wrapper), tiap section metrik (M3/M4/
M5+M6/M7) render langsung dalam `<Box>` polos (SectionLabel + info tooltip
+ chart), TANPA Card/border wrapping sama sekali. Ini **cocok persis**
dengan screenshot "clean" (image #5) yang user tunjukkan — kemungkinan besar
image #5 memang screenshot dari struktur main ini (atau prototype
`executive-kpi-dashboard` yang dimodel dari situ), BUKAN dari `dev`.

**Trade-off yang perlu disadari sebelum reuse main sebagai basis:**
main TIDAK punya: banner perbandingan YoY di level halaman (PeriodYoyBanner
belum ada sama sekali di main — trend chart M3 di main cuma tampilkan tren
bulanan, tanpa titik "current vs comparison" eksplisit), kartu Avg/Median
Revenue terpisah, 10 halaman terpisah dengan page-settings/permission
granular per KPI (task025), maupun beberapa fix data yang sudah masuk `dev`
sesudahnya. Kalau basis UI dari main dipakai, pola Current/Comparison/
Absolute Change/Growth% dari spec §20 (yang notabene BARU, belum ada juga
di main) tetap harus dibangun baru — main cuma referensi utk "chrome minim,
tanpa Card berlebihan", bukan sumber lengkap fitur yang dibutuhkan.

**Belum diputuskan (perlu instruksi eksplisit sebelum mulai kode):**
1. Rebuild dari nol mengikuti spec §1-26 lengkap (Overview+Growth/
   Retention/Value, filter persistent, Analysis/Breakdown tab) dengan
   visual chrome minim ala main — TIDAK reuse struktur "10 halaman terpisah"
   dev sama sekali?
2. Atau: pertahankan struktur data/routing dev yang sudah ada (10 halaman,
   RBAC page-settings), cuma GANTI visual treatment-nya (hapus Card
   berlebihan di FilterBarShell/PeriodYoyBanner/KpiMetricCard, adopsi
   chrome minim main) sambil pelan-pelan migrasi ke IA baru (menu Growth/
   Retention/Value + Overview)?
3. Mulai dari 1 halaman dulu (mis. M3/Customer Revenue) sebagai
   proof-of-concept sebelum roll-out ke 10 KPI + Overview + restrukturisasi
   nav, atau langsung semua sekaligus?

## 27. Customer/KPI Definitions — pola tampilan (tambahan user, 2026-08-19)

**Keputusan: JANGAN tabel besar.** Tujuan section ini bukan analisis, tapi
bantu user paham "angka ini sebenarnya dihitung dari siapa?" — beda fungsi
dari kartu KPI (yang jawab "berapa hasilnya?"). Definition TIDAK menggantikan
info comparison (Current/Comparison/Change/Growth% tetap ada di kartu KPI
seperti biasa, §20).

### 27.1 Di halaman Overview

Section "Customer Definitions" diletakkan SETELAH KPI summary utama,
SEBELUM chart/detail — cuma tampilkan definisi singkat utk segmen yang
paling sering bikin bingung (New/Active/Existing/Dormant), horizontal card 3-4
kolom, tidak perlu tinggi:

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Definitions                                    ⓘ   │
│ How customer segments are calculated for the selected period │
│                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│ │ NEW CUSTOMER │ │ ACTIVE       │ │ EXISTING     │ │ DORMANT││
│ │              │ │ CUSTOMER     │ │ CUSTOMER     │ │CUSTOMER││
│ │ First trans- │ │ Transacted   │ │ (deskripsi)  │ │(deskr.)││
│ │ action in    │ │ during the   │ │              │ │        ││
│ │ period       │ │ selected     │ │              │ │        ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────┘│
└─────────────────────────────────────────────────────────────┘
```

Diakhiri link "View all definitions →" ke halaman/section definisi lengkap.

**PENTING — teks definisi di card HARUS ikut SSOT task028** (`segment.helper.ts`
docstring), bukan contoh kalimat di draft ini. Contoh kalimat yang dikirim
user di pesan ini ("Existing = sudah transaksi sebelumnya DAN kembali
bertransaksi periode ini") itu ilustrasi pola UI doang, BUKAN redefinisi —
sudah dikonfirmasi user di pesan sebelumnya definisi tetap: Existing = bukan
New, TERMASUK Dormant (regardless transaksi periode ini atau tidak).

**Keputusan (user, 2026-08-19): istilah "Lost Customer" DIABAIKAN, pakai
"Dormant Customer" saja** — bukan kategori terpisah, cuma istilah dari draft
ilustrasi UI, tidak dipakai di implementasi mana pun.

### 27.2 Per halaman Growth/Retention/Value

Masing-masing punya section Definitions sendiri, spesifik ke KPI di halaman
itu — bukan pengulangan definisi customer di §27.1, tapi definisi
KPI/formula (mis. Growth: Revenue Growth/Customer Growth/GP Growth;
Retention: Retention Rate/Active Customer/Dormant Customer/Returning
Customer; Value: Revenue per Customer/GP per Customer/Average Order Value).

### 27.3 KPI Definitions lengkap — accordion, bukan flat list

Kalau daftar definisi sudah banyak (customer segments + growth + retention +
revenue + dst), JANGAN ditaruh sekaligus di Overview (kesannya jadi halaman
dokumentasi). Kelompokkan per kategori, render sebagai accordion collapsible:

```
KPI Definitions                                      ⓘ

Customer
  > New Customer
  > Active Customer
  > Existing Customer
  > Dormant Customer

Growth
  > Revenue Growth
  > Customer Growth
  > GP Growth

Retention
  > Retention Rate
  > Customer Retention
  > Repeat Customer

Value
  > Revenue / Customer
  > GP / Customer
  > Average Order Value
```

### 27.4 Ringkasan pola 2-tingkat

- **Overview**: definisi singkat cuma utk customer segment yang paling
  sering bikin bingung (New/Active/Existing/Dormant) + link "View all
  definitions →".
- **Tiap menu (Growth/Retention/Value)**: definisi spesifik KPI di menu itu
  (mis. Growth Definitions: Revenue Growth, Customer Growth, GP Growth).
- Definition section TIDAK PERNAH menggantikan kartu KPI comparison
  (Current/Comparison/Change/Growth%) — dua hal terpisah, saling melengkapi.

Opsi 3 (mulai 1 halaman) direkomendasikan mengingat skala pekerjaan (nav
restructure + 10 halaman KPI + halaman Overview baru + kemungkinan endpoint
backend baru utk Key Alerts/Customer Health/Customer Growth aggregation) —
tapi keputusan akhir tetap di tangan user.
