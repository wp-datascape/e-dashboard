import { useNavigate } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  data: { month: string; value: number }[];
  color?: string;
  link?: string;
}

export const StatCard = ({
  title,
  subtitle,
  value,
  change,
  trend,
  data,
  color = '#3B82F6',
  link,
}: StatCardProps) => {
  const navigate = useNavigate();
  const isPositive = trend === 'up';
  const isNeutral = trend === 'stable';

  const TrendIcon = isNeutral
    ? RemoveIcon
    : isPositive
      ? TrendingUpIcon
      : TrendingDownIcon;
  const chipColor = isNeutral ? 'default' : isPositive ? 'success' : 'error';

  return (
    <Tooltip title={link ? `Lihat detail ${title}` : ''} placement="top" arrow>
      <Paper
        elevation={0}
        square
        onClick={() => link && navigate(link)}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          cursor: link ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
          '&:hover': link ? { bgcolor: 'action.hover' } : {},
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Left: text content ── */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            minWidth: 0,
            pr: 1,
          }}
        >
          {/* Title row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 700,
                fontSize: '0.65rem',
                lineHeight: 1.2,
                flex: 1,
                minWidth: 0,
              }}
            >
              {title}
            </Typography>
            {link && (
              <OpenInNewIcon
                sx={{ fontSize: 12, color: 'text.disabled', opacity: 0.5, flexShrink: 0 }}
              />
            )}
          </Box>

          {/* Value + badge */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
            <Chip
              size="small"
              icon={<TrendIcon sx={{ fontSize: '11px !important' }} />}
              label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
              color={chipColor}
              sx={{
                height: 18,
                borderRadius: 0,
                fontSize: '0.65rem',
                fontWeight: 700,
                '& .MuiChip-icon': { ml: '3px' },
              }}
            />
          </Box>

          {/* Subtitle */}
          {subtitle && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ lineHeight: 1.3, fontSize: '0.68rem', mt: 'auto' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* ── Right: simple line chart (no axes, no grid) ── */}
        {data.length > 0 && (
          <Box
            sx={{
              width: 90,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ResponsiveContainer width="100%" height={56}>
              <LineChart
                data={data}
                margin={{ top: 4, right: 2, left: 2, bottom: 4 }}
              >
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Tooltip>
  );
};