import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { StatusChip } from '@/components/ui/StatusChip';
import { formatRupiah } from '@/utils/format';

// Helper non-komponen dipisah dari M3Revenue.tsx/M4GrossProfit.tsx/
// M5HighMargin.tsx (2026-08-25, task029.md §33 — standarisasi Value ke
// pola Growth/Retention) — ESLint react-refresh/only-export-components
// menolak file yang expose komponen React DAN fungsi biasa sekaligus.
// Dipakai bersama chart (M3/M4/M5) dan Report/Revenue/index.tsx (tabel
// breakdown Laporan) — kolom SAMA PERSIS, tidak boleh didefinisikan ulang
// (pola centralize, bukan duplikasi). `tierChipColor`/`tierLabel`
// SEBELUMNYA duplikat identik di M3Revenue.tsx DAN M4GrossProfit.tsx —
// sekarang 1 sumber.
export function tierChipColor(tier: string): 'primary' | 'info' | 'default' {
  if (tier === 'Atas')   return 'primary';
  if (tier === 'Tengah') return 'info';
  return 'default';
}

export function tierLabel(tier: string, t: TFunction): string {
  if (tier === 'Atas')   return t('customerMetrics.m4.tierTop');
  if (tier === 'Tengah') return t('customerMetrics.m4.tierMid');
  if (tier === 'Bawah')  return t('customerMetrics.m4.tierBottom');
  return tier;
}

// ─── M3 Revenue ─────────────────────────────────────────────────────────
export function useRevenueColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m4.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'revenue',     headerName: t('customerMetrics.m3.colRevenue'),     width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
    { field: 'revenue_pct', headerName: t('customerMetrics.m3.colRevenuePct'), width: 90,  align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
    { field: 'hm_revenue', headerName: t('customerMetrics.m3.colHmRevenue'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
    { field: 'hm_pct', headerName: t('customerMetrics.m3.colHmPct'), width: 90, align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), width: 100, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => <StatusChip label={tierLabel(p.value as string, t)} color={tierChipColor(p.value as string)} /> },
  ]
}

// ─── M4 Gross Profit ────────────────────────────────────────────────────
export function useGpColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m4.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'gp',     headerName: t('customerMetrics.m4.colGp'),     width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
    { field: 'gp_pct', headerName: t('customerMetrics.m4.colGpPct'), width: 90,  align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), width: 100, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => <StatusChip label={tierLabel(p.value as string, t)} color={tierChipColor(p.value as string)} /> },
  ]
}

// ─── M5 High Margin ─────────────────────────────────────────────────────
// showPct (2026-08-25, task029.md §36, koreksi user: "Jangan ditampilkan,
// karena di drildown tidak ada revenue, hanya akan menimbulkan pertanyaan
// tidak perlu. Tampilkan di tabel laporan saja") — kolom "% TOTAL HM"
// (basis Revenue, BEDA dari ranking tabel yang sekarang basis Qty) TETAP
// muncul di Report/Revenue (tab HM) TAPI DISEMBUNYIKAN di dialog drilldown
// M5HighMargin.tsx — 1 fungsi shared, kolom terakhir opsional via flag,
// BUKAN 2 fungsi terpisah/duplikat.
export function useHmColumns(t: TFunction, options: { showPct?: boolean } = {}): GridColDef[] {
  const { showPct = true } = options;
  const columns: GridColDef[] = [
    { field: 'ranking',       headerName: t('customerMetrics.m5.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m5.colCustomer'), flex: 1,    minWidth: 160 },
    // customer_code (2026-08-25, task029.md §36, susulan instruksi user
    // "Hapus juga kode yang kosong itu") — kolom DIHAPUS, pola SAMA PERSIS
    // M1 (customer_code NULL utk SEMUA customer di data lokal, kolom itu
    // selalu tampil "—"). Field TETAP ada di data row (dipakai DataGrid id/
    // search), cuma bukan kolom tampilan lagi.
    // hm_qty (task029.md §36) — basis ranking SEKARANG (koreksi user: "Top 5
    // itu harusnya jumlah terbanyak bukan value nya"), ditaruh SEBELUM
    // hm_revenue supaya urutan kolom cocok urutan ranking-nya.
    { field: 'hm_qty', headerName: t('customerMetrics.m5.colQtyHm'), width: 90, align: 'right', headerAlign: 'right',
      renderCell: (p) => (p.value as number).toLocaleString('id-ID') },
    { field: 'hm_revenue', headerName: t('customerMetrics.m5.colRevenueHm'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) },
  ];
  if (showPct) {
    columns.push(
      { field: 'hm_pct', headerName: t('customerMetrics.m5.colPctHm'), width: 110, align: 'right', headerAlign: 'right',
        renderCell: (p) => `${p.value}%` },
    );
  }
  return columns
}
