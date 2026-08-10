import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import Grid from '@mui/material/Grid';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useGlobalFilter } from '@/context/globalFilter.context';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, averageMonthsInRange } from '@/utils/analisisComparison';

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

  // Rata-rata bulan yg genuinely masuk rentang periodStart..endDate (BUKAN
  // trailing-N-by-posisi-array — bug §8g/KPI4, ditemukan lagi 2026-08-10 via
  // laporan user "reactivation rate di dashboard dan di KPI tidak sama").
  const currentAvg = averageMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.avg_category);
  const comparisonAvg = averageMonthsInRange(comparisonData?.trend ?? [], shiftDateByYears(periodStart, -1), comparisonDate, (p) => p.avg_category);
  const growthPct = computeChangePct(currentAvg, comparisonAvg);

  // ── 3 kartu — breakdown per tipe kategori (Unit/Consumable/Sparepart),
  // koreksi user 2026-08-10 ("section card belum ada"): metrik ini rata-rata
  // tunggal tanpa tier, jadi kartunya diambil dari breakdown 3 tipe kategori
  // yang SUDAH ada di tabel di bawah (has_unit/has_consumable/has_sparepart),
  // bukan tier baru yang dikarang. Tanpa growth YoY (breakdown per-tipe
  // snapshot, bukan trend bulanan). ──
  const rows = data?.detail ?? [];
  const unitCount = rows.filter((r) => r.has_unit).length;
  const consumableCount = rows.filter((r) => r.has_consumable).length;
  const sparepartCount = rows.filter((r) => r.has_sparepart).length;

  const [search, setSearch] = useState('');
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

      {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
          KPI (2026-08-10), menggantikan KpiSummaryStrip. ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          baselineValueText: comparisonAvg.toFixed(2),
          deltaValueText: Math.abs(currentAvg - comparisonAvg).toFixed(2),
          growthPct,
        }]}
      />

      {/* ── 3 kartu breakdown per tipe kategori ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiMetricCard
            label={t('crossSelling.chipUnit')}
            accentColor={theme.custom.data[0]}
            value={String(unitCount)}
            caption={t('avgCategoryPerCustomer.cardCaption', { total: data?.kpi1.active_count ?? 0 })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiMetricCard
            label={t('crossSelling.chipConsumable')}
            accentColor={theme.custom.data[1]}
            value={String(consumableCount)}
            caption={t('avgCategoryPerCustomer.cardCaption', { total: data?.kpi1.active_count ?? 0 })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiMetricCard
            label={t('crossSelling.chipSparepart')}
            accentColor={theme.custom.data[2]}
            value={String(sparepartCount)}
            caption={t('avgCategoryPerCustomer.cardCaption', { total: data?.kpi1.active_count ?? 0 })}
          />
        </Grid>
      </Grid>

      {/* ── 2 chart berdampingan (grid-cols-2 50/50, pola referensi
          executive-kpi-dashboard KPI2View) — kiri: penetrasi customer per
          tipe kategori periode berjalan, kanan: tren 12 bulan. ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? <Skeleton variant="rectangular" height={220} /> : (
              <BarChartWidget
                title={t('avgCategoryPerCustomer.distChartTitle')}
                subtitle={t('avgCategoryPerCustomer.distChartSubtitle')}
                data={[
                  { name: t('crossSelling.chipUnit'), value: unitCount },
                  { name: t('crossSelling.chipConsumable'), value: consumableCount },
                  { name: t('crossSelling.chipSparepart'), value: sparepartCount },
                ]}
                series={[{ key: 'value', label: t('avgCategoryPerCustomer.distSeriesLabel'), color: theme.custom.data[0] }]}
                xKey="name"
                layout="horizontal"
                yAxisWidth={110}
                height={220}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <AreaChartWidget
                title={t('crossSelling.m2ChartTitle')}
                subtitle={`${t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })}`}
                value={currentAvg.toFixed(2)}
                data={data?.trend ?? []}
                series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
                xKey="month"
                height={220}
              />
            )}
          </Grid>
        </Grid>
      </Box>

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
