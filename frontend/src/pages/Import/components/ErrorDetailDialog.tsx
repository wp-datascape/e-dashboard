import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@mui/material/styles'
import { Dialog } from '@/components/ui'
import { CardResponsive, type CardResponsiveColumn } from '@/components/tables/CardResponsive'
import { useImportErrors } from '@/hooks/useImport'
import type { ImportLog } from '@/types/import'

interface ErrorDetailDialogProps {
  log: ImportLog | null
  onClose: () => void
}

interface ImportErrorRow {
  id: number
  row_number: number
  raw_data: string
  error_message: string
}

export function ErrorDetailDialog({ log, onClose }: ErrorDetailDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const mono = theme.typography.caption.fontFamily
  const { data, isLoading } = useImportErrors(log?.id ?? null)

  const columns: CardResponsiveColumn<ImportErrorRow>[] = [
    { key: 'row_number', header: t('import.errorDetail.colRow'), width: '90px', render: (row) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('import.errorDetail.colRow')} {row.row_number}</Typography> },
    { key: 'raw_data', header: t('import.errorDetail.colData'), render: (row) => <Typography variant="caption" sx={{ fontFamily: mono, wordBreak: 'break-all' }}>{row.raw_data}</Typography> },
    { key: 'error_message', header: t('import.errorDetail.colError'), render: (row) => <Typography variant="caption" color="error.main">{row.error_message}</Typography> },
  ]

  return (
    <Dialog
      open={!!log}
      onClose={onClose}
      maxWidth="md"
      title={t('import.errorDetail.title')}
      subtitle={log && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {log.filename ?? t('import.errorDetail.accurateFallback')} — {log.period_month}
        </Typography>
      )}
      actions={[{ label: t('common.close'), onClick: onClose, variant: 'text' }]}
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : !data?.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t('import.errorDetail.noErrors')}
        </Typography>
      ) : (
        <CardResponsive
          rows={data as ImportErrorRow[]}
          columns={columns}
          getRowId={(row) => row.id}
          renderMobileDetails={(row) => (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('import.errorDetail.colData')}</Typography>
                <Typography variant="caption" sx={{ fontFamily: mono, wordBreak: 'break-all' }}>{row.raw_data}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('import.errorDetail.colError')}</Typography>
                <Typography variant="caption" color="error.main">{row.error_message}</Typography>
              </Box>
            </Box>
          )}
        />
      )}
    </Dialog>
  )
}
