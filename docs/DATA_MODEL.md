# DATA_MODEL.md — Data Model Executive Dashboard

---

## Urutan Migrasi (Wajib Diikuti)

```
1.  companies
2.  users
3.  user_companies
4.  roles
5.  permissions
6.  role_permissions
7.  user_roles
8.  product_categories
9.  customers
10. invoices              ← header faktur penjualan
11. invoice_items         ← baris item per faktur (1 invoice N items)
12. import_logs
13. import_log_errors
14. metric_cache
15. audit_logs
16. app_configs
```

---

## Struktur Faktur Penjualan

Faktur dari Accurate Online menggunakan struktur **header + item**:

```
Invoice INV-2024-001  (1 header)
  ├── Item 1: Scanner   — qty: 2, revenue: 10.000.000, gp: 3.000.000
  ├── Item 2: Printer   — qty: 1, revenue: 5.000.000,  gp: 1.500.000
  └── Item 3: Ribbon    — qty: 5, revenue: 500.000,    gp: 200.000
```

- Tabel `invoices` menyimpan **header** (nomor, tanggal, customer, total)
- Tabel `invoice_items` menyimpan **setiap baris item** (produk, kategori, revenue, GP)
- **Deduplication key**: `invoice_number + company_id` di tabel `invoices`
- Semua kalkulasi metrik JOIN dari `invoices` ke `invoice_items`

---

## Tabel: `companies`

```sql
CREATE TABLE companies (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20)  NOT NULL UNIQUE,  -- misal: "PT_ABC"
  name       VARCHAR(255) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Drizzle schema:**
```typescript
export const companies = pgTable('companies', {
  id:        serial('id').primaryKey(),
  code:      varchar('code', { length: 20 }).notNull().unique(),
  name:      varchar('name', { length: 255 }).notNull(),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
```

---

## Tabel: `users`

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
```

---

## Tabel: `user_companies`

Mapping user ke entitas yang boleh diakses. `superadmin` & `admin` bypass cek ini di middleware.

```sql
CREATE TABLE user_companies (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);
```

---

## Tabel: `roles` & `permissions` (RBAC Dinamis)

RBAC sepenuhnya dinamis — role dan permission dikelola dari dashboard, tidak hardcoded.

```sql
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE = role default, tidak bisa dihapus
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,  -- format: 'resource:action', misal: 'metrics:read'
  description TEXT,
  group_name  VARCHAR(50),                   -- untuk grouping di UI, misal: 'Metrics', 'Users'
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE = permission default, tidak bisa dihapus
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

**Seed data roles (is_system = true, tidak bisa dihapus):**

| id | name | description | is_system |
|----|------|-------------|-----------|
| 1 | superadmin | Akses penuh sistem | true |
| 2 | admin | Import data, manage user & RBAC | true |
| 3 | manager | View semua metrik semua entitas | true |
| 4 | sales | View metrik sesuai entitas yang di-assign | true |
| 5 | executive | View-only dashboard semua entitas | true |

**Seed data permissions (is_system = true):**

| name | group_name | keterangan |
|------|------------|------------|
| `metrics:read` | Metrics | Lihat dashboard & metrik |
| `customers:read` | Customers | Lihat detail customer |
| `import:write` | Import | Import faktur (upload/API) |
| `import:read` | Import | Lihat log import |
| `users:manage` | Users | CRUD user |
| `roles:manage` | RBAC | Manage role & permission |
| `config:read` | Config | Lihat konfigurasi |
| `config:write` | Config | Update konfigurasi |
| `companies:read` | Companies | Lihat daftar entitas |

**Seed data role_permissions (default mapping):**

| Role | Permissions |
|------|-------------|
| superadmin | semua |
| admin | metrics:read, customers:read, import:write, import:read, users:manage, roles:manage, config:read, companies:read |
| manager | metrics:read, customers:read, import:read, companies:read |
| sales | metrics:read, customers:read, companies:read |
| executive | metrics:read, companies:read |

---

## Tabel: `product_categories`

Master data kategori produk. Di-upsert dari data import.

```sql
CREATE TABLE product_categories (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER      NOT NULL REFERENCES companies(id),
  code           VARCHAR(50)  NOT NULL,
  name           VARCHAR(255) NOT NULL,
  is_high_margin BOOLEAN      NOT NULL DEFAULT FALSE,
  is_service     BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE = jasa, tidak dihitung di metrik produk
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);
```

> `is_high_margin` diupdate oleh admin dari halaman konfigurasi.
> `is_service` diset saat pertama kali kategori ditemukan — perlu konfirmasi manual atau flag dari Accurate.

---

## Tabel: `customers`

Master data customer. Di-upsert setiap kali ada data faktur baru diimport.

```sql
CREATE TABLE customers (
  id                     SERIAL PRIMARY KEY,
  company_id             INTEGER      NOT NULL REFERENCES companies(id),
  customer_code          VARCHAR(100) NOT NULL,  -- kode dari Accurate
  name                   VARCHAR(255) NOT NULL,
  first_invoice_date     DATE         NOT NULL,  -- penentu: existing vs new customer
  last_invoice_date      DATE         NOT NULL,  -- penentu: aktif vs dormant
  total_lifetime_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, customer_code)
);

CREATE INDEX idx_customers_company_last_inv  ON customers(company_id, last_invoice_date);
CREATE INDEX idx_customers_company_first_inv ON customers(company_id, first_invoice_date);
```

---

## Tabel: `invoices` (Header Faktur)

Header faktur penjualan. Satu baris = satu nomor invoice.

```sql
CREATE TABLE invoices (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER      NOT NULL REFERENCES companies(id),
  customer_id    INTEGER      NOT NULL REFERENCES customers(id),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date   DATE         NOT NULL,
  total_revenue  NUMERIC(18,2) NOT NULL DEFAULT 0,  -- sum dari invoice_items
  total_gp       NUMERIC(18,2) NOT NULL DEFAULT 0,  -- sum dari invoice_items
  import_log_id  INTEGER REFERENCES import_logs(id),
  source         VARCHAR(20)  NOT NULL DEFAULT 'file',  -- 'file' atau 'accurate_api'
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, invoice_number)
);

