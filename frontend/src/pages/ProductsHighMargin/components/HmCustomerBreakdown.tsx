import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { useHmCustomers } from '@/hooks/useProducts'
import { formatRupiah } from '@/utils/format'
import { getDivisionColor } from '@/utils/divisionColor'
import { StatusChip } from '@/components/ui'
import type { HmCustomerRow, HmDivisionBreakdown } from '@/types/products'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView, type CardExpandState } from '@/components/tables/ResponsiveListView'

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
      renderCell: ({ row }) => {
        const label = row.division_label ?? t('productsHighMargin.buyers.otherDivision')
        return <StatusChip label={label} color={getDivisionColor(label)} />
      },
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
      width: 120,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatRupiah(v as number),
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

  // Mode mobile "Customer Pembeli" — accordion, bukan card AutoCard biasa
  // (mempersingkat list panjang: cuma header nama+divisi yg selalu terlihat,
  // detail revenue/GP/faktur/tanggal baru muncul saat di-klik). Exclusive-open
  // (buka 1 otomatis nutup yang lain) dipusatkan lewat `expandState` dari
  // ResponsiveListView, BUKAN state lokal — supaya perilakunya identik dengan
  // AutoCard default di halaman lain (lihat CardExpandState).
  const renderCustomerAccordion = (row: Record<string, unknown>, _idx: number, expandState: CardExpandState) => {
    const r = row as unknown as HmCustomerRow
    return (
      <Accordion
        key={r.id}
        expanded={expandState.expanded}
        onChange={expandState.onToggle}
        disableGutters
        square={false}
        sx={{
          mb: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          overflow: 'hidden',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ '& .MuiAccordionSummary-content': { minWidth: 0, overflow: 'hidden' } }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}>
            {r.customer_name}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              {t('productsHighMargin.buyers.colDivision')}
            </Typography>
            <StatusChip
              label={r.division_label ?? t('productsHighMargin.buyers.otherDivision')}
              color={getDivisionColor(r.division_label)}
            />
          </Box>
          {[
            { label: t('products.drawer.colRevenue'), value: formatRupiah(r.total_revenue) },
            { label: t('products.drawer.colGp'), value: formatRupiah(r.total_gp) },
            { label: t('products.drawer.colInvoice'), value: String(r.invoice_count) },
            { label: t('productsHighMargin.buyers.colLastPurchase'), value: r.last_invoice_date },
          ].map((f) => (
            <Box key={f.label}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                {f.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {f.value}
              </Typography>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    )
  }

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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(150px, 1fr))' },
              gap: 1,
            }}
          >
            {breakdown.map((b) => (
              <Box
                key={b.division_id ?? 'other'}
                sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}
              >
                <Box sx={{ mb: 0.5 }}>
                  <StatusChip
                    label={b.division_label ?? t('productsHighMargin.buyers.otherDivision')}
                    color={getDivisionColor(b.division_label)}
                  />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formatRupiah(b.total_revenue)}
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
          </Box>
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
          renderCard={renderCustomerAccordion}
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
