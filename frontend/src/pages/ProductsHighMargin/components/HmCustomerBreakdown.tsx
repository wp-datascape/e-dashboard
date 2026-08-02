import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import { useTranslation } from 'react-i18next'
import { useHmCustomers } from '@/hooks/useProducts'
import { formatIDR } from '@/utils/format'
import type { HmCustomerRow, HmDivisionBreakdown } from '@/types/products'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

export interface HmTarget {
  type: 'category' | 'product'
  id: number
}

interface Props {
  target: HmTarget | null
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodMonth: string
  activeWindow: number
  excludeIntercompany?: boolean
}

/**
 * Seksi "Capaian per Divisi" + "Customer Pembeli" (task017) — fitur baru total,
 * di-embed di DALAM CategoryProductsDialog yang sudah ada (BUKAN dialog
 * terpisah) — dialog itu sendiri sudah representasi 1 kategori/produk, seksi
 * ini melengkapinya dengan breakdown per divisi + siapa saja yang beli.
 * Ringkasan (kartu summary existing di caller) TETAP grand total company-wide
 * (task017 §2, "All Division" tidak dikurangi tag) — breakdown di sini
 * pelengkap, bukan pengganti.
 */
export function HmCustomerBreakdown({
  target,
  companyId,
  branchId,
  division,
  periodMonth,
  activeWindow,
  excludeIntercompany,
}: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useHmCustomers(
    target
      ? {
          company_id:   companyId,
          target_type:  target.type,
          target_id:    target.id,
          branch_id:    branchId,
          division,
          period_month: periodMonth,
          active_window: activeWindow,
          exclude_intercompany: excludeIntercompany,
          per_page: 100,
        }
      : null,
  )

  const breakdown = (data?.meta.breakdown as HmDivisionBreakdown[] | undefined) ?? []
  const grandTotalRevenue = breakdown.reduce((sum, b) => sum + b.total_revenue, 0)

  const columns: GridColDef<HmCustomerRow>[] = [
    {
      field: 'customer_name',
      headerName: t('productsHighMargin.buyers.colCustomer'),
      flex: 1,
      minWidth: 180,
      sortable: false,
    },
    {
      field: 'division_label',
      headerName: t('productsHighMargin.buyers.colDivision'),
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip size="small" label={row.division_label ?? t('productsHighMargin.buyers.otherDivision')} variant="outlined" />
      ),
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
      field: 'invoice_count',
      headerName: t('products.drawer.colInvoice'),
      width: 80,
      type: 'number',
      sortable: false,
    },
    {
      field: 'last_invoice_date',
      headerName: t('productsHighMargin.buyers.colLastPurchase'),
      width: 120,
      sortable: false,
    },
  ]

  if (!target) return null

  return (
    <Box>
      {/* Capaian per Divisi */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t('productsHighMargin.buyers.divisionBreakdown')}
        </Typography>
        {isLoading ? (
          <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
        ) : breakdown.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('productsHighMargin.buyers.noBreakdown')}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {breakdown.map((b) => (
              <Box
                key={b.division_id ?? 'other'}
                sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, minWidth: 150 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {b.division_label ?? t('productsHighMargin.buyers.otherDivision')}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formatIDR(b.total_revenue)}
                  {grandTotalRevenue > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      ({((b.total_revenue / grandTotalRevenue) * 100).toFixed(0)}%)
                    </Typography>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('productsHighMargin.buyers.customerCount', { count: b.customer_count })}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Customer list */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {t('productsHighMargin.buyers.listTitle', { count: data?.meta.total ?? '…' })}
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
          height={360}
          pageSizeOptions={[25, 50, 100]}
        />
      )}
    </Box>
  )
}
