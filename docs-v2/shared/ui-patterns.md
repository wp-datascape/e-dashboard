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

**Auto-hide kalau semua item hidden (fix sesi 32):** `ActionMenu` menghitung `visible = items.filter(!item.hidden)` — kalau `visible.length === 0`, komponen `return null` (tombol "Actions" sama sekali tidak dirender). Sebelum fix ini, tombol tetap muncul walau dropdown-nya bakal kosong (role yang cuma punya `:view`, tanpa `create/update/delete`) — begitu diklik user cuma lihat dropdown hampa, UX membingungkan. Behavior ini otomatis berlaku di semua pemakaian `ActionMenu`, tidak perlu setup tambahan per halaman.

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

## Dialog — Satu-satunya Komponen Modal yang Boleh Dipakai

**Wajib** — semua modal/dialog di aplikasi harus pakai `Dialog` dari `@/components/ui`, jangan import `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` langsung dari MUI. Sebelum audit sesi 34, ada 6 dialog dan 4 drawer detail yang pakai MUI langsung dengan style beda-beda (sudut persegi vs bulat, border title-content ada/tidak, padding action tidak seragam) — semua sudah dimigrasikan.

```tsx
import { Dialog } from '@/components/ui'

<Dialog
  open={open}
  onClose={onClose}
  title={t('feature.dialogTitle')}
  maxWidth="sm"
  actions={[
    { label: t('common.cancel'), onClick: onClose, variant: 'text' },
    { label: t('common.save'), onClick: handleSave, isLoading: isPending },
  ]}
>
  {/* form fields / content */}
</Dialog>
```

**Props tambahan (sesi 34) untuk kasus dialog "detail/drill-down" yang butuh header lebih kaya:**

| Prop | Type | Default | Kapan dipakai |
|------|------|---------|----------------|
| `subtitle` | `ReactNode` | — | Konten sekunder di title bar (mis. ringkasan statistik di dialog drill-down M4/M5/M6, atau baris info tambahan di bawah judul) |
| `headerActions` | `ReactNode` | — | Icon button tambahan di title bar, di sebelah kiri tombol close (mis. tombol export PDF) |
| `showCloseButton` | `boolean` | `false` | Tampilkan tombol X (`CloseIcon`) di title bar. **Default `false`** — dialog yang sudah punya tombol Cancel/Close di footer (`actions` prop) biasanya tidak butuh X juga, supaya tidak ada dua cara redundan untuk menutup dialog |

```tsx
// Pola dialog "lihat info, tidak ada form" (dulu drawer) — showCloseButton, tanpa actions footer
<Dialog
  open={!!selectedId}
  onClose={onClose}
  maxWidth="md"
  title={t('feature.detailTitle')}
  subtitle={<Typography variant="body2" color="text.secondary">{summary}</Typography>}
  headerActions={<IconButton size="small" onClick={handleExportPdf}><DownloadOutlinedIcon /></IconButton>}
  showCloseButton
>
  <ResponsiveListView rows={rows} columns={columns} />
</Dialog>
```

**Lokasi:** `src/components/ui/Dialog/Dialog.tsx`

### Drawer → Dialog untuk Tampilan Detail (fix sesi 34)

**Jangan pakai MUI `Drawer` (`anchor="right"`) untuk menampilkan detail satu row/item** (invoice, customer, kategori produk, dst). Drawer full-height dari tepi kanan bermasalah di mobile: lebar dipaksa 100% viewport (`slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}`), ketutup keyboard virtual saat ada input di dalamnya, dan pengalaman scroll berbeda dari dialog biasa. 4 drawer detail (`InvoiceDetailDrawer`, `CategoryProductsDrawer`, `UpsellCustomerDrawer`, `CustomerDetailDrawer`) sudah dikonversi ke `Dialog` — 3 jadi `*Dialog.tsx` baru, 1 (`CustomerDetailDrawer`) ternyata kode mati (tidak diimport di mana pun, sudah lama digantikan `CustomerDetailDialog.tsx`) dan dihapus.

Pola konversi: `<Drawer anchor="right">` dengan header custom (`Box` flex + `IconButton` close manual pakai karakter `✕`) → `<Dialog>` dengan `title`+`subtitle`+`showCloseButton`, isi drawer (`DialogContent`/`ResponsiveListView`) jadi `children` Dialog langsung.

**Kalau butuh panel slide-in yang genuinely bukan "detail satu item"** (misalnya navigasi sidebar mobile), `Drawer` tetap komponen yang tepat — larangan ini spesifik untuk pola "tampilkan detail row yang diklik".

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

