import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import type { GridColDef } from '@mui/x-data-grid';

import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useRorBreakdown } from '@/hooks/useMetrics';
import { fmtRp, SectionLabel, monthToEndDate } from './helpers';

function orderCountColor(n: number): StatusChipColor {
  if (n >= 10) return 'success';
  if (n >= 5)  return 'primary';
  if (n >= 3)  return 'info';
  return 'default';
}

const rorColumns: GridColDef[] = [
  { field: 'ranking',       headerName: '#',            width: 56,  sortable: false },
  { field: 'customer_name', headerName: 'Customer',      flex: 1,    minWidth: 160 },
  { field: 'customer_code', headerName: 'Kode',          width: 110, sortable: false,
    renderCell: (p) => p.value ?? '—' },
  { field: 'invoice_count', headerName: 'Jumlah Order',  width: 140, align: 'right', headerAlign: 'right',
    renderCell: (p) => (
      <StatusChip
        label={`${p.value}x`}
        color={orderCountColor(p.value as number)}
      />
    ) },
  { field: 'total_revenue', headerName: 'Total Revenue', width: 140, align: 'right', headerAlign: 'right',
    renderCell: (p) => fmtRp(p.value as number) },
]

interface Props {
  isLoading: boolean
  value: number
  thresholdPct: number
  companyId: number | 'all'
  division?: string
  periodEnd: string
}

export function M6RepeatOrder({ isLoading, value, thresholdPct, companyId, division, periodEnd }: Props) {
  const [drillDate, setDrillDate] = useState<string | null>(null);

  const { data: breakdown, isLoading: breakdownLoading } = useRorBreakdown({
    period_end: drillDate,
    company_id: companyId,
    division,
  });

  return (
    <>
      <Box>
        <SectionLabel label="M6 · Repeat Order Rate — Bulan Berjalan" />
        {isLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <RadialBarWidget
            title="Repeat Order Rate"
            subtitle={`Hijau ≥ ${thresholdPct}% (on target) · Klik untuk lihat daftar customer`}
            value={value}
            thresholdGreen={thresholdPct}
            height={240}
            onChartClick={() => setDrillDate(monthToEndDate(periodEnd))}
          />
        )}
      </Box>

      {/* ROR Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
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
              Repeat Order Buyers — {drillDate}
            </Typography>
            {breakdown && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                {([
                  ['Total existing customer',     String(breakdown.total_existing)],
                  ['Customer repeat order (>1x)', String(breakdown.repeat_count)],
                  ['Repeat order rate',           `${value}%`],
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
          <IconButton size="small" onClick={() => setDrillDate(null)} sx={{ color: 'text.secondary', mt: -0.5 }}>
            <Typography component="span" sx={{ fontSize: 16, lineHeight: 1 }}>✕</Typography>
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 1 }}>
          <ResponsiveListView
            rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
            columns={rorColumns}
            loading={breakdownLoading}
            height={400}
            pageSize={25}
            pageSizeOptions={[25, 50, 100]}
            emptyMessage="Tidak ada existing customer yang order lebih dari 1x bulan ini"
            mobileFields={['customer_name', 'invoice_count', 'total_revenue']}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
