import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useInvoices } from '@/hooks/useTransactions'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import type { InvoiceRow, InvoiceParams } from '@/types/transactions'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { BuChip } from './components/BuChip'
import { InvoiceDetailDialog } from './components/InvoiceDetailDialog'
import { formatIDR } from '@/utils/format'

export default function Transactions() {
  const { t } = useTranslation()
  const [customerSearch, setCustomerSearch] = useState('')
  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division: buFilter } = scopeFilter
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  const queryParams: InvoiceParams = {
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    customer_search: customerSearch || undefined,
    business_unit: buFilter || undefined,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: sortModel[0]?.field as 'invoice_date' | 'total_revenue' | 'total_gp' | undefined,
    sort_dir: sortModel[0]?.sort as 'asc' | 'desc' | undefined,
  }

  const { data, isLoading, error } = useInvoices(queryParams)
  const invoices = data?.data ?? []

  const handleRowClick = useCallback((row: InvoiceRow) => {
    setSelectedInvoiceId(row.id)
  }, [])

  const columns: GridColDef[] = [
    { field: 'invoice_number', headerName: t('transactions.invoiceNumber'), width: 160 },
    { field: 'invoice_date', headerName: t('transactions.invoiceDate'), width: 120 },
    { field: 'company', headerName: t('customers.detail.company'), width: 140, valueGetter: (_v: unknown, row: InvoiceRow) => row.company.name },
    { field: 'customer', headerName: t('customers.name'), flex: 1, minWidth: 180, valueGetter: (_v: unknown, row: InvoiceRow) => row.customer.name },
    { field: 'business_unit', headerName: t('customers.detail.businessUnit'), width: 120, renderCell: ({ row }) => <BuChip bu={row.customer.business_unit} /> },
    { field: 'total_revenue', headerName: t('transactions.totalRevenue'), width: 140, type: 'number', sortable: true, valueFormatter: (v: unknown) => formatIDR(v as number) },
    { field: 'total_gp', headerName: t('transactions.totalGP'), width: 130, type: 'number', sortable: true, valueFormatter: (v: unknown) => formatIDR(v as number) },
    { field: 'gp_margin_percent', headerName: t('transactions.gpMargin'), width: 100, type: 'number', valueFormatter: (v: unknown) => `${(v as number).toFixed(1)}%` },
    { field: 'category_count', headerName: t('transactions.categoryCount'), width: 100, type: 'number' },
    { field: 'import_source', headerName: t('transactions.importSource'), width: 100, renderCell: ({ row }) => row.import_source ?? '—' },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('transactions.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('transactions.subtitle')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <TextField size="small" placeholder={t('transactions.searchPlaceholder')} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} sx={{ minWidth: 240 }} />
        <ScopeFilterFields filter={scopeFilter} />
      </Box>

      <ResponsiveListView
        rows={invoices}
        columns={columns}
        rowCount={data?.meta?.total ?? 0}
        loading={isLoading}
        error={error as Error | null}
        paginationMode="server"
        sortingMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[25, 50, 100]}
        onRowClick={(row) => handleRowClick(row as unknown as InvoiceRow)}
        height={600}
      />

      <InvoiceDetailDialog invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />
    </Box>
  )
}