# AI_AGENT_GUIDE.md — Panduan Lengkap untuk AI Agent

> **Baca file ini setelah `MASTER_CONTEXT.md` dan `AI_RULES.md`.**
> Berisi panduan implementasi praktis: pola kode yang sudah ada, komponen yang wajib direuse, checklist halaman baru, dan aturan tambahan yang tidak ada di dokumen lain.

---

## 1. Urutan Baca Dokumen (WAJIB)

```
1. MASTER_CONTEXT.md   ← gambaran project, tech stack, bisnis
2. AI_RULES.md         ← konvensi kode, batasan MVP, aturan logger/audit/RBAC
3. CONTEXT_STATE.md    ← status pengerjaan saat ini, checklist, blocker
4. AI_AGENT_GUIDE.md   ← panduan ini: pola, komponen, checklist implementasi
5. FINALIZED_MENU_STRUCTURE.md ← arsitektur menu final (jika kerja di menu/routing)
6. METRICS_SPEC.md     ← WAJIB sebelum kerjakan fitur metrik
7. DATA_MODEL.md       ← skema tabel (jika kerja di backend/DB)
8. API_SPEC.md         ← endpoint spec (jika kerja di API)
```

---

## 2. Komponen Frontend yang Sudah Ada — Wajib Direuse

> ❌ Jangan buat komponen baru jika sudah ada yang sesuai.
> ✅ Selalu gunakan komponen dari daftar di bawah ini.

### 2.1 UI Components (`src/components/ui/`)

| Komponen | Import Path | Kapan Digunakan |
|----------|-------------|-----------------|
| `Button` | `@/components/ui/Button` | Semua tombol — sudah ada `isLoading` prop |
| `Card` | `@/components/ui/Card` | Wrapper section dengan elevasi |
| `TextField` | `@/components/ui/TextField` | Input form dengan react-hook-form Controller |
| `Alert` (AppAlert) | `@/components/ui/Alert` | Modal dialog error/info/sukses |
| `AppBar` | `@/components/ui/AppBar` | Top navigation — sudah dipakai di DashboardLayout |
| `Sidebar` | `@/components/ui/Sidebar` | Sidebar navigasi — sudah dipakai di DashboardLayout |
| `Footer` | `@/components/ui/Footer` | Footer — sudah dipakai di DashboardLayout |
| `LogoutButton` | `@/components/ui/LogoutButton` | Tombol logout di AppBar |

**Contoh penggunaan Button dengan loading state:**
```tsx
import { Button } from '@/components/ui/Button';

<Button isLoading={isPending} onClick={handleSubmit}>
  Simpan
</Button>
```

**Contoh TextField dengan react-hook-form:**
```tsx
import { TextField } from '@/components/ui/TextField';
import { useForm, Controller } from 'react-hook-form';

const { control } = useForm();

<Controller
  name="email"
  control={control}
  render={({ field, fieldState }) => (
    <TextField
      {...field}
      label="Email"
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
    />
  )}
/>
```

### 2.2 Chart Components (`src/components/charts/`)

| Komponen | Metrik | Kapan Digunakan |
|----------|--------|-----------------|
| `StatCard` | Semua 10 metrik | Kartu ringkasan dengan line chart kecil + badge trend |
| `AreaChartWidget` | M2 Avg Category | Area chart multi-series dengan gradient hijau |
| `BarChartWidget` | M1, M4, M7, M9 | Bar grouped/stacked/horizontal — lihat props di bawah |
| `HeatmapWidget` | M1.1 Cross Sell Heatmap | Matrix grid Customer × Produk |
| `ComboChartWidget` | M3 Revenue | Combo Bar + Line dual Y-axis |
| `DonutChartWidget` | M5 High Margin | Donut chart dengan center label |
| `RadialBarWidget` | M6 Repeat Order | Ring progress warna dinamis |
| `LineAlertWidget` | M8 Dormant Rate | Line + red shading atas threshold |
| `BulletChartWidget` | M10 Reactivation | Bullet chart dengan target band |

**StatCard props:**
```tsx
<StatCard
  title="Cross Selling Ratio"
  subtitle="Customer multi-produk / total aktif"
  value="22.5%"
  change={2.5}          // persentase perubahan (positif/negatif)
  trend="up"            // 'up' | 'down' | 'stable'
  data={monthlyTrend}   // { month: string, value: number }[]
  color="#3B82F6"       // warna line chart (opsional)
  link="/cross-selling" // navigasi saat diklik (opsional)
/>
```

