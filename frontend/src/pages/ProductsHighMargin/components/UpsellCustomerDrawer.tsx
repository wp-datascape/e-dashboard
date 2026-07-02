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
import { BuChip } from '@/pages/Transactions/components/BuChip'
import { useCustomerProducts } from '@/hooks/useProducts'
import { formatIDR } from '@/utils/format'
import type { UpsellTargetRow, CategoryRef, CustomerProductRow } from '@/types/products'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import type { BusinessUnit } from '@/types/customers'

interface Props {
  customer: UpsellTargetRow | null
  filterCategory: CategoryRef | null
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

export function UpsellCustomerDrawer({
  customer,
  filterCategory,
  companyId,
  periodMonth,
  activeWindow,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useCustomerProducts(
    customer
      ? {
          company_id:    companyId,
          customer_id:   customer.id,
          category_id:   filterCategory?.id,
          period_month:  periodMonth,
          active_window: activeWindow,
          per_page: 100,
        }
      : null,
  )

  const columns: GridColDef<CustomerProductRow>[] = [
    ...(!filterCategory ? [{
      field: 'category_name',
      headerName: t('products.drawer.colCategory'),
      width: 140,
      sortable: false,
    } as GridColDef<CustomerProductRow>] : []),
    {
      field: 'product_name',
      headerName: t('products.drawer.colProductName'),
      flex: 1,
      minWidth: 160,
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
      width: 110,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.drawer.colMargin'),
      width: 90,
      sortable: false,
      renderCell: ({ row }) => <MarginChip pct={row.gp_margin_percent} />,
    },
    {
      field: 'invoice_count',
      headerName: t('products.drawer.colInvoice'),
      width: 70,
      type: 'number',
      sortable: false,
    },
  ]

  const title = filterCategory
    ? `${customer?.customer_name ?? '—'} · ${filterCategory.name}`
    : (customer?.customer_name ?? '—')

  return (
    <Drawer
      anchor="right"
      open={!!customer}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 700 } } } }}
    >
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        <Toolbar />
        <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {customer?.business_unit && (
                <BuChip bu={customer.business_unit as BusinessUnit} />
              )}
              <Typography variant="caption" color="text.secondary">
                {t('productsHighMargin.drawer.subtitle', { window: activeWindow })}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Revenue summary */}
        {customer && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('productsHighMargin.drawer.avgRevenueMonth')}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {formatIDR(customer.avg_monthly_revenue)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('productsHighMargin.drawer.lastTransaction')}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {customer.last_invoice_date ?? '—'}
              </Typography>
            </Box>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {filterCategory ? t('productsHighMargin.drawer.productListFiltered', { category: filterCategory.name }) : t('productsHighMargin.drawer.productListAll')}
          {' '}({data?.meta.total ?? '…'})
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
