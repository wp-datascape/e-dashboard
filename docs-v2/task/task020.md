# Task 020 — Parser Import Fleksibel + Rollback per-Import

> Status: 📝 Planning — desain sudah disepakati lewat brainstorm, belum mulai implementasi.
> Dipicu oleh: percobaan import file "Rincian Faktur Penjualan" PT KNT
> (`rincian_faktur_penjualan_ptkodeniagatama_260803114131.xlsx`, 182.436 baris) yang
> ditolak parser karena varian label kolom Accurate yang belum dikenali (lihat §1).

## 1. Latar Belakang

File export Accurate PT KNT pakai label kolom yang beda dari yang dikenal parser saat ini
(`backend/src/utils/parser.ts`):

| Kolom di file KNT | Diharapkan parser sekarang | Status |
|---|---|---|
| `Nomor #` | `Sales Invoice` (wajib, dipakai juga untuk deteksi header row) | Tidak ketemu sama sekali → **seluruh file ditolak** sebelum sempat cek kolom lain |
| `Nama Cabang Faktur Penjualan` | `Nama Cabang` (opsional) | Dianggap kolom asing → ikut menolak seluruh file |
| `Nilai PPN Faktur Penjualan` | *(tidak ada di whitelist)* | Sama — kolom asing, menolak seluruh file |

Saat ini `REQUIRED_EXCEL_HEADERS`/`OPTIONAL_EXCEL_HEADERS` di `parser.ts` hardcode di kode —
setiap ada varian label baru dari Accurate, perlu ubah kode + deploy. Dan kolom yang tidak
dikenali membuat **seluruh file ditolak**, bukan cuma kolom itu yang diabaikan.

## 2. Keputusan Desain (hasil brainstorm 2026-08-04)

### 2a. Alias kolom — dinamis, global (bukan per-company)

Alias kolom itu properti *format export Accurate*, bukan properti company — kalau di-gate ke
KNT saja, company lain yang kebetulan pakai varian sama akan tetap gagal. Solusi: tabel baru
`import_column_aliases` (`canonical_field`, `label`), diseed dari konstanta
`REQUIRED_EXCEL_HEADERS`/`OPTIONAL_EXCEL_HEADERS` yang sudah ada — field mana yang **wajib
vs opsional** tetap aturan tetap di kode, tapi **daftar label yang diterima per field** jadi
data di DB, bisa ditambah lewat halaman Settings tanpa deploy kode baru.

`parser.ts` (`detectExcelHeaders`, `validateExcelHeaders`) diubah menerima alias map dari luar
(bukan baca constant sendiri) — service layer query DB dulu, parser tetap pure utility tanpa
akses DB langsung (konsisten arsitektur existing).

### 2b. Kolom tidak dikenali — diabaikan + dicatat, bukan menolak seluruh file

`validateExcelHeaders` diubah: kumpulkan kolom asing jadi list (`unknown_columns`), bukan
`throw`. Disimpan di `import_logs` (kolom baru) dan ditampilkan di halaman Import (badge/info
di baris log yang terpengaruh) — supaya "DB jadi kotor karena kolom diabaikan" itu minimal
**diketahui**, bukan senyap total.

Kolom **wajib** (Tanggal, Pelanggan, Nama Barang, dst) TETAP wajib — hilang salah satu tetap
menolak seluruh file (beda kategori masalah dari kolom asing/opsional).

### 2c. Rollback per-import — tabel `import_log_changes`

**Masalah yang harus diantisipasi**: `customers`/`product_categories`/`products` di-upsert
(dipakai bersama lintas import) — invoice tertentu bahkan bisa di-*update* (bukan cuma
dibuat) oleh import yang beda dari yang membuatnya pertama kali (reimport nomor faktur
sama). Rollback naif ("hapus semua yang `import_id`-nya cocok") berisiko:
- Menghapus customer/produk yang masih dipakai invoice dari import LAIN yang tidak sedang
  di-rollback (korupsi data tidak sengaja).
- Kalau cuma hapus baris yang di-*update* import ini (bukan direstore), data ORIGINAL dari
  import sebelumnya ikut hilang, bukan "dikembalikan".

**Solusi**: tabel baru khusus (BUKAN reuse `audit_logs` yang dipakai fitur audit trail
user-facing lain — supaya tidak numpuk sampai jutaan baris di situ dan bikin lambat):

