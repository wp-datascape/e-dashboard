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
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Card, Dialog } from '@/components/ui';
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
// KPI 1 — Cross-Selling Ratio (M1 + M1.1 Heatmap). Sebelumnya bundel 1 halaman
// dgn KPI2 (M2, Rata-rata jumlah produk yang dibeli) — user menegur:
// "halaman yang kamu kerjakan juga 1 page untuk 2 KPI yang harus dipisahkan
// itu menyalahi aturan" (task025 lanjutan, 2026-08-07). M2 dipindah ke
// halaman sendiri (`pages/AvgCategoryPerCustomer`), sama pola dgn
// Dormant/CustomerMetrics — endpoint backend TETAP 1 (`/metrics/
// cross-selling`, sudah gabung kpi1+kpi2+trend+heatmap+detail), permission
// TETAP `cross.selling:*` (reuse di kedua halaman, sama trade-off dgn
// Dormant §7a).
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

      {/* ── KPI Summary Cards (KPI1 saja — KPI2 pindah ke halaman sendiri) ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi1Label')}
              value={`${data?.kpi1.rate ?? 0}%`}
              sub={t('crossSelling.kpi1Sub', { multi: data?.kpi1.multi_cat_count ?? 0, active: data?.kpi1.active_count ?? 0 })}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
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
