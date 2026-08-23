import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { StatusChip } from '@/components/ui/StatusChip';
import { formatRupiah } from '@/utils/format';

// Helper non-komponen dipisah dari M7Expansion.tsx (2026-08-21) — ESLint
// react-refresh/only-export-components menolak file yang expose komponen
// React DAN fungsi biasa sekaligus. Dipakai bersama M7Expansion.tsx (Customer
// Metrics workbench) dan M7ExpansionGrowth.tsx (tab Ekspansi halaman Growth)
// — dialog drill-down klik-titik SAMA PERSIS di kedua tempat, tidak boleh
// didefinisikan ulang (pola centralize, bukan duplikasi).
//
// 3-way (koreksi user 2026-08-21 "ganti chart jadi positif negatif") — dulu
// binary 'up' | 'flat_down' (chip abu netral buat keduanya, tidak bisa
// bedakan "spending sama persis" vs "spending turun"). Backend
// (fetchExpansionBreakdown, m3m7.repository.ts) SEBENARNYA sudah kirim
// 3-way sejak koreksi 2026-08-10 ("pisahkan flat/turun") — cuma frontend
// (type + chip) yang belum pernah disambungkan.
//
// 4-way (susulan, sama hari, KERAS — user: "datamu tidak valid jika tanpa
// transaksi kamu beri label stabil") — 'inactive' (cur=prev=0, tidak ada
// transaksi sama sekali di kedua window) dipisah dari 'flat' (cur=prev
// DAN cur>0, genuinely tidak berubah). Chip 'inactive' pakai warning
// (kuning) — beda dari 'flat' (default/abu, benar-benar netral) dan
// 'down' (error/merah, aktif menurun) — 'inactive' secara bisnis lebih
// perlu perhatian daripada 'flat' tapi bukan penurunan aktif spt 'down'.
export function statusChipColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'up') return 'success';
  if (status === 'down') return 'error';
  if (status === 'inactive') return 'warning';
  return 'default';
}

export function statusLabel(status: string, t: TFunction): string {
  if (status === 'up') return t('customerMetrics.m7.statusUp');
  if (status === 'down') return t('customerMetrics.m7.statusDown');
  if (status === 'inactive') return t('customerMetrics.m7.statusInactive');
  return t('customerMetrics.m7.statusFlat');
}

// Kolom customer/code reuse key m4.* (sudah pola yang sama dipakai
// M3Revenue.tsx) — generik lintas M3/M4/M7, tidak perlu duplikasi key
// per-metrik. Branch/Division/Channel (2026-08-21, samakan §28.10 — user:
// "standarmu berubah-rubah, tab 3 ini melenceng jauh", semua KPI lain
// py kolom ini) — reuse key i18n `common.branch`/`customers.detail.*`
// yang SAMA PERSIS dipakai BreakdownTable.tsx (CrossSelling), bukan bikin
// key baru duplikat.
//
// Kolom "#" (ranking) DIHAPUS (susulan, sama hari) — user tanya "#, id itu
// kolom apa?": nilainya urutan TETAP dari backend (revenue delta desc),
// jadi kelihatan acak/membingungkan begitu tabel di-sort ulang lewat
// dropdown Sort (mis. Name A-Z) — angkanya tidak ikut berubah sesuai
// urutan tampilan. `BreakdownTable.tsx` (M1/M2) JUGA tidak punya kolom
// nomor urut sama sekali — konsisten dihapus di sini juga. `ranking`
// TETAP dipakai sbg `id` internal DataGrid (unique per baris), cuma tidak
// lagi jadi kolom yang ditampilkan.
//
// Kolom "Code" (customer_code) JUGA DIHAPUS (susulan, sama hari — user
// tanya "kode itu apa?") — dicek langsung ke DB: customer_code NULL utk
// SEMUA 32994 customer (0%), kolom ini SELALU tampil "—" tanpa kecuali di
// dataset ini, sama sekali tidak informatif. M1 SUDAH pernah menghapus
// kolom yang sama persis dgn alasan sama (§28.10: "Kolom ID Pelanggan
// dihapus dari tabel M1") — konsisten dihapus di sini juga. Field
// `customer_code` TETAP dipakai utk search (M7ExpansionGrowth.tsx), cuma
// tidak lagi jadi kolom tampilan (pola sama M1).
// `snapshot` (2026-08-23, task029.md §31, instruksi user: "hapus revenue
// sebelumnya dan % perubahan [di popup drill-down chart] ... di sini kita
// hanya snapshot periode berjalan sama dengan yang lainnya") — popup
// drill-down di halaman CHART (M7ExpansionGrowth.tsx) jadi snapshot murni
// (pola sama M1/M2, tanpa kolom pembanding), sementara tabel di halaman
// LAPORAN (pages/Report/Growth/index.tsx) TETAP butuh kolom pembanding
// penuh (prev_revenue/change_pct, itu justru tempatnya) — SATU fungsi ini
// tetap dipakai bareng, cuma beda parameter, BUKAN 2 fungsi terpisah.
export function useExpansionColumns(t: TFunction, snapshot = false): GridColDef[] {
  const columns: GridColDef[] = [
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'branch',   headerName: t('common.branch'),                width: 130, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'division', headerName: t('customers.detail.division'),    width: 130, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'channel',  headerName: t('customers.detail.channel'),     width: 150, sortable: false,
      renderCell: (p) => p.value ?? '—' },
  ]
  if (!snapshot) {
    columns.push({ field: 'prev_revenue', headerName: t('customerMetrics.m7.colPrevRevenue'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => formatRupiah(p.value as number) })
  }
  columns.push({ field: 'cur_revenue', headerName: t(snapshot ? 'customerMetrics.m7.colRevenue' : 'customerMetrics.m7.colCurRevenue'), width: 130, align: 'right', headerAlign: 'right',
    renderCell: (p) => formatRupiah(p.value as number) })
  if (!snapshot) {
    columns.push({ field: 'change_pct', headerName: t('customerMetrics.m7.colChangePct'), width: 100, align: 'right', headerAlign: 'right',
      renderCell: (p) => (p.value === null ? '—' : `${p.value}%`) })
  }
  columns.push({ field: 'status', headerName: t('customerMetrics.m7.colStatus'), width: 110, align: 'center', headerAlign: 'center', sortable: false,
    renderCell: (p) => <StatusChip label={statusLabel(p.value as string, t)} color={statusChipColor(p.value as string)} /> })
  return columns
}
