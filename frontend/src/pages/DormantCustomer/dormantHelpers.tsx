import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { formatDateID } from '@/utils/date';
import type { DormantCustomerStatus } from '@/types/metrics';
import { fmtRp } from './helpers';

// Helper non-komponen dipisah dari M8DormantRate.tsx/M10ReactivationRate.tsx
// (2026-08-24, pola sama persis expansionHelpers.tsx/rorHelpers.tsx — ESLint
// react-refresh/only-export-components menolak file yang expose komponen
// React DAN fungsi biasa sekaligus). Dipakai bersama chart+dialog drilldown
// (M8/M10) dan Report/Retention/index.tsx (tabel breakdown Laporan) — kolom
// SAMA PERSIS, tidak boleh didefinisikan ulang (pola centralize).

// ─── M8/M9 (ranking dormant by estimated lost value) ──────────────────────
// `fetchDormantValueRanking` (backend) dipakai KEDUANYA: M8 dialog drilldown
// (limit=null) dan M9 chart (limit=20) — kolomnya SAMA PERSIS, satu fungsi
// ini dipakai bersama.
export function monthsDormantColor(n: number): 'default' | 'info' | 'primary' | 'error' {
  if (n >= 12) return 'error';
  if (n >= 6)  return 'primary';
  return 'info';
}

export function useDormantBreakdownColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('dormantCustomer.colRank'),       width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('dormantCustomer.colCustomer'),   flex: 1,    minWidth: 160 },
    { field: 'customer_code', headerName: t('dormantCustomer.colCode'),       width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'last_invoice_date', headerName: t('dormantCustomer.colLastInvoice'), width: 130, sortable: false,
      renderCell: (p) => formatDateID(p.value as string) },
    { field: 'months_dormant', headerName: t('dormantCustomer.colMonthsDormant'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={t('dormantCustomer.monthsDormantValue', { count: p.value })}
          color={monthsDormantColor(p.value as number)}
        />
      ) },
    { field: 'estimated_lost_value', headerName: t('dormantCustomer.colEstimatedLoss'), width: 150, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRp(p.value as number) },
  ]
}

// ─── M10 (status log per customer: active/dormant/reactivated/relapsed) ───
export const STATUS_COLOR: Record<DormantCustomerStatus, StatusChipColor> = {
  active:      'success',
  dormant:     'error',
  reactivated: 'info',
  relapsed:    'warning',
};

export function statusLabel(t: TFunction, status: DormantCustomerStatus): string {
  return t(`dormantCustomer.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

export function useDormantStatusColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'customer_name', headerName: t('dormantCustomer.colCustomer'), flex: 1, minWidth: 160 },
    { field: 'customer_code', headerName: t('dormantCustomer.colCode'), width: 100, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'status', headerName: t('dormantCustomer.colStatus'), width: 170, sortable: false,
      renderCell: (p) => <StatusChip label={statusLabel(t, p.value as DormantCustomerStatus)} color={STATUS_COLOR[p.value as DormantCustomerStatus]} /> },
    { field: 'reactivation_date', headerName: t('dormantCustomer.colReactivationDate'), width: 140, sortable: false,
      renderCell: (p) => (p.value ? formatDateID(p.value as string) : '—') },
    { field: 'dormant_since_date', headerName: t('dormantCustomer.colDormantSinceDate'), width: 130, sortable: false,
      renderCell: (p) => (p.value ? formatDateID(p.value as string) : '—') },
    { field: 'last_invoice_in_period', headerName: t('dormantCustomer.colLastInvoiceInPeriod'), width: 140, sortable: false,
      renderCell: (p) => (p.value ? formatDateID(p.value as string) : '—') },
  ];
}
