# CURRENT_STATE.md — Status Pengerjaan

> Update file ini setiap sesi kerja selesai.

## Overall Progress
| Layer    | Status | Notes                          |
|----------|--------|--------------------------------|
| Frontend | ~75%   | Core pages done, Admin pending |
| Backend  | 0%     | Not started                    |
| Database | 0%     | Schema designed, not migrated  |
| Docs     | 100%   | docs-v2 refactor selesai semua 23 file |

## Frontend — Page Status

### Done
| Page             | Route               | Notes                        |
|------------------|---------------------|------------------------------|
| Dashboard        | `/dashboard`        | 10 MetricCards + 9 charts    |
| Cross Selling    | `/cross-selling`    | M1 ratio + M1.1 heatmap + M2 |
| Customer Metrics | `/customer-metrics` | M3 M4 M5 M6 M7               |
| Dormant Customer | `/dormant-customer` | M8 M9 M10                    |

### Partial / Needs Refactor
| Page             | Issue                                           |
|------------------|-------------------------------------------------|
| Customer Metrics | Split into: 2.2 Expansion + 3.2 High Margin     |

### Not Built
| Page                        | Group | Priority |
|-----------------------------|-------|----------|
| Customer 360 & Segmentation | 2.1   | High     |
| Expansion & Upsell Targets  | 2.2   | High (split dari CustomerMetrics) |
| Product Performance Ledger  | 3.1   | Blocked (lihat product-workbench/decisions.md) |
| High Margin Push List       | 3.2   | Medium (split dari CustomerMetrics) |
| Product Trend & Velocity    | 3.3   | Medium (reuse M2 chart) |
| Dormant Product / Dead Stock| 3.4   | Blocked (scope belum final) |
| B2B DC & B2C Order Ledger   | 4.1   | Medium   |
| B2B Project Milestone       | 4.2   | Low* (open decision: MVP or v2) |
| Repeat Order & Loyalty      | 4.3   | Medium (reuse M6 chart)   |
| Import UI                   | 5.1   | High     |
| Users Management            | 5.2   | High     |
| RBAC Management             | 5.3   | High     |
| Config UI                   | 5.4   | Medium   |
| Audit Log Viewer            | 5.5   | Medium   |

*4.2 B2B Project: high complexity — konfirmasi dulu apakah masuk MVP sebelum mulai

## Frontend — Components Available (Reusable)
| Component          | Type                        | Used in              |
|--------------------|-----------------------------|----------------------|
| `StatCard`         | Simple line (no axes)       | Dashboard M1-M10     |
| `AreaChartWidget`  | Multi-series area           | M2                   |
| `BarChartWidget`   | Grouped/stacked/horizontal  | M1 M4 M7 M9          |
| `HeatmapWidget`    | CSS grid matrix             | M1.1                 |
| `ComboChartWidget` | Bar+Line dual-Y             | M3                   |
| `DonutChartWidget` | Pie with innerRadius        | M5                   |
| `RadialBarWidget`  | Ring progress               | M6                   |
| `LineAlertWidget`  | Line + ReferenceArea        | M8                   |
| `BulletChartWidget`| Custom CSS bullet           | M10                  |
| `DataTable`        | MUI X DataGrid wrapper      | Cross-selling detail |

## Backend — Status
Nothing built. Start with:
1. DB schema + migrations (`shared/data-model.md`)
2. Auth + RBAC endpoints (`admin/api.md`)
3. Import endpoints (`admin/api.md`)
4. Metrics endpoints (`executive-dashboard/api.md`)
5. Customer 360 endpoint (`customer-workbench/api.md`)
6. Invoice ledger endpoint (`transaction-workbench/api.md`)

