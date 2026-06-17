import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { DataTable } from '@/components/tables/DataTable';
import { api } from '@/api/axios';
import type { ApiResponse } from '@/types/api';
import type { HeatmapRow } from '@/components/charts/HeatmapWidget';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CrossSellingTrendPoint {
  month: string;
  total_active: number;
  multi_product: number;
  ratio: number;
  avg_category: number;
}

interface CrossSellingDetailRow {
  id: number;
  customer_code: string;
  customer_name: string;
  hardware: boolean;
  consumable: boolean;
  service: boolean;
  category_count: number;
  total_revenue: number;
}

interface CrossSellingData {
  trend: CrossSellingTrendPoint[];
  detail: CrossSellingDetailRow[];
  heatmap: HeatmapRow[];
  categories: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useCrossSelling() {
  return useQuery<CrossSellingData>({
    queryKey: ['metrics', 'cross-selling'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CrossSellingData>>('/metrics/cross-selling');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Columns ──────────────────────────────────────────────────────────────────
const detailColumns: GridColDef[] = [
  { field: 'customer_code', headerName: 'Kode Customer', width: 140 },
  { field: 'customer_name', headerName: 'Nama Customer', flex: 1, minWidth: 180 },
  {
    field: 'hardware',
    headerName: 'Hardware',
    width: 100,
    renderCell: (p) => (
      <Chip
        label={p.value ? 'Ya' : 'Tidak'}
        size="small"
        color={p.value ? 'primary' : 'default'}
        sx={{ borderRadius: 0, fontSize: '0.7rem', height: 20 }}
      />
    ),
  },
  {
    field: 'consumable',
    headerName: 'Consumable',
    width: 110,
    renderCell: (p) => (
      <Chip
        label={p.value ? 'Ya' : 'Tidak'}
        size="small"
        color={p.value ? 'primary' : 'default'}
        sx={{ borderRadius: 0, fontSize: '0.7rem', height: 20 }}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrossSelling() {
  const { data, isLoading } = useCrossSelling();

  const latestTrend = data?.trend.at(-1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cross Selling
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Metrik 1, 1.1 & 2 — Cross Selling Ratio, Heatmap Produk, dan Rata-rata Kategori per Customer
        </Typography>
      </Box>

      {/* ── M1: Grouped Column Chart — Total Active vs Multi-Product ── */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          M1 · Cross Selling Ratio
        </Typography>
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
                  // Enrich tooltip with ratio % for the active-customer bar
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
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          M1.1 · Customer Cross Selling Dashboard — Heatmap
        </Typography>
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
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          M2 · Rata-rata Kategori Produk per Customer
        </Typography>
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

      {/* ── Detail Table ── */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Detail per Customer — Periode 2025-03
        </Typography>
        {isLoading ? (
          <Skeleton variant="rectangular" height={420} />
        ) : (
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