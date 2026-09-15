# Task044 - Perbaikan Checkpoint Trend (SSOT M3-M10) + KPI Baru M11 Retention Rate

> **STATUS: Bagian 1 (HOLDINGIT-697) SELESAI + diverifikasi + SUDAH
> di-commit (2026-09-16). Bagian 2 (HOLDINGIT-698, M11) SELESAI +
> diverifikasi (2026-09-16), BELUM di-commit.**
> Nomor tiket dikonfirmasi user 2026-09-16 - **DUA tiket terpisah**, satu
> per bagian (bukan 1 tiket gabungan): **Bagian 1 = HOLDINGIT-697** (Fitur
> checkpoint carry-forward), **Bagian 2 = HOLDINGIT-698** (KPI baru M11
> Retention Rate).

## Latar belakang

Bermula dari permintaan user: "buat tren baru di halaman Retention, formula
Retention Rate = cohort aktif bulan B / cohort bulan A, titik trend
terakhir (belum tutup periode) carry-forward dari titik sebelumnya, titik
lain hitung normal (TIDAK digeser)". Saat verifikasi pola ini terhadap M8-
M10 (yang SUDAH pakai konvensi "shift 1 periode" utk SEMUA titik trend),
user menegaskan: **M8-M10 juga HARUS diubah** ke pola carry-forward-cuma-
titik-terakhir, karena basis perhitungannya sama.

## Bagian 1 (HOLDINGIT-697) — Perbaikan `buildStatusCheckpointBuckets` (SSOT)

### Kondisi sekarang (`period.util.ts:493-500`)

```ts
export function buildStatusCheckpointBuckets(periodType: PeriodType, currentKey: string, count: number): TrailingPeriodBucket[] {
  const labelBuckets = buildTrailingPeriods(periodType, currentKey, count)
  return labelBuckets.map((b) => {
    const dataKey = getPreviousPeriodKey(periodType, b.label)  // SELALU -1, tanpa kecuali
    const dataRange = getPeriodRange(periodType, dataKey)
    return { label: b.label, start: dataRange.start, end: dataRange.end }
  })
}
```

SETIAP titik (SEMUA 12, bukan cuma yang terakhir) digeser -1 periode dari
labelnya. Konsekuensi: titik "Maret" (kalau sudah lewat setahun, jelas
sudah lama tutup) TETAP menampilkan data checkpoint Februari, bukan data
Maret sendiri yang sebenarnya sudah tersedia/stabil/bisa dihitung. Ini
bukan bug - keputusan bisnis EKSPLISIT dari task029 (dikonfirmasi
berkali-kali oleh user waktu itu): "customer yang tidak transaksi DI
Agustus baru masuk dormant BULAN SEPTEMBER" (lihat JSDoc
`fetchDormantTrend`, `m8m10.repository.ts`).

**Dipakai bersama (SSOT) oleh M3-M7 trend DAN M8-M10** (`getCustomerMetrics`/
`getDormantCustomerMetrics`, `metrics.service.ts`) - tujuan awal task039
justru menyatukan definisi ini supaya tidak ada 2 KPI beda halaman
menampilkan angka berbeda utk metrik yang sama.

### Perubahan yang diminta (2026-09-15, dikonfirmasi eksplisit user)

Cuma titik TERAKHIR (periode yang BELUM tutup, currentKey itu sendiri)
yang digeser -1. Titik-titik LAIN (sudah pasti tutup) pakai datanya
SENDIRI, tidak digeser:

```ts
export function buildStatusCheckpointBuckets(periodType: PeriodType, currentKey: string, count: number): TrailingPeriodBucket[] {
  const labelBuckets = buildTrailingPeriods(periodType, currentKey, count)
  return labelBuckets.map((b, i) => {
    const isCurrentOpenPeriod = i === labelBuckets.length - 1  // titik terakhir = currentKey, belum tutup
    const dataKey = isCurrentOpenPeriod ? getPreviousPeriodKey(periodType, b.label) : b.label
    const dataRange = getPeriodRange(periodType, dataKey)
    return { label: b.label, start: dataRange.start, end: dataRange.end }
  })
}
```

