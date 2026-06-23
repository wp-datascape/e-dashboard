# shared/data-model.md

## Migration Order (respect FK dependencies)

companies
users
roles
permissions
user_roles
role_permissions
user_companies
product_categories
customers
invoices
invoice_items
import_logs
import_log_errors
metric_cache
audit_logs
app_configs


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
id            serial PK

company_id    FK companies

name          varchar

is_high_margin boolean default false

is_service    boolean default false

created_at    timestamp

updated_at    timestamp

### customers
id                  serial PK

company_id          FK companies

customer_code       varchar

customer_name       varchar

business_unit       varchar nullable   -- B2B_DC | B2B_PROJECT | B2C | MANUFACTURING

first_invoice_date  date nullable

last_invoice_date   date nullable

created_at          timestamp

updated_at          timestamp

UNIQUE (customer_code, company_id)

### invoices
id             serial PK

company_id     FK companies

customer_id    FK customers

invoice_number varchar

invoice_date   date

total_revenue  numeric

total_gp       numeric

import_log_id  FK import_logs nullable

created_at     timestamp

updated_at     timestamp

deleted_at     timestamp nullable      -- soft delete only

UNIQUE (invoice_number, company_id)   -- dedup key

### invoice_items
id                  serial PK

invoice_id          FK invoices

product_category_id FK product_categories nullable

product_name        varchar

revenue             numeric

gross_profit        numeric

created_at          timestamp

updated_at          timestamp

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

### metric_cache
id            serial PK

company_id    FK companies nullable   -- null = holding/all

metric_name   varchar

period_month  varchar                 -- YYYY-MM

active_window integer                 -- 3 | 6 | 12

value         jsonb

expires_at    timestamp

created_at    timestamp

updated_at    timestamp

UNIQUE (company_id, metric_name, period_month, active_window)

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

### app_configs
id          serial PK

key         varchar

value       text

company_id  FK companies nullable     -- null = global

is_secret   boolean default false     -- mask as "***" in API response

description text nullable

created_at  timestamp

updated_at  timestamp

UNIQUE (key, company_id)

Key configs:
dormant_threshold_months   -- default: 3

high_margin_category_ids   -- comma-separated category IDs

accurate_api_key           -- per company, is_secret=true

accurate_api_url           -- per company

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

name            varchar               -- 'Pusat', 'Surabaya', 'Jakarta', 'Semarang'

code            varchar               -- 'PUSAT', 'SBY', 'JKT', 'SMG'

is_active       boolean default true

created_at      timestamp

updated_at      timestamp

UNIQUE (company_id, code)

Tiap company punya minimal 1 branch (Pusat). PT KNT punya 3 branch terpisah karena masing-masing punya Accurate DB sendiri.

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

## Pending Schema Items (not yet added)
customers.business_unit  -- add: B2B_DC | B2B_PROJECT | B2C | MANUFACTURING

products table           -- product master with SKU, margin, qty_sold

projects table           -- B2B project milestone tracking (confirm if MVP)
