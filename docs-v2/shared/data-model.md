# shared/data-model.md

## Migration Order (respect FK dependencies)

companies
users
roles
permissions
user_roles
role_permissions
user_companies
company_branches
user_branches           -- child dari company_branches (Task001, §4)
user_divisions          -- child dari company_branches, BUKAN dari companies (Task001, §4)
accurate_credentials
business_configs        -- sebelumnya bernama app_configs di draf awal
item_classification_rules
product_categories
products
customers
channel_divisions
invoices
invoice_items
high_margin_products
import_logs
import_log_errors
page_settings
audit_logs

Catatan: `metric_cache` (draf awal) TIDAK pernah diimplementasikan — metrik dihitung
on-demand tanpa cache tabel terpisah, lihat `db/schema/index.ts` (export dikomentari).


## Core Tables

### companies
id          serial PK

code        varchar unique        -- e.g. PT_ABC

name        varchar

created_at  timestamp

updated_at  timestamp

### users
id          serial PK

name        varchar

email       varchar unique

password    varchar               -- bcryptjs cost >= 12

is_active   boolean default true

created_at  timestamp

updated_at  timestamp

deleted_at  timestamp nullable    -- soft delete

preferences jsonb default '{}'    -- Task003: { theme_mode, color_palette, language } - self-service via PATCH /auth/me/preferences

### roles
id          serial PK

name        varchar unique

description text nullable

is_system   boolean default false -- cannot delete or rename if true

created_at  timestamp

updated_at  timestamp
Default system roles: superadmin, admin, manager, sales, executive

### permissions
id          serial PK

name        varchar unique        -- format: resource:action

description text nullable

group_name  varchar               -- for UI grouping

created_at  timestamp

updated_at  timestamp

### user_roles
id          serial PK

user_id     FK users

role_id     FK roles

created_at  timestamp

### role_permissions
id             serial PK

role_id        FK roles

permission_id  FK permissions

created_at     timestamp

### user_companies
id          serial PK

user_id     FK users

company_id  FK companies

created_at  timestamp
superadmin + admin bypass this table check.

### product_categories
id                  serial PK

company_id          FK companies

name                varchar

item_type           varchar default 'unit'    -- unit | consumable | sparepart | service

avg_margin_percent  numeric(5,2) default 0    -- rata-rata margin % dari transaksi

is_service          boolean default false     -- deprecated (ganti ke item_type)

created_at          timestamp

updated_at          timestamp

Note: `is_high_margin` dihapus — digantikan tabel `high_margin_products` (time-based, per period).

### products
id                  serial PK

company_id          FK companies

product_name        varchar                   -- UPPERCASE, dari nama item di faktur

product_category_id FK product_categories nullable

created_at          timestamp

updated_at          timestamp

UNIQUE (company_id, UPPER(product_name))

Diisi oleh import parser — setiap item baris faktur upsert ke sini.
ID di-generate sistem, bukan dari Accurate (data Accurate tidak clean).

### item_classification_rules
id             serial PK

company_id     FK companies nullable   -- null = global rule (berlaku semua company)

match_type     varchar    -- keyword_item_name | keyword_category | price_range | exact_item_name | exact_category

match_pattern  varchar    -- keyword (UPPERCASE) atau JSON range utk price_range: {"min": 500000}

item_type      varchar    -- unit | consumable | sparepart | service

priority       integer default 50   -- lebih tinggi = lebih prioritas

is_active      boolean default true

created_at     timestamp

updated_at     timestamp

Engine klasifikasi item 4-layer (`utils/classifier.ts`): Layer 1 keyword matching (nama item/
kategori) → Layer 2 price range heuristic → Layer 3 DB lookup override (tabel ini) → Layer 4
fallback ke 'unit' + needs_review. `match_pattern` selalu UPPERCASE (dinormalisasi saat input).

### high_margin_products
id                   serial PK

company_id           FK companies

