// frontend/src/pages/Products/index.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useCategoryPerformance } from '@/hooks/useProducts'
import type { CategoryPerformanceRow, CategoryPerformanceParams } from '@/types/products'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

function formatIDR(val: number) {
  return `Rp ${(val / 1_000_000).toFixed(1)}M`
}

function MarginChip({ pct }: { pct: number }) {
  const color = pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return (
    <Chip
      label={`${pct.toFixed(1)}%`}
      color={color as 'success' | 'warning' | 'default'}
      size="small"
      variant="outlined"
    />
  )
}

export default function Products() {
  const { t } = useTranslation()

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'total_revenue', sort: 'desc' },
  ])

  const queryParams: CategoryPerformanceParams = {
    company_id: 'all',
    period_month: '2024-01',
    active_window: 6,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: (sortModel[0]?.field as CategoryPerformanceParams['sort_by']) ?? 'total_revenue',
    sort_dir: (sortModel[0]?.sort as 'asc' | 'desc') ?? 'desc',
  }

  const { data, isLoading, error } = useCategoryPerformance(queryParams)

  const columns: GridColDef<CategoryPerformanceRow>[] = [
    {
      field: 'category_name',
      headerName: t('products.categoryName'),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{row.category_name}</Typography>
          {row.is_high_margin && (
            <Chip
              label={t('products.highMarginBadge')}
              size="small"
              color="warning"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      ),
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
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('products.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('products.subtitle')}
      </Typography>

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