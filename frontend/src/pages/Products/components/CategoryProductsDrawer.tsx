import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui'
import { useCategoryProducts } from '@/hooks/useProducts'
import { formatIDR } from '@/utils/format'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import type { CategoryProductRow } from '@/types/products'

export interface CategoryDrawerInfo {
  category_id: number
  category_name: string
  is_high_margin?: boolean
  is_service?: boolean
  total_revenue?: number
  total_gp?: number
  gp_margin_percent?: number
  invoice_count?: number
  customer_count?: number
  last_sold_month?: string | null
}

interface Props {
  category: CategoryDrawerInfo | null
  companyId: number | 'all'
  periodMonth: string
  activeWindow: number
  onClose: () => void
}

function MarginChip({ pct }: { pct: number }) {
  const color: 'success' | 'warning' | 'default' =
    pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return <StatusChip label={`${pct.toFixed(1)}%`} color={color} />
}

export function CategoryProductsDrawer({
  category,
  companyId,
  periodMonth,
  activeWindow,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useCategoryProducts(
    category
      ? {
          company_id:   companyId,
          category_id:  category.category_id,
          period_month: periodMonth,
          active_window: activeWindow,
          per_page: 100,
        }
      : null,
  )

  const columns: GridColDef<CategoryProductRow>[] = [
    {
      field: 'product_name',
      headerName: t('products.drawer.colProductName'),
      flex: 1,
      minWidth: 200,
      sortable: false,
    },
    {
      field: 'total_revenue',
      headerName: t('products.drawer.colRevenue'),
      width: 130,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.drawer.colGp'),
      width: 120,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.drawer.colMargin'),
      width: 100,
      sortable: false,
      renderCell: ({ row }) => <MarginChip pct={row.gp_margin_percent} />,
    },
    {
      field: 'invoice_count',
      headerName: t('products.drawer.colInvoice'),
      width: 80,
      type: 'number',
      sortable: false,
    },
    {
      field: 'customer_count',
      headerName: t('products.drawer.colCustomer'),
      width: 90,
      type: 'number',
      sortable: false,
    },
  ]

  return (
    <Drawer
      anchor="right"
      open={!!category}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 680 } } } }}
    >
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        <Toolbar />
        <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {category?.category_name ?? '—'}
              </Typography>
              {category?.is_high_margin && (
                <StatusChip label={t('products.highMarginBadge')} color="info" />
              )}
              {category?.is_service && (
                <StatusChip label={t('products.drawer.serviceBadge')} color="info" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t('products.drawer.subtitle', { window: activeWindow })}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Summary stats */}
        {category && (category.total_revenue !== undefined) && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1.5,
              mb: 2,
              mt: 1,
            }}
          >
            {[
              { label: t('products.drawer.statTotalRevenue'), value: formatIDR(category.total_revenue ?? 0) },
              { label: t('products.drawer.statTotalGp'),      value: formatIDR(category.total_gp ?? 0) },
              { label: t('products.drawer.statMargin'),        value: `${(category.gp_margin_percent ?? 0).toFixed(1)}%` },
              { label: t('products.drawer.statInvoice'),        value: String(category.invoice_count ?? '—') },
              { label: t('products.drawer.statCustomer'),      value: String(category.customer_count ?? '—') },
              { label: t('products.drawer.statLastSold'), value: category.last_sold_month ?? '—' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Product list */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('products.drawer.listTitle', { count: data?.meta.total ?? '…' })}
        </Typography>

        {isLoading ? (
          <Stack spacing={1}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <ResponsiveListView
            rows={data?.data ?? []}
            columns={columns}
            rowCount={data?.meta.total ?? 0}
            loading={false}
            error={null}
            paginationMode="client"
            height={420}
            pageSizeOptions={[25, 50, 100]}
          />
        )}
        </Box>
      </Box>
    </Drawer>
  )
}
