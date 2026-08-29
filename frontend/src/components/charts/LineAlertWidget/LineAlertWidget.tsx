import { useId } from 'react';
import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { SplitColorGradient } from '../shared/SplitColorGradient';
import { ChartCardTitle } from '../shared/ChartCardTitle';
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
} from 'recharts';
import type { MouseHandlerDataParam, TooltipContentProps } from 'recharts';

export interface LineAlertWidgetProps {
  /** Opsional (2026-08-24, koreksi user M6: judul+ikon dipindah ke
   * SectionLabel luar widget — pola sama `ComboChartWidget`/`BarChartWidget`,
   * caller yang belum kirim `title` cukup tidak menampilkan header bawaan
   * sama sekali, TIDAK berubah utk caller existing M8/M10 yang masih kirim). */
  title?: string;
  subtitle?: string;
  /** Penjelasan KPI sbg tooltip ikon info di sebelah judul, GANTI caption
   * permanen `subtitle` (2026-08-28, task029.md §44) — lihat JSDoc prop
   * `titleInfo` di BarChartWidget. `subtitle` TETAP didukung. */
  titleInfo?: string;
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
  /** Formatter NILAI di tooltip default recharts (2026-08-29, task029.md
   * §55 — user lapor "format penulisan tanggal, bilangan belum memakai
   * utility formater" — widget ini SEBELUMNYA sama sekali TIDAK punya cara
   * format nilai tooltip, selalu tampil angka mentah tanpa satuan). Pola
   * sama persis `tooltipFormatter` BarChartWidget. Diabaikan kalau
   * `renderTooltip` diisi (caller urus sendiri). */
  tooltipFormatter?: (value: number, name: string) => [string, string];
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
  /** Warna series utama (2026-08-26, instruksi user: "rubah warna m6" —
   * lanjutan §36.2c/§36.6: garis/area trend TUNGGAL (bukan bar) sebaiknya
   * pakai token `line1`/`line2` palet, bukan `primary.main` yang sudah
   * dipakai warna bar di tempat lain (M6 KpiCard "Customer Repeat Order"),
   * supaya garis chart tetap beda visual dari warna bar/aksen kartu).
   * Opsional, default `theme.palette.primary.main` (perilaku LAMA, TIDAK
   * berubah utk caller existing M8/M10 yang belum kirim prop ini). */
  lineColor?: string;
}

export const LineAlertWidget = ({
  title,
  subtitle,
  titleInfo,
  headerContent,
  data,
  lineKey,
  lineLabel,
  xKey = 'month',
  threshold = 10,
  thresholdLabel,
  height = 220,
  xAxisFormatter,
  tooltipFormatter,
  variant = 'line',
  targetBarKey,
  targetBarLabel,
  yAxisMin = 0,
  onPointClick,
  renderTooltip,
  higherIsBetter = false,
  lineColor,
}: LineAlertWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const gradientId = useId();
  const resolvedLineColor = lineColor ?? theme.palette.primary.main;

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
          <ChartCardTitle title={title} info={titleInfo} />
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
          {/* Fill area ikut warna ambang (2026-08-26, instruksi user M8:
              "area cart dibawah ambang berwarna hijau dan yang menembus
              berwarna merah") — GANTI dari gradient 1 warna (`resolvedLineColor`
              solid) ke `SplitColorGradient` yang di-split TEPAT di posisi
              piksel `threshold` (bukan asumsi persentase, baca dari scale
              sumbu-Y asli — pola sama persis M7 net expansion, cuma splitValue
              beda: di sana 0, di sini `threshold`). Arah warna ikut
              `higherIsBetter` (M8 "makin tinggi makin buruk" = atas merah;
              M6/M10 "target min" = atas hijau). Sejak band `ReferenceArea`
              dihapus (susulan sama hari, "hapus background biar warna cart
              lebih terlihat"), fill Area ini SATU-SATUNYA sumber warna
              ambang di chart. */}
          {variant === 'area' && (
            <SplitColorGradient
              id={gradientId}
              splitValue={threshold}
              aboveColor={higherIsBetter ? theme.palette.success.main : theme.palette.error.main}
              belowColor={higherIsBetter ? theme.palette.error.main : theme.palette.success.main}
            />
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
              formatter={
                tooltipFormatter
                  ? (value: unknown, name: unknown) => tooltipFormatter(value as number, name as string)
                  : undefined
              }
              labelFormatter={xAxisFormatter ? (label: unknown) => xAxisFormatter(String(label)) : undefined}
            />
          )}
          {/* Band background ReferenceArea (2026-08-25/26) DIHAPUS
              2026-08-26 — instruksi user: "untuk background nya hapus
              saja biar warna cart lebih terlihat". Sejak §36.11 isian
              Area sendiri SUDAH split hijau/merah tepat di ambang
              (`SplitColorGradient`, `baseValue={threshold}`) — band flat
              ini jadi redundan sekaligus meredam kontras warna isian di
              atasnya. Arah warna (higherIsBetter) tetap dipegang sisi
              Area fill saja sekarang, bukan lagi 2 sumber (band + fill). */}

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
              <Bar dataKey={lineKey} name={lineLabel} fill={resolvedLineColor} radius={0} />
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
              stroke={resolvedLineColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // baseValue={threshold} (2026-08-26, GANTI dari "dataMax" —
              // instruksi user, contoh resmi recharts "Area Chart Fill By
              // Value": polygon isian HARUS ditutup di titik SPLIT-nya
              // sendiri (di situ 0, di sini `threshold`), bukan di ekstrem
              // sumbu. Dgn "dataMax", isian selalu membentang dari garis
              // sampai PUNCAK chart — begitu splitnya taruh di piksel
              // `threshold`, sebagian besar area yang kelihatan tetap
              // "merah" (di atas threshold pixel) walau nilai sebenarnya
              // masih AMAN di bawah ambang, krn dataMax jauh di atas
              // threshold. baseValue={threshold} menutup polygon TEPAT di
              // ambang — nilai di bawah ambang isiannya SEMUA hijau
              // (tersisa antara garis & ambang), nilai yang menembus
              // isiannya SEMUA merah (antara ambang & garis) — pola SAMA
              // PERSIS reference recharts (baseValue implisit=0, isian
              // hijau di atas / merah di bawah 0).
              baseValue={threshold}
              dot={{ r: 3, fill: resolvedLineColor }}
              activeDot={{ r: 5 }}
              type="monotone"
            />
          ) : (
            <Line
              dataKey={lineKey}
              name={lineLabel}
              stroke={resolvedLineColor}
              strokeWidth={2}
              dot={{ r: 3, fill: resolvedLineColor }}
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
          <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: resolvedLineColor }} />
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