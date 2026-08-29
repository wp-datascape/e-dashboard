import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import { Dialog, StatusChip } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { useCustomerProducts } from '@/hooks/useProducts'
import { formatRupiah } from '@/utils/format'
import type { UpsellTargetRow, CategoryRef, CustomerProductRow } from '@/types/products'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

interface Props {
  customer: UpsellTargetRow | null
  filterCategory: CategoryRef | null
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodMonth: string
  activeWindow: number
  excludeIntercompany?: boolean
  onClose: () => void
}

function MarginChip({ pct }: { pct: number }) {
  const color: 'success' | 'warning' | 'default' =
    pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return <StatusChip label={`${pct.toFixed(1)}%`} color={color} />
}

export function UpsellCustomerDialog({
  customer,
  filterCategory,
  companyId,
  branchId,
  division,
  periodMonth,
  activeWindow,
  excludeIntercompany,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useCustomerProducts(
    customer
      ? {
          company_id:    companyId,
          customer_id:   customer.id,
          category_id:   filterCategory?.id,
          branch_id:     branchId,
          division,
          period_month:  periodMonth,
          active_window: activeWindow,
          exclude_intercompany: excludeIntercompany,
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
      valueFormatter: (v) => formatRupiah(v as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.drawer.colGp'),
      width: 110,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatRupiah(v as number),
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
    <Dialog
      open={!!customer}
      onClose={onClose}
      maxWidth="md"
      title={title}
      subtitle={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          {customer?.division_label && (
            <StatusChip label={customer.division_label} />
          )}
          <Typography variant="caption" color="text.secondary">
            {t('productsHighMargin.drawer.subtitle', { window: activeWindow })}
          </Typography>
        </Box>
      }
      showCloseButton
    >
      {/* Revenue summary */}
      {customer && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('productsHighMargin.drawer.avgRevenueMonth')}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {formatRupiah(customer.avg_monthly_revenue)}
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
    </Dialog>
  )
}
