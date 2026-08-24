import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { formatRupiah } from '@/utils/format';

// Helper non-komponen dipisah dari M6RepeatOrder.tsx (2026-08-24, pola sama
// persis expansionHelpers.tsx/M7 — ESLint react-refresh/only-export-
// components menolak file yang expose komponen React DAN fungsi biasa
// sekaligus). Dipakai bersama M6RepeatOrder.tsx (chart, dialog drilldown)
// dan Report/Retention/index.tsx (tabel breakdown Laporan) — kolom SAMA
// PERSIS, tidak boleh didefinisikan ulang (pola centralize, bukan duplikasi).
export function orderCountColor(n: number): StatusChipColor {
  if (n >= 10) return 'success';
  if (n >= 5)  return 'primary';
  if (n >= 3)  return 'info';
  return 'default';
}

export function useRorColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m6.colRank'),       width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m6.colCustomer'),   flex: 1,    minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m6.colCode'),       width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'invoice_count', headerName: t('customerMetrics.m6.colOrderCount'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={`${p.value}x`}
          color={orderCountColor(p.value as number)}
        />
      ) },
    { field: 'total_revenue', headerName: t('customerMetrics.m6.colTotalRevenue'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
  ]
}
