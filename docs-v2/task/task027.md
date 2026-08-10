# Task 027 — Bug: Ambang Dormant Pakai 1 Threshold Dominan, Bukan Dinamis per Kategori Customer

**Status: DITEMUKAN & DIDOKUMENTASIKAN, BELUM DIEKSEKUSI.** Ditemukan 2026-08-10
lewat audit validasi klasifikasi customer (lanjutan [[task026]] — standardisasi
halaman KPI). User eksplisit: "catat temuan bug, dokumentasikan" — task ini
CUMA dokumentasi, perbaikan kode BELUM dikerjakan, tunggu instruksi lanjut.

## 1. Ringkasan Bug

`resolveDormantMonths()` (`backend/src/features/config/threshold.ts`) resolve
**SATU angka ambang dormant untuk SELURUH company/scope** (kategori bisnis
dengan volume invoice terbanyak — "kategori dominan"), lalu angka itu dipakai
SAMA RATA ke SEMUA customer di query manapun. Padahal `divisions.dormant_category`
sudah menyimpan kategori PER DIVISI (`b2b_dc`=3 bulan, `b2c`=6 bulan,
`manufacturing`=6 bulan, `b2b_project`=12 bulan) — customer seharusnya dicek
dormant/tidak pakai ambang KATEGORI MEREKA SENDIRI (dari divisi channel invoice
terakhir mereka), bukan ambang dominan company.

## 2. Bukti (company_id=1, period_end=2026-06-30)

Company 1 punya customer di 3 kategori berbeda:

| Kategori | Ambang benar | Jumlah customer |
|---|---|---|
| b2b_dc | 3 bulan | 504 |
| **b2b_project** | **12 bulan** | **446** |
| b2c | 6 bulan | 6 |

Kategori dominan (invoice terbanyak) = `b2b_dc` (3 bulan) — angka INI yang
dipakai ke SEMUA 956 customer, termasuk 446 customer `b2b_project` yang
seharusnya dapat toleransi 12 bulan.

**Hasil salah (threshold tunggal 3 bulan, kondisi SEKARANG):**
```
Dormant b2b_dc      = 298
Dormant b2b_project = 295   ← SALAH, threshold seharusnya 12 bulan bukan 3
Dormant b2c         = 5
TOTAL DORMANT        = 598
```

**Hasil benar (threshold dinamis per kategori):**
```
Dormant b2b_dc      = 298   (threshold 3 bulan, sudah benar)
Dormant b2b_project = 94    ← threshold 12 bulan diterapkan
Dormant b2c         = 5
TOTAL DORMANT        = 397
```

**Selisih: 201 customer kategori Project SALAH dicap Dormant.** Mereka
customer proyek dengan siklus beli panjang (wajar tidak order 4-11 bulan),
tapi sistem langsung cap dormant di bulan ke-4 memakai ambang kategori lain
yang tidak relevan buat mereka.

### Query verifikasi (dijalankan manual, bisa direplikasi)

```sql
WITH last_inv AS (
  SELECT DISTINCT ON (i.customer_id)
    i.customer_id, i.invoice_date, i.channel_name
  FROM invoices i
  WHERE i.company_id=1 AND i.deleted_at IS NULL AND i.invoice_date <= '2026-06-30'
  ORDER BY i.customer_id, i.invoice_date DESC, i.id DESC
),
cat AS (
  SELECT li.customer_id, li.invoice_date AS last_date,
         COALESCE(d.dormant_category, 'b2b_dc') AS kategori
  FROM last_inv li
  LEFT JOIN channel_divisions cd ON cd.channel_name = li.channel_name AND cd.company_id = 1
  LEFT JOIN divisions d ON d.id = cd.division_id
)
SELECT kategori, count(*) AS jumlah_customer,
  count(*) FILTER (WHERE last_date <= '2026-06-30'::date - 3*INTERVAL '1 month')
    AS dormant_pakai_3bulan_SEKARANG,
  count(*) FILTER (WHERE last_date <= '2026-06-30'::date - CASE kategori
    WHEN 'b2b_project' THEN 12 WHEN 'b2c' THEN 6 WHEN 'manufacturing' THEN 6
    ELSE 3 END * INTERVAL '1 month')
    AS dormant_pakai_threshold_DINAMIS
FROM cat
GROUP BY kategori
ORDER BY jumlah_customer DESC;
```

## 3. Cakupan dampak — SEMUA tempat yang pakai `resolveDormantMonths()`

Semua ini pakai pola "1 threshold scalar dari `resolveSegmentParams`", bukan
per-customer:

1. **`customers.repository.ts`** (`sqlStatusExpr`/`sqlStatusWhere`,
   `segment.helper.ts`) — Customer Workbench: kolom status per baris DAN
   filter dropdown status=dormant/existing/active.
2. **`m8m10.repository.ts`** (`fetchDormantTrend`, `fetchDormantValueRanking`,
   `fetchReactivatedCustomers`) — KPI8 (Dormant Rate), KPI9 (Dormant Value),
   KPI10 (Reactivation Rate). Ini termasuk SEMUA perbaikan yang baru dibuat
   sesi ini (kartu Total/Aktif/Ringan/Kronis DormantRate, dkk) — angkanya
   akan berubah lagi setelah fix ini diterapkan.
3. **`m3m7.repository.ts`** (`cteEstablishedCustomers`/`existing` CTE,
   `fetchCustomerMetricsTrend`, `fetchExpansionBreakdown`) — KPI3-7 (Revenue,
   GP, Expansion, dst), termasuk "Total Existing" (329) yang jadi acuan
   cross-check sesi ini.
