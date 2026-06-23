// frontend/src/pages/Customers/index.tsx
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CloseIcon from '@mui/icons-material/Close';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useTranslation } from 'react-i18next';
import { useCustomers360, useCustomer360Detail } from '@/hooks/useCustomers';
import type { CustomerStatus, BusinessUnit, Customer360Row } from '@/types/customers';
import { ComboChartWidget } from '@/components/charts/ComboChartWidget';

// ─── Status Chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: CustomerStatus }) {
  const { t } = useTranslation();
  const colorMap: Record<CustomerStatus, 'success' | 'error' | 'info'> = {
    active: 'success',
    dormant: 'error',
    new: 'info',
  };
  return (
    <Chip
      label={t(`customers.statusLabels.${status}`)}
      color={colorMap[status]}
      size="small"
    />
  );
}

// ─── Business Unit Label ──────────────────────────────────────────────────────
function BuLabel({ bu }: { bu: BusinessUnit }) {
  const { t } = useTranslation();
  if (!bu) {
    return (
      <Typography variant="body2" color="text.disabled">
        {t('common.none')}
      </Typography>
    );
  }
  const labelMap: Record<NonNullable<BusinessUnit>, string> = {
    b2b_dc: 'B2B DC',
    b2b_project: 'B2B Project',
    b2c: 'B2C',
    manufacturing: 'Manufacturing',
  };
  return <Typography variant="body2">{labelMap[bu]}</Typography>;
}

// ─── Format currency IDR ──────────────────────────────────────────────────────
function formatIDR(val: number) {
  return `Rp ${(val / 1_000_000).toFixed(1)}M`;
}

// ─── Customer Detail Drawer ───────────────────────────────────────────────────
function CustomerDetailDrawer({
  customerId,
  onClose,
}: {
  customerId: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: detail, isLoading } = useCustomer360Detail(customerId);

  return (
    <Drawer
      anchor="right"
      open={!!customerId}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('customers.detail.title')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {isLoading && (
          <Stack spacing={1.5}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        )} 

        {detail && (
          <Stack spacing={2}>
            {/* Kode customer */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {t('customers.code')}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {detail.customer_code}
              </Typography>
            </Box>

            {/* Nama customer */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {t('customers.name')}
              </Typography>
              <Typography variant="body1">{detail.name}</Typography>
            </Box>

            {/* Status + BU */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('customers.status')}
                </Typography>
                <StatusChip status={detail.status} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('customers.detail.businessUnit')}
                </Typography>
                <BuLabel bu={detail.business_unit} />
              </Box>
            </Box>

            <Divider />

            {/* KPI row 1 */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.detail.lifetimeValue')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatIDR(detail.lifetime_value)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.detail.avgMonthly')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatIDR(detail.avg_monthly_revenue)}
                </Typography>
              </Box>
            </Box>

            {/* KPI row 2 */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.categories')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {detail.category_count}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.totalInvoices')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {detail.recent_invoices.length > 0
                    ? `${detail.recent_invoices.length}+`
                    : '-'}
                </Typography>
              </Box>
            </Box>

            {/* Kategori yang dibeli */}
            {detail.categories_bought.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('customers.detail.categoriesBought')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {detail.categories_bought.map((cat) => (
                    <Chip key={cat} label={cat} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Revenue trend chart — always shown */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('customers.detail.revenueTrend')}
              </Typography>
              <ComboChartWidget
                title=""
                data={detail.monthly_revenue_trend}
                barKey="revenue"
                barLabel="Revenue"
                barColor="#3B82F6"
                lineKey="gp"
                lineLabel="GP"
                lineColor="#10B981"
                xKey="month"
                height={180}
                formatBar={(v) => formatIDR(v)}
                formatLine={(v) => formatIDR(v)}
              />
            </Box>

            {/* Recent invoices */}
            {detail.recent_invoices.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('customers.detail.recentInvoices')}
                </Typography>
                <Stack spacing={1}>
                  {detail.recent_invoices.map((inv) => (
                    <Box
                      key={inv.invoice_number}
                      sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {inv.invoice_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {inv.invoice_date}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Revenue: {formatIDR(inv.total_revenue)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          GP: {formatIDR(inv.total_gp)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
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
    {
      field: 'customer_code',
      headerName: t('customers.code'),
      width: 130,
      sortable: false,
    },
    {
      field: 'name',
      headerName: t('customers.name'),
      flex: 1,
      minWidth: 180,
      sortable: false,
    },
    {
      field: 'company',
      headerName: t('customers.detail.company'),
      width: 160,
      sortable: false,
      valueGetter: (_value, row) => row.company.name,
    },
    {
      field: 'business_unit',
      headerName: t('customers.detail.businessUnit'),
      width: 140,
      sortable: false,
      renderCell: ({ row }) => <BuLabel bu={row.business_unit} />,
    },
    {
      field: 'status',
      headerName: t('customers.status'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => <StatusChip status={row.status} />,
    },
    {
      field: 'category_count',
      headerName: t('customers.categories'),
      width: 110,
      type: 'number',
      sortable: true,
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('customers.detail.avgMonthly'),
      width: 160,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'lifetime_value',
      headerName: t('customers.detail.lifetimeValue'),
      width: 160,
      type: 'number',
      sortable: true,
      valueFormatter: (value) => formatIDR(value as number),
    },
    {
      field: 'last_invoice_date',
      headerName: t('customers.lastTransaction'),
      width: 150,
      sortable: true,
      valueFormatter: (value) => (value as string) ?? '-',
    },
    {
      field: 'total_invoices',
      headerName: t('customers.totalInvoices'),
      width: 110,
      type: 'number',
      sortable: false,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('customers.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('customers.subtitle')}
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
          placeholder={t('customers.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          size="small"
          label={t('customers.status')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="active">{t('customers.statusLabels.active')}</MenuItem>
          <MenuItem value="dormant">{t('customers.statusLabels.dormant')}</MenuItem>
          <MenuItem value="new">{t('customers.statusLabels.new')}</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label={t('customers.detail.businessUnit')}
          value={buFilter}
          onChange={(e) => setBuFilter(e.target.value as NonNullable<BusinessUnit> | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="b2b_dc">B2B DC</MenuItem>
          <MenuItem value="b2b_project">B2B Project</MenuItem>
          <MenuItem value="b2c">B2C</MenuItem>
          <MenuItem value="manufacturing">Manufacturing</MenuItem>
        </TextField>
      </Box>

      {/* DataGrid (Responsive) */}
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

      {/* Detail Drawer */}
      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </Box>
  );
}
