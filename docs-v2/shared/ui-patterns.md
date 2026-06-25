# shared/ui-patterns.md

## Atomic Card Component

**Wajib** — semua container card/panel di aplikasi harus menggunakan `Card` dari `@/components/ui`, bukan `Paper` atau `MuiCard` langsung.

```typescript
import { Card } from '@/components/ui'

// Penggunaan dasar
<Card sx={{ p: 2, height: '100%' }}>
  ...
</Card>

// Override border color (misal: error state)
<Card sx={{ p: 1.5, borderColor: 'error.light' }}>
  ...
</Card>
```

**Default yang sudah di-set oleh `Card`:** `elevation=0`, `square=true`, `border: 1px solid divider`, `bgcolor: background.paper`.

**Lokasi:** `src/components/ui/Card/Card.tsx`

Styling global card (shadow, border, borderRadius) dikontrol dari dua tempat:
1. **`src/theme/index.ts`** — override `MuiCard` dan `MuiPaper` berlaku untuk semua komponen
2. **`src/components/ui/Card/Card.tsx`** — default props dan sx untuk atomic wrapper

Anti-pattern — jangan lakukan ini:
```typescript
// ❌ Import langsung dari MUI
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'

<Paper elevation={0} square sx={{ border: '1px solid', borderColor: 'divider', ... }}>

// ❌ Jangan gunakan CardContent untuk isi card — pakai Card + sx padding
import CardContent from '@mui/material/CardContent'

<Card>
  <CardContent>...</CardContent>  {/* Double border effect! */}
</Card>

// ✅ Gunakan atomic component
import { Card } from '@/components/ui'
<Card sx={{ p: 3 }}>
```

**Catatan:** `Card` dari `@/components/ui` sudah include `border: 1px solid divider` sebagai default. Jika dibungkus `CardContent`, akan muncul double border. Gunakan `sx={{ p: 3 }}` langsung di `Card`.

---

### StatusChip — Color Props Terbatas

`StatusChip` hanya menerima 6 nilai color, **tidak ada `'secondary'`**:

| Color | Penggunaan |
|-------|-----------|
| `'default'` | Label informasi netral (abu-abu) |
| `'primary'` | Count / highlight (biru) |
| `'success'` | Status positif / trend up (hijau) |
| `'error'` | Status negatif / trend down (merah) |
| `'warning'` | Status perlu perhatian (amber) |
| `'info'` | Informasi tambahan (cyan) — pengganti `'secondary'` |

```typescript
// ✅ Benar
<StatusChip label="Accurate" color="info" />

// ❌ Salah — 'secondary' tidak ada di StatusChipColor
<StatusChip label="Accurate" color="secondary" />
```

---

## Theme & Visual Convention

Desain aplikasi menggunakan **flat style** — tidak ada rounded corner pada card dan panel.

- `src/theme/index.ts` — satu file untuk semua token visual (warna, tipografi, shape, component overrides)
- `BORDER_RADIUS = 10` di theme hanya berlaku untuk Button/Chip — Card dan Paper di-override ke `borderRadius: 0`
- Dark mode di-toggle via `useThemeMode()` dari `@/theme/theme.context` — jangan pakai `useTheme` (nama itu adalah MUI hook yang berbeda)

```typescript
// ✅ Benar
import { useThemeMode } from '@/theme/theme.context'
const { mode, toggleTheme, isDark } = useThemeMode()

// ✅ Untuk membaca token MUI theme (warna, spacing)
import { useTheme } from '@mui/material/styles'
const theme = useTheme()

// ❌ Salah — tidak ada export ini
import { useTheme } from '@/theme/theme.context'
```

---

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

### Single Component: ResponsiveListView (replaces DataTable)

**`ResponsiveListView`** adalah satu-satunya komponen tabel yang digunakan. Komponen `DataTable` (lama) sudah dihapus.

- **Desktop** (`>= sm`): render `MUI X DataGrid` — pagination, sorting, filter
- **Mobile** (`< sm`): render card list auto-generated dari column definitions
- **Semua state built-in**: loading skeleton (responsive), error alert, empty state
Server-side pagination wajib untuk dataset besar -- jangan paginate di client.
Column definition diletakkan dekat halaman pemakainya, baru dipindah ke shared jika dipakai >= 2 halaman.

### Mobile: Auto-generated Card List via ResponsiveListView

Gunakan `ResponsiveListView` dari `@/components/tables/ResponsiveListView` — satu komponen yang secara otomatis:

- **Desktop** → render `DataGrid` (sama seperti `DataTable`)
- **Mobile** (`< sm` breakpoint) → render daftar `Card`, auto-generate dari column definitions

```typescript
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

<ResponsiveListView
  rows={data ?? []}
  columns={columns}
  onRowClick={(row) => handleClick(row)}
  loading={isLoading}
  error={error as Error | null}
  title={t('page.tableTitle')}
  pageSize={25}
  height={500}
/>
```

