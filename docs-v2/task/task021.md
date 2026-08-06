# Task 021 — Analisis per-Customer untuk 10 KPI (M1–M10)

> Status: 🟡 Retention (M6) SELESAI — sisa 4 grup lain (Kategori, High Margin, Frekuensi
> lanjutan, Dormant) masih planning, belum implementasi.
> Dipicu oleh: permintaan user memperluas halaman Analisis (saat ini cuma Revenue & GP,
> M3/M4) supaya mencakup 10 KPI, dengan tampilan tabel list view yang sama.

## 0. Koreksi Arsitektur (setelah draft awal §4a)

Draft awal (di bawah) mengusulkan 1 halaman dengan dropdown "Metrik". User
mengoreksi: **Analisis jadi grup menu dengan submenu terpisah per metrik**
(Revenue, Retention, dst — bukan 1 halaman dgn selector), mirror pola
Product Portfolio (Products/High Margin/Product Trend = 3 menu terpisah 1
grup). Retention (M6) dikerjakan duluan sebagai pilot sebelum grup lain.

### 0b. Koreksi kedua — "Analisis" bukan grup sendiri, gabung ke Customer Workbench (2026-08-07)

Audit UI/UX (lihat sesi 2026-08-07) menemukan: grup "Analisis" terpisah dari
"Customer Workbench" bikin M1–M10 tampak terpencar-pencar di sidebar — user
harus buka 2 grup menu berbeda buat lihat 2 sudut pandang (tren vs rincian
per-customer) dari metrik YANG SAMA (mis. M6 Repeat Order: tren di Expansion/
Customer Workbench, rincian per-customer di Analisis Retention/grup lain).

Fix: `analisis-revenue` dan `analisis-retention` dipindah dari grup
"Transaction & Revenue" (dengan `groupLabelKey` sendiri) ke dalam Customer
Workbench, ditaruh PERSIS setelah `expansion` — karena Expansion sudah
mem-bundle M3/M4/M5/M6/M7 (metrik yang dipecah Analisis Revenue/Retention).
Grup "Analisis" sebagai konsep menu terpisah DIHAPUS (bukan cuma dipindah
posisi) — `nav.groups.analisis` juga dibuang dari `nav.json` (id/en), tidak
dipakai lagi di mana pun.

Kalau grup Analisis lain ditambah nanti (Kategori/High Margin/Dormant, lihat
§0a rencana awal) — taruh dengan pola yang sama: sejajar dengan trend page
metrik terkait di Customer Workbench, BUKAN bikin grup "Analisis" baru lagi.

Ditambah requirement baru saat implementasi: **baris ringkasan Total** di
atas tabel (Total Periode Lampau vs Total Periode Ini vs Perubahan) — SUM
dari SELURUH customer yang lolos filter (bukan cuma halaman yang tampil),
bukan cuma per-baris seperti sebelumnya. Diterapkan ke Revenue (retrofit)
DAN Retention.

## 0a. Yang Sudah Dibangun (Retention, M6)

- Backend: `retention.repository.ts` (mirror `analisis.repository.ts`,
  metrik `COUNT(DISTINCT invoice)` bukan `SUM(revenue)`), `retention.service.ts`
  (`generateRetentionAnalisis`), endpoint `GET /api/v1/analisis/retention`.
  Alert threshold REUSE ambang penurunan revenue Pareto (belum ada threshold
  jumlah-order-per-customer terpisah di `business_configs`).
- Backend: `aggregateAnalisisSummary()` (Revenue) + `aggregateRetentionSummary()`
  (Retention) — total SUM seluruh customer terfilter, dikirim via
  `meta.summary` (field generik yang sudah ada di `PaginationMeta`).
- Permission baru: `analisis.retention:menu`, `analisis.retention:view` —
  TERPISAH dari `analisis:menu`/`:view` (mirror pola `high.margin:menu`
  terpisah dari `product:menu`), supaya bisa digranulasi independen per role.
