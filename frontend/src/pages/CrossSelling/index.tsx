import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { DataTable } from '@/components/tables/DataTable';
import { api } from '@/api/axios';
import type { ApiResponse } from '@/types/api';

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
    field: 'hardware', headerName: 'Hardware', width: 100,
    renderCell: (p) => (
      <Chip label={p.value ? 'Ya' : 'Tidak'} size="small"
        color={p.value ? 'primary' : 'default'}
        sx={{ borderRadius: 0, fontSize: '0.7rem', height: 20 }} />
    ),
  },
  {
    field: 'consumable', headerName: 'Consumable', width: 110,
    renderCell: (p) => (
      <Chip label={p.value ? 'Ya' : 'Tidak'} size="small"
        color={p.value ? 'primary' : 'default'}
        sx={{ borderRadius: 0, fontSize: '0.7rem', height: 20 }} />
    ),
  },
  { field: 'category_count', headerName: 'Jml Kategori', width: 120, type: 'number' },
  {
    field: 'total_revenue', headerName: 'Total Revenue', width: 160, type: 'number',
    valueFormatter: (value: number) => `Rp ${value.toLocaleString('id-ID')}`,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrossSelling() {
  const { data, isLoading } = useCrossSelling();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cross Selling
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Metrik 1 & 2 — Cross Selling Ratio dan Rata-rata Kategori Produk per Customer Aktif
        </Typography>
      </Box>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : (
            <AreaChartWidget
              title="Cross Selling Ratio (12 Bulan)"
              subtitle="% customer aktif yang beli >1 kategori produk"
              value={`${data?.trend.at(-1)?.ratio ?? 0}%`}
              data={data?.trend ?? []}
              series={[{ key: 'ratio', label: 'Cross Selling Ratio (%)', color: '#3B82F6' }]}
              xKey="month"
              height={220}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : (
            <BarChartWidget
              title="Total Customer Aktif vs Multi-Kategori (12 Bulan)"
              subtitle="Perbandingan customer aktif dan yang beli >1 kategori"
              data={data?.trend ?? []}
              series={[
                { key: 'total_active',  label: 'Customer Aktif',       color: '#94A3B8' },
                { key: 'multi_product', label: 'Multi-Kategori',        color: '#3B82F6' },
              ]}
              xKey="month"
              height={220}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={280} />
          ) : (
            <AreaChartWidget
              title="Rata-rata Kategori Produk per Customer (12 Bulan)"
              subtitle="Rata-rata kategori unik yang dibeli per customer aktif"
              value={`${data?.trend.at(-1)?.avg_category ?? 0}`}
              data={data?.trend ?? []}
              series={[{ key: 'avg_category', label: 'Avg Kategori', color: '#8B5CF6' }]}
              xKey="month"
              height={220}
            />
          )}
        </Grid>
      </Grid>

      {/* Detail Table */}
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
