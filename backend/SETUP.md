# Setup Database — Panduan Refresh DB Setelah Pull dari GitHub

## Prasyarat

- Docker sudah terinstall dan running
- Bun sudah terinstall
- Sudah `git pull` (atau clone repo baru)

---

## Langkah 1 — Jalankan PostgreSQL Container

```bash
make db-up
```

Atau manual:
```bash
docker compose up -d postgres
```

Tunggu sampai container siap (health check ok).

Cek status:
```bash
make db-status
```

---

## Langkah 2 — Reset Database (DROP + Migrate + Seed)

> ⚠️ **Perintah ini DESTRUCTIVE!** Semua data yang ada akan hilang.
> Hanya jalankan jika kamu yakin mau reset dari awal.

```bash
make db-reset
```

Perintah ini akan:
1. DROP schema `drizzle` (hapus tracking migration) — ini yang sebelumnya **tidak ada** dan menyebabkan error "relation does not exist"
2. DROP schema `public` (hapus semua tabel)
3. Recreate schema `public`
4. Jalankan `drizzle-kit migrate` — baca file SQL + buat schema `drizzle` + tracking table dari awal, lalu apply semua migration
5. Update `_journal.json` otomatis oleh Drizzle

---

## Langkah 3 — Seed Data Master

```bash
make db-seed
```

Ini akan mengisi:
- **3 Companies**: PT MKO, PT KNT, PT SKI
- **3 Roles**: superadmin, admin, user
- **3 Users**: admin@mail.com, executif@mail.com, user@mail.com (password: `123456`)
- **Permissions**: semua permission untuk menu
- **Role-Permission**: semua permission ke superadmin
- **User Assignments**: admin@mail.com ke role superadmin + semua company
- **Business Configs**: setting window aktif, dormant threshold
- **Page Settings**: status ready untuk setiap halaman

---

## Langkah Alternatif (Jika db-reset Gagal)

Kadang `drizzle-kit migrate` tidak mendeteksi migration yang perlu dijalankan karena `_journal.json` kosong. Jika `db-reset` tidak berhasil, lakukan langkah berikut:

### 2a — Drop All Tables Manual

```bash
docker exec e-dashboard-db psql -U dashboard -d e_dashboard -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO dashboard;"
```

### 2b — Push Manual Entry ke _journal.json (HANYA jika migration SQL sudah ada)

Buka `backend/src/db/migrations/meta/_journal.json` dan isi entries:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1718000000000,
      "tag": "0000_init_schema",
      "breakpoints": true
    }
  ]
}
```

Lalu jalankan:
```bash
make db-migrate
```

### 2c — Atau Jalankan SQL Langsung

```bash
cat backend/src/db/migrations/0000_init_schema.sql | docker exec -i e-dashboard-db psql -U dashboard -d e_dashboard
```

Kemudian push manual entry ke `_journal.json` (langkah 2b di atas) agar Drizzle tahu migration sudah dijalankan.

### 2d — Baru Seed

```bash
make db-seed
```

---

## Verifikasi

Cek apakah semua tabel sudah terbentuk:

```bash
make db-status
```

Harusnya muncul tabel-tabel:
- `users`, `companies`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_companies`, `page_settings`, `audit_logs`, `business_configs`

Cek data user:

```bash
docker exec e-dashboard-db psql -U dashboard -d e_dashboard -c "SELECT id, name, email FROM users;"
```

---

## Workflow Lengkap (Setelah Pull)

```bash
# 1. Update kode
git pull

# 2. Start DB kalau belum jalan
make db-up

# 3. Reset + migrate
make db-reset

# 4. Seed
make db-seed
```

**Semua dalam satu baris** (destructive — hanya untuk development):

```bash
make db-up && make db-reset && make db-seed
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `docker: command not found` | Install Docker |
| Container `e-dashboard-db` tidak ada | `docker compose up -d postgres` |
| Port 5432 sudah dipakai | Stop service PostgreSQL lain, atau ganti port di `docker-compose.yml` |
| `bun: command not found` | Install Bun: `curl -fsSL https://bun.sh/install \| bash` |
| Migration error "relation already exists" | Jalanin DROP SCHEMA dulu (langkah 2a) |
| Seed error duplicate key | Seed sudah skip data yang exist — jalankan ulang saja |
| `make db-reset` minta konfirmasi | Ketik `y` lalu Enter |

---

## Catatan Penting

- Migration file saat ini: `0000_init_schema.sql` (schema awal) + `0001_daily_rawhide_kid.sql` (tabel `business_configs`)
- Jika ada perubahan schema baru, generate migration baru via:
  ```bash
  make db-generate
  ```
- Setelah generate migration baru, apply via:
  ```bash
  make db-migrate
  ```
- **Jangan hapus/edit migration yang sudah dijalankan** — buat migration baru saja
- `_journal.json` adalah tracker Drizzle — jangan diedit manual. `drizzle-kit generate` & `drizzle-kit migrate` yang mengelola file ini secara otomatis
- `_journal.json` WAJIB di-commit ke git agar anggota tim lain mendapat migration terbaru
