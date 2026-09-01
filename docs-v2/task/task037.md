# Task 037 (EDASHBOARD-588) — Review Dialog untuk Import Faktur

> **STATUS: DESAIN — belum mulai coding.** Riset arsitektur sudah selesai,
> 2 keputusan desain utama sudah dikonfirmasi user. Menunggu review desain
> di bawah sebelum implementasi dimulai.

## Context

User minta pola review 2-tahap (preview → tabel per-baris Sukses/Konflik/Error
→ commit) yang sudah dibangun untuk import High Margin Mapping (task036)
diterapkan juga ke import Faktur: "Untuk pop up import produk fokus kemarin /
Buatkan fungsi serupa untuk import faktur bisa?"

## Temuan riset — kenapa TIDAK bisa langsung copy pola task036

Import Faktur (`backend/src/features/import/`) arsitekturnya beda jauh dari
High Margin:

| | High Margin (task036) | Faktur (sekarang) |
|---|---|---|
| Skala baris | Puluhan | **Ribuan** per file, tanpa limit jumlah baris di parser |
| Alur commit | 2 tahap terpisah (`/preview`, `/commit`) | 1 tahap, commit langsung sambil parsing |
| Transport | Request/response biasa | **SSE streaming** (`POST /import/csv/stream`), progress live |
| Transaksi DB | 1 transaksi per baris commit | **TIDAK ADA** `db.transaction()` pembungkus — commit per query |
| "Duplikat" | 2 mapping valid tumpang tindih, user WAJIB pilih | invoice_number sama → **otomatis overwrite**, tanpa konfirmasi |
| Tabel review | 1 `<Card>` per baris, tanpa pagination | perlu pagination (bisa ribuan baris) |

Root cause overwrite otomatis saat ini: `findInvoiceByNumber()` (case-insensitive,
`company_id`+`invoice_number`) di `import.repository.ts` — kalau ketemu, langsung
UPDATE header + DELETE semua `invoice_items` lama + INSERT items baru dari file.
Filosofinya: "ini reimport/revisi file yang sama, data baru selalu benar" — beda
total dari High Margin yang menganggap konflik sebagai pilihan bisnis.

Detail per-baris SAAT INI cuma ada di `ErrorDetailDialog.tsx` (retrospektif,
setelah commit selesai, `GET /import/logs/:id`, HANYA baris error) — bukan
preview sebelum commit.

## Keputusan desain (dikonfirmasi user, 2026-09-01)

1. **Bentuk review: tabel per baris dengan pagination** (bukan cuma ringkasan
   angka) — user pilih ini secara eksplisit, menolak opsi "ringkasan saja".
2. **Duplikat faktur ditampilkan per baris, user pilih resolusi per baris**
   (bukan toggle 1x untuk semua) — alasan eksplisit user: "karena ada
   keputusan bisnis didalamnya yang menjadi landasan fitur ini harus ada".
   Ini MENGUBAH behavior lama (overwrite otomatis) — bukan cuma nambah UI
   review di atas behavior existing yang sudah ada.

## Desain — Backend

### Grouping: per INVOICE, bukan per baris file mentah

`InvoiceRow` hasil parse adalah level **item** (1 invoice bisa punya banyak
baris item dengan `invoice_number` sama). Tabel review harus dikelompokkan
per `invoice_number` (1 baris tabel = 1 invoice, dengan sub-info jumlah item
& total revenue), BUKAN 1 baris tabel = 1 baris file mentah — kalau tidak,
1 invoice dengan 5 item akan muncul sebagai 5 baris "konflik" terpisah yang
membingungkan.

### Endpoint baru: `POST /import/csv/preview`

Reuse parser (`parseCsv`/`parseExcel`) yang sudah ada — TIDAK perlu ubah
parser. Setelah parse:

1. Group `InvoiceRow[]` by `invoice_number` → daftar invoice unik + agregat
   (jumlah item, total revenue, total GP, customer_name, invoice_date).
2. **1 query batch** `SELECT invoice_number, total_revenue, updated_at FROM
   invoices WHERE company_id = ? AND UPPER(invoice_number) IN (...)` — cek
   SEMUA invoice_number sekaligus (bukan query per baris, aman untuk ribuan
   invoice sekali jalan, pola sama seperti `findInvoiceByNumber` tapi
   batched).
