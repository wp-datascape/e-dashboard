import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useInvoices } from '@/hooks/useTransactions'
import { useGlobalFilter } from '@/context/globalFilter.context'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { DatePicker } from '@/components/ui/DatePicker'
import { getCurrentPeriodKey, getPeriodDateRange, type KpiPeriodType, KPI_PERIOD_TYPES } from '@/utils/analisisPeriod'
import type { InvoiceRow, InvoiceParams } from '@/types/transactions'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { BuChip } from './components/BuChip'
import { InvoiceDetailDialog } from './components/InvoiceDetailDialog'
import { formatIDR } from '@/utils/format'
import { todayIsoDate } from '@/utils/date'

export default function Transactions() {
  const { t } = useTranslation()
  const [customerSearch, setCustomerSearch] = useState('')
  const scopeFilter = useGlobalFilter()
  const {
    companyId, branchId, division: buFilter, excludeIntercompany, setExcludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter
  const todayStr = todayIsoDate()
  // date_from/date_to diturunkan dari filter global periodType+endDate (task026
  // Fase 2) — menggantikan MonthYearPicker+RangeFilter lokal. Endpoint backend
  // TIDAK berubah (sudah generic date_from/date_to, lihat task026.md §4).
  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const dateFrom = getPeriodDateRange(periodType, periodKey).start
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  // Reset ke halaman 1 setiap kali filter berubah - tanpa ini, page index lama (misal
  // sudah scroll ke halaman 8 di "All Divisions") tetap dipakai saat filter dipersempit
  // (misal pilih Division tertentu), sehingga request page yang sudah di luar jangkauan
  // data baru dan tabel tampil "No data available" walau total datanya > 0. Laporan
  // user 2026-07-24 dengan screenshot: All Divisions tampil data, Project blank.
  // Di-adjust langsung saat render (pola resmi React utk "adjust state when props
  // change"), bukan useEffect — 1 key gabungan dibanding banyak prev-state terpisah.
  const filterKey = JSON.stringify([companyId, branchId, buFilter, excludeIntercompany, customerSearch, periodType, endDate])
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }))
  }

  const queryParams: InvoiceParams = {
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    customer_search: customerSearch || undefined,
    business_unit: buFilter || undefined,
    exclude_intercompany: excludeIntercompany,
    date_from: dateFrom,
    date_to: endDate,
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
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('transactions.title')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('transactions.subtitle')}</Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField size="small" placeholder={t('transactions.searchPlaceholder')} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 240 } }} />
        <ScopeFilterFields filter={scopeFilter} />

        {/* periodType+tanggal dari filter global (task026 Fase 2) —
            menggantikan MonthYearPicker+RangeFilter lokal. */}
        <TextField
          select size="small" label={t('common.filters.period')}
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as KpiPeriodType)}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
        >
          {KPI_PERIOD_TYPES.map((p) => (
            <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
          ))}
        </TextField>

        <DatePicker
          size="small" label={t('common.filters.asOfDate')}
          value={endDate}
          onChange={(e) => {
            const picked = e.target.value
            setEndDate(picked && picked > todayStr ? todayStr : picked)
          }}
          sx={{ minWidth: { xs: '100%', sm: 170 } }}
        />

        <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
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