## Filter Bar — Box+gap, BUKAN Stack+spacing (fix sesi 39)

Container filter yang bisa **wrap** ke baris baru di layar sempit (mis. deretan `ScopeFilterFields` + `DatePicker` + `Select` di header halaman) **WAJIB** pakai `Box` dengan CSS `gap`, bukan `Stack` dengan prop `spacing`.

```tsx
// ✅ Benar
<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
  <ScopeFilterFields filter={scopeFilter} />
  <DatePicker ... />
</Box>

// ❌ Salah — Stack+spacing TIDAK menangani jarak antar-baris dengan benar saat wrap
<Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
  <ScopeFilterFields filter={scopeFilter} />
  <DatePicker ... />
</Stack>
```

**Kenapa:** `Stack` implementasi `spacing` pakai margin negatif pada children, cuma didesain untuk 1 baris. Begitu `flexWrap:'wrap'` aktif dan child jatuh ke baris baru, margin itu tidak menghasilkan jarak VERTIKAL yang benar antar baris (keterbatasan dikenal MUI) — field yang wrap nempel langsung ke field di baris atasnya (label field baru bertumpuk sama border field sebelumnya). `Box` + CSS `gap` menangani kedua arah (row-gap dan column-gap) dengan benar, termasuk saat wrap.

Field individual di dalam container ber-wrap juga harus `width:{xs:'100%', sm:<value>}`, bukan cuma `minWidth` — lihat `ScopeFilterFields.tsx` untuk pola lengkapnya (field 100% lebar di mobile otomatis "memaksa" baris baru sendiri lewat `flexWrap`, hasilnya stack rapi 1 kolom tanpa perlu ubah `direction` parent).

## Custom Typography Variant — Wajib Daftar `variantMapping` (fix sesi 39)

Kalau nambah custom Typography variant (module augmentation `@mui/material/styles`, contoh: `pageTitle`/`pageSubtitle` di `theme/index.ts`), variant itu **TIDAK otomatis** dapat elemen HTML semantik seperti variant bawaan MUI (`h1`-`h6`→`<h1>`-`<h6>`, `body1`/`body2`→`<p>`, dst).

```ts
// theme/index.ts — WAJIB daftar variantMapping, bukan cuma definisi style di typography object
components: {
  MuiTypography: {
    defaultProps: {
      variantMapping: {
        pageTitle: 'h1',
        pageSubtitle: 'p',
      },
    },
  },
},
```

**Kenapa:** tanpa `variantMapping`, MUI fallback render variant custom sebagai `<span>` (elemen **inline**). Dua `Typography` custom-variant yang berurutan (mis. judul + subjudul halaman) akan nempel di baris yang sama, bukan bertumpuk ke bawah seperti `h5`+`body2` sebelumnya — bug ini baru kelihatan setelah deploy, tidak ketauan dari `tsc`/lint karena secara TYPE valid.

## flexShrink:0 — Elemen Fixed-Size di Dalam Flex Container yang Bisa Kehabisan Ruang (fix sesi 39)

Elemen dengan `width`/`height` eksplisit (bukan responsif) yang duduk di dalam flex container yang **bisa kehabisan ruang** di viewport sempit (contoh nyata: `ThemeToggle` di `AppBar` Toolbar mobile — menu+judul+toggle+avatar berdesakan di 390px) **wajib** `flexShrink: 0`.

```tsx
sx={{
  width: 64,
  height: 32,
  flexShrink: 0,  // wajib - tanpa ini width:64 cuma jadi flex-basis, TETAP bisa dikompres
  ...
}}
```

**Kenapa:** default `flexShrink` flex item adalah `1` — kalau total children flex container lebih lebar dari ruang tersedia, browser boleh mengompres SEMUA children dengan `flexShrink>0` secara proporsional, TERMASUK yang sudah punya `width` eksplisit (`width` di situasi ini cuma jadi *flex-basis*, titik awal sebelum shrink dihitung, bukan jaminan ukuran final). Kalau elemen itu punya child dengan posisi `absolute` + offset piksel TETAP di dalamnya (pola umum toggle/slider/knob), hasil kompresi sub-piksel bikin child itu tidak lagi presisi di posisi yang di-desain — gejalanya baru kelihatan bedanya kalau dibandingkan LANGSUNG dengan viewport yang tidak kena kompresi (mis. desktop vs mobile side-by-side), sulit ketauan cuma dari 1 viewport.

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

### ResponsiveContainer — `debounce` Dibedakan Per Widget (fix sesi 39)

