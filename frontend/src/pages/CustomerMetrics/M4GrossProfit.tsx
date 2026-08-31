import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { useGpBreakdown } from '@/hooks/useMetrics';
import { useCan } from '@/hooks/useCan';
import { exportGpBreakdownPdf } from '@/utils/pdf/gpBreakdown';
import { fmtRp } from './helpers';
import { formatRupiah } from '@/utils/format';
import { formatPeriodLabel, formatPeriodLabelShort, formatPeriodRangeSub, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from './HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useGpColumns } from './valueHelpers';

// Tooltip custom (2026-08-25, task029.md §33) — DIGANTI ke ChartTooltipCard
// shared component, isi baris sama persis versi lama.
function M4Tooltip({ active, payload, periodType }: TooltipContentProps<number, string> & { periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CustomerMetricsTrendPoint;
  const totalGp = d.gp_tier1 + d.gp_tier2 + d.gp_tier3;

  const rows = [
    { label: t('customerMetrics.m4.tooltipTotalGp'), value: formatRupiah(totalGp) },
    { label: t('customerMetrics.m4.tooltipAvgGp'), value: formatRupiah(d.existing_customers > 0 ? totalGp / d.existing_customers : 0) },
    { label: t('customerMetrics.m4.tierTop'), value: formatRupiah(d.gp_tier1) },
    { label: t('customerMetrics.m4.tierMid'), value: formatRupiah(d.gp_tier2) },
    { label: t('customerMetrics.m4.tierBottom'), value: formatRupiah(d.gp_tier3) },
  ];
  if (d.top_gp_customer_name) {
    rows.push({
      label: t('customerMetrics.m4.topLabel', { name: d.top_gp_customer_name }),
      value: t('customerMetrics.m4.topValue', { revenue: formatRupiah(d.top_gp_revenue), pct: d.top_gp_pct }),
    });
  }

  return (
    <ChartTooltipCard
      title={formatPeriodLabelShort(t, periodType, d.month)}
      rows={rows}
      hint={t('customerMetrics.m4.tooltipClickHint')}
    />
  );
}

interface Props {
  trend: CustomerMetricsTrendPoint[]
  /** Trend YoY (2026-08-25) — di-fetch terpusat di Value/index.tsx. */
  yoyTrend?: CustomerMetricsTrendPoint[]
  isLoading: boolean
  periodType?: PeriodGranularity
  periodEnd?: string
  applyDateCutoff?: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
  onlyPareto?: boolean
}

export function M4GrossProfit({ trend, yoyTrend = [], isLoading, periodType = 'monthly', periodEnd, companyId, branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const can = useCan();
  // Tombol export PDF di drill-down (di bawah, headerActions) generate
  // 100% client-side dari data breakdown yang sudah dimuat — TIDAK ada
  // panggilan backend, jadi permission `customer.gross.profit:export`
  // tidak pernah tercek kalau tidak digate manual di sini (laporan user,
  // 2026-08-30: permission di-off tapi tombol tetap bisa export).
  const canExportGp = can('customer.gross.profit:export');
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [drillDateFrom, setDrillDateFrom] = useState<string | null>(null);
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const gpColumns = useGpColumns(t);

  const latestMonth = trend.length > 0 ? trend[trend.length - 1].month : null;
  const currentPeriodStart = latestMonth ? getPeriodDateRange(periodType, latestMonth).start : undefined;
  const currentPeriodEnd = latestMonth
    ? clampPeriodEndToToday(periodType, latestMonth, getPeriodDateRange(periodType, latestMonth).end)
    : null;
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useGpBreakdown({
    period_end: currentPeriodEnd,
    date_from: currentPeriodStart,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });
  const top5Items: TopMoverItem[] = (currentBreakdown?.rows ?? []).slice(0, 5).map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: formatRupiah(r.gp),
    icon: AccountBalanceWalletIcon,
    iconColor: theme.palette.primary.main,
  }));

  const { data: breakdown, isLoading: breakdownLoading } = useGpBreakdown({
    period_end: drillDate,
    date_from: drillDateFrom ?? undefined,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  const last = trend.at(-1);
  const yoyLast = yoyTrend.at(-1);
  const totalGp = last ? last.gp_tier1 + last.gp_tier2 + last.gp_tier3 : 0;
  const yoyTotalGp = yoyLast ? yoyLast.gp_tier1 + yoyLast.gp_tier2 + yoyLast.gp_tier3 : 0;
  const avgGp = last && last.existing_customers > 0 ? totalGp / last.existing_customers : 0;
  const periodKey = latestMonth ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';
  const periodPhrase = (latestMonth && currentPeriodStart && currentPeriodEnd)
    ? formatPeriodRangeSub(t, periodType, latestMonth, currentPeriodStart, currentPeriodEnd)
    : '';

  return (
    <>
      <Box>
        {/* 3 kartu ringkasan (2026-08-25, task029.md §33) */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m4.summaryTotalGp')}
                value={fmtRp(totalGp)}
                sub={periodPhrase}
                color={theme.palette.primary.main}
                info={t('customerMetrics.m4.summaryTotalGpInfo')}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m4.summaryAvgGp')}
                value={fmtRp(avgGp)}
                sub={periodPhrase}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m4.summaryExisting')}
                value={(last?.existing_customers ?? 0).toLocaleString('id-ID')}
                sub={periodPhrase}
                color={theme.palette.success.main}
                info={t('customerMetrics.m4.summaryExistingInfo')}
              />
            )}
          </Grid>
        </Grid>

        {/* Judul dipindah KE DALAM Card (2026-08-25, "Pindahkan semua judul
            kedalam card") — pola SAMA PERSIS M7ExpansionGrowth.tsx/
            M3Revenue.tsx: 1 Card membungkus judul + Grid chart/Top 5. */}
        <Card>
        <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m4.sectionLabel')} icon={AccountBalanceWalletIcon} />
          <MuiTooltip
            title={t('customerMetrics.m4.tooltipInfo')}
            placement="top"
            arrow
            slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
          >
            <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </MuiTooltip>
        </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                data={trend}
                series={[
                  { key: 'gp_tier1', label: t('customerMetrics.m4.tierTop'),    color: theme.palette.primary.dark },
                  { key: 'gp_tier2', label: t('customerMetrics.m4.tierMid'),    color: theme.palette.primary.main },
                  { key: 'gp_tier3', label: t('customerMetrics.m4.tierBottom'), color: theme.palette.primary.light },
                ]}
                xKey="month"
                height={280}
                stacked
                xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                yAxisFormatter={(v) => fmtRp(v)}
                renderTooltip={(props) => <M4Tooltip {...props} periodType={periodType} />}
                concentrationKey="top_gp_pct"
                concentrationThreshold={25}
                onBarClick={(d) => {
                  const month = String(d.month ?? '');
                  const range = getPeriodDateRange(periodType, month);
                  setDrillMonth(month);
                  setDrillDateFrom(range.start);
                  setDrillDate(clampPeriodEndToToday(periodType, month, range.end));
                }}
                headerContent={periodEnd ? (
                  <KpiHeader
                    current={totalGp}
                    yoy={yoyTotalGp}
                    kpiType="value"
                    formatValue={fmtRp}
                    currentPeriodLabel={currentPeriodLabel}
                    comparisonLabel={yoyComparisonLabel}
                  />
                ) : undefined}
              />
            )}
          </Grid>

          {/* Top 5 (2026-08-25) + tombol "Cek Detail di Laporan" */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
            {isLoading || currentBreakdownLoading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <Box>
                <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SectionLabel label={t('customerMetrics.m4.topCustomersLabel')} />
                  <MuiTooltip
                    title={t('customerMetrics.m4.topCustomersInfo')}
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                  >
                    <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <TopMoversTimeline items={top5Items} emptyMessage={t('customerMetrics.m4.emptyMessage')} />
              </Box>
            )}
            {!(isLoading || currentBreakdownLoading) && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/report/revenue?tab=gp')}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  {t('customerMetrics.m4.viewDetailInReport')}
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
        </Box>
        </Card>
      </Box>

      {/* GP Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => { setDrillDate(null); setDrillDateFrom(null); setDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m4.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {drillMonth && drillDateFrom && drillDate ? formatPeriodRangeSub(t, periodType, drillMonth, drillDateFrom, drillDate) : ''}
            </Typography>
            {/* dialogExistingTx (2026-08-26, task029.md §36.49 — koreksi
                user: "kamus v13 malah mempersulit pemahaman ya?") DIHAPUS
                — baris ini duplikat PERSIS dialogTotalExisting/"Retained
                Total" di atas (sama-sama 855), cuma beda nama field
                sumbernya (total_existing vs rows.length) — 2 baris beda
                label utk angka yang sama itu sendiri sumber kebingungan,
                bukan gara-gara istilah kamus. */}
            {([
              [t('customerMetrics.m4.dialogGpExisting'),  formatRupiah(breakdown.total_gp)],
              [t('customerMetrics.m4.dialogTotalExisting'), breakdown.total_existing.toLocaleString('id-ID')],
              [t('customerMetrics.m4.dialogAvgGp'),                  formatRupiah(breakdown.total_existing > 0 ? breakdown.total_gp / breakdown.total_existing : 0)],
              [t('customerMetrics.m4.dialogMedianThreshold'),                 formatRupiah(breakdown.median_threshold)],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
        headerActions={breakdown && canExportGp && (
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
