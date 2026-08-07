import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct } from '@/utils/analisisComparison';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
// KPI 2 — Rata-rata jumlah kategori produk yang dibeli per customer (M2).
// Dibelah dari `pages/CrossSelling` (task025 §14) — endpoint backend TETAP 1
// (`/metrics/cross-selling` via `useCrossSelling`), permission TETAP
// `cross.selling:*` (reuse).
//
// Susulan (task025 §16, 2026-08-07) — filter disamakan penuh ke template
// Revenue: KpiFilterBar + banner KpiSummaryStrip YoY NYATA, dihitung dari 2x
// panggil `useCrossSelling` (endDate & `shiftDateByYears(endDate,-1)`),
// ambil scalar dari `trend.at(-1)?.avg_category` — TIDAK perlu endpoint
// backend baru (sama trik dgn halaman KPI1 di sebelah).
export default function AvgCategoryPerCustomer() {
  const { t } = useTranslation();
  const theme = useTheme();

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

  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  endDate,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  const { data: comparisonData } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  comparisonDate,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const currentAvg = data?.trend.at(-1)?.avg_category ?? 0;
  const comparisonAvg = comparisonData?.trend.at(-1)?.avg_category ?? 0;
  const growthPct = computeChangePct(currentAvg, comparisonAvg);
  const avgLabel = t('crossSelling.kpi2Label');

  const [search, setSearch] = useState('');
  const rows = data?.detail ?? [];
  const filteredRows = search
    ? rows.filter((r) =>
        r.customer_name.toLowerCase().includes(search.toLowerCase())
        || (r.customer_code ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows;

  // minWidth+flex (bukan width tetap) — anti-truncation, konsisten dgn pola
  // yang sudah dipakai di semua tabel KPI lain sejak task025.
  const columns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), minWidth: 140, flex: 0.8 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1.4, minWidth: 200 },
    {
      field: 'has_unit',
      headerName: t('crossSelling.chipUnit'),
      minWidth: 110,
      flex: 0.6,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_consumable',
      headerName: t('crossSelling.chipConsumable'),
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_sparepart',
      headerName: t('crossSelling.chipSparepart'),
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'category_count',
      headerName: t('crossSelling.colCategoryCount'),
      minWidth: 150,
      flex: 0.8,
      type: 'number',
    },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      minWidth: 160,
      flex: 0.9,
      type: 'number',
      valueFormatter: (value: number) => fmtRp(value),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">
          {t('avgCategoryPerCustomer.pageTitle')}
        </Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
          {t('avgCategoryPerCustomer.pageSubtitle', { months: data?.period.active_months ?? '…' })}
        </Typography>
      </Box>

      {/* ── Filter bar — template resmi Revenue (KpiFilterBar), task025 §16 ── */}
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

      {/* ── M2: Avg Category per Customer Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title={t('crossSelling.m2ChartTitle')}
            subtitle={`${t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })}`}
            value={`${currentAvg}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
            xKey="month"
            height={220}
          />
        )}
      </Box>

      {/* ── Banner ringkasan YoY (KpiSummaryStrip, task025 §16) ── */}
      {data && (
        <KpiSummaryStrip
          metrics={[{ label: avgLabel, comparisonText: `${comparisonAvg}`, currentText: `${currentAvg}` }]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[{
            metricLabel: avgLabel,
            pct: growthPct,
            value: currentAvg - comparisonAvg,
            currentIsZero: currentAvg === 0,
            formatValue: (v) => v.toFixed(2),
          }]}
          onPrev={() => setEndDate(shiftEndDate(periodType, endDate, -1))}
          onNext={() => {
            const next = shiftEndDate(periodType, endDate, 1);
            setEndDate(next > todayStr ? todayStr : next);
          }}
          nextDisabled={isViewingInProgress}
        />
      )}

      {/* ── Tabel persisten — bound ke `endDate` filter ── */}
      <Card>
        <KpiTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('crossSelling.m2SearchPlaceholder')}
          totalCountText={t('crossSelling.m2CustomerCountText', { count: filteredRows.length })}
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.customer_id }))}
          columns={columns}
          loading={isLoading}
          emptyMessage={t('crossSelling.m2EmptyMessage')}
          mobileFields={['customer_name', 'category_count', 'total_revenue']}
          height={420}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
