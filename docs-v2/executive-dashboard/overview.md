# executive-dashboard/overview.md

## Purpose
Strategic overview -- 10 KPI utama holding company. Satu-satunya halaman Makro/Primary, sisanya (Customer/Product/Transaction Workbench) adalah Mikro drill-down.

## Page
1.1 Overview Dashboard -- route /dashboard

Status: sudah dibangun (frontend). Backend metrics belum ada.

## Layout
Baris 1: 10x StatCard (1 per metrik M1-M10) -- 2 kolom: teks kiri (title, value, badge perubahan, subtitle) + LineChart kanan simple no-axes
Baris 2+: 9 chart widget detail, mapping chart per metrik -> lihat metrics.md

## Filter Bar (wajib di halaman ini)
| Filter | Values | Status |
|---|---|---|
| company_id | per company atau "all" (holding view) | sudah ada |
| period_month | YYYY-MM | sudah ada |
| active_window | 3 / 6 / 12 bulan | sudah ada |
| business_unit | B2B_DC / B2B_PROJECT / B2C / MANUFACTURING / all | belum ada -- lihat Next Action |

## Data Source
GET /metrics/summary -- semua 10 metrik sekaligus, lihat api.md
Backend belum ada -- saat ini masih mock via MSW domain `dashboard` dan `metrics`

## Drill-down Links (belum dibuat, bagian dari Phase 1)
Setiap StatCard/chart sebaiknya punya link ke halaman Mikro terkait:
| Metrik di sini | Drill-down ke |
|---|---|
| M1 Cross Selling Ratio, M1.1 Heatmap | customer-workbench 2.4 Cross-sell Matrix |
| M2 Avg Category | product-workbench 3.3 Product Trend |
| M3 Avg Revenue, M4 Avg GP | customer-workbench 2.2 Expansion |
| M5 High Margin Penetration | product-workbench 3.2 High Margin Push List |
| M6 Repeat Order Rate | transaction-workbench 4.3 Repeat Order & Loyalty |
| M7 Expansion Rate | customer-workbench 2.2 Expansion |
| M8 Dormant Rate, M9 Dormant Value, M10 Reactivation | customer-workbench 2.3 Churn Risk |

## Next Action (Phase 1 -- priority tertinggi, sudah 75% jadi)
1. Tambahkan toggle filter business_unit ke halaman ini -- butuh field customers.business_unit (lihat shared/data-model.md Pending Schema Items)
2. Tambahkan drill-down link sesuai tabel di atas
3. Backend: implementasi GET /metrics/summary + 9 endpoint per-metrik, cache di metric_cache

## Reused Components
Semua 9 chart widget (lihat shared/ui-patterns.md) + StatCard -- 100% reusable, tidak perlu component baru untuk halaman ini.
