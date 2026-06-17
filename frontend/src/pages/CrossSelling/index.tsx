import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import { DataTable } from '@/components/tables/DataTable';
import { useCrossSelling } from '@/hooks/useMetrics';
import type { CrossSellingDetailRow } from '@/types/metrics';

// ─── Desktop Columns ──────────────────────────────────────────────────────────
const detailColumns: GridColDef[] = [
  { field: 'customer_code', headerName: 'Kode Customer', width: 140 },
  { field: 'customer_name', headerName: 'Nama Customer', flex: 1, minWidth: 180 },
  {
    field: 'hardware',
    headerName: 'Hardware',
    width: 100,
    renderCell: (p) => (
      <StatusChip
        label={p.value ? 'Ya' : 'Tidak'}
        color={p.value ? 'primary' : 'default'}
      />
    ),
  },
  {
    field: 'consumable',
    headerName: 'Consumable',
    width: 110,
    renderCell: (p) => (
      <StatusChip
        label={p.value ? 'Ya' : 'Tidak'}
        color={p.value ? 'primary' : 'default'}
      />
    ),
  },
  { field: 'category_count', headerName: 'Jml Kategori', width: 120, type: 'number' },
  {
    field: 'total_revenue',
    headerName: 'Total Revenue',
    width: 160,
    type: 'number',
    valueFormatter: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
  },
];

// ─── Mobile Detail Card ───────────────────────────────────────────────────────
function DetailCard({ row }: { row: CrossSellingDetailRow }) {
  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1.5 }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Customer name + code */}
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
          {row.customer_name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {row.customer_code}
        </Typography>

        <Divider sx={{ mb: 1.25 }} />

        {/* Category chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
          <StatusChip
            label="Hardware"
            color={row.hardware ? 'primary' : 'default'}
          />
          <StatusChip
            label="Consumable"
            color={row.consumable ? 'primary' : 'default'}
          />
          <StatusChip
            label="Service"
            color={row.service ? 'primary' : 'default'}
          />
        </Box>

        {/* Stats row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Jumlah Kategori
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.category_count}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Total Revenue
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Rp {row.total_revenue.toLocaleString('id-ID')}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

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
  const { data, isLoading } = useCrossSelling();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const latestTrend = data?.trend.at(-1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cross Selling
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Metrik 1, 1.1 &amp; 2 — Cross Selling Ratio, Heatmap Produk, dan Rata-rata Kategori per Customer
        </Typography>
      </Box>

      {/* ── M1: Grouped Column Chart — Total Active vs Multi-Product ── */}
      <Box>
        <SectionLabel label="M1 · Cross Selling Ratio" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title="Total Customer Aktif vs Multi-Produk (12 Bulan)"
                subtitle="Hover untuk melihat Cross Selling Ratio (%) · Dua batang berdampingan per bulan"
                data={data?.trend ?? []}
                series={[
                  { key: 'total_active',  label: 'Customer Aktif',  color: '#94A3B8' },
                  { key: 'multi_product', label: 'Multi-Produk',     color: '#3B82F6' },
                ]}
                xKey="month"
                height={240}
                tooltipFormatter={(value, name) => {
                  return [value.toLocaleString('id-ID') + ' jiwa', name];
                }}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title="Cross Selling Ratio — Trend (12 Bulan)"
                subtitle="% pelanggan aktif yang membeli lebih dari 1 kategori produk"
                value={`${latestTrend?.ratio ?? 0}%`}
                data={data?.trend ?? []}
                series={[{ key: 'ratio', label: 'Ratio (%)', color: '#0EA5E9' }]}
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
        <SectionLabel label="M1.1 · Customer Cross Selling Dashboard — Heatmap" />
        {isMobile && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
            ← Geser kiri/kanan untuk melihat semua kolom
          </Typography>
        )}
        {isLoading ? (
          <Skeleton variant="rectangular" height={420} />
        ) : (
          <HeatmapWidget
            title="Matriks Produk per Customer"
            subtitle="Hijau = ada transaksi (nilai > 0) · Abu = tidak ada transaksi"
            xLabels={data?.categories ?? ['Scanner', 'Printer', 'Label', 'Ribbon', 'POS']}
            data={data?.heatmap ?? []}
          />
        )}
      </Box>

      {/* ── M2: Spline Area Chart — Avg Category per Customer ── */}
      <Box>
        <SectionLabel label="M2 · Rata-rata Kategori Produk per Customer" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <AreaChartWidget
                title="Rata-rata Kategori Produk per Customer Aktif (12 Bulan)"
                subtitle="Tren positif = gradien hijau · Kurva spline halus"
                value={`${latestTrend?.avg_category ?? 0}`}
                data={data?.trend ?? []}
                series={[{ key: 'avg_category', label: 'Avg Kategori', color: '#16a34a' }]}
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
          Detail per Customer — Periode 2025-03
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
              {data?.detail.length ?? 0} customer ditemukan
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
