import { Card } from '@/components/ui';
import { formatAxisTick } from '@/utils/format';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';

export interface LineAlertWidgetProps {
  title: string;
  subtitle?: string;
  data: object[];
  lineKey: string;
  lineLabel: string;
  xKey?: string;
  threshold?: number;
  thresholdLabel?: string;
  height?: number;
}

export const LineAlertWidget = ({
  title,
  subtitle,
  data,
  lineKey,
  lineLabel,
  xKey = 'month',
  threshold = 10,
  thresholdLabel,
  height = 220,
}: LineAlertWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Calculate y-max from data to bound the reference area
  const yMax =
    Math.max(
      ...(data as Record<string, number>[]).map((d) => (d[lineKey] as number) || 0),
      threshold,
    ) * 1.15;

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
      <ResponsiveContainer width="100%" height={height} debounce={320}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
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
          {/* tickFormatter: bulatkan tick (task023, audit UX Dashboard — tick mentah
              non-bulat kelihatan belum dipoles) */}
          <YAxis
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            domain={[0, yMax]}
            tickFormatter={formatAxisTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {/* Red alert shading above threshold */}
          <ReferenceArea
            y1={threshold}
            y2={yMax}
            fill={theme.palette.error.main}
            fillOpacity={0.1}
            ifOverflow="hidden"
          />

          {/* Threshold reference line */}
          <ReferenceLine
            y={threshold}
            stroke={theme.palette.error.main}
            strokeDasharray="5 3"
            label={{
              value: thresholdLabel ?? t('common.thresholdLabel', { threshold }),
              position: 'insideTopRight',
              fontSize: 10,
              fill: theme.palette.error.main,
              fontWeight: 600,
            }}
          />

          <Line
            dataKey={lineKey}
            name={lineLabel}
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={{ r: 3, fill: theme.palette.primary.main }}
            activeDot={{ r: 5 }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
};