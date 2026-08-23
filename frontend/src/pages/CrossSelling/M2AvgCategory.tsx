import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import CategoryIcon from '@mui/icons-material/Category';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { GridColDef } from '@mui/x-data-grid';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog, Card } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { useCrossSelling, useCrossSellingDetail } from '@/hooks/useMetrics';
import type { CrossSellingData } from '@/types/metrics';
import { SectionLabel, KpiCard } from './HelperComponents';
import { formatRupiah } from '@/utils/format';
import { formatDateID } from '@/utils/date';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodLabelShort,
  getCurrentPeriodKey, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday,
  buildDrilldownPeriodParams, getMomComparisonPeriodEnd,
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
//
// Susulan (2026-08-22, koreksi user: "terlalu kotor jika chart digabung
// dengan tabel") — `<BreakdownTable>` DIPINDAH ke Laporan > Growth
// (`pages/Report/Growth/index.tsx`), sama seperti M1CrossSelling.tsx.
// Dialog klik-titik per-bulan TIDAK berubah, tetap ada di sini.
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
  const navigate = useNavigate();

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

  // Fetch MoM (task029.md §31, 2026-08-23) — sama persis M1CrossSelling.tsx,
  // basis pembanding Top 5 diganti dari YoY ke periode langsung sebelumnya.
  // `yoyData` di atas TETAP dipertahankan (masih dipakai KpiHeader).
  const { data: momData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: getMomComparisonPeriodEnd(periodType, periodEnd),
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // ─── Drill-down (klik titik grafik avg-category) ────────────────────────
  const [drillDate, setDrillDate] = useState<string | null>(null);
  // periodParams dirakit SATU tempat pusat (buildDrilldownPeriodParams,
  // utils/analisisPeriod.ts) dari state filter halaman (periodType/periodEnd/
  // applyDateCutoff) — bukan diturunkan ulang di sini (2026-08-23, koreksi
  // user soal duplikasi logic filter per fungsi).
  const drilldownPeriodParams = buildDrilldownPeriodParams(periodType, periodEnd, applyDateCutoff);
  const { data: drillData, isLoading: drillLoading } = useCrossSellingDetail({
    period_end: drillDate,
    periodParams: drilldownPeriodParams,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // Kolom Kode Pelanggan (customer_code) DIHAPUS dari tabel drilldown ini
  // (2026-08-23, permintaan user, susulan §M1CrossSelling.tsx yang sudah
  // lebih dulu dihapus — nilai kode ini sering NULL/tidak berarti bagi user).
  const detailColumns: GridColDef[] = [
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

  // Icon tren (2026-08-22, instruksi user "buat layout seperti diatas" —
  // REUSE pola persis M1CrossSelling.tsx: yoyByCustomer/crossSellStatus,
  // category_count vs yoyData, sama definisi dgn tabel Breakdown).
  //
  // Basisnya MoM sekarang (2026-08-23, task029.md §31), baca `momData`.
  const momCategoryCountByCustomer = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of momData?.detail ?? []) map.set(r.customer_id, r.category_count);
    return map;
  }, [momData?.detail]);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Susulan (2026-08-22, instruksi user: "sekarang lanjut ke rata
            rata kategori produk per pelanggan, buat layout seperti
            diatas") — pola SAMA PERSIS M1CrossSelling.tsx final (§30.23-
            30.25): (1) 3 KPI card di atas Card utama, (2) header Card cuma
            judul (Divider dihapus), (3) KpiHeader dipindah jadi
            `headerContent` DI DALAM ComboChartWidget (bukan sibling di
            luar container-nya), (4) Top 5 Customers pindah jadi kolom
            timeline di samping chart (grid 7fr/3fr, dot+garis, chip bulat
            trend), BUKAN card/list terpisah di bawah lagi. SummaryCard
            grid 2x2 + mini AreaChartWidget (section lama) DIHAPUS TOTAL —
            sudah dicover kartu KPI di atas + Top 5 di samping chart. */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('crossSelling.kpi1Label')}
                value={`${data?.kpi1.rate ?? 0}%`}
                sub={t('crossSelling.kpi1Sub', { multi: data?.kpi1.multi_cat_count ?? 0, active: data?.kpi1.active_count ?? 0 })}
                color={theme.palette.primary.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('crossSelling.kpi2Label')}
                value={data?.kpi2.avg_categories ?? 0}
                sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, unit: periodUnit })}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
              <KpiCard
                label={t('crossSelling.activeCustomerLabel')}
                value={data?.kpi1.active_count ?? 0}
                sub={t('crossSelling.activeCustomerSub', {
                  start: data?.period.start ? formatDateID(data.period.start) : '—',
                  end: data?.period.end ? formatDateID(data.period.end) : '—',
                })}
                color={theme.palette.success.main}
              />
            )}
          </Grid>
        </Grid>

        <Card>
          <Box sx={{ p: 2.5 }}>
            {/* CTA chip "Klik bar untuk detail per customer" (2026-08-23,
                instruksi user: "lakukan hal yang sama untuk rata rata
                kategory cart" — susulan M7) — pola sama persis heatmap M1/
                M7: StatusChip icon={TouchAppIcon} color="info", pojok kanan
                atas baris judul, dipindah dari caption chart (dulu ikut
                nempel di kalimat subtitle) supaya lebih ter-notice.

                Info tooltip (susulan sama hari, instruksi user: "tambahkan
                info tooltip untuk cart rata rata kategory, dan hapus teks
                dibawah legen") — pola sama persis judul chart utama M1
                (MuiTooltip+IconButton+InfoOutlinedIcon di sebelah
                SectionLabel), teks penjelasan (`m2ChartSubtitle`) PINDAH
                dari caption di BAWAH chart (dihapus, lihat prop `caption`
                ComboChartWidget di bawah) jadi isi tooltip ini. */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SectionLabel label={t('crossSelling.labelM2')} icon={CategoryIcon} />
                <MuiTooltip
                  title={t('crossSelling.m2ChartSubtitle')}
                  placement="top"
                  arrow
                  slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
                >
                  <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </MuiTooltip>
              </Box>
              <StatusChip icon={<TouchAppIcon />} label={t('crossSelling.m2ChartHint')} color="info" />
            </Box>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {/* CSS Grid manual (sx display:'grid') DIGANTI komponen `<Grid>`
                MUI (2026-08-24, instruksi user: "gabisa pakai grid col
                responsive? pakai context7" — dicek dokumentasi resmi MUI,
                pola `<Grid container><Grid size={{xs,md}}>` sudah dipakai
                konsisten di seluruh proyek ini, BUKAN CSS Grid tulisan
                tangan via sx yang berulang kali bermasalah di mobile). */}
            <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={360} />
            ) : (
              <ComboChartWidget
                headerContent={
                  <KpiHeader
                    current={data?.kpi2.avg_categories ?? 0}
                    yoy={yoyData?.kpi2.avg_categories ?? 0}
                    kpiType="value"
                    formatValue={(v) => v.toFixed(2)}
                    currentPeriodLabel={currentPeriodLabel}
                    comparisonLabel={yoyComparisonLabel}
                  />
                }
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
                onBarClick={(d) => {
                  const month = String(d.month ?? '');
                  setDrillDate(clampPeriodEndToToday(periodType, month, getPeriodDateRange(periodType, month).end));
                }}
              />
            )}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('crossSelling.m2OverviewTopCustomersLabel')} />
                    <MuiTooltip
                      title={t('crossSelling.topCustomersComparisonInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  {overviewTopCustomers.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('crossSelling.m2EmptyMessage')}</Typography>
                  ) : (
                    overviewTopCustomers.map((r, i) => {
                      const isLast = i === overviewTopCustomers.length - 1;
                      const momCategoryCount = momCategoryCountByCustomer.get(r.customer_id);
                      const trendDirection: 'up' | 'down' | 'flat' =
                        momCategoryCount == null || r.category_count > momCategoryCount ? 'up'
                          : r.category_count < momCategoryCount ? 'down' : 'flat';
                      const TrendIcon = trendDirection === 'up' ? TrendingUpIcon : trendDirection === 'down' ? TrendingDownIcon : TrendingFlatIcon;
                      const trendColor = trendDirection === 'up' ? theme.palette.success.main : trendDirection === 'down' ? theme.palette.error.main : theme.palette.text.disabled;
                      return (
                        <Box key={r.customer_id} sx={{ display: 'flex', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, mt: 0.5 }} />
                            {!isLast && <Box sx={{ flex: 1, width: '2px', bgcolor: 'divider', my: 0.5 }} />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, pb: isLast ? 0.5 : 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                              {i + 1}. {r.customer_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
                              {r.category_count} {t('crossSelling.m2CategoryCountSuffix')}
                            </Typography>
                            <Box
                              sx={{
                                width: 22, height: 22, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: alpha(trendColor, 0.15), flexShrink: 0,
                              }}
                            >
                              <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
                            </Box>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                  <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-end', md: 'flex-start' }, mt: 1 }}>
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      onClick={() => navigate('/report/growth?tab=cross_selling')}
                      sx={{ textTransform: 'none', fontSize: 12 }}
                    >
                      {t('crossSelling.viewDetailInReport')}
                    </Button>
                  </Box>
                </>
              )}
            </Grid>
            </Grid>
          </Box>
        </Card>
      </Box>

      {/* M2 Drill-down Dialog — detail per customer bulan yang diklik (fitur
          M2-only, dikembalikan setelah bug klik-nya diperbaiki di
          AreaChartWidget.tsx) */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('crossSelling.m2DialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Susulan (2026-08-23, koreksi user: "pisahkan judul dan periode" —
        // dulu period digabung ke title via em-dash. Standar layout drilldown
        // SEKARANG: title = nama entitas doang, subtitle baris pertama =
        // rentang tanggal SEBENARNYA yang dipakai query (bukan cuma nama
        // periode), pola sama persis dialog drill-down M1.1 (heatmap cell) —
        // reuse key `m11DialogSubtitle` yang sama, jadi standar di semua
        // dialog drilldown, bukan duplikasi teks per KPI.
        subtitle={drillData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.m11DialogSubtitle', {
                start: formatDateID(drillData.period.start),
                end: formatDateID(drillData.period.end),
              })}
            </Typography>
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