## Docs v2 — Status (SELESAI 2026-06-18)
| File | Status |
|------|--------|
| CLAUDE.md | Done |
| CRITICAL_RULES.md | Done |
| CURRENT_STATE.md | Done (file ini) |
| shared/architecture.md | Done |
| shared/data-model.md | Done |
| shared/api-conventions.md | Done |
| shared/ui-patterns.md | Done |
| executive-dashboard/overview.md | Done |
| executive-dashboard/metrics.md | Done |
| executive-dashboard/api.md | Done |
| executive-dashboard/decisions.md | Done |
| customer-workbench/overview.md | Done |
| customer-workbench/api.md | Done |
| customer-workbench/decisions.md | Done |
| product-workbench/overview.md | Done |
| product-workbench/api.md | Done |
| product-workbench/decisions.md | Done |
| transaction-workbench/overview.md | Done |
| transaction-workbench/api.md | Done |
| transaction-workbench/decisions.md | Done |
| admin/overview.md | Done |
| admin/api.md | Done |
| admin/decisions.md | Done |

## Current MSW Mock Domains (DEV)
- `auth` — login, logout, refresh, /me
- `page` — page ready flags
- `dashboard` — metrics summary
- `metrics` — per-metric endpoints

## Known Blockers / Decisions Pending
| Blocker                              | Owner    | Status  | Detail |
|--------------------------------------|----------|---------|--------|
| `business_unit` field di customers   | Dev      | Todo    | Blocker untuk 2.1, 4.1 BU filter |
| `products` master table              | PM/Dev   | Pending | Konfirmasi Accurate punya SKU/qty? |
| `projects` table (B2B Project BU)    | PM/Dev   | Pending | 4.2 masuk MVP atau v2? |
| Split CustomerMetrics: alokasi kolom | Dev      | Todo    | customer-workbench/decisions.md #1 |
| Scope 3.3: M2 saja atau agregasi baru| Dev      | Todo    | product-workbench/decisions.md #2 |
| Scope 3.4: "kategori dormant" bukan "dead stock" | PM | Pending | product-workbench/decisions.md #3 |
| Accurate API key: per-company vs global | PM    | Pending | admin/decisions.md #1 |
| Import preview step (Opsi A vs B)    | PM/Dev   | Pending | admin/decisions.md #3 |
| Audit log permission: roles:manage atau audit:read | PM | Pending | admin/decisions.md #2 |

## Next Actions (Priority Order)
1. Konfirmasi keputusan terbuka di tabel blocker bersama PM/stakeholder
2. Tambah `customers.business_unit` ke schema — unblock 2.1, 4.1, dan BU filter semua halaman
3. Build DB schema + migrations (`shared/data-model.md`)
4. Build Auth + RBAC backend
5. Build Import backend (file + Accurate API)
6. Build Import UI (5.1) — unblock pengisian data
7. Build Metrics backend (M1-M10)
8. Build Customer 360 page (2.1)
9. Split CustomerMetrics → 2.2 Expansion + 3.2 High Margin

## Page → New Structure Mapping
| Current Page     | New Location              | Action          |
|------------------|---------------------------|-----------------|
| Dashboard        | Group 1.1 Overview        | Add BU filter   |
| CrossSelling     | Group 2.4 Cross-sell Matrix | Keep as-is    |
| CustomerMetrics  | Group 2.2 + Group 3.2     | Split into 2    |
| DormantCustomer  | Group 2.3 Churn Risk      | Keep as-is      |
| Import           | Group 5.1                 | Build UI        |
| Users            | Group 5.2                 | Build UI        |
| RBAC             | Group 5.3                 | Build UI        |
| Config           | Group 5.4                 | Build UI        |
| AuditLog         | Group 5.5                 | Build UI        |

## Catatan Sesi Terakhir
2026-06-18: Refactor dokumentasi docs-v2 selesai. Semua 23 file sudah lengkap. Konten bersumber dari docs/backup/ (AI_AGENT_GUIDE, API_SPEC, FINALIZED_MENU_STRUCTURE, METRICS_SPEC, DATA_MODEL, ARCHITECTURE) yang direfactor menjadi struktur modular per-domain. File-file yang sebelumnya kosong (product-workbench/api.md, product-workbench/decisions.md, transaction-workbench/*, admin/*) sudah diisi. Anti-pattern dari AI_AGENT_GUIDE.md sudah ada di shared/ui-patterns.md.
