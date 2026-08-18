import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { useTheme } from '@mui/material/styles';
import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { LineChartWidget } from '@/components/charts/LineChartWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useRorBreakdown } from '@/hooks/useMetrics';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

// Dipusatkan di sini (semula lokal di pages/CustomerMetrics/M6RepeatOrder.tsx)
// karena sekarang dipakai halaman RepeatOrder (KPI6) — helper inline, BUKAN
// cross-page import (konvensi yang sama dgn M3Revenue.tsx).
function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000)         return `${Math.round(v / 1_000)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/** Konversi 'YYYY-MM' (label dari trend chart) ke hari terakhir bulan sebagai 'YYYY-MM-DD' */
function monthToEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Typography>
  );
}

function orderCountColor(n: number): StatusChipColor {
  if (n >= 10) return 'success';
  if (n >= 5)  return 'primary';
  if (n >= 3)  return 'info';
  return 'default';
}

function useRorColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m6.colRank'),       width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m6.colCustomer'),   flex: 1,    minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m6.colCode'),       width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'invoice_count', headerName: t('customerMetrics.m6.colOrderCount'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={`${p.value}x`}
          color={orderCountColor(p.value as number)}
        />
      ) },
    { field: 'total_revenue', headerName: t('customerMetrics.m6.colTotalRevenue'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRp(p.value as number) },
  ]
}

interface Props {
  isLoading: boolean
  value: number
  thresholdPct: number
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodEnd: string
  excludeIntercompany?: boolean
  // Tren 12 bulan (task025 §21, 2026-08-07 — user: "buatkan chart trend
  // 12 bulan") — field `repeat_order_rate` SUDAH ada per-bulan di trend
  // yang sama dipakai M3/M4/M5/M7, tidak perlu query backend baru.
  trend?: CustomerMetricsTrendPoint[]
}

export function M6RepeatOrder({ isLoading, value, thresholdPct, companyId, branchId, division, periodEnd, excludeIntercompany, trend = [] }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const rorColumns = useRorColumns(t);

  const { data: breakdown, isLoading: breakdownLoading } = useRorBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const trendChartData = trend.map((p) => ({ month: p.month, rate: p.repeat_order_rate }));

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m6.sectionLabel')} />
          <MuiTooltip
            title={t('customerMetrics.m6.tooltipInfo')}
            placement="top"
            arrow
            slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
          >
            <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </MuiTooltip>
        </Box>
        {/* 2 chart berdampingan (grid-cols-2 50/50, pola referensi
            executive-kpi-dashboard KPI6View) — kiri: RadialBar snapshot
            periode berjalan, kanan: tren 12 bulan. Sebelumnya ditumpuk
            vertikal (tren di atas, radial di bawah) — koreksi user
            2026-08-10, "referensi layout setiap KPI" pakai grid-cols-2. */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : (
              <RadialBarWidget
                title={t('customerMetrics.m6.chartTitle')}
                subtitle={t('customerMetrics.m6.chartSubtitle', { thresholdPct })}
                value={value}
                thresholdGreen={thresholdPct}
                height={260}
                onChartClick={() => setDrillDate(monthToEndDate(periodEnd))}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : (
              <LineChartWidget
                title={t('customerMetrics.m6.trendChartTitle')}
                subtitle={t('customerMetrics.m6.trendChartSubtitle')}
                data={trendChartData}
                series={[
                  { key: 'rate', label: t('customerMetrics.m6.seriesRate'), color: theme.palette.primary.main, formatValue: (v) => `${v}%` },
                ]}
                xKey="month"
                height={260}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ROR Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m6.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m6.dialogTotalExisting'),     String(breakdown.total_existing)],
              [t('customerMetrics.m6.dialogRepeatCount'), String(breakdown.repeat_count)],
              [t('customerMetrics.m6.dialogRate'),           `${value}%`],
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
          columns={rorColumns}
          loading={breakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m6.emptyMessage')}
          mobileFields={['customer_name', 'invoice_count', 'total_revenue']}
        />
      </Dialog>
    </>
  );
}
