# shared/api-conventions.md — API Conventions

## Base
URL    : http://localhost:3000/api/v1

Format : JSON

Auth   : JWT httpOnly cookie

CSRF   : X-CSRF-Token header required on ALL mutations (POST/PUT/PATCH/DELETE)

## API Documentation
`backend/src/docs/openapi.yaml` ditulis **manual** (bukan auto-generate), di-serve via Swagger UI di `/api/v1/docs` (mati kalau `NODE_ENV=production`). Auto-generate dari Zod schema (`hono-openapi`+`zod-openapi`) sempat dicoba lalu di-rollback — peer-dependency `zod-openapi` v6 butuh Zod v4, project masih Zod v3, dan `validator()` middleware-nya tidak bisa dibuat read-only khusus docs. Kalau nambah endpoint baru: update `openapi.yaml` manual juga, tidak otomatis sinkron dari Zod. Detail: `features/api-docs.md`.

## Pagination Query Standard
All list endpoints use consistent query params:
```
?page=1&per_page=20&sort=created_at:desc
```
| Param      | Default | Notes                            |
|------------|---------|----------------------------------|
| `page`     | 1       | 1-based                          |
| `per_page` | 20      | Max 100                          |
| `sort`     | varies  | Format: `field:asc` or `field:desc` |

Always parse + validate these via a shared utility (`utils/validator` or dedicated query parser helper) — never parse raw query strings directly in handlers.

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
| 400  | `INVALID_REFERENCE`     | Referenced ID does not exist              |
| 401  | `UNAUTHORIZED`          | Not logged in / token expired             |
| 403  | `FORBIDDEN`             | Missing permission                        |
| 403  | `COMPANY_ACCESS_DENIED` | No access to this company                 |
| 403  | `CSRF_INVALID`          | Invalid CSRF token                        |
| 403  | `SYSTEM_RESOURCE`       | Attempt to delete is_system role/perm     |
| 404  | `NOT_FOUND`             | Resource not found                        |
| 409  | `DUPLICATE_IMPORT`      | Period already imported                   |
| 409  | `DUPLICATE_ENTRY`       | Unique constraint violation (non-import)  |
| 413  | `FILE_TOO_LARGE`        | File exceeds 10MB                         |
| 422  | `IMPORT_PROCESSING_ERROR` | Valid file but processing error         |
| 429  | `RATE_LIMITED`          | Too many requests                         |
| 502  | `ACCURATE_API_ERROR`    | Cannot reach Accurate Online              |
| 500  | `INTERNAL_ERROR`        | Unhandled server error                    |

### ⚠️ Error `message` TIDAK di-i18n — jangan pernah render langsung ke UI
`message` di response error ditulis manual di tiap `AppError(...)` (backend), sebagian besar bahasa Indonesia hardcoded, dan **tidak diterjemahkan**. Anggap field ini log/debug-only, bukan untuk ditampilkan ke user.

Frontend **wajib** resolve error lewat field `error` (kode di atas), bukan `message`:
```typescript
import { getApiErrorMessage } from '@/utils/apiError'

// err = ApiError { error: 'NOT_FOUND', message: 'Rule tidak ditemukan' }
const shown = getApiErrorMessage(err, t) // → t('error.codes.NOT_FOUND'), ikut bahasa aktif
```
`getApiErrorMessage` lookup `error.codes.<CODE>` di `i18n/locales/{en,id}/error.json`, fallback ke `error.generic` kalau code tidak dikenali. Tambahkan entry baru ke `error.codes` di **kedua** file locale setiap kali ada `ErrorCode` baru di backend (`backend/src/errors/AppError.ts`) — dan sinkronkan juga union type `ErrorCodeType` di `frontend/src/types/api.ts`.

Pengecualian: `Login` page tidak pakai `getApiErrorMessage` untuk error 401 — semua kegagalan login cuma berarti "email/password salah", jadi dipakai copy statis `auth.loginFailedMessage` (kode `UNAUTHORIZED` generik-nya kurang pas untuk konteks halaman login).
| 500  | `INTERNAL_ERROR`        | Server error                              |

## Auth Endpoints
POST /auth/login             → sets httpOnly cookie, returns csrf_token + user

POST /auth/logout   

POST /auth/refresh        → returns new csrf_token + permissions[]

Login response includes `permissions[]` — frontend uses this for access control without extra requests.

## Import Endpoints (path & permission aktual — `backend/src/features/import/import.route.ts`)
> Contoh di bawah versi lama dokumen ini pakai format permission `import:write`/`import:read` — **sudah tidak akurat**, skema permission sekarang dot-notation (lihat `features/permissions.md`). Endpoint asli:

GET  /import/template     `[config.import:view]`    download template XLSX faktur

POST /import/csv          `[config.import:import]`  multipart/form-data: file, company_id

POST /import/csv/stream   `[config.import:import]`  sama seperti /csv, SSE progress streaming

GET  /import/logs         `[config.import:view]`    ?company_id&page&per_page

GET  /import/logs/:id     `[config.import:view]`    detail + error rows

## Config Endpoints
> Endpoint di bawah **belum diverifikasi ulang path-nya** terhadap kode (butuh cek `backend/src/features/config/config.route.ts`) — anggap ilustratif, cek `features/config-page.md` untuk yang otoritatif.

GET /config            `[settings.threshold:view]` (bukan `config:read` generik — permission per-key, lihat `features/permissions.md`)

PUT /config/:key       `[settings.threshold:update]`

## Audit Log
GET /audit-logs  [roles:manage]  ?company_id&action&actor_id&page&per_page
