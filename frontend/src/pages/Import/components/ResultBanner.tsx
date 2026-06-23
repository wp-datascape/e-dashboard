import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import type { ImportResult } from '@/types/import'

interface ResultBannerProps {
  result: ImportResult
  onClose: () => void
}

export function ResultBanner({ result, onClose }: ResultBannerProps) {
  const { t } = useTranslation()
  const severity = result.status === 'success' ? 'success' : result.status === 'partial' ? 'warning' : 'error'
  return (
    <Alert severity={severity} onClose={onClose}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t(`import.result.${result.status}`)}
      </Typography>
      <Typography variant="caption">
        {t('import.result.summary', {
          total: result.total_invoices,
          success: result.success_invoices,
          errors: result.error_rows,
        })}
      </Typography>
      {result.error_summary && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
          {result.error_summary}
        </Typography>
      )}
    </Alert>
  )
}