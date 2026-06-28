import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
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
}: BarChartWidgetProps) => {
  const theme = useTheme();
  const isPositive = (change ?? 0) >= 0;

  // For horizontal layout: BarChart layout='vertical', X=number, Y=category
  const isHorizontal = layout === 'horizontal';

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
      <ResponsiveContainer width="100%" height={height}>
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
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                width={120}
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
              {showLabels && (
                <LabelList
                  dataKey={s.key}
                  content={(props) => {
                    const val = Number(props.value ?? 0);
                    if (val < 5) return null; // bar terlalu kecil, skip label
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const w = Number(props.width ?? 0);
                    const h = Number(props.height ?? 0);
                    const cx = layout === 'horizontal' ? x + w / 2 : x + w / 2;
                    const cy = layout === 'horizontal' ? y + h / 2 : y + h / 2;
                    const label = labelFormatter ? labelFormatter(val) : `${val}%`;
                    return (
                      <text x={cx} y={cy} dy={4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
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