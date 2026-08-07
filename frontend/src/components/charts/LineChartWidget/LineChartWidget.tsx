import { Card } from '@/components/ui';
import { formatAxisTick } from '@/utils/format';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  /** Format khusus tooltip/nilai seri ini (mis. "%") — default tampilkan angka mentah. */
  formatValue?: (v: number) => string;
}

export interface LineChartWidgetProps {
  title: string;
  value?: string | number;
  change?: number;
  subtitle?: string;
  data: object[];
  series: LineSeries[];
  xKey?: string;
  height?: number;
}

/**
 * Chart garis multi-seri TANPA fill (beda dari AreaChartWidget yang selalu
 * ada gradient di bawah garis) — dipakai saat kartu/dashboard butuh 2+ seri
 * dibandingkan berdampingan tanpa area saling menutupi secara visual (task025
 * §20, 2026-08-07 — KPI5 High Margin: 2 seri "Kontribusi %" vs "Penetrasi %").
 * Struktur & convention SAMA dgn AreaChartWidget (header value+change+title+
 * subtitle, axis, tooltip, legend otomatis kalau seri > 1) — cuma elemen
 * chart-nya `<Line>` polos, bukan `<Area>` bergradasi.
 */
export const LineChartWidget = ({
  title,
  value,
  change,
  subtitle,
  data,
  series,
  xKey = 'name',
  height = 220,
}: LineChartWidgetProps) => {
  const theme = useTheme();
  const isPositive = (change ?? 0) >= 0;

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
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            tickFormatter={formatAxisTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 12,
            }}
            formatter={(v, name) => {
              const s = series.find((x) => x.label === name);
              const num = typeof v === 'number' ? v : Number(v);
              return [s?.formatValue ? s.formatValue(num) : v, name];
            }}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12 }} />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
