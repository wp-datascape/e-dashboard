import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { RadialBarWidget } from '@/components/charts/RadialBarWidget';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useRorBreakdown } from '@/hooks/useMetrics';
import { fmtRp, monthToEndDate } from './helpers';
import { SectionLabel } from './HelperComponents';

function orderCountColor(n: number): StatusChipColor {
  if (n >= 10) return 'success';
  if (n >= 5)  return 'primary';
  if (n >= 3)  return 'info';
  return 'default';
}

function useRorColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m6.colRank'),       width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m6.colCustomer'),   flex: 1,    minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m6.colCode'),       width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'invoice_count', headerName: t('customerMetrics.m6.colOrderCount'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <StatusChip
          label={`${p.value}x`}
          color={orderCountColor(p.value as number)}
        />
      ) },
    { field: 'total_revenue', headerName: t('customerMetrics.m6.colTotalRevenue'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRp(p.value as number) },
  ]
}

interface Props {
  isLoading: boolean
  value: number
  thresholdPct: number
  companyId: number | 'all'
  branchId?: number
  division?: string
  periodEnd: string
  excludeIntercompany?: boolean
}

export function M6RepeatOrder({ isLoading, value, thresholdPct, companyId, branchId, division, periodEnd, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const rorColumns = useRorColumns(t);

  const { data: breakdown, isLoading: breakdownLoading } = useRorBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m6.sectionLabel')} />
          <MuiTooltip
            title={t('customerMetrics.m6.tooltipInfo')}
            placement="top"
            arrow
            slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
          >
            <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </MuiTooltip>
        </Box>
        {isLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <RadialBarWidget
            title={t('customerMetrics.m6.chartTitle')}
            subtitle={t('customerMetrics.m6.chartSubtitle', { thresholdPct })}
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
        title={t('customerMetrics.m6.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m6.dialogTotalExisting'),     String(breakdown.total_existing)],
              [t('customerMetrics.m6.dialogRepeatCount'), String(breakdown.repeat_count)],
              [t('customerMetrics.m6.dialogRate'),           `${value}%`],
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
          rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={rorColumns}
          loading={breakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m6.emptyMessage')}
          mobileFields={['customer_name', 'invoice_count', 'total_revenue']}
        />
      </Dialog>
    </>
  );
}
