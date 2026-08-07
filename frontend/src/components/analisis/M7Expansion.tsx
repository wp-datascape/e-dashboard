import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useExpansionBreakdown } from '@/hooks/useMetrics';

// Dipusatkan di sini (semula lokal di pages/CustomerMetrics/M7Expansion.tsx)
// karena sekarang dipakai halaman CustomerExpansion (KPI7) — helper inline,
// BUKAN cross-page import (konvensi sama dgn M3Revenue.tsx dkk).
function fmtRpDetail(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function monthToEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{ fontWeight: 700, mb: 0.5, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
    >
      {label}
    </Typography>
  );
}

function statusChipColor(status: string): 'success' | 'default' {
  return status === 'up' ? 'success' : 'default';
}

function statusLabel(status: string, t: TFunction): string {
  return status === 'up' ? t('customerMetrics.m7.statusUp') : t('customerMetrics.m7.statusFlatDown');
}

// Kolom rank/customer/code reuse key m4.* (sudah pola yang sama dipakai M3Revenue.tsx)
// — generik lintas M3/M4/M7, tidak perlu duplikasi key per-metrik.
function useExpansionColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m4.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), flex: 1,   minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'prev_revenue', headerName: t('customerMetrics.m7.colPrevRevenue'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRpDetail(p.value as number) },
    { field: 'cur_revenue', headerName: t('customerMetrics.m7.colCurRevenue'), width: 130, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRpDetail(p.value as number) },
    { field: 'change_pct', headerName: t('customerMetrics.m7.colChangePct'), width: 100, align: 'right', headerAlign: 'right',
      renderCell: (p) => (p.value === null ? '—' : `${p.value}%`) },
    { field: 'status', headerName: t('customerMetrics.m7.colStatus'), width: 110, align: 'center', headerAlign: 'center', sortable: false,
      renderCell: (p) => <StatusChip label={statusLabel(p.value as string, t)} color={statusChipColor(p.value as string)} /> },
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

export function M7Expansion({ trend, isLoading, companyId, branchId, division, excludeIntercompany }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const expansionColumns = useExpansionColumns(t);

  const { data: breakdown, isLoading: breakdownLoading } = useExpansionBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SectionLabel label={t('customerMetrics.m7.sectionLabel')} />
        <MuiTooltip
          title={t('customerMetrics.m7.tooltipInfo')}
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
        <Skeleton variant="rectangular" height={340} />
      ) : (
        <BarChartWidget
          title={t('customerMetrics.m7.chartTitle')}
          subtitle={t('customerMetrics.m7.chartSubtitle')}
          data={trend.map((point) => ({
            month:          point.month,
            up_rate:        point.up_rate,
            flat_down_rate: point.flat_down_rate,
          }))}
          series={[
            { key: 'up_rate',        label: t('customerMetrics.m7.seriesUp'), color: theme.palette.success.main },
            { key: 'flat_down_rate', label: t('customerMetrics.m7.seriesFlatDown'),  color: theme.palette.action.disabledBackground, labelColor: theme.palette.text.primary },
          ]}
          xKey="month"
          height={320}
          stacked
          layout="horizontal"
          showLabels
          labelFormatter={(v) => `${v.toFixed(1)}%`}
          tooltipFormatter={(v, n) => [`${v.toFixed(1)}%`, n]}
          onBarClick={(d) => setDrillDate(monthToEndDate(String(d.month ?? '')))}
        />
      )}

      {/* Expansion Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m7.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m7.dialogUpCount'),       String(breakdown.up_count)],
              [t('customerMetrics.m7.dialogTotalExisting'), String(breakdown.total_existing)],
              [t('customerMetrics.m7.dialogUpRate'),        `${breakdown.total_existing > 0 ? ((breakdown.up_count / breakdown.total_existing) * 100).toFixed(1) : '0.0'}%`],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
      >
        <ResponsiveListView
          rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={expansionColumns}
          loading={breakdownLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m7.emptyMessage')}
          mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
        />
      </Dialog>
    </>
  );
}
