# Task 023 — Audit UX Menyeluruh: Tier Ringkasan/Detail, Konsistensi Bahasa, Lebar Kolom & Date Picker

> Status: 🟡 Planning — dipicu keluhan langsung user ("susunan nya membuat
> muak", "aplikasi ini benar benar buruk dan membuat muak soal UI/UX-nya"),
> sesi 2026-08-07. Lanjutan dari audit sidebar pagi ini ([[task021]] §0b) yang
> ternyata belum menyelesaikan keresahan utamanya. 3 sub-task independen,
> bisa dikerjakan/di-PR terpisah.

## 1. Latar Belakang

Audit kode (bukan tebakan) menemukan 3 masalah UX yang berdiri sendiri-sendiri:

1. Sidebar mencampur menu "ringkasan/tren" (grafik) dan "detail per-customer"
   (tabel) secara flat, tanpa penanda apa pun — user harus klik dulu baru tahu
   dia akan dapat grafik atau tabel.
2. File terjemahan `id/*.json` (harusnya semua Bahasa Indonesia) masih
   menyisakan string Inggris mentah bercampur dengan yang sudah rapi
   diterjemahkan — tidak konsisten.
3. Banyak kolom `MUI DataGrid` pakai `width` piksel tetap yang lebarnya
   ditentukan seolah teks Inggris pendek, padahal isinya label Indonesia yang
   sering lebih panjang → header/isi sel kepotong. Date picker native
   (`<input type="date">`) menambah masalah karena lebar render-nya beda-beda
   antar browser/OS locale, dipasangkan dengan `minWidth` yang pas-pasan.

## 2. Scope

Task ini **cuma frontend** (markup, i18n content, styling) — tidak ada
perubahan skema DB atau kontrak API. 3 sub-task, dikerjakan berurutan tapi
independen (boleh berhenti di salah satu tanpa mem-blok yang lain):

- §3 — Penanda visual tier Ringkasan vs Detail (Customer Workbench dulu,
  scope penuh)
- §4 — Audit & benerin konsistensi bahasa `id/*.json`
- §5 — Fix lebar kolom tabel (`GridColDef`) + date picker

## 3. Penanda Tier "Ringkasan/Tren" vs "Detail per Customer"

### 3a. Keputusan desain

**Tidak** bikin grup collapsible baru (itu akan membalik keputusan
`task021.md §0b` yang eksplisit melarang grup "Analisis" terpisah lagi).
Sebagai gantinya: caption kecil non-divider di antara item dalam grup yang
sudah ada — visualnya seperti label section tapi TANPA `Divider` di atasnya
dan font lebih kecil/tidak seberat label grup utama (`nav.groups.*`), supaya
kebaca sebagai "sub-penanda dalam grup", bukan "grup baru".

**Klasifikasi konten** (diverifikasi baca kode tiap halaman, bukan ditebak
dari nama menu):

| Halaman | Isi | Tier |
|---|---|---|
| Customer | `ResponsiveListView` (roster) | Entry point — tetap di posisi pertama, tidak dikasih tag tier apa pun |
| Expansion | M3-M7 semua `ComboChartWidget` | Ringkasan/Tren |
| Churn Risk (Dormant) | M8 line chart, M9 bar chart, M10 bullet chart | Ringkasan/Tren |
| Analisis Revenue | `ResponsiveListView` | Detail per Customer |
| Analisis Retention | `ResponsiveListView` | Detail per Customer |
| Cross Selling | Chart (Combo+Area) **dan** 2 `ResponsiveListView` di 1 halaman | Hybrid — sengaja TIDAK ditag tier apa pun, tetap di posisi terakhir apa adanya (memaksakan ke salah satu tier malah menyesatkan) |

### 3b. Perubahan konkret

- **`frontend/src/config/menu.tsx`** — tambah field opsional `tierLabelKey?: string`
  di interface `NavItem`, dipasang di item PERTAMA sebuah tier (bukan di
  semua item). Reorder isi Customer Workbench dari urutan sekarang
  (`customer, expansion, analisis-revenue, analisis-retention, churn-risk,
  cross-selling`) jadi:
  ```
  customer                              (entry point, no tag)
  expansion                             (tierLabelKey: nav.tiers.overview)
  churn-risk
  analisis-revenue                      (tierLabelKey: nav.tiers.detail)
  analisis-retention
  cross-selling                         (no tag, tetap paling akhir)
  ```
- **`frontend/src/components/ui/Sidebar/Sidebar.tsx`** — render `tierLabelKey`
  mirip `groupLabelKey` (`Typography variant="caption"`) tapi TANPA `Divider`
  di atasnya dan collapse behavior yang sama (`Collapse in={!collapsed}`,
  supaya hilang smooth saat sidebar di-collapse, konsisten dengan pola
  `groupLabelKey` yang sudah ada).
- **`frontend/src/i18n/locales/{id,en}/nav.json`** — tambah key baru
  `tiers.overview` ("Ringkasan & Tren" / "Overview & Trends") dan
  `tiers.detail` ("Detail per Customer" / "Per-Customer Detail").

### 3c. Di luar scope task ini (Fase 2, terpisah)

Product & Portfolio dan Transaction & Revenue **belum** diaudit isi
halamannya untuk klasifikasi tier ini — dari cek cepat, `Products` (ledger)
dan `ProductsHighMargin` sama-sama pakai `ResponsiveListView` (bukan chart
murni), beda pola dari Customer Workbench, jadi tidak bisa main tempel
klasifikasi yang sama tanpa audit terpisah. Jangan reorder grup-grup ini
sampai ada task/audit sendiri.

## 4. Audit & Konsistensi Bahasa (`id/*.json`)

### 4a-0. Sudah diperbaiki: `MonthYearPicker` render nama bulan Inggris walau app Bahasa Indonesia

Dilaporkan user langsung dengan screenshot ("August 202" kepotong) — root cause
ternyata BUKAN cuma soal lebar (§5), tapi juga bahasa: `MonthYearPicker.tsx`
pakai `dayjs` polos tanpa locale, jadi `format="MMMM YYYY"` SELALU render nama
bulan Inggris ("August 2026") walau `i18n.language` sudah `'id'`. Fix: import
`dayjs/locale/id` + `dayjs/locale/en`, `LocalizationProvider` diberi
`adapterLocale={i18n.language}` — ikut bahasa aktif, bukan hardcode.

**Pola kebalikannya juga ditemukan** (belum diperbaiki, di luar scope
perbaikan cepat ini): ~20 titik lain di `pages/**` pakai
`new Date(iso).toLocaleDateString('id-ID', ...)` / `.toLocaleString('id-ID')`
— HARDCODE `'id-ID'`, tidak ikut `i18n.language` sama sekali. Efeknya
kebalikan dari bug MonthYearPicker: kalau user ganti bahasa ke English lewat
Settings, tanggal di ActivityLog/AuditLog/LoginLog/Users/Notifications/dst
tetap format Indonesia. Perlu diaudit sebagai bagian §4 (bukan cuma string
JSON, tapi juga semua pemformatan tanggal/angka locale-dependent) — daftar
filenya: `ActivityLog`, `AuditLog`, `LoginLog`, `Users`, `Notifications`,
`Import/ImportLogsTable`, `NotificationBell`, `NotificationDetailDialog`,
dialog-dialog View*Dialog terkait.

### 4a. Temuan yang sudah terverifikasi (contoh, bukan daftar lengkap)

String Inggris mentah yang ketemu di file `id/`:
`nav.json` → `"crossSellMatrix": "Cross Selling"`, `"abTesting": "AB Testing"`,
`"auditLog": "Audit Log"`, `"log": "Log"`, `"activityLog": "Activity Log"`,
`"loginLog": "Login Log"`, `"crossSelling": "Cross Selling"`,
`"settingsThreshold": "Threshold"`; `crossSelling.json` →
`"pageTitle": "Cross Selling"`; `auditLog.json` → `"title": "Audit Log"`;
`activityLog.json` → `"title": "Activity Log"`; `loginLog.json` →
`"title": "Login Log"`; `rbac.json` → `"actionExport": "Export"`,
`"actionReset": "Reset"`.

### 4b. Keputusan yang perlu diambil SEBELUM eksekusi

Bukan technical call, ini keputusan bahasa/produk — perlu konfirmasi user
sebelum diedit massal:

- Istilah generik UI (Export, Reset, Filter, Login) — **tetap Inggris**
  (lazim dipakai apa adanya di software Indonesia) atau diterjemahkan penuh
  (Ekspor, Atur Ulang, Saring, Masuk)?
- Nama fitur/halaman yang sudah jadi "istilah produk" (Cross Selling, AB
  Testing, Audit Log, Activity Log, Login Log) — dibiarkan Inggris sebagai
  nama fitur (seperti "Dashboard" yang juga tidak diterjemahkan), atau
  diterjemahkan (Log Audit, Log Aktivitas, Log Masuk)?

Begitu keputusannya jelas, tulis sebagai 1 baris aturan di
`frontend/src/i18n/` (README kecil atau komentar di `nav.json`) supaya tidak
terulang tercampur lagi di masa depan, lalu sapu bersih seluruh folder
`id/*.json` (bukan cuma yang sudah ketemu di atas — perlu grep menyeluruh
ulang setelah aturan disepakati).

## 5. Lebar Kolom Tabel & Date Picker

### 5a. Inventori file paling berisiko (0 kolom pakai `flex` — SEMUA kolomnya
lebar tetap, prioritas audit pertama)

