import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useGpBreakdown } from '@/hooks/useMetrics';
import { exportGpBreakdownPdf } from '@/utils/pdf/gpBreakdown';
import { fmtRp, fmtRpDetail, monthToEndDate } from './helpers';
import { SectionLabel, Row } from './HelperComponents';

function M4Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  const { t } = useTranslation();
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
      {/* fmtRpDetail (2 desimal) — samakan presisi dengan dialog drill-down di bawah
          (dialogGpExisting/dialogAvgGp pakai fmtRpDetail juga). Sudah diverifikasi
          totalGp (gp_tier1+2+3 dari trend) === breakdown.total_gp identik di backend -
          lihat catatan sama di M3Revenue.tsx M3Tooltip. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Row label={t('customerMetrics.m4.tooltipTotalGp')} value={fmtRpDetail(totalGp)} />
        <Row label={t('customerMetrics.m4.tooltipAvgGp')} value={fmtRpDetail(d.existing_customers > 0 ? totalGp / d.existing_customers : 0)} />
        <Divider sx={{ my: 0.75 }} />
        <Row label={t('customerMetrics.m4.tierTop')}    value={fmtRpDetail(d.gp_tier1)} />
        <Row label={t('customerMetrics.m4.tierMid')}    value={fmtRpDetail(d.gp_tier2)} />
        <Row label={t('customerMetrics.m4.tierBottom')} value={fmtRpDetail(d.gp_tier3)} />
      </Box>
      {d.top_gp_customer_name && (
        <>
          <Divider sx={{ my: 1 }} />
          <Row
            label={t('customerMetrics.m4.topLabel', { name: d.top_gp_customer_name })}
            value={t('customerMetrics.m4.topValue', { revenue: fmtRp(d.top_gp_revenue), pct: d.top_gp_pct })}
            highlight={d.is_gp_concentrated}
            icon={d.is_gp_concentrated ? '⚠ ' : undefined}
          />
        </>
      )}
    </Box>
  );
}

// Nilai `tier` dari backend (GpBreakdownRow.tier) selalu literal 'Atas'/'Tengah'/'Bawah' —
// data API, bukan chrome UI, jadi perbandingan tetap pakai string asli. Hanya label
// tampilan (StatusChip) yang di-translate.
function tierChipColor(tier: string): 'primary' | 'info' | 'default' {
  if (tier === 'Atas')   return 'primary';
  if (tier === 'Tengah') return 'info';
  return 'default';
}

function tierLabel(tier: string, t: TFunction): string {
  if (tier === 'Atas')   return t('customerMetrics.m4.tierTop');
  if (tier === 'Tengah') return t('customerMetrics.m4.tierMid');
  if (tier === 'Bawah')  return t('customerMetrics.m4.tierBottom');
  return tier;
}

function useGpColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m4.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'gp',     headerName: t('customerMetrics.m4.colGp'),     width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRpDetail(p.value as number) },
    { field: 'gp_pct', headerName: t('customerMetrics.m4.colGpPct'), width: 90,  align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), width: 100, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => <StatusChip label={tierLabel(p.value as string, t)} color={tierChipColor(p.value as string)} /> },
  ]
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
}

export function M4GrossProfit({ trend, isLoading, companyId, branchId, division, excludeIntercompany }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const gpColumns = useGpColumns(t);

  const { data: breakdown, isLoading: breakdownLoading } = useGpBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m4.sectionLabel')} />
          <MuiTooltip
            title={t('customerMetrics.m4.tooltipInfo')}
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
          <BarChartWidget
            title={t('customerMetrics.m4.chartTitle')}
            subtitle={t('customerMetrics.m4.chartSubtitle')}
            data={trend}
            series={[
              { key: 'gp_tier1', label: t('customerMetrics.m4.tierTop'),    color: theme.palette.primary.dark },
              { key: 'gp_tier2', label: t('customerMetrics.m4.tierMid'),    color: theme.palette.primary.main },
              { key: 'gp_tier3', label: t('customerMetrics.m4.tierBottom'), color: theme.palette.primary.light },
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
        title={t('customerMetrics.m4.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m4.dialogGpExisting'),  fmtRpDetail(breakdown.total_gp)],
              [t('customerMetrics.m4.dialogTotalExisting'), String(breakdown.total_existing)],
              [t('customerMetrics.m4.dialogAvgGp'),                  fmtRpDetail(breakdown.total_existing > 0 ? breakdown.total_gp / breakdown.total_existing : 0)],
              [t('customerMetrics.m4.dialogMedianThreshold'),                 fmtRpDetail(breakdown.median_threshold)],
              [t('customerMetrics.m4.dialogExistingTx'),  String(breakdown.rows.length)],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
        headerActions={breakdown && (
          <MuiTooltip title={t('customerMetrics.m4.exportPdf')} placement="top">
            <IconButton
              size="small"
              sx={{ color: 'text.secondary' }}
              onClick={() => exportGpBreakdownPdf(drillDate!, breakdown)}
            >
              <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </MuiTooltip>
        )}
      >
        <ResponsiveListView
          rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={gpColumns}
          loading={breakdownLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m4.emptyMessage')}
          mobileFields={['customer_name', 'gp', 'gp_pct', 'tier']}
        />
      </Dialog>
    </>
  );
}
