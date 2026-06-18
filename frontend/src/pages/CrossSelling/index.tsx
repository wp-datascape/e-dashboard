import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { DataTable } from '@/components/tables/DataTable';
import { useCrossSelling } from '@/hooks/useMetrics';

// Components
import { DetailCard } from './components/DetailCard';

// ─── Section Label ─────────────────────────────────────────────────────────────
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
export default function CrossSelling() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useCrossSelling();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const latestTrend = data?.trend.at(-1);

  // ─── Desktop Columns ──────────────────────────────────────────────────────────
  const detailColumns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), width: 140 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1, minWidth: 180 },
    {
      field: 'hardware',
      headerName: t('crossSelling.colHardware'),
      width: 100,
      renderCell: (p) => (
        <StatusChip
          label={p.value ? t('crossSelling.yes') : t('crossSelling.no')}
          color={p.value ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'consumable',
      headerName: t('crossSelling.colConsumable'),
      width: 110,
      renderCell: (p) => (
        <StatusChip
          label={p.value ? t('crossSelling.yes') : t('crossSelling.no')}
          color={p.value ? 'primary' : 'default'}
        />
      ),
    },
    { field: 'category_count', headerName: t('crossSelling.colCategoryCount'), width: 120, type: 'number' },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      width: 160,
      type: 'number',
      valueFormatter: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('crossSelling.pageTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('crossSelling.pageSubtitle')}
        </Typography>
      </Box>

      {/* ── M1: Grouped Column Chart — Total Active vs Multi-Product ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM1')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title={t('crossSelling.chartActiveTitle')}
                subtitle={t('crossSelling.chartActiveSubtitle')}
                data={data?.trend ?? []}
                series={[
                  { key: 'total_active',  label: t('crossSelling.seriesActiveCustomers'),  color: '#94A3B8' },
                  { key: 'multi_product', label: t('crossSelling.seriesMultiCategory'),     color: '#3B82F6' },
                ]}
                xKey="month"
                height={240}
                tooltipFormatter={(value, name) => {
                  return [value.toLocaleString('id-ID') + (i18n.language === 'id' ? ' jiwa' : ' customers'), name];
                }}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title={t('crossSelling.chartRatioTitle')}
                subtitle={t('crossSelling.chartRatioSubtitle')}
                value={`${latestTrend?.ratio ?? 0}%`}
                data={data?.trend ?? []}
                series={[{ key: 'ratio', label: t('crossSelling.seriesRatio'), color: '#0EA5E9' }]}
                xKey="month"
                height={240}
                tooltipFormatter={(v, n) => [`${v}%`, n]}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── M1.1: Heatmap — Customer × Product Category ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM11')} />
        {isMobile && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
            {t('crossSelling.heatmapMobileHelper')}
          </Typography>
        )}
        {isLoading ? (
          <Skeleton variant="rectangular" height={420} />
        ) : (
          <HeatmapWidget
            title={t('crossSelling.heatmapMatrixTitle')}
            subtitle={t('crossSelling.heatmapSubtitle')}
            xLabels={data?.categories ?? ['Scanner', 'Printer', 'Label', 'Ribbon', 'POS']}
            data={data?.heatmap ?? []}
          />
        )}
      </Box>

      {/* ── M2: Spline Area Chart — Avg Category per Customer ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <AreaChartWidget
                title={t('crossSelling.chartAvgCatTitle')}
                subtitle={t('crossSelling.chartAvgCatSubtitle')}
                value={`${latestTrend?.avg_category ?? 0}`}
                data={data?.trend ?? []}
                series={[{ key: 'avg_category', label: t('crossSelling.seriesAvgCategory'), color: '#16a34a' }]}
                xKey="month"
                height={220}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Detail Table / Cards ── */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
          {t('crossSelling.tableTitle', { period: '2025-03' })}
        </Typography>

        {isLoading ? (
          isMobile ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={140} sx={{ mb: 1.5, borderRadius: 2 }} />
              ))}
            </Box>
          ) : (
            <Skeleton variant="rectangular" height={420} />
          )
        ) : isMobile ? (
          /* ── Mobile: Card list ── */
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              {t('crossSelling.foundCount', { count: data?.detail.length ?? 0 })}
            </Typography>
            {(data?.detail ?? []).map((row) => (
              <DetailCard key={row.id} row={row} />
            ))}
          </Box>
        ) : (
          /* ── Desktop: DataGrid ── */
          <DataTable
            rows={data?.detail ?? []}
            columns={detailColumns}
            pageSize={10}
            height={420}
          />
        )}
      </Box>
    </Box>
  );
}