CREATE INDEX idx_invoices_company_date   ON invoices(company_id, invoice_date);
CREATE INDEX idx_invoices_customer       ON invoices(customer_id);
CREATE INDEX idx_invoices_period         ON invoices(company_id, date_trunc('month', invoice_date));
```

---

## Tabel: `invoice_items` (Baris Item Faktur)

Setiap baris item dalam faktur. 1 invoice bisa punya N items.

```sql
CREATE TABLE invoice_items (
  id                  SERIAL PRIMARY KEY,
  invoice_id          INTEGER       NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id          INTEGER       NOT NULL REFERENCES companies(id),  -- denormalized untuk query performa
  product_category_id INTEGER REFERENCES product_categories(id),
  category_code       VARCHAR(50),   -- fallback jika kategori belum ada di master
  category_name       VARCHAR(255),  -- nama kategori dari sumber data
  revenue             NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_profit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice    ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_company    ON invoice_items(company_id);
CREATE INDEX idx_invoice_items_category   ON invoice_items(product_category_id);
CREATE INDEX idx_invoice_items_company_cat ON invoice_items(company_id, product_category_id);
```

> `company_id` di-denormalize ke `invoice_items` untuk menghindari extra JOIN ke `invoices` pada query analitik berat.

---

## Tabel: `import_logs`

Audit setiap proses import faktur.

```sql
CREATE TABLE import_logs (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER      NOT NULL REFERENCES companies(id),
  imported_by  INTEGER      NOT NULL REFERENCES users(id),
  source       VARCHAR(20)  NOT NULL,    -- 'file' atau 'accurate_api'
  filename     VARCHAR(255),             -- diisi jika source = 'file'
  file_type    VARCHAR(10),              -- 'csv' atau 'xlsx' jika source = 'file'
  period_month VARCHAR(7)   NOT NULL,    -- format: 'YYYY-MM'
  status       VARCHAR(20)  NOT NULL,    -- 'success', 'partial', 'failed'
  total_rows   INTEGER      NOT NULL DEFAULT 0,
  success_rows INTEGER      NOT NULL DEFAULT 0,
  error_rows   INTEGER      NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `import_log_errors`

Detail baris yang gagal saat import.

```sql
CREATE TABLE import_log_errors (
  id            SERIAL PRIMARY KEY,
  import_log_id INTEGER  NOT NULL REFERENCES import_logs(id),
  row_number    INTEGER  NOT NULL,
  raw_data      JSONB,
  error_message TEXT     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `metric_cache`

Cache hasil kalkulasi metrik.

```sql
CREATE TABLE metric_cache (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER REFERENCES companies(id),  -- NULL = holding view
  metric_key    VARCHAR(100) NOT NULL,
  period_month  VARCHAR(7)   NOT NULL,
  active_window INTEGER      NOT NULL,             -- 3, 6, atau 12
  result_json   JSONB        NOT NULL,
  calculated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ  NOT NULL,
  UNIQUE (company_id, metric_key, period_month, active_window)
);

CREATE INDEX idx_metric_cache_expires ON metric_cache(expires_at);
```

---

## Tabel: `audit_logs`

Audit trail semua aksi mutasi — **disimpan di DB, bukan di file**.

```sql
CREATE TABLE audit_logs (
  id         SERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id),
  action     VARCHAR(100) NOT NULL,  -- format: 'entity.action', misal: 'invoice.import', 'user.update'
  entity     VARCHAR(100),
  entity_id  INTEGER,
  meta       JSONB,                  -- detail perubahan, company_id, source, dsb
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action  ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

**Aksi yang wajib dicatat:**

| action | Trigger |
|--------|---------|
| `invoice.import` | Import faktur berhasil (file atau API) |
| `user.create` | Buat user baru |
| `user.update` | Update data user |
| `user.delete` | Soft delete user |
| `role.create` | Buat role baru |
| `role.update` | Update role |
| `role.delete` | Hapus role |
| `permission.assign` | Assign permission ke role |
| `permission.revoke` | Cabut permission dari role |
| `user_role.assign` | Assign role ke user |
| `user_role.revoke` | Cabut role dari user |
| `config.update` | Update app config |
| `category.update` | Update is_high_margin atau is_service |

---

## Tabel: `app_configs`

Konfigurasi dinamis sistem, termasuk kredensial Accurate API per company.

```sql
CREATE TABLE app_configs (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER REFERENCES companies(id),  -- NULL = global, tidak tied ke company
  key         VARCHAR(100) NOT NULL,
  value       TEXT         NOT NULL,
  description TEXT,
  is_secret   BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE = value tidak dikembalikan ke frontend
  updated_by  INTEGER REFERENCES users(id),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, key)
);
```

**Seed data global (company_id = NULL):**

| key | value | is_secret | description |
|-----|-------|-----------|-------------|
| `dormant_threshold_months` | `3` | false | Bulan tidak transaksi = dormant |
| `metric_cache_ttl_minutes` | `60` | false | TTL cache metrik |
| `upload_max_file_size_mb` | `10` | false | Batas ukuran file upload |

**Config per company (company_id diisi):**

| key | value | is_secret | description |
|-----|-------|-----------|-------------|
| `accurate_api_key` | `<key>` | **true** | API key Accurate Online |
| `accurate_company_db` | `<db_id>` | false | ID database company di Accurate |
| `high_margin_category_ids` | `[]` | false | ID kategori high margin (JSON array) |

> `is_secret = true` → nilai tidak pernah dikembalikan di response API, hanya digunakan server-side.

---

## Relasi Antar Tabel

```
companies ──< product_categories
companies ──< customers
companies ──< invoices ──< invoice_items
companies ──< import_logs
companies ──< metric_cache
companies ──< app_configs (per company)

users ──< user_companies >── companies
users ──< user_roles >── roles
roles ──< role_permissions >── permissions

customers ──< invoices
invoices ──< invoice_items
product_categories ──< invoice_items
import_logs ──< invoices
import_logs ──< import_log_errors

users ──< audit_logs
```

---

## Catatan Penting untuk Query

1. **Semua query WAJIB filter `company_id`** — baik dari `invoices` maupun `invoice_items`
2. **Metrik berbasis item**: Cross Selling, Avg Category, High Margin → query dari `invoice_items`
3. **Metrik berbasis revenue total**: Avg Revenue, Avg GP, Expansion Rate → bisa dari `invoices.total_revenue` atau SUM `invoice_items`
4. **Existing customer**: `customers.first_invoice_date < awal period_month`
5. **New customer**: `customers.first_invoice_date` jatuh di dalam `period_month`
6. **Customer aktif**: `customers.last_invoice_date >= (period_start - active_window bulan)`
7. **Dormant customer**: `customers.last_invoice_date < (period_start - dormant_threshold_months bulan)`
8. **Kategori jasa tidak dihitung** pada metrik produk: filter `WHERE is_service = false`