**BarChartWidget props penting:**
```tsx
// Grouped (default)
<BarChartWidget title="M1 Cross Selling" data={data} bars={bars} xKey="month" />

// Stacked
<BarChartWidget title="M4 GP per Tier" data={data} bars={bars} xKey="month" stacked />

// Horizontal (untuk ranking atau 100% stacked)
<BarChartWidget title="M9 Dormant Value" data={data} bars={bars} xKey="name" layout="horizontal" />

// Dengan custom tooltip formatter
<BarChartWidget
  title="M7 Expansion Rate"
  data={data}
  bars={bars}
  xKey="month"
  stacked
  layout="horizontal"
  tooltipFormatter={(val) => `${val}%`}
/>
```

### 2.3 Table Component (`src/components/tables/`)

```tsx
import { DataTable } from '@/components/tables/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Nama Customer', flex: 1 },
  { field: 'revenue', headerName: 'Revenue', width: 150,
    valueFormatter: (val) => `Rp ${val.toLocaleString('id-ID')}` },
];

<DataTable rows={customers} columns={columns} />
```

### 2.4 Layout (`src/components/layout/`)

Semua halaman dalam auth-protected area sudah otomatis dibungkus `DashboardLayout` melalui routing. **Jangan** bungkus ulang di dalam page component.

```tsx
// ✅ Benar — page component langsung return konten
export default function MyPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Judul Halaman</Typography>
      {/* konten */}
    </Box>
  );
}

// ❌ Salah — jangan wrap ulang dengan DashboardLayout
export default function MyPage() {
  return (
    <DashboardLayout>
      <Box>...</Box>
    </DashboardLayout>
  );
}
```

---

## 3. Pola Kode Frontend yang Sudah Berlaku

### 3.1 Struktur Halaman Baru

Setiap halaman baru wajib mengikuti 5 langkah ini:

```
1. Buat file: src/pages/NamaPage/index.tsx
2. Daftar lazy import di: src/route/routes.tsx (routeRegistry)
3. Tambah menu item di: src/config/menu.tsx (NAV_ITEMS)
4. Tambah i18n key di: src/i18n/locales/en.json & id.json
5. Tambah pageKey di: src/mocks/handlers/page.handler.ts (ready: false default)
```

**Template halaman placeholder:**
```tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function NamaPage() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t('menu.namaPage')}
      </Typography>
      {/* Implementasi */}
    </Box>
  );
}
```

### 3.2 Data Fetching — TanStack Query

Semua API call wajib via `useQuery` atau `useMutation` dari TanStack Query v5. **Tidak boleh** fetch langsung di dalam komponen.

```tsx
// ✅ Pattern yang benar
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/api/customers.api'; // dari api layer

const { data, isLoading, error } = useQuery({
  queryKey: ['customers', companyId, periodMonth],
  queryFn: () => getCustomers({ companyId, periodMonth }),
});

// ❌ Salah — fetch langsung di komponen
useEffect(() => {
  fetch('/api/v1/customers').then(...);
}, []);
```

### 3.3 API Layer — Tambah File Baru

Jika API belum ada, buat di `src/api/` dulu sebelum di page. Ikuti pola yang sudah ada:

**Standar penulisan (wajib diikuti):**
- Import `api` dari `./axios` — **bukan** `axios` langsung, **bukan** `axiosInstance`
- Export sebagai **object** `namaApi` dengan method di dalamnya (bukan function export langsung)
- GET: cukup `await` tanpa try/catch (axios interceptor handle 401)
- POST/PUT/DELETE: wajib `try/catch` dan lempar `ApiError`
- Tipe data di `src/types/` — bukan di-define di dalam file api

```typescript
// src/api/customers.api.ts
import { api } from './axios';
import type { ApiResponse, ApiError } from '@/types/api';
import type { Customer } from '@/types/customers'; // tipe di src/types/

export const customersApi = {
  // GET — tanpa try/catch, interceptor sudah handle 401
  getCustomers: async (): Promise<Customer[]> => {
    const response = await api.get<ApiResponse<Customer[]>>('/customers');
    return response.data.data;
  },

  // POST/PUT/DELETE — wajib try/catch + lempar ApiError
  createCustomer: async (payload: { name: string; code: string }): Promise<Customer> => {
    try {
      const response = await api.post<ApiResponse<Customer>>('/customers', payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },
};
```

