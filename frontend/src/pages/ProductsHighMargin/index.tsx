// frontend/src/pages/ProductsHighMargin/index.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import LinearProgress from '@mui/material/LinearProgress'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useHighMarginDetail, useUpsellTargets } from '@/hooks/useProducts'
import type {
  HighMarginCategoryRow,
  HighMarginDetailParams,
  UpsellTargetRow,
  UpsellTargetParams,
} from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

function formatIDR(val: number) {
  return `Rp ${(val / 1_000_000).toFixed(1)}M`
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

// ─── Tab 1: Category Penetration ─────────────────────────────────────────────
function HighMarginCategoryTab() {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })

  const params: HighMarginDetailParams = {
    company_id: 'all',
    period_month: '2024-01',
    active_window: 6,
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
      width: 150,
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
        <Chip
          label={`${row.gp_margin_percent.toFixed(1)}%`}
          size="small"
          color="success"
          variant="outlined"
        />
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
function UpsellTargetsTab() {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })

  const params: UpsellTargetParams = {
    company_id: 'all',
    period_month: '2024-01',
    active_window: 6,
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
    },
    {
      field: 'customer_name',
      headerName: t('customers.name'),
      flex: 1,
      minWidth: 180,
      sortable: false,
    },
    {
      field: 'business_unit',
      headerName: t('customers.detail.businessUnit'),
      width: 130,
      sortable: false,
      renderCell: ({ row }) => {
        const labelMap: Record<string, string> = {
          b2b_dc: 'B2B DC',
          b2b_project: 'B2B Project',
          b2c: 'B2C',
          manufacturing: 'Manufacturing',
        }
        return (
          <Typography variant="body2">
            {row.business_unit ? labelMap[row.business_unit] ?? row.business_unit : '-'}
          </Typography>
        )
      },
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
            <Chip key={cat} label={cat} size="small" variant="outlined" />
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
            <Chip key={cat} label={cat} size="small" color="warning" />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsHighMargin() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('productsHighMargin.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('productsHighMargin.subtitle')}
      </Typography>

      {/* Summary chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip
          label={t('productsHighMargin.summaryCategories', { count: 3 })}
          color="warning"
          variant="outlined"
        />
        <Chip
          label={t('productsHighMargin.summaryAvgPenetration', { pct: '29.8' })}
          color="info"
          variant="outlined"
        />
      </Stack>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('productsHighMargin.tabCategories')} />
        <Tab label={t('productsHighMargin.tabUpsellTargets')} />
      </Tabs>

      {activeTab === 0 && <HighMarginCategoryTab />}
      {activeTab === 1 && <UpsellTargetsTab />}
    </Box>
  )
}