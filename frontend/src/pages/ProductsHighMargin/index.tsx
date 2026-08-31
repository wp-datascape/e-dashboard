// frontend/src/pages/ProductsHighMargin/index.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import MuiTooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useHighMarginProductDetail, useUpsellTargets } from '@/hooks/useProducts'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { RangeFilter } from '@/components/filters/RangeFilter'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import type {
  HighMarginProductRow,
  HighMarginDetailParams,
  UpsellTargetRow,
  UpsellTargetParams,
  CategoryRef,
} from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { StatusChip, ChipOverflowCell } from '@/components/ui'
import { formatRupiah } from '@/utils/format'
import { UpsellCustomerDialog } from './components/UpsellCustomerDialog'
import { CategoryProductsDialog } from '@/pages/Products/components/CategoryProductsDialog'
import { ProductBreakdownDialog } from './components/ProductBreakdownDialog'
import type { ProductBreakdownTarget } from './components/ProductBreakdownDialog'

function todayMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Penetration Bar ─────────────────────────────────────────────────────────
function PenetrationBar({ value }: { value: number }) {
  const color = value >= 40 ? 'success' : value >= 20 ? 'warning' : 'error'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={color}
        sx={{ flex: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
        {value.toFixed(1)}%
      </Typography>
    </Box>
  )
}

// ─── Shared Filter Props ──────────────────────────────────────────────────────
// FilterState/HighMarginProductTab/UpsellTargetsTab diekspor (2026-08-26,
// task031.md §10 — instruksi user: "pindahkan ke menu laporan", digabung
// jadi sub-tab Report/Revenue "hm" bareng Ranking Customer M5 yang sudah
// ada) — dipakai ULANG oleh Report/Revenue/index.tsx, BUKAN diduplikasi.
export interface FilterState {
  companyId: number | 'all'
  branchId: number | 'all'
  // Division sekarang FK integer per company (task012 v2) — division_id, bukan
  // string key lagi.
  division: number | ''
  periodMonth: string
  activeWindow: number
  excludeIntercompany: boolean
  // periodStart (2026-08-31, laporan user: "makanya aku menyuruh pakai
  // filter global itu karena hal seperti ini") — lihat komentar
  // HighMarginDetailParams.period_start (types/products.ts). Opsional -
  // ProductsHighMargin/index.tsx (halaman standalone, RangeFilter sendiri)
  // TIDAK mengisi ini, TETAP pakai activeWindow trailing spt semula.
  // Report/Revenue/index.tsx (reuse komponen ini) MENGISI dengan
  // `periodStart` filter global yang SAMA dipakai Revenue/GP/M5.
  periodStart?: string
  // onlyPareto (2026-08-31, laporan user: "cek dan perbaiki filter lain di
  // halaman sama") — lihat komentar HighMarginDetailParams.only_pareto
  // (types/products.ts). Opsional - halaman standalone ini tidak punya
  // toggle Pareto sama sekali, TIDAK mengisi ini.
  onlyPareto?: boolean
}

// ─── Tab 1a: Product Penetration (DEFAULT — high margin adalah flag per-produk,
// bukan per-kategori, lihat catatan backend di fetchHmProductDetail()) ────────
export function HighMarginProductTab({ filter }: { filter: FilterState }) {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })
  const [selectedProduct, setSelectedProduct] = useState<ProductBreakdownTarget | null>(null)

  const params: HighMarginDetailParams = {
    company_id:    filter.companyId,
    branch_id:     filter.branchId === 'all' ? undefined : filter.branchId,
    division:      filter.division || undefined,
    exclude_intercompany: filter.excludeIntercompany,
    period_month:  filter.periodMonth,
    active_window: filter.activeWindow,
    period_start:  filter.periodStart,
    only_pareto:   filter.onlyPareto,
    page: pagination.page + 1,
    per_page: pagination.pageSize,
  }

  const { data, isLoading, error } = useHighMarginProductDetail(params)

  const columns: GridColDef<HighMarginProductRow>[] = [
    {
      field: 'product_name',
      headerName: t('products.drawer.colProductName'),
      flex: 1,
      minWidth: 180,
      sortable: false,
    },
    {
      field: 'penetration_rate',
      headerName: t('productsHighMargin.penetrationRate'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => <PenetrationBar value={row.penetration_rate} />,
    },
    {
      field: 'customer_count',
      headerName: t('productsHighMargin.customersBuying'),
      width: 160,
      type: 'number',
      sortable: false,
      renderCell: ({ row }) => (
        <Typography variant="body2">
          {row.customer_count} / {row.total_active_customers}
        </Typography>
      ),
    },
    {
      field: 'total_revenue',
      headerName: t('products.totalRevenue'),
      width: 150,
      type: 'number',
      sortable: false,
      valueFormatter: (value) => formatRupiah(value as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.totalGP'),
      width: 140,
      type: 'number',
      sortable: false,
      valueFormatter: (value) => formatRupiah(value as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.gpMargin'),
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <StatusChip label={`${row.gp_margin_percent.toFixed(1)}%`} color="success" />
      ),
    },
    {
      field: 'assign_to',
      headerName: t('productsHighMargin.assignTo'),
      flex: 1.2,
      minWidth: 150,
      sortable: false,
      // 1 chip saja gabungan semua divisi ("Distribution + Project"), BUKAN
      // 1 chip per divisi ditumpuk — permintaan user, chip banyak numpuk susah
      // dibaca di kolom sempit.
      renderCell: ({ row }) => (
        row.assign_to.length > 0
          ? <Chip size="small" label={row.assign_to.map((d) => d.label).join(' + ')} variant="outlined" />
          : null
      ),
    },
  ]

  return (
    <>
      <ResponsiveListView
        rows={data?.data ?? []}
        columns={columns}
        rowCount={data?.meta.total ?? 0}
        loading={isLoading}
        error={error as Error | null}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[25, 50, 100]}
        height={500}
        onRowClick={(row) => {
          const r = row as unknown as HighMarginProductRow
          setSelectedProduct({ product_id: r.product_id, product_name: r.product_name })
        }}
      />

      <ProductBreakdownDialog
        product={selectedProduct}
        companyId={filter.companyId}
        branchId={filter.branchId === 'all' ? undefined : filter.branchId}
        division={filter.division || undefined}
        periodMonth={filter.periodMonth}
        activeWindow={filter.activeWindow}
        excludeIntercompany={filter.excludeIntercompany}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  )
}

