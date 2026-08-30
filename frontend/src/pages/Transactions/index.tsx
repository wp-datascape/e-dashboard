import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PercentIcon from '@mui/icons-material/Percent'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'
import { useInvoices, useInvoicesSummary } from '@/hooks/useTransactions'
import { useCan } from '@/hooks/useCan'
import { transactionsApi } from '@/api/transactions.api'
import { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar'
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar'
import type { InvoiceRow, InvoiceParams } from '@/types/transactions'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { BuChip } from './components/BuChip'
import { InvoiceDetailDialog } from './components/InvoiceDetailDialog'
import { ExportFieldsDialog } from './components/ExportFieldsDialog'
import { ReportSummaryCards } from '../Report/ReportSummaryCards'
import { formatRupiah } from '@/utils/format'
import { getCurrentPeriodKey, getPeriodDateRange, clampPeriodEndToToday, formatPeriodLabel } from '@/utils/analisisPeriod'

// Filter Periode+Granularitas (2026-08-29, instruksi user: "filter di semua
// halaman aplikasi seragam") — sebelumnya MonthYearPicker+RangeFilter
// ("3 Bulan" mundur dari 1 tanggal), sekarang REUSE useAdvancedFilterBar/
// AdvancedFilterBar yang sama persis dipakai Overview/Business/Report/*
// (task029.md §41-lanjutan). Halaman lain di menu Data (Products, Customer)
// MASIH pakai pola lama, migrasi disepakati bertahap — Transactions dulu
// sbg contoh, lihat AskUserQuestion 2026-08-29.
export default function Transactions() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const can = useCan()
  // Tombol export Excel di bawah (actions) manggil backend, tapi backend
  // cuma menolak REQUEST-nya (requirePermission di route) — tombolnya
  // sendiri tidak pernah dicek permission di frontend, jadi tetap tampil
  // walau user tidak punya transaction:export (laporan user, 2026-08-30:
  // permission export di-off tapi tombolnya masih muncul).
  const canExport = can('transaction:export')
  const [customerSearch, setCustomerSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const filterBar = useAdvancedFilterBar()
  const { scopeFilter, periodEnd, periodTypeFilter } = filterBar
  const { companyId, branchId, division: buFilter, excludeIntercompany } = scopeFilter
  const periodType = periodTypeFilter.periodType
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 })
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  // date_from/date_to dari Periode+Granularitas (pola sama persis
  // Report/Revenue) — "Apply date cutoff" disembunyikan di halaman ini
  // (showParetoAndDateCutoff=false di bawah), jadi periodEnd efektif SELALU
  // akhir periode terpilih, diclamp ke hari ini kalau periode masih berjalan.
  const [py, pm, pd] = periodEnd.split('-').map(Number)
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
  const periodRange = getPeriodDateRange(periodType, periodKey)
  const periodEndEffective = clampPeriodEndToToday(periodType, periodKey, periodRange.end)
  // Info periode+granularitas di header tabel (2026-08-29, instruksi user:
  // "tampilkan infonya granularitas") — `formatPeriodLabel` sudah menulis
  // granularitasnya langsung di teksnya sendiri (mis. "Agustus 2026" utk
  // bulanan, "Kuartal 3 Tahun 2026" utk kuartal), bukan cuma tanggal
  // mentah, pola sama dipakai M1-M10.
  const periodLabel = formatPeriodLabel(t, periodType, periodKey)

  // Reset ke halaman 1 setiap kali filter berubah - tanpa ini, page index lama (misal
  // sudah scroll ke halaman 8 di "All Divisions") tetap dipakai saat filter dipersempit
  // (misal pilih Division tertentu), sehingga request page yang sudah di luar jangkauan
  // data baru dan tabel tampil "No data available" walau total datanya > 0. Laporan
  // user 2026-07-24 dengan screenshot: All Divisions tampil data, Project blank.
  // Di-adjust langsung saat render (pola resmi React utk "adjust state when props
  // change"), bukan useEffect — 1 key gabungan dibanding banyak prev-state terpisah.
  const filterKey = JSON.stringify([companyId, branchId, buFilter, excludeIntercompany, customerSearch, periodEndEffective, periodRange.start])
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
    date_from: periodRange.start,
    date_to: periodEndEffective,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: sortModel[0]?.field as 'invoice_date' | 'total_revenue' | 'total_gp' | undefined,
    sort_dir: sortModel[0]?.sort as 'asc' | 'desc' | undefined,
  }

  const { data, isLoading, error } = useInvoices(queryParams)
  const invoices = data?.data ?? []

  // Kartu ringkasan Revenue/Laba Kotor/Margin (2026-08-29, instruksi user:
  // "Tambahkan card summary di menu transaksi") DAN export Excel
  // (2026-08-30) — filter SAMA PERSIS queryParams minus sort/pagination,
  // 1 objek dipakai bersama supaya kartu, export, DAN tabel selalu sinkron
  // dgn filter yang lagi aktif, tidak ada 3 definisi filter yang bisa
  // menyimpang.
  const summaryParams = {
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    customer_search: customerSearch || undefined,
    business_unit: buFilter || undefined,
    exclude_intercompany: excludeIntercompany,
    date_from: periodRange.start,
    date_to: periodEndEffective,
  }
  const { data: summary, isLoading: summaryLoading } = useInvoicesSummary(summaryParams)

  const handleRowClick = useCallback((row: InvoiceRow) => {
    setSelectedInvoiceId(row.id)
  }, [])

  // Dialog pilih field (2026-08-30) — buka dialog dulu, download beneran
  // baru dipicu dari tombol Export DI DALAM dialog itu (bukan langsung
  // pas ikon di header tabel diklik).
  const handleExport = async (fields: string[]) => {
    setExporting(true)
    try {
      await transactionsApi.exportInvoices(summaryParams, fields)
      setExportDialogOpen(false)
    } catch {
      enqueueSnackbar(t('transactions.exportError'), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'invoice_number', headerName: t('transactions.invoiceNumber'), width: 160 },
    { field: 'invoice_date', headerName: t('transactions.invoiceDate'), width: 120 },
    { field: 'company', headerName: t('customers.detail.company'), width: 140, valueGetter: (_v: unknown, row: InvoiceRow) => row.company.name },
    { field: 'customer', headerName: t('customers.name'), flex: 1, minWidth: 180, valueGetter: (_v: unknown, row: InvoiceRow) => row.customer.name },
    { field: 'business_unit', headerName: t('customers.detail.businessUnit'), width: 120, renderCell: ({ row }) => <BuChip bu={row.customer.business_unit} /> },
    { field: 'total_revenue', headerName: t('transactions.totalRevenue'), width: 140, type: 'number', sortable: true, valueFormatter: (v: unknown) => formatRupiah(v as number) },
    { field: 'total_gp', headerName: t('transactions.totalGP'), width: 130, type: 'number', sortable: true, valueFormatter: (v: unknown) => formatRupiah(v as number) },
    { field: 'gp_margin_percent', headerName: t('transactions.gpMargin'), width: 100, type: 'number', valueFormatter: (v: unknown) => `${(v as number).toFixed(1)}%` },
    { field: 'category_count', headerName: t('transactions.categoryCount'), width: 100, type: 'number' },
    { field: 'import_source', headerName: t('transactions.importSource'), width: 100, renderCell: ({ row }) => row.import_source ?? '—' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AdvancedFilterBar
        title={t('transactions.title')}
        filter={filterBar}
        hasAccess
        loading={isLoading}
        showParetoAndDateCutoff={false}
      >
        <ReportSummaryCards items={[
          { label: t('transactions.totalRevenue'), value: summaryLoading ? '—' : formatRupiah(summary?.total_revenue ?? 0),
            icon: PaidOutlinedIcon, iconColor: 'primary', highlighted: true },
          { label: t('transactions.totalGP'), value: summaryLoading ? '—' : formatRupiah(summary?.total_gp ?? 0),
            icon: TrendingUpIcon, iconColor: 'success' },
          { label: t('transactions.gpMargin'), value: summaryLoading ? '—' : `${(summary?.gp_margin_percent ?? 0).toFixed(1)}%`,
            icon: PercentIcon, iconColor: 'warning' },
        ]} />

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
          search={{ value: customerSearch, onChange: setCustomerSearch, placeholder: t('transactions.searchPlaceholder') }}
          periodLabel={periodLabel}
          actions={canExport && (
            <Tooltip title={t('transactions.exportExcel')} placement="top">
              <span>
                <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setExportDialogOpen(true)} disabled={exporting}>
                  {exporting ? <CircularProgress size={18} /> : <DownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </span>
            </Tooltip>
          )}
        />
      </AdvancedFilterBar>

      <InvoiceDetailDialog invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />
      {canExport && (
        <ExportFieldsDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExport}
          exporting={exporting}
        />
      )}
    </Box>
  )
}