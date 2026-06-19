import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartWidgetProps {
  title: string;
  subtitle?: string;
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) => {
  if ((percent ?? 0) < 0.05) return null;
  const _cx = cx as number;
  const _cy = cy as number;
  const _mid = midAngle as number;
  const _ir = innerRadius as number;
  const _or = outerRadius as number;
  const radius = _ir + (_or - _ir) * 0.5;
  const x = _cx + radius * Math.cos(-_mid * RADIAN);
  const y = _cy + radius * Math.sin(-_mid * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${((percent ?? 0) * 100).toFixed(1)}%`}
    </text>
  );
};

export const DonutChartWidget = ({
  title,
  subtitle,
  data,
  height = 240,
  centerLabel,
  centerValue,
}: DonutChartWidgetProps) => {
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="72%"
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => [`${value}%`, '']}
              contentStyle={{ borderRadius: 0, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label overlay */}
        {centerValue && (
          <Box
            sx={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {centerValue}
            </Typography>
            {centerLabel && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.62rem', display: 'block', mt: 0.25 }}
              >
                {centerLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
};