import { useId } from 'react';
import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { MouseHandlerDataParam, TooltipContentProps } from 'recharts';

export interface LineAlertWidgetProps {
  /** Opsional (2026-08-24, koreksi user M6: judul+ikon dipindah ke
   * SectionLabel luar widget — pola sama `ComboChartWidget`/`BarChartWidget`,
   * caller yang belum kirim `title` cukup tidak menampilkan header bawaan
   * sama sekali, TIDAK berubah utk caller existing M8/M10 yang masih kirim). */
  title?: string;
  subtitle?: string;
  /** Header custom di DALAM Card widget (2026-08-24) — pola sama persis
   * `headerContent` ComboChartWidget/BarChartWidget. Kalau diisi,
   * MENGGANTIKAN render title/subtitle bawaan. */
  headerContent?: React.ReactNode;
  data: object[];
  lineKey: string;
  lineLabel: string;
  xKey?: string;
  threshold?: number;
  thresholdLabel?: string;
  height?: number;
  /** Formatter tick sumbu X (mis. formatMonthLabel utk 'YYYY-MM' -> "Jan 26") */
  xAxisFormatter?: (v: string) => string;
  /** 'area' = garis + area terisi gradasi di bawahnya. 'bar' = 2 bar
   * berdampingan (pencapaian vs target, 2026-08-24, instruksi user M6:
   * "Rubah line cart nya menjadi bar chart 2 bar untuk target dan
   * pencapaian, tapi tetap menggunakan line target" — perlu `targetBarKey`
   * juga, garis threshold TETAP dirender di atas bar). 'line' (default) =
   * perilaku lama, garis polos, TIDAK berubah utk caller existing (M8/M10). */
  variant?: 'line' | 'area' | 'bar';
  /** Dipakai HANYA saat variant='bar' — field di `data` utk bar KEDUA
   * (target, biasanya nilai konstan per titik). `lineKey`/`lineLabel`
   * tetap dipakai sbg bar PERTAMA (pencapaian). */
  targetBarKey?: string;
  targetBarLabel?: string;
  /** Batas bawah sumbu-Y (2026-08-24, instruksi user M6: "meningkatkan
   * keterbacaan Y axis mulai dari -5" — default 0, titik yang nilainya
   * mendekati 0 jadi nempel garis bawah chart). */
  yAxisMin?: number;
  /** Klik titik chart — menerima data point bulan tersebut (2026-08-24,
   * dipakai M6 utk buka dialog drill-down, pola sama BarChartWidget/
   * ComboChartWidget via `activeLabel` recharts). Opsional, tidak
   * mengubah perilaku caller yang belum kirim ini (M8/M10). */
  onPointClick?: (dataPoint: Record<string, unknown>) => void;
  /** Tooltip custom (2026-08-24, instruksi user M6: "Lengkapi tooltip pakai
   * tooltip custom") — pola sama persis BarChartWidget/ComboChartWidget.
   * Kalau diisi, MENGGANTIKAN tooltip default recharts. */
  renderTooltip?: (props: TooltipContentProps<number, string>) => React.ReactElement | null;
  /** Arah "bagus" relatif threshold (2026-08-25, koreksi user M6: "area atas
   * target warna hijau, area bawah line target warna merah" — screenshot
   * "Target Min 15%" tapi area DI ATAS threshold selalu diwarnai merah,
   * padahal utk metrik "target MINIMAL" (repeat order/reactivation rate),
   * di ATAS threshold itu JUSTRU sudah tercapai/bagus, yang BELUM tercapai
   * (di BAWAH) yang seharusnya merah). Default `false` (perilaku LAMA,
   * TIDAK berubah utk caller existing M8 — "Ambang 10%" dormant rate,
   * makin TINGGI makin buruk, area ATAS threshold MEMANG area alert/merah,
   * sudah benar dari awal). `true` (M6/M10, "Target Min X%") membalik:
   * area ATAS threshold hijau (tercapai), area BAWAH threshold merah
   * (belum tercapai). */
  higherIsBetter?: boolean;
}

