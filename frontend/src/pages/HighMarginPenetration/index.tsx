import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useHmBreakdown } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { M5HighMargin } from '@/components/analisis/M5HighMargin';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  KPI_PERIOD_TYPE_MONTHS, type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, averageLastMonths } from '@/utils/analisisComparison';
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

  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const [periodType, setPeriodType] = useState<KpiPeriodType>('quarter');
  const [endDate, setEndDate] = useState<string>(todayIsoDate());
  const todayStr = todayIsoDate();
  const isViewingInProgress = endDate === todayStr;

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

  const hm = data?.high_margin_current;
  // Rata-rata K bulan terakhir (K = periodType), BUKAN cuma titik terakhir
  // — supaya dropdown Periode benar-benar mengubah angka (task025 §18).
  const periodMonths = KPI_PERIOD_TYPE_MONTHS[periodType];
  const currentHm = averageLastMonths(data?.trend ?? [], periodMonths, (p) => p.high_margin_ratio);
  const comparisonHm = averageLastMonths(comparisonData?.trend ?? [], periodMonths, (p) => p.high_margin_ratio);
  const growthPct = computeChangePct(currentHm, comparisonHm);
  const hmLabel = t('customerMetrics.m5.chartTitle');

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

      <M5HighMargin
        isLoading={isLoading}
        hm={hm}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        periodEnd={endDate}
        excludeIntercompany={excludeIntercompany}
      />

      {data && (
        <KpiSummaryStrip
          metrics={[{ label: hmLabel, comparisonText: `${comparisonHm.toFixed(1)}%`, currentText: `${currentHm.toFixed(1)}%` }]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[{
            metricLabel: hmLabel,
            pct: growthPct,
            value: currentHm - comparisonHm,
            currentIsZero: currentHm === 0,
            formatValue: (v) => `${v.toFixed(1)}%`,
          }]}
          onPrev={() => setEndDate(shiftEndDate(periodType, endDate, -1))}
          onNext={() => {
            const next = shiftEndDate(periodType, endDate, 1);
            setEndDate(next > todayStr ? todayStr : next);
          }}
          nextDisabled={isViewingInProgress}
        />
      )}

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
