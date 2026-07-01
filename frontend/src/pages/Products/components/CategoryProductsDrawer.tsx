import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import CloseIcon from '@mui/icons-material/Close'
import { StatusChip } from '@/components/ui'
import { useCategoryProducts } from '@/hooks/useProducts'
import { formatIDR } from '@/utils/format'
import type { CategoryPerformanceRow } from '@/types/products'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import type { CategoryProductRow } from '@/types/products'

interface Props {
  category: CategoryPerformanceRow | null
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
      headerName: 'Nama Produk',
      flex: 1,
      minWidth: 200,
      sortable: false,
    },
    {
      field: 'total_revenue',
      headerName: 'Revenue',
      width: 130,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'total_gp',
      headerName: 'GP',
      width: 120,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: 'Margin',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => <MarginChip pct={row.gp_margin_percent} />,
    },
    {
      field: 'invoice_count',
      headerName: 'Faktur',
      width: 80,
      type: 'number',
      sortable: false,
    },
    {
      field: 'customer_count',
      headerName: 'Customer',
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
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {category?.category_name ?? '—'}
              </Typography>
              {category?.is_high_margin && (
                <StatusChip label="High Margin" color="info" />
              )}
              {category?.is_service && (
                <StatusChip label="Jasa" color="info" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Produk dalam kategori ini • window {activeWindow} bulan
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Summary stats */}
        {category && (
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
              { label: 'Total Revenue', value: formatIDR(category.total_revenue) },
              { label: 'Total GP',      value: formatIDR(category.total_gp) },
              { label: 'Margin',        value: `${category.gp_margin_percent.toFixed(1)}%` },
              { label: 'Faktur',        value: String(category.invoice_count) },
              { label: 'Customer',      value: String(category.customer_count) },
              { label: 'Terakhir Jual', value: category.last_sold_month ?? '—' },
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
          Daftar Produk ({data?.meta.total ?? '…'})
        </Typography>

        {isLoading ? (
          <Stack spacing={1}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResponsiveListView
              rows={data?.data ?? []}
              columns={columns}
              rowCount={data?.meta.total ?? 0}
              loading={false}
              error={null}
              paginationMode="client"
              height={460}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        )}
      </Box>
    </Drawer>
  )
}
