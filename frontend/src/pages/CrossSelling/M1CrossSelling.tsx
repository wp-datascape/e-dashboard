import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Dialog } from '@/components/ui';
import { useCustomerProducts } from '@/hooks/useProducts';
import { formatIDR } from '@/utils/format';
import type { CrossSellingData } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';
import { relabelCategory } from './helpers';

// M1 (Cross Selling Ratio, task029.md §8.1) + M1.1 (heatmap Customer x
// Product Category — bonus visualization, bukan bagian §8.1, tapi sudah
// ada & berguna, tetap dipertahankan). Diekstrak dari CrossSelling/index.tsx
// (2026-08-19) supaya bisa dipakai ulang di halaman Growth (task029) —
// BUKAN dibuat ulang versi baru, chart & drill-down yang sudah ada di sini
// tetap yang dipakai (koreksi user: "kenapa bikin chart baru kalau chart
// lama sudah ada").
interface Props {
  data: CrossSellingData | undefined;
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  periodMonth: string;
  activeWindow: number;
  excludeIntercompany?: boolean;
}

export function M1CrossSelling({ data, isLoading, companyId, branchId, division, periodMonth, activeWindow, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
