import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import SyncIcon from '@mui/icons-material/Sync'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { Button } from '@/components/ui'
import { useImportAccurate } from '@/hooks/useImport'
import { useCan } from '@/hooks/useCan'
import { CompanyPeriodFields } from './CompanyPeriodFields'
import { ResultBanner } from './ResultBanner'
import type { Company } from '@/types/users'
import type { ImportResult } from '@/types/import'

interface AccurateApiCardProps {
  companies: Company[]
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
}

export function AccurateApiCard({ companies, disabled = false, onPendingChange }: AccurateApiCardProps) {
  const { t } = useTranslation()
  const can = useCan()
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useImportAccurate()

  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  const isDisabled = isPending || disabled

  const handleSubmit = () => {
    if (isDisabled) return
    setError(null)
    setResult(null)
    if (!companyId) { setError(t('import.form.errorCompany')); return }
    if (!periodMonth) { setError(t('import.form.errorPeriod')); return }

    mutate(
      { company_id: companyId as number, period_month: periodMonth },
      {
        onSuccess: (r: { data: ImportResult }) => setResult(r.data),
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setError(msg ?? t('import.form.errorGeneric'))
        },
      },
    )
  }

  return (
    <Card sx={{ p: 3, height: '100%', opacity: disabled && !isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ p: 1, bgcolor: 'secondary.main', color: 'secondary.contrastText', display: 'flex' }}>
          <SyncIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {t('import.accurate.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('import.accurate.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      <Stack spacing={2.5}>
        <CompanyPeriodFields
          companies={companies}
          companyId={companyId}
          periodMonth={periodMonth}
          onCompany={setCompanyId}
          onPeriod={setPeriodMonth}
          disabled={isDisabled}
        />

        <Alert severity="info" sx={{ py: 1 }}>
          <Typography variant="caption">{t('import.accurate.info')}</Typography>
        </Alert>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {result && <ResultBanner result={result} onClose={() => setResult(null)} />}

        {can('config.import:import') && (
          <Button
            variant="outlined"
            onClick={handleSubmit}
            disabled={isDisabled}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          >
            {isPending ? t('import.form.loading') : t('import.accurate.submit')}
          </Button>
        )}
      </Stack>
    </Card>
  )
}
