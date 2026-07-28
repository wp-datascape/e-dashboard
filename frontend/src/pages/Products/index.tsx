// frontend/src/pages/Products/index.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { StatusChip } from '@/components/ui'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useProductPerformance, useProductCategoryOptions } from '@/hooks/useProducts'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { DatePicker } from '@/components/ui/DatePicker'
import type { ProductPerformanceRow, ProductPerformanceParams } from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { formatIDR } from '@/utils/format'

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

  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter
  const [periodMonth,     setPeriodMonth]     = useState(todayMonth())
  const [activeWindow,    setActiveWindow]    = useState(6)
  const [search,          setSearch]          = useState('')
  const [itemType,        setItemType]        = useState<'all' | 'unit' | 'sparepart' | 'consumable' | 'service'>('all')
  const [categoryId,      setCategoryId]      = useState<number | 'all'>('all')
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
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.totalGP'),
      width: 150,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatIDR(value as number),
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
            {t('products.title')}
          </Typography>
          <Typography variant="pageSubtitle">
            {t('products.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
          <TextField
            size="small" label={t('products.searchProductLabel')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })) }}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          />

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
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value="all">{t('products.allItemTypes')}</MenuItem>
            <MenuItem value="unit">{t('products.itemTypeUnit')}</MenuItem>
            <MenuItem value="sparepart">{t('products.itemTypeSparepart')}</MenuItem>
            <MenuItem value="consumable">{t('products.itemTypeConsumable')}</MenuItem>
            <MenuItem value="service">{t('products.itemTypeService')}</MenuItem>
          </TextField>

          <TextField
            select size="small" label={t('products.filterCategoryLabel')}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value="all">{t('products.allCategories')}</MenuItem>
            {categoryOptions.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('common.filters.month')} type="month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          />

          <TextField
            select size="small" label={t('common.filters.activeWindow')}
            value={activeWindow}
            onChange={(e) => setActiveWindow(Number(e.target.value))}
            sx={{ minWidth: { xs: '100%', sm: 130 } }}
          >
            <MenuItem value={3}>{t('common.filters.window3Months')}</MenuItem>
            <MenuItem value={6}>{t('common.filters.window6Months')}</MenuItem>
            <MenuItem value={12}>{t('common.filters.window12Months')}</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={highMarginOnly}
                onChange={(e) => { setHighMarginOnly(e.target.checked); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                color="warning"
                size="small"
              />
            }
            label={t('products.highMarginBadge')}
            sx={{ ml: 0, whiteSpace: 'nowrap' }}
          />

          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

      {/* DataGrid */}
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
      />
    </Box>
  )
}
