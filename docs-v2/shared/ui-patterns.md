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

## ActionMenu — Dropdown Action Column

**Wajib** — semua action column di tabel harus menggunakan `ActionMenu` dari `@/components/ui`. Jangan pakai IconButton, MoreVert, atau inline Menu.

```typescript
import { ActionMenu } from '@/components/ui'

<ActionMenu
  items={[
    { label: t('common.edit'), icon: <EditIcon />, onClick: () => handleEdit(row) },
    { label: t('common.deactivate'), icon: <BlockIcon />, onClick: () => handleDeactivate(row.id), hidden: !row.is_active },
    { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => handleDelete(row.id), color: 'error', dividerBefore: true },
  ]}
/>
```

**ActionMenuItemDef props:**

| Prop | Type | Keterangan |
|------|------|-----------|
| `label` | `string` | Teks item menu |
| `icon` | `ReactNode` | Icon di kiri label |
| `onClick` | `() => void` | Handler klik |
| `color` | `'error'|'warning'|'success'|'info'` | Warna teks (opsional) |
| `dividerBefore` | `boolean` | Garis pemisah di atas item |
| `hidden` | `boolean` | Sembunyikan item secara kondisional |
| `disabled` | `boolean` | Disable item |

**Column definition:**
```typescript
{
  field: '_actions',   // selalu pakai field name '_actions' — dideteksi AutoCard mobile
  headerName: '',
  width: 110,
  sortable: false,
  align: 'center',
  headerAlign: 'center',
  renderCell: ({ row }) => <ActionMenu items={[...]} />,
}
```

**Lokasi:** `src/components/ui/ActionMenu/index.tsx`

Anti-pattern:
```typescript
// ❌ Jangan pakai IconButton manual
<IconButton onClick={handleEdit}><EditIcon /></IconButton>
<IconButton onClick={handleDelete}><DeleteIcon /></IconButton>

// ❌ Jangan pakai MoreVert + inline Menu state
const [anchor, setAnchor] = useState(null)
<IconButton onClick={(e) => setAnchor(e.currentTarget)}><MoreVertIcon /></IconButton>
<Menu anchorEl={anchor} ...>

// ✅ Cukup satu komponen
<ActionMenu items={[...]} />
```

---

## Button — `mobileIconOnly` Prop

Untuk header action button yang perlu icon-only di mobile, gunakan prop `mobileIconOnly`:

```typescript
import { Button } from '@/components/ui'

<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={handleAdd}
  mobileIconOnly
>
  {t('common.add')}
</Button>
```

**Behavior:** di mobile (`xs`) label tersembunyi via CSS, padding dikecilkan → tampil seperti icon button. Di desktop (`sm+`) tampil normal dengan label.

**Aturan:** Semua tombol di page header yang punya `startIcon` WAJIB pakai `mobileIconOnly`.

Anti-pattern:
```typescript
// ❌ Jangan buat dua elemen terpisah
<Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
  <Button startIcon={<AddIcon />}>{t('add')}</Button>
</Box>
<IconButton sx={{ display: { xs: 'flex', sm: 'none' } }}>
  <AddIcon />
</IconButton>

// ✅ Cukup satu komponen dengan prop
<Button startIcon={<AddIcon />} mobileIconOnly>{t('add')}</Button>
```

---

### StatusChip — Color Props Terbatas (Satu-satunya Chip yang Boleh Dipakai)

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

**Wajib** — jangan pernah import `Chip` langsung dari MUI. Selalu gunakan `StatusChip` dari `@/components/ui`.

```typescript
// ❌ Dilarang
import Chip from '@mui/material/Chip'
<Chip label="Active" color="success" size="small" />

// ✅ Wajib
import { StatusChip } from '@/components/ui'
<StatusChip label="Active" color="success" />
```

`StatusChip` sudah include: `variant="outlined"`, `size="small"`, `borderRadius: 999px` (oval), `fontWeight: 600`. Tidak perlu set ulang props ini.

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
| RadialBarWidget | RadialBarChart ring progress | Rate vs target (configurable), warna proporsional |
| LineAlertWidget | ComposedChart + ReferenceArea | Trend dengan shading danger-zone |
| BulletChartWidget | Custom CSS bullet | Value vs target band |

Mapping per metrik (M1-M10) -> executive-dashboard/metrics.md, bukan di sini.

### RadialBarWidget — Props Penting

```typescript
<RadialBarWidget
  title="Repeat Order Rate"
  value={39}          // nilai aktual (0–∞, capped di domain)
  thresholdGreen={80} // target — lingkaran penuh = thresholdGreen, bukan 100
  onChartClick={() => openModal()} // opsional: klik area chart
/>
```