3. Klasifikasi per invoice: `new` (belum ada) / `conflict` (invoice_number
   sudah ada — sertakan data invoice lama: revenue lama, tanggal update
   terakhir, untuk ditampilkan berdampingan) / `error` (row-level parse
   error dari `ParseRowError[]` yang sudah ada, dikelompokkan ke invoice
   number yang sama kalau relevan, atau baris tanpa invoice_number valid).
4. Response: `{ invoices: PreviewInvoiceRow[], summary: { new, conflict,
   error }, raw_row_count }` — TIDAK perlu simpan state di server (mirip
   task036, kirim ulang dari frontend saat commit) karena payload masih
   wajar untuk ribuan invoice (jauh lebih sedikit dari jumlah baris item
   mentah).

**Rate limit**: samakan dengan `/import/csv` yang sudah ada (5x/10 menit per
user) — bukan yang lebih longgar seperti High Margin preview (20x/5 menit),
karena payload besar tetap mahal walau tanpa tulis DB (parse file besar +
query batch).

### Endpoint baru: `POST /import/csv/commit`

Terima `{ company_id, period_month, invoices: [{ invoice_number, action:
'create'|'update'|'skip', items: [...] }] }` — baris dengan `action: 'skip'`
dilewati (TIDAK commit), sisanya jalankan proses yang SAMA PERSIS dengan
`importFile()` sekarang (upsert customer/kategori/produk, insert/update
invoice+items) tapi TANPA logic overwrite-otomatis (keputusan overwrite vs
skip sudah final dari pilihan user per baris, bukan default kode).

**Tetap tanpa SSE** untuk commit ini (beda dari `/csv/stream` yang sudah
ada) — butuh dipikirkan progress feedback untuk ribuan invoice: opsi (a)
reuse pola SSE juga untuk endpoint commit baru ini, (b) commit sinkron biasa
dengan spinner (berisiko timeout kalau ribuan invoice), (c) proses commit di
background job + polling status. **BELUM diputuskan — lihat pertanyaan di
bawah.**

## Desain — Frontend

- Reuse `ResponsiveListView` (komponen tabel terpusat, sudah ada pagination
  bawaan) untuk tabel review — BUKAN pola `<Card>` per baris ala
  `HighMarginImportReview.tsx` (itu cuma cocok untuk puluhan baris).
- Kolom: Invoice Number, Tanggal, Customer, Jumlah Item, Total Revenue,
  Status (chip Sukses/Konflik/Error via `StatusChip`), Aksi (untuk baris
  konflik: toggle Timpa/Lewati per baris, mirip `ToggleButtonGroup` di
  `HighMarginImportReview.tsx`).
- Baris konflik: klik untuk expand/dialog kecil menampilkan data lama vs
  baru berdampingan (revenue lama vs baru, tanggal update terakhir) — biar
  user bisa lihat "keputusan bisnis" yang disebutkan sebelum pilih Timpa/
  Lewati.
- **Bulk action** untuk baris konflik (usulan, BELUM dikonfirmasi user):
  tombol "Timpa Semua Konflik" / "Lewati Semua Konflik" di atas tabel,
  selain toggle per baris — supaya tidak harus klik satu-satu kalau
  konfliknya banyak (mis. reimport file yang sama dgn revisi kecil, ratusan
  baris "konflik" tapi user cuma mau timpa semua). Per baris tetap bisa
  override manual sesudahnya.

## Keputusan final (dikonfirmasi user, 2026-09-01)

1. **Progress commit: SSE streaming**, live progress bar — reuse pola
   `useImportFileProgress` yang sudah ada, ganti endpoint & payload
   request-nya (kirim daftar invoice+action per baris, bukan file mentah).
2. **Bulk action disediakan**: tombol "Timpa Semua Konflik" / "Lewati Semua
   Konflik" di atas tabel, per baris tetap bisa di-override manual
   sesudahnya.
3. **Default per baris konflik: Timpa** (samakan perilaku lama/auto-
   overwrite) — user aktif pilih "Lewati" kalau memang mau mengecualikan
   baris tertentu, bukan sebaliknya.
4. **Tidak ada batas atas** jumlah invoice yang ditampilkan di tabel review
   — semua invoice hasil parse ditampilkan (pagination `ResponsiveListView`
   yang menangani tampilannya), selama masih dalam batas ukuran file 50MB
   yang sudah ada.
