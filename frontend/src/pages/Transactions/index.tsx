// frontend/src/pages/Transactions/index.tsx
import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useInvoices, useInvoiceDetail } from '@/hooks/useTransactions'
import type { InvoiceRow, InvoiceParams } from '@/types/transactions'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'

function formatIDR(val: number) {
  return `Rp ${(val / 1_000_000).toFixed(1)}M`
}

function BuChip({ bu }: { bu: string | null }) {
  const labelMap: Record<string, string> = {
    b2b_dc: 'B2B DC',
    b2b_project: 'B2B Project',
    b2c: 'B2C',
    manufacturing: 'Manufacturing',
  }
  const colorMap: Record<string, 'primary' | 'info' | 'success' | 'warning'> = {
    b2b_dc: 'primary',
    b2b_project: 'info',
    b2c: 'success',
    manufacturing: 'warning',
  }
  if (!bu) return <Typography variant="body2" color="text.disabled">—</Typography>
  return (
    <Chip
      label={labelMap[bu] ?? bu}
      color={colorMap[bu] ?? 'default'}
      size="small"
      variant="outlined"
    />
  )
}

// ─── Invoice Detail Drawer ───────────────────────────────────────────────────
function InvoiceDetailDrawer({
  invoiceId,
  onClose,
}: {
  invoiceId: number | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { data: detail, isLoading } = useInvoiceDetail(invoiceId)

  return (
    <Drawer
      anchor="right"
      open={!!invoiceId}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('transactions.detailTitle')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {isLoading && (
          <Stack spacing={1.5}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        )}

        {detail && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('transactions.invoiceNumber')}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{detail.invoice_number}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('transactions.invoiceDate')}</Typography>
              <Typography variant="body1">{detail.invoice_date}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('transactions.company')}</Typography>
              <Typography variant="body1">{detail.company.name}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('customers.name')}</Typography>
              <Typography variant="body1">{detail.customer.name}</Typography>
            </Box>

            <Divider />

            {/* KPI */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('transactions.totalRevenue')}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatIDR(detail.total_revenue)}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('transactions.totalGP')}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatIDR(detail.total_gp)}</Typography>
              </Box>
            </Box>

            {/* Line Items */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              {t('transactions.lineItems')} ({detail.items.length})
            </Typography>
            {detail.items.map((item) => (
              <Box
                key={item.id}
                sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product_name}</Typography>
                  {item.category.is_high_margin && (
                    <Chip label="High Margin" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.category.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rev: {formatIDR(item.revenue)} · GP: {formatIDR(item.gross_profit)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Transactions() {
  const theme = useTheme()
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [buFilter, setBuFilter] = useState('')
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'invoice_date', sort: 'desc' },
  ])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  const queryParams: InvoiceParams = {
    company_id: 'all',
    customer_search: search || undefined,
    business_unit: buFilter || undefined,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: (sortModel[0]?.field as InvoiceParams['sort_by']) ?? 'invoice_date',
    sort_dir: (sortModel[0]?.sort as 'asc' | 'desc') ?? 'desc',
  }

  const { data, isLoading, error } = useInvoices(queryParams)

  const handleRowClick = useCallback((row: InvoiceRow) => {
    setSelectedInvoiceId(row.id)
  }, [])

  const columns: GridColDef<InvoiceRow>[] = [
    {
      field: 'invoice_number',
      headerName: t('transactions.invoiceNumber'),
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: theme.typography.caption.fontFamily }}>
          {row.invoice_number}
        </Typography>
      ),
    },
    {
      field: 'invoice_date',
      headerName: t('transactions.invoiceDate'),
      width: 130,
      sortable: true,
    },
    {
      field: 'customer',
      headerName: t('customers.name'),
      flex: 1,
      minWidth: 180,
      sortable: false,
      valueGetter: (_value, row) => row.customer.name,
    },
    {
      field: 'business_unit',
      headerName: t('customers.detail.businessUnit'),
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <BuChip bu={row.customer.business_unit} />,
    },
    {
      field: 'company',
      headerName: t('transactions.company'),
      width: 150,
      sortable: false,
      valueGetter: (_value, row) => row.company.name,
    },
    {
      field: 'total_revenue',
      headerName: t('transactions.totalRevenue'),
      width: 150,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'total_gp',
      headerName: t('transactions.totalGP'),
      width: 140,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.gpMargin'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip
          label={`${row.gp_margin_percent.toFixed(1)}%`}
          size="small"
          color={row.gp_margin_percent >= 30 ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'category_count',
      headerName: t('transactions.categoryCount'),
      width: 120,
      type: 'number',
      sortable: false,
    },
    {
      field: 'import_source',
      headerName: t('transactions.importSource'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip
          label={row.import_source ?? '-'}
          size="small"
          color={row.import_source === 'accurate' ? 'info' : 'default'}
          variant="outlined"
        />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('transactions.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('transactions.subtitle')}
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder={t('transactions.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          size="small"
          label={t('customers.detail.businessUnit')}
          value={buFilter}
          onChange={(e) => setBuFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="b2b_dc">B2B DC</MenuItem>
          <MenuItem value="b2b_project">B2B Project</MenuItem>
          <MenuItem value="b2c">B2C</MenuItem>
          <MenuItem value="manufacturing">Manufacturing</MenuItem>
        </TextField>
      </Box>

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
        onRowClick={(row) => handleRowClick(row as unknown as InvoiceRow)}
      />

      {/* Detail Drawer */}
      <InvoiceDetailDrawer
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </Box>
  )
}