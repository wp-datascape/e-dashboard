# Task 039 (EDASHBOARD-TBD) — Satukan Checkpoint Status Customer (New/Active/Existing/Dormant)

> **STATUS: implementasi selesai, diverifikasi lokal (2026-09-11)** — base
> customer M7 (trend card), M7 (dialog drilldown), dan M8 (Total - Dormant)
> sekarang MATCH persis di semua granularitas periode (Bulanan/Kuartalan/
> Semesteran/Tahunan) dan 2 company diuji langsung ke DB lokal. Customer
> Workbench (badge status + filter dropdown) ikut disamakan, diverifikasi:
> new+active+existing+dormant = total_customers M8 persis. `tsc --noEmit`
> bersih.
>
> **Cakupan geser mundur**: HANYA evaluasi Dormant. Revenue/GP/avg_revenue/
> expansion_rate/repeat_order_rate/dst di M3-M6 TETAP pakai data bulan
> berjalan (live), TIDAK ikut digeser — keputusan desain eksplisit (populasi
> "siapa dormant" butuh kepastian bulan tutup, angka uang tidak).
>
> **Bug susulan ditemukan+diperbaiki (2026-09-11, ditemukan user via
> pertanyaan "geser mundur customer new ini gimana maksutnya")**: implementasi
> awal Customer Workbench (`sqlStatusExpr`/`sqlStatusWhere`) SALAH pakai 1
> `refDate` yang sama utk activeCutoff (batas New/Active) DAN isDormant —
> akibatnya klasifikasi "New" ikut tergeser walau TIDAK diminta (diverifikasi
> via git stash: company 1 status=new berubah 5→11, lebih dari 2x lipat).
> Fix: `sqlStatusExpr`/`sqlStatusWhere` sekarang terima 2 tanggal terpisah —
> `refDate` (live, tetap dipakai activeCutoff/New) dan `dormantRefDate`
> (opsional, checkpoint tertutup, KHUSUS isDormant). Diverifikasi ulang:
> status=new company 1 kembali ke 5 (sesuai live, tidak ikut geser), dormant
> tetap 440 (match M8), sum new+active+existing+dormant tetap = total_customers
> M8 di kedua company.
>
> **Test suite**: `bun test` (276 test, 17 file) → 263 pass, 4 skip, 9 fail.
> Diaudit: TIDAK ADA kegagalan yang menyebut m3m7/m8m10/customers/dormant/
> status/period.util — 9 gagalnya soal RBAC scope invoice (`scope-isolation.
> e2e.test.ts`, 4x, di 2 file/run) dan matrix KPI production (`production-
> kpi-matrix.e2e.test.ts`, 5x). Yang paling mencurigakan ("MD KNT identik
> Super Admin @ KNT", customerCount 32001 vs 32000) diverifikasi LANGSUNG via
> `git stash` (kembali ke kode SEBELUM task039) + jalan ulang test yang sama
> → TETAP GAGAL dgn diff persis sama → **pre-existing, bukan akibat
> perubahan task039 ini**. 3 kegagalan lain (division label, invoice filter
> company, RBAC branch leak) beda subjek total dari perubahan sesi ini,
> tidak diverifikasi stash-test satu-satu (audit isi diff cukup jelas tidak
> bersinggungan).
>
> **BELUM di-commit** — menunggu nomor tiket Plane dari user.

## Yang dikerjakan

1. `period.util.ts` — 2 fungsi baru: `buildStatusCheckpointBuckets` (12 titik
   trend, geser 1 periode, diekstrak dari logic yang sebelumnya inline di
   `getDormantCustomerMetrics`) dan `resolveStatusCheckpointDate` (checkpoint
   tunggal, dipakai fitur non-trend).
2. `metrics.service.ts::getCustomerMetrics` (M3-M7) — hitung `statusBuckets`
   via `buildStatusCheckpointBuckets`, kirim ke `fetchCustomerMetricsTrend`
   sbg parameter ke-4.
3. `metrics.service.ts::getDormantCustomerMetrics` (M8-M10) — REFACTOR (bukan
   ubah perilaku): inline shift-logic diganti panggil `buildStatusCheckpointBuckets`
   yang sama, SSOT.
4. `metrics.service.ts::getExpansionBreakdown` (dialog drilldown M7) — hitung
   `statusCheckpoint` via `resolveStatusCheckpointDate`, kirim ke
   `fetchExpansionBreakdown` sbg parameter ke-5 (opsional, fallback ke
   `filterDate` kalau tidak dikirim — backward-compat).
5. `m3m7.repository.ts::fetchCustomerMetricsTrend` — parameter baru
   `statusBuckets`, CTE `status_buckets` baru, `last_inv_per_bucket` sekarang
   pakai `sb.pe` (checkpoint tertutup) bukan `b.pe` (live) utk evaluasi
   dormant. Populasi "existing" (not-new gate) TIDAK berubah (tetap live,
   SSOT dgn `is_existing_at_me` M8 yang jg pakai live_buckets).
6. `m3m7.repository.ts::fetchExpansionBreakdown` — parameter baru
   `statusCheckpoint` (opsional), dipakai gantikan `filterDate` di 2 tempat
   (`established_not_dormant`, main query + fallback zero-rows).
7. `customers.repository.ts` (`buildCustomerQueryContext`/`findCustomers`,
   `findCustomerDetail`) — `statusRefDate` baru (checkpoint tertutup),
   dipakai gantikan `refDate` KHUSUS di `sqlStatusExpr`/`sqlStatusWhere`.
   `refDate` asli TETAP dipakai utk live_last/live_first/lifetime_value/
   avg_monthly_revenue (tidak berubah).

## Verifikasi (company 1 & 2, 4 granularitas periode, ke DB lokal langsung)

| Company | Period | M7 trend (Customer Base) | M7 drilldown (total_existing) | M8 (Total - Dormant) |
|---|---|---|---|---|
| 1 | monthly | 554 | 554 | 554 |
| 1 | quarter | 603 | 603 | 603 |
| 1 | semester | 603 | 603 | 603 |
| 1 | annual | 567 | 567 | 567 |
| 2 | monthly | 13241 | 13241 | 13241 |
| 2 | quarter | 15925 | 15925 | 15925 |
| 2 | semester | 15925 | 15925 | 15925 |
| 2 | annual | 15174 | 15174 | 15174 |

Semua 8 kombinasi MATCH persis. Customer Workbench (company 1): new=11,
active=85, existing=458, dormant=440 → jumlah 994 = `total_customers` M8
(994), dan dormant=440 = `dormant_count` M8 (440).

## Belum dikerjakan / di luar cakupan sesi ini

- Nomor tiket Plane (EDASHBOARD-NNN) — masih ditunggu dari user, BELUM commit.
- Hasil `bun test` penuh — masih berjalan saat dokumen ini ditulis, belum
  dikonfirmasi 0 regresi baru.

## Context

Ditemukan lewat audit user (2026-09-10): kartu "Customer Base" di M7 (Customer
Expansion) dan "Total Customer Base" - "Dormant" di M8 (Dormant Rate)
seharusnya menghasilkan angka base customer yang sama (kategori dormant per
divisi sudah identik, reuse `dormantThresholdCaseSql`/`dormantCrossedSql` yang
sama), tapi di lapangan beda cukup jauh (contoh nyata: M7 = 550, M8
(984-382) = 602, selisih 52).

Setelah ditelusuri ke `metrics.service.ts`, akar masalahnya BUKAN beda rumus
ambang dormant (itu sudah SATU sumber kebenaran), tapi **checkpoint tanggal
evaluasi status customer berbeda di 3 tempat independen**:

| Fitur | File | Checkpoint saat ini |
|---|---|---|
| M3-M7 (`getCustomerMetrics`) | `metrics.service.ts:267-287` | Live, TIDAK digeser — "Agustus" = data Agustus itu sendiri |
| M8-M10 (`getDormantCustomerMetrics`) | `metrics.service.ts:560-567` | Digeser mundur 1 periode kalender penuh — "Agustus" = data JULI (definisi FINAL user 2026-08-24, "customer dormant baru pasti kalau bulan sudah tutup") |
| Customer Workbench (list + detail) | `customers/customers.repository.ts` (`buildCustomerQueryContext`, `findCustomerDetail`) | `refDate = as_of_date ?? CURRENT_DATE` — live, checkpoint ke-3 yang independen dari 2 di atas |

Ketiganya lewat helper SQL yang sama (`dormantCrossedSql`,
`dormantThresholdCaseSql` di `customers/helper/segment.helper.ts`) — jadi
RUMUS ambangnya sudah reusable. Yang TIDAK reusable adalah **tanggal
acuan (checkpoint)** yang dioper ke rumus itu — tiap fitur menghitung
sendiri-sendiri, ada yang live, ada yang digeser 1 bulan.

Keputusan user (2026-09-10): checkpoint M8 (bulan lalu yang sudah tutup
penuh) jadi SATU-SATUNYA definisi resmi status customer (New/Active/
Existing/Dormant), dipakai SEMUA KPI yang punya parameter status customer.
Metrik/angka lain yang dihitung DI ATAS populasi itu (revenue, GP, expansion
rate, dst) boleh tetap pakai window data masing-masing sesuai kebutuhan KPI
itu — yang wajib sama cuma "siapa yang berstatus apa".

## Scope (blast radius, sudah diaudit lewat search `dormantCrossedSql`)

Persis 3 grup pemanggil, tidak lebih (`analisis.repository.ts`/
`retention.repository.ts` sudah dicek, TIDAK pakai klasifikasi status sama
sekali — cuma filter Pareto/revenue, di luar scope):

1. `m3m7.repository.ts::fetchCustomerMetricsTrend` — CTE `existing` (gate
   New/Existing) + `existing_not_dormant` (gate M7 "Customer Base")
2. `m3m7.repository.ts::fetchExpansionBreakdown` — drilldown M7
3. `m8m10.repository.ts` (`fetchDormantTrend`, `fetchDormantValueRanking`,
   `fetchCustomerDormantStatusLog`) — REFERENSI, sudah benar, jadi sumber
   pola yang di-reuse, minimal diubah
4. `customers/helper/segment.helper.ts::sqlStatusExpr` + `sqlStatusWhere` —
   dipakai `customers.repository.ts` (`buildCustomerQueryContext`/
   `findCustomers`, `findCustomerDetail`)

## Rencana implementasi

1. **Utility checkpoint baru** (`period.util.ts`, dekat
   `resolveTrendPeriod`/`getPreviousPeriodKey` yang sudah ada) —
   `resolveStatusCheckpointDate(periodType, referenceDate)`: return tanggal
   akhir periode kalender SEBELUM periode yang mengandung `referenceDate`
   (logic-nya SUDAH ada, sekarang cuma dipakai inline di
   `getDormantCustomerMetrics` — diekstrak jadi fungsi reusable, bukan
   ditulis ulang).
2. **M3-M7** (`m3m7.repository.ts` + service-nya) — tambah 1 parameter baru
   berisi checkpoint tanggal tertutup (mirror pola `buckets` vs
   `live_buckets` yang sudah ada di M8), dipakai KHUSUS di CTE `existing` dan
   `existing_not_dormant` untuk gate New/Existing/Dormant. CTE lain
   (`active_inv_agg`, `prev_inv_agg`, revenue/GP/high-margin) TETAP pakai
   bucket live seperti sekarang — angka revenue/GP/expansion rate TIDAK
   ikut mundur, cuma populasi "siapa yang existing/dormant" yang disamakan.
3. **Customer Workbench** (`customers.repository.ts`) — `sqlStatusExpr`/
   `sqlStatusWhere` menerima `refDate` checkpoint baru (`resolveStatusCheckpointDate`
   relatif ke `as_of_date ?? hari ini`, granularitas bulanan default sama
   seperti M8), TERPISAH dari `refDate` yang sudah ada (yang tetap dipakai
   utk live_last/live_first/lifetime_value/avg_monthly_revenue — TIDAK
   berubah). Efek: badge status New/Active/Existing/Dormant di Customer
   Workbench sekarang mencerminkan kondisi per akhir bulan lalu, bukan hari
   ini persis (dikonfirmasi user, disengaja).
4. **M8-M10** — TIDAK berubah perilaku (sudah benar), tapi checkpoint
   inline-nya di-refactor manggil `resolveStatusCheckpointDate` yang baru
   (SSOT, bukan 2 implementasi paralel yang kebetulan sama).
5. Verifikasi: base customer M7 (`existing_not_dormant_count`) HARUS persis
   sama dengan M8 (`total_customers - dormant_count`) di company/period yang
   sama, untuk SEMUA periodType (Bulanan/Kuartalan/Semesteran/Tahunan) — cek
   query langsung ke DB, bukan cuma baca kode.

## Belum diputuskan / perlu dikonfirmasi user

- Nomor tiket Plane (EDASHBOARD-NNN) untuk commit/PR.