```sql
CREATE TABLE import_log_changes (
  id SERIAL PRIMARY KEY,
  import_log_id INTEGER NOT NULL REFERENCES import_logs(id) ON DELETE CASCADE,
  entity VARCHAR(50) NOT NULL,      -- 'invoices' | 'customers' | 'product_categories' | 'products'
  entity_id INTEGER NOT NULL,
  old_value JSONB,                  -- NULL kalau baris baru dibuat (create)
  new_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Index: `(import_log_id)`, `(entity, entity_id)`.

**Selama proses import**: tiap create/update invoice/customer/product_category/product,
tulis 1 baris ke tabel ini. **Wajib di-batch** (bukan 1 `INSERT` per baris via helper yang
ada) — file KNT 182.436 baris bisa menghasilkan ratusan ribu baris `import_log_changes`
kalau naif, harus insert per-chunk (sama pola dengan `createImportErrors` yang sudah
bulk-insert).

**Endpoint rollback** (`POST /import/logs/:id/rollback`), dalam 1 transaksi:
1. Ambil semua `import_log_changes` untuk `import_log_id = X`.
2. `old_value IS NULL` (baris baru dibuat oleh X) → cek tidak ada `import_log_changes` lain
   (import BEDA) yang menyentuh `entity`+`entity_id` yang sama setelahnya, DAN (khusus
   customer/category/product) cek tidak ada invoice lain yang masih mereferensikannya →
   kalau aman, hapus total. Kalau tidak aman, skip (biarkan, laporkan di ringkasan hasil
   rollback).
3. `old_value` berisi data (baris di-update oleh X, bukan dibuat) → tulis balik `old_value`
   ke tabel aslinya (revert) — TAPI cek dulu tidak ada import LEBIH BARU yang meng-update
   baris itu setelah X (kalau ada, rollback harus dikerjakan urut dari yang terbaru dulu,
   tidak bisa loncat).
4. Update `import_logs.status` jadi `rolled_back`, audit log (tabel `audit_logs`, BUKAN
   `import_log_changes`) mencatat siapa yang melakukan rollback dan kapan.

## 3. Yang SENGAJA di luar scope

- Tidak menyentuh company lain (SKI/MKO) — cuma menambah kemampuan sistem, tidak mengubah
  data yang sudah ada.
- Tidak membangun UI preview "apa saja yang akan berubah" sebelum rollback dieksekusi —
  kandidat perbaikan lanjutan kalau dibutuhkan, MVP dulu cukup rollback langsung + ringkasan
  hasil di response.
- Tidak menangani kasus "reimport nomor faktur sama tapi field berbeda dari file KNT yang
  SAMA" secara khusus — mengikuti alur dedup yang sudah ada (`findInvoiceByNumber` →
  update kalau ada).

## 4. Urutan Eksekusi

- [ ] 1. Migration: tabel `import_column_aliases` (+ seed dari constant existing),
      `import_log_changes`, kolom `unknown_columns` di `import_logs`.
- [ ] 2. Backend: `parser.ts` terima alias map dari luar (bukan hardcode), tidak lagi
      `throw` untuk kolom asing (kumpulkan jadi list).
- [ ] 3. Backend: `import.service.ts` — fetch alias map dari DB sebelum parse, tulis
      `import_log_changes` per baris (batched) saat create/update entity.
- [ ] 4. Backend: endpoint rollback + service logic (cek keamanan hapus/restore).
- [ ] 5. Frontend: halaman Settings CRUD `import_column_aliases` (pola sama seperti Item
      Types/Channel Divisions).
- [ ] 6. Frontend: badge/info kolom diabaikan di halaman Import, tombol rollback di baris
      `import_logs` (dengan konfirmasi eksplisit, ini aksi destruktif).
- [ ] 7. Tambah alias `Nomor #`→`invoice_number`, `Nama Cabang Faktur Penjualan`→
      `branch_name` lewat data seed/UI (bukan hardcode) supaya file KNT bisa langsung dites.
- [ ] 8. Test end-to-end: import file KNT asli (182.436 baris) di **dev** dulu, verifikasi
      hasil + waktu proses (file besar, cek tidak timeout/terlalu lambat karena
      `import_log_changes` batch insert tambahan).
