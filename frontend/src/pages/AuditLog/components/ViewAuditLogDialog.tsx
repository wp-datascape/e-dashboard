import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { Dialog } from '@/components/ui/Dialog'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { AuditLog } from '@/types/audit'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatDateTimeID } from '@/utils/date'

interface Props {
  open: boolean
  onClose: () => void
  logId: number | null
}

const getActionColor = (action: string): StatusChipColor => {
  const verb = action.split('.').pop() ?? ''
  const map: Record<string, StatusChipColor> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    import: 'primary',
    assign: 'primary',
    revoke: 'warning',
    deactivate: 'warning',
  }
  return map[verb] ?? 'default'
}

// Format Indonesia dd-mm-yyyy — dipusatkan di utils/date.ts (2026-08-19)
const fmtDate = formatDateTimeID

function toVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) {
    return v.map(i => {
      if (typeof i === 'object' && i !== null) {
        const obj = i as Record<string, unknown>
        // roles: [{id, name}] → "superadmin, admin"
        // companies: [{id, code, name}] → "PT MKO, PT ABC"
        return String(obj.name ?? obj.code ?? '')
      }
      return String(i)
    }).filter(Boolean).join(', ')
  }
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function DiffTable({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const mono = theme.typography.caption.fontFamily

  if (!oldData && !newData) return null
  const allKeys = [...new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])]

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 140 }}>{t('auditLog.dialog.colField')}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t('auditLog.dialog.colOldValue')}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t('auditLog.dialog.colNewValue')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allKeys.map(key => {
            const oldVal = toVal(oldData?.[key])
            const newVal = toVal(newData?.[key])
            const changed = oldVal !== newVal
            return (
              <TableRow key={key} sx={changed ? { bgcolor: theme.palette.action.hover } : undefined}>
                <TableCell sx={{ fontWeight: 600, fontFamily: mono }}>{key}</TableCell>
                <TableCell sx={{ color: changed ? theme.palette.warning.main : 'text.primary', fontFamily: mono, fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {oldVal}
                </TableCell>
                <TableCell sx={{ color: changed ? theme.palette.success.main : undefined, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {newVal}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function ViewAuditLogDialog({ open, onClose, logId }: Props) {
  const { t } = useTranslation()
  const { data: log, isLoading, isError, error } = useQuery({
    queryKey: ['auditLog', logId],
    queryFn: async () => {
      const res = await api.get<{ message: string; data: AuditLog }>(`/audit-logs/${logId}`)
      return res.data.data
    },
    enabled: !!logId,
    retry: 1,
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('auditLog.dialog.title')}
      maxWidth="md"
      actions={[{ label: t('common.close'), onClick: onClose, variant: 'text' }]}
    >
      {isLoading && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography></Box>}
      {isError && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="error">{getApiErrorMessage(error, t)}</Typography></Box>}
      {!isLoading && !isError && !log && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography></Box>}

      {log && (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 0.25 }}>{log.entity_key}</Typography>
              <Typography variant="caption" color="text.secondary">{fmtDate(log.created_at)}</Typography>
            </Box>
            <StatusChip
              label={t(`auditLog.actions.${log.action}`, { defaultValue: log.action })}
              color={getActionColor(log.action)}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('auditLog.dialog.actor')}</Typography><Typography variant="body2">{log.actor?.name ?? '—'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('auditLog.dialog.table')}</Typography><Chip label={log.entity} size="small" variant="outlined" /></Box>
            {log.ip_address && <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('auditLog.dialog.ip')}</Typography><Typography variant="body2">{log.ip_address}</Typography></Box>}
          </Stack>

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
            {t('auditLog.dialog.dataChanges')}
          </Typography>
          <DiffTable oldData={log.old_value ?? null} newData={log.new_value ?? null} />

          {log.meta && (
            <>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>{t('auditLog.dialog.meta')}</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(log.meta, null, 2)}
              </Paper>
            </>
          )}
        </Stack>
      )}
    </Dialog>
  )
}