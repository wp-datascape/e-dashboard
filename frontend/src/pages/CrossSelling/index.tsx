import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TFunction } from 'i18next';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Dialog } from '@/components/ui';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useCustomerProducts } from '@/hooks/useProducts';
import { formatIDR } from '@/utils/format';
import { useGlobalFilter } from '@/context/globalFilter.context';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, averageMonthsInRange } from '@/utils/analisisComparison';

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Terjemahkan key item_type mentah ('unit'/'sparepart'/'consumable') ke label chip */
function relabelCategory(t: TFunction) {
  return (k: string) =>
    k === 'unit' ? t('crossSelling.chipUnit') : k === 'sparepart' ? t('crossSelling.chipSparepart') : k === 'consumable' ? t('crossSelling.chipConsumable') : k;
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
// KPI 1 — Cross-Selling Ratio (M1 + M1.1 Heatmap). Sebelumnya bundel 1 halaman
// dgn KPI2 (M2, Rata-rata jumlah produk yang dibeli) — user menegur:
// "halaman yang kamu kerjakan juga 1 page untuk 2 KPI yang harus dipisahkan
// itu menyalahi aturan" (task025 §14). M2 dipindah ke halaman sendiri
// (`pages/AvgCategoryPerCustomer`), sama pola dgn Dormant/CustomerMetrics —
// endpoint backend TETAP 1 (`/metrics/cross-selling`), permission TETAP
// `cross.selling:*` (reuse di kedua halaman).
//
// Susulan (task025 §16, 2026-08-07) — user: "bukankah sudah jelas aku
// bilang template standar baru adalah seperti halaman revenue". Filter
// DateScopeFilterBar (tanpa YoY) diganti KpiFilterBar + banner
// KpiSummaryStrip YoY NYATA — dihitung dari 2x panggil `useCrossSelling`
// (endDate & `shiftDateByYears(endDate,-1)`), ambil scalar dari
// `trend.at(-1)?.ratio` — TIDAK perlu endpoint backend baru, trend-nya
// sudah 12-bulan rolling per titik waktu (persis trik yang sama dgn
// GP/HM/Expansion, task025 §12 susulan). `periodType` KpiFilterBar di sini
// COSMETIC saja (cuma mempengaruhi label rentang tanggal) — backend
// `/metrics/cross-selling` cuma terima `period_end`, sama seperti
// `useCustomerMetrics`.
export default function CrossSelling() {
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
  // trailing-N-by-posisi-array lagi — bug §8g/KPI4, ditemukan lagi 2026-08-10
  // di metrik lain lewat laporan user "reactivation rate di dashboard dan di
  // KPI tidak sama"), supaya dropdown Periode benar-benar mengubah angka
  // (task025 §18) DAN konsisten dgn Dashboard Overview (metrik yg sama).
  const currentRatio = averageMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.ratio);
  const comparisonRatio = averageMonthsInRange(comparisonData?.trend ?? [], shiftDateByYears(periodStart, -1), comparisonDate, (p) => p.ratio);
  const growthPct = computeChangePct(currentRatio, comparisonRatio);

  // ── 2 kartu — numerator/denominator dari ratio di atas (koreksi user
  // 2026-08-10: "section card belum ada", tidak boleh dilewatkan cuma krn
  // metrik ini ratio tunggal tanpa tier). YoY beneran (bukan snapshot) —
  // `total_active`/`multi_product` SUDAH ada per bulan di trend yang sama. ──
  const activeCurrent = averageMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.total_active);
  const activeComparison = averageMonthsInRange(comparisonData?.trend ?? [], shiftDateByYears(periodStart, -1), comparisonDate, (p) => p.total_active);
  const activeGrowthPct = computeChangePct(activeCurrent, activeComparison);
  const multiCurrent = averageMonthsInRange(data?.trend ?? [], periodStart, endDate, (p) => p.multi_product);
  const multiComparison = averageMonthsInRange(comparisonData?.trend ?? [], shiftDateByYears(periodStart, -1), comparisonDate, (p) => p.multi_product);
  const multiGrowthPct = computeChangePct(multiCurrent, multiComparison);

  // ── Chart "Periode Berjalan" — distribusi customer by jumlah kategori
  // dibeli (1/2/3+), dari referensi executive-kpi-dashboard/KPI1View.tsx
  // (koreksi user 2026-08-10, "@executive-kpi-dashboard/ ini adalah
  // referensi layout setiap KPI" — pola 2-chart grid-cols-2 50/50, chart
  // kiri = breakdown periode berjalan, kanan = tren 12 bulan yg sudah ada).
  // Dihitung dari data.heatmap (SUDAH ada, bukan endpoint baru) — jumlah
  // kategori per customer = berapa banyak values>0 di baris heatmap-nya.
  const categoryDistData = [{
    label: t('crossSelling.distLabel'),
    cat1: (data?.heatmap ?? []).filter((r) => Object.values(r.values).filter((v) => v > 0).length === 1).length,
    cat2: (data?.heatmap ?? []).filter((r) => Object.values(r.values).filter((v) => v > 0).length === 2).length,
    cat3plus: (data?.heatmap ?? []).filter((r) => Object.values(r.values).filter((v) => v > 0).length >= 3).length,
  }];

  // ─── M1.1 Drill-down (klik sel heatmap customer × kategori) ─────────────────
  const [productDrill, setProductDrill] = useState<{ customerId: number; customerName: string; itemType: string; itemLabel: string } | null>(null);
  const periodMonth = endDate.slice(0, 7);
  const activeWindow = data?.period.active_months ?? 1;
  const { data: productData, isLoading: productLoading } = useCustomerProducts(
    productDrill
      ? {
          company_id:    companyId,
          customer_id:   productDrill.customerId,
          item_type:     productDrill.itemType,
          branch_id:     branchId === 'all' ? undefined : branchId,
          division:      division || undefined,
          period_month:  periodMonth,
          active_window: activeWindow,
          exclude_intercompany: excludeIntercompany,
          per_page: 100,
        }
      : null,
  );

  const productColumns: GridColDef[] = [
    { field: 'product_name', headerName: t('crossSelling.m11ColProduct'), flex: 1, minWidth: 180, sortable: false },
    { field: 'total_revenue', headerName: t('crossSelling.m11ColRevenue'), width: 130, type: 'number', sortable: false, valueFormatter: (v: number) => formatIDR(v) },
    { field: 'total_gp', headerName: t('crossSelling.m11ColGp'), width: 120, type: 'number', sortable: false, valueFormatter: (v: number) => formatIDR(v) },
    { field: 'gp_margin_percent', headerName: t('crossSelling.m11ColMargin'), width: 90, sortable: false, renderCell: (p) => `${p.value}%` },
    { field: 'invoice_count', headerName: t('crossSelling.m11ColInvoice'), width: 90, type: 'number', sortable: false },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">
          {t('crossSelling.pageTitle')}
        </Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
          {t('crossSelling.subtitleWindow', { months: data?.period.active_months ?? '…' })}
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
        }}
      />

      {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
          KPI (2026-08-10, instruksi user "standar yang sama dari layout dan
          filtering", mengikuti pola CustomerGrossProfit/KPI4). Menggantikan
          KpiSummaryStrip (chevron prev/next dilepas — tidak ada di standar
          KPI4). ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          baselineValueText: `${comparisonRatio.toFixed(2)}%`,
          deltaValueText: `${Math.abs(currentRatio - comparisonRatio).toFixed(2)}%`,
          growthPct,
        }]}
      />

      {/* ── M1: 2 chart berdampingan (grid-cols-2 50/50, pola referensi
          executive-kpi-dashboard) — kiri: distribusi periode berjalan,
          kanan: tren 12 bulan (yang sudah ada sebelumnya). ── */}
          <Box>
            <SectionLabel label={t('crossSelling.m1FullLabel')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                {isLoading ? <Skeleton variant="rectangular" height={280} /> : (
                  <BarChartWidget
                    title={t('crossSelling.distChartTitle')}
                    subtitle={t('crossSelling.distChartSubtitle')}
                    data={categoryDistData}
                    series={[
                      { key: 'cat1', label: t('crossSelling.dist1Cat'), color: theme.custom.rank[2] },
                      { key: 'cat2', label: t('crossSelling.dist2Cat'), color: theme.custom.rank[1] },
                      { key: 'cat3plus', label: t('crossSelling.dist3PlusCat'), color: theme.custom.rank[0] },
                    ]}
                    xKey="label"
                    height={280}
                  />
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={280} />
                ) : (
                  <ComboChartWidget
                    title={t('crossSelling.chart1Title')}
                    subtitle={t('crossSelling.chart1Subtitle', { months: data?.period.active_months ?? '…' })}
                    data={data?.trend ?? []}
                    barKey="total_active"
                    barLabel={t('crossSelling.seriesActiveCustomers')}
                    barColor={theme.palette.text.secondary}
                    bar2Key="multi_product"
                    bar2Label={t('crossSelling.seriesMultiCategory')}
                    bar2Color={theme.palette.primary.main}
                    lineKey="ratio"
                    lineLabel={t('crossSelling.seriesCrossSellRateShort')}
                    lineColor={theme.palette.info.main}
                    formatLine={(v) => `${v}%`}
                    xKey="month"
                    height={280}
                  />
                )}
              </Grid>
            </Grid>
          </Box>

          {/* ── 2 kartu — Customer Aktif & Multi-Kategori (numerator/
              denominator dari Cross Selling Ratio), pola sama dgn 3 kartu
              tier KPI4. ── */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              {isLoading ? <Skeleton variant="rectangular" height={140} /> : (
                <KpiMetricCard
                  label={t('crossSelling.activeCustomerLabel', { months: data?.period.active_months ?? '…' })}
                  badgeLabel={t('crossSelling.seriesActiveCustomers')}
                  accentColor={theme.custom.data[0]}
                  value={String(data?.kpi1.active_count ?? 0)}
                  caption={t('crossSelling.activeCustomerSub', { start: data?.period.start ?? '—', end: data?.period.end ?? '—' })}
                  growthPct={activeGrowthPct}
                  deltaValueText={Math.abs(activeCurrent - activeComparison).toFixed(0)}
                  comparisonValueText={activeComparison.toFixed(0)}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {isLoading ? <Skeleton variant="rectangular" height={140} /> : (
                <KpiMetricCard
                  label={t('crossSelling.seriesMultiCategory')}
                  badgeLabel={t('crossSelling.chip2Plus')}
                  accentColor={theme.custom.data[1]}
                  value={String(data?.kpi1.multi_cat_count ?? 0)}
                  caption={t('crossSelling.activeCustomerSub', { start: data?.period.start ?? '—', end: data?.period.end ?? '—' })}
                  growthPct={multiGrowthPct}
                  deltaValueText={Math.abs(multiCurrent - multiComparison).toFixed(0)}
                  comparisonValueText={multiComparison.toFixed(0)}
                />
              )}
            </Grid>
          </Grid>

          {/* ── M1.1: Heatmap — Customer × Product Category ("tabel detail"
              KPI1 per task025 §3/§4) ── */}
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
                xLabels={(data?.categories ?? []).map(relabelCategory(t))}
                data={(data?.heatmap ?? []).map((row) => {
                  const relabel = relabelCategory(t);
                  return {
                    customer: row.customer,
                    customerId: row.customer_id,
                    values:   Object.fromEntries(Object.entries(row.values).map(([k, v]) => [relabel(k), v])),
                    revenues: Object.fromEntries(Object.entries(row.revenues).map(([k, v]) => [relabel(k), v])),
                    totalRevenue: row.total_revenue,
                  };
                })}
                onCellClick={(row, label) => {
                  const rawKey = (data?.categories ?? []).find((c) => relabelCategory(t)(c) === label);
                  if (!rawKey || row.customerId === undefined) return;
                  setProductDrill({ customerId: row.customerId, customerName: row.customer, itemType: rawKey, itemLabel: label });
                }}
              />
            )}
          </Box>

          {/* M1.1 Drill-down Dialog — detail produk per customer × kategori yang diklik di heatmap */}
          <Dialog
            open={!!productDrill}
            onClose={() => setProductDrill(null)}
            maxWidth="md"
            title={`${productDrill?.customerName ?? '—'} · ${productDrill?.itemLabel ?? ''}`}
            showCloseButton
            contentSx={{ p: 1 }}
            subtitle={
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {t('crossSelling.m11DialogSubtitle', { window: activeWindow })}
              </Typography>
            }
          >
            <ResponsiveListView
              rows={(productData?.data ?? []).map((r) => ({ ...r, id: r.product_id }))}
              columns={productColumns}
              loading={productLoading}
              height={420}
              pageSize={25}
              pageSizeOptions={[25, 50, 100]}
              emptyMessage={t('crossSelling.m11EmptyMessage')}
              mobileFields={['product_name', 'total_revenue', 'gp_margin_percent']}
            />
          </Dialog>
    </Box>
  );
}