| Prop | Type | Default | Deskripsi |
|------|------|---------|-----------|
| `rows` | `GridRowsProp` | — | Data array |
| `columns` | `GridColDef[]` | — | Column definitions (sama format DataGrid) |
| `renderCard` | `(row, index) => ReactNode` | — | Custom card renderer untuk mobile (skip auto-generated) |
| `onRowClick` | `(row) => void` | — | Handler klik row (desktop + mobile) |
| `loading` | `boolean` | `false` | Loading state — skeleton otomatis |
| `error` | `Error \| null` | `null` | Error state — alert otomatis |
| `emptyMessage` | `string` | `'Tidak ada data'` | Pesan saat data kosong |
| `title` | `string` | — | Header card (desktop) / count indicator (mobile) |
| `pageSize` | `number` | `10` | Initial page size |
| `height` | `number` | `400` | Container height (desktop) |
| `mobileFields` | `string[]` | semua kolom | Field yang ditampilkan di mobile card |

**Mobile card behavior:**
- Tanpa `renderCard`: auto-generate card dari `columns` — setiap field jadi baris label + value
- Dengan `renderCard`: kendali penuh render card sesuai kebutuhan halaman
- `mobileFields`: filter kolom mana saja yang muncul di card (default semua kolom)
- `valueFormatter` dan `renderCell` di column definitions tetap diproses

**Lokasi:** `src/components/tables/ResponsiveListView/ResponsiveListView.tsx`

Anti-pattern:
```typescript
// ❌ Jangan import DataGrid langsung dari MUI
import { DataGrid } from '@mui/x-data-grid'

// ❌ Jangan buat manual if/else isMobile + DataTable + card list

// ✅ Cukup satu komponen:
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

<ResponsiveListView rows={users} columns={userColumns} />

// ❌ Jangan duplicate loading/error/empty state — semuanya built-in
```

**Lokasi:** `src/components/tables/ResponsiveListView/ResponsiveListView.tsx`

## ProgressBar — Segmented Import Progress

**`ProgressBar`** adalah atomic component untuk indikator progres import data. Tersedia di `src/components/ui/ProgressBar/`.

```typescript
import { ProgressBar } from '@/components/ui'

// Saat loading/upload (sebelum total diketahui) — shimmer indeterminate
<ProgressBar status="loading" size="sm" showLabel={false} />

// Saat processing — bar tersegmentasi real-time
<ProgressBar
  total={progress.total}
  success={progress.success}
  error={progress.errors}
  size="sm"
  showLabel={false}
/>

// Hasil akhir import — animasi dari 0 saat pertama render
<ProgressBar
  total={result.total_invoices}
  success={result.success_invoices}
  error={result.error_rows}
  status={result.status}
  size="sm"
  showLabel
/>
```

**Props:**

| Prop | Type | Default | Keterangan |
|------|------|---------|------------|
| `success` | `number` | `0` | Jumlah baris sukses |
| `error` | `number` | `0` | Jumlah baris error |
| `total` | `number` | `0` | Total baris data |
| `status` | `ProgressBarStatus` | `'idle'` | `loading` = shimmer; `idle/success/partial/failed` = segmented bar |
| `size` | `'sm'|'md'|'lg'` | `'md'` | Tinggi bar: sm=4px md=8px lg=12px |
| `showLabel` | `boolean` | `true` | Tampilkan angka di bawah bar |
| `animated` | `boolean` | `true` | Transisi width 0.6s ease |
| `sx` | `SxProps` | — | Override MUI sx |

**Struktur visual bar (kiri → kanan):**
```
[ sukses (hijau) ][ error (merah) ][ belum diproses (abu) ]
```

**Animasi mount:** Komponen selalu start dari 0% dan animate ke nilai target. Update berikutnya (streaming) langsung set tanpa delay sehingga CSS transition tetap smooth.

**Pola integrasi dengan SSE streaming** → lihat `useImportFileProgress` di `src/hooks/useImport.ts`.

---

## Import Streaming Pattern (useImportFileProgress)

Untuk operasi panjang yang butuh progress real-time, gunakan native `fetch` + `ReadableStream` bukan `useMutation` axios.

```typescript
import { useImportFileProgress } from '@/hooks/useImport'

const { phase, progress, result, errorMessage, mutate, reset, isPending } = useImportFileProgress()

// phase: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
// progress: { processed, total, success, errors }
// isPending: phase === 'uploading' || phase === 'processing'

// Saat upload:
<ProgressBar status="loading" size="sm" showLabel={false} />

// Saat processing:
<ProgressBar total={progress.total} success={progress.success} error={progress.errors} size="sm" showLabel={false} />
<Typography variant="caption">{progress.processed} / {progress.total} baris</Typography>
```

Backend endpoint yang bersesuaian: `POST /api/v1/import/csv/stream` (Hono `streamSSE`).
Format event: `data: {"event":"progress","processed":5,"total":100,"success":4,"errors":1}`

---

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