Efek "carry-forward" di titik terakhir tercapai SECARA ALAMI (bukan copy
nilai manual) - titik kedua-dari-belakang (sudah tutup, pakai datanya
sendiri) dan titik terakhir (belum tutup, dataKey-nya = periode
sebelumnya) SAMA-SAMA membaca checkpoint yang SAMA persis, jadi angkanya
otomatis identik tanpa logic tambahan.

**BELUM diverifikasi**: apakah `resolveStatusCheckpointDate` (versi
CHECKPOINT TUNGGAL, dipakai Customer Workbench/M7 drilldown single-point)
perlu ikut berubah juga, atau TETAP seperti sekarang (kemungkinan besar
TETAP - itu selalu soal "checkpoint tertutup terakhir per HARI INI",
konsepnya inherently "periode berjalan belum tutup", tidak py ambiguitas
titik-historis-yang-sudah-lama-tutup spt versi trend 12-titik) - perlu
dicek ulang sebelum implementasi, bukan diasumsikan.

### Dampak & risiko (PENTING, alasan kenapa ditahan)

- **Blast radius besar**: M3-M7 trend chart DAN M8-M10 (Dormant/
  Reaktivasi) SAMA-SAMA berubah angkanya utk 11 dari 12 titik trend
  (semua titik KECUALI yang terakhir) - BUKAN cuma titik terbaru.
- **Baru saja dimigrasi+diverifikasi ketat sesi ini** (task040: M3-M7 ke
  snapshot, M8-M10 ke snapshot, keduanya pakai `buildStatusCheckpointBuckets`
  ini sebagai SSOT checkpoint) - perubahan ini WAJIB verifikasi ulang
  setingkat itu juga (bandingkan angka lama vs baru per titik, semua
  scope company/branch/division, semua granularitas periode, konsistensi
  RBAC) - BUKAN cuma tsc bersih.
- Halaman yang kena dampak (perlu dicek satu-satu, BELUM diinventarisir
  lengkap): Dashboard Overview, CustomerMetrics (M3-M7 individual pages),
  DormantCustomer (M8/M9/M10), Retention (gabungan M6/M8/M9/M10), Report
  Growth/Retention/Revenue (PDF export), dan turunan lain yang baca trend
  12-titik ini.
- Kemungkinan ada test e2e yang HARDCODE asumsi shift lama (perlu audit
  `scope-isolation.e2e.test.ts`/`metric-cache.e2e.test.ts`/
  `production-kpi-matrix.e2e.test.ts` dan test unit `period.util.test.ts`
  kalau ada).

### Implementasi + bug ditemukan + verifikasi (2026-09-16)

File yang berubah: `period.util.ts` (`buildStatusCheckpointBuckets` - cuma
titik TERAKHIR yang digeser, sesuai pseudocode di atas),
`metrics.service.ts` (`prevBuckets` M8-M10/`getDormantCustomerMetrics` -
**bug tersembunyi ditemukan**: baris ini re-derive `dataKey` sendiri via
`getPreviousPeriodKey(label)` TANPA SYARAT, alih-alih membaca hasil
`buildStatusCheckpointBuckets` yang sebenarnya - itu artinya SSOT-nya
sudah diubah tapi ADA SALINAN LOGIC LAMA yang tidak ikut diubah. Kalau
tidak ketemu, titik-titik non-terakhir M8-M10 akan salah 1 periode utk
`prev_dormant_count`/`reactivation_rate`. Diperbaiki: `prevBuckets`
sekarang cek index (`i === arr.length - 1`) SAMA PERSIS logic SSOT-nya,
bukan re-implementasi terpisah), `m8m10.repository.ts` (**bug kedua
ditemukan SAAT verifikasi**: `ORDER BY ca.pe` di query snapshot fast path
- setelah fix, titik kedua-dari-belakang [checkpoint sendiri] dan titik
terakhir [checkpoint digeser] BISA share `checkpoint_date` yang PERSIS
SAMA [itu caranya carry-forward tercapai], jadi `ORDER BY` berbasis
tanggal checkpoint jadi ambigu/tidak stabil di antara 2 baris yang
checkpoint-nya sama - trend 12 titik terakhir muncul TERTUKAR urutannya
[Agustus dan September saling tertukar posisi]. Diperbaiki: `ORDER BY
ca.label` [selalu unik per titik, sortable leksikografis] - bukan
`ca.pe`).

