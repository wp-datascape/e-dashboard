# transaction-workbench/decisions.md

> Keputusan dan inferensi untuk Transaction & Revenue Workbench (Group 4).
> Baca juga: `transaction-workbench/overview.md`, `transaction-workbench/api.md`

## Keputusan yang Sudah Diambil

### 4.1 tidak butuh tabel baru

Order Ledger cukup query dari `invoices JOIN customers JOIN invoice_items`. Tidak ada tabel baru diperlukan. Endpoint `GET /invoices` feasible segera setelah backend mulai dibangun — satu-satunya caveat adalah filter BU yang menunggu `customers.business_unit`.

### 4.3 M6 dialokasikan ke Group 4

Sesuai FINALIZED_MENU_STRUCTURE.md, M6 Repeat Order Rate ada di Group 4 (bukan Group 2) karena mengukur frekuensi event transaksi. Ini konsisten dengan framing "Transaction Workbench = kapan/bagaimana transaksi terjadi." Chart sudah ada (RadialBarWidget), endpoint sudah didefinisikan — 4.3 bisa dikerjakan setelah 4.1 selesai.

---

## Keputusan Terbuka

### 1. Apakah 4.2 B2B Project Milestone masuk MVP

FINALIZED_MENU_STRUCTURE.md menandai ini "High Complexity" dan merekomendasikan evaluasi apakah masuk MVP atau ditunda ke v2.

Implikasi jika masuk MVP:
- Schema baru: tabel `projects` (id, company_id, customer_id, project_name, contract_value, start_date, end_date, status) + tabel `project_milestones` (id, project_id, milestone_name, planned_date, actual_date, billed_value, status)
- Endpoint baru: GET/POST/PUT /projects, GET /projects/:id/milestones, PUT /projects/:id/milestones/:milestone_id
- Permission baru: `projects:read`, `projects:manage`
- Frontend: komponen timeline milestone (tidak ada komponen existing yang bisa direuse langsung)
- Effort: 2-3 minggu backend + frontend

Implikasi jika ditunda ke v2:
- Tidak ada perubahan schema saat ini
- Tidak ada endpoint baru
- Halaman 4.2 tetap sebagai placeholder dengan status `ready: false`

Rekomendasi teknis: tunda ke v2 jika tidak ada data project yang tersedia dari Accurate Online — sistem ini berbasis faktur, bukan project management. Jika B2B Project dikelola di luar Accurate (spreadsheet, sistem lain), import mechanism-nya perlu didesain dari nol.

Status: menunggu konfirmasi PM/stakeholder. Jangan mulai implementasi tanpa keputusan eksplisit.

### 2. Apakah halaman 4.1 perlu soft-delete dan edit invoice

Tabel `invoices` sudah punya `deleted_at` (soft delete via import override). Tapi apakah user bisa edit atau hapus invoice individual dari UI Order Ledger, atau hanya bisa re-import?

Opsi A: read-only ledger — hanya tampil, tidak ada edit/delete dari UI
Opsi B: allow soft-delete per invoice (hapus invoice yang salah import tanpa re-import semua)

Implikasi: jika Opsi B, butuh endpoint `DELETE /invoices/:id` (soft delete) dengan permission `invoices:manage` dan audit log. Lebih kompleks tapi lebih operasional.

Belum diputuskan. Default asumsikan Opsi A (read-only) sampai ada keputusan sebaliknya.

---

## Catatan untuk Sesi Selanjutnya

- Jika 4.2 diputuskan masuk MVP, update `shared/data-model.md` dengan schema `projects` dan `project_milestones`, lalu update file ini.
- Jika 4.2 ditunda, tandai secara eksplisit di file ini dan di `CURRENT_STATE.md` agar tidak didesain ulang di sesi berikutnya.
- Open decision #2 tentang edit/delete invoice perlu dikonfirmasi sebelum endpoint `DELETE /invoices/:id` didesain.
