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
// DIGENERALISASI dari file ini, §36.19) — sebelumnya 2 implementasi
// paralel yang isinya identik (Centralize UI, bukan duplikasi). Sekalian
// nambah `info` tooltip tiap kartu (instruksi user: "verifikasi setiap
// data nya dan berikan info tooltip agar user tidak salah faham") —
// populasi "Total" kartu ini (SEMUA customer established) BEDA dari
// "Total Existing Customer" tab Repeat Order (cuma yang aktif periode
// ini) — rawan disalahartikan sebagai angka yang seharusnya sama.
import { useTranslation } from 'react-i18next';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ReportSummaryCards } from '../ReportSummaryCards';

export interface ReactivationSummaryCardsProps {
  total: number;
  active: number;
  dormant: number;
  reactivated: number;
  relapsed: number;
}

export function ReactivationSummaryCards({ total, active, dormant, reactivated, relapsed }: ReactivationSummaryCardsProps) {
  const { t } = useTranslation();
  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : null);
  const fmt = (n: number) => n.toLocaleString('id-ID');
  // activeCombined (2026-08-26, task029.md §36.25 — instruksi user susulan
  // §36.24: "angkanya aktif di halaman reaktifasi itu tambahkan juga
  // Aktif plus reaktivasi") — kartu gabung status 'active' + 'reactivated'
  // (customer yang SAAT INI tidak dormant, baik yang belum pernah dormant
  // maupun yang baru saja kembali) — supaya angkanya COCOK dgn "Belum
  // Dormant" tab Ekspansi (populasi SAMA persis, sudah dibuktikan §36.24:
  // rumus `is_dormant_at_me` identik).
  // Label kartu DIGANTI dari "Aktif" jadi "Belum Dormant" (§36.26,
  // susulan LAGI — user tanya "kenapa Existing 855 (Repeat Order) beda
  // dari Aktif 11.375 (Reaktivasi)") — akar masalah: kata "Aktif" MASIH
  // dipakai kartu LAIN di tab Ekspansi (855, transaksi periode ini SAJA)
  // dgn definisi BEDA — merge di atas justru bikin 2 kartu "Aktif" beda
  // tab beda arti. Label diselaraskan ke "Belum Dormant" (SAMA PERSIS
  // istilah Ekspansi utk angka yang SAMA), menghilangkan tabrakan kata
  // tanpa mengubah nilai gabungan yang baru diminta di atas.
  // Kartu "Reaktivasi" TETAP terpisah menampilkan `reactivated` SENDIRI
  // (bukan dihapus) — tabel+filter status di bawah TIDAK ikut berubah
  // (tetap 4 kategori terpisah, cuma kartu ringkasannya yang digabung).
  const activeCombined = active + reactivated;

  return (
    <ReportSummaryCards items={[
      { label: t('dormantCustomer.m10SummaryAllShort'), value: fmt(total), pct: null,
        info: t('dormantCustomer.m10SummaryAllInfo') },
      { label: t('dormantCustomer.m10SummaryActiveShort'), value: fmt(activeCombined), pct: pct(activeCombined),
        icon: CheckCircleOutlineIcon, iconColor: 'success', info: t('dormantCustomer.m10SummaryActiveInfo') },
      { label: t('dormantCustomer.m10SummaryDormantShort'), value: fmt(dormant), pct: pct(dormant),
        icon: PauseCircleOutlineIcon, iconColor: 'warning', info: t('dormantCustomer.m10SummaryDormantInfo') },
      { label: t('dormantCustomer.m10SummaryReactivatedShort'), value: fmt(reactivated), pct: pct(reactivated),
        icon: RefreshIcon, iconColor: 'primary', highlighted: true, info: t('dormantCustomer.m10SummaryReactivatedInfo') },
      { label: t('dormantCustomer.m10SummaryRelapsedShort'), value: fmt(relapsed), pct: pct(relapsed),
        icon: WarningAmberIcon, iconColor: 'error', info: t('dormantCustomer.m10SummaryRelapsedInfo') },
    ]} />
  );
}
