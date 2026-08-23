import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/components/ui/StatusChip';

// Header KPI (task029.md §28.2) — Current / YoY / Change.
//
// 2026-08-22, iterasi ke-6 (koreksi user, mockup): dari 1 baris teks
// "Label: Value | Label: Value | Label: Value" (iterasi ke-5) jadi CARD —
// judul (nama metrik) + subjudul (periode saat ini vs pembanding) di atas,
// 2 angka besar berdampingan (current/comparison) masing-masing dgn caption
// periode di bawahnya, lalu chip di bawah utk perubahan.
//
// Susulan (koreksi keras user: "kamu buat componen baru? kenapa card nya
// beda dengan yang lain? padahal componennya atomic") — percobaan pertama
// pakai `Paper` mentah + `borderRadius`/`boxShadow` custom SENDIRI supaya
// persis mockup (rounded corner + soft shadow) — SALAH, itu membuat gaya
// card baru di luar design system, bukan reuse. Diganti pakai `Card`
// atomic (`@/components/ui/Card`).
//
// Susulan lanjutan (2026-08-22, instruksi user: "Info card yang diatas
// jadikan text lain base jangan pakai card lagi") — `Card` DILEPAS lagi,
// sekarang `Box` polos (tanpa border/bg/shadow) — konten (judul+subjudul+
// 2 angka besar+chip perubahan) TETAP SAMA, cuma bungkusnya bukan lagi
// bordered box, murni teks mengalir di halaman (halaman sekarang py
// banyak card lain di bawahnya — SummaryCard grid, dst — jadi elemen
// paling atas ini sengaja dibedakan, tidak ikut "kotak-kotak" lagi).
// `StatusChip` (pill perubahan) TETAP dipakai — itu bukan Card, beda
// komponen atomic, tidak diminta dihapus.
export type KpiType = 'value' | 'rate' | 'count';

interface KpiHeaderProps {
  current: number;
  yoy: number;
  kpiType: KpiType;
  formatValue?: (v: number) => string;
  /** Label periode SAAT INI, mis. "Kuartal 3 Tahun 2026" — WAJIB eksplisit
   * (koreksi user 2026-08-21: "jangan pakai 'periode ini', harus keterangan
   * eksplisit" — dulu judul section pakai teks generik "periode ini", tidak
   * bilang periode yang mana). */
  currentPeriodLabel: string;
  /** Label periode pembanding YoY, mis. "Kuartal 2 Tahun 2025" */
  comparisonLabel: string;
}

export function KpiHeader({ current, yoy, kpiType, formatValue, currentPeriodLabel, comparisonLabel }: KpiHeaderProps) {
  const { t } = useTranslation();
  const fmt = formatValue ?? ((v: number) => v.toLocaleString('id-ID'));

  const currentLabel = kpiType === 'rate' ? `${current.toFixed(1)}%` : fmt(current);
  const yoyLabel = kpiType === 'rate' ? `${yoy.toFixed(1)}%` : fmt(yoy);

  let changeLabel: string;
  let direction: 'up' | 'down' | 'flat';
  if (kpiType === 'rate') {
    // Percentage point, BUKAN relative % (task029.md §20/§28.2). Dieja
    // penuh "poin persentase" — BUKAN singkatan "pp" (user 2026-08-19:
    // "PP di summary itu apa? Jangan disingkat").
    const pp = current - yoy;
    changeLabel = t('dashboard.kpiHeader.ppValue', { value: `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}` });
    direction = pp > 0 ? 'up' : pp < 0 ? 'down' : 'flat';
  } else {
    const diff = current - yoy;
    const pct = yoy !== 0 ? (diff / yoy) * 100 : 0;
    changeLabel = `${diff >= 0 ? '+' : ''}${fmt(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  }
  const chipColor = direction === 'up' ? 'success' : direction === 'down' ? 'error' : 'default';
  const TrendIcon = direction === 'up' ? TrendingUpIcon : direction === 'down' ? TrendingDownIcon : RemoveIcon;

  return (
    // Susulan (2026-08-22, koreksi user annotasi screenshot: "Cross-Sell
    // Rate" [metricLabel] itu redundan dengan judul utama card [SectionLabel
    // di caller] — "cukup judul utama card") — judul metrik DIHAPUS dari
    // sini, komponen ini sekarang HANYA render 1 baris perbandingan
    // periode+nilai+chip (prop `metricLabel` dihapus dari interface, sudah
    // tidak dipakai sama sekali).
    <Box sx={{ mb: 2, textAlign: 'center' }}>
      {/* flexDirection column di mobile (2026-08-22, koreksi user screenshot:
          "mode mobile vs pindah kebawah jangan menjadi putus seperti itu")
          — sebelumnya `flexWrap:'wrap'` di satu baris flex, di layar sempit
          wrapping-nya TIDAK bisa diprediksi (mis. "Agustus 2025:32.5% vs"
          nyangkut 1 baris, sisanya kepotong ke baris lain, terlihat
          "putus" acak). Ganti jadi `flexDirection:'column'` eksplisit di
          xs — tiap segmen (periode:nilai / vs / periode:nilai / chip) jadi
          1 baris utuh sendiri, rapi & bisa diprediksi, bukan wrap liar. */}
      {/* Susulan (2026-08-22, koreksi user: "perkecil teks... sesuaikan
          dengan ukuran heatmap") — `body1`/`body2` (~14-16px, mencolok
          lebih besar dari teks lain di halaman) diturunkan ke `caption`
          (~12px), menyamai skala teks yang dipakai HeatmapWidget (header
          kolom/caption/tooltip-nya SEMUA `caption`, lihat
          HeatmapWidget.tsx). */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', gap: { xs: 0.5, sm: 1 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {comparisonLabel} :{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {yoyLabel}
          </Box>
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {t('dashboard.kpiHeader.vs')}
        </Typography>
        <Typography variant="caption">
          {currentPeriodLabel} :{' '}
          <Box component="span" sx={{ fontWeight: 800 }}>
            {currentLabel}
          </Box>
        </Typography>
        <StatusChip icon={<TrendIcon />} label={changeLabel} color={chipColor} />
      </Box>
    </Box>
  );
}
