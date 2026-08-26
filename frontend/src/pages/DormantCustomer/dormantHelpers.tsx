import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { formatDateID } from '@/utils/date';
import { formatRupiah } from '@/utils/format';
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
    // customer_code DIHAPUS (2026-08-26, task029.md §36.19) — NULL utk
    // SEMUA customer (temuan lama, konsisten dgn kolom lain yg sudah
    // dihapus).
    { field: 'last_invoice_date', headerName: t('dormantCustomer.colLastInvoice'), width: 130, sortable: false,
      renderCell: (p) => formatDateID(p.value as string) },
    { field: 'months_dormant', headerName: t('dormantCustomer.colMonthsDormant'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={t('dormantCustomer.monthsDormantValue', { count: p.value })}
          color={monthsDormantColor(p.value as number)}
        />
      ) },
    // avg_monthly_revenue (2026-08-26, task029.md §36.19, instruksi user:
    // "lengkapi kolom data tabel agar lebih detail dan eksplisit utk
    // analisa detail data per kategory") — field SUDAH ADA di
    // DormantValueRow (basis hitung estimated_lost_value), sebelumnya
    // TIDAK ditampilkan sbg kolom sendiri — kasih konteks "seberapa besar
    // omzet bulanan customer ini SEBELUM dormant", bukan cuma total
    // estimasi kerugian akumulatif.
    { field: 'avg_monthly_revenue', headerName: t('dormantCustomer.colAvgMonthlyRevenue'), width: 160, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRp(p.value as number) },
    { field: 'estimated_lost_value', headerName: t('dormantCustomer.colEstimatedLoss'), width: 150, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRp(p.value as number) },
    // estimated_lost_gp (2026-08-26, task029.md §36.12 — susulan "Tambah
    // versi Gross Profit paralel", GAP ditemukan saat cek "apakah sudah
    // tersedia lengkap di menu Laporan": kolom GP baru sempat cuma
    // ditambahkan di M9DormantValue.tsx punya sendiri (tooltip+kartu), file
    // INI (shared M8 drilldown + Laporan Retention) TERLEWAT). 1 titik
    // definisi, otomatis ikut ke M8 dialog drilldown DAN Laporan Retention
    // tab dormant sekaligus (pola centralize yang sudah didokumentasikan
    // di atas).
    { field: 'estimated_lost_gp', headerName: t('dormantCustomer.colEstimatedLossGp'), width: 170, align: 'right', headerAlign: 'right',
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

// dormantDurationDays (2026-08-26, task029.md §36.17 — instruksi user:
// "Missing crucial info: No dormant duration") — dihitung dari
// `dormant_since_date` s.d `reactivation_date` (row sudah reaktivasi) ATAU
// s.d HARI INI (row masih dormant, belum reaktivasi) — TIDAK ADA field ini
// dari backend, dihitung client-side dari 2 tanggal yang SUDAH ada di
// CustomerDormantStatusRow, bukan data baru.
export function dormantDurationDays(dormantSince: string | null, reactivationDate: string | null): number | null {
  if (!dormantSince) return null
  const end = reactivationDate ? new Date(reactivationDate) : new Date()
  const start = new Date(dormantSince)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}

// dormantDurationColor/dormantDurationLabel + sustain JSX di bawah
// SENGAJA bukan komponen function terpisah (2026-08-26) — file ini
// murni "helper non-komponen" per desain awalnya sendiri (lihat komentar
// header file), ESLint react-refresh/only-export-components menolak
// function-component apa pun (exported ATAU LOKAL) hidup bareng
// hook/fungsi biasa yang diekspor di file yang sama — JSX-nya di-inline
// langsung di dalam renderCell closure (bukan named component) supaya
// tetap konsisten dgn batasan itu.
function dormantDurationColor(days: number): StatusChipColor {
  return days < 30 ? 'success' : days <= 90 ? 'warning' : 'error'
}

export function useDormantStatusColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'customer_name', headerName: t('dormantCustomer.colCustomer'), flex: 1, minWidth: 180,
      renderCell: (p) => (
        <Tooltip title={p.value as string}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{p.value as string}</Typography>
        </Tooltip>
      ) },
    // Kolom KODE (task029.md §36.17, instruksi user: "wastes horizontal
    // space") DIHAPUS — customer_code NULL utk SEMUA customer (temuan lama,
    // sudah dihapus di kolom lain jg, lihat useDormantBreakdownColumns).
    // Kolom TGL DORMANT (tanggal mentah) DIHAPUS, datanya dipakai hitung
    // "Durasi Dormant" di bawah, bukan ditampilkan mentah lagi.
    //
    // Kolom STATUS chip DIKEMBALIKAN (2026-08-26, ronde 5 — ditanya user:
    // "kenapa tidak ada status di tabel tersebut? aktif, dormant, baru,
    // reaktivasi, redorman") — SEMPAT dihapus ronde 1 (diganti "sustain"/
    // "Bertahan?" di bawah, TERNYATA itu cuma subset — hanya berarti utk
    // reactivated/relapsed, row active/dormant biasa jadi TIDAK KELIHATAN
    // status-nya sama sekali di tabel). Dikembalikan pakai STATUS_COLOR/
    // statusLabel yang SUDAH ADA (tidak pernah dihapus, cuma tidak dipakai).
    // "Baru" (new customer) TIDAK ada di kolom ini — `CustomerDormantStatusRow.
    // status` cuma py 4 nilai (active/dormant/reactivated/relapsed), TIDAK
    // ada status "baru" di data ini sama sekali (beda konteks — New/Existing
    // itu concept TERPISAH dipakai KPI lain, bukan bagian status log ini).
    { field: 'status', headerName: t('dormantCustomer.colStatus'), width: 130, sortable: false,
      renderCell: (p) => <StatusChip label={statusLabel(t, p.value as DormantCustomerStatus)} color={STATUS_COLOR[p.value as DormantCustomerStatus]} /> },
    { field: 'dormant_duration', headerName: t('dormantCustomer.colDormantDuration'), width: 130, sortable: false,
      // days null → tampil "0 hari" (2026-08-26, instruksi user: "untuk
      // data kosong jangan gunakan '-', tapi angka 0 jika memang itu durasi
      // hari") — HANYA kolom durasi/hitungan hari ini, BUKAN kolom tanggal
      // lain di bawah (Tgl Aktif Kembali/Transaksi Terakhir TETAP "—" saat
      // kosong, "0" bukan tanggal yang valid).
      renderCell: (p) => {
        const row = p.row as { dormant_since_date: string | null; reactivation_date: string | null }
        const days = dormantDurationDays(row.dormant_since_date, row.reactivation_date) ?? 0
        return <StatusChip label={`${days} hari`} color={dormantDurationColor(days)} />
      } },
    { field: 'reactivation_date', headerName: t('dormantCustomer.colReactivationDate'), width: 140, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => (p.value ? formatDateID(p.value as string) : '—') },
    { field: 'last_invoice_in_period', headerName: t('dormantCustomer.colLastInvoiceInPeriod'), width: 140, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => (p.value ? formatDateID(p.value as string) : '—') },
    // avg_monthly_revenue (2026-08-26) — bukan "total revenue" (field itu
    // TIDAK ADA di data), judul kolom jujur menyebut "rata-rata/bulan"
    // sesuai isi datanya yang sebenarnya.
    { field: 'avg_monthly_revenue', headerName: t('dormantCustomer.colAvgMonthlyRevenue'), width: 160, align: 'right', headerAlign: 'right', sortable: false,
      renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatRupiah(p.value as number)}</Typography> },
    // Kolom "sustain"/"Bertahan?" (2026-08-26, ronde 5) DIHAPUS — jadi
    // REDUNDAN setelah kolom STATUS dikembalikan di atas (chip "Reaktivasi"
    // vs "Redorman" SUDAH membedakan 2 kondisi yang tadinya diwakili icon
    // check/silang ini, tanpa perlu kolom kedua).
  ];
}
