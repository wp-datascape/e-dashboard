# Integration Strategy: Accurate Online — Multi-Branch

> Last updated: 2026-06-22
> Status: Design Decision

---

## Entity Structure (Confirmed)

| Company | Accurate DB | Branches |
|---------|-------------|----------|
| **PT MKO** | 1 DB (pusat + 2 cabang merged) | 1 branch (Pusat) |
| **PT KNT** | **Multi DB** — tiap cabang punya sendiri | 3 branch: Surabaya (=Pusat), Jakarta, Semarang |
| **PT SKI** | 1 DB | 1 branch (Pusat) |

## Strategy: Per-Branch Credentials

### Konsep

Buat tabel `company_branches` untuk menampung cabang. Credentials Accurate di-binding ke **branch**, bukan company.

```
companies
  ├── PT MKO (id=1)
  │     └── branch: Pusat (1 DB Accurate)
  ├── PT KNT (id=2)
  │     ├── branch: Surabaya / Pusat (1 DB Accurate)
  │     ├── branch: Jakarta (1 DB Accurate)
  │     └── branch: Semarang (1 DB Accurate)
  └── PT SKI (id=3)
        └── branch: Pusat (1 DB Accurate)
```

### Schema

```sql
-- Table: company_branches (BARU)
CREATE TABLE company_branches (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,       -- 'Pusat', 'Jakarta', 'Semarang'
  code            VARCHAR(50) NOT NULL,        -- 'PUSAT', 'JKT', 'SMG'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Seed data
-- PT MKO: (company_id=1, 'Pusat', 'PUSAT')
-- PT KNT: (company_id=2, 'Surabaya', 'SBY'), ('Jakarta', 'JKT'), ('Semarang', 'SMG')
-- PT SKI: (company_id=3, 'Pusat', 'PUSAT')

-- Table: accurate_credentials (BARU)
CREATE TABLE accurate_credentials (
  id                SERIAL PRIMARY KEY,
  branch_id         INTEGER NOT NULL REFERENCES company_branches(id) ON DELETE CASCADE,
  auth_method       VARCHAR(20) NOT NULL DEFAULT 'api_token',
  app_key           VARCHAR(255),
  signature_secret  VARCHAR(255),
  client_id         VARCHAR(255),
  client_secret     VARCHAR(255),
  callback_url      VARCHAR(500),
  company_db_id     VARCHAR(100),       -- Accurate Online internal DB ID
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id)
);
```

### Contoh Data Credentials

| branch_id | company | branch | app_key | company_db_id |
|-----------|---------|--------|---------|---------------|
| 1 | PT MKO | Pusat | xxx | db_mko |
| 2 | PT KNT | Surabaya | yyy | db_knt_sby |
| 3 | PT KNT | Jakarta | zzz | db_knt_jkt |
| 4 | PT KNT | Semarang | www | db_knt_smg |
| 5 | PT SKI | Pusat | abc | db_ski |

### Alur Sync

```
User pilih company → pilih branch → pilih periode → "Sync Now"
       │
       ▼
GET /api/v1/config/accurate/credentials/:branchId
       │
       ▼
System pakai credentials milik branch itu
       │
       ▼
Fetch dari Accurate Online API → Parse → Store dengan company_id + branch_id
       │
       ▼
Filter dashboard: company + branch → tampil data spesifik
```

### Alur Import Data

1. User pilih company & branch di form Import
2. System ambil credentials sesuai branch
3. Fetch data dari Accurate
4. Store ke DB dengan `company_id` + `branch_id`
5. Dashboard filter by company & branch

---

## Data Model Impact

### Existing tables perlu tambah `branch_id`:
- `invoices` → tambah `branch_id`
- `invoice_items` → tambah via join
- `customers` → sudah ada `business_unit`? Atau pakai `branch_id`?

### New tables:
- `company_branches` — master cabang
- `accurate_credentials` — credentials per branch

---

## Frontend Impact

### Import Form
Tambah dropdown "Branch" yang isinya tergantung company yang dipilih:
- Pilih PT MKO → Branch: [Pusat]
- Pilih PT KNT → Branch: [Surabaya, Jakarta, Semarang]
- Pilih PT SKI → Branch: [Pusat]

### Integration Tab
Form credentials pilih company → pilih branch → baru isi form.

### Dashboard Filter
Saat ini: "Select Entity" (company)
Nanti: "Select Entity" + "Select Branch" (filtered by company)

---

## Implementation Plan

| Step | Description | Priority |
|------|-------------|----------|
| 1 | Buat tabel `company_branches` + seed data | High |
| 2 | Buat tabel `accurate_credentials` + migration | High |
| 3 | API CRUD branches (`GET /companies/:id/branches`) | High |
| 4 | API CRUD credentials (`GET/PUT /config/accurate/credentials/:branchId`) | High |
| 5 | UI Integration Tab — pilih company → branch → form | High |
| 6 | Tambah filter Branch di dashboard | Medium |
| 7 | Tambah `branch_id` di tabel data (invoices, customers) | Medium |
| 8 | Sync service — fetch per branch | Medium |

---

## Open Questions

1. **Encryption**: Apakah credentials perlu di-encrypt di DB? (AES-256)
2. **Branch di Customer**: Apakah customer sudah punya branch assignment? Atau nanti dari invoice?
3. **Test Connection**: Perlu button test sebelum save?
4. **Rate Limit**: Accurate punya rate limit?
5. **Format CSV**: Konfirmasi format export Accurate Online.

---

## Status

⏸ **Menunggu konfirmasi** sebelum implementasi:
- [ ] Setuju strategi per-branch credentials?
- [ ] Branch KNT: Surabaya (=Pusat), Jakarta, Semarang — ada tambahan?
- [ ] MKO: 1 branch (Pusat) — benar?
- [ ] Perlu encrypt credentials?