**Contoh yang SUDAH ADA dan bisa dijadikan referensi:**
- `src/api/auth.api.ts` — pola login dengan setCsrfToken
- `src/api/dashboard.api.ts` — pola GET sederhana
- `src/api/rbac.api.ts` — pola CRUD lengkap dengan error handling

### 3.4 Custom Hooks

Logic data-fetching yang dipakai di lebih dari 1 tempat wajib dipindah ke `src/hooks/`:

```typescript
// src/hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query';
import { getCustomers, type GetCustomersParams } from '@/api/customers.api';

export function useCustomers(params: GetCustomersParams) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
    enabled: !!params.companyId,
  });
}
```

### 3.5 MSW Mock Handler — Tambah Data Baru

Jika halaman butuh data dari API yang belum ada backend-nya:

```typescript
// src/mocks/handlers/customers.handler.ts
import { http, HttpResponse } from 'msw';

export const customersHandlers = [
  http.get('/api/v1/customers', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 1, name: 'PT ABC', code: 'C001', lastInvoiceDate: '2024-01-15' },
        // ...
      ],
    });
  }),
];
```

Kemudian import di `src/mocks/handlers.ts`:
```typescript
import { customersHandlers } from './handlers/customers.handler';

export const handlers = [
  ...authHandlers,
  ...pageHandlers,
  ...dashboardHandlers,
  ...metricsHandlers,
  ...customersHandlers, // ← tambah di sini
];
```

### 3.6 Loading & Error State

Setiap halaman yang fetch data wajib handle loading dan error:

```tsx
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) return <Skeleton variant="rectangular" height={400} />;
if (error) return <Alert severity="error">Gagal memuat data</Alert>;
```

---

## 4. Konvensi Penamaan

| Hal | Konvensi | Contoh |
|-----|----------|--------|
| Komponen React | PascalCase | `StatCard`, `DataTable` |
| File komponen | PascalCase.tsx | `StatCard.tsx` |
| Folder komponen | PascalCase (dengan index.ts) | `StatCard/index.ts` |
| Custom hooks | camelCase, awalan `use` | `useCustomers`, `useDashboard` |
| API functions | camelCase | `getCustomers`, `createUser` |
| Types/interfaces | PascalCase | `CustomerRow`, `MetricCard` |
| i18n keys | camelCase bertingkat | `menu.customers`, `page.title` |
| CSS/sx props | ikuti MUI convention | `sx={{ mt: 2, p: 3 }}` |

---

## 5. Checklist Sebelum Submit Kode

### Frontend — Halaman Baru
- [ ] Halaman terdaftar di `routeRegistry` di `routes.tsx`
- [ ] Lazy import ditambahkan di `routes.tsx`
- [ ] Menu item ditambahkan di `config/menu.tsx`
- [ ] i18n key ditambahkan di `en.json` DAN `id.json`
- [ ] `pageKey` ditambahkan di `page.handler.ts`
- [ ] Loading state dihandle (Skeleton atau CircularProgress)
- [ ] Error state dihandle
- [ ] Komponen yang sudah ada direuse (tidak buat duplikat)
- [ ] Tidak ada fetch manual di dalam komponen (wajib via TanStack Query)
- [ ] Tidak ada `any` type kecuali unavoidable

### Frontend — Komponen Baru
- [ ] File dalam folder sendiri: `ComponentName/ComponentName.tsx` + `ComponentName/index.ts`
- [ ] Props interface diekspor dengan nama `ComponentNameProps`
- [ ] Tidak ada hardcoded warna/spacing — gunakan MUI theme
- [ ] Tidak ada `console.log` tersisa

### Backend — Endpoint Baru
- [ ] Validasi input dengan zod di handler
- [ ] Response via `utils/response` (bukan `c.json()` langsung)
- [ ] Error via `AppError` dari `utils/error`
- [ ] Filter `company_id` wajib ada di semua query
- [ ] Audit log (`logAudit`) dipanggil untuk operasi mutasi
- [ ] Logger (`logger.info/warn/error`) digunakan, bukan `console.log`
- [ ] Endpoint baru terdaftar di `API_SPEC.md`

---

## 6. Anti-Pattern yang Dilarang

### ❌ Frontend
```tsx
// ❌ Fetch manual di komponen
useEffect(() => {
  axios.get('/customers').then(r => setData(r.data));
}, []);

// ❌ Buat komponen baru padahal ada StatCard
const MyCard = () => <div className="card">...</div>;

// ❌ Inline style alih-alih MUI sx
<div style={{ marginTop: 16, padding: 24 }}>

// ❌ Hard-import MUI langsung tanpa alias
import Button from '@mui/material/Button'; // buat komponen baru dulu
// Atau gunakan MUI langsung jika belum ada wrapper-nya

// ❌ State management global custom (Redux, Zustand)
import { createStore } from 'redux'; // ← dilarang

// ❌ any type tanpa komentar
const data: any = response; // ← hindari
```

