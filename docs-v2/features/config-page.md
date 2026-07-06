# Feature: Config Page — System Configuration

> Status: ✅ Complete — All 4 tabs functional
> Last updated: 2026-06-29

---

## Overview

Halaman Config adalah pusat pengaturan sistem. Terdiri dari 4 tab:

| Tab | Konten |
|-----|--------|
| **Business Rules** | Dormant threshold per BU, active_window, general settings |
| **Integration** | Accurate Online API credentials (company + branch selector) |
| **App Settings** | Language, Theme (dark/light), Color palette |
| **Page Settings** | Toggle menu visibility (ready/not ready) |

---

## File Structure

```
frontend/src/pages/Config/
├── index.tsx                     — Main page + tab orchestrator
├── components/
│   ├── BusinessRulesTab.tsx       — Tab 1: Dormant thresholds & general config
│   ├── IntegrationTab.tsx         — Tab 2: Accurate Online credentials (UPDATED)
│   ├── AppSettingsTab.tsx         — Tab 3: Language + Theme
│   └── PageSettingsTab.tsx        — Tab 4: Page visibility toggles
```

---

## Tab 2: Integration (Updated 2026-06-24)

### Fitur

1. **Pilih Company** — dropdown dari data companies
2. **Pilih Branch** — otomatis terfilter berdasarkan company:
   - PT MKO: Pusat (1 branch)
   - PT KNT: Surabaya, Jakarta, Semarang (3 branch)
   - PT SKI: Pusat (1 branch)
3. **Auth Method selector** — Radio group: OAuth 2.0 / API Token
4. **API Token method** (default):
   - Subdomain (e.g. `odin` dari `odin.accurate.id`)
   - API Token (`aat.xxx...`)
   - Signature Secret (dari Area Developer)
   - **Test Connection** — verifikasi token ke Accurate `/api/api-token.do`
5. **OAuth method** (alternate):
   - App Key + Signature Secret
   - Client ID + Client Secret
   - Callback URL + Company DB ID

### Flow Test Connection (API Token)

```
Frontend → POST /api/v1/config/accurate/test-connection
  → Backend: POST https://account.accurate.id/api/api-token.do
    Headers:
      Authorization: Bearer {api_token}
      X-Api-Timestamp: {dd/mm/yyyy hh:nn:ss}
      X-Api-Signature: HMAC-SHA256(timestamp, signature_secret) → Base64
  → Response: { database: { host, alias, id }, application, user }
  → Frontend display: User, Host, Database name
```

### Frontend Files

| File | Role |
|------|------|
| `src/types/accurate.ts` | Types: CompanyBranch, AccurateCredential, AccurateTestResult |
| `src/api/accurate.api.ts` | API layer: getBranches, getCredentials, saveCredentials, testConnection |
| `src/hooks/useAccurate.ts` | TanStack Query hooks: useBranches, useCredentials, useSaveCredentials, useTestConnection |
| `src/mocks/handlers/accurate.handler.ts` | MSW mock handlers for dev |
| `src/pages/Config/components/IntegrationTab.tsx` | Main component |

---

## Tab 4: Page Settings

> **Yang baru ditambahkan.** Mengelola visibilitas menu aplikasi secara real-time.

### Cara Kerja

1. Ambil data dari API: `GET /api/v1/page-settings`
2. Tampilkan semua pages dalam tabel, dikelompokkan per menu group
3. Toggle switch → `PUT /api/v1/page-settings/:pageKey` dengan `{ ready: true/false }`
4. Perubahan langsung terlihat di sidebar — page yang di-off akan menampilkan "Under Maintenance"

### API Endpoints

#### `GET /api/v1/page-settings`

List semua page settings.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    { "id": 1, "pageKey": "dashboard", "ready": true, "created_at": "...", "updated_at": "..." }
  ]
}
```

#### `PUT /api/v1/page-settings/:pageKey`

Toggle ready status.

**Request body:**
```json
{ "ready": false }
```

### Group Mapping

| Group | Pages |
|-------|-------|
| **Executive Dashboard** | dashboard |
| **Customer Workbench** | customers, customers-expansion, dormant-customer, cross-selling |
| **Product & Portfolio** | products, products-high-margin, products-trend |
| **Transaction & Revenue** | transactions, projects |
| **Admin** | import, users, rbac, config, audit-log |

### Seed Data (15 pages)

Semua page di-seed via `backend/src/db/seed.ts`:
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
  { pageKey: 'projects', ready: false },
  { pageKey: 'import', ready: true },
  { pageKey: 'users', ready: true },
  { pageKey: 'rbac', ready: true },
  { pageKey: 'config', ready: true },
  { pageKey: 'audit-log', ready: true },
]
```

---

## References

- **Backend**: `src/features/page/`, `src/db/schema/schema-company.ts` (tables `company_branches`, `accurate_credentials`)
- **Database Schema**: `src/db/schema/page_settings.ts`
- **Seed Data**: `src/db/seed.ts`
- **Frontend API**: `frontend/src/api/page.api.ts`, `frontend/src/api/accurate.api.ts`
- **Frontend Config Page**: `frontend/src/pages/Config/`

---

**Last Updated**: 2026-06-24
**Status**: ✅ Production Ready