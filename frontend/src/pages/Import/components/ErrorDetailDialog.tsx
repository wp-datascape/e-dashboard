import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@mui/material/styles'
import type { GridColDef } from '@mui/x-data-grid'
import { Dialog } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
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

  const columns: GridColDef[] = [
    {
      field: 'row_number', headerName: t('import.errorDetail.colRow'), width: 90,
      // Title card mobile pakai renderCell ini juga (AutoCard) - tampilkan
      // "Baris N", bukan cuma angka mentah, supaya jelas tanpa label kolom.
      renderCell: ({ value }) => `${t('import.errorDetail.colRow')} ${value}`,
    },
    {
      field: 'raw_data', headerName: t('import.errorDetail.colData'), flex: 1.5, minWidth: 200, sortable: false,
      renderCell: ({ value }) => <Typography variant="caption" sx={{ fontFamily: mono, wordBreak: 'break-all' }}>{value as string}</Typography>,
    },
    {
      field: 'error_message', headerName: t('import.errorDetail.colError'), flex: 1, minWidth: 160, sortable: false,
      renderCell: ({ value }) => <Typography variant="caption" color="error.main">{value as string}</Typography>,
    },
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
        <ResponsiveListView
          rows={data as Array<{ id: number; row_number: number; raw_data: string; error_message: string }>}
          columns={columns}
          mobileFields={['row_number', 'raw_data', 'error_message']}
          height={Math.min(400, 100 + data.length * 60)}
        />
      )}
    </Dialog>
  )
}
