# shared/ui-patterns.md

## Component Conventions
Functional component + hooks only, tidak ada class component.

Naming: component PascalCase, file PascalCase.tsx

Satu component per folder + index.ts re-export:
components/StatCard/StatCard.tsx
components/StatCard/index.ts

Logic dipisah dari UI lewat custom hook di src/hooks/
Semua tipe response API di src/types/

## Data Fetching
Semua server-state via TanStack Query (useQuery / useMutation)
Tidak ada fetch/axios manual di dalam component
Semua API call wajib lewat layer src/api/
Axios instance: src/api/axios.ts -- sudah include interceptor X-CSRF-Token

```typescript
// src/api/metrics.ts
export const getCrossSellingRatio = (params: MetricParams) =>
  axiosInstance.get<MetricResponse>('/metrics/cross-selling', { params })

// src/hooks/useCrossSellingRatio.ts
export const useCrossSellingRatio = (params: MetricParams) =>
  useQuery({
    queryKey: ['metrics', 'cross-selling', params],
    queryFn: () => getCrossSellingRatio(params),
  })
```

## Auth & Permission
Auth state (user, permissions[], companies[]) disimpan di AuthContext
Gate UI dengan PermissionGuard (cek permission string, contoh "metrics:read") -- bukan RoleGuard / cek nama role
permissions[] didapat dari response /auth/login dan /auth/refresh -- tidak perlu request tambahan

```typescript
<PermissionGuard permission="users:manage">
  <UsersTable />
</PermissionGuard>
```

## Reusable Chart Components (Recharts v3)

| Component | Underlying chart | Typical use |
|---|---|---|
| StatCard | LineChart simple, no axes | Metric card: title + value + badge + mini trend |
| AreaChartWidget | AreaChart multi-series | Trend over time, single/multi metric |
| BarChartWidget | BarChart grouped / stacked / horizontal | Comparison, ranking, ratio breakdown |
| HeatmapWidget | Custom CSS grid (bukan Recharts) | Matrix: entity x category |
| ComboChartWidget | ComposedChart Bar+Line dual-Y | Value + average pada chart yang sama |
| DonutChartWidget | PieChart innerRadius | Snapshot penetration / share |
| RadialBarWidget | RadialBarChart ring progress | Rate vs 100%, warna berdasarkan threshold |
| LineAlertWidget | ComposedChart + ReferenceArea | Trend dengan shading danger-zone |
| BulletChartWidget | Custom CSS bullet | Value vs target band |

Mapping per metrik (M1-M10) -> executive-dashboard/metrics.md, bukan di sini.

Props convention: setiap widget terima data, loading, colorScheme override -- jangan hardcode warna di dalam component chart.

## Table Pattern
Gunakan MUI X DataGrid v9 untuk semua data tabular dengan pagination/sort/filter
Server-side pagination wajib untuk dataset besar -- jangan paginate di client
Column definition diletakkan dekat halaman pemakainya, baru dipindah ke shared jika dipakai >= 2 halaman

## Form Pattern
React Hook Form v7 + Zod v4 di setiap form

```typescript
const schema = z.object({
  name: z.string().min(1),
  company_id: z.number(),
})

const form = useForm({ resolver: zodResolver(schema) })
```

## Mock Data (MSW v2 -- dev only)
Aktif hanya saat import.meta.env.DEV
Satu file handler per domain di src/mocks/handlers/, diimport di handlers.ts
Endpoint baru -> buat handler dulu sebelum API asli siap, supaya dev tidak terblokir

## New Page Checklist (wajib untuk setiap halaman baru)
1. Daftarkan route di src/route/routes.tsx (routeRegistry)
2. Tambahkan entry di src/config/menu.tsx (NAV_ITEMS) -- ikuti struktur group di overview.md tiap workbench
3. Tambahkan MSW handler di src/mocks/handlers/ jika halaman butuh data mock
4. Set ready=true di page.handler.ts
5. Bungkus halaman/menu item dengan PermissionGuard sesuai permission string