- Frontend: menu "Analisis" jadi grup 2 item (Revenue di `/analisis/revenue`,
  Retention BARU di `/analisis/retention`) — path lama `/analisis` pindah ke
  `/analisis/revenue` (termasuk deep-link dari `NotificationDetailDialog`).
  Halaman baru `pages/AnalisisRetention/index.tsx`, komponen baru
  `components/analisis/SummaryBar.tsx` (baris ringkasan, generik dipakai
  Revenue & Retention).
- **BELUM dikerjakan** (perlu langkah manual setelah deploy): `bun run db:seed`
  di dev DAN production supaya 2 permission + page_settings baru di atas
  benar-benar ada di DB (tidak ada step seed otomatis di CD pipeline).

## 1. Latar Belakang

Halaman **Analisis** (`/analisis`) saat ini menampilkan 1 tabel per-customer untuk **M3
(Revenue)** dan **M4 (Gross Profit)** sekaligus (2 kolom nilai per baris), dengan pola:

- Filter: Entitas, Cabang/Divisi, jenis Periode (Bulanan/Kuartalan/Semester/Tahunan/YTD),
  tanggal acuan, search, toggle "Customer Pareto", toggle Kecualikan Intercompany.
- Kolom: Perusahaan, Customer (+ badge Pareto), **Periode Lampau** (YoY, 1 tahun sebelumnya),
  **Periode Ini**, **Perubahan (Rp)**, **Perubahan (%)**, **Status** (Normal/Kritis — alert
  kalau penurunan lewat ambang batas dari Settings → Threshold).
- Backend: `backend/src/features/analisis/*` — `findAnalisisCustomers()` ambil semua
  customer di scope + revenue/GP periode berjalan, `aggregateInvoicesByCustomer()` hitung
  ulang utk periode pembanding (YoY tahun lalu).

User minta pola yang SAMA (list view per-customer, tabel) dibuat untuk 10 KPI (M1–M10) yang
sudah ada di dashboard/halaman lain (Cross Selling, Customer Metrics, Dormant Customer).

## 2. Temuan — Data per-Customer Sudah Ada, YoY Belum

Hampir semua KPI SUDAH punya hitungan per-customer snapshot 1 periode, dipakai sebagai modal
drill-down di halaman masing-masing — tapi TIDAK ADA yang punya perbandingan YoY, alert
threshold, atau tampil sebagai halaman list penuh (paginasi/search/sort) seperti Analisis:

| KPI | Row type existing | File | Dipakai di |
|---|---|---|---|
| M1/M2 | `CrossSellingDetailRow` (`category_count`, `has_unit`, `has_consumable`, `has_sparepart`) | `m1.repository.ts` | Modal `/cross-selling` |
| M3 | `RevenueBreakdownRow` (`revenue`, `revenue_pct`, `tier`) | dipakai analisis.repository sendiri (mirip) | Modal `/customer-metrics` (`revenue-breakdown`) |
| M4 | `GpBreakdownRow` (`gp`, `gp_pct`, `tier`) | `m4.repository.ts` | Modal `/customer-metrics` (`gp-breakdown`) |
| M5 | `HmBreakdownRow` (`hm_revenue`, `hm_pct`) | `m5.repository.ts`/`hm-customers.repository.ts` | Modal `/customer-metrics` (`hm-breakdown`) |
| M6 | `RorBreakdownRow` (`invoice_count`, `total_revenue`) | `m6.repository.ts` | Modal `/customer-metrics` (`ror-breakdown`) |
| M7 | `ExpansionBreakdownRow` (`cur_revenue`, `prev_revenue`, `status: up/flat_down`) | `m3m7.repository.ts` | Modal `/customer-metrics` (`expansion-breakdown`) |
| M9 | `DormantValueRow` (`estimated_lost_value`, `months_dormant`) | `m8m10.repository.ts` | Ranking top 20 `/dormant-customer` |
| M8, M10 | Tidak ada row per-customer — cuma agregat rate (`dormant_rate_current`, `reactivation_current`) | `m8m10.repository.ts` | `/dormant-customer` |
| M2 | Tidak ada row per-customer terpisah — derivable dari `category_count` (M1) | — | — |

