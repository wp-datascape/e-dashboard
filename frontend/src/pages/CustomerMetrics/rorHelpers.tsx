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
    // customer_code DIHAPUS (2026-08-26, task029.md §36.19) — customer_code
    // NULL utk SEMUA customer (temuan lama, sudah dihapus dari kolom lain).
    { field: 'invoice_count', headerName: t('customerMetrics.m6.colOrderCount'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={`${p.value}x`}
          color={orderCountColor(p.value as number)}
        />
      ) },
    { field: 'total_revenue', headerName: t('customerMetrics.m6.colTotalRevenue'), width: 150, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
    // avg_per_order (2026-08-26, task029.md §36.19, instruksi user:
    // "lengkapi kolom data tabel agar lebih detail dan eksplisit utk
    // analisa detail data per kategory") — dihitung client-side dari
    // total_revenue/invoice_count yang SUDAH ada (bukan field backend
    // baru), memberi konteks nilai RATA-RATA per transaksi, bukan cuma
    // total mentah.
    { field: 'avg_per_order', headerName: t('customerMetrics.m6.colAvgPerOrder'), width: 150, align: 'right', headerAlign: 'right', sortable: false,
      renderCell: (p) => {
        const row = p.row as { total_revenue: number; invoice_count: number }
        return formatRupiah(row.invoice_count > 0 ? Math.round(row.total_revenue / row.invoice_count) : 0)
      } },
  ]
}
