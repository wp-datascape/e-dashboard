# MEMORY.md — Project Memory

> Beda dari `CURRENT_STATE.md` (log kronologis per sesi) dan `task/task00X.md` (detail teknis per-task): file ini **kurator, bukan log** — cuma berisi keputusan arsitektur & pelajaran kerja yang harus diketahui SEBELUM mulai kerja, supaya tidak mengulang analisis atau kesalahan yang sama. Ditulis singkat, dengan pointer ke dokumen detail. Ikut ter-commit di git (beda dari memory lokal Claude Code yang cuma tersimpan di 1 mesin) — jadi tetap ada begitu repo di-clone di tempat lain atau dipakai AI session/kolaborator lain.
>
> **Update file ini kalau ada keputusan/insight yang costly untuk ditemukan ulang** (bukan setiap detail implementasi — itu tempatnya di `task/*.md`).

---

## Technical Debt Diketahui

- **`divisions.code` varchar, bukan FK** (2026-07-09) — akar penyebab sebagian besar pivot desain di task004/task005 (division dinamis per company/branch). Karena `channel_divisions.division`/`user_divisions.division` cuma dicocokkan sebagai string ke `divisions.code` (bukan FK numerik `division_id → divisions.id`), muncul 3 masalah struktural: (1) `channel_divisions` terpaksa punya kolom `branch_id` sendiri yang duplikat dengan `divisions.branch_id` — harus disinkronkan manual; (2) integritas kode divisi cuma dijaga di application code (`validateDivisionCode`/`ensureDivisionCode`), bukan constraint database; (3) 1 kode bisa ambigu di banyak baris (beda branch), butuh tie-break manual di ~32 lokasi JOIN. Keputusan awal pilih varchar demi menghindari perubahan di 24 titik `utils/scope.ts` — effort itu ternyata cuma pindah bentuk, bukan hilang. **Belum diperbaiki** — detail & opsi perbaikan: `task/task004.md` §9.

## Prinsip Kerja yang Sudah Divalidasi

- **Jangan ambil jalan pintas implisit (menyimpulkan relasi dari format string) demi mengurangi pekerjaan** — untuk identitas entitas inti, selalu tambahkan relasi eksplisit (FK/kolom), meski terlihat "sudah cukup unik" dari data yang ada. Kasus nyata: `channel_divisions.branch_id` sempat mau di-skip karena `channel_name` KNT "sudah unik per cabang" (mis. "COUNTER SBY") — ditolak, karena kalau format penamaan berubah, mapping salah tanpa ada yang sadar (tidak ada validasi DB-level). Lihat `task/task004.md` §2 poin 5.
- **`seed.ts` adalah bootstrap untuk DB baru, BUKAN tempat iterasi pemahaman bisnis yang terus berubah.** Kalau ada CRUD/API untuk suatu data, koreksi data riil (mis. taksonomi divisi MKO yang ternyata branch-specific, bukan company-wide) harus lewat API itu, bukan hardcode ulang ke seed. Lihat `task/task004.md` §7.
- **Kalau data yang sudah ada SUDAH menyiratkan suatu keputusan, jangan bikin mekanisme registrasi terpisah untuk keputusan yang sama.** Contoh: form/file mapping `channel_divisions` sudah berisi kode divisi eksplisit yang diketik admin — tidak perlu ada langkah kedua "daftarkan dulu kode divisinya" (baik lewat seed maupun fitur bulk-import terpisah). Solusinya: auto-derive/auto-create dari data yang sudah ada. Lihat `task/task004.md` §8.
- **Kalau user menunjukkan bukti data riil (invoice/faktur) yang kontradiktif dengan asumsi desain, itu prioritas di atas rencana yang sudah disepakati** — jangan defensif mempertahankan desain awal, verifikasi ulang lewat query ke data asli.

---

**Riwayat sumber**: entri di atas diringkas dari sesi task004 (Division Dinamis per Company/Branch, 2026-07-09) dan task005 (frontend, 4 sesi A–D). Baca `task/task004.md` §9 dan `CURRENT_STATE.md` sesi 40 untuk narasi lengkap.