product_id           FK products nullable       -- target: produk spesifik
product_category_id  FK product_categories nullable -- target: seluruh kategori

effective_from       date NOT NULL
effective_until      date nullable              -- null = masih aktif

note                 text nullable

created_by           FK users nullable

created_at           timestamp
updated_at           timestamp

CHECK (product_id IS NOT NULL OR product_category_id IS NOT NULL)

Satu row = satu periode "high margin" untuk satu produk atau kategori.
History dipertahankan — tidak di-overwrite, effective_until diset saat deaktivasi.
Dikelola via halaman `/settings/high-margin`.

### customers
id                  serial PK

company_id          FK companies

customer_code       varchar

customer_name       varchar

business_unit       varchar nullable   -- distribution|project|e_commerce|intercompany|freelancer|support (diisi saat import, mungkin null untuk data historis)

first_invoice_date  date nullable

last_invoice_date   date nullable

created_at          timestamp

updated_at          timestamp

UNIQUE (customer_code, company_id)

Note: `division` runtime dihitung dari JOIN `channel_divisions` via `invoices.channel_name` — tidak tersimpan di tabel ini secara langsung. Filter division via `channel_divisions.division`, bukan `customers.business_unit`.

### invoices
id               serial PK

company_id       FK companies

customer_id      FK customers

invoice_number   varchar

invoice_date     date

total_revenue    numeric

total_gp         numeric

channel_name     varchar nullable      -- dari kolom "Nama Tenaga Penjual" Accurate export, disimpan UPPERCASE. Bukan nama orang — nama channel penjualan (DC WEST, TOKOPEDIA, dll)

branch_name      varchar nullable      -- dari kolom "Nama Cabang" Accurate export (teks mentah)

branch_id        FK company_branches nullable  -- di-resolve OTOMATIS dari branch_name saat
                                                -- import (Task001 §3.3/§4.6, fix 2026-07-06,
                                                -- findBranchIdByName() di import.repository.ts).
                                                -- branch_name kosong -> fallback branch "Lainnya"
                                                -- (row asli, bukan NULL). branch_name terisi tapi
                                                -- tidak match branch manapun -> tetap NULL (sinyal
                                                -- data kotor/typo, perlu diaudit manual).

import_log_id    FK import_logs nullable

created_at       timestamp

updated_at       timestamp

deleted_at       timestamp nullable    -- soft delete only

UNIQUE (invoice_number, company_id)   -- dedup key

### invoice_items
id                  serial PK

invoice_id          FK invoices

product_id          FK products NOT NULL        -- wajib setelah import parser upsert products

product_category_id FK product_categories nullable

revenue             numeric

gross_profit        numeric

created_at          timestamp

updated_at          timestamp

Note: `product_name` dihapus — redundan dengan JOIN ke tabel `products`.

### import_logs
id                serial PK

company_id        FK companies

source            varchar             -- file | accurate_api

filename          varchar nullable

period_month      varchar             -- YYYY-MM

status            varchar             -- success | partial | failed

total_invoices    integer default 0

total_items       integer default 0

success_invoices  integer default 0

error_rows        integer default 0

imported_by       FK users

created_at        timestamp

updated_at        timestamp

### import_log_errors
id            serial PK

import_log_id FK import_logs

row_number    integer nullable

raw_data      text nullable

error_message text

created_at    timestamp

### metric_cache — **TIDAK PERNAH DIIMPLEMENTASIKAN**
Draf awal (rencana cache per metric/period), tidak jadi dibuat — semua metrik dihitung
on-demand langsung dari `invoices`/`invoice_items` tiap request, tanpa tabel cache terpisah.
Struktur di bawah cuma arsip draf, BUKAN tabel yang ada di database:

~~id            serial PK~~

~~company_id    FK companies nullable   -- null = holding/all~~

~~metric_name   varchar~~

~~period_month  varchar                 -- YYYY-MM~~

