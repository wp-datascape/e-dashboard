import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Dot,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { DotItemDotProps } from 'recharts';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
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
}: AreaChartWidgetProps) => {
  const theme = useTheme();
  const isPositive = (change ?? 0) >= 0;

  // Area (beda dari Bar) adalah satu shape path kontinu — onClick di <Area> sendiri
  // cuma nembak sekali untuk seluruh area, tidak tahu titik/bulan mana yang diklik.
  // Makanya klik-per-titik diimplementasi lewat prop `dot` (circle individual per data
  // point, masing-masing punya onClick sendiri) - bukan lewat Area.onClick.
  const clickableDot = onAreaClick
    ? (props: DotItemDotProps) => (
        <Dot
          key={`dot-${props.index}`}
          cx={props.cx}
          cy={props.cy}
          r={4}
          fill={props.fill}
          stroke={props.stroke}
          style={{ cursor: 'pointer' }}
          onClick={() => onAreaClick((props.payload as Record<string, unknown>) ?? {})}
        />
      )
    : false

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
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`area-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
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
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#area-grad-${s.key})`}
              dot={clickableDot}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