```
ActivityLog/index.tsx           width=7  flex=0
AuditLog/index.tsx              width=6  flex=0
LoginLog/index.tsx              width=6  flex=0
Import/components/ImportLogsTable.tsx  width=10 flex=0
```

File lain sudah campur `width` + `flex` (risiko lebih rendah tapi tetap perlu
dicek satu-satu, bukan cuma yang di atas) — daftar lengkap ada di riwayat
investigasi sesi ini, dicek ulang saat implementasi via:
```
grep -rn "GridColDef" frontend/src/pages --include=*.tsx -l | \
  xargs -I{} sh -c 'echo {}; grep -c "width: [0-9]" {}; grep -c "flex:" {}'
```

### 5b. Aturan fix (berlaku ke semua file di atas)

- Kolom teks bebas panjang (nama, deskripsi, label kategori) → `flex` +
  `minWidth`, BUKAN `width` tetap.
- Kolom nilai pendek yang panjangnya predictable (angka, tanggal, status chip,
  kode) → boleh tetap `width` tetap, tapi ukur dari **label Indonesia**
  (bukan asumsi Inggris) + kasih sedikit slack (bukan pas-pasan).
- Untuk kolom yang sudah dikasih `width` tapi headerName-nya Indonesia lebih
  dari ~14 karakter → ganti ke `flex: 1, minWidth: <ukur pas>`.