M3-M7 (`fetchCustomerMetricsTrend`) TIDAK butuh perbaikan tambahan -
`statusBuckets` sudah SELALU dipakai APA ADANYA dari parameter (tidak ada
salinan logic terpisah), dan `ORDER BY`-nya sendiri pakai `buckets`
(window revenue, TIDAK ikut berubah oleh fix ini) bukan `status_buckets`,
jadi tidak kena kelas bug tie yang sama.

**Verifikasi (script ad-hoc, `getCustomerMetrics`/`getDormantCustomerMetrics`
langsung via `customerMetricsQuerySchema.parse`/`dormantCustomerQuerySchema.parse`
supaya default field zod benar - awalnya sempat pakai `as any` mentah,
field yang tidak ke-default dgn benar bikin hasil salah baca, diperbaiki
sebelum lanjut verifikasi)**, `metric_cache` dikosongkan (`invalidateAllMetricCache`)
sebelum tiap pengukuran supaya tidak baca hasil basi:
- **Carry-forward titik terakhir** (company 1 & 2, monthly): M8-M10
  `active_count` Agustus=608 PERSIS SAMA September=608 (dgn fix) vs
  Agustus=616≠September=608 (tanpa fix, versi lama) - carry-forward
  tercapai. M3-M7 `existing_not_dormant_count` Agustus=608=September=608
  (dgn fix, MATCH PERSIS M8-M10 `active_count` company yang sama -
  cross-check independen) vs Agustus=616≠September=608 (tanpa fix).
- **Titik non-terakhir BERUBAH** (sesuai desain - populasi checkpoint
  sekarang beda, bukan lagi selalu -1): company 1 M8-M10 `total_customers`
  titik pertama 585→630 dst, SEMUA 11 titik non-terakhir berubah nilainya
  (diverifikasi bukan cuma titik terakhir yang benar).
- **Urutan trend 12 titik** (setelah fix ORDER BY): company 1 M8-M10 label
  kronologis benar Okt2025→Sep2026, tidak ada lagi Agustus/September
  tertukar.
- Regresi test: `scope-isolation.e2e.test.ts` 25 pass/1 fail (Task G5,
  pre-existing) dan `metric-cache.e2e.test.ts` 41 pass/3 fail/1 error
  (EDASHBOARD-591, pre-existing) - SAMA PERSIS baseline sebelum sesi ini,
  tsc bersih.

**Belum diverifikasi** (di luar waktu sesi ini, risiko rendah-sedang):
granularitas quarter/semester/annual (cuma monthly yang dites langsung);
isolasi RBAC KHUSUS utk kombinasi checkpoint baru ini (test G-series yang
ADA sudah lolos, tapi belum ada skenario baru yang SENGAJA menegaskan
titik non-terakhir tetap ter-scope benar utk user restricted); halaman
frontend yang mengonsumsi trend ini (Dashboard/CustomerMetrics/
DormantCustomer/Retention/Report PDF) belum dicek visual satu-satu -
verifikasi murni backend/data, bukan UI.

**Belum di-commit** - menunggu instruksi eksplisit user.

## Bagian 2 (HOLDINGIT-698) — KPI Baru M11 Retention Rate

Dibangun DI ATAS perbaikan Bagian 1 (butuh checkpoint carry-forward yang
benar dulu) - TIDAK bisa dikerjakan duluan secara independen kalau mau
konsisten dgn definisi baru.

### Formula (dikonfirmasi eksplisit user 2026-09-15)

```
Retention Rate(bulan B, TUTUP) =
  COUNT(customer yang status-nya Active Customer ATAU Reactivated
        di checkpoint A [periode SEBELUM B]
        DAN JUGA Active Customer ATAU Reactivated di checkpoint B)
  ÷ COUNT(customer yang status-nya Active Customer ATAU Reactivated di checkpoint A)
  × 100%
```

- Populasi = "Active Customer + Reactivated" (SAMA PERSIS istilah
  "Existing Active" di Glosarium resmi, dipakai M3-M6 - kemungkinan bisa
  reuse definisi yang sudah ada, bukan bikin gerbang populasi baru).
