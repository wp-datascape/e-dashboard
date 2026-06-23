# Feature: Accurate Online API Integration

> Status: ✅ Complete — Credentials management + test connection working
> Last updated: 2026-06-24

---

## Overview

Accurate Online API integration memungkinkan aplikasi untuk:
1. **Autentikasi** ke Accurate Online API menggunakan API Token
2. **Fetch invoice data** otomatis dari Accurate sesuai periode
3. **Validate connection** sebelum menyimpan credentials
4. **Encrypt credentials** di database (AES-256-GCM)

---

## Architecture

```
Frontend (IntegrationTab)
  ↓
API Layer (src/api/accurate.api.ts)
  ↓
Backend Service (src/features/config/accurate.service.ts)
  ↓
Repository (src/features/config/accurate.repository.ts)
  ↓
Database (accurate_credentials table)
```

---

## Database Schema — accurate_credentials

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | Primary Key |
| `branch_id` | integer | FK → company_branches (unique) |
| `auth_method` | varchar(20) | 'api_token' \| 'oauth' (default: api_token) |
| `api_token` | text | Encrypted — JWT multi-part token (LONG) |
| `signature_secret` | text | Encrypted — HMAC signing key (LONG) |
| `subdomain` | varchar(100) | e.g. 'odin' from 'odin.accurate.id' |
| `company_db_id` | varchar(100) | Accurate Online internal DB ID (nullable) |
| `client_id` | varchar(255) | OAuth method (nullable) |
| `client_secret` | text | OAuth method (nullable) |
| `callback_url` | varchar(500) | OAuth method (nullable) |
| `access_token` | text | OAuth method (nullable) |
| `refresh_token` | text | OAuth method (nullable) |
| `token_expires_at` | timestamp | OAuth method (nullable) |
| `is_active` | boolean | Enable/disable this credential |
| `created_at` | timestamp | CreatedAt |
| `updated_at` | timestamp | UpdatedAt |

**Schema Fix (2026-06-24):**
- Changed `api_token`, `signature_secret`, `client_secret`, `access_token`, `refresh_token` from `varchar` → `text`
- Reason: Accurate token sangat panjang (JWT) + AES encryption → overflow varchar(500)
- Migration: `0004_accurate_credentials_text.sql`

---

## API Endpoints

### `GET /api/v1/config/accurate/credentials/:branchId`

Retrieve stored credentials untuk branch tertentu.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "branch_id": 5,
    "auth_method": "api_token",
    "subdomain": "odin",
    "is_active": true,
    "created_at": "2026-06-24T03:40:00Z",
    "updated_at": "2026-06-24T03:40:00Z"
  }
}
```

**Response 404:** Belum ada credentials untuk branch ini.

---

### `PUT /api/v1/config/accurate/credentials/:branchId`

Simpan atau update credentials untuk branch.

**Request body:**
```json
{
  "auth_method": "api_token",
  "subdomain": "odin",
  "api_token": "aat.MTAw.eyJ...",
  "signature_secret": "...",
  "is_active": true
}
```

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "branch_id": 5,
    "auth_method": "api_token",
    "subdomain": "odin",
    "is_active": true,
    "created_at": "2026-06-24T03:40:00Z",
    "updated_at": "2026-06-24T03:40:00Z"
  }
}
```

**Error Handling:**
- Validation: `branch_id` required (dari route param)
- Database: Payload langsung enkripsi sebelum insert/update
- Logging: Error 5xx logged ke file + stack trace

---

### `POST /api/v1/config/accurate/test-connection`

Test koneksi ke Accurate Online API menggunakan provided credentials.

**Request body:**
```json
{
  "subdomain": "odin",
  "api_token": "aat.MTAw.eyJ...",
  "signature_secret": "..."
}
```

**Flow:**