~~active_window integer                 -- 3 | 6 | 12~~

~~value         jsonb~~

~~expires_at    timestamp~~

### audit_logs
id          serial PK

actor_id    FK users nullable

action      varchar                   -- e.g. invoice.import, user.create

entity      varchar                   -- table name, e.g. users, roles, invoices

entity_id   varchar nullable          -- string untuk fleksibilitas (int atau uuid)

company_id  FK companies nullable     -- konteks perusahaan saat mutasi terjadi

old_value   jsonb nullable            -- state sebelum mutasi (null untuk create/import)

new_value   jsonb nullable            -- state setelah mutasi (null untuk delete)

meta        jsonb nullable            -- konteks tambahan (e.g. file name saat import)

ip_address  varchar nullable

request_id  varchar nullable          -- untuk distributed tracing

created_at  timestamp

### business_configs
(nama final — draf awal menyebutnya `app_configs`, key-value global sederhana, BUKAN
per-company/is_secret seperti draf di bawah; kredensial Accurate malah punya tabel sendiri,
lihat `accurate_credentials` di atas)

id          serial PK

key         varchar unique

value       varchar

description text nullable

created_at  timestamp

updated_at  timestamp

Key yang sudah di-seed (per 2026-07-06, `db/seed.ts`):
- `active_window_months` — window bulan "aktif" (default 1)
- `dormant_threshold_months.b2b_dc` / `.b2b_project` / `.b2c` / `.manufacturing`
- `repeat_order_target_pct`, `dormant_rate_alert_pct`, `reactivation_target_low_pct`,
  `reactivation_target_high_pct` — target KPI M6/M8/M10
- `branch_division_enforcement_enabled` — feature flag rollout Task001 (§F2/F3), default
  `'false'` (bypass, cuma company scope yang berlaku); toggle via Settings → Threshold atau
  `PATCH /api/v1/config/:key`

## Invoice Data Structure (Critical)
invoices (1 row = 1 invoice header)

invoice_items (N rows = line items per invoice)
- Never merge header and items into one table
- Metrics based on categories (M1, M2, M5) query from invoice_items
- Metrics based on revenue/GP (M3, M4) query from invoices totals

## CSV/Excel Column Mapping (Accurate Online export)
invoice_number   -- unique invoice number

invoice_date     -- DD/MM/YYYY

customer_code    -- customer code in Accurate

customer_name    -- customer name

product_category -- category name (mapped to product_categories)

revenue          -- numeric, no thousand separator, decimal comma

gross_profit     -- numeric
Column mapping handled in utils/parser.ts — do not change internal column names.

## New Tables (Added 2026-06-23)

### company_branches
id              serial PK

company_id      FK companies

name            varchar               -- 'Lainnya', 'Surabaya', 'Jakarta', 'Semarang'

code            varchar               -- 'LAINNYA', 'SBY', 'JKT', 'SMG'

is_active       boolean default true

created_at      timestamp

updated_at      timestamp

UNIQUE (company_id, code)

Tiap company punya minimal 1 branch **"Lainnya"** — row ASLI (bukan NULL/virtual), dipakai
sebagai bucket invoice yang `branch_name`-nya kosong (lihat Task001 §4.6). Revisi 2026-07-06:
sebelumnya seed pakai "Pusat" sebagai default, ternyata tidak cocok dengan struktur Accurate
riil (company 1 di produksi punya Jakarta+Surabaya asli, "Pusat" cuma nama generik yang salah) —
"Pusat" di-repurpose jadi "Lainnya" untuk company yang memang tidak punya branch fisik lain
(mis. company 3), sementara company yang punya branch riil (Jakarta/Surabaya) tetap dapat
tambahan "Lainnya" terpisah sebagai bucket "tidak ada info branch". PT KNT punya 3 branch
terpisah karena masing-masing punya Accurate DB sendiri.

### user_branches
user_id         FK users

