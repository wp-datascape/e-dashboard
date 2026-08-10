import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useExpansionBreakdown } from '@/hooks/useMetrics';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { M7Expansion } from '@/components/analisis/M7Expansion';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { Card, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
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

function statusLabel(status: 'up' | 'flat' | 'down', t: (k: string) => string): string {
  if (status === 'up')   return t('customerMetrics.m7.statusUp');
  if (status === 'flat') return t('customerMetrics.m7.statusFlat');
  return t('customerMetrics.m7.statusDown');
}

// KPI 7 — Pelanggan dengan peningkatan nilai belanja (Customer Expansion
// Rate, M7). GLOBAL apple-to-apple dgn halaman Revenue (task025 §12
// lanjutan, 2026-08-07) — KpiFilterBar (periodType+YoY) + KpiSummaryStrip
// banner (YoY dari 2x `useCustomerMetrics`, up_rate) + tabel persisten
// (bound ke endDate, bukan dialog drillDate lagi).
export default function CustomerExpansion() {
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
  const comparisonPeriodStart = shiftDateByYears(periodStart, -1);
  const comparisonRangeText = formatDateRange({ start: comparisonPeriodStart, end: comparisonDate });

  // Fetch pembanding YoY (`useCustomerMetrics` di comparisonDate) DIHAPUS
  // (koreksi user 2026-08-10) — kartu/banner sekarang semua dari
  // `useExpansionBreakdown` (fixed cohort + date_from-aware, lihat di
  // bawah), bukan rata-rata trend lagi. `data.trend` (current) TETAP
  // dipakai M7Expansion (chart tren kanan, 2-way up_rate/flat_down_rate %,
  // di luar scope perubahan ini).
  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const trend = data?.trend ?? [];

  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // ── Breakdown periode berjalan — date_from: periodStart (koreksi user
  // 2026-08-10: "dari total customer dalam periode ini dicari establish-nya",
  // "template standar KPI4") — established_customers TETAP fixed cohort
  // (business rule activeMonths/dormantMonths di endDate, TIDAK ikut
  // periodType, mirror `total_existing` GP breakdown), tapi window
  // current-vs-previous yang dibandingkan (naik/flat/turun) MENGIKUTI
  // periodStart..endDate — BUKAN rata-rata snapshot bulanan lagi (salah,
  // ikut naik-turun tren existing_customers per bulan). Fetch KEDUA di
  // titik pembanding (setahun lalu) — sama pola dgn semua halaman KPI lain,
  // supaya growth% kartu beneran YoY, bukan cuma current vs 0. ──
  const { data: breakdown, isLoading: isBreakdownLoading } = useExpansionBreakdown({
    period_end: endDate,
    date_from: periodStart,
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  const { data: comparisonBreakdown } = useExpansionBreakdown({
    period_end: comparisonDate,
    date_from: comparisonPeriodStart,
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const totalExistingCurrent = breakdown?.total_existing ?? 0;
  const totalExistingComparison = comparisonBreakdown?.total_existing ?? 0;
  const totalExistingGrowthPct = computeChangePct(totalExistingCurrent, totalExistingComparison);

  const naikCountCurrent = breakdown?.up_count ?? 0;
  const naikCountComparison = comparisonBreakdown?.up_count ?? 0;
  const naikCountGrowthPct = computeChangePct(naikCountCurrent, naikCountComparison);

  const flatCountCurrent = breakdown?.flat_count ?? 0;
  const flatCountComparison = comparisonBreakdown?.flat_count ?? 0;
  const flatCountGrowthPct = computeChangePct(flatCountCurrent, flatCountComparison);

  const downCountCurrent = breakdown?.down_count ?? 0;
  const downCountComparison = comparisonBreakdown?.down_count ?? 0;
  const downCountGrowthPct = computeChangePct(downCountCurrent, downCountComparison);

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
          label={statusLabel(row.status, t)}
          color={row.status === 'up' ? 'success' : 'default'}
        />
      ) },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header: judul + kategori KPI + deskripsi — pola SAMA dgn KPI4
          (koreksi user 2026-08-10: "terapkan pola yang sama di expansion").
          Sebelumnya 1 baris gabungan (pageSubtitle = "KPI 7 — ... . Proporsi
          ..."), sekarang dipecah 2 baris terpisah: kategori KPI dulu, baru
          deskripsi di bawahnya. ── */}
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m7.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
          {t('customerMetrics.m7.kpiCategoryLabel')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {t('customerMetrics.m7.pageDescription')}
        </Typography>
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
          KPI (2026-08-10), menggantikan KpiSummaryStrip. Metrik banner
          SEKARANG cerminan kartu Total (koreksi user 2026-08-10: "buat sama
          dengan menu gross profit" — banner KPI4 mencerminkan kartu Total
          Gross Profit-nya, bukan metrik lepas). Sebelumnya masih pakai
          up_rate% dari trend (peninggalan sebelum kartu diubah ke count
          breakdown) — sudah tidak nyambung lagi dgn 4 kartu di bawah. ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          label: t('customerMetrics.m7.totalExistingLabel'),
          baselineValueText: totalExistingComparison.toLocaleString('id-ID'),
          deltaValueText: Math.abs(totalExistingCurrent - totalExistingComparison).toLocaleString('id-ID'),
          growthPct: totalExistingGrowthPct,
        }]}
      />

      {/* ── 4 kartu — Total, Naik, Datar, Turun (koreksi user 2026-08-10:
          "tambahkan card total, dan turun, pisahkan flat/turun jadi
          masing-masing satu card"). Total = established customer TETAP
          (fixed cohort, PERSIS pola total_existing GP breakdown — TIDAK
          ikut naik-turun ganti periodType), Naik/Flat/Turun = partisi EKSAK
          dari cohort tetap itu dlm window periodStart..endDate (bukan
          rata-rata snapshot bulanan lagi — koreksi user: "bukankah dari
          total customer dalam periode dicari establish-nya"). ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('customerMetrics.m7.totalExistingLabel')}
            accentColor={theme.palette.primary.main}
            value={totalExistingCurrent.toLocaleString('id-ID')}
            growthPct={totalExistingGrowthPct}
            deltaValueText={Math.abs(totalExistingCurrent - totalExistingComparison).toLocaleString('id-ID')}
            comparisonValueText={totalExistingComparison.toLocaleString('id-ID')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('customerMetrics.m7.seriesUp')}
            accentColor={theme.palette.success.main}
            value={naikCountCurrent.toLocaleString('id-ID')}
            growthPct={naikCountGrowthPct}
            deltaValueText={Math.abs(naikCountCurrent - naikCountComparison).toLocaleString('id-ID')}
            comparisonValueText={naikCountComparison.toLocaleString('id-ID')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('customerMetrics.m7.statusFlat')}
            accentColor={theme.custom.data[1]}
            value={flatCountCurrent.toLocaleString('id-ID')}
            growthPct={flatCountGrowthPct}
            deltaValueText={Math.abs(flatCountCurrent - flatCountComparison).toLocaleString('id-ID')}
            comparisonValueText={flatCountComparison.toLocaleString('id-ID')}
            // Naik = baik utk metrik ini, jadi "datar/turun naik" = buruk —
            // inverse polarity spt dormant.
            inversePolarity
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('customerMetrics.m7.statusDown')}
            accentColor={theme.custom.data[2]}
            value={downCountCurrent.toLocaleString('id-ID')}
            growthPct={downCountGrowthPct}
            deltaValueText={Math.abs(downCountCurrent - downCountComparison).toLocaleString('id-ID')}
            comparisonValueText={downCountComparison.toLocaleString('id-ID')}
            inversePolarity
          />
        </Grid>
      </Grid>

      {/* ── 2 chart berdampingan — kiri: breakdown 3 balok Naik/Flat/Turun
          (koreksi user 2026-08-10: "jadikan 3 balok naik, flat dan turun.
          urutannya naik, flat, turun"), NILAI JUMLAH CUSTOMER EKSAK dari
          breakdown (koreksi lanjutan: "harusnya berisi jumlah customer...
          bukan hanya persentase", lalu "template standar KPI4" — fixed
          cohort, SAMA angka dgn kartu di atas, BUKAN didekati/rata-rata
          lagi). 3 SERIES beda warna, urutan array series MENENTUKAN urutan
          balok kiri-ke-kanan di BarChartWidget, jadi urutan naik→flat→turun
          HARUS persis begini, bukan asal. kanan: tren 12 bulan (M7Expansion,
          SUDAH ada, TETAP 2-way up/flat_down % — di luar scope perubahan
          ini). Grid 3/12 & 9/12 (koreksi user 2026-08-10: "chart kiri grid
          1, kanan 3 grid, lurus dengan atas") — semula 6/12 & 6/12 (50/50),
          disamakan dgn grid 4-kartu di atas (md:3 tiap kartu) supaya lurus
          vertikal, SAMA pola dgn KPI4. ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          {isBreakdownLoading ? <Skeleton variant="rectangular" height={280} /> : (
            <BarChartWidget
              title={t('customerMetrics.m7.distChartTitle')}
              subtitle={`${t('customerMetrics.m7.distChartSubtitle')} (${currentRangeText})`}
              data={[{
                category: t('customerMetrics.m4.periodChartCategoryLabel'),
                up: naikCountCurrent,
                flat: flatCountCurrent,
                down: downCountCurrent,
              }]}
              series={[
                { key: 'up',   label: t('customerMetrics.m7.statusUp'),   color: theme.palette.success.main },
                { key: 'flat', label: t('customerMetrics.m7.statusFlat'), color: theme.custom.data[1] },
                { key: 'down', label: t('customerMetrics.m7.statusDown'), color: theme.custom.data[2] },
              ]}
              xKey="category"
              height={280}
              yAxisFormatter={(v) => v.toLocaleString('id-ID')}
              tooltipFormatter={(v, n) => [v.toLocaleString('id-ID'), n]}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <M7Expansion
            trend={trend}
            isLoading={isLoading}
            companyId={companyId}
            branchId={branchId === 'all' ? undefined : branchId}
            division={division || undefined}
            excludeIntercompany={excludeIntercompany}
          />
        </Grid>
      </Grid>

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
