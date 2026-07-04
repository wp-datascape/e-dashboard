import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@mui/material/styles'
import { Dialog } from '@/components/ui'
import { useImportErrors } from '@/hooks/useImport'
import type { ImportLog } from '@/types/import'

interface ErrorDetailDialogProps {
  log: ImportLog | null
  onClose: () => void
}

export function ErrorDetailDialog({ log, onClose }: ErrorDetailDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const mono = theme.typography.caption.fontFamily
  const { data, isLoading } = useImportErrors(log?.id ?? null)

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
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 60 }}>{t('import.errorDetail.colRow')}</TableCell>
              <TableCell>{t('import.errorDetail.colData')}</TableCell>
              <TableCell>{t('import.errorDetail.colError')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data as Array<{ id: number; row_number: number; raw_data: string; error_message: string }>).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.row_number}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: mono, wordBreak: 'break-all' }}>
                    {row.raw_data}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="error.main">{row.error_message}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Dialog>
  )
}