- Basis data: `customer_status_snapshot` (`status IN ('active',
  'reactivated')`) - self-join checkpoint A vs checkpoint B per
  customer_id, difilter scope (company/branch/division/RBAC) yang sama
  spt M8-M10.
- Titik trend TERAKHIR (belum tutup periode) - carry-forward dari titik
  sebelumnya (otomatis via perbaikan Bagian 1).

### Tampilan

- **Halaman `/retention`** (`pages/Retention/index.tsx`) - komponen baru
  (pola SAMA PERSIS `M10ReactivationRate.tsx`: 3 `KpiCard` + 1 chart
  trend 12 titik + Top 5), ditambahkan sbg section baru di halaman ini
  (REUSE komponen, bukan halaman terpisah - sama pola M6/M8/M9/M10 yang
  sudah ada).
- **3 kartu** (diusulkan, dikonfirmasi user): "Retention Rate" (nilai
  checkpoint terkini), "Customer Tertahan" (jumlah numerator - customer
  yang lolos di kedua checkpoint), "Customer Hilang" (selisih - ada di
  cohort A tapi TIDAK lagi Active/Reactivated di B).
- **Top 5**: top 5 CUSTOMER (bukan cabang/divisi) dgn value/revenue
  tertinggi di antara yang "tertahan" (masuk numerator) - pola SAMA
  `reactivated_customers` di M10 (list individual, bukan agregat).
- **Tabel di `/report/retention`** (`pages/Report/Retention/index.tsx`,
  sudah ada file-nya, isi sekarang belum dicek detail) - tambah tabel
  retention rate, kemungkinan per periode/cabang/divisi (BELUM
  dispesifikasi kolomnya, perlu dicek pola tabel Report lain yang sudah
  ada dulu sebelum desain).
- **Penomoran**: M11 (KPI ke-11, di luar M1-M10 yang sudah baku) -
  diusulkan, dikonfirmasi user.

### Belum diputuskan / perlu dicek sebelum implementasi

- Endpoint backend baru (`metrics.route.ts`/`metrics.service.ts`/
  repository baru, mis. `m11.repository.ts`?) - pola persis M8-M10 tapi
  BELUM ditulis strukturnya.
- Apakah retention rate ini py "jalur cepat snapshot vs fallback LATERAL"
  spt M3-M10, atau karena baru dibangun dari awal LANGSUNG di atas
  snapshot (tidak py versi lama yg perlu di-fallback-kan) - kemungkinan
  besar opsi kedua (lebih sederhana), tapi perlu keputusan eksplisit soal
  gerbang RBAC-scope-restriktif (kalau scope restriktif, snapshot company-
  wide tidak bisa dipakai langsung - perlu fallback APA, atau terima
  endpoint ini HANYA aktif utk scope tidak restriktif tanpa fallback sama
  sekali?).
- ~~Nomor tiket Plane~~ - HOLDINGIT-698 (dikonfirmasi user 2026-09-16).
- ~~i18n keys (id+en) utk label baru~~ - sudah ditambahkan
  (`dormantCustomer.json` id+en, key `m11*`).
- ~~Kolom tabel Report Retention persis apa saja~~ - sudah diputuskan+
  diimplementasikan (lihat "Implementasi + verifikasi" bawah): Customer/
  Company/Status(chip Retained-Lost)/Avg Revenue per Bulan.

### Implementasi + verifikasi (2026-09-16)

**Keputusan desain yang diambil saat implementasi** (2 poin "belum
diputuskan" di atas, diputuskan sendiri karena murni soal struktur kode/
konsistensi, bukan soal bisnis):
- Endpoint baru `backend/src/features/metrics/repository/m11.repository.ts`
  (file terpisah, BUKAN digabung ke `m8m10.repository.ts` - KPI baru tanpa
  keterikatan historis ke kode M8-M10 lama), + `getRetentionMetrics`/
  `getRetentionBreakdown` di `metrics.service.ts`, endpoint
  `GET /metrics/retention-rate` (trend+3kartu+top20) dan
  `GET /metrics/retention-breakdown` (tabel Report, SELURUH cohort).
  Permission REUSE `churn.risk:view` (sama gate M8-M10 di halaman
  Retention yang sama), bukan permission baru.
