# Task 035 — Laporan Afiliasi (Intercompany Transaction Report)

> **STATUS: PENDING — belum dieksekusi.** Dokumen ini hasil diskusi scoping
> (2026-08-29), murni desain, belum ada kode yang ditulis. Nunggu instruksi
> eksplisit "mulai kerjakan" sebelum implementasi dimulai.

## Context

User minta halaman laporan baru: "Laporan Afiliasi" — isinya detail
transaksi intercompany (transaksi antar-company dalam holding, dari
sisi salah satu company yang "menjual" ke sister company-nya, yang
customer-nya terdaftar di Settings → Intercompany Names).

## Temuan riset (diverifikasi via kode, bukan tebakan)

**Data model** — `intercompany_customer_names` (backend/src/db/schema/
schema-transaction.ts) menyimpan pasangan `(company_id, customer_name)`
yang didaftarkan admin lewat halaman Settings → Intercompany
(`frontend/src/pages/Settings/CustomerIntercompany/`). Begitu
didaftarkan, SEMUA row `customers` company itu yang namanya cocok
(UPPER-normalized) otomatis di-set `division_override_id` ke division
khusus **"Intercompany"** (`key='intercompany'`, division_repository.ts,
sejajar division lain seperti Distribution/Project — bukan konsep
terpisah, murni division biasa dgn semantik khusus).

Konsekuensinya: "transaksi intercompany" = baris `invoices` biasa, yang
`customer_id`-nya nunjuk ke customer dgn `division_override_id` =
Intercompany division perusahaan itu. Filter "Kecualikan Intercompany"
yang sudah ada di mana-mana (`ExcludeIntercompanyToggle`,
`buildExcludeIntercompanyCondition` di `utils/scope.ts`) justru
MENGECUALIKAN transaksi ini dari laporan KPI biasa — laporan baru ini
kebalikannya, KHUSUS menampilkan yang dikecualikan itu.

**Halaman existing yang overlap** — Order Ledger (`/transactions`,
`frontend/src/pages/Transactions/index.tsx`) SUDAH bisa filter Division
= Intercompany (lewat `ScopeFilterFields` division dropdown, division
"Intercompany" muncul sbg opsi biasa) dan menampilkan invoice-nya —
dikonfirmasi ke user, TAPI user tetap mau halaman terpisah dgn gaya
laporan (kartu ringkasan + tabel), bukan cuma "filter Order Ledger yang
sudah ada".

## Keputusan scope (dikonfirmasi user via AskUserQuestion, 2026-08-29)

1. **Tampilan**: laporan tersendiri (kartu ringkasan + tabel detail),
   BUKAN sekadar shortcut ke Order Ledger dgn filter siap pakai.
2. **Arah transaksi**: SATU ARAH saja (list transaksi apa adanya dari
   sisi company yang menerbitkan invoice) — TIDAK perlu pasangkan 2 sisi
   (mis. invoice Company A ke "PT B" dicocokkan dgn invoice balik
   Company B ke "PT A" utk rekonsiliasi saldo). Rekonsiliasi 2 sisi
   sengaja DIHINDARI, lebih kompleks & tidak diminta.
3. **Lokasi menu**: grup **Report** (`nav.groups` yang sama dgn
   Report/Growth, Report/Retention, Report/Revenue), gaya laporan
   ringkas, BUKAN gaya tabel data mentah Order Ledger/Data workbench.

## Desain (draft, BELUM final — direview lagi sebelum eksekusi)

**Menu**: Report → Afiliasi (path kemungkinan `/report/affiliate`, cek
konvensi path Report/* lain sebelum eksekusi).

**Filter**: reuse `useAdvancedFilterBar`/`AdvancedFilterBar` (Entitas,
Branch, Periode + granularitas — pola SAMA PERSIS Report/Growth dkk,
task029.md §41-lanjutan). Division TIDAK jadi filter user-facing —
halaman ini implisit SELALU division=Intercompany, tidak perlu dipilih
manual.

**Isi halaman**:
1. Kartu ringkasan (`ReportSummaryCards`, komponen yang SUDAH ada &
   dipakai semua Report/* lain, task029.md §36.18/36.19 — "layout
   standar untuk menu laporan"): Total Revenue Afiliasi, Total GP
   Afiliasi, Jumlah Transaksi, Jumlah Sister Company Aktif periode ini.
2. Tabel detail transaksi — reuse `ResponsiveListView` (pola sama
   `Transactions/index.tsx`): tanggal, no. invoice, Company (penerbit),
   Nama Sister Company (dari `customer_name` terdaftar), Revenue, GP,
   kategori produk.
3. Klik baris → `InvoiceDetailDialog` yang SUDAH ada
   (`Transactions/components/InvoiceDetailDialog.tsx`), reuse langsung.

**Backend** — endpoint baru (nama+shape persis belum diputuskan, opsi:
`GET /reports/affiliate` ATAU reuse `useInvoices`/`/transactions`
endpoint yang sudah ada dgn tambahan param filter division=Intercompany
implisit dari sisi backend, cek mana yang lebih murah sebelum eksekusi).
Perlu: query invoice yang customer-nya `division_override_id` =
Intercompany division company itu, agregat utk kartu ringkasan + list
utk tabel, JOIN `intercompany_customer_names` kalau perlu label/validasi
tambahan.

**RBAC**: sama seperti halaman lain — company-scope existing
(`resolveCompanyScope`/`buildDivisionCondition` di `utils/scope.ts`),
user cuma lihat invoice yang DITERBITKAN company yang jadi haknya
(customer-nya sister company lain tetap kelihatan sbg baris, itu memang
tujuannya).

## Belum diputuskan (utk sesi eksekusi nanti)

- Nama endpoint/route pasti + apakah reuse endpoint Transactions yang
  sudah ada (tambah query param) atau bikin endpoint baru murni.
- Path frontend pasti (`/report/affiliate` atau nama lain) — cek
  konvensi `App.tsx`/router + `menu.tsx` dulu.
- Kolom pasti tabel detail (draft di atas, mungkin perlu disesuaikan pas
  lihat data asli).
- i18n keys (namespace baru atau extend `reportGrowth.json`-style yang
  sudah ada).
- Apakah butuh export (PDF/Excel) — belum ditanya eksplisit, Report/*
  lain SAAT INI tidak ada export PDF (dicek, tidak ada `jsPDF`/
  `html2canvas` di folder Report/), jadi default TIDAK ada dulu kecuali
  diminta.
