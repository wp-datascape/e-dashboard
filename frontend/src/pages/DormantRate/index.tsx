import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useCustomers } from '@/hooks/useCustomers';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { KpiSectionLabel } from '@/components/analisis/KpiSectionLabel';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate, formatDateDDMMYYYY } from '@/utils/date';
import { computeChangePct } from '@/utils/analisisComparison';
import type { CustomerRow } from '@/types/customers';

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/** Bulan dormant dihitung dari last_invoice_date vs tanggal acuan — mirror
 * formula backend `estimated_lost_value` (GREATEST(ROUND(diff/30), 1)),
 * cuma dihitung client-side krn endpoint /customers tidak expose field ini. */
function monthsDormant(lastInvoiceDate: string | null, asOfDate: string): number {
  if (!lastInvoiceDate) return 0;
  const diffDays = (new Date(asOfDate).getTime() - new Date(lastInvoiceDate).getTime()) / 86_400_000;
  return Math.max(Math.round(diffDays / 30), 1);
}

// KPI 8 — Dormant Customer Rate. Sebelumnya bagian dari bundel
// DormantCustomer (M8+M9+M10 1 route) — dipecah jadi halaman sendiri
// mengikuti keputusan ux-menu-mapping.md v9 "1 route = 1 KPI" (task025 §7a).
// Filter+banner dimigrasi ke KpiFilterBar+KpiSummaryStrip (task025 lanjutan
// 2026-08-07) — GLOBAL apple-to-apple dgn halaman Revenue, termasuk
// perbandingan YoY nyata (backend dihitung ulang di tanggal setahun lalu,
// bukan cuma UI kosong — lihat metrics.service.ts::getDormantCustomerMetrics).
// Endpoint backend TETAP 1 (`GET /metrics/dormant-customer`, gabungan M8-M10)
// — halaman ini cuma menampilkan slice M8-nya saja.
export default function DormantRate() {
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
  const comparisonRangeText = formatDateRange({
    start: shiftDateByYears(periodStart, -1),
    end: shiftDateByYears(endDate, -1),
  });

  const { data, isLoading } = useDormantCustomer({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const drc = data?.dormant_rate_current;
  const alertPct = drc?.alert_pct ?? 10;

  // Dormant Rate — EOP (End of Period), BUKAN rata-rata (koreksi user
  // 2026-08-10, spek formal "Customer Activity Snapshot & Period
  // Aggregation" §5.1/6/7/8: Active/Dormant Customer untuk Quarterly/
  // Semester/Annual WAJIB snapshot akhir periode, "Jangan menjumlahkan/
  // merata-ratakan Active Customer antar bulan"). Sebelumnya pakai
  // averageMonthsInRange (rata-rata dormant_rate sepanjang periodStart..
  // endDate) — SALAH per spek ini, walau sempat "benar" menurut standar
  // KPI4 (yang memang SUM/average utk metrik UANG, bukan utk status
  // aktif/dormant). `drc.value`/`drc.comparison_value` SUDAH EOP dari
  // sono-nya (trend.at(-1) di metrics.service.ts) — TIDAK perlu fetch
  // comparisonData/averageMonthsInRange lagi sama sekali.
  const currentDormantRate = drc?.value ?? 0;
  const comparisonDormantRate = drc?.comparison_value ?? 0;
  const growthPct = computeChangePct(currentDormantRate, comparisonDormantRate);
  const dormantRateLabel = t('dormantRate.dormantRateCurrentLabel');

  // ── 4 kartu — Total, Aktif, Dormant Ringan, Dormant Kronis (koreksi user
  // 2026-08-10, opsi A: "pecah card jadi 4 info... severity dormant").
  // SEMUA snapshot EOP di endDate (SAMA prinsip dgn currentDormantRate% di
  // atas, spek §5.1/6/7/8) — active_count/dormant_light_count/
  // dormant_severe_count SUDAH dihitung backend (m8m10.repository.ts),
  // partisi EKSAK dari total_customers yang SAMA. Comparison-nya juga sudah
  // ikut dikirim server (field _comparison, EOP dari trend setahun lalu) —
  // TIDAK perlu fetch kedua sama sekali.
  const totalCurrent = drc?.total_customers ?? 0;
  const totalComparison = (drc?.active_count_comparison ?? 0) + (drc?.dormant_light_count_comparison ?? 0) + (drc?.dormant_severe_count_comparison ?? 0);
  const totalGrowthPct = computeChangePct(totalCurrent, totalComparison);

  const activeCurrent = drc?.active_count ?? 0;
  const activeComparison = drc?.active_count_comparison ?? 0;
  const activeGrowthPct = computeChangePct(activeCurrent, activeComparison);

  const dormantLightCurrent = drc?.dormant_light_count ?? 0;
  const dormantLightComparison = drc?.dormant_light_count_comparison ?? 0;
  const dormantLightGrowthPct = computeChangePct(dormantLightCurrent, dormantLightComparison);

  const dormantSevereCurrent = drc?.dormant_severe_count ?? 0;
  const dormantSevereComparison = drc?.dormant_severe_count_comparison ?? 0;
  const dormantSevereGrowthPct = computeChangePct(dormantSevereCurrent, dormantSevereComparison);

  // ── Tabel — daftar pelanggan tidak aktif (KPI8). REUSE endpoint /customers
  // (status=dormant) yang sudah ada, BUKAN endpoint baru — sama pola dgn
  // "Keputusan A" (reuse tabel Analisis Revenue/Retention di KPI3/KPI6).
  // Konsekuensi: butuh permission `customer:view` juga (bukan cuma
  // `churn.risk:view`) — default role admin/user sudah membundel keduanya,
  // dicatat di task025.
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const { data: customersData, isLoading: isTableLoading } = useCustomers({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    business_unit: division || undefined,
    status: 'dormant',
    as_of_date: endDate,
    search: search || undefined,
    exclude_intercompany: excludeIntercompany,
    sort_by: (sortModel[0]?.field as 'last_invoice_date' | 'avg_monthly_revenue' | undefined) ?? 'last_invoice_date',
    sort_dir: sortModel[0]?.sort ?? 'asc', // asc — paling lama dormant duluan
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
  });

  const tableColumns: GridColDef<CustomerRow>[] = [
    {
      field: 'company_name',
      headerName: t('dormantRate.colCompany'),
      minWidth: 150,
      flex: 0.7,
      sortable: false,
      valueGetter: (_v, row) => row.company.name,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.company.name}>
          {row.company.name || '-'}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: t('dormantRate.colCustomer'),
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.name}</Typography>
          {row.customer_code && (
            <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'last_invoice_date',
      headerName: t('dormantRate.colLastTransaction'),
      minWidth: 160,
      flex: 0.9,
      sortingOrder: ['asc', 'desc', null],
      valueFormatter: (v: string | null) => formatDateDDMMYYYY(v),
    },
    {
      field: '_months_dormant',
      headerName: t('dormantRate.colMonthsDormant'),
      minWidth: 170,
      flex: 0.8,
      sortable: false,
      valueGetter: (_v, row) => monthsDormant(row.last_invoice_date, endDate),
      renderCell: ({ row }) => {
        const months = monthsDormant(row.last_invoice_date, endDate);
        return (
          <Typography variant="body2" sx={{ fontWeight: months >= 6 ? 700 : 400, color: months >= 6 ? 'error.main' : undefined }}>
            {months}
          </Typography>
        );
      },
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('dormantRate.colAvgMonthlyRevenue'),
      minWidth: 170,
      flex: 0.9,
      sortingOrder: ['desc', 'asc', null],
      valueFormatter: (v: number) => fmtRp(v),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">{t('dormantRate.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('dormantRate.pageSubtitle')}</Typography>
      </Box>

      {/* ── Filter bar (template §1 ux-menu-mapping.md — GLOBAL apple-to-apple
          dgn Revenue, task025 lanjutan 2026-08-07) ── */}
      <KpiFilterBar
        filter={scopeFilter}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetExtra={() => {
          setPeriodType('quarter');
          setEndDate(todayStr);
        }}
      />

      {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
          KPI (2026-08-10), menggantikan KpiSummaryStrip. Dormant Rate =
          inverse polarity (naik = buruk). ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          label: dormantRateLabel,
          baselineValueText: `${comparisonDormantRate.toFixed(2)}%`,
          deltaValueText: `${Math.abs(currentDormantRate - comparisonDormantRate).toFixed(2)}%`,
          growthPct,
          inversePolarity: true,
        }]}
      />

      {/* ── 4 kartu — Total, Aktif, Dormant Ringan, Dormant Kronis (koreksi
          user 2026-08-10, opsi A). Total = fixed cohort (SAMA pola dgn
          template KPI4/KPI7), Aktif/Ringan/Kronis mem-partisi cohort itu
          persis (sum-nya SELALU total_customers). ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('dormantRate.totalCustomerLabel')}
            accentColor={theme.palette.primary.main}
            value={totalCurrent.toLocaleString('id-ID')}
            growthPct={totalGrowthPct}
            deltaValueText={Math.abs(totalCurrent - totalComparison).toLocaleString('id-ID')}
            comparisonValueText={totalComparison.toLocaleString('id-ID')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('dormantRate.activeCountLabel')}
            accentColor={theme.palette.success.main}
            value={activeCurrent.toLocaleString('id-ID')}
            growthPct={activeGrowthPct}
            deltaValueText={Math.abs(activeCurrent - activeComparison).toLocaleString('id-ID')}
            comparisonValueText={activeComparison.toLocaleString('id-ID')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('dormantRate.dormantLightLabel')}
            accentColor={theme.custom.data[1]}
            value={dormantLightCurrent.toLocaleString('id-ID')}
            caption={t('dormantRate.dormantLightCaption')}
            growthPct={dormantLightGrowthPct}
            deltaValueText={Math.abs(dormantLightCurrent - dormantLightComparison).toLocaleString('id-ID')}
            comparisonValueText={dormantLightComparison.toLocaleString('id-ID')}
            inversePolarity
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiMetricCard
            label={t('dormantRate.dormantSevereLabel')}
            accentColor={theme.palette.error.main}
            value={dormantSevereCurrent.toLocaleString('id-ID')}
            caption={t('dormantRate.dormantSevereCaption')}
            growthPct={dormantSevereGrowthPct}
            deltaValueText={Math.abs(dormantSevereCurrent - dormantSevereComparison).toLocaleString('id-ID')}
            comparisonValueText={dormantSevereComparison.toLocaleString('id-ID')}
            inversePolarity
          />
        </Grid>
      </Grid>

      {/* ── M8: 2 chart berdampingan — kiri: donut proporsi Aktif/Dormant
          Ringan/Dormant Kronis (koreksi user 2026-08-10, opsi A — sebelumnya
          cuma 2 slice Dormant vs Aktif, sekarang 3-way SAMA persis dgn 4
          kartu di atas, bukan breakdown per divisi — endpoint /customers
          server-side paginated jadi tidak bisa diagregasi penuh di client
          tanpa fetch semua baris), kanan: tren 12 bulan + red alert shading
          (SUDAH ada). Grid 3/12 & 9/12 — disamakan dgn grid 4-kartu di atas
          (md:3 tiap kartu), pola sama dgn KPI4/KPI7. ── */}
      <Box>
        <KpiSectionLabel
          label={t('dormantRate.m8SectionLabel')}
          formula={{
            title: t('dormantRate.m8FormulaTitle'),
            formula: t('dormantRate.m8Formula'),
            note: t('dormantRate.m8FormulaNote'),
          }}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <DonutChartWidget
                title={t('dormantRate.distChartTitle')}
                subtitle={t('dormantRate.distChartSubtitle')}
                data={[
                  { name: t('dormantRate.activeCountLabel'), value: activeCurrent, color: theme.palette.success.main },
                  { name: t('dormantRate.dormantLightLabel'), value: dormantLightCurrent, color: theme.custom.data[1] },
                  { name: t('dormantRate.dormantSevereLabel'), value: dormantSevereCurrent, color: theme.palette.error.main },
                ]}
                centerValue={`${currentDormantRate.toFixed(1)}%`}
                centerLabel={dormantRateLabel}
                height={280}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <LineAlertWidget
                title={t('dormantRate.m8ChartTitle')}
                subtitle={t('dormantRate.m8ChartSubtitle', { alertPct })}
                data={data?.trend ?? []}
                lineKey="dormant_rate"
                lineLabel={t('dormantRate.lineLabelDormantRate')}
                xKey="month"
                threshold={alertPct}
                thresholdLabel={t('dormantRate.thresholdLabelPct', { alertPct })}
                height={280}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Tabel — daftar pelanggan tidak aktif (KPI8), reuse endpoint
          /customers status=dormant. Server-side pagination/sort/search
          (bukan snapshot top-20 seperti KPI9 — daftar ini bisa ratusan
          baris). ── */}
      <Box>
        <KpiSectionLabel label={t('dormantRate.tableSectionLabel')} />
        <Card>
          <KpiTableToolbar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            searchPlaceholder={t('dormantRate.searchPlaceholder')}
            totalCountText={t('dormantRate.customerCountText', { count: customersData?.meta.total ?? 0 })}
          />
          <ResponsiveListView
            rows={(customersData?.data ?? []).map((row) => ({ ...row, id: row.id }))}
            columns={tableColumns}
            loading={isTableLoading}
            emptyMessage={t('dormantRate.emptyTable')}
            mobileFields={['name', 'company_name', 'last_invoice_date', '_months_dormant', 'avg_monthly_revenue']}
            rowCount={customersData?.meta.total ?? 0}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              setSortModel(model);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      </Box>
    </Box>
  );
}