Semua widget di atas render `<ResponsiveContainer debounce={N}>` dengan nilai `N` **berbeda-beda per tipe widget** (50-380ms, lihat masing-masing file komponen) — BUKAN kebetulan/tidak konsisten, ini sengaja.

**Kenapa:** halaman dengan banyak chart sekaligus (mis. Customer Metrics, 5+ widget) yang semua pakai `debounce` SAMA bikin semua chart redraw di tick JS yang (nyaris) sama persis saat parent resize (mis. toggle sidebar) — menumpuk jadi satu long-task besar (terukur: 100ms, setara 6x waktu frame normal, jeda kelihatan). Nilai debounce yang di-stagger menyebarkan redraw ke beberapa frame terpisah.

**Rule:** kalau nambah widget chart baru yang dipakai di halaman dengan chart lain, jangan reuse nilai debounce yang sama persis dengan widget lain di halaman yang sama — pilih nilai yang belum dipakai (rentang 50-400ms cukup, di bawah durasi transisi UI yang memicunya).

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

- **Desktop** (`>= md`, 900px — dinaikkan dari `sm`/600px sesi 33): render `MUI X DataGrid` — pagination, sorting, filter
- **Mobile/tablet** (`< md`): render card list auto-generated dari column definitions
- **Semua state built-in**: loading skeleton (responsive), error alert, empty state

**Breakpoint `sm`→`md` (fix sesi 33):** tablet portrait (mis. iPad ~768px logical width) masih di atas breakpoint `sm` (600px) tapi `DataGrid` multi-kolom tetap tidak muat tanpa scroll horizontal canggung. Breakpoint dinaikkan ke `md` (900px), disamakan dengan breakpoint yang sudah dipakai `DashboardLayout` untuk switch sidebar temporary/permanent — supaya konsisten "apa yang dianggap tablet" di seluruh app.
Server-side pagination wajib untuk dataset besar -- jangan paginate di client.
Column definition diletakkan dekat halaman pemakainya, baru dipindah ke shared jika dipakai >= 2 halaman.

### Mobile: Auto-generated Card List via ResponsiveListView

Gunakan `ResponsiveListView` dari `@/components/tables/ResponsiveListView` — satu komponen yang secara otomatis:

- **Desktop** → render `DataGrid` (sama seperti `DataTable`)
- **Mobile/tablet** (`< md` breakpoint) → render daftar `Card`, auto-generate dari column definitions

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

### Table Manual (bukan ResponsiveListView) — Wajib Fallback Kartu Mobile Sendiri

Beberapa halaman (mis. `Settings/Threshold`) render tabel ringkas manual (`<Table>` MUI langsung) untuk data non-tabular besar seperti daftar konfigurasi — bukan pakai `ResponsiveListView`. Tabel manual **tidak otomatis dapat fallback mobile** seperti `ResponsiveListView` — kalau dibiarkan render `<Table>` di semua breakpoint, kolom deskripsi panjang meluber keluar batas card di layar sempit (ditemukan sesi 33 di section "KPI Target" Threshold Settings — section "BU Threshold" di halaman yang sama sudah benar pakai pola ini).

**Pola wajib:**
```tsx
<Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'auto' }}>
  <Table size="small">...</Table>
</Box>

<Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
  {items.map((item) => (
    <Card key={item.key} sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
          {/* editable cell / chip di sini */}
        </Box>
        <Typography variant="caption" color="text.secondary">{item.description}</Typography>
      </Stack>
    </Card>
  ))}
</Stack>
```

Table dan Stack-kartu sama-sama dirender di JSX (bukan conditional JS `isMobile ? ... : ...`) — CSS `display` yang switch, konsisten dengan pola breakpoint lain di app.

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

## Sidebar — Submenu Flyout saat Collapsed/Mini (fix 2026-07-02)

`NavGroup` (item dengan `children`, misal grup Settings/Config/Access Control) dulunya, saat sidebar collapsed, cuma render satu ikon dan **hardcode navigasi ke `visibleChildren[0]`** — child ke-2 dst tidak bisa diakses sama sekali (tidak ada mekanisme lain untuk expose-nya).

Fix: saat collapsed, klik ikon grup membuka MUI `Menu` (popover flyout) berisi seluruh `visibleChildren`, bukan langsung navigasi:

```tsx
// Sidebar.tsx — NavGroup, cabang collapsed
const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

if (collapsed) {
  return (
    <>
      <Tooltip title={t(item.labelKey)} placement="right" arrow>
        <ListItemButton onClick={(e) => setAnchorEl(e.currentTarget)} selected={anyChildActive} ...>
          <ListItemIcon>{item.icon}</ListItemIcon>
        </ListItemButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
        {visibleChildren.map((child) => (
          <MenuItem key={child.key} selected={...} onClick={() => { setAnchorEl(null); onNav(child.path) }}>
            <ListItemIcon>{child.icon}</ListItemIcon>
            {t(child.labelKey)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
```

