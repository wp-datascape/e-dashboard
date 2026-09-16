# Task 041 (HOLDINGIT-699) - Precompute Revenue/GP per Periode Tertutup

> **STATUS: implementasi mekanisme precompute SELESAI + diverifikasi
> (2026-09-16), BELUM di-commit.** Lanjutan dari task040.md (Bug Timeout M7
> Expansion Breakdown + Cache Status Customer). Ditulis 2026-09-11 atas
> instruksi user: "catat dulu sebagai task lanjutan" saat mengevaluasi draf
> prompt audit arsitektur yang mengusulkan tabel terpisah
> `customer_monthly_metrics`. Didiskusikan ulang 2026-09-15 setelah task040
> selesai (M3-M7/M8-M10 sudah migrasi ke `customer_status_snapshot`) -
> keputusan berubah dari "tabel baru" jadi "perluas tabel yang sudah ada"
> (lihat bagian Skema). **Cakupan sesi ini TERBATAS ke mekanisme precompute
> itu sendiri (kolom+komputasi+scheduler) - migrasi M3-M6 utk KONSUMSI
> kolom ini TIDAK termasuk, lihat "Yang belum dikerjakan" bawah.**

## Kenapa dipisah dari task040

Task040.md fokus ke **status** pelanggan (Acquisition/Active Customer/
Reactivated/Lapsed/Dormant/Relapsed, lihat Glosarium resmi di
`frontend/src/i18n/locales/id/help/glossary.md`), BUKAN angka finansial.
Task039 (checkpoint status, PR #200) sudah menetapkan keputusan desain
eksplisit: revenue/GP/avg_revenue/expansion_rate/repeat_order_rate di
M3-M6 TETAP live (bulan berjalan) saat `apply_date_cutoff` AKTIF, sengaja
TIDAK ikut digeser ke checkpoint tertutup ("populasi siapa dormant butuh
kepastian bulan tutup, angka uang tidak"). Membekukan revenue/GP jadi
snapshot bulanan tanpa syarat akan BERTENTANGAN dengan keputusan itu kalau
diterapkan begitu saja ke SEMUA mode.

## Kenapa ide ini tetap masuk akal (bukan ditolak)

Diverifikasi langsung ke kode (2026-09-11, `metrics.service.ts`,
`resolveDormantSnapshotBucket`/`resolveTrendPeriod`): saat
`apply_date_cutoff` **OFF** (mode DEFAULT aplikasi ini), data yang
ditampilkan SUDAH memakai periode lalu yang penuh tertutup
(`getPreviousPeriodKey` + rentang kalender penuh via `getPeriodRange`),
BUKAN data live hari-berjalan. Jadi untuk mode default ini, precompute
revenue/GP per periode tertutup TIDAK mengubah semantik yang sudah ada
sekarang - cuma memindahkan KAPAN dihitung (dari on-demand tiap request,
jadi sekali di background), sama seperti usulan status di task040.

**Yang perlu dijaga**: mode `apply_date_cutoff` AKTIF (live, prorata ke
hari berjalan) TIDAK BOLEH ikut memakai snapshot ini - itu butuh data
real-time, di luar cakupan precompute per-definisi. Jadi kalau
diimplementasikan, `customer_monthly_metrics` cuma jadi sumber data untuk
mode default (cutoff off), bukan pengganti total jalur live.

## Keputusan skema (2026-09-15, dikonfirmasi user)

**Tabel baru `customer_monthly_metrics` DIBATALKAN.** Diganti: perluas
`customer_status_snapshot` (`db/schema/customer_status_snapshot.ts`,
sudah ada sejak task040) dengan 3 kolom baru:

```
customer_status_snapshot  (SUDAH ADA, tambah kolom di bawah)
  ...kolom eksisting (status, is_relapsed, last_invoice_date, dst)...
  revenue            numeric NOT NULL DEFAULT 0  -- SUM invoices.total_revenue, customer ini, s/d checkpoint_date
  gross_profit       numeric NOT NULL DEFAULT 0  -- SUM gross profit, definisi sama m3m7.repository.ts
  transaction_count  int NOT NULL DEFAULT 0      -- COUNT invoice, customer ini, s/d checkpoint_date
```

Alasan (bandingkan dgn opsi tabel terpisah, dibahas 2026-09-15):
- **Tulis lebih murah**: `computeCustomerStatusSnapshot` SUDAH agregasi
  invoice per customer per checkpoint (dipakai tentukan status +
  `last_invoice_date`). Nambah SUM revenue/GP + COUNT transaksi ke query
  agregasi yang SAMA nyaris gratis - 1 kali scan invoice per customer,
  bukan 2 kali (tabel terpisah butuh scan ulang dari nol).
- **Baca lebih murah utk konsumen gabungan**: M3-M6 butuh KEDUA hal
  (populasi "existing" = status active+reactivated, LALU agregasi revenue
  mereka) - baca 1 tabel, bukan JOIN 2 snapshot di key yang sama persis.
- **Preseden sudah ada**: `last_invoice_date` ditambahkan ke tabel yang
  sama persis dgn alasan sama (2026-09-15, migrasi M8-M10) - 1 kolom
  turunan tambahan dari agregasi invoice yang sudah jalan, bukan
  pipeline baru.
- Siklus update SAMA PERSIS (keduanya recompute pas checkpoint tutup,
  scheduler trigger sama) - tidak ada keuntungan memisah cadence.

**Yang TIDAK ikut dipindah ke kolom baru ini** (tetap dihitung on-demand
dari `invoices`/`invoice_items` seperti sekarang, TIDAK termasuk scope
task041): median revenue per bucket, top customer/GP contributor, HM
revenue per customer (basisnya `invoice_items.revenue` item-level dgn
filter klasifikasi high-margin, bukan `invoices.total_revenue` per
customer - beda basis data, di luar cakupan 3 kolom di atas). Kolom baru
ini cuma menggantikan SUM/AVG polos per customer; statistik lintas-
customer per bucket (percentile, ranking) tetap query-time, tapi jadi
jauh lebih murah karena sumbernya sudah tabel sempit per customer, bukan
JOIN item-level ke `invoices`.

Kandidat pemakai: M3-M6 (revenue/GP per existing customer, tabel
breakdown yang sekarang hitung SUM/AVG on-demand per request via CTE di
`m3m7.repository.ts`).

## Belum diputuskan (yang sudah resolved dicoret)

- ~~Prioritas eksekusi~~ - dikerjakan TERAKHIR dari 4 task pending sesuai
  rencana (setelah Customer Workbench/HOLDINGIT-694, task044/HOLDINGIT-
  697+698). task042 (audit, HOLDINGIT-700) baru menyusul setelah ini.
- ~~Migrasi kolom~~ - `0028_motionless_wildside.sql` (`ALTER TABLE
  customer_status_snapshot ADD COLUMN revenue/gross_profit/
  transaction_count`), sudah diterapkan ke DB lokal via `db:migrate`.
- ~~Nomor tiket Plane~~ - HOLDINGIT-699 (dikonfirmasi user 2026-09-16).

### Implementasi + verifikasi (2026-09-16)

**Yang dikerjakan** (murni mekanisme precompute, SESUAI cakupan skema yang
disepakati - lihat catatan pembatasan di STATUS atas):
- `db/schema/customer_status_snapshot.ts` - 3 kolom baru (`revenue`,
  `gross_profit` numeric(15,2) DEFAULT '0', `transaction_count` integer
  DEFAULT 0), precision SAMA PERSIS `invoices.total_revenue/total_gp`
  (bukan definisi baru).
- `customer-status-snapshot.repository.ts::computeCustomerStatusSnapshot` -
  CTE `inv` tambah `total_revenue`/`total_gp` per invoice, CTE `cxm`
  tambah `SUM(...)  FILTER (WHERE invoice_date <= bucket.end)` (revenue/
  gross_profit) + `COUNT(*) FILTER (...)` (transaction_count) - SAMA
  batasnya dgn `last_at_me` (kumulatif s/d checkpoint, BUKAN cuma 1
  periode - lihat "Definisi revenue: kumulatif, bukan per-periode" bawah
  utk kenapa).
- `customer-status-scheduler.ts` - insert scheduler ikut sertakan 3 field
  baru (tinggal pass-through dari hasil compute).

**Definisi revenue: kumulatif, bukan per-periode** (klarifikasi penting,
supaya konsumen masa depan tidak salah pakai) - kolom `revenue`/
`gross_profit` di checkpoint "Agustus" = SUM SEMUA invoice customer itu
SEJAK AWAL (first invoice) SAMPAI 31 Agustus, BUKAN cuma invoice DI
Agustus saja. Ini SENGAJA mengikuti pola persis `last_invoice_date`
(kolom yang sudah ada, juga kumulatif tanpa batas bawah) sesuai preseden
yang eksplisit disebut di "Keputusan skema" atas. Kalau nanti M3-M6 mau
konsumsi kolom ini, definisi PER-PERIODE (revenue KHUSUS 1 bulan/kuartal)
HARUS dihitung terpisah (mis. `revenue_at_checkpoint - revenue_at_prev_checkpoint`
utk 1 periode penuh) - BUKAN diasumsikan kolom ini sudah per-periode.

**Verifikasi**: cross-check 3 sample customer company 1 (langsung ke
`invoices` via SQL manual, bandingkan SUM/COUNT thd `computeCustomerStatusSnapshot`)
- MATCH PERSIS ketiganya (revenue, gross_profit, transaction_count).
Backfill penuh (`runCustomerStatusSnapshotJob({forceRecompute:true,
recomputePeriods:13})`, SEMUA company/division/period_type/checkpoint,
1.154.134 baris, selesai 208,5 detik) dijalankan supaya baris snapshot
yang SUDAH ada (dibuat sebelum migrasi ini) ikut terisi kolom baru, bukan
cuma default 0 sampai rollover periode berikutnya.

**Anomali dicek+dikonfirmasi BUKAN bug**: 68 dari 1,15 juta baris py
`transaction_count > 0 TAPI revenue = 0` - awalnya dicurigai bug, dicek 2
sample: (a) customer dgn 1 invoice genuinely Rp0 (revenue=0 memang benar),
(b) customer dgn 2 invoice company-wide (Rp3.895.000 + Rp0), TAPI baris
snapshot yang diperiksa division-SCOPED (division_id=22) - dicek langsung
mapping channel_divisions, invoice Rp3.895.000 ternyata masuk division_id
LAIN (8), jadi baris division 22 BENAR cuma menghitung 1 invoice (Rp0)
miliknya - konsisten dgn konvensi division-scoped snapshot yang SUDAH ada
(task040.md), bukan kesalahan komputasi baru.

Regresi test: `scope-isolation.e2e.test.ts` 25 pass/1 fail (Task G5,
pre-existing) dan `metric-cache.e2e.test.ts` 41 pass/3 fail/1 error
(EDASHBOARD-591, pre-existing) - SAMA PERSIS baseline, tsc bersih.

## Yang belum dikerjakan (di luar cakupan sesi ini, follow-up terpisah)

- **Migrasi M3-M6 utk konsumsi kolom ini** - "Kandidat pemakai" di atas
  TETAP sekadar kandidat, BELUM ada keputusan desain fast-path/fallback
  spt migrasi M3-M10/Customer Workbench sebelumnya (task040). Perlu
  didesain terpisah: definisi PER-PERIODE (bukan kumulatif, lihat catatan
  di atas) perlu turunan tambahan; `m3m7.repository.ts::fetchCustomerMetricsTrend`
  py statistik lintas-customer (median, top contributor, HM revenue) yang
  TIDAK bisa dijawab kolom sempit ini saja - scope migrasinya sendiri
  besar, pantas jadi task terpisah kalau/ketika diprioritaskan.
- Verifikasi mode `apply_date_cutoff` AKTIF tetap TIDAK memakai kolom ini
  (harus tetap live) - belum relevan diverifikasi krn belum ada consumer
  yang membaca kolom ini sama sekali di sesi ini.