export const LineAlertWidget = ({
  title,
  subtitle,
  headerContent,
  data,
  lineKey,
  lineLabel,
  xKey = 'month',
  threshold = 10,
  thresholdLabel,
  height = 220,
  xAxisFormatter,
  variant = 'line',
  targetBarKey,
  targetBarLabel,
  yAxisMin = 0,
  onPointClick,
  renderTooltip,
  higherIsBetter = false,
}: LineAlertWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const gradientId = useId();

  const handleChartClick = onPointClick
    ? (state: MouseHandlerDataParam) => {
        if (state.activeLabel == null) return;
        const row = (data as Record<string, unknown>[]).find((d) => d[xKey] === state.activeLabel);
        if (row) onPointClick(row);
      }
    : undefined;

  // Calculate y-max from data to bound the reference area
  const yMax =
    Math.max(
      ...(data as Record<string, number>[]).map((d) => (d[lineKey] as number) || 0),
      ...(targetBarKey ? (data as Record<string, number>[]).map((d) => (d[targetBarKey] as number) || 0) : []),
      threshold,
    ) * 1.15;

  return (
    <Card sx={{ p: 2, height: '100%' }}>
      {headerContent ? (
        <Box sx={{ mb: 2 }}>{headerContent}</Box>
      ) : title && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* debounce dibedakan per tipe widget - lihat StatCard.tsx untuk alasan lengkap
          (staggering supaya redraw banyak chart sekaligus tidak numpuk 1 tick JS) */}
      <ResponsiveContainer width="100%" height={height} debounce={320}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
          onClick={handleChartClick}
          style={onPointClick ? { cursor: 'pointer' } : undefined}
        >
          {variant === 'area' && (
            <defs>
              {/* Arah gradasi DIBALIK (2026-08-24) — isian sekarang di ATAS
                  garis (baseValue="dataMax" di bawah), jadi warna paling
                  pekat harus dekat GARIS (offset 95%, bawah SVG), memudar
                  ke atas (offset 5%) — kebalikan dari isian-di-bawah lama. */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.05} />
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
            vertical={false}
          />
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
            domain={[yAxisMin, yMax]}
          />
          {renderTooltip ? (
            <Tooltip content={(props) => renderTooltip(props as TooltipContentProps<number, string>)} />
          ) : (
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0,
                fontSize: 12,
              }}
            />
          )}
          {/* Shading di kedua sisi threshold (2026-08-25) — arah warna
              tergantung `higherIsBetter`: default (M8, "Ambang 10%" makin
              tinggi makin buruk) area ATAS = merah (alert). `higherIsBetter`
              (M6/M10, "Target Min X%") DIBALIK: area ATAS = hijau (target
              tercapai), area BAWAH = merah (belum tercapai). */}
          {higherIsBetter ? (
            <>
              <ReferenceArea y1={threshold} y2={yMax} fill={theme.palette.success.main} fillOpacity={0.1} ifOverflow="hidden" />
              <ReferenceArea y1={yAxisMin} y2={threshold} fill={theme.palette.error.main} fillOpacity={0.1} ifOverflow="hidden" />
            </>
          ) : (
            <ReferenceArea y1={threshold} y2={yMax} fill={theme.palette.error.main} fillOpacity={0.1} ifOverflow="hidden" />
          )}

          {/* Threshold reference line */}
          <ReferenceLine
            y={threshold}
            stroke={theme.palette.error.main}
            strokeDasharray="5 3"
            label={{
              value: thresholdLabel ?? t('common.thresholdLabel', { threshold }),
              position: 'insideTopRight',
              fontSize: 10,
              fill: theme.palette.error.main,
              fontWeight: 600,
            }}
          />

          {variant === 'bar' ? (
            <>
              <Bar dataKey={lineKey} name={lineLabel} fill={theme.palette.primary.main} radius={0} />
              {targetBarKey && (
                <Bar
                  dataKey={targetBarKey}
                  name={targetBarLabel ?? thresholdLabel}
                  fill={theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}
                  radius={0}
                />
              )}
            </>
          ) : variant === 'area' ? (
            <Area
              dataKey={lineKey}
              name={lineLabel}
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // baseValue="dataMax" (2026-08-24, instruksi user: "warna area
              // cart bukan dibawah line tapi diatas line") — default Area
              // recharts isi dari garis TURUN ke baseline (dataMin/0).
              // dataMax membalik referensi penutup polygon ke ATAS (dari
              // garis NAIK ke nilai maksimum sumbu), jadi isian ada di ATAS
              // garis, bukan di bawahnya.
              baseValue="dataMax"
              dot={{ r: 3, fill: theme.palette.primary.main }}
              activeDot={{ r: 5 }}
              type="monotone"
            />
          ) : (
            <Line
              dataKey={lineKey}
              name={lineLabel}
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.palette.primary.main }}
              activeDot={{ r: 5 }}
              type="monotone"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend manual (2026-08-24, koreksi user: sub judul "Target Min X% ·
          Garis biru = realisasi bulanan" DIHAPUS, jadi legend) — recharts
          <Legend> v3 tidak terima payload custom lagi (tipe publiknya
          meng-omit `payload`), lagipula ReferenceLine (garis target) TIDAK
          pernah ikut auto-legend recharts sejak awal. Box+swatch manual,
          pola sama persis legend HeatmapWidget.tsx — 2 entri: warna
          series utama (biru) + warna target (merah/abu, tergantung variant). */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: theme.palette.primary.main }} />
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {lineLabel}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {variant === 'bar' && targetBarKey ? (
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400] }} />
          ) : (
            <Box sx={{ width: 12, height: 0, borderTop: `2px dashed ${theme.palette.error.main}` }} />
          )}
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {variant === 'bar' && targetBarKey ? (targetBarLabel ?? thresholdLabel) : (thresholdLabel ?? t('common.thresholdLabel', { threshold }))}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};