# executive-dashboard/api.md

> Base URL, format response, auth, CSRF, error codes umum -> shared/api-conventions.md
> Query param standar (company_id, period_month, active_window) -> shared/api-conventions.md

## GET /metrics/summary
🔒 [metrics:read]

Semua 10 metrik sekaligus -- untuk halaman /dashboard.

```json
{
  "data": {
    "cross_selling_ratio":     { "current_value": 22.5, "trend": "up" },
    "avg_category":            { "current_value": 1.8,  "trend": "up" },
    "avg_revenue":             { "current_value": 5500000, "trend": "stable" },
    "avg_gross_profit":        { "current_value": 1150000, "trend": "up" },
    "high_margin_penetration": { "current_value": 22.0, "trend": "up" },
    "repeat_order_rate":       { "current_value": 65.0, "trend": "stable" },
    "expansion_rate":          { "current_value": 40.0, "trend": "up" },
    "dormant_rate":            { "current_value": 12.7, "trend": "down" },
    "dormant_value_total":     { "current_value": 850000000, "trend": "down" },
    "reactivation_rate":       { "current_value": 20.0, "trend": "up" }
  }
}
```

## GET /metrics/cross-selling
🔒 [metrics:read] -- M1

Response shape standar (summary + monthly_trend) -> lihat metrics.md "Format Response API"

```json
{
  "data": {
    "metric": "cross_selling_ratio",
    "summary": { "current_value": 22.5, "previous_value": 20.0, "change_percent": 12.5, "trend": "up" },
    "monthly_trend": [
      { "month": "2024-01", "value": 20.0, "total_active": 100, "multi_product": 20 }
    ]
  }
}
```

## GET /metrics/cross-selling/detail
🔒 [metrics:read] -- M1.1 Heatmap detail per customer

Query tambahan: ?page=1&per_page=50&search=PT+ABC

```json
{
  "data": {
    "categories": ["Scanner", "Printer", "Label", "Ribbon", "POS"],
    "customers": [
      {
        "customer_code": "CUST-001", "customer_name": "PT ABC",
        "categories": { "Scanner": true, "Printer": true, "Label": true, "Ribbon": false, "POS": false },
        "category_count": 3
      }
    ]
  },
  "meta": { "page": 1, "per_page": 50, "total": 120 }
}
```

## Endpoint per-metrik lainnya (response shape sama dengan /metrics/cross-selling)
| Endpoint | Metrik |
|---|---|
| GET /metrics/avg-category | M2 |
| GET /metrics/avg-revenue | M3 |
| GET /metrics/avg-gross-profit | M4 |
| GET /metrics/high-margin-penetration | M5 |
| GET /metrics/repeat-order-rate | M6 |
| GET /metrics/expansion-rate | M7 |
| GET /metrics/dormant-rate | M8 |
| GET /metrics/dormant-value | M9 -- lihat shape khusus di bawah |
| GET /metrics/reactivation-rate | M10 |

Semua 🔒 [metrics:read]

## GET /metrics/dormant-value
🔒 [metrics:read] -- M9, shape beda karena output per-customer bukan trend bulanan

Query tambahan: ?page=1&per_page=50&sort_by=lost_value&sort_dir=desc

```json
{
  "data": [
    {
      "customer_code": "CUST-099", "customer_name": "PT ABC",
      "avg_monthly_revenue": 20000000,
      "dormant_months": 6,
      "estimated_lost_value": 120000000,
      "last_invoice_date": "2023-08-15"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 45 }
}
```