// ─── Tab 2: Upsell Targets ────────────────────────────────────────────────────
export function UpsellTargetsTab({ filter }: { filter: FilterState }) {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })

  // Drawer: customer purchase history (row click or categories_bought chip click)
  const [drawerCustomer,  setDrawerCustomer]  = useState<UpsellTargetRow | null>(null)
  const [drawerCatFilter, setDrawerCatFilter] = useState<CategoryRef | null>(null)

  // Drawer: HM category products (missing_high_margin_categories chip click)
  const [hmCategoryDrawer, setHmCategoryDrawer] = useState<CategoryRef | null>(null)

  const openHistory = (row: UpsellTargetRow, cat: CategoryRef | null, e?: React.MouseEvent<HTMLDivElement>) => {
    e?.stopPropagation()
    setDrawerCustomer(row)
    setDrawerCatFilter(cat)
  }

  const openHmCategory = (cat: CategoryRef, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setHmCategoryDrawer(cat)
  }

  const params: UpsellTargetParams = {
    company_id:    filter.companyId,
    branch_id:     filter.branchId === 'all' ? undefined : filter.branchId,
    period_month:  filter.periodMonth,
    active_window: filter.activeWindow,
    period_start:  filter.periodStart,
    only_pareto:   filter.onlyPareto,
    // division (2026-08-26, task031.md §4 — GANTI dari 'business_unit',
    // key backend yang lama tapi nilainya SUDAH divisi selama ini, cuma
    // salah nama key).
    division: filter.division || undefined,
    exclude_intercompany: filter.excludeIntercompany,
    page: pagination.page + 1,
    per_page: pagination.pageSize,
  }

  const { data, isLoading, error } = useUpsellTargets(params)

  const columns: GridColDef<UpsellTargetRow>[] = [
    {
      field: 'customer_code',
      headerName: t('customers.code'),
      width: 120,
      sortable: false,
      valueFormatter: (v) => (v as string) ?? '—',
    },
    {
      field: 'customer_name',
      headerName: t('customers.name'),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <Typography variant="body2">{row.customer_name}</Typography>
      ),
    },
    {
      // division_label (2026-08-26, task031.md §4 — GANTI dari
      // business_unit legacy) — nama Divisi dominan langsung dari backend
      // (bukan lagi kode enum B2B_DC/dst yang perlu di-mapping BuChip).
      field: 'division_label',
      headerName: t('customers.detail.businessUnit'),
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (row.division_label ? <StatusChip label={row.division_label} /> : '—'),
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('customers.detail.avgMonthly'),
      width: 150,
      type: 'number',
      sortable: false,
      valueFormatter: (value) => formatRupiah(value as number),
    },
    {
      field: 'categories_bought',
      headerName: t('productsHighMargin.categoriesBought'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      // ChipOverflowCell (2026-08-26, task031.md §9 — refactor, instruksi
      // user: "setiap chip HARUS bisa diklik, jangan sembunyikan di balik
      // tombol '+N' tanpa akses mudah") — preview 2 chip + tombol
      // "Tampilkan semua (N)" buka Popover berisi SEMUA chip (tetap bisa
      // diklik satu-satu), row height jadi seragam krn preview selalu
      // maks 2 chip. GANTI dari cap-3-chip-mentok (task031 §8) yang
      // MEMBUANG akses ke chip ke-4 dst.
      renderCell: ({ row }) => (
        <ChipOverflowCell
          items={row.categories_bought.map((cat) => ({
            id: cat.id,
            label: cat.name,
            tooltipText: cat.name,
            onClick: (e: React.MouseEvent<HTMLDivElement>) => openHistory(row, cat, e),
          }))}
        />
      ),
    },
    {
      field: 'missing_high_margin_categories',
      headerName: t('productsHighMargin.missingHighMargin'),
      flex: 1,
      minWidth: 240,
      sortable: false,
      // ChipOverflowCell — SAMA PERSIS pola kolom categories_bought di
      // atas. Label chip bawa persentase afinitas DI-BOLD (instruksi user
      // spec: "Include the percentage... bolded") — TruncatedChip terima
      // ReactNode utk label, tooltipText tetap plain string. Sudah
      // TERURUT DESC by affinity_pct dari backend query, jadi preview 2
      // chip pertama otomatis yang PALING relevan.
      renderCell: ({ row }) => (
        <ChipOverflowCell
          color="info"
          items={row.missing_high_margin_categories.map((cat) => ({
            id: cat.id,
            label: cat.affinity_pct > 0
              ? <>{cat.name} <Box component="span" sx={{ fontWeight: 800 }}>— {cat.affinity_pct}%</Box></>
              : cat.name,
            tooltipText: cat.affinity_pct > 0 ? `${cat.name} — ${cat.affinity_pct}%` : cat.name,
            onClick: (e: React.MouseEvent<HTMLDivElement>) => openHmCategory(cat, e),
          }))}
        />
      ),
    },
    {
      field: 'last_invoice_date',
      headerName: t('customers.lastTransaction'),
      width: 140,
      sortable: false,
    },
  ]

  return (
    <Box>
      {/* Tooltip metodologi (2026-08-26, task031.md — instruksi user
          "Tambahkan tooltip penjelasan" setelah diskusi soal validasi data/
          metode Target Upsell) — jelaskan divisi dominan + ambang 20
          pembeli + arti persentase afinitas, biar tidak jadi "kotak hitam"
          kalau ada yang tanya dasar rekomendasinya. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('productsHighMargin.tabUpsellTargets')}
        </Typography>
        <MuiTooltip
          title={t('productsHighMargin.upsellTooltipInfo')}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 340, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>
      <ResponsiveListView
        rows={data?.data ?? []}
        columns={columns}
        rowCount={data?.meta.total ?? 0}
        loading={isLoading}
        error={error as Error | null}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[25, 50, 100]}
        height={500}
        getRowHeight="auto"
        onRowClick={(row) => openHistory(row as unknown as UpsellTargetRow, null)}
        // Nama customer sebagai judul card mobile, bukan customer_code (kolom
        // pertama di tabel desktop) — customer_code jarang terisi di database.
        mobileFields={['customer_name', 'customer_code', 'division_label', 'avg_monthly_revenue', 'categories_bought', 'missing_high_margin_categories', 'last_invoice_date']}
      />

      {/* Customer purchase history dialog */}
      <UpsellCustomerDialog
        customer={drawerCustomer}
        filterCategory={drawerCatFilter}
        companyId={filter.companyId}
        branchId={filter.branchId === 'all' ? undefined : filter.branchId}
        division={filter.division || undefined}
        periodMonth={filter.periodMonth}
        activeWindow={filter.activeWindow}
        excludeIntercompany={filter.excludeIntercompany}
        onClose={() => { setDrawerCustomer(null); setDrawerCatFilter(null) }}
      />

      {/* HM category products dialog (missing HM chip click) */}
      <CategoryProductsDialog
        category={hmCategoryDrawer ? {
          category_id:   hmCategoryDrawer.id,
          category_name: hmCategoryDrawer.name,
          is_high_margin: true,
        } : null}
        companyId={filter.companyId}
        branchId={filter.branchId === 'all' ? undefined : filter.branchId}
        division={filter.division || undefined}
        periodMonth={filter.periodMonth}
        activeWindow={filter.activeWindow}
        excludeIntercompany={filter.excludeIntercompany}
        onClose={() => setHmCategoryDrawer(null)}
      />
    </Box>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsHighMargin() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  const [periodMonth,  setPeriodMonth]  = useState(todayMonth())
  const [activeWindow, setActiveWindow] = useState(6)

  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter

  const filter: FilterState = { companyId, branchId, division, periodMonth, activeWindow, excludeIntercompany }

  // Ambil seluruh produk HM (bukan hanya 1 halaman grid) untuk hitung summary
  // per_page dibatasi maksimal 100 oleh backend (metrics.schema.ts)
  const { data: summaryData } = useHighMarginProductDetail({
    company_id:    filter.companyId,
    branch_id:     filter.branchId === 'all' ? undefined : filter.branchId,
    division:      filter.division || undefined,
    exclude_intercompany: filter.excludeIntercompany,
    period_month:  filter.periodMonth,
    active_window: filter.activeWindow,
    page: 1,
    per_page: 100,
  })
  const productCount = summaryData?.meta.total ?? 0
  const avgPenetration = summaryData?.data.length
    ? summaryData.data.reduce((sum, r) => sum + r.penetration_rate, 0) / summaryData.data.length
    : 0
  // totalHmBuyers/totalActiveCustomers (2026-08-31, instruksi user: "tambahkan
  // summary total pembeli high margin di atas tabel produk penetration") —
  // scalar dari backend (meta.summary, SAMA di semua baris/halaman - lihat
  // komentar HmProductDbRow.total_hm_buyers), BUKAN dijumlah dari
  // summaryData.data (customer_count per baris tidak boleh dijumlah antar
  // produk, 1 customer bisa beli >1 produk HM -> double count).
  const hmSummary = summaryData?.meta.summary as {
    total_hm_buyers?: number; total_active_customers?: number
    total_hm_buyers_existing?: number; total_hm_buyers_new?: number
  } | undefined
  const totalHmBuyers = hmSummary?.total_hm_buyers ?? 0
  const totalActiveCustomers = hmSummary?.total_active_customers ?? 0
  // existing/new (2026-08-31, instruksi user: "buat 2 kartu, 1 existing
  // active, 1 new customer, total yang membeli active transacting" - susulan
  // laporan "kenapa di card 24 di tabel 25, itu inkonsistensi") — pecahan
  // totalHmBuyers, SELALU existing+new = totalHmBuyers (lihat komentar
  // backend HmProductDbRow.total_hm_buyers_existing/_new).
  const totalHmBuyersExisting = hmSummary?.total_hm_buyers_existing ?? 0
  const totalHmBuyersNew = hmSummary?.total_hm_buyers_new ?? 0

  return (
    <Box sx={{ p: 3 }}>
      {/* Header + Filter */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}>
        <Box>
          <Typography variant="pageTitle" sx={{ mb: 0.5 }}>
            {t('productsHighMargin.title')}
          </Typography>
          <Typography variant="pageSubtitle">
            {t('productsHighMargin.subtitle')}
          </Typography>
        </Box>

        {/* Box+gap, BUKAN Stack+spacing — Stack pakai margin negatif utk spacing yang
            tidak menangani jarak antar-baris dengan benar saat flexWrap:'wrap' aktif
            (keterbatasan dikenal MUI), field yang wrap ke baris baru jadi nempel/numpuk
            tanpa jarak vertikal. gap CSS di Box menangani kedua arah (row+column) dengan
            benar meski wrap. 8 halaman lain yang pakai ScopeFilterFields sudah benar
            pakai pola ini - cuma halaman ini yang masih pakai Stack lama. */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />

          <MonthYearPicker
            size="small" label={t('common.filters.period')}
            value={periodMonth}
            onChange={setPeriodMonth}
            sx={{ width: { xs: '100%', sm: 150 } }}
          />

          <RangeFilter value={activeWindow} onChange={setActiveWindow} />

          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

      {/* Summary chips */}
      {productCount > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <StatusChip label={t('productsHighMargin.summaryProducts', { count: productCount })} color="warning" />
          <StatusChip label={t('productsHighMargin.summaryAvgPenetration', { pct: avgPenetration.toFixed(1) })} color="info" />
          <StatusChip label={t('productsHighMargin.summaryTotalBuyers', { buyers: totalHmBuyers.toLocaleString('id-ID'), total: totalActiveCustomers.toLocaleString('id-ID') })} color="success" />
          <StatusChip label={t('productsHighMargin.summaryExistingBuyers', { count: totalHmBuyersExisting.toLocaleString('id-ID') })} color="default" />
          <StatusChip label={t('productsHighMargin.summaryNewBuyers', { count: totalHmBuyersNew.toLocaleString('id-ID') })} color="default" />
        </Stack>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('productsHighMargin.tabCategories')} />
        <Tab label={t('productsHighMargin.tabUpsellTargets')} />
      </Tabs>

      {activeTab === 0 && <HighMarginProductTab filter={filter} />}
      {activeTab === 1 && <UpsellTargetsTab filter={filter} />}
    </Box>
  )
}
