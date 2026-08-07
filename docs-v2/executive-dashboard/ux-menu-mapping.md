# executive-dashboard/ux-menu-mapping.md — Struktur Menu & Desain UX Halaman

> Dokumen desain (non-teknis). Pelengkap [[metrics.md]] (sumber kebenaran bisnis); dirujuk [[task025]].
> Last updated: 2026-08-07 (v9). Riwayat: v1–v6 (mapping, total 3-card, template tabel,
> pemisahan M3, Afiliasi, drilldown pensiun) → v7 (dormant 3 halaman) → v8 (filter target
> lengkap; backend hilang = scope rework) → **v9** (threshold dormant mengikuti database;
> metrics tidak diubah; hanya filter tarik data tabel yang menyesuaikan).

---

## 0. Ringkasan Keputusan

| Keputusan | Isi |
|---|---|
| Pengelompokan menu | Per domain bisnis (4 kategori + 1 afiliasi), BUKAN per jenis konten |
| Pola halaman KPI | 1 KPI = 1 tampilan = 1 route = 1 chart: Filter → Total 3-card → Chart → Toolbar+Tabel |
| Pemisahan M3 | Garis "Kontribusi High Margin (%)" pindah ke halaman 5; halaman 3 murni revenue |
| Drilldown breakdown | Dialog dipensiunkan; breakdown tunggal = tabel; klik chart → filter tabel |
| Navigasi | Kategori = grup menu; KPI = submenu (deep-link) |
| Slug route | Tidak berubah; `/analisis/revenue` & `/analisis/retention` = redirect permanen |
| Total terfilter | Grid 3 card [pembanding][periode ini][pertumbuhan]; extend `PeriodTotalBox`/`ComparisonMetrics` |
| Filter bar | 2 baris tanpa caption; lebar tetap; Pareto di toolbar tabel; LENGKAP & seragam semua halaman |
| Rework backend | Route/function yang belum ada = scope yang harus dibuat, bukan alasan mengurangi UI |
| Tabel | SATU template untuk semua menu/halaman (§7) |
| Perbandingan periode | Label literal via `formatPeriodLabel()`+`getYoyPeriodKey()`; SELALU YoY (dieksekusi) |
| Threshold dormant | **Mengikuti database** (`business_configs` per-unit); aturan di metrics TIDAK diubah; yang menyesuaikan hanya filter tarik data di list tabel |
| Timestamp | "Data terakhir masuk" dari `MAX(created_at)`; backend wajib expose |
| Intercompany | Track terpisah; endpoint baru wajib dibuat |
| Bahasa label | Indonesia awam, tanpa jargon |

---

## 1. Prinsip UX Halaman (global)

**Filter bar** — 2 baris, TANPA caption, LENGKAP & SERAGAM di semua halaman:

```
baris 1: [Perusahaan ▾] [Cabang ▾] [Divisi ▾]  ☐ Kecualikan transaksi antarperusahaan  [Reset]
baris 2: [Kuartalan ▾] [Per Tanggal: 📅]   1 Jul – 7 Agu 2026 vs periode sama 2025  (muted)
```

- Lebar tetap: Perusahaan 240 · Cabang 160 · Divisi 200 · Periode 180 · Per Tanggal 170.
- Cabang selalu dirender; disabled + hint "pilih perusahaan dulu" saat Perusahaan = Semua.
- Reset kanan baris 1; terpusat di `useScopedCompanyFilter.reset()`.
- Backend belum mendukung suatu kontrol (mis. periodType dormant) = task backend yang harus dibuat (§9); ketiadaan sementara = gap terlacak, bukan desain.

**Urutan vertikal**: Filter → Total 3-card → Chart → Toolbar+Tabel → paginasi bawah.

**1 route = 1 KPI** — bundel lama (CustomerMetrics M3–M7, DormantCustomer M8–M10) = transisi, dibelah/dibubarkan; TIDAK ADA route multi-section maupun sub-nav lompat. Multi-KPI hanya di Ringkasan.

