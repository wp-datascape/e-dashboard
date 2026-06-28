import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  onChartClick?: () => void;
}

export const DonutChartWidget = ({
  title,
  subtitle,
  data,
  height = 240,
  centerLabel,
  centerValue,
  onChartClick,
}: DonutChartWidgetProps) => {
  const theme = useTheme();
  return (
    <Card sx={{ p: 2, height: '100%', border: 'none' }}>
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
          <PieChart onClick={onChartClick} style={onChartClick ? { cursor: 'pointer' } : undefined}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="72%"
              dataKey="value"
              labelLine={false}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0,
                fontSize: 12,
                color: theme.palette.text.primary,
              }}
            />
            <Legend content={(props) => {
              const entries = (props as { payload?: { color?: string; value?: string }[] }).payload ?? [];
              return (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                  {entries.map((entry, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: entry.color, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {entry.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            }} />
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