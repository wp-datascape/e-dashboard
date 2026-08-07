import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';
import { M4GrossProfit } from '@/components/analisis/M4GrossProfit';
import { todayIsoDate } from '@/utils/date';

// KPI 4 — Keuntungan dari pelanggan loyal (Average Gross Profit, M4).
// Sebelumnya bagian dari bundel CustomerMetrics (M3-M7, 1 route) — dipecah
// jadi halaman sendiri (task025 §12, 2026-08-07), mengikuti pola yang sama
// dgn KPI8-10. Tabel: masih dialog drill-down klik-bar (BELUM diformalkan
// jadi tabel persisten seperti KPI9 — dicatat sebagai follow-up di task025,
// bukan dilewatkan diam-diam).
export default function CustomerGrossProfit() {
  const { t } = useTranslation();

  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const [periodEnd, setPeriodEnd] = useState(todayIsoDate());

  const { data, isLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: periodEnd,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const trend = data?.trend ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m4.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m4.pageSubtitle')}</Typography>
      </Box>

      <DateScopeFilterBar
        scopeFilter={scopeFilter}
        periodEnd={periodEnd}
        onPeriodEndChange={setPeriodEnd}
        onReset={() => {
          scopeFilter.reset();
          setPeriodEnd(todayIsoDate());
        }}
      />

      <M4GrossProfit
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        excludeIntercompany={excludeIntercompany}
      />
    </Box>
  );
}
