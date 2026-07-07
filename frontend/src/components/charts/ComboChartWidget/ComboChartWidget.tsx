import { Card } from '@/components/ui';
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
  Cell,
  LabelList,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

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
  // Garis kedua (misal median) — dashed
  line2Key?: string;
  line2Label?: string;
  line2Color?: string;
  // Custom tooltip — menggantikan tooltip default
  renderTooltip?: (props: TooltipContentProps<number, string>) => React.ReactElement | null;
  // Highlight bar saat nilai field tertentu melebihi threshold
  concentrationKey?: string;
  concentrationThreshold?: number;
  concentrationColor?: string;
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
  line2Key,
  line2Label,
  line2Color,
  renderTooltip,
  concentrationKey,
  concentrationThreshold = 25,
  concentrationColor,
}: ComboChartWidgetProps) => {
  const theme = useTheme();
  const warnColor = concentrationColor ?? theme.palette.warning.light;

  // Hitung domain right axis dari field yang benar-benar di-plot (bukan semua field data)
  const rightDomain = (() => {
    const vals: number[] = [];
    for (const d of data as Record<string, unknown>[]) {
      const v1 = d[lineKey];
      if (typeof v1 === 'number' && isFinite(v1)) vals.push(v1);
      if (line2Key) {
        const v2 = d[line2Key];
        if (typeof v2 === 'number' && isFinite(v2)) vals.push(v2);
      }
    }
    if (vals.length === 0) return [0, 'auto'] as const;
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const pad = (mx - mn) * 0.1 || mx * 0.1;
    return [Math.max(0, mn - pad), mx + pad] as const;
  })();

  const tooltipFormatter = (value: unknown, name: unknown) => {
    const v = value as number;
    const n = name as string;
    if (n === barLabel && formatBar) return [formatBar(v), n];
    if (n === lineLabel && formatLine) return [formatLine(v), n];
    return [v.toLocaleString('id-ID'), n];
  };

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
      <ResponsiveContainer width="100%" height={height} debounce={200}>
        <ComposedChart data={data} margin={{ top: 16, right: 28, left: -20, bottom: 0 }}>
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
            domain={rightDomain}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (formatLine ? formatLine(v) : v)}
          />
          {renderTooltip ? (
            <Tooltip content={(props) => renderTooltip(props as TooltipContentProps<number, string>)} />
          ) : (
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0,
                fontSize: 12,
              }}
              formatter={tooltipFormatter}
            />
          )}
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Bar yAxisId="left" dataKey={barKey} name={barLabel} fill={barColor} radius={0}>
            {concentrationKey && (data as Record<string, number>[]).map((entry, i) => (
              <Cell
                key={i}
                fill={(entry[concentrationKey] ?? 0) > concentrationThreshold ? warnColor : barColor}
              />
            ))}
            {concentrationKey && (
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

          <Line
            yAxisId="right"
            dataKey={lineKey}
            name={lineLabel}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor }}
            type="monotone"
          />

          {line2Key && (
            <Line
              yAxisId="right"
              dataKey={line2Key}
              name={line2Label ?? line2Key}
              stroke={line2Color ?? theme.palette.success.main}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              type="monotone"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
};