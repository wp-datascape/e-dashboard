import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { DatePicker } from '@/components/ui/DatePicker';
import { DetailCard } from './components/DetailCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
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

// ─── KPI Summary Card ─────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color = 'primary.main',
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrossSelling() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [periodEnd,  setPeriodEnd]  = useState(todayStr());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division } = scopeFilter;

  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
  });

  const latestTrend = data?.trend.at(-1);

  // ─── Desktop Table Columns ─────────────────────────────────────────────────
  const detailColumns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), width: 130 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1, minWidth: 180 },
    {
      field: 'has_unit',
      headerName: t('crossSelling.chipUnit'),
      width: 90,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_consumable',
      headerName: t('crossSelling.chipConsumable'),
      width: 110,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_sparepart',
      headerName: t('crossSelling.chipSparepart'),
      width: 110,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'category_count',
      headerName: t('crossSelling.colCategoryCount'),
      width: 110,
      type: 'number',
    },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      width: 160,
      type: 'number',
      valueFormatter: (value: number) => fmtRp(value),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="pageTitle">
            {t('crossSelling.pageTitle')}
          </Typography>
          <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
            {t('crossSelling.subtitleWindow', { months: data?.period.active_months ?? '…' })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} sx={{ width: { xs: '100%', sm: 'auto' } }} />

          <DatePicker
            size="small" label={t('crossSelling.filterDateEnd')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
        </Box>
      </Box>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi1Label')}
              value={`${data?.kpi1.rate ?? 0}%`}
              sub={t('crossSelling.kpi1Sub', { multi: data?.kpi1.multi_cat_count ?? 0, active: data?.kpi1.active_count ?? 0 })}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi2Label')}
              value={data?.kpi2.avg_categories ?? 0}
              sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, months: data?.period.active_months ?? '…' })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.activeCustomerLabel', { months: data?.period.active_months ?? '…' })}
              value={data?.kpi1.active_count ?? 0}
              sub={t('crossSelling.activeCustomerSub', { start: data?.period.start ?? '—', end: data?.period.end ?? '—' })}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.crossSellRateNowLabel')}
              value={`${latestTrend?.ratio ?? 0}%`}
              sub={t('crossSelling.crossSellRateNowSub', { multi: latestTrend?.multi_product ?? 0, total: latestTrend?.total_active ?? 0, month: latestTrend?.month ?? '—' })}
              color={theme.palette.warning.main}
            />
          )}
        </Grid>
      </Grid>

      {/* ── M1: Cross Selling Ratio + Active Count Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.m1FullLabel')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title={t('crossSelling.chart1Title')}
                subtitle={t('crossSelling.chart1Subtitle', { months: data?.period.active_months ?? '…' })}
                data={data?.trend ?? []}
                series={[
                  { key: 'total_active',  label: t('crossSelling.seriesActiveCustomers'), color: theme.palette.text.secondary },
                  { key: 'multi_product', label: t('crossSelling.seriesMultiCategory'),    color: theme.palette.primary.main },
                ]}
                xKey="month"
                height={240}
                tooltipFormatter={(value, name) => [
                  t('crossSelling.tooltipCustomerUnit', { value: value.toLocaleString('id-ID') }), name
                ]}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title={t('crossSelling.chart2Title')}
                subtitle={t('crossSelling.chart2Subtitle')}
                value={`${latestTrend?.ratio ?? 0}%`}
                data={data?.trend ?? []}
                series={[{ key: 'ratio', label: t('crossSelling.seriesCrossSellRateShort'), color: theme.palette.info.main }]}
                xKey="month"
                height={240}
                tooltipFormatter={(v, n) => [`${v}%`, n]}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── M1.1: Heatmap — Customer × Product Category ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM11')} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t('crossSelling.heatmapHelperText', { start: data?.period.start ?? '…', end: data?.period.end ?? '…' })}
          </Typography>
          {data?.categories && data.categories.length > 0 && (
            <Chip label={t('crossSelling.categoriesCountChip', { count: data.categories.length })} size="small" variant="outlined" />
          )}
        </Box>
        {isLoading ? (
          <Skeleton variant="rectangular" height={420} />
        ) : (
          <HeatmapWidget
            title={t('crossSelling.heatmapMatrixTitleWithPeriod', { start: data?.period.start ?? '', end: data?.period.end ?? '' })}
            subtitle={t('crossSelling.heatmapSubtitle2')}
            xLabels={(data?.categories ?? []).map((c) =>
              c === 'unit' ? t('crossSelling.chipUnit') : c === 'sparepart' ? t('crossSelling.chipSparepart') : c === 'consumable' ? t('crossSelling.chipConsumable') : c
            )}
            data={(data?.heatmap ?? []).map((row) => ({
              customer: row.customer,
              values: Object.fromEntries(
                Object.entries(row.values).map(([k, v]) => [
                  k === 'unit' ? t('crossSelling.chipUnit') : k === 'sparepart' ? t('crossSelling.chipSparepart') : k === 'consumable' ? t('crossSelling.chipConsumable') : k,
                  v,
                ])
              ),
            }))}
          />
        )}
      </Box>

      {/* ── M2: Avg Category per Customer Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title={t('crossSelling.m2ChartTitle')}
            subtitle={t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })}
            value={`${latestTrend?.avg_category ?? 0}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
            xKey="month"
            height={220}
          />
        )}
      </Box>

      {/* ── Detail per Customer Table ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('crossSelling.detailTableTitleRange', { start: data?.period.start ?? '…', end: data?.period.end ?? '…' })}
          </Typography>
          {data?.detail && (
            <Chip
              label={t('crossSelling.detailCountChip', { count: data.detail.length })}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {isMobile ? (
          <Box>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 1.5 }} />)
              : (data?.detail ?? []).map((row) => (
                  <DetailCard key={row.customer_id} row={row} />
                ))}
          </Box>
        ) : (
          <ResponsiveListView
            rows={(data?.detail ?? []).map((r) => ({ ...r, id: r.customer_id }))}
            columns={detailColumns}
            loading={isLoading}
            pageSize={10}
            height={440}
            mobileFields={['customer_code', 'customer_name', 'has_unit', 'has_consumable', 'has_sparepart', 'category_count', 'total_revenue']}
          />
        )}
      </Box>
    </Box>
  );
}
