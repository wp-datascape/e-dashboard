import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { Dialog } from '@/components/ui/Dialog'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { ActivityLog } from '@/types/activityLog'
import { getApiErrorMessage } from '@/utils/apiError'

interface Props {
  open: boolean
  onClose: () => void
  logId: number | null
}

const getMethodColor = (method: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'error',
    PAGE_VIEW: 'primary',
  }
  return map[method] ?? 'default'
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value || '—'}</Typography>
    </Box>
  )
}

export function ViewActivityLogDialog({ open, onClose, logId }: Props) {
  const { t } = useTranslation()
  const { data: log, isLoading, isError, error } = useQuery({
    queryKey: ['activityLog', logId],
    queryFn: async () => {
      const res = await api.get<{ message: string; data: ActivityLog }>(`/activity-logs/${logId}`)
      return res.data.data
    },
    enabled: !!logId,
    retry: 1,
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('activityLog.dialog.title')}
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
              <Typography variant="h6" sx={{ mb: 0.25, wordBreak: 'break-all' }}>{log.path}</Typography>
              <Typography variant="caption" color="text.secondary">{fmtDate(log.created_at)}</Typography>
            </Box>
            <StatusChip label={log.method} color={getMethodColor(log.method)} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Field label={t('activityLog.dialog.user')} value={log.user?.name ?? ''} />
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('activityLog.dialog.module')}</Typography><Chip label={log.module ?? '—'} size="small" variant="outlined" /></Box>
            <Field label={t('activityLog.dialog.statusCode')} value={log.status_code != null ? String(log.status_code) : ''} />
            <Field label={t('activityLog.dialog.durationMs')} value={log.duration_ms != null ? `${log.duration_ms} ms` : ''} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Field label={t('activityLog.dialog.ip')} value={log.ip_address ?? ''} />
            <Field label={t('activityLog.dialog.requestId')} value={log.request_id ?? ''} />
          </Stack>

          <Field label={t('activityLog.dialog.userAgent')} value={log.user_agent ?? ''} />
        </Stack>
      )}
    </Dialog>
  )
}
