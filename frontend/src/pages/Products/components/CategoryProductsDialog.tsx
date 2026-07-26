import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import { Dialog, StatusChip } from '@/components/ui'
import { useTranslation } from 'react-i18next'
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
  excludeIntercompany?: boolean
  // Task008 — batasi daftar ke produk yang benar-benar ditandai high margin
  // (bukan semua produk kategori). Dipakai tab "Penetrasi Kategori" saja -
  // pemakai lain (tab Target Upsell, halaman Products) sengaja tidak pasang
  // prop ini supaya perilaku existingnya (semua produk kategori) tidak berubah.
  highMarginOnly?: boolean
  onClose: () => void
}

function MarginChip({ pct }: { pct: number }) {
  const color: 'success' | 'warning' | 'default' =
    pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return <StatusChip label={`${pct.toFixed(1)}%`} color={color} />
}

export function CategoryProductsDialog({
  category,
  companyId,
  periodMonth,
  activeWindow,
  excludeIntercompany,
  highMarginOnly,
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
          exclude_intercompany: excludeIntercompany,
          high_margin_only: highMarginOnly,
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
    <Dialog
      open={!!category}
      onClose={onClose}
      maxWidth="md"
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {category?.category_name ?? '—'}
          {category?.is_high_margin && (
            <StatusChip label={t('products.highMarginBadge')} color="info" />
          )}
          {category?.is_service && (
            <StatusChip label={t('products.drawer.serviceBadge')} color="info" />
          )}
        </Box>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('products.drawer.subtitle', { window: activeWindow })}
        </Typography>
      }
      showCloseButton
    >
      {/* Summary stats */}
      {category && (category.total_revenue !== undefined) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            mb: 2,
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
    </Dialog>
  )
}
