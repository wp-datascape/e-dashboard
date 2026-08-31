// frontend/src/pages/Products/index.tsx
import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { StatusChip } from '@/components/ui'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'
import { useProductPerformance, useProductCategoryOptions } from '@/hooks/useProducts'
import { useItemTypeValues } from '@/hooks/useItemTypes'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { useCan } from '@/hooks/useCan'
import { productsApi } from '@/api/products.api'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { RangeFilter } from '@/components/filters/RangeFilter'
import { FILTER_FIELD_WIDTH } from '@/components/filters/filterFieldWidth'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import type { ProductPerformanceRow, ProductPerformanceParams } from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { ExportFieldsDialog } from './components/ExportFieldsDialog'
import { formatRupiah } from '@/utils/format'
import { formatMonthYearLabel } from '@/utils/date'

function todayMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function MarginChip({ pct }: { pct: number }) {
  const color: 'success' | 'warning' | 'default' = pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return <StatusChip label={`${pct.toFixed(1)}%`} color={color} />
}

export default function Products() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const can = useCan()
  const canExport = can('product:export')

  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter
  const [periodMonth,     setPeriodMonth]     = useState(todayMonth())
  const [activeWindow,    setActiveWindow]    = useState(6)
  const [search,          setSearch]          = useState('')
  const [itemType,        setItemType]        = useState<string>('all')
  const [categoryId,      setCategoryId]      = useState<number | 'all'>('all')
  const [exporting,       setExporting]       = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  // advancedOpen (2026-08-30, instruksi user: "rapikan filter" — sebelumnya
  // 8 kontrol filter ditumpuk 1 baris wrap, tidak konsisten dgn pola halaman
  // lain di app ini (Transactions/Growth/Retention/Revenue: Entity+Periode
  // selalu tampil, sisanya di balik "Filter Lanjutan")). BUKAN reuse
  // `AdvancedFilterBar`/`useAdvancedFilterBar` sharednya - itu field set-nya
  // FIXED (Period+applyDateCutoff+Pareto, tidak ada Item Type/Kategori/
  // Jendela Aktif/High Margin di halaman ini), jadi toggle+Collapse lokal
  // saja - filter TETAP apply langsung tiap ganti value (bukan staged
  // Terapkan/Reset spt AdvancedFilterBar, itu diluar scope "rapikan").
  const [advancedOpen,    setAdvancedOpen]    = useState(false)
  const [highMarginOnly,  setHighMarginOnly]  = useState(false)
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'total_revenue', sort: 'desc' },
  ])

  const itemTypeFilter = itemType === 'all' ? undefined : itemType
  const { data: categoryOptions = [] } = useProductCategoryOptions(companyId, itemTypeFilter)

  const { data: itemTypeOptionsRaw = [] } = useItemTypeValues(companyId)
  // companyId==='all' balikin union lintas company - dedupe by key (mirror fix
  // yang sama di Config/Classification/index.tsx, kasus yang sama persis).
  const itemTypeOptions = useMemo(() => {
    const seen = new Set<string>()
    return itemTypeOptionsRaw.filter((opt) => {
      if (seen.has(opt.key)) return false
      seen.add(opt.key)
      return true
    })
  }, [itemTypeOptionsRaw])

  const queryParams: ProductPerformanceParams = {
    company_id:      companyId,
    branch_id:       branchId === 'all' ? undefined : branchId,
    division:        division || undefined,
    item_type:       itemTypeFilter,
    category_id:     categoryId === 'all' ? undefined : categoryId,
    period_month:    periodMonth,
    active_window:   activeWindow,
    search:          search || undefined,
    high_margin_only: highMarginOnly || undefined,
    exclude_intercompany: excludeIntercompany,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: (sortModel[0]?.field as ProductPerformanceParams['sort_by']) ?? 'total_revenue',
    sort_dir: (sortModel[0]?.sort as 'asc' | 'desc') ?? 'desc',
  }

  const { data, isLoading, error } = useProductPerformance(queryParams)

  // Info periode di header tabel (2026-08-31, instruksi user: "tambahkan
  // info periode sebagai judul di tabel product dan customer") — halaman
  // ini cuma filter bulan tunggal (bukan Kuartal/Semester/Tahunan spt
  // Transactions/Report), jadi formatnya "Agustus 2026" polos.
  const periodLabel = formatMonthYearLabel(periodMonth)

  // Dialog pilih field (2026-08-31, instruksi user: "expor produk belum ada
  // fitur pilih field seperti transaksi") — buka dialog dulu, download
  // beneran baru dipicu dari tombol Export DI DALAM dialog itu, pola sama
  // persis Transactions/index.tsx. Filter SAMA PERSIS queryParams minus
  // page/per_page/sort_by/sort_dir, supaya export selalu representasi
  // PENUH dari filter yang lagi aktif di tabel.
  const handleExport = async (fields: string[]) => {
    setExporting(true)
    try {
      await productsApi.exportProductPerformance({
        company_id: companyId,
        branch_id: branchId === 'all' ? undefined : branchId,
        division: division || undefined,
        item_type: itemTypeFilter,
        category_id: categoryId === 'all' ? undefined : categoryId,
        period_month: periodMonth,
        active_window: activeWindow,
        search: search || undefined,
        high_margin_only: highMarginOnly || undefined,
        exclude_intercompany: excludeIntercompany,
      }, fields)
      setExportDialogOpen(false)
    } catch {
      enqueueSnackbar(t('products.exportError'), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const columns: GridColDef<ProductPerformanceRow>[] = [
    {
      field: 'product_name',
      headerName: t('products.productName'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{row.product_name}</Typography>
          {row.is_high_margin && (
            <StatusChip label={t('products.highMarginBadge')} color="info" />
          )}
        </Box>
      ),
    },
    {
      field: 'category_name',
      headerName: t('products.categoryName'),
      width: 200,
      sortable: false,
      valueFormatter: (value) => (value as string) ?? '—',
    },
    {
      field: 'total_revenue',
      headerName: t('products.totalRevenue'),
      width: 160,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatRupiah(value as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.totalGP'),
      width: 150,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatRupiah(value as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.gpMargin'),
      width: 130,
      sortable: true,
      renderCell: ({ row }) => <MarginChip pct={row.gp_margin_percent} />,
    },
    {
      field: 'customer_count',
      headerName: t('products.customerCount'),
      width: 130,
      type: 'number',
      sortable: true,
    },
    {
      field: 'invoice_count',
      headerName: t('products.invoiceCount'),
      width: 120,
      type: 'number',
      sortable: false,
    },
    {
      field: 'last_sold_month',
      headerName: t('products.lastSoldMonth'),
      width: 140,
      sortable: false,
      valueFormatter: (value) => (value as string) ?? '-',
    },
  ]

  return (
    // display:flex/gap:3 (BUKAN `p:3` seperti sebelumnya) — pola SAMA PERSIS
    // Transactions/Growth/Retention (lihat AdvancedFilterBar-based pages):
    // `<main>` (DashboardLayout.tsx) SUDAH kasih padding p:3 ke SEMUA halaman,
    // `p:3` di sini dobel jadi 48px (laporan user: "jarak judul halaman lebih
    // jauh dibanding transaksi" - dikonfirmasi lewat screenshot perbandingan).
    // gap:3 di flex column ini yang gantikan SEMUA margin manual (mb/mt) antar
    // section - konsisten dgn jarak antar section di halaman lain.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Judul + quick bar (Entity+Periode selalu tampil, pola sama AdvancedFilterBar
          dipakai halaman lain) */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="pageTitle" sx={{ mb: 0.5 }}>
            {t('products.title')}
          </Typography>
          <Typography variant="pageSubtitle">
            {t('products.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
          <ScopeFilterFields filter={scopeFilter} fields={['entity']} />

          <MonthYearPicker
            size="small" label={t('common.filters.period')}
            value={periodMonth}
            onChange={setPeriodMonth}
            // minWidth (bukan width tetap) — format tampilan "MMMM YYYY" (mis.
            // "Agustus 2026", nama bulan penuh) butuh ruang lebih dari
            // FILTER_FIELD_WIDTH (160px, dipatok utk field DatePicker biasa yang
            // formatnya lebih pendek) - width tetap bikin teksnya kepotong,
            // minWidth biarkan melebar secukupnya (laporan user: "tampilan
            // periode terputus, tidak terbaca total").
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: FILTER_FIELD_WIDTH } }}
          />

          <Button
            size="small"
            color="inherit"
            startIcon={advancedOpen ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
            onClick={() => setAdvancedOpen((v) => !v)}
            sx={{ textTransform: 'none' }}
          >
            {t('common.filters.advancedFilters')}
          </Button>
        </Box>
      </Box>

      {/* Filter Lanjutan (2026-08-30, instruksi user: "rapikan filter") — Cabang/
          Divisi/Item Type/Kategori/Jendela Aktif/High Margin/Exclude Intercompany,
          TETAP apply langsung tiap ganti value (bukan staged Terapkan/Reset). */}
      <Collapse in={advancedOpen}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <ScopeFilterFields filter={scopeFilter} fields={['branch', 'division']} />

            <TextField
              select size="small" label={t('products.filterItemTypeLabel')}
              value={itemType}
              onChange={(e) => {
                // Kategori tergantung Item Type (cascading) - reset supaya tidak nyangkut
                // kategori dari item type sebelumnya yang mungkin sudah tidak relevan.
                setItemType(e.target.value as typeof itemType)
                setCategoryId('all')
                setPaginationModel((p) => ({ ...p, page: 0 }))
              }}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            >
              <MenuItem value="all">{t('products.allItemTypes')}</MenuItem>
              {itemTypeOptions.map((opt) => (
                <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              select size="small" label={t('products.filterCategoryLabel')}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                setPaginationModel((p) => ({ ...p, page: 0 }))
              }}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            >
              <MenuItem value="all">{t('products.allCategories')}</MenuItem>
              {categoryOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>

            <RangeFilter value={activeWindow} onChange={setActiveWindow} sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }} />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={highMarginOnly}
                  onChange={(e) => { setHighMarginOnly(e.target.checked); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                  size="small"
                />
              }
              label={t('products.highMarginBadge')}
              sx={{ ml: 0, whiteSpace: 'nowrap' }}
            />

            <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
          </Box>
        </Box>
      </Collapse>

      {/* DataGrid — search dipindah ke header tabel (2026-08-30, instruksi
          user: "search bar di header tabel"), pola sama Transactions/Growth/
          Retention, bukan TextField berdiri sendiri di luar tabel lagi. */}
      <ResponsiveListView
        rows={data?.data ?? []}
        columns={columns}
        rowCount={data?.meta.total ?? 0}
        loading={isLoading}
        error={error as Error | null}
        paginationMode="server"
        sortingMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[25, 50, 100]}
        height={600}
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPaginationModel((p) => ({ ...p, page: 0 })) },
          placeholder: t('products.searchProductLabel'),
        }}
        periodLabel={(
          <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t('products.periodHeading', { period: periodLabel })}
          </Typography>
        )}
        actions={canExport && (
          <Tooltip title={t('products.exportExcel')} placement="top">
            <span>
              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setExportDialogOpen(true)} disabled={exporting}>
                {exporting ? <CircularProgress size={18} /> : <DownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      />

      {canExport && (
        <ExportFieldsDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExport}
          exporting={exporting}
        />
      )}
    </Box>
  )
}
