# CLAUDE.md — Entry Point AI Agent

## Project Snapshot
Name     : Executive Dashboard — Holding Company

Purpose  : Business stats dashboard for 3-entity holding company

Backend  : Bun + Hono v4 + Drizzle ORM → PostgreSQL 15

Frontend : React 19 + Vite 8 + TypeScript 6 + MUI v9 (SPA)

Auth     : JWT httpOnly Cookie + CSRF (dev: localStorage + MSW)

Status   : Frontend ~96% | Backend ~72%

## Read Order
1. `CRITICAL_RULES.md` — hard constraints, tech stack, conventions
2. `CURRENT_STATE.md` — what's done, what's next, blockers
3. Module docs based on task:

| Working on...         | Read                                    |
|-----------------------|-----------------------------------------|
| Any feature           | `shared/architecture.md`               |
| Backend code          | `shared/backend.md` ⚠️ REQUIRED        |
| DB schema / migration | `shared/data-model.md`                 |
| API endpoint          | `shared/api-conventions.md`            |
| UI component          | `shared/ui-patterns.md`                |
| Metrics (M1–M10)      | `executive-dashboard/metrics.md` ⚠️ REQUIRED |
| Dashboard page        | `executive-dashboard/overview.md`      |
| Customer Workbench    | `customer-workbench/overview.md`       |
| Product Workbench     | `product-workbench/overview.md`        |
| Transaction Workbench | `transaction-workbench/overview.md`    |
| Admin pages           | `admin/overview.md`                    |
| Companies feature     | `features/companies.md`                |
| Customers feature     | `features/customers.md`                |
| Roles feature         | `features/roles.md`                    |
| Permissions feature   | `features/permissions.md`              |
| Users feature         | `features/users.md`                    |
| Page Settings feature | `features/page-settings.md`            |

## Core Business Flow
Admin imports invoices (CSV/Excel upload OR Accurate API fetch)

→ Parse + validate + deduplicate (invoice_number + company_id)

→ Store → invoices (header) + invoice_items (N rows per invoice)

→ Upsert master: customers, product_categories

→ Compute 10 metrics on-demand + cache (metric_cache table)

→ Executives/Managers view dashboard (filter: entity, period, active_window)

## Menu Architecture (Finalized 2026-06-17)
Group 1: Executive Dashboard  ← Makro / Primary (10 KPIs)

Group 2: Customer Workbench   ← Mikro: Who buys?

Group 3: Product Workbench    ← Mikro: What sells?

Group 4: Transaction Workbench← Mikro: When/how?

Group 5: Admin                ← System operations

## Key Constraints (details in CRITICAL_RULES.md)
- Stack is LOCKED — no Prisma, Express, Tailwind, Redux, shadcn
- All metrics calculated backend-only, cached in `metric_cache`
- Every query MUST filter `company_id`
- CSRF token required on all mutations
- No hard-delete on invoice data (soft delete only)