**Aturan chart & tabel:**
- Klik elemen chart → filter tabel di bawah; bukan dialog drilldown. Dialog lama = transisi s.d. tabel live, lalu dihapus.
- Affordance: pointer + tooltip "Klik untuk mem-filter tabel"; chip "Filter bulan: 2026-03 ✕" (✕ / klik ulang = bersihkan).
- Missing data = putus di data terakhir, BUKAN nol.
- Judul awam; penjelasan simbol → tooltip ⓘ; **tooltip menampilkan threshold efektif dari database (per-unit), bukan hardcode**; polaritas via `metricPolarity.ts`; tick bulat.
- List tabel menarik data memakai threshold dari database (per-unit) — tidak ada logika threshold baru di frontend.
- Empty state: `—` + "belum ada data" + CTA. Timestamp tampil bila field tersedia.

---

## 2. Struktur Menu Final

```
RINGKASAN (Dasbor — Seluruh KPI Sekilas)
│
├─ RAGAM PEMBELIAN
│   1. Pembelian lebih dari satu produk
│   2. Rata-rata jumlah produk yang dibeli
│
├─ NILAI PELANGGAN LOYAL
│   3. Jumlah pelanggan loyal
│   4. Keuntungan dari pelanggan loyal
│
├─ PERTUMBUHAN PEMBELIAN
│   5. Pembelian produk fokus
│   6. Pembelian berulang
│   7. Pelanggan dengan peningkatan nilai belanja
│
├─ PELANGGAN TIDAK AKTIF
│   8. Jumlah pelanggan tidak aktif
│   9. Nilai pendapatan yang hilang
│   10. Aktivasi kembali pelanggan tidak aktif
│
└─ AFILIASI ANTARPERUSAHAAN (menu tambahan — track terpisah)
    • Jumlah transaksi antarperusahaan afiliasi
    • Nilai transaksi antarperusahaan afiliasi
    • Pelanggan yang bertransaksi lintas perusahaan afiliasi
    • Kontribusi transaksi afiliasi terhadap total pendapatan
```

---

## 3. Mapping Menu → Route (terverifikasi kode)

| # | Label menu | Route chart saat ini | Tabel detail saat ini | Status tabel |
|---|---|---|---|---|
| 1 | Pembelian lebih dari satu produk | `/cross-selling` | Heatmap Customer×Kategori | ✅ ada |
| 2 | Rata-rata jumlah produk yang dibeli | `/avg-category-per-customer` *(dibelah dari `/cross-selling`, [[task025]] §14)* | tabel persisten (`data.detail`) | ✅ ada |
| 3 | Jumlah pelanggan loyal | `/customer-metrics` | `/analisis/revenue` | ✅ ada (route terpisah) |
| 4 | Keuntungan dari pelanggan loyal | `/customer-metrics` | dialog kecil | ❌ bangun (transisi) |
| 5 | Pembelian produk fokus | `/customer-metrics` | dialog kecil | ❌ bangun (transisi) |
| 6 | Pembelian berulang | `/customer-metrics` | `/analisis/retention` | ✅ ada (route terpisah) |
| 7 | Pelanggan dgn peningkatan nilai belanja | `/customer-metrics` | dialog kecil | ❌ bangun (transisi) |
| 8 | Jumlah pelanggan tidak aktif | `/dormant-customer` *(transisi, 3 section)* | — | ❌ bangun |
| 9 | Nilai pendapatan yang hilang | `/dormant-customer` *(transisi, 3 section)* | ranking top-20 | ✅ ada (snapshot) |
| 10 | Aktivasi kembali pelanggan tidak aktif | `/dormant-customer` *(transisi, 3 section)* | — | ❌ bangun |
| • | Afiliasi Antarperusahaan | `/intercompany` *(baru)* | — | ❌ bangun (track terpisah) |

- **Keputusan A:** tabel KPI3 & KPI6 diboyong ke halaman KPI; route lama = redirect permanen (deep-link notifikasi tidak putus); follow-up: alihkan target deep-link ke route baru.
- **Pembelahan bundel:** CustomerMetrics → 5 halaman; DormantCustomer → 3 halaman (8/9/10); bertahap ([[task025]]).
- **Fakta:** 6/10 tabel belum ada → "bangun fitur baru".

---

## 4. Desain UX per Halaman

Pola: **Filter → Total 3-card → Chart → Toolbar+Tabel** (§7). 1 chart, 1 route per KPI.

### Ringkasan (Dasbor)
- Insight banner 2–3 sinyal; 10 kartu urut risiko; badge sadar polaritas; klik kartu → deep-link.
- Satu-satunya tampilan multi-KPI.

