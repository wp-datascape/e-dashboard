import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

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
  title: string;
  subtitle?: string;
  data: object[];
  barKey: string;
  barLabel: string;
  barColor: string;
  // Bar kedua opsional (misal total_active vs multi_product) — sama axis (left) dengan bar utama
  bar2Key?: string;
  bar2Label?: string;
  bar2Color?: string;
  lineKey: string;
  lineLabel: string;
  lineColor: string;
  xKey?: string;
  height?: number;
  formatBar?: (v: number) => string;
  formatLine?: (v: number) => string;
  // Garis kedua (misal median) — dashed
  line2Key?: string;
  line2Label?: string;
  line2Color?: string;
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
  data,
  barKey,
  barLabel,
  barColor,
  bar2Key,
  bar2Label,
  bar2Color,
  lineKey,
  lineLabel,
  lineColor,
  xKey = 'month',
  height = 220,
  formatBar,
  formatLine,
  line2Key,
  line2Label,
  line2Color,
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
    if (n === line3Label && formatLine3) return [formatLine3(v), n];
    return [v.toLocaleString('id-ID'), n];
  };

  return (
    <Card sx={{ p: 2, height: '100%' }}>
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

      {/* debounce dibedakan per tipe widget - lihat StatCard.tsx untuk alasan lengkap
          (staggering supaya redraw banyak chart sekaligus tidak numpuk 1 tick JS) */}
      <ResponsiveContainer width="100%" height={effectiveHeight} debounce={200}>
        {/* right:28 (lama) nyisain gap kosong lebar di kanan chart - sumbu kanan
            sendiri sudah reserve ruang buat label ("14.8jt" dst), 28px ekstra di
            atas itu berlebihan. right:4 (samakan dgn BarChartWidget/M4 yang tidak
            ada keluhan sama) - laporan user: gap kanan chart M3 kebesaran. */}
        <ComposedChart data={data} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
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

          <Bar
            yAxisId="left"
            dataKey={barKey}
            name={barLabel}
            fill={barColor}
            radius={0}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={onBarClick ? (data) => onBarClick(data as unknown as Record<string, unknown>) : undefined}
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
            />
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
    </Card>
  );
};