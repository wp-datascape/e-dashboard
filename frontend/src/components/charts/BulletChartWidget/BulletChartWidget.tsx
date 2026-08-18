import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

export interface BulletChartWidgetProps {
  title: string;
  subtitle?: string;
  value: number; // actual realization value (%)
  targetLow: number; // lower bound of target band (e.g. 15)
  targetHigh: number; // upper bound of target band (e.g. 20)
  max?: number; // axis max (e.g. 30)
  unit?: string; // '%'
}

export const BulletChartWidget = ({
  title,
  subtitle,
  value,
  targetLow,
  targetHigh,
  max = 30,
  unit = '%',
}: BulletChartWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const clamp = (v: number) => Math.min(Math.max(v, 0), max);
  const pct = (v: number) => `${(clamp(v) / max) * 100}%`;
  // Scale factor 0-1 (bukan string persen) — dipakai transform: scaleX(),
  // BUKAN width, supaya animasi bar tidak memicu layout thrash (width/height
  // reflow tiap frame). transform+opacity satu-satunya properti yang aman
  // dianimasikan di compositor thread.
  const scale = (v: number) => clamp(v) / max;

  const inTarget = value >= targetLow && value <= targetHigh;
  const barColor = inTarget ? theme.palette.success.main : value < targetLow ? theme.palette.warning.main : theme.palette.primary.main;
  const bandBg = inTarget ? 'rgba(22,163,74,0.18)' : 'rgba(234,179,8,0.22)';

  const statusText = inTarget
    ? t('common.bulletInTarget')
    : value < targetLow
      ? t('common.bulletBelowTarget')
      : t('common.bulletAboveTarget');

  // Tick marks for axis
  const ticks = [0, targetLow, targetHigh, max].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

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

      {/* Value + status */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: barColor, lineHeight: 1 }}>
          {value}{unit}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('common.targetLabel', { low: targetLow, high: targetHigh, unit })}
        </Typography>
      </Box>

      {/* Bullet bar */}
      <Box sx={{ position: 'relative', height: 36 }}>
        {/* Background track */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '25%',
            height: '50%',
            bgcolor: theme.palette.action.hover,
          }}
        />

        {/* Target band highlight */}
        <Box
          sx={{
            position: 'absolute',
            left: pct(targetLow),
            width: `${((clamp(targetHigh) - clamp(targetLow)) / max) * 100}%`,
            top: 0,
            height: '100%',
            bgcolor: bandBg,
            borderLeft: `2px solid ${inTarget ? theme.palette.success.main : theme.palette.warning.main}`,
            borderRight: `2px solid ${inTarget ? theme.palette.success.main : theme.palette.warning.main}`,
          }}
        />

        {/* Actual value bar — width 100% statis, panjang bar sebenarnya
            digambar lewat scaleX (compositor-only, bukan reflow). */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: '25%',
            height: '50%',
            bgcolor: barColor,
            transform: `scaleX(${scale(value)})`,
            transformOrigin: 'left',
            transition: 'transform 0.5s ease',
          }}
        />
      </Box>

      {/* Tick axis */}
      <Box sx={{ position: 'relative', height: 18, mt: 0.25 }}>
        {ticks.map((tickValue) => (
          <Box
            key={tickValue}
            sx={{
              position: 'absolute',
              left: pct(tickValue),
              transform: 'translateX(-50%)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem',
                color: tickValue === targetLow || tickValue === targetHigh ? 'warning.main' : 'text.secondary',
                fontWeight: tickValue === targetLow || tickValue === targetHigh ? 700 : 400,
              }}
            >
              {tickValue}{unit}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Status label */}
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" sx={{ color: barColor, fontWeight: 600, fontSize: '0.72rem' }}>
          {statusText}
        </Typography>
      </Box>
    </Card>
  );
};