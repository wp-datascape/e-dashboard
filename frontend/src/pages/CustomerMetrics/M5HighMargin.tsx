import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { useHmBreakdown } from '@/hooks/useMetrics';
import { formatRupiah } from '@/utils/format';
import { formatPeriodLabel, formatPeriodRangeSub, getCurrentPeriodKey, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from './HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useHmColumns } from './valueHelpers';


interface Props {
  isLoading: boolean
  hm: { bought_pct: number; not_bought_pct: number } | undefined
  /** Snapshot YoY (2026-08-25) — di-fetch terpusat di Value/index.tsx
   * (`yoyData.high_margin_current`), dipakai KpiHeader. */
  yoyHm?: { bought_pct: number; not_bought_pct: number } | undefined
  /** Granularitas (2026-08-25, task029.md §33) — M5 snapshot 1 titik
   * (BUKAN trend 12 titik spt M3/M4), tapi label periode & window
   * drilldown TETAP granularitas-aware, konsisten SSOT §30.10. */
  periodType?: PeriodGranularity
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodEnd: string
  applyDateCutoff?: boolean
  excludeIntercompany?: boolean
}

export function M5HighMargin({ isLoading, hm, yoyHm, periodType = 'monthly', companyId, branchId, division, periodEnd, excludeIntercompany }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hmDrillDate, setHmDrillDate] = useState<string | null>(null);
  const [hmDrillDateFrom, setHmDrillDateFrom] = useState<string | null>(null);
  const [hmDrillMonth, setHmDrillMonth] = useState<string | null>(null);
  const hmColumns = useHmColumns(t);

  // Periode saat ini (2026-08-25) — M5 snapshot, periodKey dihitung dari
  // periodEnd+periodType, pola sama M1/M6/M7 (bukan dari trend array, M5
  // tidak punya trend).
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  const calendarRange = getPeriodDateRange(periodType, periodKey);
  const currentPeriodStart = calendarRange.start;
  const currentPeriodEnd = clampPeriodEndToToday(periodType, periodKey, calendarRange.end);
  const currentPeriodLabel = formatPeriodLabel(t, periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey));
  const periodPhrase = formatPeriodRangeSub(t, periodType, periodKey, currentPeriodStart, currentPeriodEnd);

  // Top 5 + kartu ringkasan (2026-08-25, pola sama persis M3/M4) — breakdown
  // periode SAAT INI (bukan cuma on-click).
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useHmBreakdown({
    period_end: currentPeriodEnd,
    date_from: currentPeriodStart,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });
  const top5Items: TopMoverItem[] = (currentBreakdown?.rows ?? []).slice(0, 5).map((r) => ({
    id: r.ranking,
    name: r.customer_name,
    metricText: formatRupiah(r.hm_revenue),
    icon: StarIcon,
    iconColor: theme.palette.warning.main,
  }));

  const { data: hmBreakdown, isLoading: hmBreakdownLoading } = useHmBreakdown({
    period_end: hmDrillDate,
    date_from: hmDrillDateFrom ?? undefined,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  return (
    <>
      <Box>
        {/* 3 kartu ringkasan (2026-08-25, task029.md §33) */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryPenetration')}
                value={`${hm?.bought_pct ?? 0}%`}
                sub={periodPhrase}
                color={theme.palette.success.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading || currentBreakdownLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryBuyerCount')}
                value={(currentBreakdown?.hm_buyer_count ?? 0).toLocaleString('id-ID')}
                sub={periodPhrase}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading || currentBreakdownLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('customerMetrics.m5.summaryExisting')}
                value={(currentBreakdown?.total_existing ?? 0).toLocaleString('id-ID')}
                sub={periodPhrase}
                color={theme.palette.primary.main}
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
          <SectionLabel label={t('customerMetrics.m5.sectionLabel')} icon={StarIcon} />
          <MuiTooltip
            title={t('customerMetrics.m5.tooltipInfo')}
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
              <DonutChartWidget
                data={[
                  { name: t('customerMetrics.m5.boughtLabel'), value: hm?.bought_pct ?? 0,       color: theme.palette.success.main },
                  { name: t('customerMetrics.m5.notBoughtLabel'), value: hm?.not_bought_pct ?? 100, color: theme.palette.action.disabledBackground },
                ]}
                centerValue={`${hm?.bought_pct ?? 0}%`}
                centerLabel={t('customerMetrics.m5.centerLabel')}
                height={240}
                onChartClick={() => {
                  setHmDrillMonth(periodKey);
                  setHmDrillDateFrom(currentPeriodStart);
                  setHmDrillDate(currentPeriodEnd);
                }}
                // headerContent hanya kalau yoyHm dikirim (2026-08-25) —
                // caller lama (CustomerMetrics workbench) belum fetch YoY
                // sama sekali, jangan render KpiHeader dgn yoy=0 palsu
                // (menyesatkan, seolah tahun lalu genuinely 0%).
                headerContent={yoyHm ? (
                  <KpiHeader
                    current={hm?.bought_pct ?? 0}
                    yoy={yoyHm.bought_pct}
                    kpiType="rate"
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
                  <SectionLabel label={t('customerMetrics.m5.topCustomersLabel')} />
                  <MuiTooltip
                    title={t('customerMetrics.m5.topCustomersInfo')}
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                  >
                    <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <TopMoversTimeline items={top5Items} emptyMessage={t('customerMetrics.m5.emptyMessage')} />
              </Box>
            )}
            {!(isLoading || currentBreakdownLoading) && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/report/revenue?tab=hm')}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  {t('customerMetrics.m5.viewDetailInReport')}
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
        </Box>
        </Card>
      </Box>

      {/* HM Breakdown Dialog */}
      <Dialog
        open={!!hmDrillDate}
        onClose={() => { setHmDrillDate(null); setHmDrillDateFrom(null); setHmDrillMonth(null); }}
        maxWidth="md"
        title={t('customerMetrics.m5.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={hmBreakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {hmDrillMonth && hmDrillDateFrom && hmDrillDate ? formatPeriodRangeSub(t, periodType, hmDrillMonth, hmDrillDateFrom, hmDrillDate) : ''}
            </Typography>
            {([
              [t('customerMetrics.m5.dialogTotalExisting'),    hmBreakdown.total_existing.toLocaleString('id-ID')],
              [t('customerMetrics.m5.dialogBought'), hmBreakdown.hm_buyer_count.toLocaleString('id-ID')],
              [t('customerMetrics.m5.dialogPenetration'),                  `${hm?.bought_pct ?? 0}%`],
              [t('customerMetrics.m5.dialogRevenue'),    formatRupiah(hmBreakdown.total_hm_revenue)],
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
          rows={(hmBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={hmColumns}
          loading={hmBreakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m5.emptyMessage')}
          mobileFields={['customer_name', 'hm_revenue', 'hm_pct']}
        />
      </Dialog>
    </>
  );
}