Mode full (sidebar terbuka) tidak berubah — tetap pakai `Collapse` inline (`expanded` state, toggle on click) seperti sebelumnya. Flyout `Menu` cuma untuk mode collapsed karena tidak ada ruang untuk expand inline.

**Rule**: kalau nambah `NavItem` baru dengan `children` (grup submenu), fitur flyout ini otomatis berlaku — tidak perlu setup tambahan, cukup pastikan tiap child punya `icon` (dipakai sebagai `ListItemIcon` di dalam `MenuItem`).

## AppLogo — Outline Putih Murni, Transparan (fix sesi 39)

`AppLogo.tsx` (four-leaf clover) dan `public/favicon.svg` (sumber PWA icon PNG) render murni **outline putih** (`fill="none"` di semua elemen — lingkaran pembungkus DAN bentuk semanggi), tidak ada fill solid apapun. Background transparan total.

**Konsekuensi WAJIB diperhatikan kalau logo dipakai di halaman/context baru:** outline putih murni HANYA kebaca di atas background gelap/berwarna (AppBar — selalu gelap/berwarna secara alami). Di atas background PUTIH/terang (`background.paper` light mode, mis. Login card), logo **hilang total** (putih di atas putih).

**Pola di context terang** (lihat `Login/index.tsx`): bungkus `AppLogo` dengan `Box` lingkaran gelap KHUSUS di halaman itu saja — jangan ubah `AppLogo.tsx` sendiri (AppBar tidak butuh bungkus ini).

```tsx
<Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#0a0a0f',
  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <AppLogo sx={{ fontSize: 22 }} />
</Box>
```

**Kalau ubah desain logo:** wajib sinkron 2 tempat (`AppLogo.tsx` untuk pemakaian inline React + `public/favicon.svg` untuk tab browser/PWA), lalu regenerate PNG turunannya (`public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) — PNG-PNG ini file terpisah, TIDAK otomatis ikut berubah kalau cuma SVG-nya diedit. `icon-maskable-512.png` beda kebutuhan (fill solid + background opaque wajib, OS crop ke bentuk lain dan transparansi bisa terlihat rusak) — jangan ikut disamakan ke gaya outline transparan. Script `scripts/gen-icons.mjs` yang ada di repo **STALE** (desain lightning-bolt lama sebelum clover) — jangan dipakai, generate manual pakai Playwright screenshot dari markup SVG yang sama.

## PWA — Safe Area Inset (Status Bar iOS) — fix sesi 33

`apple-mobile-web-app-status-bar-style: black-translucent` (di `index.html`) bikin status bar iOS jadi **overlay transparan** saat PWA dibuka standalone dari home screen — konten web meng-extend ke bawah status bar, bukan didorong turun otomatis. Elemen `position: fixed` di top (seperti `AppBar`) jadi ketutup status bar kalau tidak diberi padding.

**Pola wajib** untuk elemen fixed-top yang baru:
```tsx
sx={{
  // env() resolve ke 0 di browser/Android biasa — aman ditambah di mana saja,
  // tidak ada perubahan visual di luar konteks iOS PWA standalone
  paddingTop: 'env(safe-area-inset-top)',
}}
```

Kalau elemen fixed itu punya spacer terpisah untuk mendorong konten di bawahnya (pola umum MUI `AppBar` + `<Toolbar />` spacer), spacer-nya juga harus disesuaikan tinggi tambahannya (lihat `DashboardLayout.tsx`, `Sidebar.tsx` — `<Toolbar sx={{ mb: 'env(safe-area-inset-top)' }} />`), supaya tidak ada celah/tabrakan konten.

## New Page Checklist (wajib untuk setiap halaman baru)
1. Daftarkan route di `src/route/routeConstants.tsx` (routeRegistry) — gunakan `permissionKey` yang spesifik untuk halaman tersebut (`<key>:view`)
2. Tambahkan permission baru di `backend/src/db/seed.ts` (`<key>:menu` + `<key>:view`)
3. Tambahkan entry di `src/config/menu.tsx` (NAV_ITEMS) — gunakan `permissionKey: '<key>:menu'` — **jangan reuse key parent**
4. Tambahkan MSW handler di `src/mocks/handlers/` jika halaman butuh data mock
5. Set `ready=true` di `page.handler.ts`
6. Bungkus halaman/menu item dengan PermissionGuard sesuai permission string