```
POST /api/v1/config/accurate/test-connection
  → Backend testConnection()
    → POST https://account.accurate.id/api/api-token.do
      Headers:
        Authorization: Bearer {api_token}
        X-Api-Timestamp: {dd/mm/yyyy hh:mm:ss}
        X-Api-Signature: HMAC-SHA256(timestamp, signature_secret) → Base64
    → Response: { database: { host, alias, id }, application, user }
  → Return: { database: { host, alias, id }, application, user }
```

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "database": {
      "host": "https://odin.accurate.id",
      "alias": "Sandbox",
      "id": "2704558"
    },
    "application": "Accurate Business",
    "user": "admin"
  }
}
```

**Error Handling:**
- Network timeout: 15s (axios timeout)
- Invalid token: Accurate API returns 401
- Invalid signature: HMAC mismatch → API returns 403

---

## Encryption — AES-256-GCM

All sensitive fields (`api_token`, `signature_secret`, `client_secret`, etc.) are encrypted before DB insert using AES-256-GCM.

**Encryption Function:** `src/utils/crypto.ts`

```typescript
export function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string }
export function decrypt(encrypted: { ciphertext: string; iv: string; tag: string }): string
```

**Key Source:** `process.env.CREDENTIALS_ENCRYPTION_KEY` (32-byte base64)

---

## File Structure

```
backend/src/features/config/
├── accurate.schema.ts              — Zod schemas for validation
├── accurate.repository.ts          — DB queries (insert, update, select)
├── accurate.service.ts             — Business logic (test connection, save)
├── config.route.ts                 — HTTP route handler + error logging

backend/src/utils/
├── crypto.ts                       — AES-256-GCM encrypt/decrypt
├── accurate.ts                     — Accurate API client (deprecated, use service)

frontend/src/
├── api/accurate.api.ts             — Axios wrapper
├── hooks/useAccurate.ts            — TanStack Query hooks
├── types/accurate.ts               — TypeScript types
├── pages/Config/components/
│   └── IntegrationTab.tsx          — UI component
├── mocks/handlers/accurate.handler.ts  — MSW mock handlers
```

---

## Migration History

| Migration | Change | Status |
|-----------|--------|--------|
| `0003_accurate_credentials_sig.sql` | Initial schema + signature_secret | Applied |
| `0004_accurate_credentials_text.sql` | varchar → text for long tokens | Pending |

Run migration:
```bash
make db-migrate
```

---

## Error Handling

### Logger Integration (2026-06-24)

Error logging added untuk `PUT /config/accurate/credentials/:branchId`:

```typescript
try {
  // validate + save
} catch (err) {
  const { AppError } = await import('@/errors/AppError')
  const is4xxAppError = err instanceof AppError && err.statusCode < 500
  if (!is4xxAppError) {
    logger.error('[config] Failed to save accurate credentials', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
  throw err
}
```

**Logging Rules:**
- 5xx errors → logged to file (`backend/log/error/YYYY-MM-DD.log`)
- 4xx errors (validation, not found) → NOT logged (operational, expected)
- Stack trace included for 5xx only

---

## Testing

### Mock Handler (Frontend)

`frontend/src/mocks/handlers/accurate.handler.ts` provides mock responses untuk:
- `GET /api/v1/config/accurate/credentials/:branchId`
- `PUT /api/v1/config/accurate/credentials/:branchId`
- `POST /api/v1/config/accurate/test-connection`

### Backend Test Script

`backend/scripts/test-accurate.ts` — standalone test untuk API Token validation:

```bash
ACCURATE_SIGNATURE_SECRET='...' ACCURATE_API_TOKEN='aat...' bun run backend/scripts/test-accurate.ts
```

---

## Security Checklist

- ✅ API token encrypted di DB (AES-256-GCM)
- ✅ Signature secret encrypted di DB
- ✅ Token TIDAK di-log ke console (redacted)
- ✅ Token TIDAK dikirim ke frontend (hanya metadata)
- ✅ HMAC-SHA256 untuk request signing (sesuai Accurate spec)
- ✅ 15s timeout untuk network requests (circuit breaker)

---

## References

- **Accurate Online API Docs**: `docs-v2/admin/accurate-api-docs.md`
- **Accurate API Swagger**: `docs-v2/admin/accurate-api-swagger.yaml`
- **Backend Service**: `backend/src/features/config/accurate.service.ts`
- **Frontend Component**: `frontend/src/pages/Config/components/IntegrationTab.tsx`

---

**Last Updated**: 2026-06-24
**Status**: ✅ Production Ready