// frontend/src/pages/Customers/index.tsx
import { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useTranslation } from 'react-i18next';
import { useCustomers } from '@/hooks/useCustomers';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import type { CustomerStatus, CustomerRow } from '@/types/customers';
import { StatusChip } from './components/StatusChip';
import { DivisionChip } from './components/DivisionChip';
import { CustomerDetailDialog } from './components/CustomerDetailDialog';
import { formatIDR } from '@/utils/format';

export default function Customers() {
  const { t } = useTranslation();

  const scopeFilter = useScopedCompanyFilter();
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter } = scopeFilter;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset ke halaman 1 setiap kali filter berubah — pakai pola "adjust state during
  // render" (dibandingkan ref filterKey sebelumnya), BUKAN useEffect terpisah, karena
  // sumber perubahannya banyak (5 filter independen dari beberapa tempat berbeda,
  // termasuk hook useScopedCompanyFilter) - tidak praktis digabung ke satu handler.
  const filterKey = `${debouncedSearch}|${statusFilter}|${divisionFilter}|${companyFilter}|${branchFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }

  const queryParams = {
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    search: debouncedSearch || undefined,
    status: (statusFilter || undefined) as CustomerStatus | undefined,
    business_unit: divisionFilter || undefined,
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

  const columns: GridColDef<CustomerRow>[] = [
    { field: 'customer_code', headerName: t('customers.code'), width: 130, sortable: false },
    { field: 'name', headerName: t('customers.name'), flex: 1, minWidth: 180, sortable: false },
    { field: 'company', headerName: t('customers.detail.company'), width: 160, sortable: false, valueGetter: (_value, row) => row.company.name },
    { field: 'division', headerName: t('customers.detail.division'), width: 140, sortable: false, renderCell: ({ row }) => <DivisionChip division={row.division} /> },
    { field: 'status', headerName: t('customers.status'), width: 110, sortable: false, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'category_count', headerName: t('customers.categories'), width: 110, type: 'number', sortable: true },
    { field: 'avg_monthly_revenue', headerName: t('customers.detail.avgMonthly'), width: 160, type: 'number', sortable: true, valueFormatter: (value) => formatIDR(value as number) },
    { field: 'lifetime_value', headerName: t('customers.detail.lifetimeValue'), width: 160, type: 'number', sortable: true, valueFormatter: (value) => formatIDR(value as number) },
    { field: 'last_invoice_date', headerName: t('customers.lastTransaction'), width: 150, sortable: true, valueFormatter: (value) => (value as string) ?? '-' },
    { field: 'total_invoices', headerName: t('customers.totalInvoices'), width: 110, type: 'number', sortable: false },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('customers.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('customers.subtitle')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <TextField size="small" placeholder={t('customers.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 240 }} />
        <ScopeFilterFields filter={scopeFilter} />
        <TextField select size="small" label={t('customers.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="active">{t('customers.statusLabels.active')}</MenuItem>
          <MenuItem value="existing">{t('customers.statusLabels.existing')}</MenuItem>
          <MenuItem value="dormant">{t('customers.statusLabels.dormant')}</MenuItem>
          <MenuItem value="new">{t('customers.statusLabels.new')}</MenuItem>
        </TextField>
      </Box>

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
      />

      <CustomerDetailDialog
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </Box>
  );
}
