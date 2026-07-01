import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useCompanies } from '@/hooks/useCompanies';
import { useDivisionOptions } from '@/hooks/useDivisionOptions';
import { DetailCard } from './components/DetailCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [companyId,  setCompanyId]  = useState<number | 'all'>('all');
  const [periodEnd,  setPeriodEnd]  = useState(todayStr());
  const [division,   setDivision]   = useState<string>('');

  const { data: companies = [] } = useCompanies();
  const divisionOptions = useDivisionOptions(companyId);
  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    period_end:  periodEnd,
    division:    division || undefined,
  });

  const latestTrend = data?.trend.at(-1);

  // ─── Desktop Table Columns ─────────────────────────────────────────────────
  const detailColumns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), width: 130 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1, minWidth: 180 },
    {
      field: 'has_unit',
      headerName: 'Unit',
      width: 90,
      renderCell: (p) => (
        <StatusChip label={p.value ? 'Ya' : 'Tidak'} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_consumable',
      headerName: 'Consumable',
      width: 110,
      renderCell: (p) => (
        <StatusChip label={p.value ? 'Ya' : 'Tidak'} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_sparepart',
      headerName: 'Sparepart',
      width: 110,
      renderCell: (p) => (
        <StatusChip label={p.value ? 'Ya' : 'Tidak'} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'category_count',
      headerName: t('crossSelling.colCategoryCount'),
      width: 110,
      type: 'number',
    },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      width: 160,
      type: 'number',
      valueFormatter: (value: number) => fmtRp(value),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('crossSelling.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Metrik 1–2 · Window {data?.period.active_months ?? '…'} bulan · Sumber: invoice + item kategori produk
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            select size="small" label="Entitas"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="all">Semua Entitas</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Divisi"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value="">Semua Divisi</MenuItem>
            {divisionOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small" label="Tanggal Akhir" type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      </Box>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label="KPI 1 · Cross-Selling Rate"
              value={`${data?.kpi1.rate ?? 0}%`}
              sub={`${data?.kpi1.multi_cat_count ?? 0} dari ${data?.kpi1.active_count ?? 0} customer aktif beli >1 kategori`}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label="KPI 2 · Rata-rata Kategori / Customer"
              value={data?.kpi2.avg_categories ?? 0}
              sub={`${data?.kpi2.total_distinct_cats ?? 0} jenis kategori terjual dalam ${data?.period.active_months ?? '…'} bulan terakhir`}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={`Customer Aktif (${data?.period.active_months ?? '…'} bulan)`}
              value={data?.kpi1.active_count ?? 0}
              sub={`Periode ${data?.period.start ?? '—'} s/d ${data?.period.end ?? '—'}`}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label="Cross-Sell Rate — Bulan Ini"
              value={`${latestTrend?.ratio ?? 0}%`}
              sub={`${latestTrend?.multi_product ?? 0}/${latestTrend?.total_active ?? 0} customer (${latestTrend?.month ?? '—'})`}
              color={theme.palette.warning.main}
            />
          )}
        </Grid>
      </Grid>

      {/* ── M1: Cross Selling Ratio + Active Count Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM1') + ' · Cross Selling Ratio — Trend 12 Bulan'} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title="Customer Aktif vs Multi-Kategori (12 Bulan)"
                subtitle={`Bar abu = total customer aktif · Bar biru = customer beli >1 kategori produk dalam window ${data?.period.active_months ?? '…'} bulan terakhir bulan itu`}
                data={data?.trend ?? []}
                series={[
                  { key: 'total_active',  label: 'Customer Aktif',      color: theme.palette.text.secondary },
                  { key: 'multi_product', label: 'Multi-Kategori',       color: theme.palette.primary.main },
                ]}
                xKey="month"
                height={240}
                tooltipFormatter={(value, name) => [
                  `${value.toLocaleString('id-ID')} customer`, name
                ]}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title="Cross-Selling Ratio (%)"
                subtitle="% customer aktif yang membeli dari >1 kategori produk"
                value={`${latestTrend?.ratio ?? 0}%`}
                data={data?.trend ?? []}
                series={[{ key: 'ratio', label: 'Cross-Sell Rate', color: theme.palette.info.main }]}
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
        <SectionLabel label={t('crossSelling.labelM11') + ' · Customer Cross Selling Dashboard — Heatmap'} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Top 20 customer (berdasarkan jumlah kategori) × Top 8 kategori (berdasarkan frekuensi transaksi) ·
            Periode {data?.period.start ?? '…'} s/d {data?.period.end ?? '…'}
          </Typography>
          {data?.categories && data.categories.length > 0 && (
            <Chip label={`${data.categories.length} kategori`} size="small" variant="outlined" />
          )}
        </Box>
        {isLoading ? (
          <Skeleton variant="rectangular" height={420} />
        ) : (
          <HeatmapWidget
            title={`Customer Cross-Selling Matrix · ${data?.period.start ?? ''} – ${data?.period.end ?? ''}`}
            subtitle="Kolom = tipe produk (Unit / Sparepart / Consumable) · Angka = jumlah transaksi · Hijau = ada pembelian"
            xLabels={(data?.categories ?? []).map((c) =>
              c === 'unit' ? 'Unit' : c === 'sparepart' ? 'Sparepart' : c === 'consumable' ? 'Consumable' : c
            )}
            data={(data?.heatmap ?? []).map((row) => ({
              customer: row.customer,
              values: Object.fromEntries(
                Object.entries(row.values).map(([k, v]) => [
                  k === 'unit' ? 'Unit' : k === 'sparepart' ? 'Sparepart' : k === 'consumable' ? 'Consumable' : k,
                  v,
                ])
              ),
            }))}
          />
        )}
      </Box>

      {/* ── M2: Avg Category per Customer Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2') + ' · Rata-rata Kategori per Customer Aktif'} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title="Avg Kategori per Customer Aktif — Tren 12 Bulan"
            subtitle={`Rata-rata berapa banyak kategori produk yang dibeli per customer aktif dalam window ${data?.period.active_months ?? '…'} bulan`}
            value={`${latestTrend?.avg_category ?? 0}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: 'Avg Kategori', color: theme.palette.success.main }]}
            xKey="month"
            height={220}
          />
        )}
      </Box>

      {/* ── Detail per Customer Table ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Detail per Customer — Periode {data?.period.start ?? '…'} s/d {data?.period.end ?? '…'}
          </Typography>
          {data?.detail && (
            <Chip
              label={`${data.detail.length} customer`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {isMobile ? (
          <Box>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 1.5 }} />)
              : (data?.detail ?? []).map((row) => (
                  <DetailCard key={row.customer_id} row={row} />
                ))}
          </Box>
        ) : (
          <ResponsiveListView
            rows={(data?.detail ?? []).map((r) => ({ ...r, id: r.customer_id }))}
            columns={detailColumns}
            loading={isLoading}
            pageSize={10}
            height={440}
            mobileFields={['customer_code', 'customer_name', 'has_unit', 'has_consumable', 'has_sparepart', 'category_count', 'total_revenue']}
          />
        )}
      </Box>
    </Box>
  );
}