4. **`m4.repository.ts`** (`fetchGpBreakdown`) — KPI4 Gross Profit breakdown.

**Konsekuensi**: hampir semua angka "Existing"/"Dormant"/"Total" yang sudah
diverifikasi sepanjang sesi ini (329, 598, dst.) akan BERUBAH setelah fix —
bukan karena verifikasi sebelumnya salah caranya, tapi karena root
threshold-nya yang ternyata belum dinamis.

## 4. Klasifikasi customer — model final yang disepakati (konteks buat fix nanti)

Selama diskusi menemukan bug ini, disepakati juga model klasifikasi 4-flag
(New/Active/Existing/Dormant) yang benar — dicatat di sini supaya tidak
hilang konteksnya.

### 4.1 Matrix klasifikasi (sumber asli dari user, 2026-08-10)

| Contoh Customer | New | Active | Existing | Dormant |
|---|:---:|:---:|:---:|:---:|
| First transaksi bulan/periode ini (end_date → datepicker) | ✅ | ✅ | ❌ | ❌ |
| Customer lama, transaksi bulan berjalan/periode (end_date → datepicker) | ❌ | ✅ | ✅ | ❌ |
| Customer lama, tidak transaksi bulan/periode ini, terakhir transaksi 1–2 bulan lalu (masih dalam 90 hari) berdasarkan threshold dinamis | ❌ | ❌ | ✅ | ❌ |
| Customer lama, terakhir transaksi lebih dari 90 hari (misal 4 bulan lalu) | ❌ | ❌ | ❌ | ✅ |

Catatan baca matrix ini: "90 hari" di baris 3-4 itu CONTOH angka (kasus
umum b2b_dc=3 bulan) — di implementasi nyata, angka ini WAJIB threshold
dinamis per kategori bisnis customer (3/6/12 bulan sesuai `dormant_category`
divisi mereka, lihat §2-3), bukan 90 hari tetap untuk semua customer.

4 flag ini **boleh overlap** — baris 1 nunjukkin New DAN Active sama-sama
true (customer baru otomatis juga Active di bulan pertamanya), baris 2
nunjukkin Active DAN Existing sama-sama true (customer lama yang transaksi
lagi tetap "Existing", bukan keluar dari kategori itu cuma karena aktif
bulan ini). Ini BEDA dari implementasi lama (`sqlStatusExpr`) yang pakai
CASE/switch — 1 customer cuma dapat 1 label eksklusif. Definisi kolom:

- **New** = transaksi PERTAMA (first-ever) customer ini jatuh di
  periode/bulan yang sedang dilihat.
- **Active** = customer PUNYA transaksi di periode/bulan yang sedang
  dilihat — regardless baru atau lama.
- **Existing** = customer LAMA (bukan New) yang BELUM lewat ambang dormant
  dinamis per end_date — regardless transaksi periode ini atau tidak.
- **Dormant** = transaksi terakhir customer SUDAH lewat ambang dormant
  dinamis per end_date.

### 4.2 Formula turunan (hasil diskusi lanjutan, utk agregasi periode)

- **New** & **Active** — flag berbasis RENTANG (`periodStart..end_date`),
  DISTINCT count, boleh dijumlah antar-bulan untuk periode lebih lebar
  (New) karena tiap customer cuma "New" di 1 bulan (kejadian sekali).
- **Existing** & **Dormant** — flag berbasis TITIK WAKTU (EOP, snapshot
  `end_date` doang), dihitung ULANG tiap bulan secara independen (bukan
  dibawa dari bulan sebelumnya). Untuk periode lebih lebar (Kuartalan/
  Semesteran/Tahunan), ambil snapshot bulan TERAKHIR saja — BUKAN dijumlah,
  BUKAN dirata-rata (customer yang sama bisa dormant berturut-turut,
  dijumlah = double count).
- 4 flag ini **boleh overlap** (New customer yang transaksi bulan ini juga
  Active; Active customer lama juga Existing) — bukan status eksklusif
  seperti CASE/switch yang dipakai sekarang.
- Threshold dormant harus **dinamis per customer** (sesuai kategori bisnis
  divisi channel invoice terakhir mereka) — ini bug utama task ini.

## 5. Rencana perbaikan (BELUM dieksekusi)

1. Buat 1 fungsi/CTE SQL terpusat (SSOT) yang JOIN customer → divisi channel
   terakhir → `dormant_category` → threshold masing-masing, gantikan pola
   `last_invoice <= refDate - dormantMonths::int * INTERVAL '1 month'`
   (scalar tunggal) di 4 file pada §3.
2. Terapkan model 4-flag (§4) — New/Active rentang+DISTINCT,
   Existing/Dormant EOP per-bulan dinamis.
3. Verifikasi ulang SEMUA angka yang sudah dibahas sesi ini (329, 598, dst.)
   dengan threshold dinamis — expect berubah, dokumentasikan angka baru.
4. Pertimbangkan arsitektur efisiensi yang juga dibahas sesi ini: kolom
   `customers.status` (flag current, di-update cron) + tabel ringkas
   `customer_monthly_status` (agregat 4 kategori per bulan per company/
   divisi, BUKAN 1 baris per customer per bulan) — supaya baca cepat,
   histori terkunci per bulan, tidak recompute live tiap request.

## 6. Referensi

- Spek asli user: "Customer Activity Snapshot & Period Aggregation" (dikirim
  2026-08-10, prinsip EOP vs average vs sum, monthly snapshot sbg basis).
- Tabel klasifikasi 4-flag (screenshot user, 2026-08-10) — sumber model §4.
- [[task026]] — task asal (standardisasi layout KPI) tempat audit ini
  bermula.
