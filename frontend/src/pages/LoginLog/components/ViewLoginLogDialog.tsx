import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { Dialog } from '@/components/ui/Dialog'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { LoginLog } from '@/types/loginLog'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatDateTimeDDMMYYYY } from '@/utils/date'

interface Props {
  open: boolean
  onClose: () => void
  logId: number | null
}

const getEventColor = (event: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    login_success: 'success',
    login_failed: 'error',
    logout: 'info',
    password_changed: 'warning',
    role_changed: 'primary',
    account_locked: 'error',
  }
  return map[event] ?? 'default'
}

const fmtDate = formatDateTimeDDMMYYYY

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value || '—'}</Typography>
    </Box>
  )
}

export function ViewLoginLogDialog({ open, onClose, logId }: Props) {
  const { t } = useTranslation()
  const { data: log, isLoading, isError, error } = useQuery({
    queryKey: ['loginLog', logId],
    queryFn: async () => {
      const res = await api.get<{ message: string; data: LoginLog }>(`/login-logs/${logId}`)
      return res.data.data
    },
    enabled: !!logId,
    retry: 1,
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('loginLog.dialog.title')}
      maxWidth="sm"
      actions={[{ label: t('common.close'), onClick: onClose, variant: 'text' }]}
    >
      {isLoading && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography></Box>}
      {isError && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="error">{getApiErrorMessage(error, t)}</Typography></Box>}
      {!isLoading && !isError && !log && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography></Box>}

      {log && (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 0.25 }}>{log.email || log.user?.name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{fmtDate(log.created_at)}</Typography>
            </Box>
            <StatusChip label={t(`loginLog.events.${log.event}`, { defaultValue: log.event })} color={getEventColor(log.event)} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Field label={t('loginLog.dialog.user')} value={log.user?.name ?? ''} />
            <Field label={t('loginLog.dialog.reason')} value={log.reason ? t(`loginLog.reasons.${log.reason}`, { defaultValue: log.reason }) : ''} />
            <Field label={t('loginLog.dialog.ip')} value={log.ip_address ?? ''} />
          </Stack>

          <Field label={t('loginLog.dialog.userAgent')} value={log.user_agent ?? ''} />
        </Stack>
      )}
    </Dialog>
  )
}
