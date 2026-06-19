import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

export interface RadialBarWidgetProps {
  title: string;
  subtitle?: string;
  value: number; // 0–100
  thresholdGreen?: number; // default 80
  height?: number;
}

export const RadialBarWidget = ({
  title,
  subtitle,
  value,
  thresholdGreen = 80,
  height = 220,
}: RadialBarWidgetProps) => {
  const color =
    value >= thresholdGreen ? '#16a34a' : value >= 60 ? '#eab308' : '#dc2626';

  const statusLabel =
    value >= thresholdGreen
      ? '✓ Sesuai Target'
      : value >= 60
        ? '⚠ Mendekati Target'
        : '✗ Di Bawah Target';

  const chartData = [{ value, fill: color }];

  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            startAngle={90}
            endAngle={-270}
            data={chartData}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={0}
              background={{ fill: '#e5e7eb' }}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center value overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color, lineHeight: 1 }}
          >
            {value}%
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.65rem', color, fontWeight: 600, display: 'block', mt: 0.5 }}
          >
            {statusLabel}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.6rem' }}
          >
            Target ≥ {thresholdGreen}%
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};