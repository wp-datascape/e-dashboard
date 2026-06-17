import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
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
} from 'recharts';

export interface ComboChartWidgetProps {
  title: string;
  subtitle?: string;
  data: object[];
  barKey: string;
  barLabel: string;
  barColor: string;
  lineKey: string;
  lineLabel: string;
  lineColor: string;
  xKey?: string;
  height?: number;
  formatBar?: (v: number) => string;
  formatLine?: (v: number) => string;
}

export const ComboChartWidget = ({
  title,
  subtitle,
  data,
  barKey,
  barLabel,
  barColor,
  lineKey,
  lineLabel,
  lineColor,
  xKey = 'month',
  height = 220,
  formatBar,
  formatLine,
}: ComboChartWidgetProps) => {
  const theme = useTheme();

  const tooltipFormatter = (value: unknown, name: unknown) => {
    const v = value as number;
    const n = name as string;
    if (n === barLabel && formatBar) return [formatBar(v), n];
    if (n === lineLabel && formatLine) return [formatLine(v), n];
    return [v.toLocaleString('id-ID'), n];
  };

  return (
    <Paper
      elevation={0}
      square
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
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

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 28, left: -20, bottom: 0 }}>
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
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (formatLine ? formatLine(v) : v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 12,
            }}
            formatter={tooltipFormatter}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey={barKey}
            name={barLabel}
            fill={barColor}
            radius={0}
          />
          <Line
            yAxisId="right"
            dataKey={lineKey}
            name={lineLabel}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
};