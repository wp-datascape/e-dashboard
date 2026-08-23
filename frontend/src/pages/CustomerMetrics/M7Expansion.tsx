import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

import { Dialog } from '@/components/ui/Dialog';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useExpansionBreakdown } from '@/hooks/useMetrics';
import { resolvePeriodEnd, formatDateID } from '@/utils/date';
import { getCurrentPeriodKey, getPeriodDateRange } from '@/utils/analisisPeriod';
import { SectionLabel } from './HelperComponents';
import { ExpansionChart } from './ExpansionChart';
import { useExpansionColumns } from './expansionHelpers';

interface Props {
  trend: CustomerMetricsTrendPoint[]
  isLoading: boolean
  companyId: number | 'all'
  branchId?: number
  division?: number
  excludeIntercompany?: boolean
}

export function M7Expansion({ trend, isLoading, companyId, branchId, division, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const expansionColumns = useExpansionColumns(t);

  const { data: breakdown, isLoading: breakdownLoading } = useExpansionBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // Halaman ini hardcode bulanan (belum ada filter granularitas UI di
  // Customer Metrics workbench) — rentang tanggal dialog (subtitle "Periode
  // X s/d Y", standar layout drilldown) dihitung sbg bulan kalender penuh
  // dari drillDate (pola sama M7ExpansionGrowth.tsx, versi granularitas-tetap).
  const drillRange = (() => {
    if (!drillDate) return null;
    const [dy, dm, dd] = drillDate.split('-').map(Number);
    const key = getCurrentPeriodKey('monthly', new Date(dy, dm - 1, dd));
    return getPeriodDateRange('monthly', key);
  })();

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SectionLabel label={t('customerMetrics.m7.sectionLabel')} />
        <MuiTooltip
          title={t('customerMetrics.m7.tooltipInfo')}
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
        <Skeleton variant="rectangular" height={340} />
      ) : (
        <ExpansionChart
          trend={trend}
          height={320}
          onBarClick={(d) => setDrillDate(resolvePeriodEnd(String(d.month ?? '')))}
        />
      )}

      {/* Expansion Breakdown Dialog */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m7.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.m11DialogSubtitle', {
                start: drillRange ? formatDateID(drillRange.start) : '…',
                end: drillRange ? formatDateID(drillRange.end) : '…',
              })}
            </Typography>
            {([
              [t('customerMetrics.m7.dialogUpCount'),       String(breakdown.up_count)],
              [t('customerMetrics.m7.dialogTotalExisting'), String(breakdown.total_existing)],
              [t('customerMetrics.m7.dialogUpRate'),        `${breakdown.total_existing > 0 ? ((breakdown.up_count / breakdown.total_existing) * 100).toFixed(1) : '0.0'}%`],
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
          columns={expansionColumns}
          loading={breakdownLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m7.emptyMessage')}
          mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
        />
      </Dialog>
    </>
  );
}