**Kesimpulan feasibility: BISA**, dengan catatan M8 (dormant rate) dan M2 (avg kategori) itu
sendiri adalah angka AGREGAT populasi (bukan atribut per-customer) — per-customer view untuk
keduanya berarti menampilkan status/count mentah yang jadi bahan agregat itu, bukan literal
"nilai M8/M2 milik customer X".

## 3. Masalah Desain — 10 KPI Tidak Bisa 1 Kolom Seragam

Beda dari Revenue/GP yang sama-sama Rupiah, bentuk nilai tiap KPI beda-beda: jumlah kategori
(M1/M2), Rupiah (M3/M4/M5/M7), jumlah invoice (M6), status dormant/reaktivasi + estimasi
value (M8/M9/M10). Memaksa 1 skema kolom untuk semua tidak masuk akal secara tampilan.

## 4. Keputusan Desain

### 4a. Satu halaman Analisis, selector 5 grup metrik (bukan 10 halaman terpisah)

Sesuai konvensi proyek (pusatkan UI, jangan duplikasi komponen serupa) — tambah dropdown
**"Metrik"** di halaman Analisis yang sudah ada, menukar SET KOLOM tabel sesuai grup yang
dipilih, tapi tetap 1 shell/filter/paginasi/search/badge Pareto yang sama:

| Grup (opsi dropdown) | KPI tercakup | Kolom nilai (Periode Lampau vs Periode Ini vs Perubahan) |
|---|---|---|
| Revenue & GP *(default, sudah ada)* | M3, M4, M7 (status up/down jadi kolom tambahan turunan dari perubahan revenue) | Rupiah × 2 (revenue, GP) |
| Kategori / Cross-Selling | M1, M2 | Jumlah kategori dibeli |
| High Margin Penetration | M5 | Rupiah (revenue produk HM) + rasio thd total revenue |
| Frekuensi Transaksi | M6 | Jumlah invoice (repeat order) |
| Status Dormant & Reaktivasi | M8, M9, M10 | Status (Aktif/Dormant/Reaktivasi) + estimasi value hilang |

M7 SENGAJA tidak jadi grup sendiri — datanya 100% turunan dari revenue yang sudah dihitung
di grup Revenue (`status: up/flat_down` = `revenue_change_value > 0`), cukup kolom tambahan
di grup itu, bukan grup terpisah.

### 4b. Backend — endpoint generik atau per-grup?

Endpoint TERPISAH per grup (bukan 1 endpoint generik dengan enum metric yang bikin service
layer jadi if-else raksasa), mengikuti pola existing (tiap KPI sudah punya repository file
sendiri):

```
GET /api/v1/analisis                    (sudah ada — Revenue & GP, tambah kolom status M7)
GET /api/v1/analisis/categories          (baru — M1/M2)
GET /api/v1/analisis/high-margin         (baru — M5)
GET /api/v1/analisis/repeat-order        (baru — M6)
GET /api/v1/analisis/dormant             (baru — M8/M9/M10)
```

Tiap endpoint baru REUSE query per-customer yang sudah ada di repository M1/M5/M6/M8m10
(bukan tulis ulang dari nol), TAMBAH:
1. Agregasi yang sama dijalankan lagi untuk **comparisonRange** (YoY, mirror
   `aggregateInvoicesByCustomer` di `analisis.repository.ts`).
2. Threshold alert per grup (baca dari `business_configs`/Settings Threshold yang relevan
   — repeat_order_target_pct utk M6, dormant_rate_alert_pct utk M8, dst — BUKAN reuse
   literal `revenue_drop_pct`/`margin_drop_pct` yang cuma relevan utk Revenue/GP).