company_id      FK companies          -- redundan dari company_branches.company_id, disimpan
                                       -- eksplisit utk sanity-check insert + hindari extra JOIN

branch_id       FK company_branches

created_at      timestamp

PRIMARY KEY (user_id, company_id, branch_id)

Kontrol akses level Branch (Task001 §3.1) — child dari Company. User cuma bisa lihat data
branch yang di-assign eksplisit di sini; tanpa row sama sekali = default-deny total untuk
company itu (bukan bypass "lihat semua branch").

### user_divisions
user_id         FK users

branch_id       FK company_branches   -- BUKAN FK companies langsung — division cuma
                                      -- bermakna dalam konteks satu branch tertentu

division        varchar               -- distribution | project | e_commerce | intercompany
                                       -- | freelancer | support | other

created_at      timestamp

PRIMARY KEY (user_id, branch_id, division)

Kontrol akses level Division (Task001 §3.2) — child dari Branch, BUKAN child langsung dari
Company (hierarki: Company -> Branch -> Division). Branch yang diizinkan tapi tidak punya
row division sama sekali di sini = default-deny berjenjang (child dianggap kosong, bukan
"tidak dibatasi") — lihat Task001 §4.4.

### accurate_credentials
id              serial PK

branch_id       FK company_branches (unique)

auth_method     varchar default 'api_token'  -- 'api_token' | 'oauth'

api_token       varchar nullable             -- WAJIB encrypt di DB

client_id       varchar nullable             -- OAuth only

client_secret   varchar nullable             -- OAuth only

callback_url    varchar nullable             -- OAuth only

subdomain       varchar not null             -- e.g. 'mko' dari mko.accurate.id

company_db_id   varchar nullable             -- Accurate internal DB ID

access_token    varchar nullable             -- OAuth runtime token

refresh_token   varchar nullable             -- OAuth refresh

token_expires_at timestamp nullable          -- OAuth expiry

is_active       boolean default true

created_at      timestamp

updated_at      timestamp

UNIQUE (branch_id)

API Token adalah method yang direkomendasikan (stabil, tanpa refresh cycle). OAuth tersedia sebagai alternatif.

### channel_divisions
id           serial PK

channel_name varchar NOT NULL    -- nama channel UPPERCASE (cocok dengan invoices.channel_name)

division     varchar NOT NULL    -- distribution | project | e_commerce | intercompany | freelancer | support | other

company_id   FK companies nullable  -- null = global rule (berlaku untuk semua company)

created_at   timestamp

**'other'** ("Lainnya") BUKAN row eksplisit di tabel ini — itu nilai fallback via
`COALESCE(channel_divisions.division, 'other')` di level query (Task001 §4.5, fix 2026-07-06,
`utils/scope.ts`) untuk invoice yang `channel_name`-nya tidak match rule manapun di bawah.
Tanpa COALESCE ini, baris ber-division NULL tidak pernah lolos filter scope RBAC meski user
punya akses 'other' — bug nyata yang ditemukan lewat E2E test (Task001 Task G4).

25 baris mapping channel_name → division (per 2026-07-06):
- distribution  → DC EAST, DC EAST CARD, DC EAST HEAD, DC WEST, DC WEST HEAD, HEAD OF DC EAST, HEAD OF DC WEST, SAMPLE ORDER
- project       → B2B EAST, B2B EAST CARD, KAE WEST, NAS B2B EAST, NAS B2B WEST, SDR B2B WEST, SDR WEST CARD
- e_commerce    → KASSEN OFFICIAL STORE, LAZADA, TIKTOKSHOP, TOKOPEDIA
- intercompany  → CODESHOP, KODE NIAGA TAMA
- freelancer    → FREELANCER SBY UDIN, SBY UDIN
- support       → SALES SUPPORT, SALES SUPPORT JKT

### page_settings
id          serial PK

page_key    varchar unique   -- lowercase-with-dashes, e.g. 'dashboard', 'products-trend'

