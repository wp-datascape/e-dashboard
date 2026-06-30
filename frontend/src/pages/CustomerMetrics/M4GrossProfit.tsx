import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import type { GridColDef } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useGpBreakdown } from '@/hooks/useMetrics';
import { exportGpBreakdownPdf } from '@/utils/pdf/gpBreakdown';
import { fmtRp, fmtRpDetail, SectionLabel, Row, monthToEndDate } from './helpers';

function M4Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;
  const totalGp = d.gp_tier1 + d.gp_tier2 + d.gp_tier3;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${theme.palette.divider}`,
      p: 1.5,
      minWidth: 240,
      fontSize: 12,
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {d.month}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Row label="Total GP Existing" value={fmtRp(totalGp)} />
        <Row label="Avg GP / Customer" value={fmtRp(d.existing_customers > 0 ? totalGp / d.existing_customers : 0)} />
        <Divider sx={{ my: 0.75 }} />
        <Row label="Atas (GP > median)"        value={fmtRp(d.gp_tier1)} />
        <Row label="Tengah (50%–100% median)"  value={fmtRp(d.gp_tier2)} />
        <Row label="Bawah (< 50% median)"      value={fmtRp(d.gp_tier3)} />
      </Box>
      {d.top_gp_customer_name && (
        <>
          <Divider sx={{ my: 1 }} />
          <Row
            label={`Top: ${d.top_gp_customer_name}`}
            value={`${fmtRp(d.top_gp_revenue)} · ${d.top_gp_pct}%`}
            highlight={d.is_gp_concentrated}
            icon={d.is_gp_concentrated ? '⚠ ' : undefined}
          />
        </>
      )}
    </Box>
  );
}

function tierChipColor(tier: string): 'primary' | 'info' | 'default' {
  if (tier === 'Atas')   return 'primary';
  if (tier === 'Tengah') return 'info';
  return 'default';
}

const gpColumns: GridColDef[] = [
  { field: 'ranking',       headerName: '#',       width: 56,  sortable: false },
  { field: 'customer_name', headerName: 'Customer', flex: 1,   minWidth: 160 },
  { field: 'customer_code', headerName: 'Kode',     width: 110, sortable: false,
    renderCell: (p) => p.value ?? '—' },
  { field: 'gp',     headerName: 'GP',      width: 130, align: 'right', headerAlign: 'right',
    renderCell: (p) => fmtRpDetail(p.value as number) },
  { field: 'gp_pct', headerName: '% Total', width: 90,  align: 'right', headerAlign: 'right',
    renderCell: (p) => `${p.value}%` },
  { field: 'tier', headerName: 'Tier', width: 100, align: 'center', headerAlign: 'center', sortable: false,
    renderCell: (p) => <StatusChip label={p.value as string} color={tierChipColor(p.value as string)} /> },
]

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
  companyId: number | 'all'
  division?: string
}

export function M4GrossProfit({ trend, isLoading, companyId, division }: Props) {
  const theme = useTheme();
  const [drillDate, setDrillDate] = useState<string | null>(null);

  const { data: breakdown, isLoading: breakdownLoading } = useGpBreakdown({
    period_end: drillDate,
    company_id: companyId,
    division,
  });

  return (
    <>
      <Box>
        <SectionLabel label="M4 · Average Gross Profit per Existing Customer" />
        {isLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <BarChartWidget
            title="Total GP Existing Customer — Kontribusi per Tier (12 Bulan)"
            subtitle="Tier ditentukan tiap bulan: Atas = GP > median · Tengah = 50%–100% median · Bawah = < 50% median · ⚠ = top GP customer > 25%"
            data={trend}
            series={[
              { key: 'gp_tier1', label: 'Atas (GP > median)',        color: theme.palette.primary.dark },
              { key: 'gp_tier2', label: 'Tengah (50%–100% median)',  color: theme.palette.primary.main },
              { key: 'gp_tier3', label: 'Bawah (< 50% median)',      color: theme.palette.primary.light },
            ]}
            xKey="month"
            height={240}
            stacked
            yAxisFormatter={(v) => fmtRp(v)}
            renderTooltip={(props) => <M4Tooltip {...props} />}
            concentrationKey="top_gp_pct"
            concentrationThreshold={25}
            onBarClick={(d) => setDrillDate(monthToEndDate(String(d.month ?? '')))}
          />
        )}
      </Box>

      {/* GP Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0 } } }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          px: 3, py: 2, borderBottom: 1, borderColor: 'divider',
        }}>
          <Box>
            <Typography component="div" variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              GP Breakdown — {drillDate}
            </Typography>
            {breakdown && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                {([
                  ['Gross Profit Existing Customer',  fmtRpDetail(breakdown.total_gp)],
                  ['Total Established (Active+Existing)', String(breakdown.total_existing)],
                  ['Avg GP/Customer',                  fmtRpDetail(breakdown.total_existing > 0 ? breakdown.total_gp / breakdown.total_existing : 0)],
                  ['Median threshold',                 fmtRpDetail(breakdown.median_threshold)],
                  ['Existing bertransaksi bulan ini',  String(breakdown.rows.length)],
                ] as [string, string][]).map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, mt: -0.5 }}>
            {breakdown && (
              <MuiTooltip title="Export PDF" placement="top">
                <IconButton
                  size="small"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => exportGpBreakdownPdf(drillDate!, breakdown)}
                >
                  <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </MuiTooltip>
            )}
            <IconButton size="small" onClick={() => setDrillDate(null)} sx={{ color: 'text.secondary' }}>
              <Typography component="span" sx={{ fontSize: 16, lineHeight: 1 }}>✕</Typography>
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 1 }}>
          <ResponsiveListView
            rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
            columns={gpColumns}
            loading={breakdownLoading}
            height={420}
            pageSize={25}
            pageSizeOptions={[25, 50, 100]}
            emptyMessage="Tidak ada data GP bulan ini"
            mobileFields={['customer_name', 'gp', 'gp_pct', 'tier']}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