### ❌ Backend
```typescript
// ❌ Raw SQL tanpa alasan performa jelas
const result = await db.execute(sql`SELECT * FROM customers`);

// ❌ console.log di production code
console.log('debug:', data);

// ❌ c.json() langsung alih-alih utils/response
return c.json({ success: true, data }); // ← salah

// ❌ Query tanpa filter company_id
const customers = await db.select().from(customers); // ← BERBAHAYA, bocor data antar entitas

// ❌ Catch kosong
try { ... } catch (e) {} // ← harus handle error
```

---

## 7. Pola Arsitektur Menu (Makro-Mikro)

Navigasi menggunakan 5 group:

```
Group 1: Executive Dashboard  → /dashboard
Group 2: Customer Workbench   → /customers, /customers-expansion, /dormant-customer, /cross-selling
Group 3: Product & Portfolio  → /products, /products-high-margin, /products-trend
Group 4: Transaction & Revenue → /transactions, /projects
Group 5: Admin                → /import, /users, /rbac, /config, /audit-log
```

**Cara tambah submenu baru:**
```tsx
// src/config/menu.tsx — tambah item ke dalam group yang sesuai
{
  key: 'newPage',
  label: t('menu.newPage'),
  icon: <SomeIcon />,
  path: '/new-page',
  group: 'Customer Workbench', // harus match nama group yang ada
}
```

---

## 8. Page-Settings & "Under Maintenance" Pattern

Semua halaman yang belum siap ditampilkan otomatis redirect ke `/under-maintenance`.

**Untuk aktifkan halaman yang sudah diimplementasi:**
```typescript
// src/mocks/handlers/page.handler.ts
const PAGE_SETTINGS: PageSetting[] = [
  { pageKey: 'dashboard', ready: true },          // ✅ aktif
  { pageKey: 'cross-selling', ready: true },      // ✅ aktif
  { pageKey: 'customers', ready: false },         // ← ubah ke true saat siap
  // ...
];
```

**Tambah pageKey baru:**
1. Tambahkan `{ pageKey: 'nama-halaman', ready: false }` di `page.handler.ts`
2. Pastikan route di `routes.tsx` punya `pageKey` yang matching

---

## 9. i18n — Bilingual Support

Project support Bahasa Indonesia (`id`) dan English (`en`). Semua teks tampilan wajib melalui `useTranslation`.

**Tambah key baru — WAJIB di kedua file:**
```json
// src/i18n/locales/en.json
{
  "menu": {
    "newPage": "New Page"
  },
  "newPage": {
    "title": "New Page Title",
    "description": "Description here"
  }
}

// src/i18n/locales/id.json
{
  "menu": {
    "newPage": "Halaman Baru"
  },
  "newPage": {
    "title": "Judul Halaman Baru",
    "description": "Deskripsi di sini"
  }
}
```

**Penggunaan di komponen:**
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Typography>{t('newPage.title')}</Typography>
```

---

## 10. Auth & Permission Pattern

### Auth State
```tsx
import { useAuth } from '@/context/AuthContext';

const { user, permissions, isAuthenticated } = useAuth();

