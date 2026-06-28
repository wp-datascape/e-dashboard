import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { fmtRp, SectionLabel, Row } from './helpers';

function M3Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      p: 1.5,
      minWidth: 230,
      fontSize: 12,
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {d.month}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Row label="Total Revenue" value={fmtRp(d.total_revenue_existing)} />
        <Row label="Total Existing Customer" value={String(d.existing_customers)} />
        <Row label="Avg Revenue/Customer" value={fmtRp(d.avg_revenue)} />
        <Row
          label="Median Revenue"
          value={fmtRp(d.median_revenue)}
          highlight={d.median_revenue < d.avg_revenue * 0.7}
        />
      </Box>
      {d.top_customer_name && (
        <>
          <Divider sx={{ my: 1 }} />
          <Row
            label={`Top: ${d.top_customer_name}`}
            value={`${d.top_customer_pct}% dari total`}
            highlight={d.is_concentrated}
            icon={d.is_concentrated ? '⚠ ' : undefined}
          />
        </>
      )}
    </Box>
  );
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
}

export function M3Revenue({ trend, isLoading }: Props) {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SectionLabel label="M3 · Average Revenue per Existing Customer" />
        <MuiTooltip
          title="Jika garis Avg jauh di atas Median, beberapa customer besar mendorong rata-rata naik — bukan pertumbuhan merata. Bar oranye + ⚠ menandakan bulan di mana 1 customer menyumbang > 25% total revenue."
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>

      {isLoading ? (
        <Skeleton variant="rectangular" height={280} />
      ) : (
        <ComboChartWidget
          title="Total Revenue Existing vs Avg & Median Revenue per Customer (12 Bulan)"
          subtitle="Batang = Total Revenue · Garis solid = Avg · Garis putus = Median · ⚠ = top customer > 25%"
          data={trend}
          barKey="total_revenue_existing"
          barLabel="Total Revenue Existing"
          barColor={theme.palette.primary.main}
          lineKey="avg_revenue"
          lineLabel="Avg Revenue / Customer"
          lineColor={theme.palette.warning.main}
          line2Key="median_revenue"
          line2Label="Median Revenue / Customer"
          line2Color={theme.palette.success.main}
          concentrationKey="top_customer_pct"
          concentrationThreshold={25}
          xKey="month"
          height={260}
          formatBar={(v) => fmtRp(v)}
          formatLine={(v) => fmtRp(v)}
          renderTooltip={(props) => <M3Tooltip {...props} />}
        />
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2.5 }, mt: 1, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">Distribusi normal</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'warning.light', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            1 customer &gt; 25% total revenue — konsentrasi tinggi
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
