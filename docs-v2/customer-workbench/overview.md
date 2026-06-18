# customer-workbench/overview.md

## Purpose
Mikro -- "Siapa yang beli?". Segmentasi customer, target ekspansi/upsell, pencegahan churn.

## Pages

### 2.1 Customer 360 & Segmentation -- route /customer-360
Status: belum dibangun (New)
Master table semua customer + filter business_unit
Butuh: field customers.business_unit (lihat shared/data-model.md Pending Schema Items) + endpoint customer 360 (lihat api.md)
Kolom yang diharapkan: customer_code, customer_name, business_unit, last_invoice_date, status (aktif/dormant), category_count, lifetime_value (belum ada field-nya, lihat decisions.md)

### 2.2 Expansion & Upsell Targets -- route /expansion
Status: partial -- saat ini masih jadi bagian dari halaman CustomerMetrics, perlu dipisah
Isi: M3 Avg Revenue + M4 Avg GP analysis, fokus ke customer yang spending-nya naik (M7 Expansion Rate)
Action: split keluar dari CustomerMetrics, M5 High Margin pindah ke product-workbench 3.2 (lihat shared/decisions kalau ada, atau product-workbench/decisions.md)

### 2.3 Churn Risk & Dormant -- route /dormant-customer
Status: sudah dibangun (halaman DormantCustomer existing, tinggal pindah grouping)
Isi: M8 Dormant Rate + M9 Dormant Value + M10 Reactivation Rate

### 2.4 Cross-sell Opportunity Matrix -- route /cross-selling
Status: sudah dibangun (halaman CrossSelling existing, tinggal pindah grouping)
Isi: M1 Cross Selling Ratio + M1.1 Heatmap

## Reused Components (lihat shared/ui-patterns.md untuk detail prop)
| Page | Components |
|---|---|
| 2.1 Customer 360 | MUI X DataGrid (server-side pagination) -- belum ada chart khusus |
| 2.2 Expansion | ComboChartWidget (M3), BarChartWidget stacked (M4) |
| 2.3 Churn Risk | LineAlertWidget (M8), BarChartWidget horizontal (M9), BulletChartWidget (M10) |
| 2.4 Cross-sell Matrix | BarChartWidget grouped (M1), HeatmapWidget (M1.1) |

## Definisi metrik (M1, M3, M4, M7, M8, M9, M10) -> executive-dashboard/metrics.md
Jangan duplikasi rumus di sini -- definisi bisnis sumber tunggal tetap di metrics.md Group 1.

## Next Action (Phase 2 -- priority High, 2-3 minggu)
1. Tambahkan field customers.business_unit ke schema (prasyarat semua halaman di group ini)
2. Bangun 2.1 Customer 360 dari nol -- endpoint baru + DataGrid
3. Split CustomerMetrics jadi 2.2 (di sini) + 3.2 (product-workbench), lihat customer-workbench/decisions.md
4. Pindah routing 2.3 dan 2.4 ke struktur menu baru tanpa ubah logic
