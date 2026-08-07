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
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card, Dialog } from '@/components/ui';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useCustomerProducts } from '@/hooks/useProducts';
import { formatIDR } from '@/utils/format';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Terjemahkan key item_type mentah ('unit'/'sparepart'/'consumable') ke label chip */
function relabelCategory(t: TFunction) {
  return (k: string) =>
    k === 'unit' ? t('crossSelling.chipUnit') : k === 'sparepart' ? t('crossSelling.chipSparepart') : k === 'consumable' ? t('crossSelling.chipConsumable') : k;
}

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

// ─── KPI Summary Card ─────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color = 'primary.main',
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrossSelling() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [periodEnd,  setPeriodEnd]  = useState(todayStr());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const latestTrend = data?.trend.at(-1);

  // ─── M2: tabel persisten (task025 lanjutan, 2026-08-07 — user: "tren
  // produk KPI M2 belum dikerjakan") — SEBELUMNYA dialog klik-titik-grafik
  // pakai endpoint TERPISAH (`useCrossSellingDetail`) padahal isinya
  // PERSIS SAMA dengan `useCrossSelling` utama (`getCrossSelling` dipanggil
  // 2x dgn period_end sama) — dihapus, `data.detail` dari hook utama
  // sudah cukup, tidak perlu query kedua yang redundan.
  const [m2Search, setM2Search] = useState('');
  const m2Rows = data?.detail ?? [];
  const filteredM2Rows = m2Search
    ? m2Rows.filter((r) =>
        r.customer_name.toLowerCase().includes(m2Search.toLowerCase())
        || (r.customer_code ?? '').toLowerCase().includes(m2Search.toLowerCase()))
    : m2Rows;

  // ─── M1.1 Drill-down (klik sel heatmap customer × kategori) ─────────────────
  const [productDrill, setProductDrill] = useState<{ customerId: number; customerName: string; itemType: string; itemLabel: string } | null>(null);
  const periodMonth = periodEnd.slice(0, 7);
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

  // ─── Desktop Table Columns (M2, tabel persisten) ────────────────────────────
  // minWidth+flex (bukan width tetap) — anti-truncation, konsisten dgn pola
  // yang sudah dipakai di semua tabel KPI lain sejak task025.
  const detailColumns: GridColDef[] = [
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
          {t('crossSelling.pageTitle')}
        </Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
          {t('crossSelling.subtitleWindow', { months: data?.period.active_months ?? '…' })}
        </Typography>
      </Box>

      {/* ── Filter bar (template §1 ux-menu-mapping.md — GLOBAL apple-to-apple
          dgn semua halaman KPI lain, task025 lanjutan 2026-08-07) ── */}
      <DateScopeFilterBar
        scopeFilter={scopeFilter}
        periodEnd={periodEnd}
        onPeriodEndChange={setPeriodEnd}
        onReset={() => {
          scopeFilter.reset();
          setPeriodEnd(todayStr());
        }}
      />

      {/* ── KPI Summary Cards ── */}
      {/* Cards 1 dan 4 dulu tampil sekaligus tapi selalu identik: backend menormalkan
          period_end ke akhir bulan supaya KPI1 dan titik terakhir trend pakai window
          yang sama persis (metrics.service.ts:52-57), jadi keduanya menghitung angka
          yang sama - redundan di UI. Card ke-4 (crossSellRateNowLabel) dihapus, sisakan
          3 KPI card. Laporan user 2026-07-23. */}
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
              sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, months: data?.period.active_months ?? '…' })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.activeCustomerLabel', { months: data?.period.active_months ?? '…' })}
              value={data?.kpi1.active_count ?? 0}
              sub={t('crossSelling.activeCustomerSub', { start: data?.period.start ?? '—', end: data?.period.end ?? '—' })}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
      </Grid>

      {/* ── M1: Cross Selling Ratio + Active Count Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.m1FullLabel')} />
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
      </Box>

      {/* ── M1.1: Heatmap — Customer × Product Category ── */}
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

      {/* ── M2: Avg Category per Customer Trend + Tabel Persisten ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title={t('crossSelling.m2ChartTitle')}
            subtitle={`${t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })}`}
            value={`${latestTrend?.avg_category ?? 0}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
            xKey="month"
            height={220}
          />
        )}
      </Box>

      {/* Tabel persisten (task025 lanjutan, 2026-08-07) — dari dialog
          klik-titik-grafik jadi persisten, bound ke `periodEnd` filter,
          bukan lagi query terpisah (`data.detail` dari hook utama sudah
          cukup, lihat komentar di `m2Rows` di atas). */}
      <Card>
        <KpiTableToolbar
          search={m2Search}
          onSearchChange={setM2Search}
          searchPlaceholder={t('crossSelling.m2SearchPlaceholder')}
          totalCountText={t('crossSelling.m2CustomerCountText', { count: filteredM2Rows.length })}
        />
        <ResponsiveListView
          rows={filteredM2Rows.map((r) => ({ ...r, id: r.customer_id }))}
          columns={detailColumns}
          loading={isLoading}
          emptyMessage={t('crossSelling.m2EmptyMessage')}
          mobileFields={['customer_name', 'category_count', 'total_revenue']}
          height={420}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>

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
