// frontend/src/pages/ProductsHighMargin/index.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import LinearProgress from '@mui/material/LinearProgress'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useHighMarginDetail, useUpsellTargets } from '@/hooks/useProducts'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { DatePicker } from '@/components/ui/DatePicker'
import type {
  HighMarginCategoryRow,
  HighMarginDetailParams,
  UpsellTargetRow,
  UpsellTargetParams,
  CategoryRef,
} from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { StatusChip } from '@/components/ui'
import { BuChip } from '@/pages/Transactions/components/BuChip'
import { formatIDR } from '@/utils/format'
import { UpsellCustomerDialog } from './components/UpsellCustomerDialog'
import { CategoryProductsDialog } from '@/pages/Products/components/CategoryProductsDialog'

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
interface FilterState {
  companyId: number | 'all'
  branchId: number | 'all'
  division: string
  periodMonth: string
  activeWindow: number
}

// ─── Tab 1: Category Penetration ─────────────────────────────────────────────
function HighMarginCategoryTab({ filter }: { filter: FilterState }) {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })

  const params: HighMarginDetailParams = {
    company_id:    filter.companyId,
    branch_id:     filter.branchId === 'all' ? undefined : filter.branchId,
    division:      filter.division || undefined,
    period_month:  filter.periodMonth,
    active_window: filter.activeWindow,
    page: pagination.page + 1,
    per_page: pagination.pageSize,
  }

  const { data, isLoading, error } = useHighMarginDetail(params)

  const columns: GridColDef<HighMarginCategoryRow>[] = [
    {
      field: 'category_name',
      headerName: t('products.categoryName'),
      flex: 1,
      minWidth: 150,
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
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.totalGP'),
      width: 140,
      type: 'number',
      sortable: false,
      valueFormatter: (value) => formatIDR(value as number),
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
  ]

  return (
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
    />
  )
}

// ─── Tab 2: Upsell Targets ────────────────────────────────────────────────────
function UpsellTargetsTab({ filter }: { filter: FilterState }) {
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
    business_unit: filter.division || undefined,
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
      field: 'business_unit',
      headerName: t('customers.detail.businessUnit'),
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <BuChip bu={row.business_unit as import('@/types/customers').BusinessUnit} />,
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('customers.detail.avgMonthly'),
      width: 150,
      type: 'number',
      sortable: false,
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'categories_bought',
      headerName: t('productsHighMargin.categoriesBought'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
          {row.categories_bought.map((cat) => (
            <StatusChip
              key={cat.id}
              label={cat.name}
              onClick={(e) => openHistory(row, cat, e)}
            />
          ))}
        </Box>
      ),
    },
    {
      field: 'missing_high_margin_categories',
      headerName: t('productsHighMargin.missingHighMargin'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
          {row.missing_high_margin_categories.map((cat) => (
            <StatusChip
              key={cat.id}
              label={cat.name}
              color="info"
              onClick={(e) => openHmCategory(cat, e)}
            />
          ))}
        </Box>
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
        onRowClick={(row) => openHistory(row as unknown as UpsellTargetRow, null)}
      />

      {/* Customer purchase history dialog */}
      <UpsellCustomerDialog
        customer={drawerCustomer}
        filterCategory={drawerCatFilter}
        companyId={filter.companyId}
        periodMonth={filter.periodMonth}
        activeWindow={filter.activeWindow}
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
        periodMonth={filter.periodMonth}
        activeWindow={filter.activeWindow}
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
  const { companyId, branchId, division } = scopeFilter

  const filter: FilterState = { companyId, branchId, division, periodMonth, activeWindow }

  // Ambil seluruh kategori HM (bukan hanya 1 halaman grid) untuk hitung summary
  // per_page dibatasi maksimal 100 oleh backend (metrics.schema.ts)
  const { data: summaryData } = useHighMarginDetail({
    company_id:    filter.companyId,
    branch_id:     filter.branchId === 'all' ? undefined : filter.branchId,
    division:      filter.division || undefined,
    period_month:  filter.periodMonth,
    active_window: filter.activeWindow,
    page: 1,
    per_page: 100,
  })
  const categoryCount = summaryData?.meta.total ?? 0
  const avgPenetration = summaryData?.data.length
    ? summaryData.data.reduce((sum, r) => sum + r.penetration_rate, 0) / summaryData.data.length
    : 0

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
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('productsHighMargin.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('productsHighMargin.subtitle')}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', alignItems: 'center' }}>
          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('common.filters.month')} type="month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            sx={{ minWidth: 150 }}
          />

          <TextField
            select size="small" label={t('common.filters.activeWindow')}
            value={activeWindow}
            onChange={(e) => setActiveWindow(Number(e.target.value))}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value={3}>{t('common.filters.window3Months')}</MenuItem>
            <MenuItem value={6}>{t('common.filters.window6Months')}</MenuItem>
            <MenuItem value={12}>{t('common.filters.window12Months')}</MenuItem>
          </TextField>
        </Stack>
      </Box>

      {/* Summary chips */}
      {categoryCount > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <StatusChip label={t('productsHighMargin.summaryCategories', { count: categoryCount })} color="warning" />
          <StatusChip label={t('productsHighMargin.summaryAvgPenetration', { pct: avgPenetration.toFixed(1) })} color="info" />
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

      {activeTab === 0 && <HighMarginCategoryTab filter={filter} />}
      {activeTab === 1 && <UpsellTargetsTab filter={filter} />}
    </Box>
  )
}
