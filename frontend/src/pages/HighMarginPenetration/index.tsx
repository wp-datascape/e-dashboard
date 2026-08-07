import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';
import { M5HighMargin } from '@/components/analisis/M5HighMargin';
import { todayIsoDate } from '@/utils/date';

// KPI 5 — Pembelian produk fokus / High Margin Penetration (donut snapshot, M5).
// Sebelumnya bagian dari bundel CustomerMetrics (M3-M7, 1 route) — dipecah
// jadi halaman sendiri (task025 §12, 2026-08-07).
// BELUM dikerjakan (follow-up, dicatat bukan dilewatkan diam-diam): chart
// tren 12 bulan 2 seri (Kontribusi % + Penetrasi %) yang seharusnya pindah
// dari M3 ke sini (ux-menu-mapping.md v9 §4 KPI5) — datanya SUDAH tersedia
// di trend (`high_margin_ratio` + `hm_revenue`/`total_revenue_existing`),
// tinggal dibuatkan chart-nya. Tabel: masih dialog drill-down klik-donut.
export default function HighMarginPenetration() {
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

  const hm = data?.high_margin_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="pageTitle">{t('customerMetrics.m5.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('customerMetrics.m5.pageSubtitle')}</Typography>
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

      <M5HighMargin
        isLoading={isLoading}
        hm={hm}
        companyId={companyId}
        branchId={branchId === 'all' ? undefined : branchId}
        division={division || undefined}
        periodEnd={periodEnd}
        excludeIntercompany={excludeIntercompany}
      />
    </Box>
  );
}
