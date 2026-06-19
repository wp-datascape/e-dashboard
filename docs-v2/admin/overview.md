# admin/overview.md

> Ringkasan halaman untuk Admin Group (Group 5).
> Sumber: `FINALIZED_MENU_STRUCTURE.md` Group 5, `API_SPEC.md`, `AI_RULES.md` bagian RBAC/Import.
> Baca juga: `admin/api.md`, `admin/decisions.md`, `shared/data-model.md`

## Tujuan Group

Operasional sistem — import data faktur, manajemen user dan akses, konfigurasi threshold, dan audit trail.

---

## 5.1 Import

Status: UI selesai (mock API aktif, backend belum)

Upload file CSV/Excel atau trigger fetch dari Accurate Online API. Dua mode:
- **File upload**: drag-and-drop `.csv` atau `.xlsx`, max 10MB
- **Accurate API fetch**: trigger pull dari Accurate Online untuk company + period tertentu

Setelah import, tampilkan ringkasan: total invoice, success, error, link ke error detail.

Riwayat import: tabel `import_logs` — tampilkan status per import (success/partial/failed), link ke error rows.

Permission: `import:write` untuk trigger import, `import:read` untuk lihat logs.

Components: MUI Stepper (upload → review → confirm), DataGrid untuk log history, Alert untuk error summary.

---

## 5.2 Users

Status: UI selesai (mock API aktif, backend belum)

CRUD user + assign role + assign company access. Operasi:
- Daftar user (DataGrid, search by name/email, filter by role)
- Buat user baru (form: name, email, password sementara, role_ids, company_ids)
- Edit user (update name, roles, companies, is_active)
- Soft delete user (hanya superadmin bisa hapus sesama superadmin)

Permission: `users:manage`

Components: DataGrid, Dialog (form create/edit), StatusChip (active/inactive).

---

## 5.3 RBAC

Status: UI selesai (mock API aktif, backend belum)

Manajemen role dan permission. Dua sub-section:
- **Roles**: daftar role, buat/edit/hapus role (is_system=true tidak bisa dihapus/rename)
- **Permission Matrix**: checklist permission per role — tampilkan sebagai grid role × permission, checkbox untuk toggle

Permission: `roles:manage`

Components: DataGrid untuk daftar role, custom matrix grid (bukan chart), Dialog konfirmasi delete.

---

## 5.4 Config

Status: UI selesai (mock API aktif, backend belum)

Edit app_configs — threshold bisnis dan API key Accurate. Dua kategori config:
- **Global**: `dormant_threshold_months`, `high_margin_category_ids` — berlaku untuk semua company
- **Per-company**: `accurate_api_key`, `accurate_api_url` — spesifik per entitas

Nilai dengan `is_secret=true` selalu di-mask sebagai `"***"` di response — UI harus handle ini (tampilkan placeholder, bukan value sebenarnya).

Permission: `config:read` untuk lihat, `config:write` untuk update.

Components: Form sederhana per config key, TextField dengan toggle show/hide untuk secret values.

---

## 5.5 Audit Log

Status: Placeholder (halaman sudah ada, UI belum diimplementasi)

Tabel riwayat aksi mutasi dari semua user. Filter: company, action type, actor, date range.

Action types yang dicatat: `invoice.import`, `user.create`, `user.update`, `user.delete`, `role.create`, `role.update`, `role.delete`, `permission.assign`, `permission.revoke`, `user_role.assign`, `user_role.revoke`, `config.update`, `category.update`

Read-only — tidak ada aksi dari halaman ini.

Permission: `roles:manage` (shared dengan RBAC — hanya admin level atas yang bisa lihat audit log).

Components: DataGrid (server-side pagination + filter), StatusChip untuk action type.

---

## Urutan Implementasi Admin (Prioritas)

1. **5.1 Import** — paling kritikal, tanpa ini tidak ada data yang bisa dianalisis
2. **5.2 Users** — dibutuhkan untuk onboarding tim
3. **5.4 Config** — diperlukan untuk set accurate_api_key dan dormant threshold
4. **5.3 RBAC** — butuh user + permission seeding dulu sebelum UI bermanfaat
5. **5.5 Audit Log** — bisa belakangan, data sudah dicatat di DB sejak mutasi pertama