ready       boolean default false   -- default false (safer — hidden sampai eksplisit ready)

created_at  timestamp

updated_at  timestamp

Frontend cek `ready=true` sebelum render halaman; kalau `false` tampil "Under Maintenance"/
kosong. Tidak ada FK ke tabel lain. Diatur lewat Settings → Feature Config di admin panel
(beda dari `business_configs` — ini soal visibility MENU, bukan konfigurasi bisnis).

---

## Pending Schema Items (not yet added)

projects table           -- B2B project milestone tracking (confirm if MVP)

## Filter Fields (aktif diimplementasi)

### Channel Division Filter (IMPLEMENTED):
- `invoices.channel_name` (dari "Nama Tenaga Penjual" Accurate) → JOIN `channel_divisions.channel_name` → `channel_divisions.division`
- Query param `business_unit`/`division` di hampir semua endpoint (customers, transactions,
  dashboard, metrics) filter via `COALESCE(channel_divisions.division, 'other')`
- Nilai valid: `distribution | project | e_commerce | intercompany | freelancer | support | other`

### Branch Filter (IMPLEMENTED, Task001 §H2/H4, 2026-07-06):
- `invoices.branch_id` (di-resolve otomatis dari `branch_name` saat import — lihat section
  `invoices` di atas) → filter langsung via query param `branch_id`
- Diterapkan di hampir semua halaman/endpoint: Customers, Transactions, Dashboard, Cross
  Selling, Dormant Customer, Customer Metrics, Product Trend, High Margin, Products
  (Category Performance). Dropdown filter di frontend mengikuti level akses user sendiri
  (`useMyScope()`/`useScopedCompanyFilter()`) — beda dari `branchScope` RBAC enforcement,
  ini murni filter laporan opsional.
- Validasi akses: `assertBranchFilterAccess()` (`middleware/auth.ts`) — 403 kalau `branch_id`
  yang diminta bukan hak user (bukan silently return kosong).

### Cara filter dashboard ke depan:
```
GET /api/v1/metrics/cross-selling?company_id=1&branch_id=6&period_end=2026-07-05&division=distribution
```
Filter `branch_id`/`division` optional — jika tidak dikirim, hitung semua branch/division
dalam scope akses user (bukan berarti bypass RBAC, cuma tidak dipersempit lebih lanjut).

### Pola wajib: `company_id='all'` HARUS threading `scopeIds`, bukan cuma cek `cid=0`

Ditemukan lewat audit lanjutan RBAC ([[task022]], 2026-08-06) — 2 kelas bug
berbeda yang berulang kali muncul di codebase ini:

1. Query raw SQL yang mengecek sentinel `cid=0` ("company_id='all'") sebagai
   kondisi `TRUE` tanpa syarat, TANPA ikut mengecek `companyScopeIds` hasil
   `resolveCompanyScope()` — bocor data/kalkulasi lintas company untuk user
   non-superadmin yang minta `'all'` (contoh: `resolveDormantMonths()`,
   `backend/src/features/config/threshold.ts`). Selalu gunakan
   `buildCompanyConditionRaw(companyExpr, cid, companyScopeIds)`
   (`utils/scope.ts`) untuk kondisi company, jangan tulis manual.
2. Handler yang menerima `company_id` dari query/body TAPI tidak pernah
   memanggil `resolveCompanyScope()` sama sekali — company eksplisit di luar
   akses user pun lolos tanpa validasi (3 endpoint ditemukan: `channel-
   divisions/unmapped-channels`, `divisions/values`, `item-types/values`).
   Endpoint kategori "list nilai buat dropdown" (bukan tabel data utama)
   paling sering kelewat pola ini karena terasa "kurang penting" untuk
   diaudit — checklist review endpoint baru: SETIAP handler yang terima
   `company_id` WAJIB panggil `resolveCompanyScope()`, tanpa kecuali.
