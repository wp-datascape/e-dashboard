# executive-dashboard/metrics.md — Definisi Bisnis 10 Metrik

> WAJIB dibaca sebelum mengerjakan fitur kalkulasi metrik apapun. Sumber kebenaran tunggal untuk definisi bisnis.

## Parameter Global (semua metrik)
| Param | Tipe | Ket |
|---|---|---|
| company_id | integer \| "all" | "all" = holding view |
| period_month | string YYYY-MM | bulan referensi |
| active_window | 3 \| 6 \| 12 | window klasifikasi customer aktif (bulan) |

## Definisi Kunci (global)
Customer Aktif: last_transaction_date >= (awal period_month - active_window bulan)

Existing Customer: first_transaction_date < awal period_month

New Customer: first_transaction_date jatuh di dalam period_month

Dormant Customer: last_transaction_date < (awal period_month - dormant_threshold_months). Threshold dari app_configs.dormant_threshold_months, default 3

Kategori Produk: hanya hardware + consumable, jasa/service tidak dihitung

High Margin Product: product_categories.is_high_margin = true, diset dari app_configs.high_margin_category_ids

Periode Sebelumnya: period_month - 1 bulan

## M1 — Cross Selling Ratio
Rumus: Customer beli >1 kategori di period / Total Customer Aktif

Customer beli >1 kategori: minimal 2 product_category_id berbeda dalam period_month, kategori service dikecualikan

Chart: BarChartWidget (grouped) di /cross-selling. Detail per-customer (1.1): HeatmapWidget, kolom = kategori, nilai = Ya/Tidak

```sql
SELECT customer_id, COUNT(DISTINCT product_category_id) as cat_count
FROM transactions
WHERE company_id = :company_id
  AND invoice_date BETWEEN :period_start AND :period_end
  AND product_category_id IN (SELECT id FROM product_categories WHERE is_service = false)
GROUP BY customer_id
HAVING COUNT(DISTINCT product_category_id) > 1
```

## M2 — Average Product Category per Customer
Rumus: Total kategori unik terjual di period / Total Customer Aktif

Kategori unik: COUNT(DISTINCT product_category_id) dari semua transaksi di period_month, service dikecualikan. Semakin tinggi semakin baik.

Chart: AreaChartWidget (color hijau #16a34a) di /cross-selling

## M3 — Average Revenue per Existing Customer
Rumus: Total revenue existing customer di period / Jumlah existing customer yang transaksi di period

Scope: semua produk + jasa, tidak difilter kategori. Semakin tinggi semakin baik.

Chart: ComboChartWidget di /customer-metrics

## M4 — Average Gross Profit per Existing Customer
Rumus: Total gross_profit existing customer di period / Jumlah existing customer (sama dengan M3, kolom beda)

Chart: BarChartWidget (stacked, 3 tier) di /customer-metrics

## M5 — High Margin Product Penetration
Rumus: Existing customer aktif yang beli produk high margin di period / Total existing customer aktif

Minimal 1 transaksi produk high margin di period_month. Semakin tinggi semakin baik.

Chart: DonutChartWidget (snapshot bulan ini) di /customer-metrics

## M6 — Repeat Order Rate
Rumus: Existing customer aktif yang transaksi di period / Total existing customer aktif

Chart: RadialBarWidget — hijau jika >= 80%, kuning/merah jika < 80% — di /customer-metrics

## M7 — Customer Expansion Rate
Rumus: Existing customer aktif dengan total spending naik vs period sebelumnya / Total existing customer aktif

Spending naik: SUM(revenue) period_month > SUM(revenue) period_month-1. Hanya hitung customer yang transaksi di KEDUA periode.

Edge case: customer yang hanya transaksi di period ini saja (tidak ada di period sebelumnya) tidak dihitung. Customer baru tidak masuk hitungan.

Chart: BarChartWidget (100% stacked horizontal) di /customer-metrics

## M8 — Dormant Customer Rate
Rumus: Jumlah existing customer dormant / Total existing customer (tanpa filter active_window)

Dormant: last_transaction_date < (awal period_month - dormant_threshold_months). Semakin rendah semakin baik, ideal < 10%.

Chart: LineAlertWidget (threshold 10%) di /dormant-customer

## M9 — Dormant Customer Value
Rumus per customer: AVG monthly revenue (histori sebelum dormant) x Jumlah bulan dormant

Jumlah bulan dormant: selisih bulan antara last_transaction_date dan period_month referensi. Output: daftar customer dormant + estimasi value hilang. Catatan: ini estimasi potensi, bukan kerugian aktual.

Chart: BarChartWidget (horizontal ranking, sorted desc) di /dormant-customer

## M10 — Customer Reactivation Rate
Rumus: Customer dormant (period sebelumnya) yang kembali transaksi di period ini / Total customer dormant period sebelumnya

Target tahunan minimum: 15-20%

Chart: BulletChartWidget (target band 15-20%) di /dormant-customer

## Format Response API (semua metrik dengan tren bulanan)
```json
{
  "metric": "cross_selling_ratio",
  "company_id": 1,
  "period_month": "2024-03",
  "active_window": 6,
  "summary": {
    "current_value": 22.5,
    "previous_value": 20.0,
    "change_percent": 12.5,
    "trend": "up"
  },
  "monthly_trend": [
    { "month": "2023-04", "value": 18.0, "total_active": 95, "multi_product": 17 }
  ]
}
```
trend: "up" | "down" | "stable". monthly_trend: 12 bulan ke belakang dari period_month.

## Format Kolom CSV/Excel Sumber (Accurate Online)
| Kolom | Tipe | Ket |
|---|---|---|
| invoice_number | string | unik |
| invoice_date | date DD/MM/YYYY | |
| customer_code | string | |
| customer_name | string | |
| product_category | string | |
| revenue | number | tanpa titik, koma desimal |
| gross_profit | number | |

Jika format Accurate berubah, mapping dilakukan di utils/parser.ts — jangan ubah nama kolom internal.
