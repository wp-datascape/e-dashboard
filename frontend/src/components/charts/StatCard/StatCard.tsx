import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { StatusChip } from '@/components/ui/StatusChip';

export interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  data: { month: string; value: number }[];
  color?: string;
  link?: string;
  /** True kalau trend 'up' untuk metrik ini justru hal BURUK (mis. Dormant Rate/Value)
   * — badge warna dibalik (naik = merah), panah arah tetap sesuai trend asli. Lihat
   * `utils/metricPolarity.ts`. Default false (kenaikan = baik, kasus mayoritas). */
  inversePolarity?: boolean;
}

export const StatCard = ({
  title,
  subtitle,
  value,
  change,
  trend,
  data,
  color: colorProp,
  link,
  inversePolarity = false,
}: StatCardProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isPositive = trend === 'up';
  const isNeutral = trend === 'stable';
  const color = colorProp ?? theme.palette.primary.main;

  // Panah arah SELALU ikut trend asli (naik/turun beneran) — yang polaritas-aware
  // cuma warna badge (baik/buruk), supaya tidak ada kontradiksi arah-vs-warna.
  const TrendIcon = isNeutral
    ? RemoveIcon
    : isPositive
      ? TrendingUpIcon
      : TrendingDownIcon;
  const isGood = isNeutral ? null : inversePolarity ? !isPositive : isPositive;
  const chipColor = isNeutral ? 'default' : isGood ? 'success' : 'error';

  return (
    <Tooltip title={link ? t('common.viewDetailOf', { title }) : ''} placement="top" arrow>
      <Card
        onClick={() => link && navigate(link)}
        sx={{
          p: 2,
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
            <StatusChip
              icon={<TrendIcon />}
              label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
              color={chipColor}
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
            {/* debounce: nilai DIBEDAKAN sengaja per tipe widget (50/80/140/200/260/320/380)
                supaya kalau banyak chart render bersamaan di 1 halaman (mis. halaman
                Customer Metrics dengan 5 widget sekaligus), redraw SVG-nya TIDAK numpuk
                di tick JS yang sama - itu yang bikin frame drop besar (diukur: 100ms
                single spike) saat sidebar toggle. Nilai berbeda = redraw menyebar ke
                beberapa frame terpisah, bukan 1 long-task raksasa. */}
            <ResponsiveContainer width="100%" height={56} debounce={50}>
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
      </Card>
    </Tooltip>
  );
};