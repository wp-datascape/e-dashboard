import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { ProgressBar } from '@/components/ui'
import type { ImportResult } from '@/types/import'

interface ResultBannerProps {
  result: ImportResult
  onClose: () => void
}

export function ResultBanner({ result, onClose }: ResultBannerProps) {
  const { t } = useTranslation()
  const severity =
    result.status === 'success' ? 'success' : result.status === 'partial' ? 'warning' : 'error'

  return (
    <Alert severity={severity} onClose={onClose}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t(`import.result.${result.status}`)}
      </Typography>
      <ProgressBar
        total={result.total_invoices}
        success={result.success_invoices}
        error={result.error_rows}
        status={result.status}
        size="sm"
        showLabel
        sx={{ mb: 0.75 }}
      />
      {result.error_summary && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {result.error_summary}
        </Typography>
      )}
    </Alert>
  )
}
