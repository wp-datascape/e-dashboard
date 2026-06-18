# shared/api-conventions.md — API Conventions

## Base
URL    : http://localhost:3000/api/v1

Format : JSON

Auth   : JWT httpOnly cookie

CSRF   : X-CSRF-Token header required on ALL mutations (POST/PUT/PATCH/DELETE)

## Response Shapes
```json
// Success single
{ "message": "Success", "data": {} }

// Success paginated
{ "message": "Success", "data": [], "meta": { "page": 1, "per_page": 20, "total": 100 } }

// Error
{ "error": "ERROR_CODE", "message": "Human readable message" }
```

## Legend
-  Requires JWT auth cookie
-  Requires X-CSRF-Token header
- `[perm]` Required permission

## Metric Endpoints — Common Query Params
All `/metrics/*` endpoints accept:
| Param           | Type            | Notes                    |
|-----------------|-----------------|--------------------------|
| `company_id`    | integer \| "all"| "all" = holding view     |
| `period_month`  | string YYYY-MM  |                          |
| `active_window` | 3 \| 6 \| 12   | Months for active window |

## Metric Response Shape
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
    { "month": "2023-04", "value": 18.0 }
  ]
}
```

## Error Codes
| HTTP | Code                    | When                                      |
|------|-------------------------|-------------------------------------------|
| 400  | `VALIDATION_ERROR`      | Invalid input                             |
| 400  | `INVALID_FILE_FORMAT`   | Wrong format / missing columns            |
| 401  | `UNAUTHORIZED`          | Not logged in / token expired             |
| 403  | `FORBIDDEN`             | Missing permission                        |
| 403  | `COMPANY_ACCESS_DENIED` | No access to this company                 |
| 403  | `CSRF_INVALID`          | Invalid CSRF token                        |
| 403  | `SYSTEM_RESOURCE`       | Attempt to delete is_system role/perm     |
| 404  | `NOT_FOUND`             | Resource not found                        |
| 409  | `DUPLICATE_IMPORT`      | Period already imported                   |
| 413  | `FILE_TOO_LARGE`        | File exceeds 10MB                         |
| 422  | `IMPORT_PROCESSING_ERROR` | Valid file but processing error         |
| 429  | `RATE_LIMITED`          | Too many requests                         |
| 502  | `ACCURATE_API_ERROR`    | Cannot reach Accurate Online              |
| 500  | `INTERNAL_ERROR`        | Server error                              |

## Auth Endpoints
POST /auth/login             → sets httpOnly cookie, returns csrf_token + user

POST /auth/logout   

POST /auth/refresh        → returns new csrf_token + permissions[]

Login response includes `permissions[]` — frontend uses this for access control without extra requests.

## Import Endpoints
POST /import/file       [import:write]   multipart/form-data: file, company_id, period_month

POST /import/accurate   [import:write]   body: { company_id, period_month }

GET  /import/logs            [import:read]   ?company_id&page&per_page

GET  /import/logs/:id/errors  [import:read]

## Config Endpoints
GET /config            [config:read]    — is_secret values masked as "***"

PUT /config/:key       [config:write]  body: { value, company_id }

GET /product-categories      [config:read]   ?company_id

PUT /product-categories/:id  [config:write] body: { is_high_margin, is_service }

## Audit Log
GET /audit-logs  [roles:manage]  ?company_id&action&actor_id&page&per_page
