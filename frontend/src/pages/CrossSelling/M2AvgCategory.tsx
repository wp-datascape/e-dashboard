import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui';
import { useCrossSellingDetail } from '@/hooks/useMetrics';
import type { CrossSellingData } from '@/types/metrics';
import { SectionLabel } from './HelperComponents';
import { fmtRp, monthToEndDate } from './helpers';

// M2 (Average Product Category, task029.md §9). Diekstrak dari
// CrossSelling/index.tsx (2026-08-19) supaya bisa dipakai ulang di halaman
// Growth (task029) — chart & drill-down yang sudah ada, bukan dibuat ulang.
interface Props {
  data: CrossSellingData | undefined;
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  excludeIntercompany?: boolean;
}

export function M2AvgCategory({ data, isLoading, companyId, branchId, division, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const latestTrend = data?.trend.at(-1);

  // ─── M2 Drill-down (klik titik grafik avg-category) ────────────────────────
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const { data: drillData, isLoading: drillLoading } = useCrossSellingDetail({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  const detailColumns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), width: 130 },
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
      valueFormatter: (value: number) => fmtRp(value),
    },
  ];

  return (
    <Box>
      {/* ── M2: Avg Category per Customer Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title={t('crossSelling.m2ChartTitle')}
            subtitle={`${t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })} · ${t('crossSelling.m2ChartHint')}`}
            value={`${latestTrend?.avg_category ?? 0}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
            xKey="month"
            height={220}
            onAreaClick={(d) => setDrillDate(monthToEndDate(String(d.month ?? '')))}
          />
        )}
      </Box>

      {/* M2 Drill-down Dialog — detail per customer bulan yang diklik */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('crossSelling.m2DialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={drillData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
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
