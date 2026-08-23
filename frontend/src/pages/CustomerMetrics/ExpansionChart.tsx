import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { formatPeriodLabel, formatPeriodLabelShort } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { useTheme } from '@mui/material/styles';

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
  /** Header custom (2026-08-24, koreksi user: "masukkan header cart ke
   * dalam box cart") — diteruskan apa adanya ke `headerContent`
   * BarChartWidget, dirender DI DALAM Card widget, bukan di luar. */
  headerContent?: React.ReactNode;
  /** Caption di BAWAH chart, digabung dgn legend (2026-08-22, koreksi user:
   * subtitle penjelasan chart & legend warna itu SAMA-SAMA legend, jangan
   * dipisah atas-bawah). */
  caption?: string;
  /** Granularitas trend (task029.md §30.9, 2026-08-22) — default 'monthly',
   * dipakai buat format label sumbu-X & tooltip (bukan cuma "YYYY-MM" lagi,
   * bisa "2026-Q3"/"2026-S1"/"2026"). */
  periodType?: PeriodGranularity;
}

// Tooltip custom (2026-08-24, task029.md §31, koreksi user: "ganti
// sepenuhnya didalam tooltip cart, sekaligus perbaikan format tanggal") —
// sebelumnya judul pakai formatPeriodLabelShort ("Sep 25", ok tapi beda
// gaya dari M1/M2), chip "Klik untuk lihat detail" terpisah di header.
// Sekarang pakai ChartTooltipCard (atomic, sama dgn M1/M2) — judul pakai
// formatPeriodLabel penuh ("September 2025", konsisten M1/M2), hint klik
// dipindah ke SINI (momen user sudah hover/tap titik chart).
function ExpansionTooltip({ active, payload, periodType }: TooltipContentProps<number, string> & { periodType: PeriodGranularity }) {
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
    <ChartTooltipCard
      title={t('customerMetrics.m7.tooltipTitle', { month: formatPeriodLabel(periodType, d.month) })}
      minWidth={240}
      rows={[
        { label: t('customerMetrics.m7.seriesUp'), value: withCount(d.up_rate, d.up_count) },
        { label: t('customerMetrics.m7.seriesFlat'), value: withCount(d.flat_rate, d.flat_count) },
        { label: t('customerMetrics.m7.seriesDown'), value: withCount(d.down_rate, d.down_count) },
        { label: t('customerMetrics.m7.seriesInactive'), value: withCount(d.inactive_rate, d.inactive_count) },
      ]}
      hint={t('customerMetrics.m7.chartClickHint')}
    />
  );
}

export function ExpansionChart({ trend, height = 320, onBarClick, title, subtitle, showHeader = true, headerContent, caption, periodType = 'monthly' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Potong periode kosong di AWAL (2026-08-24, bug dilaporkan user: "GAP
  // terlalu besar" — screenshot granularitas Semester: 12 periode trailing
  // mundur 6 tahun, tapi histori company baru ada ~1,5 tahun terakhir,
  // sebagian besar periode paling awal existing_customers=0 total (belum
  // ada data sama sekali) — chart horizontal tetap render SEMUA baris
  // Y-axis kosong tanpa bar apa pun di atasnya, jadi "gap" raksasa. Potong
  // dari periode PERTAMA yang benar-benar punya data, bukan tampilkan 12
  // titik mentah apa adanya. Kalau SEMUA periode kosong (findIndex -1),
  // biarkan array asli (fallback aman, tidak crash).
  const firstDataIdx = trend.findIndex((p) => p.existing_customers > 0);
  const trimmedTrend = firstDataIdx > 0 ? trend.slice(firstDataIdx) : trend;

  return (
    <BarChartWidget
      title={showHeader ? (title ?? t('customerMetrics.m7.chartTitle')) : undefined}
      subtitle={showHeader ? (subtitle ?? t('customerMetrics.m7.chartSubtitle')) : undefined}
      headerContent={headerContent}
      caption={caption}
      // yAxisWidth diperkecil di mobile (2026-08-23, bug dilaporkan user:
      // "offside" — label bulan default 120px FIXED menyisakan terlalu
      // sedikit ruang utk bar di layar sempit, bar hijau jadi super tipis
      // dan label persentasenya (di-tengah-kan) meluber ke area label
      // bulan). Label bulan pendek ("Sep 25" dst, sudah lewat
      // formatPeriodLabelShort) muat di ~56px, sisanya dikasih ke bar.
      yAxisWidth={isMobile ? 56 : 120}
      data={trimmedTrend.map((point) => ({
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
      // labelMinValue TIDAK di-override lagi utk desktop (2026-08-23, koreksi
      // user: "sembunyikan seperti production") — dulu di-paksa 0 supaya
      // label kecil (mis. up_rate 1.7%) tetap dirender, tapi label yang
      // dipaksa muat di segmen super tipis itu malah kepotong/tertutup
      // segmen tetangga (jadi "1.7%" kelihatan cuma "7%"). Pakai default
      // BarChartWidget (5) di desktop — sama persis production.
      //
      // KHUSUS mobile, ambangnya dinaikkan ke 10 (susulan, bug dilaporkan
      // user: "offside" — layar sempit py PIXEL PER PERSEN jauh lebih kecil
      // drpd desktop, jadi label di-tengah-kan utk nilai 5-9% yg SEBENARNYA
      // di atas ambang default TETAP meluber keluar segmennya yang cuma
      // beberapa pixel, nabrak balik ke area sumbu-Y. Ambang 5 yg pas di
      // desktop TIDAK cukup di mobile, perlu ambang lebih tinggi supaya
      // segmen yg dikasih label memang cukup lebar menampung teksnya).
      labelMinValue={isMobile ? 10 : 5}
      labelFormatter={(v) => `${v.toFixed(1)}%`}
      renderTooltip={(props) => <ExpansionTooltip {...props} periodType={periodType} />}
      onBarClick={onBarClick}
    />
  );
}