### Ragam Pembelian
- **1** (`/cross-selling`): BarChart 12 bln + Heatmap Customer×Kategori; klik bar → heatmap ter-filter.
- **2** (`/avg-category-per-customer`, halaman terpisah — [[task025]] §14): AreaChart tren + tabel jumlah kategori per customer.

### Nilai Pelanggan Loyal
- **3**: M3 murni revenue (batang total + garis avg & median; garis high-margin dikeluarkan ke halaman 5). Judul awam *"Total pendapatan pelanggan loyal, rata-rata & median per pelanggan"*; simbol → ⓘ; garis putus di data terakhir. Tabel: revenue & laba per customer (old vs new), reuse `/analisis/revenue`; klik bar → filter.
- **4**: BarChart stacked 3 tier + tabel tier & gross profit.

### Pertumbuhan Pembelian
- **5**: Kartu donut snapshot (bukan chart halaman) + chart = tren high margin 12 bln. Bila kontribusi & penetrasi dua metrik → dua seri dalam satu chart. Tabel: beli/tidak produk fokus (+nilai); klik titik → filter.
- **6**: RadialBar ring target (hijau ≥ target, kuning ≥ 75%, merah < 75%; default 80%) + tabel frekuensi.
- **7**: BarChart 100% stacked horizontal + tabel belanja ini vs sebelumnya.

### Pelanggan Tidak Aktif — 3 HALAMAN TERPISAH (tanpa tumpukan/sub-nav)
- **8**: LineAlert ambang 10% + tabel pelanggan tidak aktif (ditarik pakai threshold database per-unit).
- **9**: BarChart ranking horizontal + tabel ranking top-20 by estimasi nilai hilang (sudah dibangun; snapshot → tanpa Selisih/Status, §7).
- **10**: Bullet band 15–20% + tabel yang kembali aktif.
- `/dormant-customer` isi 3 section = transisi; dibelah seperti CustomerMetrics.

### Afiliasi Antarperusahaan (`/intercompany` — track terpisah)
- Filter TANPA toggle intercompany (kontradiktif di sini).
- Total 3-card, tiap card 3 baris: Jml Transaksi · Nilai · Kontribusi %.
- Chart combo 12 bln: batang Nilai + garis Kontribusi %; klik bar → filter tabel.
- Tabel: Customer · Penjual · Pembeli · Jml transaksi · Nilai.
- Polaritas terbalik dipertimbangkan (kontribusi internal naik = buruk).
- Fasing: MVP = 3-card + tabel; chart tren setelah endpoint per-bulan dibuat.

---

## 5. Komponen Total — Grid 3 Card (EXTEND)

```
TOTAL · SELURUH DATA                                             [‹] [›]
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ 1 JAN–7 FEB 2025     │ 1 JAN–7 FEB 2026     │ PERTUMBUHAN          │
│ pembanding           │ [Sedang berjalan]*   │ vs periode sama 2025 │
│ Pendapatan: Rp 1.8M  │ Pendapatan: Rp 3.6M  │ Pendapatan ▲ 96.2%   │
│ Laba: Rp 420.8jt     │ Laba: Rp 747.4jt     │   +Rp 1.8M           │
│                      │                      │ Laba ▲ 77.6% +326.6jt│
└──────────────────────┴──────────────────────┴──────────────────────┘
```

- Caption kiri; ‹ › kanan (tooltip + aria-label lengkap, tidak terpotong viewport).
- `repeat(3,1fr)`, gap 16px; <900px stack 1→2→3.
- Header tanggal = string sama dengan header kolom tabel.
- Card 3 = growth per metrik; slot selalu dirender; state: naik=hijau, turun=merah, datar=abu, kosong="— Belum ada data", old kosong="Baru"(teal); polaritas via `metricPolarity.ts`.
- *Chip "Sedang berjalan" hanya saat periode belum lengkap.

---

## 6. Perbandingan Periode & Growth (FINAL — dieksekusi)

Basis SELALU YoY semua `periodType`; label literal (bukan "Lalu/Ini"):

```
comparisonPeriodLabel = formatPeriodLabel(periodType, getYoyPeriodKey(periodType, periodKey))
currentPeriodLabel    = formatPeriodLabel(periodType, periodKey)
```

