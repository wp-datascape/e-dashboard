import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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
  const clamp = (v: number) => Math.min(Math.max(v, 0), max);
  const pct = (v: number) => `${(clamp(v) / max) * 100}%`;

  const inTarget = value >= targetLow && value <= targetHigh;
  const barColor = inTarget ? '#16a34a' : value < targetLow ? '#eab308' : '#3B82F6';
  const bandBg = inTarget ? 'rgba(22,163,74,0.18)' : 'rgba(234,179,8,0.22)';

  const statusText = inTarget
    ? '✓ Dalam Rentang Target'
    : value < targetLow
      ? '↑ Di Bawah Target — Perlu Ditingkatkan'
      : '↓ Melampaui Target';

  // Tick marks for axis
  const ticks = [0, targetLow, targetHigh, max].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

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

      {/* Value + status */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: barColor, lineHeight: 1 }}>
          {value}{unit}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Target: {targetLow}–{targetHigh}{unit}
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
            bgcolor: '#f3f4f6',
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
            borderLeft: `2px solid ${inTarget ? '#16a34a' : '#eab308'}`,
            borderRight: `2px solid ${inTarget ? '#16a34a' : '#eab308'}`,
          }}
        />

        {/* Actual value bar */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            width: pct(value),
            top: '25%',
            height: '50%',
            bgcolor: barColor,
            transition: 'width 0.5s ease',
          }}
        />
      </Box>

      {/* Tick axis */}
      <Box sx={{ position: 'relative', height: 18, mt: 0.25 }}>
        {ticks.map((t) => (
          <Box
            key={t}
            sx={{
              position: 'absolute',
              left: pct(t),
              transform: 'translateX(-50%)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem',
                color: t === targetLow || t === targetHigh ? '#eab308' : 'text.secondary',
                fontWeight: t === targetLow || t === targetHigh ? 700 : 400,
              }}
            >
              {t}{unit}
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
    </Paper>
  );
};