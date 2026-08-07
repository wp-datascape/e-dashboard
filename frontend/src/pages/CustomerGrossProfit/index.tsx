import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useGpBreakdown } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { M4GrossProfit } from '@/components/analisis/M4GrossProfit';
import { Card, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct } from '@/utils/analisisComparison';
import type { GpBreakdownRow } from '@/types/metrics';

function fmtRpDetail(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function tierChipColor(tier: string): 'primary' | 'info' | 'default' {
  if (tier === 'Atas')   return 'primary';
  if (tier === 'Tengah') return 'info';
  return 'default';
}

// KPI 4 — Keuntungan dari pelanggan loyal (Average Gross Profit, M4).
// GLOBAL apple-to-apple dgn halaman Revenue (task025 §12 lanjutan,
// 2026-08-07 — user tanya "kenapa tabel dan filternya belum menyesuaikan
// template sesuai revenue"): KpiFilterBar (periodType+YoY, bukan
// DateScopeFilterBar lagi) + KpiSummaryStrip banner (YoY nyata, dihitung
// dari 2x panggil `useCustomerMetrics` di endDate & endDate-1tahun — TIDAK
// perlu endpoint backend baru, trend sudah 12-bulan rolling per titik
// waktu) + tabel persisten (bound ke endDate, BUKAN dialog drillDate lagi).
export default function CustomerGrossProfit() {
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
  const currentGp = trend.at(-1)?.avg_gross_profit ?? 0;
  const comparisonGp = comparisonData?.trend.at(-1)?.avg_gross_profit ?? 0;
  const growthPct = computeChangePct(currentGp, comparisonGp);
  const gpLabel = t('customerMetrics.m4.chartTitle');

  // Tabel persisten — bound ke endDate (BUKAN drillDate dari klik bar lagi).
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const { data: breakdown, isLoading: isBreakdownLoading } = useGpBreakdown({
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

  const tableColumns: GridColDef<GpBreakdownRow>[] = [
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), minWidth: 200, flex: 1.4,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.customer_name}</Typography>
          {row.customer_code && <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>}
        </Box>
      ) },
    { field: 'gp', headerName: t('customerMetrics.m4.colGp'), minWidth: 160, flex: 0.9,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'gp_pct', headerName: t('customerMetrics.m4.colGpPct'), minWidth: 130, flex: 0.7,
      valueFormatter: (v: number) => `${v}%` },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), minWidth: 140, flex: 0.8,
      renderCell: ({ row }) => <StatusChip label={row.tier} color={tierChipColor(row.tier)} /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m4.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m4.pageSubtitle')}</Typography>
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

      <M4GrossProfit
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />

      {data && (
        <KpiSummaryStrip
          metrics={[{ label: gpLabel, comparisonText: fmtRpDetail(comparisonGp), currentText: fmtRpDetail(currentGp) }]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[{
            metricLabel: gpLabel,
            pct: growthPct,
            value: currentGp - comparisonGp,
            currentIsZero: currentGp === 0,
            formatValue: fmtRpDetail,
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
          searchPlaceholder={t('customerMetrics.m4.searchPlaceholder')}
          totalCountText={t('customerMetrics.m4.customerCountText', { count: filteredRows.length })}
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.ranking }))}
          columns={tableColumns}
          loading={isBreakdownLoading}
          emptyMessage={t('customerMetrics.m4.emptyMessage')}
          mobileFields={['customer_name', 'gp', 'gp_pct', 'tier']}
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
