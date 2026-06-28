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

## GET /metrics/customer-metrics
🔒 [metrics:read] — M3–M7 sekaligus (live, real DB)

Query: `?company_id=1|"all"&period_month=YYYY-MM&division=distribution|...`

```json
{
  "data": {
    "trend": [
      {
        "month": "2026-06",
        "existing_customers": 346,
        "active_count": 160,
        "avg_revenue": 5200000,
        "avg_gp": 1100000,
        "repeat_order_rate": 39.0,
        "expansion_rate": 39.0,
        "up_rate": 39.0,
        "flat_down_rate": 61.0,
        "hm_pct": 22.0,
        "gp_tier1": 450000000, "gp_tier2": 200000000, "gp_tier3": 80000000,
        "top_customer_id": 12, "top_customer_name": "PT ABC",
        "top_customer_revenue": 95000000, "top_customer_pct": 18.2,
        "top_gp_customer_id": 7, "top_gp_customer_name": "CV XYZ",
        "top_gp_revenue": 30000000, "top_gp_pct": 15.1,
        "median_revenue": 3200000
      }
    ],
    "repeat_order_current": {
      "value": 39.0,
      "target_pct": 80
    }
  }
}
```

## GET /metrics/ror-breakdown
🔒 [metrics:read] — M6 drill-down: daftar existing customer dengan >1 order dalam active window

Query: `?company_id=1|"all"&month=YYYY-MM&division=...`

```json
{
  "data": {
    "month": "2026-06",
    "repeat_count": 62,
    "total_existing": 346,
    "rows": [
      {
        "ranking": 1,
        "customer_name": "PT SUMBER MAKMUR",
        "customer_code": "SM-001",
        "invoice_count": 15,
        "total_revenue": 95000000
      }
    ]
  }
}
```

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
