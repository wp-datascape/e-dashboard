import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { StatusChip } from '@/components/ui/StatusChip';
import { SplitColorGradient } from '../shared/SplitColorGradient';
import { ChartCardTitle } from '../shared/ChartCardTitle';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

export interface AreaChartWidgetProps {
  /** Opsional (2026-08-29, task029.md §49 — sebelumnya wajib, digantikan
   * `headerContent` di caller yang butuh header custom, pola sama widget
   * lain). Caller lama yang masih kirim `title` TIDAK berubah. */
  title?: string;
  value?: string | number;
  change?: number;
  subtitle?: string;
  /** Penjelasan KPI sbg tooltip ikon info di sebelah judul, GANTI caption
   * permanen `subtitle` (2026-08-28, task029.md §44) — lihat JSDoc prop
   * `titleInfo` di BarChartWidget. `subtitle` TETAP didukung. */
  titleInfo?: string;
  /** Header custom di DALAM Card widget (2026-08-29, task029.md §49) — pola
   * sama persis `headerContent` widget lain. Kalau diisi, MENGGANTIKAN
   * render value/title/subtitle bawaan. */
  headerContent?: React.ReactNode;
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
  /** Formatter NILAI di tooltip default recharts (2026-08-29, task029.md
   * §55 — user lapor "format penulisan tanggal, bilangan belum memakai
   * utility formater" — widget ini SEBELUMNYA sama sekali TIDAK punya cara
   * format nilai tooltip, selalu tampil angka mentah tanpa satuan, beda
   * dari BarChartWidget/ComboChartWidget yang sudah py `tooltipFormatter`).
   * Pola sama persis `tooltipFormatter` BarChartWidget. */
  tooltipFormatter?: (value: number, name: string) => [string, string];
}

export const AreaChartWidget = ({
  title,
  value,
  change,
  subtitle,
  titleInfo,
  headerContent,
  data,
  series,
  xKey = 'name',
  height = 220,
  onAreaClick,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
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
        {headerContent ?? (
          <>
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
            {title && <ChartCardTitle title={title} info={titleInfo} />}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </>
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
            <SplitColorGradient key={s.key} id={`area-split-${s.key}`} aboveColor={s.color} belowColor={s.negativeColor} />
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
            formatter={
              tooltipFormatter
                ? (value: unknown, name: unknown) => tooltipFormatter(value as number, name as string)
                : undefined
            }
            labelFormatter={xAxisFormatter ? (label: unknown) => xAxisFormatter(String(label)) : undefined}
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
