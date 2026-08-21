import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { formatPeriodLabelShort } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { Row } from './HelperComponents';

// Chart diverging (2026-08-21, koreksi user: "ganti jadi positif negatif bar
// chart") — dulu horizontal 100% stacked (up_rate + flat_down_rate, sisi
// kanan selalu penuh 100%, sulit lihat SEBERAPA BESAR yang turun karena
// dominan warna abu netral). Sekarang bar vertikal per bulan yang menjulur
// DUA ARAH dari garis 0: up_rate ke atas, down_rate ke BAWAH — dibedakan
// lewat intensitas warna monokrom (primary solid vs tint), bukan hijau/merah
// (koreksi user ke-2).
//
// Susulan (sama hari): sempat dicoba flat_rate+inactive_rate ikut jadi
// SEGMEN VISUAL (stack 4 kategori) — user balik minta disederhanakan lagi:
// "buat negatif chart hanya untuk data up dan down saja, tapi data flat
// dan inactive tampilkan dalam tooltip". Chart SEMPAT cuma 2 segmen
// (up_rate positif, down_rate negatif) — flat_rate/inactive_rate TETAP ada
// di `data` (dibaca tooltip custom lewat payload penuh), cuma TIDAK
// jadi <Bar> sendiri. Pola sama persis M3Revenue.tsx (`M3Tooltip`,
// `renderTooltip` + `TooltipContentProps`, baca `payload[0].payload` utk
// akses field yang tidak di-render sbg bar).
//
// Susulan lanjutan (2026-08-22, koreksi user: "chart tidak valid, karena
// menampilkan data tidak 100%... jumlah keseluruhan harus 100%") — sisi
// naik+turun SAJA cuma sebagian kecil dari populasi existing (mis. Agustus
// naik 1.7% + turun 8.1% = 9.8%, sisanya 90.2% stabil+nonaktif TIDAK
// kelihatan sama sekali di chart). Diputuskan via AskUserQuestion: sisi
// positif TETAP murni `up_rate` saja, tapi sisi negatif digabung jadi
// `-(flat_rate + down_rate + inactive_rate)` — supaya TINGGI KESELURUHAN
// bar (atas+bawah) selalu = 100% dari existing customers, TETAP cuma 2
// warna (bukan 4 segmen kembali), breakdown flat/turun/nonaktif di dalam
// sisi negatif itu tetap dijelaskan lewat tooltip (Row per kategori, sudah
// ada) + kolom status 4-way di tabel breakdown (`expansionHelpers.tsx`,
// tidak berubah — sudah py Naik/Stabil/Turun/Nonaktif per customer).
interface Props {
  trend: CustomerMetricsTrendPoint[];
  height?: number;
  onBarClick?: (dataPoint: Record<string, unknown>) => void;
  title?: string;
  subtitle?: string;
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
    up_rate: number; flat_rate: number; down_rate: number; not_up_neg: number; inactive_rate: number;
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

export function ExpansionChart({ trend, height = 320, onBarClick, title, subtitle, periodType = 'monthly' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <BarChartWidget
      title={title ?? t('customerMetrics.m7.chartTitle')}
      subtitle={subtitle ?? t('customerMetrics.m7.chartSubtitle')}
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
        // Sisi negatif = SEMUA yang bukan "naik" (stabil+turun+nonaktif)
        // digabung — supaya tinggi total bar (atas+bawah) = 100% dari
        // existing customers, tetap cuma 2 warna. Rincian per kategori
        // tetap dibaca via tooltip (payload penuh, field di atas).
        not_up_neg: -((point.flat_rate ?? 0) + (point.down_rate ?? 0) + (point.inactive_rate ?? 0)),
      }))}
      series={[
        {
          key: 'up_rate', label: t('customerMetrics.m7.seriesUp'),
          color: theme.palette.primary.main,
          labelColor: theme.palette.getContrastText(theme.palette.primary.main),
        },
        {
          key: 'not_up_neg', label: t('customerMetrics.m7.seriesNotUp'),
          color: alpha(theme.palette.primary.main, 0.35),
          labelColor: theme.palette.text.primary,
        },
      ]}
      xKey="month"
      height={height}
      stacked
      showZeroLine
      xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
      yAxisFormatter={(v) => `${v}%`}
      showLabels
      // labelMinValue=0 (2026-08-21, koreksi user: "ada angka yang hilang di
      // beberapa chart yang pendek") — default BarChartWidget nyembunyiin
      // label di bar < 5 (biar tidak numpuk), tapi di chart diverging ini
      // bar PENDEK justru paling butuh angkanya kebaca (visualnya kecil,
      // susah ditaksir dari tinggi bar doang).
      labelMinValue={0}
      labelFormatter={(v) => `${Math.abs(v).toFixed(1)}%`}
      renderTooltip={(props) => <ExpansionTooltip {...props} periodType={periodType} />}
      onBarClick={onBarClick}
    />
  );
}
