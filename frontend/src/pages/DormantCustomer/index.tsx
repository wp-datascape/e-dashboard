import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useDormantCustomer } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { todayIsoDate } from './helpers';
import { clampDateNotFuture } from '@/utils/date';
import { M8DormantRate } from './M8DormantRate';
import { M9DormantValue } from './M9DormantValue';
import { M10ReactivationRate } from './M10ReactivationRate';

// ─── Page ─────────────────────────────────────────────────────────────────────
// M8/M9/M10 diekstrak ke file masing-masing (2026-08-19, task029) — dipakai
// ulang persis sama di halaman Retention, bukan diduplikasi.
export default function DormantCustomer() {
  const { t } = useTranslation();

  const [periodEnd, setPeriodEnd] = useState(todayIsoDate());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  const { data, isLoading } = useDormantCustomer({
    company_id:  companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

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
          <Typography variant="pageTitle">
            {t('dormantCustomer.pageTitle')}
          </Typography>
          <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
            {t('dormantCustomer.pageSubtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />

          <DatePicker
            size="small" label={t('common.filters.periodDate')}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(clampDateNotFuture(e.target.value, todayIsoDate()))}
            max={todayIsoDate()}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          />
          <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        </Box>
      </Box>

      <M8DormantRate data={data} isLoading={isLoading} />
      <M9DormantValue data={data} isLoading={isLoading} />
      <M10ReactivationRate data={data} isLoading={isLoading} />
    </Box>
  );
}
