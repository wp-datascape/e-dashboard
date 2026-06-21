# Feature: Config Page — System Configuration

> Status: ✅ Complete — All 4 tabs functional
> Last updated: 2026-06-22

---

## Overview

Halaman Config adalah pusat pengaturan sistem. Terdiri dari 4 tab:

| Tab | Konten |
|-----|--------|
| **Business Rules** | Dormant threshold per BU, active_window, general settings |
| **Integration** | Accurate Online API credentials (OAuth / API Token) |
| **App Settings** | Language, Theme (dark/light), Color palette |
| **Page Settings** | Toggle menu visibility (ready/not ready) |

---

## File Structure

```
frontend/src/pages/Config/
├── index.tsx                     — Main page + tab orchestrator
├── components/
│   ├── BusinessRulesTab.tsx       — Tab 1: Dormant thresholds & general config
│   ├── IntegrationTab.tsx         — Tab 2: Accurate Online credentials
│   ├── AppSettingsTab.tsx         — Tab 3: Language + Theme
│   └── PageSettingsTab.tsx        — Tab 4: Page visibility toggles
```

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
    { "id": 1, "pageKey": "dashboard", "ready": true, "createdAt": "...", "updatedAt": "..." },
    { "id": 2, "pageKey": "customers", "ready": true, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

#### `PUT /api/v1/page-settings/:pageKey`

Toggle ready status.

**Request body:**
```json
{ "ready": false }
```

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 2,
    "pageKey": "customers",
    "ready": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### UI Components

**PageSettingsTab.tsx**
- Data: `usePageSettings()` → `GET /api/v1/page-settings`
- Mutation: `useUpdatePageSetting()` → `PUT /api/v1/page-settings/:pageKey`
- Tampilan: Table dengan Switch per row, grouped by menu group
- Loading state: CircularProgress per row saat toggle
- Error state: Alert component

### Group Mapping

Page keys dikelompokkan secara hardcoded:

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
  { pageKey: 'projects', ready: false },         // Pending MVP decision
  { pageKey: 'import', ready: true },
  { pageKey: 'users', ready: true },
  { pageKey: 'rbac', ready: true },
  { pageKey: 'config', ready: true },
  { pageKey: 'audit-log', ready: true },
]
```

### Files Modified

| File | Perubahan |
|------|-----------|
| `frontend/src/api/page.api.ts` | Tambah `updatePageSetting(pageKey, ready)` |
| `frontend/src/hooks/usePageSettings.ts` | Tambah `useUpdatePageSetting()` mutation hook |
| `frontend/src/pages/Config/components/PageSettingsTab.tsx` | **BARU** — komponen tab |
| `frontend/src/pages/Config/index.tsx` | Register tab ke-4 |
| `frontend/src/i18n/locales/en.json` | Keys: `config.tabs.pageSettings`, `config.pageSettings.*` |
| `frontend/src/i18n/locales/id.json` | Keys bahasa Indonesia |

---

## References

- **Backend**: `src/features/page/`
- **Database Schema**: `src/db/schema/page_settings.ts`
- **Seed Data**: `src/db/seed.ts`
- **Frontend API**: `frontend/src/api/page.api.ts`
- **Frontend Config Page**: `frontend/src/pages/Config/`

---

**Last Updated**: 2026-06-22
**Status**: ✅ Production Ready