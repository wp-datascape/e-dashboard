import { useState } from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { currentYearMonth, resolvePeriodEnd } from '@/utils/date'
import { useDashboard } from '@/hooks/useDashboard'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { StatCardSkeleton } from './StatCardSkeleton'
import { PeriodStrip } from './PeriodStrip'
import { MetricStatCard } from './MetricStatCard'
import { MetricChartSlot } from './MetricChartSlot'

// Halaman generik 1 grup KPI (Growth/Retention/Value, task029) — 1 menu,
// 1 halaman, StatCard + chart cuma utk metric_key yang relevan ke grup itu
// (task029.md §2). Data dari endpoint /dashboard yang sudah ada (sama
// dgn Dashboard/Overview), difilter di klien ke `metricKeys` grup ini —
// TIDAK ada endpoint backend baru. Dipusatkan di sini spy Growth/Retention/
// Value tidak triplikat boilerplate filter+fetch yang sama.
export interface KpiGroupPageProps {
  /** i18n key judul halaman, mis. 'nav.groups.growth' */
  titleKey: string
  /** metric_key yg relevan ke grup ini, urutan tampil sesuai array */
  metricKeys: string[]
}

export function KpiGroupPage({ titleKey, metricKeys }: KpiGroupPageProps) {
  const { t } = useTranslation()

  const scopeFilter = useScopedCompanyFilter()
  const { companyId: companyFilter, branchId: branchFilter, division: divisionFilter, excludeIntercompany, setExcludeIntercompany } = scopeFilter

  const [periodMonth, setPeriodMonth] = useState(currentYearMonth())

  const { data, isLoading } = useDashboard({
    company_id: companyFilter,
    branch_id: branchFilter === 'all' ? undefined : branchFilter,
    division: divisionFilter || undefined,
    period_end: resolvePeriodEnd(periodMonth),
    exclude_intercompany: excludeIntercompany,
  })

  const metrics = data?.metrics ?? []
  const groupMetrics = metricKeys.map((key) => metrics.find((m) => m.metric_key === key))

  // 3 item -> 3 kolom, 4 item -> 2x2 (chart cukup lebar spy tetap kebaca)
  const statSize = metricKeys.length > 3 ? { xs: 12, sm: 6, md: 3 } : { xs: 12, sm: 6, md: 4 }
  const chartSize = metricKeys.length > 3 ? { xs: 12, sm: 6, md: 6 } : { xs: 12, md: 4 }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter — tanpa Card, chrome minim ala main (task029) ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="pageTitle">{t(titleKey)}</Typography>
        {!isLoading && data && <PeriodStrip period={data.period_month} activeWindow={data.active_window} />}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <ScopeFilterFields filter={scopeFilter} />
        <MonthYearPicker
          size="small"
          label={t('common.filters.period')}
          value={periodMonth}
          onChange={setPeriodMonth}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
      </Box>

      {/* ── StatCard ringkas per KPI grup ini ── */}
      <Grid container spacing={2}>
        {metricKeys.map((key, i) => (
          <Grid key={key} size={statSize}>
            {isLoading || !groupMetrics[i] ? <StatCardSkeleton /> : <MetricStatCard metric={groupMetrics[i]!} />}
          </Grid>
        ))}
      </Grid>

      {/* ── Chart per KPI — klik chart lanjut ke halaman detail/breakdown-nya (metric.link) ── */}
      <Grid container spacing={2}>
        {metricKeys.map((key, i) => (
          <Grid key={key} size={chartSize}>
            <MetricChartSlot metricKey={key} metric={groupMetrics[i]} isLoading={isLoading} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
