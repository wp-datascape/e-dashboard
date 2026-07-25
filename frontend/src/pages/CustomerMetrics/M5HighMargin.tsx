import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { DonutChartWidget } from '@/components/charts/DonutChartWidget';
import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useHmBreakdown } from '@/hooks/useMetrics';
import { fmtRpDetail, monthToEndDate } from './helpers';
import { SectionLabel } from './HelperComponents';

function useHmColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'ranking',       headerName: t('customerMetrics.m5.colRank'),     width: 56,  sortable: false },
    { field: 'customer_name', headerName: t('customerMetrics.m5.colCustomer'), flex: 1,    minWidth: 160 },
    { field: 'customer_code', headerName: t('customerMetrics.m5.colCode'),     width: 110, sortable: false,
      renderCell: (p) => p.value ?? '—' },
    { field: 'hm_revenue', headerName: t('customerMetrics.m5.colRevenueHm'), width: 140, align: 'right', headerAlign: 'right',
      renderCell: (p) => fmtRpDetail(p.value as number) },
    { field: 'hm_pct', headerName: t('customerMetrics.m5.colPctHm'), width: 110, align: 'right', headerAlign: 'right',
      renderCell: (p) => `${p.value}%` },
  ]
}

interface Props {
  isLoading: boolean
  hm: { bought_pct: number; not_bought_pct: number } | undefined
  companyId: number | 'all'
  branchId?: number
  division?: string
  periodEnd: string
  excludeIntercompany?: boolean
}

export function M5HighMargin({ isLoading, hm, companyId, branchId, division, periodEnd, excludeIntercompany }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [hmDrillDate, setHmDrillDate] = useState<string | null>(null);
  const hmColumns = useHmColumns(t);

  const { data: hmBreakdown, isLoading: hmBreakdownLoading } = useHmBreakdown({
    period_end: hmDrillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <SectionLabel label={t('customerMetrics.m5.sectionLabel')} />
          <MuiTooltip
            title={t('customerMetrics.m5.tooltipInfo')}
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
          <DonutChartWidget
            title={t('customerMetrics.m5.chartTitle')}
            subtitle={t('customerMetrics.m5.chartSubtitle')}
            data={[
              { name: t('customerMetrics.m5.boughtLabel'), value: hm?.bought_pct ?? 0,       color: theme.palette.success.main },
              { name: t('customerMetrics.m5.notBoughtLabel'), value: hm?.not_bought_pct ?? 100, color: theme.palette.action.disabledBackground },
            ]}
            centerValue={`${hm?.bought_pct ?? 0}%`}
            centerLabel={t('customerMetrics.m5.centerLabel')}
            height={240}
            onChartClick={() => setHmDrillDate(monthToEndDate(periodEnd))}
          />
        )}
      </Box>

      {/* HM Breakdown Dialog */}
      <Dialog
        open={!!hmDrillDate}
        onClose={() => setHmDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m5.dialogTitle', { date: hmDrillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={hmBreakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m5.dialogTotalExisting'),    String(hmBreakdown.total_existing)],
              [t('customerMetrics.m5.dialogBought'), String(hmBreakdown.hm_buyer_count)],
              [t('customerMetrics.m5.dialogPenetration'),                  `${hm?.bought_pct ?? 0}%`],
              [t('customerMetrics.m5.dialogRevenue'),    fmtRpDetail(hmBreakdown.total_hm_revenue)],
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
          rows={(hmBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={hmColumns}
          loading={hmBreakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m5.emptyMessage')}
          mobileFields={['customer_name', 'hm_revenue', 'hm_pct']}
        />
      </Dialog>
    </>
  );
}
