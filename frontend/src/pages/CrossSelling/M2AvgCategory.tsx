import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import CategoryIcon from '@mui/icons-material/Category';
import type { GridColDef } from '@mui/x-data-grid';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TrendSummary } from '@/components/dashboard/TrendSummary';
import { useCrossSelling, useCrossSellingDetail } from '@/hooks/useMetrics';
import type { CrossSellingData } from '@/types/metrics';
import { SectionLabel, SummaryCard } from './HelperComponents';
import { BreakdownTable } from './BreakdownTable';
import { formatRupiah } from '@/utils/format';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodLabelShort,
  getCurrentPeriodKey, getYoyPeriodKey, getPeriodDateRange,
} from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';

// M2 (Average Product Category, task029.md §9) — restrukturisasi 2026-08-21
// (permintaan user: "M1 adalah standar layout default utk semua KPI") —
// pola diadaptasi dari M1CrossSelling.tsx: KpiHeader (current/YoY/change)
// selalu tampil di atas + sub-tab Overview/Trend Analysis. HANYA 2 tab
// (BUKAN 3 spt M1) — M2 tidak punya heatmap sendiri, heatmap M1.1 sudah
// cukup 1x di panel M1 (activeKpi switch di Growth/index.tsx, panel M1/M2
// TIDAK pernah tampil bersamaan di halaman Growth), tidak perlu diduplikasi.
//
// Koreksi 2026-08-21 (lanjutan, sama hari): user lapor "klik titik tidak
// ada muncul pop up" (dialog drill-down per-titik, fitur M2-only) DAN minta
// tabel breakdown yang belum ada. `BreakdownTable` (shared, sama persis M1)
// DITAMBAHKAN di tab Trend Analysis. Dialog klik-titik SEMPAT dihapus lalu
// DIKEMBALIKAN (permintaan user: "kembalikan dialog, coba perbaiki bug
// klik-nya") — root cause bug ketemu & diperbaiki di `AreaChartWidget.tsx`
// (onClick dulu dipasang di `<Dot>` custom kecil, kemungkinan ketutup layer
// pelacak-mouse internal recharts yang dipakai Tooltip — dipindah ke
// onClick level `<AreaChart>` pakai `activeLabel`, mekanisme yang SUDAH
// terbukti jalan buat Tooltip hover). Sekarang KEDUANYA ada: dialog
// per-titik (bisa lihat histori bulan lain) + BreakdownTable (periode
// sekarang, selalu tampil, tidak perlu klik).
interface Props {
  data: CrossSellingData | undefined;
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  /** Buat KpiHeader YoY (2026-08-21, sebelumnya M2 tidak punya KpiHeader sama
   * sekali) — pola sama persis M1CrossSelling.tsx. */
  periodEnd: string;
  /** Granularitas trend (task029.md §30, 2026-08-20) — M2 pakai `data.trend` yang
   * SAMA dengan M1 (1 fetch dishare, lihat Growth/index.tsx), jadi otomatis ikut
   * granularitas M1 juga. Default 'monthly' kalau caller belum wired. */
  periodType?: PeriodGranularity;
  /** Mode "Apply date cutoff" (task029.md §30) — diteruskan ke fetch YoY, pola
   * sama M1CrossSelling.tsx. */
  applyDateCutoff?: boolean;
  excludeIntercompany?: boolean;
}

