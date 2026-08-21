import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TooltipContentProps } from 'recharts';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TrendSummary } from '@/components/dashboard/TrendSummary';
import { useCustomerProducts } from '@/hooks/useProducts';
import { useCrossSelling } from '@/hooks/useMetrics';
import { formatRupiah } from '@/utils/format';
import { formatDateID } from '@/utils/date';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodLabelShort,
  getCurrentPeriodKey, getYoyPeriodKey,
} from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import type { CrossSellingData, CrossSellingTrendPoint } from '@/types/metrics';
import { SectionLabel, SummaryCard } from './HelperComponents';
import { BreakdownTable } from './BreakdownTable';
import { relabelCategory } from './helpers';

// M1 (Cross Selling Ratio, task029.md §8.1 + §28) — restrukturisasi
// 2026-08-21 (permintaan user, KHUSUS M1 — KPI lain TETAP pakai pola
// Analysis/Breakdown §28, TIDAK di-supersede): dari 2 tab (Analysis/
// Breakdown) jadi 3 sub-tab:
//   Overview      — mini trend chart + top 10 customer by category count
//                   (ringkasan cepat, bukan fetch baru — subset data.trend/
//                   data.detail yang SUDAH ada).
//   Trend Analysis — chart tren penuh (sama seperti Analysis lama) + tabel
//                   Breakdown penuh (sama seperti Breakdown lama, sekarang
//                   digabung 1 tab).
//   Heatmap        — M1.1 heatmap Customer × Product Category, sekarang
//                   tab sendiri (dulu nempel di bawah trend chart di
//                   Analysis).
// KPI Header (current/YoY/change) TETAP selalu tampil DI ATAS ketiga
// sub-tab (bukan pindah ke dalam Overview) — keputusan eksplisit user.
//
// Chart UTAMA (bar Active/Multi-Category + line Cross Sell Rate) TIDAK
// diubah — koreksi user 2026-08-19: kombinasi ini sudah penuhi prinsip
// §28.4 (line = trend KPI-nya), bar cuma konteks volume tambahan, bukan
// alasan buat diganti ke Line/Area murni. Dipakai ulang di versi mini
// (Overview) DAN penuh (Trend Analysis), cuma beda height.
//
// Tabel Breakdown pakai data.detail (SUDAH ada dari fetch utama, tidak
// perlu fetch baru). SEMUA kolom §28.10 SUDAH lengkap (2026-08-21): Branch/
// Division/Channel dari invoice terbaru customer DI DALAM periode
// (`fetchCrossSellingDetail`, backend), YoY Category Count/Category
// Change/Revenue YoY/Cross Sell Status dari `yoyData` yang SUDAH di-fetch
// (period_end -1 tahun, awalnya cuma buat KpiHeader) — TIDAK perlu fetch
// baru lagi. Kolom ID Pelanggan (customer_code) DIHAPUS dari tabel ini
// (permintaan user) — field-nya TETAP ada di data (dipakai search), cuma
// tidak ditampilkan sbg kolom; M2 (`M2AvgCategory.tsx`) py tabel sendiri,
// TIDAK disentuh, masih tampilkan customer_code.
function M1Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CrossSellingTrendPoint;
  const singleCategory = d.total_active - d.multi_product;

  return (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, p: 1.5, minWidth: 230, fontSize: 12 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {t('crossSelling.m1TooltipTitle', { month: d.month })}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipCrossSellingCustomers')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.multi_product}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipSingleCategory')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{singleCategory}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipExistingCustomers')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.total_active}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipCrossSellRate')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.ratio.toFixed(1)}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipAvgCategories')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.avg_category.toFixed(2)}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

