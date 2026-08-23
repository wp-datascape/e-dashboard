import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import type { TooltipContentProps, MouseHandlerDataParam } from 'recharts';

// Marker shape per line (spec: Line1=circle, Line2=square, Line3=diamond) — Recharts
// bawaan cuma bisa gambar circle lewat prop `dot` object, jadi shape lain (square/
// diamond) harus custom render function yang return elemen SVG sendiri.
interface DotRenderProps {
  cx?: number;
  cy?: number;
}

const renderCircleDot = (color: string, size: number) => (props: DotRenderProps) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return <></>;
  return <circle cx={cx} cy={cy} r={size / 2} fill={color} stroke="#fff" strokeWidth={2} />;
};

const renderSquareDot = (color: string, size: number) => (props: DotRenderProps) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return <></>;
  return <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={color} stroke="#fff" strokeWidth={2} />;
};

const renderDiamondDot = (color: string, size: number) => (props: DotRenderProps) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return <></>;
  const half = size / 2;
  return (
    <polygon
      points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

export interface ComboChartWidgetProps {
  /** Judul di atas chart — opsional (2026-08-22, koreksi user: judul chart
   * sendiri redundan kalau caller sudah punya judul card di luar, mis. M1/
   * M2/M7 unified card §30.23 — dihilangkan dgn tidak mengirim prop ini). */
  title?: string;
  subtitle?: string;
  /** Caption di BAWAH chart, digabung dgn legend recharts (2026-08-22,
   * koreksi user: subtitle penjelasan "Bar = ... Line = ..." dan legend
   * warna itu SAMA-SAMA legend, jangan dipisah atas-bawah — satukan di
   * bawah chart). */
  caption?: string;
  /** Konten arbitrer di ATAS chart, DI DALAM Card widget ini (2026-08-22,
   * koreksi keras user: "pindahkan text ini ke container chart bukan
   * diluarnya" — caller sebelumnya render `KpiHeader` sbg sibling SEBELUM
   * `<ComboChartWidget>`, jadi visualnya di LUAR border/background Card
   * widget ini). Dirender persis di posisi `title`/`subtitle` (atas,
   * sebelum garis pemisah ke chart) — TIDAK bersamaan dgn `title` (kalau
   * `headerContent` diisi, itu yang dipakai). */
  headerContent?: React.ReactNode;
  data: object[];
  barKey: string;
  barLabel: string;
  barColor: string;
  // Bar kedua opsional (misal total_active vs multi_product) — sama axis (left) dengan bar utama
  bar2Key?: string;
  bar2Label?: string;
  bar2Color?: string;
  /** Tumpuk bar+bar2 jadi 1 stacked bar (tinggi total = bar+bar2), BUKAN 2 bar
   * sejajar (default lama) — dipakai kalau bar/bar2 itu PARTISI dari 1 total
   * (mis. Single Category + Multi Category = Total Customer), 2026-08-21. */
  stacked?: boolean;
  /** Render bar/bar2 sbg Area (gradient fill) alih-alih Bar (kotak) — data &
   * stacking SAMA PERSIS, cuma bentuk visual beda (user: "biar tidak monoton
   * semuanya bar chart combo"). Default 'bar' (perilaku lama). 2026-08-21. */
  barVariant?: 'bar' | 'area';
  lineKey: string;
  lineLabel: string;
  lineColor: string;
  xKey?: string;
  height?: number;
  formatBar?: (v: number) => string;
  formatLine?: (v: number) => string;
  /** Formatter tick sumbu X (mis. formatMonthLabel utk 'YYYY-MM' -> "Jan 26") */
  xAxisFormatter?: (v: string) => string;
  // Garis kedua (misal median, atau benchmark/rata-rata periode) — dashed
  line2Key?: string;
  line2Label?: string;
  line2Color?: string;
  formatLine2?: (v: number) => string;
  // Garis ketiga — SKALA BEDA dari line/line2 (persentase 0-100, bukan Rupiah), makanya
  // pakai axis tersendiri (yAxisId="pct", domain tetap [0,100], disembunyikan biar chart
  // tidak makin padat — nilai presisi tetap kebaca lewat tooltip).
  line3Key?: string;
  line3Label?: string;
  line3Color?: string;
  formatLine3?: (v: number) => string;
  // Custom tooltip — menggantikan tooltip default
  renderTooltip?: (props: TooltipContentProps<number, string>) => React.ReactElement | null;
  // Highlight bar saat nilai field tertentu melebihi threshold
  concentrationKey?: string;
  concentrationThreshold?: number;
  concentrationColor?: string;
  /** Callback saat bar diklik — menerima data point bulan tersebut (mirror onBarClick di BarChartWidget) */
  onBarClick?: (dataPoint: Record<string, unknown>) => void;
}

export const ComboChartWidget = ({
  title,
  subtitle,
  caption,
  headerContent,
  data,
  barKey,
  barLabel,
  barColor,
  bar2Key,
  bar2Label,
  bar2Color,
  stacked,
  barVariant = 'bar',
  lineKey,
  lineLabel,
  lineColor,
  xKey = 'month',
  height = 220,
  formatBar,
  formatLine,
  xAxisFormatter,
  line2Key,
  line2Label,
  line2Color,
  formatLine2,
  line3Key,
  line3Label,
  line3Color,
  formatLine3,
  renderTooltip,
  concentrationKey,
  concentrationThreshold = 25,
  concentrationColor,
  onBarClick,
}: ComboChartWidgetProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const warnColor = concentrationColor ?? theme.palette.warning.main;
  // Combo chart (bar + sampai 3 garis + 2 sumbu-Y) padat di layar sempit -
  // legend recharts (sampai 4 entri: bar + line + line2 + line3) tidak muat
  // sejajar di ~360px lebar plot, ke-wrap tiap entri jadi baris sendiri kalau
  // ukuran defaultnya dipakai. Kecilkan icon+font legend supaya lebih ringkas.
  // Laporan user: chart M3 "cukup sulit terbaca" di mobile. Height TETAP
  // ukuran asli (bukan ditambah) - sempat dicoba +70px extra biar legend lega,
  // tapi bar jadi kelihatan terlalu tinggi/tidak proporsional dibanding chart
  // bar biasa (mis. M4/BarChartWidget yang tidak nambah tinggi di mobile).
  const effectiveHeight = height;
  const legendIconSize = isMobile ? 6 : 14;
  const legendFontSize = isMobile ? 10 : 12;
  // 3 garis bertumpuk di plot area yang sempit - stroke tebal (3px) + dot besar
  // (6-8px) saling menutupi di mobile. Kecilkan keduanya khusus mobile supaya
  // tiap garis lebih gampang dibedakan, desktop tetap ukuran asli.
  const lineStrokeWidth = isMobile ? 1.5 : 3;
  const dotSize = isMobile ? 1 : 6;
  const activeDotSize = isMobile ? 1 : 8;
  // Default recharts: tooltip ngikutin posisi jari/kursor - di mobile, kalau
  // tap dekat tepi bawah/atas chart, tooltip bisa muncul mepet ke tepi layar
  // dan browser suka auto-scroll buat "membantu" nampilkannya penuh (bug
  // scroll vertikal, laporan user). Kunci posisi Y ke tengah chart (X tetap
  // ngikutin jari secara horizontal biar masih relevan ke bar yang di-tap) -
  // dengan Y yang selalu sama, tooltip tidak pernah mepet tepi atas/bawah,
  // jadi browser tidak pernah perlu auto-scroll.
  const tooltipPosition = isMobile ? { y: effectiveHeight / 2 - 40 } : undefined;

  // Hitung domain right axis dari field yang benar-benar di-plot (bukan semua field data)
  const rightDomain = (() => {
    const vals: number[] = [];
    for (const d of data as Record<string, unknown>[]) {
      const v1 = d[lineKey];
      if (typeof v1 === 'number' && isFinite(v1)) vals.push(v1);
      if (line2Key) {
        const v2 = d[line2Key];
        if (typeof v2 === 'number' && isFinite(v2)) vals.push(v2);
      }
    }
    if (vals.length === 0) return [0, 'auto'] as const;
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const pad = (mx - mn) * 0.1 || mx * 0.1;
    // Dibulatkan 1 desimal - domain mentah (mn - pad / mx + pad) sering kena noise
    // floating-point JS (mis. 29.630000000000003), dan karena domain dipakai persis
    // sebagai batas tick axis (bukan cuma auto-scale), noise itu ikut tampil sebagai
    // label tick yang berantakan. Laporan user 2026-07-23 (screenshot tick "29.63000000").
    const round1 = (v: number) => Math.round(v * 10) / 10;
    return [Math.max(0, round1(mn - pad)), round1(mx + pad)] as const;
  })();

  const tooltipFormatter = (value: unknown, name: unknown) => {
    const v = value as number;
    const n = name as string;
    if (n === barLabel && formatBar) return [formatBar(v), n];
    if (n === bar2Label && formatBar) return [formatBar(v), n];
    if (n === lineLabel && formatLine) return [formatLine(v), n];
    if (n === line2Label && formatLine2) return [formatLine2(v), n];
    if (n === line3Label && formatLine3) return [formatLine3(v), n];
    return [v.toLocaleString('id-ID'), n];
  };

  // Klik (2026-08-21, bug ditemukan — user lapor "pop up error"): onClick
  // PER-ELEMEN beda payload antara Bar dan Area di recharts v3 — Bar kirim
  // data BARIS aslinya (`BarRectangleItem`, ada field xKey dst), Area kirim
  // props geometri KURVA-nya sendiri (titik-titik path, BUKAN data), lihat
  // `RechartsMouseEventHandler<Props, SVGPathElement>` di
  // node_modules/recharts/types/shape/Curve.d.ts. Waktu `barVariant="area"`
  // dipakai (M2), handler klik dpt objek salah bentuk → field xKey
  // undefined → error di downstream (parse tanggal invalid). Fix: pindah
  // klik ke level `<ComposedChart>` (chart container) pakai `activeLabel`
  // dari recharts sendiri — SAMA PERSIS mekanisme yang sudah diperbaiki &
  // terbukti jalan di `AreaChartWidget.tsx` — bekerja SERAGAM utk Bar
  // MAUPUN Area, tidak bergantung shape payload per-elemen yang beda-beda.
  const handleChartClick = onBarClick
    ? (state: MouseHandlerDataParam) => {
        if (state.activeLabel == null) return;
        const row = (data as Record<string, unknown>[]).find((d) => d[xKey] === state.activeLabel);
        if (row) onBarClick(row);
      }
    : undefined;

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
      <ResponsiveContainer width="100%" height={effectiveHeight} debounce={200}>
        {/* right:28 (lama) nyisain gap kosong lebar di kanan chart - sumbu kanan
            sendiri sudah reserve ruang buat label ("14.8jt" dst), 28px ekstra di
            atas itu berlebihan. right:4 (samakan dgn BarChartWidget/M4 yang tidak
            ada keluhan sama) - laporan user: gap kanan chart M3 kebesaran. */}
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 4, left: -20, bottom: 0 }}
          onClick={handleChartClick}
          style={onBarClick ? { cursor: 'pointer' } : undefined}
        >
          {barVariant === 'area' && (
            <defs>
              <linearGradient id="combo-area-grad-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={barColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={barColor} stopOpacity={0.05} />
              </linearGradient>
              {bar2Key && (
                <linearGradient id="combo-area-grad-bar2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={bar2Color ?? theme.palette.secondary.main} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={bar2Color ?? theme.palette.secondary.main} stopOpacity={0.05} />
                </linearGradient>
              )}
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
            yAxisId="left"
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (formatBar ? formatBar(v) : v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={rightDomain}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (formatLine ? formatLine(v) : v)}
            // recharts auto-hitung width sumbu ini dari label terlebar, tapi hasilnya
            // lebih lebar dari kebutuhan teks asli (~22px padding ekstra terukur,
            // laporan user "gap kanan masih banyak"). Paksa width ketat di mobile -
            // cukup buat label 6 karakter ("12.0jt" dkk) + tick margin kecil.
            width={isMobile ? 36 : undefined}
          />
          {line3Key && (
            <YAxis yAxisId="pct" domain={[0, 100]} hide />
          )}
          {renderTooltip ? (
            <Tooltip
              content={(props) => renderTooltip(props as TooltipContentProps<number, string>)}
              isAnimationActive={false}
              position={tooltipPosition}
              wrapperStyle={{ backgroundColor: theme.palette.background.paper, zIndex: 10 }}
            />
          ) : (
            <Tooltip
              isAnimationActive={false}
              position={tooltipPosition}
              wrapperStyle={{ zIndex: 10 }}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0,
                fontSize: 12,
              }}
              formatter={tooltipFormatter}
            />
          )}
          <Legend wrapperStyle={{ fontSize: legendFontSize }} iconSize={legendIconSize} />

          {barVariant === 'area' ? (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey={barKey}
                name={barLabel}
                stroke={barColor}
                fill="url(#combo-area-grad-bar)"
                strokeWidth={2}
                stackId={stacked ? 'stack' : undefined}
                dot={renderCircleDot(barColor, dotSize)}
                activeDot={renderCircleDot(barColor, activeDotSize)}
              />
              {bar2Key && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={bar2Key}
                  name={bar2Label ?? bar2Key}
                  stroke={bar2Color ?? theme.palette.secondary.main}
                  fill="url(#combo-area-grad-bar2)"
                  strokeWidth={2}
                  stackId={stacked ? 'stack' : undefined}
                  dot={renderCircleDot(bar2Color ?? theme.palette.secondary.main, dotSize)}
                  activeDot={renderCircleDot(bar2Color ?? theme.palette.secondary.main, activeDotSize)}
                />
              )}
            </>
          ) : (
            <>
              <Bar
                yAxisId="left"
                dataKey={barKey}
                name={barLabel}
                fill={barColor}
                radius={0}
                stackId={stacked ? 'stack' : undefined}
              >
                {concentrationKey && (data as Record<string, number>[]).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={(entry[concentrationKey] ?? 0) > concentrationThreshold ? warnColor : barColor}
                  />
                ))}
                {concentrationKey && (
                  <LabelList
                    dataKey={concentrationKey}
                    content={(props) => {
                      const val = Number(props.value ?? 0);
                      if (val <= concentrationThreshold) return null;
                      const cx = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                      const cy = Number(props.y ?? 0) - 6;
                      return (
                        <text x={cx} y={cy} textAnchor="middle" fontSize={11} fill={theme.palette.warning.dark}>
                          ⚠
                        </text>
                      );
                    }}
                  />
                )}
              </Bar>

              {bar2Key && (
                <Bar
                  yAxisId="left"
                  dataKey={bar2Key}
                  name={bar2Label ?? bar2Key}
                  fill={bar2Color ?? theme.palette.secondary.main}
                  radius={0}
                  stackId={stacked ? 'stack' : undefined}
                />
              )}
            </>
          )}

          <Line
            yAxisId="right"
            dataKey={lineKey}
            name={lineLabel}
            stroke={lineColor}
            strokeWidth={lineStrokeWidth}
            strokeOpacity={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={renderCircleDot(lineColor, dotSize)}
            activeDot={renderCircleDot(lineColor, activeDotSize)}
            type="monotone"
          />

          {line2Key && (
            <Line
              yAxisId="right"
              dataKey={line2Key}
              name={line2Label ?? line2Key}
              stroke={line2Color ?? theme.palette.success.main}
              strokeWidth={lineStrokeWidth}
              strokeOpacity={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 5"
              dot={renderSquareDot(line2Color ?? theme.palette.success.main, dotSize)}
              activeDot={renderSquareDot(line2Color ?? theme.palette.success.main, activeDotSize)}
              type="monotone"
            />
          )}

          {line3Key && (
            <Line
              yAxisId="pct"
              dataKey={line3Key}
              name={line3Label ?? line3Key}
              stroke={line3Color}
              strokeWidth={lineStrokeWidth}
              strokeOpacity={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 4"
              dot={renderDiamondDot(line3Color ?? theme.palette.info.main, dotSize)}
              activeDot={renderDiamondDot(line3Color ?? theme.palette.info.main, activeDotSize)}
              type="monotone"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
          {caption}
        </Typography>
      )}
    </Card>
  );
};