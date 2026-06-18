# admin/decisions.md

> Keputusan dan inferensi untuk Admin Group (Group 5).
> Baca juga: `admin/overview.md`, `admin/api.md`, `shared/data-model.md`

## Keputusan yang Sudah Diambil

### Semua 5 halaman Admin sudah ada sebagai placeholder

Halaman Import, Users, RBAC, Config, dan AuditLog sudah ada di `src/pages/` tapi masih kosong. Tidak perlu buat file page baru — cukup implementasi UI di file yang sudah ada. Route dan menu entry sudah terdaftar.

### RBAC bersifat fully dynamic — tidak ada role hardcode di kode

Role dan permission dikelola dari database, bukan dari kode. Kode hanya menyebut permission string (contoh: `"users:manage"`) — tidak pernah cek nama role secara langsung. Konsekuensi: UI RBAC harus bisa menambah role baru dan assign permission arbitrary tanpa deploy ulang.

### Audit log ditulis di service layer, bukan middleware

`logAudit()` dipanggil di service layer setelah mutasi sukses, bukan di middleware. Ini agar context (entity_id, meta) tersedia saat log ditulis. Detail: `utils/audit.ts` di backend.

### Secret config tidak pernah dikirim ke frontend

`accurate_api_key` dan config lain dengan `is_secret=true` selalu di-mask sebagai `"***"` di response API. Frontend tidak pernah menerima nilai aslinya — hanya bisa mengirim nilai baru via PUT. UI Config harus menampilkan placeholder/asterisk, bukan input dengan value pre-filled dari API.

### Import: partial success diizinkan

Jika sebagian baris valid dan sebagian error, import tetap sukses untuk baris yang valid. Status import bisa `"success"`, `"partial"`, atau `"failed"`. UI harus menampilkan summary dan link ke error detail — bukan blokir seluruh import hanya karena ada beberapa baris bermasalah.

---

## Keputusan Terbuka

### 1. Apakah Accurate API key per company atau global

`app_configs` mendukung `company_id` nullable — jika `null` maka global, jika diisi maka per-company. Desain schema sudah mengantisipasi per-company. Tapi apakah dalam praktiknya semua entity menggunakan satu API key Accurate yang sama (global), atau masing-masing punya key sendiri?

Implikasi untuk UI Config: jika per-company, form harus ada dropdown company selector. Jika global, form lebih sederhana. Belum dikonfirmasi — implementasi UI Config harus siap handle kedua skenario.

### 2. Siapa yang bisa lihat Audit Log

Saat ini menggunakan permission `roles:manage` (sama dengan RBAC) — artinya hanya user dengan akses RBAC yang bisa lihat audit log. Apakah ini sudah tepat, atau perlu permission terpisah `audit:read`?

Jika diputuskan pakai `audit:read` sebagai permission terpisah, perlu:
- Tambah permission baru di seed data
- Assign ke role yang relevan (superadmin, admin minimal)
- Update backend endpoint check dari `roles:manage` ke `audit:read`

Belum diputuskan. Default ikuti `API_SPEC.md` yang memakai `roles:manage`.

### 3. Apakah Import perlu konfirmasi sebelum eksekusi (preview step)

Dua opsi flow import:
- **Opsi A (Simple)**: upload → langsung proses → tampilkan hasil. Tidak ada preview.
- **Opsi B (Stepper)**: upload → parse + preview N baris pertama → konfirmasi → proses. Lebih aman tapi lebih kompleks.

Opsi B butuh endpoint tambahan `POST /import/preview` yang parse file tapi tidak simpan ke DB. Belum didesain.

Untuk MVP, Opsi A lebih simpel dan cukup — user bisa lihat error di hasil import. Rekomendasikan Opsi A sampai ada feedback bahwa preview diperlukan.

---

## Catatan untuk Sesi Selanjutnya

- Saat mulai implementasi 5.1 Import UI, konfirmasi dulu Keputusan Terbuka #3 (preview atau tidak) sebelum desain komponen MUI Stepper.
- Untuk 5.4 Config, konfirmasi Keputusan Terbuka #1 (per-company vs global Accurate key) sebelum desain form.
- Permission `invoices:read` (untuk 4.1 Order Ledger) belum ada di seed data — perlu ditambahkan bersamaan dengan implementasi admin seeding di backend.
