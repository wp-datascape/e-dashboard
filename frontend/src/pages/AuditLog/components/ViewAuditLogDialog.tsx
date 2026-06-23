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
import { api } from '@/api/axios'
import { Dialog } from '@/components/ui/Dialog'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { AuditLog } from '@/types/audit'

interface Props {
  open: boolean
  onClose: () => void
  logId: number | null
}

const getActionColor = (action: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    'invoice.import': 'primary', 'user.create': 'success', 'user.update': 'info',
    'user.delete': 'error', 'role.create': 'success', 'role.update': 'info',
    'role.delete': 'error', 'permission.assign': 'primary', 'permission.revoke': 'warning',
    'user_role.assign': 'primary', 'user_role.revoke': 'warning',
    'config.update': 'info', 'category.update': 'info',
  }
  return map[action] ?? 'default'
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

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
  const mono = theme.typography.caption.fontFamily

  if (!oldData && !newData) return null
  const allKeys = [...new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])]

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 140 }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Old Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>New Value</TableCell>
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
      title="Detail Audit Log"
      maxWidth="md"
      actions={[{ label: 'Tutup', onClick: onClose, variant: 'text' }]}
    >
      {isLoading && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">Memuat...</Typography></Box>}
      {isError && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="error">{error instanceof Error ? error.message : 'Gagal memuat data'}</Typography></Box>}
      {!isLoading && !isError && !log && <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">Tidak ada data</Typography></Box>}

      {log && (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 0.25 }}>{log.entity_key}</Typography>
              <Typography variant="caption" color="text.secondary">{fmtDate(log.created_at)}</Typography>
            </Box>
            <StatusChip label={log.action} color={getActionColor(log.action)} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Pelaku</Typography><Typography variant="body2">{log.actor?.name ?? '—'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tabel</Typography><Chip label={log.entity} size="small" variant="outlined" /></Box>
            {log.ip_address && <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>IP</Typography><Typography variant="body2">{log.ip_address}</Typography></Box>}
          </Stack>

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
            Perubahan Data
          </Typography>
          <DiffTable oldData={log.old_value ?? null} newData={log.new_value ?? null} />

          {log.meta && (
            <>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Meta</Typography>
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