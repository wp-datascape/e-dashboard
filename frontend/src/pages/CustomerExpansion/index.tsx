import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useExpansionBreakdown } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { M7Expansion } from '@/components/analisis/M7Expansion';
import { Card, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct } from '@/utils/analisisComparison';
import type { ExpansionBreakdownRow } from '@/types/metrics';

function fmtRpDetail(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

// KPI 7 — Pelanggan dengan peningkatan nilai belanja (Customer Expansion
// Rate, M7). GLOBAL apple-to-apple dgn halaman Revenue (task025 §12
// lanjutan, 2026-08-07) — KpiFilterBar (periodType+YoY) + KpiSummaryStrip
// banner (YoY dari 2x `useCustomerMetrics`, up_rate) + tabel persisten
// (bound ke endDate, bukan dialog drillDate lagi).
export default function CustomerExpansion() {
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

  const trend = data?.trend ?? [];
  const currentRate = trend.at(-1)?.up_rate ?? 0;
  const comparisonRate = comparisonData?.trend.at(-1)?.up_rate ?? 0;
  const growthPct = computeChangePct(currentRate, comparisonRate);
  const expansionLabel = t('customerMetrics.m7.sectionLabel');

  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const { data: breakdown, isLoading: isBreakdownLoading } = useExpansionBreakdown({
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

  const tableColumns: GridColDef<ExpansionBreakdownRow>[] = [
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), minWidth: 200, flex: 1.3,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.customer_name}</Typography>
          {row.customer_code && <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>}
        </Box>
      ) },
    { field: 'prev_revenue', headerName: t('customerMetrics.m7.colPrevRevenue'), minWidth: 160, flex: 0.9,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'cur_revenue', headerName: t('customerMetrics.m7.colCurRevenue'), minWidth: 160, flex: 0.9,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'change_pct', headerName: t('customerMetrics.m7.colChangePct'), minWidth: 130, flex: 0.7,
      valueFormatter: (v: number | null) => (v === null ? '—' : `${v}%`) },
    { field: 'status', headerName: t('customerMetrics.m7.colStatus'), minWidth: 140, flex: 0.8,
      renderCell: ({ row }) => (
        <StatusChip
          label={row.status === 'up' ? t('customerMetrics.m7.statusUp') : t('customerMetrics.m7.statusFlatDown')}
          color={row.status === 'up' ? 'success' : 'default'}
        />
      ) },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m7.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m7.pageSubtitle')}</Typography>
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

      <M7Expansion
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      {data && (
        <KpiSummaryStrip
          metrics={[{ label: expansionLabel, comparisonText: `${comparisonRate.toFixed(1)}%`, currentText: `${currentRate.toFixed(1)}%` }]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[{
            metricLabel: expansionLabel,
            pct: growthPct,
            value: currentRate - comparisonRate,
            currentIsZero: currentRate === 0,
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
          searchPlaceholder={t('customerMetrics.m7.searchPlaceholder')}
          totalCountText={t('customerMetrics.m7.customerCountText', { count: filteredRows.length })}
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.ranking }))}
          columns={tableColumns}
          loading={isBreakdownLoading}
          emptyMessage={t('customerMetrics.m7.emptyMessage')}
          mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
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
