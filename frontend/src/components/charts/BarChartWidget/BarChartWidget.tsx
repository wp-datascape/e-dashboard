import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

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
}: BarChartWidgetProps) => {
  const theme = useTheme();
  const isPositive = (change ?? 0) >= 0;

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
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        {value !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Chip
                size="small"
                label={`${isPositive ? '+' : ''}${change}%`}
                sx={{
                  bgcolor: isPositive ? 'success.main' : 'error.main',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20,
                  borderRadius: 0,
                }}
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
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            cursor={{ fill: theme.palette.action.hover }}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12 }} />
          )}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
              radius={0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
