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
  AreaChart,
  Area,
} from 'recharts';

export interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  data: { month: string; value: number }[];
  color?: string;
  link?: string;   // route to navigate on click
}

// Format number for display
function formatValue(value: string) {
  return value;
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

  const TrendIcon = isNeutral ? RemoveIcon : isPositive ? TrendingUpIcon : TrendingDownIcon;
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
          flexDirection: 'column',
          gap: 1,
          cursor: link ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
          '&:hover': link
            ? { bgcolor: 'action.hover' }
            : {},
          position: 'relative',
        }}
      >
        {/* Link indicator */}
        {link && (
          <OpenInNewIcon
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 14,
              color: 'text.disabled',
              opacity: 0.6,
            }}
          />
        )}

        {/* Title */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, pr: 2 }}
        >
          {title}
        </Typography>

        {/* Value + badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {formatValue(value)}
          </Typography>
          <Chip
            size="small"
            icon={<TrendIcon sx={{ fontSize: '12px !important' }} />}
            label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
            color={chipColor}
            sx={{
              height: 20,
              borderRadius: 0,
              fontSize: '0.68rem',
              fontWeight: 700,
              '& .MuiChip-icon': { ml: '4px' },
            }}
          />
        </Box>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.3 }}>
            {subtitle}
          </Typography>
        )}

        {/* Sparkline */}
        {data.length > 0 && (
          <Box sx={{ mt: 'auto', pt: 1 }}>
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#spark-${title})`}
                  dot={false}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Tooltip>
  );
};