- **Domain**: `[0, thresholdGreen]` — bar penuh ketika `value === thresholdGreen`
- **Warna**: `pct = value / thresholdGreen * 100`
  - Hijau: `pct ≥ 100`
  - Kuning: `pct ≥ 75`
  - Merah: `pct < 75`
- **Jangan** pakai domain `[0, 100]` dan threshold hardcoded — selalu pakai `thresholdGreen` dari config

### BarChartWidget — Props Label

```typescript
<BarChartWidget
  showLabels           // tampilkan label nilai di dalam bar
  labelFormatter={(v) => `${v.toFixed(1)}%`}  // format label (default: nilai apa adanya)
  // ...props lainnya
/>
```

- `showLabels` menggunakan `LabelList` Recharts di setiap bar
- Label di-skip otomatis jika nilai bar < 5 (bar terlalu kecil)
- Warna teks label dihitung otomatis via `theme.palette.getContrastText(color)` — adaptif light/dark

### BarChartWidget — Warna Series & Label Override

Interface `BarSeries` mendukung `labelColor` opsional:

```typescript
interface BarSeries {
  key: string
  label: string
  color: string
  labelColor?: string  // override warna teks label — default: getContrastText(color)
}
```

Gunakan `labelColor` hanya saat `color` semi-transparan (e.g. `action.disabledBackground`) karena `getContrastText` tidak bisa menghitung kontras warna transparan dengan benar:

```typescript
// Pola M5/M6 untuk segmen inaktif/negatif
series={[
  { key: 'up_rate',        label: 'Spending Naik (%)', color: theme.palette.success.main },
  { key: 'flat_down_rate', label: 'Flat / Turun (%)',  color: theme.palette.action.disabledBackground,
    labelColor: theme.palette.text.primary },
]}
```

Props convention: gunakan token `theme.palette.*` — jangan hardcode hex. Untuk segmen "inaktif/negatif", gunakan `action.disabledBackground` (sama seperti pola DonutChart M5).

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

// ❌ JANGAN double-wrap ResponsiveListView dengan Card — ia sudah punya Card sendiri di desktop
<Card>
  <ResponsiveListView ... />  {/* ← nested Card merusak layout flex column DataGrid */}
</Card>

// ✅ Letakkan ResponsiveListView langsung di page container
<Box sx={{ p: 3 }}>
  <ResponsiveListView ... />
</Box>
```

**Catatan penting — flex column DataGrid:**
- Kolom dengan `flex: 1/2` dapat collapse jadi 0-width jika container sempit (semua fixed-width kolom sudah habiskan space).
- Selalu tambahkan `minWidth` pada flex column: `{ flex: 1, minWidth: 160 }`.
- Jika hanya satu kolom flex, seluruh sisa ruang diserap. Dua kolom flex berbagi sisa ruang proporsional.

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

## Sidebar — Smart Group Visibility

Group header (Divider + label teks) di sidebar di-render hanya jika **ada minimal 1 item visible** dalam group tersebut. Tidak ada DOM trace jika seluruh group tersembunyi.

Implementasi di `Sidebar.tsx`:
- `buildNavSections()` — pisahkan `NAV_ITEMS` flat ke sections berdasarkan `groupLabel` boundary
- `isNavItemVisible(item, canSee)` — cek apakah item (+ children jika ada) akan ter-render
- Tiap section: jika `hasVisible === false` → `return null` → tidak ada elemen di DOM

```typescript
// Di menu.tsx — tiap sub-page HARUS punya permissionKey sendiri
{ key: 'customers',          permissionKey: 'customers:menu' }          // parent
{ key: 'customers-expansion', permissionKey: 'customers-expansion:menu' } // sub-page
{ key: 'dormant-customer',   permissionKey: 'dormant-customer:menu' }   // sub-page
{ key: 'cross-selling',      permissionKey: 'cross-selling:menu' }      // sub-page
```

> **Rule**: Enable `customers:menu` HANYA menampilkan Customer List. Sub-pages Expansion, Churn Risk, Cross Selling masing-masing butuh permission sendiri.

## New Page Checklist (wajib untuk setiap halaman baru)
1. Daftarkan route di `src/route/routeConstants.tsx` (routeRegistry) — gunakan `permissionKey` yang spesifik untuk halaman tersebut (`<key>:view`)
2. Tambahkan permission baru di `backend/src/db/seed.ts` (`<key>:menu` + `<key>:view`)
3. Tambahkan entry di `src/config/menu.tsx` (NAV_ITEMS) — gunakan `permissionKey: '<key>:menu'` — **jangan reuse key parent**
4. Tambahkan MSW handler di `src/mocks/handlers/` jika halaman butuh data mock
5. Set `ready=true` di `page.handler.ts`
6. Bungkus halaman/menu item dengan PermissionGuard sesuai permission string
