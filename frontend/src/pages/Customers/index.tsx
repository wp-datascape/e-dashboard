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
import { useCompanies, useBranchesByCompany } from '@/hooks/useCompanies';
import { useDivisionOptions } from '@/hooks/useDivisionOptions';
import { useMyScope } from '@/hooks/useMyScope';
import { getScopedBranches, getScopedDivisions } from '@/utils/scopeFilters';
import { formatEnumLabel } from '@/utils/format';
import type { CustomerStatus, Division, CustomerRow } from '@/types/customers';
import { StatusChip } from './components/StatusChip';
import { DivisionChip } from './components/DivisionChip';
import { CustomerDetailDialog } from './components/CustomerDetailDialog';
import { formatIDR } from '@/utils/format';

export default function Customers() {
  const { t } = useTranslation();

  const { data: companies = [] } = useCompanies();
  const showCompanyFilter = companies.length > 1;
  const [companyFilter, setCompanyFilter] = useState<number | 'all'>('all');
  const [branchFilter, setBranchFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [divisionFilter, setDivisionFilter] = useState<NonNullable<Division> | ''>('');

  // Filter Branch/Division mengikuti level akses user sendiri (docs-v2/task/task001.md):
  // restricted=false → user unrestricted di level ini (superadmin/full access), pakai daftar
  // penuh (data-driven). restricted=true → cuma opsi yang di-assign eksplisit ke user.
  const myScope = useMyScope();
  const scopedBranches = getScopedBranches(myScope, companyFilter);
  const { data: allBranches = [] } = useBranchesByCompany(companyFilter === 'all' ? null : companyFilter);
  const branchOptions = scopedBranches.restricted
    ? scopedBranches.options.map((b) => ({ id: b.branch_id, name: b.branch_name }))
    : allBranches.map((b) => ({ id: b.id, name: b.name }));
  const showBranchFilter = companyFilter !== 'all' && branchOptions.length > 1;

  const scopedDivisions = getScopedDivisions(myScope, companyFilter, branchFilter);
  const fullDivisionOptions = useDivisionOptions(companyFilter);
  const divisionOptions = scopedDivisions.restricted
    ? scopedDivisions.options.map((value) => ({ value: value as NonNullable<Division>, label: formatEnumLabel(value) }))
    : fullDivisionOptions;

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

  // Company berganti → branch/division ikut direset (branch lama mungkin sudah tidak relevan)
  useEffect(() => {
    setBranchFilter('all');
  }, [companyFilter]);

  // Branch berganti → division direset (opsi division tergantung branch yang dipilih)
  useEffect(() => {
    setDivisionFilter('');
  }, [branchFilter]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [debouncedSearch, statusFilter, divisionFilter, companyFilter, branchFilter]);

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
        {showCompanyFilter && (
          <TextField select size="small" label={t('common.company')} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} sx={{ minWidth: 180 }}>
            <MenuItem value="all">{t('common.all')}</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        )}
        {showBranchFilter && (
          <TextField select size="small" label={t('common.branch')} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} sx={{ minWidth: 160 }}>
            <MenuItem value="all">{t('common.all')}</MenuItem>
            {branchOptions.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField select size="small" label={t('customers.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="active">{t('customers.statusLabels.active')}</MenuItem>
          <MenuItem value="existing">{t('customers.statusLabels.existing')}</MenuItem>
          <MenuItem value="dormant">{t('customers.statusLabels.dormant')}</MenuItem>
          <MenuItem value="new">{t('customers.statusLabels.new')}</MenuItem>
        </TextField>
        <TextField select size="small" label={t('customers.detail.division')} value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value as NonNullable<Division> | '')} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          {divisionOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
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
