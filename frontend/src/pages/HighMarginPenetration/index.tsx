import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useHmBreakdown } from '@/hooks/useMetrics';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { M5HighMargin } from '@/components/analisis/M5HighMargin';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, averageMonthsInRange, sumMonthsInRange } from '@/utils/analisisComparison';
import type { HmBreakdownRow } from '@/types/metrics';

function fmtRpDetail(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

// KPI 5 — Pembelian produk fokus / High Margin Penetration (donut, M5).
// GLOBAL apple-to-apple dgn halaman Revenue (task025 §12 lanjutan,
// 2026-08-07) — KpiFilterBar (periodType+YoY) + KpiSummaryStrip banner
// (YoY dari 2x `useCustomerMetrics`, high_margin_ratio) + tabel persisten
// (bound ke endDate, bukan dialog drillDate lagi).
// BELUM dikerjakan (follow-up, dicatat task025.md): chart tren 2-seri
// (Kontribusi % + Penetrasi %) yang seharusnya pindah dari M3.
export default function HighMarginPenetration() {
  const { t } = useTranslation();
  const theme = useTheme();

  const scopeFilter = useGlobalFilter();
  const {
    companyId, branchId, division, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter;
  const todayStr = todayIsoDate();

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate));
  const periodStart = getPeriodDateRange(periodType, periodKey).start;
  const currentRangeText = formatDateRange({ start: periodStart, end: endDate });
  const comparisonDate = shiftDateByYears(endDate, -1);
  const comparisonRangeText = formatDateRange({
    start: shiftDateByYears(periodStart, -1),
    end: comparisonDate,
  });

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  const { data: comparisonData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  // Rata-rata bulan yg genuinely masuk rentang periodStart..endDate (BUKAN
  // trailing-N-by-posisi-array — bug §8g/KPI4, ditemukan lagi 2026-08-10 via
  // laporan user "reactivation rate di dashboard dan di KPI tidak sama").
  const comparisonPeriodStart = shiftDateByYears(periodStart, -1);
  const currentHm = averageMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.high_margin_ratio);
  const comparisonHm = averageMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.high_margin_ratio);
  const growthPct = computeChangePct(currentHm, comparisonHm);
  const hmLabel = t('customerMetrics.m5.seriesPenetration');

  // Card Total Revenue/Total Revenue HM/Kontribusi % + growth (task025
  // §21, 2026-08-07 — user: "dalam card tambahkan total revenue pada
  // periode tersebut, total revenue high margin dan persentase
  // kontribusinya, dan tambahkan info growth"). SUM (bukan rata-rata) bulan
  // dlm rentang — ini metrik ADITIF (uang), beda dari Penetrasi % (rata-rata
  // rasio bulanan). Kontribusi % = rasio dari JUMLAH (bukan rata-rata dari
  // rasio bulanan) — lebih akurat mewakili "total periode" yang diminta,
  // formula sama dgn m4.repository.ts hm_pct per-baris.
  const totalRevenueCurrent = sumMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.total_revenue_existing);
  const totalRevenueComparison = sumMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.total_revenue_existing);
  const totalRevenueGrowthPct = computeChangePct(totalRevenueCurrent, totalRevenueComparison);

  const totalHmRevenueCurrent = sumMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.hm_revenue);
  const totalHmRevenueComparison = sumMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.hm_revenue);
  const totalHmRevenueGrowthPct = computeChangePct(totalHmRevenueCurrent, totalHmRevenueComparison);

  const contributionPctCurrent = totalRevenueCurrent > 0 ? Math.round((totalHmRevenueCurrent / totalRevenueCurrent) * 10000) / 100 : 0;
  const contributionPctComparison = totalRevenueComparison > 0 ? Math.round((totalHmRevenueComparison / totalRevenueComparison) * 10000) / 100 : 0;
  const contributionGrowthPct = computeChangePct(contributionPctCurrent, contributionPctComparison);

  const totalRevenueLabel = t('customerMetrics.m5.totalRevenueLabel');
  const totalHmRevenueLabel = t('customerMetrics.m5.totalRevenueHmLabel');
  const contributionLabel = t('customerMetrics.m5.seriesContribution');

  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const { data: breakdown, isLoading: isBreakdownLoading } = useHmBreakdown({
    period_end: endDate,
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  const rows = breakdown?.rows ?? [];
  const filteredRows = search
    ? rows.filter((r) => r.customer_name.toLowerCase().includes(search.toLowerCase()) || (r.customer_code ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows;

  const tableColumns: GridColDef<HmBreakdownRow>[] = [
    { field: 'customer_name', headerName: t('customerMetrics.m5.colCustomer'), minWidth: 220, flex: 1.6,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.customer_name}</Typography>
          {row.customer_code && <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>}
        </Box>
      ) },
    { field: 'hm_revenue', headerName: t('customerMetrics.m5.colRevenueHm'), minWidth: 170, flex: 1,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'hm_pct', headerName: t('customerMetrics.m5.colPctHm'), minWidth: 150, flex: 0.8,
      valueFormatter: (v: number) => `${v}%` },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m5.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m5.pageSubtitle')}</Typography>
      </Box>

      <KpiFilterBar
        filter={scopeFilter}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetExtra={() => {
          setPeriodType('quarter');
          setEndDate(todayStr);
          setSearch('');
        }}
      />

      {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
          KPI (2026-08-10), menggantikan KpiSummaryStrip. 2 metrik uang
          (Total Revenue & Total Revenue HM) — Kontribusi%/Penetrasi% pindah
          jadi 2 kartu tambahan di bawah (4 kartu total, semua metrik
          KpiSummaryStrip lama tetap ada, cuma dipindah bentuk). ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[
          { label: totalRevenueLabel, baselineValueText: fmtRpDetail(totalRevenueComparison), deltaValueText: fmtRpDetail(Math.abs(totalRevenueCurrent - totalRevenueComparison)), growthPct: totalRevenueGrowthPct },
          { label: totalHmRevenueLabel, baselineValueText: fmtRpDetail(totalHmRevenueComparison), deltaValueText: fmtRpDetail(Math.abs(totalHmRevenueCurrent - totalHmRevenueComparison)), growthPct: totalHmRevenueGrowthPct },
        ]}
      />

      {/* ── 4 kartu — Total Revenue/Total Revenue HM/Kontribusi%/Penetrasi%
          (semua metrik KpiSummaryStrip lama, dipindah jadi kartu). ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={totalRevenueLabel}
            accentColor={theme.custom.data[0]}
            value={fmtRpDetail(totalRevenueCurrent)}
            growthPct={totalRevenueGrowthPct}
            deltaValueText={fmtRpDetail(Math.abs(totalRevenueCurrent - totalRevenueComparison))}
            comparisonValueText={fmtRpDetail(totalRevenueComparison)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={totalHmRevenueLabel}
            accentColor={theme.custom.data[1]}
            value={fmtRpDetail(totalHmRevenueCurrent)}
            growthPct={totalHmRevenueGrowthPct}
            deltaValueText={fmtRpDetail(Math.abs(totalHmRevenueCurrent - totalHmRevenueComparison))}
            comparisonValueText={fmtRpDetail(totalHmRevenueComparison)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={contributionLabel}
            accentColor={theme.custom.data[2]}
            value={`${contributionPctCurrent.toFixed(2)}%`}
            growthPct={contributionGrowthPct}
            deltaValueText={`${Math.abs(contributionPctCurrent - contributionPctComparison).toFixed(2)}%`}
            comparisonValueText={`${contributionPctComparison.toFixed(2)}%`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={hmLabel}
            accentColor={theme.palette.secondary.main}
            value={`${currentHm.toFixed(2)}%`}
            growthPct={growthPct}
            deltaValueText={`${Math.abs(currentHm - comparisonHm).toFixed(2)}%`}
            comparisonValueText={`${comparisonHm.toFixed(2)}%`}
          />
        </Grid>
      </Grid>

      {/* ── 2 chart berdampingan (grid-cols-2 50/50, pola referensi
          executive-kpi-dashboard KPI5View) — kiri: breakdown Revenue vs
          Revenue HM periode berjalan, kanan: tren 12 bulan (SUDAH ada).
          BUKAN donut (referensi pakai donut di sini) — donut di halaman
          ini SUDAH dihapus eksplisit sebelumnya (task025 §21, "hapus donat
          chart, sudah digantikan tren"), tidak dikembalikan lagi. ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarChartWidget
            title={t('customerMetrics.m5.distChartTitle')}
            subtitle={t('customerMetrics.m5.distChartSubtitle')}
            data={[{
              label: t('crossSelling.distLabel'),
              total: totalRevenueCurrent,
              hm: totalHmRevenueCurrent,
            }]}
            series={[
              { key: 'total', label: totalRevenueLabel, color: theme.custom.data[0] },
              { key: 'hm', label: totalHmRevenueLabel, color: theme.custom.data[1] },
            ]}
            xKey="label"
            height={260}
            yAxisFormatter={(v) => fmtRpDetail(v)}
            tooltipFormatter={(v, n) => [fmtRpDetail(v), n]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <M5HighMargin
            isLoading={isLoading}
            trend={data?.trend}
          />
        </Grid>
      </Grid>

      <Card>
        <KpiTableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPaginationModel((p) => ({ ...p, page: 0 })); }}
          searchPlaceholder={t('customerMetrics.m5.searchPlaceholder')}
          totalCountText={t('customerMetrics.m5.customerCountText', { count: filteredRows.length })}
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.ranking }))}
          columns={tableColumns}
          loading={isBreakdownLoading}
          emptyMessage={t('customerMetrics.m5.emptyMessage')}
          mobileFields={['customer_name', 'hm_revenue', 'hm_pct']}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