### 5c. Date picker

`components/ui/DatePicker` pakai `<input type="date">` native — lebar
render bergantung browser/OS locale, di luar kendali CSS penuh. Dua opsi:

1. **Minimal**: naikkan `minWidth` default field date di semua halaman
   pemanggil jadi seragam (sekarang bervariasi 150–220px) ke angka yang aman
   untuk locale id-ID di browser utama (Chrome/Safari/Firefox desktop +
   Chrome/Safari mobile) — perlu dicek manual di beberapa browser, bukan
   ditebak satu angka.
2. **Lebih tuntas**: ganti dari native `<input type="date">` ke komponen date
   picker terkontrol (mis. MUI X Date Pickers) supaya lebar & format bisa
   dikontrol penuh dari kode, bukan bergantung rendering browser. Ini
   perubahan dependency baru — putuskan nanti setelah opsi 1 dicoba dan
   ternyata belum cukup.

Task ini mulai dengan opsi 1 (lebih murah, tidak nambah dependency); opsi 2
jadi task terpisah kalau opsi 1 terbukti tidak cukup.

## 6. Urutan Kerja Disarankan

1. §3 (tier Customer Workbench) — paling kecil scope-nya, langsung terlihat
   efeknya di keluhan awal.
2. §5 (lebar kolom + date picker) — perbaikan mekanis, tidak butuh keputusan
   bahasa dulu.
3. §4 (bahasa) — mulai dengan konfirmasi keputusan aturan Inggris/Indonesia
   ke user dulu, baru sapu bersih.
