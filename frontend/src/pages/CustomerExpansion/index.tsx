import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';
import { M7Expansion } from '@/components/analisis/M7Expansion';
import { todayIsoDate } from '@/utils/date';

// KPI 7 — Pelanggan dengan peningkatan nilai belanja (Customer Expansion Rate, M7).
// Sebelumnya bagian dari bundel CustomerMetrics (M3-M7, 1 route) — dipecah
// jadi halaman sendiri (task025 §12, 2026-08-07). Tabel: masih dialog
// drill-down klik-bar (follow-up, belum diformalkan jadi tabel persisten).
export default function CustomerExpansion() {
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
        <Typography variant="pageTitle">{t('customerMetrics.m7.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m7.pageSubtitle')}</Typography>
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

      <M7Expansion
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
