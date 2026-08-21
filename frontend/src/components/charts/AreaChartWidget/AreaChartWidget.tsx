import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  useYAxisScale,
  useChartHeight,
} from 'recharts';
import type { MouseHandlerDataParam } from 'recharts';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  /** Warna fill saat nilai NEGATIF (2026-08-21, "fill by value" — dipakai
   * utk metrik net/signed yang bisa naik-turun lewat 0, mis. up_rate -
   * down_rate). Kalau diisi, area di-split OTOMATIS di titik 0 (posisi asli
   * dari skala sumbu-Y sendiri, bukan persentase hardcode — pola resmi
   * recharts "Area Chart Fill By Value") — bagian di atas 0 pakai `color`,
   * di bawah 0 pakai `negativeColor`. Tidak diisi = perilaku lama (gradient
   * 1 warna), tidak berubah. */
  negativeColor?: string;
}

/** Gradient split-warna di titik 0 (2026-08-21) — HARUS dirender sbg child
 * `<AreaChart>` (bukan di AreaChartWidget langsung) krn `useYAxisScale`/
 * `useChartHeight` baca context internal recharts yang cuma ada di dalam
 * chart. Posisi split dihitung dari scale sumbu-Y asli (bukan diasumsikan
 * di tengah) — benar brp pun rentang datanya (mis. data condong ke negatif
 * makin banyak, titik 0 makin ke atas, bukan selalu 50%). */
function SplitColorGradient({ id, positiveColor, negativeColor }: { id: string; positiveColor: string; negativeColor: string }) {
  const scale = useYAxisScale();
  const height = useChartHeight();
  const scaledZero = scale?.(0);
  if (scaledZero == null || height == null) return null;
  const ratio = Math.min(1, Math.max(0, scaledZero / height));
  return (
    <defs>
      {/* Opacity dinaikkan lagi 0.7->0.9 (2026-08-21, koreksi user ke-2
          "sama saja tidak ada perubahan warna" — data net-nya sendiri
          jarang & tipis nyembul ke positif, jadi AREA biru-nya kecil apa
          pun opacity-nya; kompensasi dgn opacity HAMPIR PENUH biar sliver
          kecil itu tetap keliatan tegas, bukan pudar). Tetap monokrom. */}
      <linearGradient id={id} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={positiveColor} stopOpacity={0.9} />
        <stop offset={`${ratio}`} stopColor={positiveColor} stopOpacity={0.08} />
        <stop offset={`${ratio}`} stopColor={negativeColor} stopOpacity={0.08} />
        <stop offset="1" stopColor={negativeColor} stopOpacity={0.9} />
      </linearGradient>
      {/* Gradient KEDUA khusus buat `stroke` GARIS-nya (bukan cuma fill) —
          user: "tetap line ... tidak ada perubahan warna" — garis paling
          menonjol di chart, kalau cuma fill-nya yang split tapi garis tetap
          1 warna terus, keliatannya "tidak berubah". Opacity SELALU penuh
          (bukan fade ke transparan spt gradient fill) — garis tidak boleh
          menghilang/menipis tepat di titik silang 0. */}
      <linearGradient id={`${id}-stroke`} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={positiveColor} stopOpacity={1} />
        <stop offset={`${ratio}`} stopColor={positiveColor} stopOpacity={1} />
        <stop offset={`${ratio}`} stopColor={negativeColor} stopOpacity={1} />
        <stop offset="1" stopColor={negativeColor} stopOpacity={1} />
      </linearGradient>
    </defs>
  );
}

export interface AreaChartWidgetProps {
  title: string;
  value?: string | number;
  change?: number;
  subtitle?: string;
  data: object[];
  series: AreaSeries[];
  xKey?: string;
  height?: number;
  /** Callback saat titik data diklik — menerima data point bulan tersebut (mirror onBarClick di BarChartWidget) */
  onAreaClick?: (dataPoint: Record<string, unknown>) => void;
  /** Formatter tick sumbu X (mis. formatMonthLabel utk 'YYYY-MM' -> "Jan 26") */
  xAxisFormatter?: (v: string) => string;
  /** Formatter tick sumbu Y (mis. formatIDR utk nilai Rupiah) */
  yAxisFormatter?: (v: number) => string;
}

