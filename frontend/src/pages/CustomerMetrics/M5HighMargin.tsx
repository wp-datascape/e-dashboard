import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import type { GridColDef } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useHmBreakdown } from '@/hooks/useMetrics';
import { fmtRp, SectionLabel } from './helpers';

const hmColumns: GridColDef[] = [
  { field: 'ranking',       headerName: '#',          width: 56,  sortable: false },
  { field: 'customer_name', headerName: 'Customer',    flex: 1,    minWidth: 160 },
  { field: 'customer_code', headerName: 'Kode',        width: 110, sortable: false,
    renderCell: (p) => p.value ?? '—' },
  { field: 'hm_revenue', headerName: 'Revenue HM',  width: 140, align: 'right', headerAlign: 'right',
    renderCell: (p) => fmtRp(p.value as number) },
  { field: 'hm_pct', headerName: '% Total HM', width: 110, align: 'right', headerAlign: 'right',
    renderCell: (p) => `${p.value}%` },
]

interface Props {
  isLoading: boolean
  hm: { bought_pct: number; not_bought_pct: number } | undefined
  companyId: number | 'all'
  division?: string
  periodMonth: string
}

export function M5HighMargin({ isLoading, hm, companyId, division, periodMonth }: Props) {
  const theme = useTheme();
  const [hmDrillMonth, setHmDrillMonth] = useState<string | null>(null);

  const { data: hmBreakdown, isLoading: hmBreakdownLoading } = useHmBreakdown({
    month: hmDrillMonth,
    company_id: companyId,
    division,
  });

  return (
    <>
      <Box>
        <SectionLabel label="M5 · High Margin Product Penetration — Bulan Berjalan" />
        {isLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <DonutChartWidget
            title="Penetrasi Produk High Margin"
            subtitle="Klik chart untuk melihat daftar customer — snapshot bulan berjalan"
            data={[
              { name: 'Membeli High Margin', value: hm?.bought_pct ?? 0,       color: theme.palette.success.main },
              { name: 'Tidak Membeli',       value: hm?.not_bought_pct ?? 100, color: theme.palette.action.disabledBackground },
            ]}
            centerValue={`${hm?.bought_pct ?? 0}%`}
            centerLabel="High Margin"
            height={240}
            onChartClick={() => setHmDrillMonth(periodMonth)}
          />
        )}
      </Box>

      {/* HM Breakdown Dialog */}
      <Dialog
        open={!!hmDrillMonth}
        onClose={() => setHmDrillMonth(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0 } } }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          px: 3, py: 2, borderBottom: 1, borderColor: 'divider',
        }}>
          <Box>
            <Typography component="div" variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              High Margin Buyers — {hmDrillMonth}
            </Typography>
            {hmBreakdown && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                {([
                  ['Total existing customer',    String(hmBreakdown.total_existing)],
                  ['Membeli produk high margin', String(hmBreakdown.hm_buyer_count)],
                  ['Penetrasi',                  `${hm?.bought_pct ?? 0}%`],
                  ['Total revenue produk HM',    fmtRp(hmBreakdown.total_hm_revenue)],
                ] as [string, string][]).map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                    <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <IconButton size="small" onClick={() => setHmDrillMonth(null)} sx={{ color: 'text.secondary', mt: -0.5 }}>
            <Typography component="span" sx={{ fontSize: 16, lineHeight: 1 }}>✕</Typography>
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 1 }}>
          <ResponsiveListView
            rows={(hmBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
            columns={hmColumns}
            loading={hmBreakdownLoading}
            height={400}
            pageSize={25}
            pageSizeOptions={[25, 50, 100]}
            emptyMessage="Tidak ada existing customer yang membeli produk high margin bulan ini"
            mobileFields={['customer_name', 'hm_revenue', 'hm_pct']}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
