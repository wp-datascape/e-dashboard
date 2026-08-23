import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { formatPeriodLabelShort } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { Row } from './HelperComponents';

// Dikembalikan ke pola chart production/main (2026-08-23, instruksi user:
// "rubah cart ke refrensi cart di production... cek di branch main") — bar
// horizontal 100% stacked per bulan, hijau = up_rate, abu = sisanya, PERSIS
// `M7Expansion.tsx` di main (`layout="horizontal"`, `stacked`, warna
// `theme.palette.success.main`/`action.disabledBackground`). Sesi lokal ini
// SEMPAT diubah ke bar vertikal diverging (lihat riwayat git kalau perlu
// arsipnya) — REVERT total ke bentuk production, BUKAN cuma restyle warna.
//
// Yang TETAP dipertahankan dari iterasi lokal (bukan bagian yang direvert,
// genuinely perbaikan data yang independen dari bentuk chart):
// - `not_up` = flat_rate + down_rate + inactive_rate digabung (bukan cuma
//   `flat_down_rate` seperti main — field itu sendiri sudah tidak ada lagi
//   di data model, sudah dipecah jadi 3 kategori terpisah sejak perbaikan
//   "inactive_rate ikut dikurangi" hari yang sama) — SEKARANG POSITIF lagi
//   (bukan negatif, tidak perlu lagi krn chart tidak diverging).
// - Tooltip custom (`ExpansionTooltip`) yang merinci flat/turun/nonaktif +
//   jumlah customer mentah per kategori — main cuma tampilkan tooltip
//   default `[up_rate%, flat_down_rate%]`, versi ini lebih informatif tanpa
//   mengubah bentuk chart-nya.
// - `xAxisFormatter`/`periodType` (granularitas Bulanan/Kuartal/Semester/
//   Tahun) — main hardcode bulanan, halaman Growth sudah py filter ini.
interface Props {
  trend: CustomerMetricsTrendPoint[];
  height?: number;
  onBarClick?: (dataPoint: Record<string, unknown>) => void;
  title?: string;
  subtitle?: string;
  /** false = sembunyikan title+subtitle bawaan chart (2026-08-22, koreksi
   * user: judul chart ini redundan kalau caller sudah punya judul card di
   * luar, mis. M7 unified card §30.23). Default true (perilaku lama,
   * dipakai M7Expansion.tsx workbench). */
  showHeader?: boolean;
  /** Caption di BAWAH chart, digabung dgn legend (2026-08-22, koreksi user:
   * subtitle penjelasan chart & legend warna itu SAMA-SAMA legend, jangan
   * dipisah atas-bawah). */
  caption?: string;
  /** Granularitas trend (task029.md §30.9, 2026-08-22) — default 'monthly',
   * dipakai buat format label sumbu-X & tooltip (bukan cuma "YYYY-MM" lagi,
   * bisa "2026-Q3"/"2026-S1"/"2026"). */
  periodType?: PeriodGranularity;
}

function ExpansionTooltip({ active, payload, periodType }: TooltipContentProps<number, string> & { periodType: PeriodGranularity }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as {
    month: string;
    up_rate: number; flat_rate: number; down_rate: number; not_up: number; inactive_rate: number;
    up_count: number; flat_count: number; down_count: number; inactive_count: number;
  };
  // "{{count}} customer" (2026-08-22, user: "Aku butuh data jumlah nya
  // selain dari persentase") — angka mentah di belakang tiap persentase,
  // bukan cuma di SummaryCard tapi tooltip chart ini juga.
  const withCount = (rate: number, count: number) => `${rate.toFixed(1)}% (${t('customerMetrics.m7.customerCountValue', { count: count.toLocaleString('id-ID') })})`;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      p: 1.5,
      minWidth: 240,
      fontSize: 12,
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {formatPeriodLabelShort(periodType, d.month)}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Row label={t('customerMetrics.m7.seriesUp')} value={withCount(d.up_rate, d.up_count)} />
        <Divider sx={{ my: 0.4 }} />
        <Row label={t('customerMetrics.m7.seriesFlat')} value={withCount(d.flat_rate, d.flat_count)} />
        <Row label={t('customerMetrics.m7.seriesDown')} value={withCount(d.down_rate, d.down_count)} />
        <Row label={t('customerMetrics.m7.seriesInactive')} value={withCount(d.inactive_rate, d.inactive_count)} />
      </Box>
    </Box>
  );
}