export function M2AvgCategory({ data, isLoading, companyId, branchId, division, periodEnd, periodType = 'monthly', applyDateCutoff = false, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const periodUnit = t(`dashboard.periodUnit.${periodType}`);

  // Chart Trend Analysis (koreksi user 2026-08-21: "1. Total customer -> tinggi
  // stacked bar/area, 2. Single Category -> bagian pertama, 3. Multi Category ->
  // bagian kedua, 4. Avg Category -> line") — single_category DIHITUNG di sini
  // (total_active - multi_product, keduanya SUDAH ada di data.trend, tidak
  // perlu fetch baru). Garis benchmark (rata-rata dibobot total_active) DIHAPUS
  // lagi (user: "sepertinya itu tidak berfungsi") — cuma avg_category yang
  // tersisa sbg garis tunggal.
  const trendWithBuckets = useMemo(
    () => (data?.trend ?? []).map((t) => ({ ...t, single_category: t.total_active - t.multi_product })),
    [data?.trend],
  );

  // periodEnd diparse manual (BUKAN `new Date(periodEnd)`) — pola sama
  // M1CrossSelling.tsx, hindari pergeseran timezone dari parse string ISO.
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  const yoyPeriodKey = getYoyPeriodKey(periodType, periodKey);
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  const currentPeriodLabel = formatPeriodLabel(periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(periodType, yoyPeriodKey);

  // Header Current/YoY/Change — fetch terpisah, endpoint sama cuma period_end
  // digeser -1 tahun (pola sama persis M1CrossSelling.tsx).
  const { data: yoyData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const [tab, setTab] = useState<'overview' | 'trend'>('overview');

  // ─── Drill-down (klik titik grafik avg-category) ────────────────────────
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const { data: drillData, isLoading: drillLoading } = useCrossSellingDetail({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

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
    { field: 'category_count', headerName: t('crossSelling.colCategoryCount'), width: 110, type: 'number' },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      width: 160,
      type: 'number',
      valueFormatter: (value: number) => formatRupiah(value),
    },
  ];

  // Overview tab — top 5 customer by CATEGORY COUNT (bukan revenue spt M1 —
  // metrik utama panel ini avg category, jadi ranking ikut metrik yang
  // relevan buat panel ini sendiri). Subset data.detail, BUKAN fetch baru.
  const overviewTopCustomers = useMemo(
    () => [...(data?.detail ?? [])].sort((a, b) => b.category_count - a.category_count).slice(0, 5),
    [data?.detail],
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionLabel label={t('crossSelling.labelM2')} icon={CategoryIcon} />

        {isLoading ? (
          <Skeleton variant="rectangular" height={80} />
        ) : (
          <KpiHeader
            metricLabel={t('crossSelling.seriesAvgCategory')}
            current={data?.kpi2.avg_categories ?? 0}
            yoy={yoyData?.kpi2.avg_categories ?? 0}
            kpiType="value"
            formatValue={(v) => v.toFixed(2)}
            currentPeriodLabel={currentPeriodLabel}
            comparisonLabel={yoyComparisonLabel}
          />
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { bgcolor: 'transparent', textTransform: 'none' },
            '& .MuiTab-root.Mui-selected': { bgcolor: 'transparent' },
          }}
        >
          <Tab value="overview" label={t('crossSelling.m2TabOverview')} sx={{ minHeight: 36, py: 0.5 }} />
          <Tab value="trend" label={t('crossSelling.m2TabTrendAnalysis')} sx={{ minHeight: 36, py: 0.5 }} />
        </Tabs>

        {tab === 'overview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px' }}>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={168} />
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, height: '100%' }}>
                    <SummaryCard label={t('crossSelling.seriesAvgCategory')} value={(data?.kpi2.avg_categories ?? 0).toFixed(2)} />
                    <SummaryCard label={t('crossSelling.m2DialogDistinctCats')} value={(data?.kpi2.total_distinct_cats ?? 0).toLocaleString('id-ID')} />
                    <SummaryCard label={t('crossSelling.seriesActiveCustomers')} value={(data?.kpi1.active_count ?? 0).toLocaleString('id-ID')} />
                    <SummaryCard label={t('crossSelling.seriesCrossSellRateShort')} value={`${(data?.kpi1.rate ?? 0).toFixed(1)}%`} />
                  </Box>
                )}
              </Box>

              <Box sx={{ flex: '1 1 300px' }}>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={168} />
                ) : (
                  <AreaChartWidget
                    title={t('crossSelling.m2OverviewChartTitle', { unit: periodUnit })}
                    subtitle={t('crossSelling.seriesAvgCategory')}
                    data={data?.trend ?? []}
                    series={[{ key: 'avg_category', label: t('crossSelling.seriesAvgCategory'), color: theme.palette.success.main }]}
                    xKey="month"
                    height={120}
                    xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
                  />
                )}
              </Box>
            </Box>

            <Box>
              <SectionLabel label={t('crossSelling.m2OverviewTopCustomersLabel')} />
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <Card>
                  {overviewTopCustomers.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">{t('crossSelling.m2EmptyMessage')}</Typography>
                    </Box>
                  ) : (
                    overviewTopCustomers.map((r, i) => (
                      <Box
                        key={r.customer_id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                          borderBottom: i < overviewTopCustomers.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.disabled" sx={{ width: 20, fontWeight: 600 }}>{i + 1}</Typography>
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>{r.customer_name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('crossSelling.colCategoryCount')}: {r.category_count}</Typography>
                      </Box>
                    ))
                  )}
                </Card>
              )}
            </Box>
          </Box>
        )}

        {tab === 'trend' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Box>
              {isLoading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : (
                <>
                  <ComboChartWidget
                    title={t('crossSelling.m2ChartTitle', { unit: periodUnit })}
                    subtitle={`${t('crossSelling.m2ChartSubtitle', { unit: periodUnit })} · ${t('crossSelling.m2ChartHint')}`}
                    data={trendWithBuckets}
                    barKey="single_category"
                    barLabel={t('crossSelling.m2SeriesSingleCategory')}
                    barColor={theme.palette.warning.main}
                    bar2Key="multi_product"
                    bar2Label={t('crossSelling.m2SeriesMultiCategory')}
                    bar2Color={theme.palette.primary.main}
                    stacked
                    barVariant="area"
                    lineKey="avg_category"
                    lineLabel={t('dashboard.charts.avgCategoryLabel')}
                    lineColor={theme.palette.success.main}
                    formatLine={(v) => v.toFixed(2)}
                    xKey="month"
                    height={220}
                    xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
                    onBarClick={(d) => setDrillDate(getPeriodDateRange(periodType, String(d.month ?? '')).end)}
                  />
                  <TrendSummary
                    metricLabel={t('crossSelling.seriesAvgCategory')}
                    data={data?.trend ?? []}
                    accessor={(r) => r.avg_category}
                    labelAccessor={(r) => r.month}
                    formatValue={(v) => v.toFixed(2)}
                    unit={periodUnit}
                  />
                </>
              )}
            </Box>

            <BreakdownTable data={data} yoyData={yoyData} isLoading={isLoading} />
          </Box>
        )}
      </Box>

      {/* M2 Drill-down Dialog — detail per customer bulan yang diklik (fitur
          M2-only, dikembalikan setelah bug klik-nya diperbaiki di
          AreaChartWidget.tsx) */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('crossSelling.m2DialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={drillData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('crossSelling.m2DialogAvgCategories'), String(drillData.kpi2.avg_categories)],
              [t('crossSelling.m2DialogDistinctCats'),  String(drillData.kpi2.total_distinct_cats)],
              [t('crossSelling.m2DialogActiveCount'),   String(drillData.kpi1.active_count)],
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
          rows={(drillData?.detail ?? []).map((r) => ({ ...r, id: r.customer_id }))}
          columns={detailColumns}
          loading={drillLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('crossSelling.m2EmptyMessage')}
          mobileFields={['customer_name', 'category_count', 'total_revenue']}
        />
      </Dialog>
    </Box>
  );
}