3. Filter/scope/Pareto/pagination — REUSE helper yang sama (`findAnalisisCustomers` pattern,
   `buildDivisionCondition`, dll dari `utils/scope.ts`), bukan reimplementasi.

### 4c. Frontend — 1 halaman, kolom dinamis per grup

`pages/Analisis/index.tsx` tambah dropdown "Metrik" (mirror pola dropdown "Periode" yang
sudah ada). Definisi kolom (`GridColDef[]`) dipecah jadi 5 fungsi/konstanta terpisah
(`revenueGpColumns`, `categoriesColumns`, `highMarginColumns`, `repeatOrderColumns`,
`dormantColumns`), dipilih sesuai state `metricGroup`. Hook data (`useAnalisis`) jadi 5 hook
kecil (atau 1 hook dengan endpoint dinamis) — pilih sesuai konvensi hooks existing di
`hooks/useMetrics.ts`.

### 4d. M2 dan M8 — bagaimana ditampilkan per-customer

- **M2 (avg kategori)**: kolom "Jumlah Kategori" di grup Kategori/Cross-Selling SEKALIGUS
  jadi basis M1 (customer dengan ≥2 kategori = cross-sell) DAN M2 (rata-rata across semua
  baris = ringkasan di atas tabel, bukan kolom per-baris terpisah).
- **M8 (dormant rate)**: kolom per-customer di grup Dormant adalah **status** (Aktif/
  Dormant), bukan angka rate — rate M8 cukup ditampilkan sebagai ringkasan agregat di atas
  tabel (persis seperti KpiCard yang sudah ada di `/dormant-customer`), dihitung dari COUNT
  baris berstatus Dormant / total baris yang tampil.

## 5. Yang SENGAJA di luar scope

- Tidak mengubah/menghapus modal drill-down yang sudah ada di CrossSelling/CustomerMetrics/
  DormantCustomer — itu tetap ada (snapshot cepat tanpa YoY), Analisis jadi tambahan
  view yang lebih dalam (YoY + alert), bukan pengganti.
- Tidak membangun notifikasi/digest email untuk 4 grup baru (Revenue/GP sudah punya lewat
  task016) — kalau dibutuhkan, task terpisah.
- Threshold alert per grup baru (target repeat order, dormant rate alert) REUSE config yang
  sudah ada di Settings → Threshold — tidak menambah UI setting baru.

## 6. Urutan Eksekusi

- [ ] 1. Backend: `analisis/categories.repository.ts` — reuse query M1 (`category_count`
      per customer) + hitung comparisonRange (YoY), endpoint `GET /analisis/categories`.
- [ ] 2. Backend: `analisis/high-margin.repository.ts` — reuse query M5 (`hm_revenue` per
      customer) + YoY, endpoint `GET /analisis/high-margin`.
- [ ] 3. Backend: `analisis/repeat-order.repository.ts` — reuse query M6 (`invoice_count`
      per customer) + YoY, endpoint `GET /analisis/repeat-order`.
- [ ] 4. Backend: `analisis/dormant.repository.ts` — reuse query M8–M10 (status dormant +
      `estimated_lost_value`) + status periode pembanding, endpoint `GET /analisis/dormant`.
- [ ] 5. Backend: `analisis.repository.ts` (Revenue & GP existing) — tambah kolom status
      M7 (`up`/`flat_down`) turunan dari `revenue_change_value`.
- [ ] 6. Frontend: dropdown "Metrik" di `pages/Analisis/index.tsx`, pecah definisi kolom
      per grup, hook data per grup.
- [ ] 7. Permission: cek apakah 4 endpoint baru butuh permission key baru atau reuse
      `analisis:view` yang sudah ada (kemungkinan reuse, karena tetap 1 halaman/menu).
- [ ] 8. Test end-to-end tiap grup di **dev**, verifikasi angka cocok dengan drill-down modal
      existing (M1/M5/M6/M9) untuk periode yang sama sebagai sanity check.
