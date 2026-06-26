// frontend/src/pages/Customers/index.tsx
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useTranslation } from 'react-i18next';
import { useCustomers360 } from '@/hooks/useCustomers';
import type { CustomerStatus, BusinessUnit, Customer360Row } from '@/types/customers';
import { StatusChip } from './components/StatusChip';
import { BuChip } from '@/pages/Transactions/components/BuChip';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';

// ─── Format currency IDR ──────────────────────────────────────────────────────
function formatIDR(val: number) {
  return `Rp ${(val / 1_000_000).toFixed(1)}M`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Customers() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [buFilter, setBuFilter] = useState<NonNullable<BusinessUnit> | ''>('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const queryParams = {
    company_id: 'all' as const,
    search: search || undefined,
    status: (statusFilter || undefined) as CustomerStatus | undefined,
    business_unit: (buFilter || undefined) as NonNullable<BusinessUnit> | undefined,
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

  const { data, isLoading, error } = useCustomers360(queryParams);

  const handleRowClick = useCallback((row: Customer360Row) => {
    setSelectedCustomerId(row.id);
  }, []);

  const columns: GridColDef<Customer360Row>[] = [
    { field: 'customer_code', headerName: t('customers.code'), width: 130, sortable: false },
    { field: 'name', headerName: t('customers.name'), flex: 1, minWidth: 180, sortable: false },
    { field: 'company', headerName: t('customers.detail.company'), width: 160, sortable: false, valueGetter: (_value, row) => row.company.name },
    { field: 'business_unit', headerName: t('customers.detail.businessUnit'), width: 140, sortable: false, renderCell: ({ row }) => <BuChip bu={row.business_unit} /> },
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
        <TextField select size="small" label={t('customers.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="active">{t('customers.statusLabels.active')}</MenuItem>
          <MenuItem value="dormant">{t('customers.statusLabels.dormant')}</MenuItem>
          <MenuItem value="new">{t('customers.statusLabels.new')}</MenuItem>
        </TextField>
        <TextField select size="small" label={t('customers.detail.businessUnit')} value={buFilter} onChange={(e) => setBuFilter(e.target.value as NonNullable<BusinessUnit> | '')} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="b2b_dc">B2B DC</MenuItem>
          <MenuItem value="b2b_project">B2B Project</MenuItem>
          <MenuItem value="b2c">B2C</MenuItem>
          <MenuItem value="manufacturing">Manufacturing</MenuItem>
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
        onRowClick={(row) => handleRowClick(row as unknown as Customer360Row)}
        height={600}
      />

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </Box>
  );
}