// Cek permission di UI (saat PermissionGuard belum ada)
if (!permissions.includes('metrics:read')) {
  return <Alert severity="warning">Akses ditolak</Alert>;
}
```

### PermissionGuard (belum ada — perlu dibuat)
```tsx
// src/components/ui/PermissionGuard/PermissionGuard.tsx (TODO)
interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({ permission, children, fallback }: PermissionGuardProps) => {
  const { permissions } = useAuth();
  if (!permissions.includes(permission)) return fallback ?? null;
  return <>{children}</>;
};
```

> ⚠️ **CATATAN**: Gunakan `PermissionGuard` (cek permission string), BUKAN `RoleGuard` (cek nama role). Ini sejalan dengan sistem RBAC dinamis.

---

## 11. Status Komponen & Halaman (Referensi Cepat)

### Komponen Chart — Semua ✅ Siap Pakai
| Komponen | Status | Lokasi |
|----------|--------|--------|
| `StatCard` | ✅ | `src/components/charts/StatCard/` |
| `AreaChartWidget` | ✅ | `src/components/charts/AreaChartWidget/` |
| `BarChartWidget` | ✅ | `src/components/charts/BarChartWidget/` |
| `HeatmapWidget` | ✅ | `src/components/charts/HeatmapWidget/` |
| `ComboChartWidget` | ✅ | `src/components/charts/ComboChartWidget/` |
| `DonutChartWidget` | ✅ | `src/components/charts/DonutChartWidget/` |
| `RadialBarWidget` | ✅ | `src/components/charts/RadialBarWidget/` |
| `LineAlertWidget` | ✅ | `src/components/charts/LineAlertWidget/` |
| `BulletChartWidget` | ✅ | `src/components/charts/BulletChartWidget/` |
| `DataTable` | ✅ | `src/components/tables/DataTable/` |

### Halaman — Status Implementasi
| Halaman | Path | Status |
|---------|------|--------|
| Login | `/login` | ✅ Lengkap |
| Dashboard | `/dashboard` | ✅ Lengkap (10 StatCard + 7 chart) |
| CrossSelling | `/cross-selling` | ✅ Lengkap (M1+M1.1+M2+DataTable) |
| CustomerMetrics | `/customer-metrics` | ✅ Lengkap (M3+M4+M5+M6+M7) |
| DormantCustomer | `/dormant-customer` | ✅ Lengkap (M8+M9+M10) |
| Customers | `/customers` | ☐ Placeholder |
| Products | `/products` | ☐ Placeholder |
| ProductsHighMargin | `/products-high-margin` | ☐ Placeholder |
| ProductsTrend | `/products-trend` | ☐ Placeholder |
| Transactions | `/transactions` | ☐ Placeholder |
| Projects | `/projects` | ☐ Placeholder |
| Import | `/import` | ☐ Placeholder |
| Users | `/users` | ☐ Placeholder |
| RBAC | `/rbac` | ☐ Placeholder |
| Config | `/config` | ☐ Placeholder |
| AuditLog | `/audit-log` | ☐ Placeholder |

### API Layer Frontend — Status
| File | Status |
|------|--------|
| `src/api/axios.ts` | ✅ |
| `src/api/auth.api.ts` | ✅ |
| `src/api/dashboard.api.ts` | ✅ |
| `src/api/page.api.ts` | ✅ |
| `src/api/metrics.api.ts` | ☐ Belum ada |
| `src/api/customers.api.ts` | ☐ Belum ada |
| `src/api/import.api.ts` | ☐ Belum ada |
| `src/api/rbac.api.ts` | ☐ Belum ada |
| `src/api/config.api.ts` | ☐ Belum ada |

---

## 12. Urutan Pengerjaan yang Disarankan

### Prioritas 1 — Frontend yang Segera Dibutuhkan
1. `CompanyContext` + `CompanySelector` — filter per entitas (dibutuhkan di semua halaman)
2. `PeriodFilter` + `ActiveWindowFilter` — filter periode
3. `PermissionGuard` — komponen guard permission
4. `src/api/metrics.api.ts` — centralize API metrics
5. `src/hooks/useMetrics.ts` — centralize hooks metrics

### Prioritas 2 — Halaman Admin
1. Import page (upload CSV/Excel + trigger API Accurate)
2. Users page (DataTable + CRUD)
3. Config page (form update app_configs)
4. RBAC page (matrix role-permission)
5. AuditLog page (DataTable + filter)

### Prioritas 3 — Workbench Pages
1. Customers 360 page
2. Products Performance page
3. Transactions/Order Ledger page

### Prioritas 4 — Backend (Semua modul, 0%)
Lihat checklist lengkap di `CONTEXT_STATE.md`.

---

## 13. Blocker & Pertanyaan Terbuka

| Pertanyaan | Dampak | File Terkait |
|------------|--------|--------------|
| Format kolom CSV/Excel Accurate Online | Tidak bisa implement parser | `utils/parser.ts` |
| Endpoint & auth Accurate API | Tidak bisa implement `accurate.source.ts` | `utils/accurate.ts` |
| Apakah kategori "jasa" di Accurate ada kode khusus? | Menentukan cara set `is_service` | `product_categories` |
| Apakah B2B Project Milestone masuk MVP? | Menentukan scope `projects` table | `DATA_MODEL.md` |

> Jangan mulai implementasi yang terkait blocker di atas tanpa konfirmasi dari tim.

---

*Terakhir diperbarui: 2026-06-17 oleh AI (Claude)*