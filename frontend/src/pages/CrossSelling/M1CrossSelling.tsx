import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TooltipContentProps } from 'recharts';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Dialog } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TrendSummary } from '@/components/dashboard/TrendSummary';
import { useCustomerProducts } from '@/hooks/useProducts';
import { useCrossSelling } from '@/hooks/useMetrics';
import { formatIDR } from '@/utils/format';
import { shiftDateByYears } from '@/utils/analisisPeriod';
import type { CrossSellingData, CrossSellingTrendPoint } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';
import { relabelCategory } from './helpers';

// M1 (Cross Selling Ratio, task029.md §8.1 + §28) — struktur Header/
// Analysis/Breakdown final (2026-08-19). M1.1 (heatmap Customer x Product
// Category — bonus visualization, bukan bagian §8.1, tapi sudah ada &
// berguna) tetap di Analysis tab, di bawah trend summary.
//
// Chart UTAMA (bar Active/Multi-Category + line Cross Sell Rate) TIDAK
// diubah — koreksi user 2026-08-19: kombinasi ini sudah penuhi prinsip
// §28.4 (line = trend KPI-nya), bar cuma konteks volume tambahan, bukan
// alasan buat diganti ke Line/Area murni.
//
// Breakdown tab pakai data.detail (SUDAH ada dari fetch utama, tidak perlu
// fetch baru) — tapi kolom Branch/Division/Channel/YoY Category Count/
// Category Change/Revenue YoY/Cross Sell Status (task029.md §28.10) BELUM
// tersedia (butuh perubahan backend), dicatat jujur via m1BreakdownNote,
// bukan diisi data palsu.
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
  excludeIntercompany?: boolean;
}

export function M1CrossSelling({ data, isLoading, companyId, branchId, division, periodEnd, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const periodMonth = periodEnd.slice(0, 7);
  const activeWindow = data?.period.active_months ?? 1;

  // Header Current/YoY/Change (task029.md §28.2) — fetch terpisah, endpoint
  // sama cuma period_end digeser -1 tahun (pola sama dgn drill-down dialog).
  const { data: yoyData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: shiftDateByYears(periodEnd, -1),
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const [tab, setTab] = useState<'analysis' | 'breakdown'>('analysis');

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
    { field: 'total_revenue', headerName: t('crossSelling.m11ColRevenue'), width: 130, type: 'number', sortable: false, valueFormatter: (v: number) => formatIDR(v) },
    { field: 'total_gp', headerName: t('crossSelling.m11ColGp'), width: 120, type: 'number', sortable: false, valueFormatter: (v: number) => formatIDR(v) },
    { field: 'gp_margin_percent', headerName: t('crossSelling.m11ColMargin'), width: 90, sortable: false, renderCell: (p) => `${p.value}%` },
    { field: 'invoice_count', headerName: t('crossSelling.m11ColInvoice'), width: 90, type: 'number', sortable: false },
  ];

  // Breakdown tab (task029.md §28.10) — pakai data.detail yg SUDAH ada dari
  // fetch utama (bukan fetch baru). Cuma kolom yg datanya beneran ada.
  const breakdownColumns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), width: 130 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1, minWidth: 180 },
    { field: 'category_count', headerName: t('crossSelling.colCurrentCategoryCount'), width: 130, type: 'number' },
    { field: 'total_revenue', headerName: t('crossSelling.colTotalRevenue'), width: 160, type: 'number', valueFormatter: (v: number) => formatIDR(v) },
  ];

  // Table Filter (task029.md §28.9/§24) — Search + Sort, di atas TABLE,
  // BEDA dari Global Filter (Company/Branch/Division/Channel/Period, di
  // luar komponen ini). Client-side saja, data.detail sudah full di tangan
  // (bukan server-side search, tidak ada endpoint baru). "Status" filter
  // (§28.9 contoh) belum dipasang — Cross Sell Status butuh data YoY yg
  // sama belum-tersedia-nya dgn kolom breakdown lain, lihat m1BreakdownNote.
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [breakdownSort, setBreakdownSort] = useState<'name' | 'category_desc' | 'revenue_desc'>('name');

  const breakdownRows = useMemo(() => {
    const rows = data?.detail ?? [];
    const q = breakdownSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered];
    if (breakdownSort === 'category_desc') sorted.sort((a, b) => b.category_count - a.category_count);
    else if (breakdownSort === 'revenue_desc') sorted.sort((a, b) => b.total_revenue - a.total_revenue);
    else sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    return sorted;
  }, [data?.detail, breakdownSearch, breakdownSort]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <SectionLabel label={t('crossSelling.m1FullLabel')} />

      {isLoading ? (
        <Skeleton variant="rectangular" height={80} />
      ) : (
        <KpiHeader
          current={data?.kpi1.rate ?? 0}
          yoy={yoyData?.kpi1.rate ?? 0}
          kpiType="rate"
        />
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="analysis" label={t('crossSelling.m1TabAnalysis')} sx={{ minHeight: 36, py: 0.5 }} />
        <Tab value="breakdown" label={t('crossSelling.m1TabBreakdown')} sx={{ minHeight: 36, py: 0.5 }} />
      </Tabs>

      {tab === 'analysis' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Box>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <>
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
                  renderTooltip={(props) => <M1Tooltip {...props} />}
                />
                <TrendSummary
                  data={data?.trend ?? []}
                  accessor={(r) => r.ratio}
                  labelAccessor={(r) => r.month}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              </>
            )}
          </Box>

          {/* ── M1.1: Heatmap — Customer × Product Category (bonus, tetap di Analysis) ── */}
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
        </Box>
      )}

      {tab === 'breakdown' && (
        <Box sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {t('crossSelling.m1BreakdownNote')}
          </Typography>

          {/* Table Filter (§28.7/§28.9) — Search + Sort, di atas table */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
            <TextField
              size="small"
              placeholder={t('crossSelling.m1SearchPlaceholder')}
              value={breakdownSearch}
              onChange={(e) => setBreakdownSearch(e.target.value)}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />
            <TextField
              select
              size="small"
              label={t('crossSelling.m1SortLabel')}
              value={breakdownSort}
              onChange={(e) => setBreakdownSort(e.target.value as typeof breakdownSort)}
              sx={{ width: { xs: '100%', sm: 200 } }}
            >
              <MenuItem value="name">{t('crossSelling.m1SortName')}</MenuItem>
              <MenuItem value="category_desc">{t('crossSelling.m1SortCategoryDesc')}</MenuItem>
              <MenuItem value="revenue_desc">{t('crossSelling.m1SortRevenueDesc')}</MenuItem>
            </TextField>
          </Box>

          <ResponsiveListView
            rows={breakdownRows.map((r) => ({ ...r, id: r.customer_id }))}
            columns={breakdownColumns}
            loading={isLoading}
            height={480}
            pageSize={25}
            pageSizeOptions={[25, 50, 100]}
            emptyMessage={t('crossSelling.m2EmptyMessage')}
            mobileFields={['customer_name', 'category_count', 'total_revenue']}
          />
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