export const AreaChartWidget = ({
  title,
  value,
  change,
  subtitle,
  data,
  series,
  xKey = 'name',
  height = 220,
  onAreaClick,
  xAxisFormatter,
  yAxisFormatter,
}: AreaChartWidgetProps) => {
  const theme = useTheme();
  const isPositive = (change ?? 0) >= 0;

  // Klik titik (2026-08-21, koreksi bug — user lapor "klik titik tidak
  // muncul pop up"): SEBELUMNYA onClick dipasang di `<Dot>` custom per-titik
  // (lingkaran kecil radius 4px) — kemungkinan besar KETUTUP layer
  // pelacak-mouse internal recharts yang dipakai Tooltip (invisible,
  // di ATAS dot dalam stacking order), jadi klik tidak pernah sampai ke
  // Dot. `BarChartWidget` (yang klik-nya TERBUKTI jalan) pasang onClick
  // LANGSUNG di elemen `<Bar>` sendiri (permukaan solid besar, bukan
  // circle kecil di atas overlay) — pola yang sama TIDAK bisa langsung
  // ditiru ke Area (1 shape path kontinu, bukan per-titik). Fix: pindah ke
  // onClick level `<AreaChart>` (chart container), pakai `activeLabel`
  // dari recharts sendiri — mekanisme SAMA PERSIS yang sudah TERBUKTI jalan
  // buat Tooltip hover (recharts internal mouse-tracking, bukan DOM
  // element kecil yang bisa ketutup).
  const handleChartClick = onAreaClick
    ? (state: MouseHandlerDataParam) => {
        if (state.activeLabel == null) return
        const row = (data as Record<string, unknown>[]).find((d) => d[xKey] === state.activeLabel)
        if (row) onAreaClick(row)
      }
    : undefined

  return (
    <Card sx={{ p: 2, height: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        {value !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <StatusChip
                label={`${isPositive ? '+' : ''}${change}%`}
                color={isPositive ? 'success' : 'error'}
              />
            )}
          </Box>
        )}
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Chart */}
      {/* debounce dibedakan per tipe widget - lihat StatCard.tsx untuk alasan lengkap
          (staggering supaya redraw banyak chart sekaligus tidak numpuk 1 tick JS) */}
      <ResponsiveContainer width="100%" height={height} debounce={80}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          onClick={handleChartClick}
          style={onAreaClick ? { cursor: 'pointer' } : undefined}
        >
          <defs>
            {series.filter((s) => !s.negativeColor).map((s) => (
              <linearGradient key={s.key} id={`area-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {series.filter((s): s is typeof s & { negativeColor: string } => !!s.negativeColor).map((s) => (
            <SplitColorGradient key={s.key} id={`area-split-${s.key}`} positiveColor={s.color} negativeColor={s.negativeColor} />
          ))}
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={xAxisFormatter}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yAxisFormatter}
            width={yAxisFormatter ? 56 : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12 }} />
          )}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.negativeColor ? `url(#area-split-${s.key}-stroke)` : s.color}
              strokeWidth={2}
              fill={s.negativeColor ? `url(#area-split-${s.key})` : `url(#area-grad-${s.key})`}
              // Dot per-titik ikut warna value-nya sendiri (negatif = warna
              // negativeColor) kalau fill-by-value aktif — garisnya JUGA
              // ikut split (gradient ke-2, opacity penuh — lihat
              // SplitColorGradient) supaya elemen paling menonjol di chart
              // ini pun kelihatan berubah, bukan cuma fill tipis di bawahnya.
              dot={
                s.negativeColor
                  ? (dotProps: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                      const { cx, cy, payload } = dotProps;
                      if (cx == null || cy == null) return <></>;
                      const val = Number(payload?.[s.key] ?? 0);
                      return <circle cx={cx} cy={cy} r={3} fill={val >= 0 ? s.color : s.negativeColor} strokeWidth={0} />;
                    }
                  : { r: 3, fill: s.color, strokeWidth: 0 }
              }
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
