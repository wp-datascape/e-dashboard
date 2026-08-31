import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { StatusChip } from '@/components/ui/StatusChip';
import { ChartCardTitle } from '../shared/ChartCardTitle';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  /** Override warna text label di dalam bar — default: getContrastText(color) */
  labelColor?: string;
}

export interface BarChartWidgetProps {
  /** Judul di atas chart — opsional (2026-08-22, koreksi user: judul chart
   * sendiri redundan kalau caller sudah punya judul card di luar, mis. M7
   * unified card §30.23 — dihilangkan dgn tidak mengirim prop ini). */
  title?: string;
  value?: string | number;
  change?: number;
  subtitle?: string;
  /** Penjelasan KPI sbg tooltip ikon info di sebelah judul, GANTI caption
   * permanen `subtitle` (2026-08-28, task029.md §44 — "penjelasan setiap
   * KPI nya pindahkan ke tooltip info saja, agar lebih clean cart nya").
   * `subtitle` TETAP didukung (caller lama yang belum pindah tidak
   * berubah) — cukup pakai salah satu, keduanya independen. */
  titleInfo?: string;
  /** Header custom (2026-08-24, koreksi user: "masukkan header cart ke
   * dalam box cart" — SectionLabel M7 dulu render sbg Box terpisah DI
   * LUAR widget chart, sekarang dikirim lewat prop ini, dirender DI DALAM
   * Card widget — pola sama persis `headerContent` ComboChartWidget.
   * Kalau diisi, ini yang dipakai, `title`/`subtitle` diabaikan. */
  headerContent?: React.ReactNode;
  /** Caption di BAWAH chart, digabung dgn legend recharts (2026-08-22,
   * koreksi user: subtitle penjelasan chart dan legend warna itu SAMA-SAMA
   * legend, jangan dipisah atas-bawah — satukan di bawah chart). */
  caption?: string;
  data: object[];
  series: BarSeries[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
  /** 'vertical' = standard column chart (default), 'horizontal' = bar chart rotated */
  layout?: 'vertical' | 'horizontal';
  /** Custom tooltip formatter: (value, name) => [formattedValue, name] */
  tooltipFormatter?: (value: number, name: string) => [string, string];
  /** Custom tooltip content renderer — menggantikan tooltip default */
  renderTooltip?: (props: TooltipContentProps<number, string>) => React.ReactElement | null;
  /** Field di data yang menentukan apakah bulan ini concentrated (misal top_gp_pct) */
  concentrationKey?: string;
  /** Threshold untuk badge peringatan konsentrasi (default 25) */
  concentrationThreshold?: number;
  /** Formatter Y-axis (misal fmtRp) */
  yAxisFormatter?: (v: number) => string;
  /** Formatter axis kategori/xKey (mis. formatMonthLabel) — XAxis di layout vertical, YAxis di layout horizontal */
  xAxisFormatter?: (v: string) => string;
  /** Lebar Y-axis untuk horizontal layout (default 120) */
  yAxisWidth?: number;
  /** Mobile: sembunyikan Y-axis label, tampilkan nama di dalam bar */
  mobileNameInBar?: boolean;
  /** Callback saat bar diklik — menerima data point bulan tersebut */
  onBarClick?: (dataPoint: Record<string, unknown>) => void;
  /** Tampilkan label nilai di dalam bar */
  showLabels?: boolean;
  /** Formatter label (default: tampilkan nilai apa adanya) */
  labelFormatter?: (value: number) => string;
  /** Ambang skip-label: bar dengan |value| di bawah ini tidak dikasih label
   * (default 5, biar tidak numpuk di bar sangat kecil). Set 0 buat SELALU
   * tampilkan label di semua bar (2026-08-21, koreksi user "ada angka yang
   * hilang di beberapa chart yang pendek" — chart diverging M7Expansion
   * butuh SEMUA bar berlabel, bar pendek justru paling penting dibaca
   * angkanya karena visualnya kecil). */
  labelMinValue?: number;
  /** Garis tegas di nilai 0 (2026-08-21, chart diverging M7Expansion — user:
   * "bedakan warna positif dan negatif nya agar garis pemisahnya terlihat")
   * — axisLine sumbu default disembunyikan (`axisLine={false}`), tanpa ini
   * bar hijau (positif) dan merah (negatif) cuma nempel tanpa batas yang
   * kelihatan jelas di mana titik 0-nya. */
  showZeroLine?: boolean;
  /** Batas atas sumbu nilai (numeric axis) di layout horizontal — default
   * 'auto' (recharts pilih angka "bulat" di atas nilai maksimum data, bisa
   * melebihi nilai maksimum asli, mis. 120 utk data 100% stacked). Set 100
   * utk chart 100%-stacked (mis. ExpansionChart) supaya sumbu berhenti
   * PERSIS di 100, sama seperti referensi production. Tidak berpengaruh di
   * layout vertical. */
  xDomainMax?: number;
  /** Tick eksplisit sumbu nilai (numeric axis) di layout horizontal —
   * default undefined (recharts pilih otomatis, bisa jadi angka ganjil mis.
   * 0/30/60/90/100). Set eksplisit (mis. [0,10,...,100]) utk kelipatan
   * rapi. Tidak berpengaruh di layout vertical. */
  xAxisTicks?: number[];
}

export const BarChartWidget = ({
  title,
  value,
  change,
  subtitle,
  titleInfo,
  headerContent,
  caption,
  data,
  series,
  xKey = 'name',
  height = 220,
  stacked = false,
  layout = 'vertical',
  tooltipFormatter,
  renderTooltip,
  concentrationKey,
  concentrationThreshold = 25,
  yAxisFormatter,
  xAxisFormatter,
  onBarClick,
  showLabels = false,
  labelFormatter,
  labelMinValue = 5,
  yAxisWidth = 120,
  mobileNameInBar = false,
  showZeroLine = false,
  xDomainMax,
  xAxisTicks,
}: BarChartWidgetProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isPositive = (change ?? 0) >= 0;

  // For horizontal layout: BarChart layout='vertical', X=number, Y=category
  const isHorizontal = layout === 'horizontal';
  // Mobile mode: hide Y-axis, render name + value inside bar
  const showNameInBar = mobileNameInBar && isHorizontal && isMobile;
  const effectiveYAxisWidth = showNameInBar ? 0 : yAxisWidth;

  return (
    // overflow:hidden (2026-08-23, bug dilaporkan user: "cart itu melebar
    // melebihi lebar layar" — mobile) — Legend recharts di bawah TIDAK
    // pernah dibatasi ukuran/wrap (beda dari ComboChartWidget yang sudah py
    // legendFontSize mobile-aware), teks label panjang (mis. "Stabil/Turun/
    // Tanpa Transaksi") bisa mendorong konten SVG lebih lebar dari
    // container-nya, dan tanpa overflow:hidden di sini itu ikut mendorong
    // Card/halaman jadi scroll horizontal. Jaring pengaman UNCONDITIONAL —
    // apapun penyebab elemen internal jadi kelebaran, TIDAK BISA lagi bocor
    // keluar Card ini.
    <Card sx={{ p: 2, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      {headerContent ? (
        <Box sx={{ mb: 2 }}>{headerContent}</Box>
      ) : (value !== undefined || title) && (
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
          {title && <ChartCardTitle title={title} info={titleInfo} />}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Chart */}
      {/* debounce dibedakan per tipe widget - lihat StatCard.tsx untuk alasan lengkap
          (staggering supaya redraw banyak chart sekaligus tidak numpuk 1 tick JS) */}
      <ResponsiveContainer width="100%" height={height} debounce={140}>
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          // stackOffset="sign" (2026-08-21, bug ditemukan lewat screenshot —
          // chart diverging M7Expansion semua bar kepaint merah, hijaunya
          // ketutup) — default stackOffset recharts ("none") cumsum apa
          // adanya: series kedua (nilai negatif) MULAI dari TOP series
          // pertama (bukan dari 0), jadi rect-nya melebar nutupin balik ke
          // area series pertama juga. "sign" bikin nilai positif numpuk ke
          // atas dari 0 dan negatif numpuk ke bawah dari 0 SECARA TERPISAH —
          // exact use-case resminya (lihat link BarChartStackedBySign di
          // recharts types/util/types.d.ts). Aman buat stacked chart lama
          // yang semua nilainya positif (hasil "sign" == "none" kalau tidak
          // ada nilai negatif sama sekali).
          stackOffset="sign"
          margin={{ top: concentrationKey ? 16 : 4, right: 4, left: isHorizontal ? 4 : (yAxisFormatter ? 0 : -20), bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
            vertical={!isHorizontal}
            horizontal={isHorizontal}
          />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                domain={[0, xDomainMax ?? 'auto']}
                ticks={xAxisTicks}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisFormatter}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={showNameInBar ? false : { fontSize: 9, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                width={effectiveYAxisWidth}
                tickFormatter={xAxisFormatter}
              />
            </>
          ) : (
            <>
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
                width={yAxisFormatter ? 62 : undefined}
              />
            </>
          )}
          {showZeroLine && (
            isHorizontal
              ? <ReferenceLine x={0} stroke={theme.palette.text.primary} strokeOpacity={0.4} strokeWidth={1.5} />
              : <ReferenceLine y={0} stroke={theme.palette.text.primary} strokeOpacity={0.4} strokeWidth={1.5} />
          )}
          {renderTooltip ? (
            <Tooltip
              wrapperStyle={{ zIndex: 100 }}
              content={(props) => renderTooltip(props as TooltipContentProps<number, string>)}
            />
          ) : (
            <Tooltip
              wrapperStyle={{ zIndex: 100 }}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0,
                fontSize: 12,
              }}
              cursor={{ fill: theme.palette.action.hover }}
              formatter={
                tooltipFormatter
                  ? (value: unknown, name: unknown) =>
                      tooltipFormatter(value as number, name as string)
                  : undefined
              }
              labelFormatter={xAxisFormatter ? (label: unknown) => xAxisFormatter(String(label)) : undefined}
            />
          )}
          {/* fontSize mobile-aware (2026-08-23) — samakan pola
              ComboChartWidget.tsx (legendFontSize), teks label panjang
              (mis. "Stabil/Turun/Tanpa Transaksi") lebih kecil di layar
              sempit supaya tidak mendorong chart melebar. */}
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />}
          {series.map((s, idx) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
              radius={0}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={onBarClick ? (data) => onBarClick(data as unknown as Record<string, unknown>) : undefined}
            >
              {/* Mobile horizontal: nama + nilai di dalam bar */}
              {showNameInBar && idx === 0 && (
                <LabelList
                  dataKey={xKey}
                  content={(props) => {
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const h = Number(props.height ?? 0);
                    const dataIdx = (props as { index?: number }).index ?? 0;
                    const rawVal = (data as Record<string, unknown>[])[dataIdx]?.[s.key];
                    const val = typeof rawVal === 'number' ? rawVal : 0;
                    const fmtVal = labelFormatter ? labelFormatter(val) : val.toLocaleString('id-ID');
                    const tx = x + 8;
                    const cy = y + h / 2;
                    const fill = s.labelColor ?? theme.palette.getContrastText(s.color);
                    return (
                      <text textAnchor="start">
                        <tspan x={tx} y={cy + 4} fontSize={8} fontWeight={400} fill={fill}>{fmtVal}</tspan>
                      </text>
                    );
                  }}
                />
              )}
              {/* Desktop: nilai di tengah bar (jika showLabels) */}
              {showLabels && !showNameInBar && (
                <LabelList
                  dataKey={s.key}
                  content={(props) => {
                    const val = Number(props.value ?? 0);
                    // Math.abs (bukan `val < labelMinValue`) — nilai negatif
                    // (mis. chart diverging M7Expansion, down_rate
                    // ditampilkan sbg bar negatif) HARUS tetap kena threshold
                    // skip-nilai-kecil yang sama, bukan selalu ke-skip krn
                    // `val < N` selalu true buat semua bilangan negatif.
                    if (Math.abs(val) < labelMinValue) return null;
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const w = Number(props.width ?? 0);
                    const h = Number(props.height ?? 0);
                    const cx = x + w / 2;
                    const cy = y + h / 2;
                    const label = labelFormatter ? labelFormatter(val) : `${val}%`;
                    return (
                      <text x={cx} y={cy} dy={4} textAnchor="middle" fontSize={10} fontWeight={600} fill={s.labelColor ?? theme.palette.getContrastText(s.color)}>
                        {label}
                      </text>
                    );
                  }}
                />
              )}
              {/* Penanda konsentrasi tinggi (2026-08-29 — user tanya "apa
                  arti tanda seri di atas cart" lalu minta dihapus: dulu
                  glyph emoji mentah, melanggar aturan proyek "no
                  emoji". Percobaan pertama diganti ikon MUI di atas bar,
                  TAPI user tanya balik "kenapa M4 tidak dibuat beda warna
                  juga spt kondisi yang sama" — samakan pola dgn
                  ComboChartWidget). Bar di sini STACKED multi-series (M4
                  tier1/2/3) — GANTI FILL jadi 1 warna solid spt
                  ComboChartWidget akan MENGHILANGKAN info 3 tier utk
                  periode itu, jadi bukan `fill` yang diubah, tapi
                  `stroke` (garis tepi) — warna isi tiap tier TETAP
                  beda-beda, cuma seluruh stack dpt garis tepi oranye
                  sbg sinyal, konsisten arah visual dgn ComboChartWidget
                  tanpa kehilangan breakdown tier. */}
              {concentrationKey && (data as Record<string, number>[]).map((entry, i) => {
                const flagged = (entry[concentrationKey] ?? 0) > concentrationThreshold;
                return (
                  <Cell
                    key={i}
                    fill={s.color}
                    stroke={flagged ? theme.palette.warning.dark : 'none'}
                    strokeWidth={flagged ? 2 : 0}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
          {caption}
        </Typography>
      )}
    </Card>
  );
};