export function ExpansionChart({ trend, height = 320, onBarClick, title, subtitle, showHeader = true, caption, periodType = 'monthly' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <BarChartWidget
      title={showHeader ? (title ?? t('customerMetrics.m7.chartTitle')) : undefined}
      subtitle={showHeader ? (subtitle ?? t('customerMetrics.m7.chartSubtitle')) : undefined}
      caption={caption}
      data={trend.map((point) => ({
        month: point.month,
        up_rate: point.up_rate,
        flat_rate: point.flat_rate,
        down_rate: point.down_rate,
        inactive_rate: point.inactive_rate,
        up_count: point.up_count,
        flat_count: point.flat_count,
        down_count: point.down_count,
        inactive_count: point.inactive_count,
        // Pengganti `flat_down_rate` (main) — sekarang 3 kategori terpisah
        // digabung jadi 1 nilai visual, rinciannya tetap ada di tooltip.
        not_up: (point.flat_rate ?? 0) + (point.down_rate ?? 0) + (point.inactive_rate ?? 0),
      }))}
      series={[
        { key: 'up_rate', label: t('customerMetrics.m7.seriesUp'), color: theme.palette.success.main },
        {
          key: 'not_up', label: t('customerMetrics.m7.seriesNotUp'),
          // Abu-abu gelap di mode terang / abu-abu terang di mode gelap
          // (2026-08-23, koreksi user) — `action.disabledBackground` (dulu)
          // terlalu pucat/nyaris tak kelihatan sbg segmen chart (memang
          // didesain SUBTLE utk background tombol disabled, bukan utk warna
          // chart). `labelColor` TIDAK di-override lagi — biar default
          // getContrastText(color) yang otomatis pilih teks putih/gelap
          // sesuai kontras warna abu yang dipakai, bukan text.primary tetap
          // (yang jadi tidak kebaca begitu bar-nya digelapkan di mode terang).
          color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
        },
      ]}
      xKey="month"
      height={height}
      stacked
      layout="horizontal"
      // xDomainMax=100 (bukan default 'auto') — data ini 100%-stacked
      // (up_rate + not_up = 100), sumbu harus berhenti PERSIS di 100 sama
      // seperti referensi production, bukan "dibulatkan" recharts ke 120.
      xDomainMax={100}
      // xAxisTicks kelipatan 10 (2026-08-23, koreksi user: "buat kelipatan
      // 10 agar lebih jelas") — bukan lagi tick otomatis recharts yang bisa
      // ganjil (mis. 0/30/60/90/100).
      xAxisTicks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
      xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
      yAxisFormatter={(v) => `${Math.round(v)}%`}
      showLabels
      // labelMinValue TIDAK di-override lagi (2026-08-23, koreksi user:
      // "sembunyikan seperti production") — dulu di-paksa 0 supaya label kecil
      // (mis. up_rate 1.7%) tetap dirender, tapi label yang dipaksa muat di
      // segmen super tipis itu malah kepotong/tertutup segmen tetangga (jadi
      // "1.7%" kelihatan cuma "7%"). Pakai default BarChartWidget (5) — sama
      // persis production, angka di bawah threshold cukup disembunyikan.
      labelFormatter={(v) => `${v.toFixed(1)}%`}
      renderTooltip={(props) => <ExpansionTooltip {...props} periodType={periodType} />}
      onBarClick={onBarClick}
    />
  );
}
