// ReactivationSummaryCards.tsx (2026-08-26, task029.md §36.17)
//
// Ronde 4 — ditegur KERAS user: "KAMU TIDAK MEMPERHATIKAN INTRUKSI KU
// MASALAH ICON". Ronde 3 SALAH — cuma menghapus badge Avatar lingkaran,
// TAPI ikon yang dipakai (`CheckCircleIcon`/`PauseCircleIcon`) itu SENDIRI
// glyph SOLID/terisi penuh (lingkaran padat berwarna), BUKAN garis tipis
// spt contoh "TREN RASIO CROSS SELLING" (ikon outline monokrom). Diganti
// ke varian Outline resmi MUI (`CheckCircleOutlineIcon`/
// `PauseCircleOutlineIcon`) — garis tipis, bukan solid fill. `RefreshIcon`/
// `WarningAmberIcon` TIDAK diganti — keduanya SUDAH glyph garis/outline
// dari sononya (bukan solid fill spt CheckCircle/PauseCircle default).
//
// Ronde 6 (2026-08-26, task029.md §36.20) — StatCard lokal DIHAPUS,
// direfactor pakai `ReportSummaryCards` (komponen shared yang aslinya
// DIGENERALISASI dari file ini, §36.19).
//
// Ronde 7 (2026-08-26, task029.md §36.28 — susulan Kamus Penamaan
// Pelanggan §36.27, instruksi user: "buat endpoint nya pisahkan existing
// aktif dan inaktif") — kartu "Aktif" gabungan (`active+reactivated`,
// §36.25/§36.26, label sempat jadi "Belum Dormant") DIBALIK lagi jadi
// murni status `active` ("Existing Aktif" — genuinely transaksi periode
// ini) — endpoint SEKARANG SUDAH bisa bedakan "Existing Aktif" dari
// "Existing Inaktif" (backend m8m10.repository.ts, status baru
// 'inactive'), jadi merge/workaround §36.25 TIDAK PERLU LAGI. Kartu
// "Existing Inaktif" BARU ditambahkan. Label "Aktif" SEKARANG AMAN
// dipakai lagi (tidak lagi bentrok arti dgn kartu "Aktif" Ekspansi —
// keduanya SEKARANG populasi yang SAMA: established + belum dormant +
// genuinely transaksi periode ini).
//
// Ronde 9 (2026-08-26, task029.md §36.43 — koreksi user: "Dormant kembali
// itu diganti nama menjadi newlydormant, hanya itu... bukan membuat
// fungsi baru, difungsi dormant kembali sudah bisa menangkap customer
// yang reactive lalu dorman lagi") — Ronde 8 SALAH: sempat dipecah jadi 2
// kartu terpisah ("Newly Dormant" pakai status baru, "Dormant Kembali"
// pakai `relapsed`). Dibalik: 1 kartu saja, "Dormant Kembali" LAMA
// (customer yang sempat reaktivasi lalu dormant lagi) di-RENAME jadi
// "Newly Dormant" — logikanya TIDAK berubah, cuma nama. Total 6 kartu.
import { useTranslation } from 'react-i18next';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ReportSummaryCards } from '../ReportSummaryCards';

export interface ReactivationSummaryCardsProps {
  total: number;
  active: number;
  inactive: number;
  dormant: number;
  reactivated: number;
  newlyDormant: number;
}

export function ReactivationSummaryCards({ total, active, inactive, dormant, reactivated, newlyDormant }: ReactivationSummaryCardsProps) {
  const { t } = useTranslation();
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : null);
  const fmt = (n: number) => n.toLocaleString('id-ID');

  return (
    <ReportSummaryCards items={[
      { label: t('dormantCustomer.m10SummaryAllShort'), value: fmt(total), pct: null,
        info: t('dormantCustomer.m10SummaryAllInfo') },
      { label: t('dormantCustomer.m10SummaryActiveShort'), value: fmt(active), pct: pct(active),
        icon: CheckCircleOutlineIcon, iconColor: 'success', info: t('dormantCustomer.m10SummaryActiveInfo') },
      { label: t('dormantCustomer.m10SummaryInactiveShort'), value: fmt(inactive), pct: pct(inactive),
        icon: HourglassEmptyIcon, info: t('dormantCustomer.m10SummaryInactiveInfo') },
      { label: t('dormantCustomer.m10SummaryDormantShort'), value: fmt(dormant), pct: pct(dormant),
        icon: PauseCircleOutlineIcon, iconColor: 'warning', info: t('dormantCustomer.m10SummaryDormantInfo') },
      { label: t('dormantCustomer.m10SummaryReactivatedShort'), value: fmt(reactivated), pct: pct(reactivated),
        icon: RefreshIcon, iconColor: 'primary', highlighted: true, info: t('dormantCustomer.m10SummaryReactivatedInfo') },
      { label: t('dormantCustomer.m10SummaryNewlyDormantShort'), value: fmt(newlyDormant), pct: pct(newlyDormant),
        icon: WarningAmberIcon, iconColor: 'error', info: t('dormantCustomer.m10SummaryNewlyDormantInfo') },
    ]} />
  );
}