interface Props {
  data: CrossSellingData | undefined;
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  periodEnd: string;
  /** Granularitas trend/KPI Header (task029.md §30, 2026-08-20) — default 'monthly'
   * kalau caller belum kirim (Retention/Value masih pola lama, cuma Growth/M1 yang
   * sudah wired ke filter Granularitas). */
  periodType?: PeriodGranularity;
  /** Mode "Apply date cutoff" (task029.md §30, 2026-08-20) — SEMUA titik trend
   * dipotong ke hari yang sama, bukan cuma titik yang sedang berjalan. Diteruskan
   * ke fetch YoY di bawah juga, biar KpiHeader current & pembanding tetap sinkron
   * (kalau OFF, pembanding pakai default clampToElapsedEnd seperti biasa). */
  applyDateCutoff?: boolean;
  excludeIntercompany?: boolean;
}

export function M1CrossSelling({ data, isLoading, companyId, branchId, division, periodEnd, periodType = 'monthly', applyDateCutoff = false, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const periodMonth = periodEnd.slice(0, 7);
  const activeWindow = data?.period.active_months ?? 1;

  // periodEnd diparse manual (BUKAN `new Date(periodEnd)`) — komponen Date
  // lokal eksplisit (y,m,d), hindari pergeseran timezone dari parse string
  // ISO (pola sama dgn backend metrics.service.ts). periodKey/yoyPeriodKey
  // dipakai utk label — nilai AKTUAL yang benar-benar dipakai backend tetap
  // `data.period.key` (echo dari response), ini cuma buat YoY comparisonLabel
  // sebelum data YoY datang.
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  const yoyPeriodKey = getYoyPeriodKey(periodType, periodKey);
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  // Label periode SEKARANG eksplisit (koreksi user 2026-08-21: "jangan
  // pakai periode ini, harus keterangan eksplisit" — KpiHeader dulu pakai
  // teks generik "periode ini", sekarang label periode BENERAN, mis.
  // "Kuartal 3 Tahun 2026", pola sama dgn yoyComparisonLabel).
  const currentPeriodLabel = formatPeriodLabel(periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(periodType, yoyPeriodKey);
  const periodUnit = t(`dashboard.periodUnit.${periodType}`);

  // Header Current/YoY/Change (task029.md §28.2) — fetch terpisah, endpoint
  // sama cuma period_end digeser -1 tahun (pola sama dgn drill-down dialog).
  // period_type diteruskan juga (§30) — backend independen menghitung
  // periodKey-nya sendiri dari periode_end yang sudah digeser, otomatis
  // menghasilkan "Q3 2025" kalau current-nya "Q3 2026", dst.
  const { data: yoyData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const [tab, setTab] = useState<'overview' | 'trend' | 'heatmap'>('overview');

  // ─── M1.1 Drill-down (klik sel heatmap customer × kategori) ─────────────────
  const [productDrill, setProductDrill] = useState<{ customerId: number; customerName: string; itemType: string; itemLabel: string } | null>(null);
  const { data: productData, isLoading: productLoading } = useCustomerProducts(
    productDrill
      ? {
          company_id:    companyId,
          customer_id:   productDrill.customerId,
          item_type:     productDrill.itemType,
          branch_id:     branchId,
          division,
          period_month:  periodMonth,
          active_window: activeWindow,
          exclude_intercompany: excludeIntercompany,
          per_page: 100,
        }
      : null,
  );

  const productColumns: GridColDef[] = [
    { field: 'product_name', headerName: t('crossSelling.m11ColProduct'), flex: 1, minWidth: 180, sortable: false },
    { field: 'total_revenue', headerName: t('crossSelling.m11ColRevenue'), width: 130, type: 'number', sortable: false, valueFormatter: (v: number) => formatRupiah(v) },
    { field: 'total_gp', headerName: t('crossSelling.m11ColGp'), width: 120, type: 'number', sortable: false, valueFormatter: (v: number) => formatRupiah(v) },
    { field: 'gp_margin_percent', headerName: t('crossSelling.m11ColMargin'), width: 90, sortable: false, renderCell: (p) => `${p.value}%` },
    { field: 'invoice_count', headerName: t('crossSelling.m11ColInvoice'), width: 90, type: 'number', sortable: false },
  ];

  // Tabel Breakdown (task029.md §28.10) DIPINDAH ke komponen shared
  // `BreakdownTable.tsx` (2026-08-21) — dipakai M1 DAN M2 sekarang ("M1
  // jadi standar layout default"), bukan kode lokal per halaman lagi.

  // Overview tab — top 5 customer by TOTAL REVENUE (koreksi user 2026-08-21,
  // dari top 10 by category count -> top 10 by revenue -> top 5 by revenue).
  // SELALU top-5-by-revenue, TIDAK ikut breakdownSearch/Sort (state itu
  // punya Trend Analysis tab) — subset data.detail yang SUDAH ada, bukan
  // fetch baru. List view sederhana (BUKAN ResponsiveListView/DataGrid,
  // permintaan user) — rank + nama + revenue saja, detail lengkap (category
  // count, per-tipe produk) tetap di tabel Breakdown penuh (Trend Analysis).
  const overviewTopCustomers = useMemo(
    () => [...(data?.detail ?? [])].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5),
    [data?.detail],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <SectionLabel label={t('crossSelling.m1FullLabel', { unit: periodUnit })} icon={SwapHorizIcon} />
        <MuiTooltip
          title={t('crossSelling.chart1Subtitle', { unit: periodUnit })}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>

      {isLoading ? (
        <Skeleton variant="rectangular" height={80} />
      ) : (
        <KpiHeader
          metricLabel={t('crossSelling.seriesCrossSellRateShort')}
          current={data?.kpi1.rate ?? 0}
          yoy={yoyData?.kpi1.rate ?? 0}
          kpiType="rate"
          currentPeriodLabel={currentPeriodLabel}
          comparisonLabel={yoyComparisonLabel}
        />
      )}

      {/* sx eksplisit: pastikan cuma underline indicator standar, TIDAK ada
          fill/background di tab aktif (temuan review UX user 2026-08-19:
          "tab ANALYSIS terlihat seperti tombol") — walau default MUI Tab
          sebenarnya sudah begini (tanpa override tema MuiTab di app ini),
          dipertegas eksplisit di sini spy tidak ambigu. */}
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
        <Tab value="overview" label={t('crossSelling.m1TabOverview')} sx={{ minHeight: 36, py: 0.5 }} />
        <Tab value="trend" label={t('crossSelling.m1TabTrendAnalysis')} sx={{ minHeight: 36, py: 0.5 }} />
        <Tab value="heatmap" label={t('crossSelling.m1TabHeatmap')} sx={{ minHeight: 36, py: 0.5 }} />
      </Tabs>

      {tab === 'overview' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Section atas — 2 kolom: kiri 4 Summary Cards (grid 2x2), kanan
              grafik line sederhana (koreksi user 2026-08-21, layout awal 1
              kolom vertikal diganti 2 kolom). Wrap di layar sempit (mobile). */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={168} />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, height: '100%' }}>
                  <SummaryCard label={t('crossSelling.seriesCrossSellRateShort')} value={`${(data?.kpi1.rate ?? 0).toFixed(1)}%`} />
                  <SummaryCard label={t('crossSelling.seriesActiveCustomers')} value={(data?.kpi1.active_count ?? 0).toLocaleString('id-ID')} />
                  <SummaryCard label={t('crossSelling.seriesMultiCategory')} value={(data?.kpi1.multi_cat_count ?? 0).toLocaleString('id-ID')} />
                  <SummaryCard label={t('crossSelling.seriesAvgCategory')} value={(data?.kpi2.avg_categories ?? 0).toFixed(2)} />
                </Box>
              )}
            </Box>

            <Box sx={{ flex: '1 1 300px' }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={168} />
              ) : (
                <AreaChartWidget
                  title={t('crossSelling.m1OverviewChartTitle', { unit: periodUnit })}
                  subtitle={t('crossSelling.seriesCrossSellRateShort')}
                  data={data?.trend ?? []}
                  series={[{ key: 'ratio', label: t('crossSelling.seriesCrossSellRateShort'), color: theme.palette.info.main }]}
                  xKey="month"
                  height={120}
                  xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
                  yAxisFormatter={(v) => `${v}%`}
                />
              )}
            </Box>
          </Box>

          {/* Section bawah — list view sederhana (BUKAN tabel/DataGrid), Top 10
              customer by TOTAL REVENUE (koreksi user 2026-08-21, sebelumnya by
              category count). */}
          <Box>
            <SectionLabel label={t('crossSelling.m1OverviewTopCustomersLabel')} />
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
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatRupiah(r.total_revenue)}</Typography>
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
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <>
                <ComboChartWidget
                  title={t('crossSelling.chart1TitleShort', { unit: periodUnit })}
                  subtitle={t('crossSelling.chart1SubtitleShort')}
                  data={data?.trend ?? []}
                  barKey="total_active"
                  barLabel={t('crossSelling.seriesActiveCustomers')}
                  barColor={theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.30)'}
                  bar2Key="multi_product"
                  bar2Label={t('crossSelling.seriesMultiCategory')}
                  bar2Color={theme.palette.primary.main}
                  lineKey="ratio"
                  lineLabel={t('crossSelling.seriesCrossSellRateShort')}
                  lineColor={theme.palette.info.main}
                  formatLine={(v) => `${v}%`}
                  xKey="month"
                  height={280}
                  xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
                  renderTooltip={(props) => <M1Tooltip {...props} />}
                />
                <TrendSummary
                  metricLabel={t('crossSelling.seriesCrossSellRateShort')}
                  data={data?.trend ?? []}
                  accessor={(r) => r.ratio}
                  labelAccessor={(r) => r.month}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  unit={periodUnit}
                />
              </>
            )}
          </Box>

          <BreakdownTable data={data} yoyData={yoyData} isLoading={isLoading} />
        </Box>
      )}

      {/* M1.1: Heatmap — Customer × Product Category, sekarang tab sendiri
          (dulu nempel di bawah trend chart di tab Analysis lama). */}
      {tab === 'heatmap' && (
        <Box sx={{ pt: 1 }}>
          {/* Judul + periode HANYA di sini (SectionLabel) — title internal
              HeatmapWidget SENGAJA tidak diisi lagi (koreksi user 2026-08-21:
              "tampilan terlalu sesak", "sepertinya harus dihapus salah satu
              karena sepertinya duplikat" — dulu widget py title sendiri
              "Matriks Cross Selling Pelanggan (periode)" yang isinya dobel
              persis dgn baris ini). Tanggal via formatDateID (util,
              DD-MM-YYYY) — sebelumnya raw ISO string "2026-08-01" tanpa
              format. "Top 8 kategori" yang dulu ada di helper text DIHAPUS —
              tidak pernah akurat (jumlah kategori dinamis per company, 4-6+,
              tidak ada cap "8" sama sekali di backend), chip di bawah ini
              SUDAH tampilkan jumlah kategori yang benar. */}
          <SectionLabel label={t('crossSelling.labelM11')} icon={GridOnIcon} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.heatmapHelperText', {
                start: data?.period.start ? formatDateID(data.period.start) : '…',
                end: data?.period.end ? formatDateID(data.period.end) : '…',
              })}
            </Typography>
            {data?.categories && data.categories.length > 0 && (
              <Chip label={t('crossSelling.categoriesCountChip', { count: data.categories.length })} size="small" variant="outlined" />
            )}
          </Box>
          {isLoading ? (
            <Skeleton variant="rectangular" height={420} />
          ) : (
            <HeatmapWidget
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
      )}

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