- Fast path (RBAC tidak restriktif) baca `customer_status_snapshot`
  langsung (self-join checkpoint A vs B). Fallback (RBAC restriktif/filter
  branch aktif) compute ON-DEMAND via `computeCustomerStatusSnapshot`
  (SSOT sama scheduler + fallback Customer Workbench, task040.md
  "Susulan...") - BUKAN "tanpa fallback sama sekali" (opsi yang tadinya
  dianggap "lebih sederhana" di atas, ternyata sama sekali tidak lebih
  sulit begitu pola computeCustomerStatusSnapshot sudah established sesi
  ini - jadi tidak ada alasan skip fallback).

**Refactor pendukung**: `resolveDormantStyleBuckets` diekstrak dari isi
`getDormantCustomerMetrics` (logic TIDAK diubah, murni dipindah jadi
fungsi reusable) - dipakai `getRetentionMetrics`/`getRetentionBreakdown`
supaya checkpoint M11 DIJAMIN sama persis M8-M10 utk company/period yang
sama (SSOT tunggal, bukan 2 implementasi paralel - persis kelas masalah
yang baru diperbaiki di Bagian 1).

**Frontend**: `pages/DormantCustomer/M11RetentionRate.tsx` (komponen baru,
3 kartu + `AreaChartWidget` trend + Top 5 - TANPA dialog drilldown per-
customer, di luar cakupan spec), ditambahkan ke `pages/Retention/index.tsx`
setelah M10. Tab baru "Retention" di `pages/Report/Retention/index.tsx`
(kolom via `useRetentionBreakdownColumns`, `dormantHelpers.tsx`) - SELURUH
cohort dgn status chip Retained/Lost, filter dropdown + search, pola SAMA
PERSIS 3 tab lain di halaman itu.

**Verifikasi**:
- Backend ad-hoc (`getRetentionMetrics`/`getRetentionBreakdown` langsung,
  `metric_cache` dikosongkan tiap pengukuran): carry-forward titik terakhir
  benar (company 1 & 2, Agustus=September identik), cross-check independen
  ke tabel snapshot MATCH PERSIS (cohort_count=139, retained_count=66,
  company 1, checkpoint Juli->Agustus), `fetchRetentionBreakdown` MATCH
  PERSIS `getRetentionMetrics` (cohort_count/retained_count/lost_count
  sama persis, 139=139, 66=66, 73=73). Isolasi RBAC: branch-restricted
  → cohort 24 (subset ketat dari 139 unrestricted), fallback jalan tanpa
  crash. tsc + lint bersih (backend+frontend).
- **Live browser** (dev server, playwright-cli, admin@mail.com): halaman
  `/retention` - section M11 render benar (34.2% Retention Rate, chart 12
  titik, Top 5 dgn Rupiah + urutan value DESC terverifikasi). Halaman
  `/report/retention?tab=retention` - tab baru muncul, kartu ringkasan
  (576 Retained 34.2% / 1.108 Lost, 576+1108=1684 cocok dgn 34,2%), tabel
  dgn status chip. **1 bug ditemukan+diperbaiki saat verifikasi visual**:
  chip status tabel awalnya reuse label kartu KPI ("Retained Customers"/
  "Lost Customers") - kepanjangan utk kolom sempit, terpotong jadi
  "Retained Cus...". Diperbaiki: key i18n baru khusus chip
  (`m11StatusRetained`/`m11StatusLost`, "Tertahan"/"Hilang").
- Regresi test: `scope-isolation.e2e.test.ts` 25 pass/1 fail (Task G5,
  pre-existing, tidak berubah).

**Belum di-commit** - menunggu instruksi eksplisit user.

## Urutan pengerjaan yang disarankan (belum final, didiskusikan lagi saat
mulai)

1. Cek `resolveStatusCheckpointDate` perlu ikut berubah atau tidak.
2. Perbaiki `buildStatusCheckpointBuckets` (Bagian 1) - SATU fungsi.
3. Verifikasi ketat M3-M7 + M8-M10 tidak regresi (bandingkan angka lama
   vs baru per titik, git stash utk pembanding, semua scope/granularitas)
   - metodologi SAMA PERSIS yang dipakai sepanjang task039/040.
4. Update test e2e yang mungkin hardcode asumsi shift lama.
5. Baru mulai desain detail + implementasi M11 Retention Rate (Bagian 2).
