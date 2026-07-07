// frontend/src/pages/ProductsTrend/index.tsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useProductTrend } from '@/hooks/useProducts'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'

function todayMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ProductsTrend() {
  const theme = useTheme()
  const { t } = useTranslation()

  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division } = scopeFilter

  const { data, isLoading } = useProductTrend({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    period_month: todayMonth(),
  })

  const changePct = data?.change_pct ?? null
  const isPositive = changePct !== null && changePct >= 0

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('productsTrend.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('productsTrend.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <ScopeFilterFields filter={scopeFilter} />
        </Box>
      </Box>

      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t('productsTrend.currentAvg')}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {isLoading ? '—' : (data?.current_avg ?? '—')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('productsTrend.categoriesPerCustomer')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t('productsTrend.prevAvg')}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {isLoading ? '—' : (data?.prev_avg ?? '—')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('productsTrend.categoriesPerCustomer')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t('productsTrend.change')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
              {isLoading ? (
                <Typography variant="h4" sx={{ fontWeight: 700 }}>—</Typography>
              ) : (
                <>
                  {changePct !== null && (
                    isPositive ? (
                      <TrendingUpIcon color="success" />
                    ) : (
                      <TrendingDownIcon color="error" />
                    )
                  )}
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: isPositive ? 'success.main' : 'error.main' }}
                  >
                    {changePct !== null ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%` : '—'}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Trend Chart */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('productsTrend.chartTitle')}
          </Typography>
          <Chip
            label={t('productsTrend.m2Label')}
            size="small"
            color="info"
            variant="outlined"
          />
        </Box>
        <AreaChartWidget
          title=""
          data={data?.trend ?? []}
          series={[{ key: 'avg_category', label: t('productsTrend.seriesLabel'), color: theme.palette.primary.main }]}
          xKey="month"
          height={320}
        />
      </Paper>
    </Box>
  )
}