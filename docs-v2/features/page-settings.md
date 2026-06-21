# Feature: Page Settings

> **Status**: ✅ Complete — Backend API live, Frontend migrated to real data
> **Last updated**: 2026-06-21
> **Implemented by**: Cline AI Agent

---

## Overview

**Page Settings** feature manages which pages are ready for production use in the dashboard application.

**Purpose**:
- Frontend checks page readiness before rendering content
- Admin can toggle page availability without code changes
- Data persisted in PostgreSQL (not dependent on MSW mock server)
- Supports future enhancements: feature flags, A/B testing, gradual rollouts

---

## File Structure

```
Backend (src/features/page/):
├── page.schema.ts      — Zod validation schemas
├── page.repository.ts  — Drizzle ORM queries
├── page.service.ts     — Business logic + audit logging
└── page.route.ts       — HTTP route handlers

Database (src/db/schema/):
└── page_settings.ts    — PostgreSQL table definition

Seed (src/db/):
└── seed.ts             — Initial 15 page settings

Frontend (src/mocks/):
└── handlers.ts         — DISABLED pageHandlers (using real API)
```

---

## API Endpoints

**Base URL**: `http://localhost:3000/api/v1`

### GET /page-settings

List all page readiness flags.

**Permission**: None (public)

**Query Parameters**: None

