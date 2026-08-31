// frontend/src/pages/Customers/index.tsx
import { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { useCustomers } from '@/hooks/useCustomers';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { customersApi } from '@/api/customers.api';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { FILTER_FIELD_WIDTH } from '@/components/filters/filterFieldWidth';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import type { CustomerStatus, CustomerRow } from '@/types/customers';
import { StatusChip } from './components/StatusChip';
import { DivisionChip } from './components/DivisionChip';
import { CustomerDetailDialog } from './components/CustomerDetailDialog';
import { ExportFieldsDialog } from './components/ExportFieldsDialog';
import { formatRupiah } from '@/utils/format';
import { currentYearMonth, resolvePeriodEnd, formatMonthYearLabel, formatDateID } from '@/utils/date';

export default function Customers() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const can = useCan();
  const canExport = can('customer:export');

  const scopeFilter = useScopedCompanyFilter();
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [periodMonth, setPeriodMonth] = useState(currentYearMonth());
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  // advancedOpen (2026-08-30, instruksi user: "lakukan perbaikan serupa ke
  // halaman customer" - sama pola dgn Products/index.tsx: Entity+Periode
  // quick, sisanya di panel "Filter Lanjutan" collapse, filter TETAP apply
  // langsung tiap ganti value.
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset ke halaman 1 setiap kali filter berubah — pakai pola "adjust state during
  // render" (dibandingkan ref filterKey sebelumnya), BUKAN useEffect terpisah, karena
  // sumber perubahannya banyak (5 filter independen dari beberapa tempat berbeda,
  // termasuk hook useScopedCompanyFilter) - tidak praktis digabung ke satu handler.
  const filterKey = `${debouncedSearch}|${statusFilter}|${divisionFilter}|${companyFilter}|${branchFilter}|${periodMonth}|${excludeIntercompany}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }

  const asOfDate = resolvePeriodEnd(periodMonth);

  const queryParams = {
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    search: debouncedSearch || undefined,
    status: (statusFilter || undefined) as CustomerStatus | undefined,
    business_unit: divisionFilter || undefined,
    as_of_date: asOfDate,
    exclude_intercompany: excludeIntercompany,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
    sort_by: sortModel[0]?.field as
      | 'avg_monthly_revenue'
      | 'lifetime_value'
      | 'category_count'
      | 'last_invoice_date'
      | undefined,
    sort_dir: sortModel[0]?.sort as 'asc' | 'desc' | undefined,
  };

  const { data, isLoading, error } = useCustomers(queryParams);

  const handleRowClick = useCallback((row: CustomerRow) => {
    setSelectedCustomerId(row.id);
  }, []);

  // Info periode di header tabel (2026-08-31, instruksi user: "tambahkan
  // info periode sebagai judul di tabel product dan customer") — pola sama
  // Products/index.tsx, filter di halaman ini juga cuma bulan tunggal.
  const periodLabel = formatMonthYearLabel(periodMonth);

  // Dialog pilih field (2026-08-31, instruksi user: "periksa juga untuk
  // export customer" — susulan fitur pilih field export Products) — buka
  // dialog dulu, download beneran baru dipicu dari tombol Export DI DALAM
  // dialog itu, pola sama persis Transactions/index.tsx. Filter SAMA
  // PERSIS queryParams minus page/per_page/sort_by/sort_dir.
  const handleExport = async (fields: string[]) => {
    setExporting(true);
    try {
      await customersApi.exportCustomers({
        company_id: companyFilter,
        branch_id: branchFilter === 'all' ? undefined : branchFilter,
        search: debouncedSearch || undefined,
        status: (statusFilter || undefined) as CustomerStatus | undefined,
        business_unit: divisionFilter || undefined,
        as_of_date: asOfDate,
        exclude_intercompany: excludeIntercompany,
      }, fields);
      setExportDialogOpen(false);
    } catch {
      enqueueSnackbar(t('customers.exportError'), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const columns: GridColDef<CustomerRow>[] = [
    { field: 'customer_code', headerName: t('customers.code'), width: 130, sortable: false },
    { field: 'name', headerName: t('customers.name'), flex: 1, minWidth: 180, sortable: false },
    { field: 'company', headerName: t('customers.detail.company'), width: 160, sortable: false, valueGetter: (_value, row) => row.company.name },
    { field: 'division', headerName: t('customers.detail.division'), width: 140, sortable: false, renderCell: ({ row }) => <DivisionChip division={row.division} /> },
    { field: 'status', headerName: t('customers.status'), width: 110, sortable: false, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'category_count', headerName: t('customers.categories'), width: 110, type: 'number', sortable: true },
    { field: 'avg_monthly_revenue', headerName: t('customers.detail.avgMonthly'), width: 160, type: 'number', sortable: true, valueFormatter: (value) => formatRupiah(value as number) },
    { field: 'lifetime_value', headerName: t('customers.detail.lifetimeValue'), width: 160, type: 'number', sortable: true, valueFormatter: (value) => formatRupiah(value as number) },
    { field: 'last_invoice_date', headerName: t('customers.lastTransaction'), width: 150, sortable: true, valueFormatter: (value) => value ? formatDateID(value as string) : '-' },
    { field: 'total_invoices', headerName: t('customers.totalInvoices'), width: 110, type: 'number', sortable: false },
  ];

  return (
    // display:flex/gap:3 (BUKAN `p:3`) — pola SAMA PERSIS Transactions/Products
    // (lihat komentar Products/index.tsx): `<main>` (DashboardLayout.tsx) SUDAH
    // kasih padding p:3 ke SEMUA halaman, `p:3` di sini dobel jadi 48px.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('customers.title')}</Typography>
          <Typography variant="pageSubtitle">{t('customers.subtitle')}</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
          <ScopeFilterFields filter={scopeFilter} fields={['entity']} />

          <MonthYearPicker
            size="small" label={t('common.filters.period')}
            value={periodMonth}
            onChange={setPeriodMonth}
            // minWidth (bukan width tetap) — format "MMMM YYYY" (nama bulan
            // penuh, mis. "Agustus 2026") butuh ruang lebih dari
            // FILTER_FIELD_WIDTH, width tetap bikin teksnya kepotong (bug
            // sama yang ditemukan di Products/index.tsx).
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: FILTER_FIELD_WIDTH } }}
          />

          <Button
            size="small"
            color="inherit"
            startIcon={advancedOpen ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
            onClick={() => setAdvancedOpen((v) => !v)}
            sx={{ textTransform: 'none' }}
          >
            {t('common.filters.advancedFilters')}
          </Button>
        </Box>
      </Box>

      <Collapse in={advancedOpen}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, p: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <ScopeFilterFields filter={scopeFilter} fields={['branch', 'division']} />

          <TextField select size="small" label={t('customers.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')} sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="active">{t('customers.statusLabels.active')}</MenuItem>
            <MenuItem value="existing">{t('customers.statusLabels.existing')}</MenuItem>
            <MenuItem value="dormant">{t('customers.statusLabels.dormant')}</MenuItem>
            <MenuItem value="new">{t('customers.statusLabels.new')}</MenuItem>
          </TextField>

          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Collapse>

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
        onRowClick={(row) => handleRowClick(row as unknown as CustomerRow)}
        height={600}
        // Nama customer sebagai judul card mobile, bukan customer_code (kolom
        // pertama di tabel desktop) — customer_code jarang terisi di database,
        // jadi kalau jadi judul, judul cardnya sering kosong/tidak informatif.
        mobileFields={['name', 'customer_code', 'company', 'division', 'status', 'category_count', 'avg_monthly_revenue', 'lifetime_value', 'last_invoice_date', 'total_invoices']}
        search={{ value: search, onChange: setSearch, placeholder: t('customers.searchPlaceholder') }}
        periodLabel={(
          <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t('customers.periodHeading', { period: periodLabel })}
          </Typography>
        )}
        actions={canExport && (
          <Tooltip title={t('customers.exportExcel')} placement="top">
            <span>
              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setExportDialogOpen(true)} disabled={exporting}>
                {exporting ? <CircularProgress size={18} /> : <DownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      />

      <CustomerDetailDialog
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        asOfDate={asOfDate}
      />
      {canExport && (
        <ExportFieldsDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExport}
          exporting={exporting}
        />
      )}
    </Box>
  );
}
