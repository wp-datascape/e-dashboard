import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { StatusChip } from '@/components/ui/StatusChip';
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
  title: string;
  value?: string | number;
  change?: number;
  subtitle?: string;
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
  /** Threshold untuk badge ⚠ (default 25) */
  concentrationThreshold?: number;
  /** Formatter Y-axis (misal fmtRp) */
  yAxisFormatter?: (v: number) => string;
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
}

export const BarChartWidget = ({
  title,
  value,
  change,
  subtitle,
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
  onBarClick,
  showLabels = false,
  labelFormatter,
  yAxisWidth = 120,
  mobileNameInBar = false,
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
      <ResponsiveContainer width="100%" height={height} debounce={140}>
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
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
                domain={[0, 'auto']}
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
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
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
            />
          )}
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
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
                    if (val < 5) return null;
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const w = Number(props.width ?? 0);
                    const h = Number(props.height ?? 0);
                    const cx = x + w / 2;
                    const cy = y + h / 2;
                    const label = labelFormatter ? labelFormatter(val) : `${val}%`;
                    return (
                      <text x={cx} y={cy} dy={4} textAnchor="middle" fontSize={11} fontWeight={600} fill={s.labelColor ?? theme.palette.getContrastText(s.color)}>
                        {label}
                      </text>
                    );
                  }}
                />
              )}
              {concentrationKey && idx === series.length - 1 && (
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
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};