**Response 200**:
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "pageKey": "dashboard",
      "ready": true,
      "createdAt": "2026-06-21T08:00:00Z",
      "updatedAt": "2026-06-21T08:00:00Z"
    },
    {
      "id": 2,
      "pageKey": "users",
      "ready": true,
      "createdAt": "2026-06-21T08:00:00Z",
      "updatedAt": "2026-06-21T08:00:00Z"
    },
    ...
  ]
}
```

---

### PUT /page-settings/:pageKey

Update page readiness flag.

**Permission**: `config:write` (admin only) — future enhancement

**Path Parameters**:
- `pageKey` (string) — e.g., "users", "import", "dashboard"

**Request Body**:
```json
{
  "ready": false
}
```

**Response 200**:
```json
{
  "message": "Success",
  "data": {
    "id": 2,
    "pageKey": "users",
    "ready": false,
    "createdAt": "2026-06-21T08:00:00Z",
    "updatedAt": "2026-06-21T10:15:00Z"
  }
}
```

**Error 404**:
```json
{
  "error": "NOT_FOUND",
  "message": "Page not found"
}
```

---

## Database Schema

### Table: page_settings

```sql
CREATE TABLE page_settings (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(100) UNIQUE NOT NULL,
  ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id` — Auto-incrementing primary key
- `pageKey` — Unique identifier (e.g., "dashboard", "users")
- `ready` — Boolean flag: is page ready for production?
- `createdAt` — Record creation timestamp
- `updatedAt` — Record last update timestamp

---

## Seed Data (15 Pages)

```typescript
[
  { pageKey: 'dashboard', ready: true },
  { pageKey: 'customers', ready: true },
  { pageKey: 'customers-expansion', ready: true },
  { pageKey: 'dormant-customer', ready: true },
  { pageKey: 'cross-selling', ready: true },
  { pageKey: 'products', ready: true },
  { pageKey: 'products-high-margin', ready: true },
  { pageKey: 'products-trend', ready: true },
  { pageKey: 'transactions', ready: true },
  { pageKey: 'projects', ready: false },         // ← Blocked (pending MVP decision)
  { pageKey: 'import', ready: true },
  { pageKey: 'users', ready: true },
  { pageKey: 'rbac', ready: true },
  { pageKey: 'config', ready: true },
  { pageKey: 'audit-log', ready: true },
]
```

---

## Frontend Integration

### Hook Usage

```typescript
// src/hooks/usePageSettings.ts
const pageSettings = usePageSettings();

// Returns array of PageSetting objects from real backend API
// useQuery hook automatically fetches from GET /api/v1/page-settings
```

### Page Visibility Check

```typescript
// frontend/src/pages/SomePage/index.tsx
const pageSettings = usePageSettings();
const isUserPageReady = pageSettings?.find(p => p.pageKey === 'users')?.ready;

return isUserPageReady ? <UserPage /> : <UnderMaintenance pageKey="users" />;
```

### Types

```typescript
// frontend/src/types/page.ts
export interface PageSetting {
  pageKey: string;
  ready: boolean;
}
```

---

## Architecture & Implementation

### Backend Layers (Route → Handler → Service → Repository)

**1. Route** (`page.route.ts`):
- HTTP endpoint definitions
- Input validation via Zod
- Delegates to service layer

**2. Service** (`page.service.ts`):
- Business logic
- Error handling
- Audit logging for mutations

**3. Repository** (`page.repository.ts`):
- Drizzle ORM queries
- Database abstraction

**4. Schema** (`page.schema.ts`):
- Zod validation schemas
- TypeScript type inference

### Key Design Decisions

✅ **Dedicated Table**: Separate `page_settings` table (not mixed with `app_configs`)  
✅ **Unique pageKey**: No sequential ID dependency  
✅ **Default Ready = false**: Safer — pages hidden until explicitly marked ready  
✅ **Audit Logging**: All updates tracked with `page_setting.update` action  
✅ **No Auth Initially**: Public endpoint (future: add `config:write` permission)  
✅ **Soft Delete Not Needed**: Pages toggled `ready: false`, never deleted  

---

## Audit Trail

All page setting updates are logged to `audit_logs` table:

```json
{
  "action": "page_setting.update",
  "entity": "page_settings",
  "entity_id": "users",
  "meta": { "changes": { "ready": false } },
  "ip_address": "192.168.1.1",
  "request_id": "req-12345",
  "created_at": "2026-06-21T10:15:00Z"
}
```

---

## MSW Mock Status

**Previous**: Frontend used MSW mock (`frontend/src/mocks/handlers/page.handler.ts`)

**Current**: MSW disabled for page-settings
```typescript
// frontend/src/mocks/handlers.ts
// ...pageHandlers, // DISABLED — page settings now from real DB API
```

**Result**: Frontend always gets real data from `GET /api/v1/page-settings`

---

## Testing

### Manual Tests

```bash
# List all page settings
curl http://localhost:3000/api/v1/page-settings

# Update single page (ready → false)
curl -X PUT http://localhost:3000/api/v1/page-settings/users \
  -H "Content-Type: application/json" \
  -d '{ "ready": false }'

# Verify in DB
psql -d dashboard_db -c "SELECT * FROM page_settings WHERE page_key = 'users';"
```

### Frontend Tests

```typescript
// Verify hook loads real data
const { data } = usePageSettings();
expect(data).toHaveLength(15);
expect(data?.find(p => p.pageKey === 'dashboard')?.ready).toBe(true);
```

---

## Limitations & Future Enhancements

**Current Limitations**:
- No permission check on PUT endpoint (future: require `config:write`)
- No search/filter on GET (future: `?ready=true`, `?search=import`)
- No update history view (future: diff old vs new value in audit logs)

**Future Enhancements**:
- Feature flags per company (add `company_id` foreign key)
- Gradual rollout: `ready_for_percentage` (0-100 users)
- Schedule automatic enable/disable
- A/B testing integration
- User segment targeting

---

## Implementation Checklist

✅ Schema created (`page_settings.ts`)  
✅ Schema exported in index  
✅ Zod validation schemas  
✅ Repository layer (Drizzle ORM)  
✅ Service layer (business logic + audit)  
✅ Route handlers (GET, PUT endpoints)  
✅ Router registration  
✅ Database seed (15 pages)  
✅ Audit action type added  
✅ Frontend MSW disabled  
✅ API tested & working  
✅ Documentation complete  

---

## References

- **Backend API**: `src/features/page/`
- **Database Schema**: `src/db/schema/page_settings.ts`
- **Seed Data**: `src/db/seed.ts`
- **Frontend Types**: `frontend/src/types/page.ts`
- **Implementation Plan**: `docs-v2/features/page/PAGE_API_PLAN.md` (detailed 8-step guide)
- **Migration Guide**: `backend/src/features/users/MIGRATION_TASK_LIST.md` (general pattern)

---

**Last Updated**: 2026-06-21
**Status**: ✅ Production Ready