| periodType | Kotak kiri | Kotak kanan |
|---|---|---|
| monthly | "Juni 2025" | "Juni 2026" |
| quarter | "Kuartal (2) Tahun 2025" | "Kuartal (2) Tahun 2026" |
| semester | "Semester (1) Tahun 2025" | "Semester (1) Tahun 2026" |
| ytd | "s.d. Juni 2025" | "s.d. Juni 2026" |
| annual | "2025" | "2026" |

| Kondisi old vs new | Tampilkan | Warna* |
|---|---|---|
| new > old | Naik X% | hijau |
| new < old | Turun X% | merah |
| new = old | Tidak berubah | abu |
| old kosong/0 | Baru | teal |
| new = 0 | Berhenti | merah |

\* polaritas via `metricPolarity.ts`. Hapus "+" ganda ("Naik +Rp" → "Naik Rp").

---

## 7. Template Tabel — WAJIB semua menu & halaman

```
┌─ TOOLBAR ────────────────────────────────────────────────────────────────┐
│ [🔍 Cari …]  [☐ Utamakan pelanggan besar]  [Export]         952 pelanggan │
├──────────────────────────────────────────────────────────────────────────┤
│ PERUSAHAAN │ CUSTOMER │ 1 JAN–7 FEB 25 │ 1 JAN–7 FEB 26 │ SELISIH │ % │ STATUS │
│ …                                                                        │
│                                        ‹ 1–25 of 952 ›   [25 ▾] /hal     │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Toolbar:** cari + Pareto (bila relevan) + Export + total terfilter (INFORMASI, bukan paginasi) + chip filter bulan aktif (✕).
- **Kolom:** header periode = rentang aktual (sama dgn card total); sel periode konsisten; chip "▲ 64.3%" per baris (atas=Pendapatan, bawah=Laba) tanpa prefix panjang; old=0 → chip "Baru" + status "Baru".
- **Status:** Aman(hijau) · Perhatian(merah) · Baru(teal) · Berhenti(merah) · Datar(abu) · Belum ada data(abu).
- **Paginasi:** kontrol di BAWAH; tabel tinggi tetap + scroll internal; di atas hanya total.
- **Adaptasi snapshot (5,6,9):** kolom nilai+target pengganti pembanding. **KPI1:** heatmap = tabel.
- **Anti-truncation:** tiada chip/label/header terpotong di 1440px & 375px.

---

## 8. Timestamp "Data terakhir masuk"

- Sumber tunggal `MAX(created_at)`/`MAX(invoice_date)`; label jujur; dipakai Dashboard + semua KPI.
- Belum ada di endpoint → backend wajib expose (rework, §9); jangan tampilkan timestamp palsu.

---

## 9. Status, Asumsi & Track

1. Route terverifikasi: `/cross-selling`, `/avg-category-per-customer` (dibelah dari `/cross-selling`, §14), `/customer-metrics`, `/dormant-customer`, `/analisis/revenue`, `/analisis/retention` (route lama = redirect permanen ke halaman pengganti masing-masing).
2. `/intercompany` track terpisah; MVP = 3-card + tabel.
3. "❌ bangun" = scope bertahap ([[task025]]).
4. Label perbandingan: SELESAI (literal, YoY, dieksekusi).
5. Pemisahan M3: §4 (hal.3 revenue; tren high-margin hal.5).
6. Drilldown dialog: transisi; hapus saat tabel live.
7. Dormant: 3 halaman terpisah; eksepsi section/sub-nav DITARIK.
8. **Threshold dormant: mengikuti database (per-unit); aturan metrics TIDAK diubah; hanya filter tarik data list tabel yang memakai threshold database; tooltip ⓘ menampilkan nilai efektif per-unit.**
9. Scope rework backend (harus dibuat): (a) periodType endpoint M8–M10; (b) field timestamp; (c) `has_data`/null-vs-zero ([[task024]]); (d) endpoint `/intercompany`; (e) endpoint per-bulan tren Afiliasi.
10. Urutan eksekusi: KPI9 (selesai) → Nilai Pelanggan Loyal (Keputusan A + reuse) → sisanya → intercompany.
11. Template §7 dipakai saat tiap halaman dibangun/direvisi; Analisis = referensi.
12. Dokumen tidak mengubah kalkulasi; definisi bisnis merujuk [[metrics.md]].