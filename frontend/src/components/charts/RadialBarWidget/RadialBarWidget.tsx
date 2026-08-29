import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';
import { ChartCardTitle } from '../shared/ChartCardTitle';

export interface RadialBarWidgetProps {
  /** Opsional (2026-08-29, task029.md §49 — sebelumnya wajib, digantikan
   * `headerContent` di caller yang butuh header custom). Caller lama yang
   * masih kirim `title` TIDAK berubah. */
  title?: string;
  subtitle?: string;
  /** Penjelasan KPI sbg tooltip ikon info di sebelah judul, GANTI caption
   * permanen `subtitle` (2026-08-28, task029.md §44) — lihat JSDoc prop
   * `titleInfo` di BarChartWidget. `subtitle` TETAP didukung. */
  titleInfo?: string;
  /** Header custom di DALAM Card widget (2026-08-29, task029.md §49) — pola
   * sama persis `headerContent` widget lain. Kalau diisi, MENGGANTIKAN
   * render title/subtitle bawaan. */
  headerContent?: React.ReactNode;
  value: number; // 0–100
  thresholdGreen?: number; // default 80
  height?: number;
  onChartClick?: () => void;
}

export const RadialBarWidget = ({
  title,
  subtitle,
  titleInfo,
  headerContent,
  value,
  thresholdGreen = 80,
  height = 220,
  onChartClick,
}: RadialBarWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  // Proporsi nilai terhadap target (0–100+%)
  const pct = thresholdGreen > 0 ? (value / thresholdGreen) * 100 : 0;
  const color =
    pct >= 100 ? theme.palette.success.main
    : pct >= 75 ? theme.palette.warning.main
    : theme.palette.error.main;

  const statusLabel =
    pct >= 100 ? t('common.radialOnTarget')
    : pct >= 75 ? t('common.radialNearTarget')
    : t('common.radialBelowTarget');

  // Domain [0, thresholdGreen] — lingkaran penuh = target
  const fillValue = Math.min(value, thresholdGreen);
  const chartData = [{ value: fillValue, fill: color }];

  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Box sx={{ mb: 1 }}>
        {headerContent ?? (
          <>
            {title && <ChartCardTitle title={title} info={titleInfo} />}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </Box>

      <Box
        sx={{ position: 'relative', cursor: onChartClick ? 'pointer' : 'default' }}
        onClick={onChartClick}
      >
        {/* debounce dibedakan per tipe widget - lihat StatCard.tsx untuk alasan lengkap
            (staggering supaya redraw banyak chart sekaligus tidak numpuk 1 tick JS) */}
        <ResponsiveContainer width="100%" height={height} debounce={380}>
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
              domain={[0, thresholdGreen]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={0}
              background={{ fill: theme.palette.action.hover }}
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
            {t('common.radialTargetLabel', { threshold: thresholdGreen })}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};