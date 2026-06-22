// src/pages/Import/index.tsx
import { useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { useTheme } from '@mui/material/styles'
import { Button } from '@/components/ui'
import { StatusChip } from '@/components/ui/StatusChip'
import { useImportLogs, useImportErrors, useImportFile, useImportAccurate, useCompanies } from '@/hooks/useImport'
import type { ImportLog, ImportResult } from '@/types/import'
import type { Company } from '@/types/users'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusIcon({ status }: { status: ImportLog['status'] }) {
  if (status === 'success') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
  if (status === 'failed')  return <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />
  return <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
}

// ─── Shared: company + period selectors ──────────────────────────────────────

function CompanyPeriodFields({
  companies,
  companyId,
  periodMonth,
  onCompany,
  onPeriod,
}: {
  companies: Company[]
  companyId: number | ''
  periodMonth: string
  onCompany: (v: number) => void
  onPeriod: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth size="small">
          <InputLabel>{t('import.form.company')}</InputLabel>
          <Select
            value={companyId}
            label={t('import.form.company')}
            onChange={e => onCompany(e.target.value as number)}
          >
            {companies.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('import.form.period')}
          </Typography>
          <input
            type="month"
            value={periodMonth}
            onChange={e => onPeriod(e.target.value)}
            style={{
              height: 40, padding: '0 14px', border: '1px solid rgba(0,0,0,0.23)',
              fontSize: '0.875rem', background: 'transparent', color: 'inherit',
              outline: 'none', width: '100%', boxSizing: 'border-box', borderRadius: 0,
            }}
          />
        </Box>
      </Grid>
    </Grid>
  )
}

// ─── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({ result, onClose }: { result: ImportResult; onClose: () => void }) {
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

// ─── Card 1: Upload File ──────────────────────────────────────────────────────

function UploadFileCard({ companies }: { companies: Company[] }) {
  const { t } = useTranslation()
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate, isPending } = useImportFile()

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) { setError(t('import.form.errorFormat')); return }
    if (f.size > 10 * 1024 * 1024) { setError(t('import.form.errorSize')); return }
    setFile(f)
    setError(null)
  }

  const handleSubmit = () => {
    setError(null)
    setResult(null)
    if (!companyId) { setError(t('import.form.errorCompany')); return }
    if (!periodMonth) { setError(t('import.form.errorPeriod')); return }
    if (!file) { setError(t('import.form.errorFile')); return }

    mutate(
      { file, company_id: companyId as number, period_month: periodMonth },
      {
        onSuccess: r => { setResult(r.data); setFile(null) },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setError(msg ?? t('import.form.errorGeneric'))
        },
      },
    )
  }

  return (
    <Card sx={{ p: 3, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
          <UploadFileIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {t('import.file.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('import.file.subtitle')}
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
        />

        {/* Dropzone */}
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : file ? 'success.main' : 'divider',
              bgcolor: dragOver ? 'action.hover' : 'background.default',
              p: 3, textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.15s, background-color 0.15s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            {file ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <InsertDriveFileIcon color="success" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({(file.size / 1024).toFixed(0)} KB)
                </Typography>
              </Box>
            ) : (
              <>
                <UploadFileIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('import.form.dropzone')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('import.form.dropzoneHint')}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {result && <ResultBanner result={result} onClose={() => setResult(null)} />}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
        >
          {isPending ? t('import.form.loading') : t('import.file.submit')}
        </Button>
      </Stack>
    </Card>
  )
}

// ─── Card 2: Accurate API Sync ────────────────────────────────────────────────

function AccurateApiCard({ companies }: { companies: Company[] }) {
  const { t } = useTranslation()
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useImportAccurate()

  const handleSubmit = () => {
    setError(null)
    setResult(null)
    if (!companyId) { setError(t('import.form.errorCompany')); return }
    if (!periodMonth) { setError(t('import.form.errorPeriod')); return }

    mutate(
      { company_id: companyId as number, period_month: periodMonth },
      {
        onSuccess: r => setResult(r.data),
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setError(msg ?? t('import.form.errorGeneric'))
        },
      },
    )
  }

  return (
    <Card sx={{ p: 3, height: '100%' }}>
      {/* Header */}
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
        />

        <Alert severity="info" sx={{ py: 1 }}>
          <Typography variant="caption">{t('import.accurate.info')}</Typography>
        </Alert>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {result && <ResultBanner result={result} onClose={() => setResult(null)} />}

        <Button
          variant="outlined"
          onClick={handleSubmit}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
        >
          {isPending ? t('import.form.loading') : t('import.accurate.submit')}
        </Button>
      </Stack>
    </Card>
  )
}

// ─── Error Detail Dialog ──────────────────────────────────────────────────────

function ErrorDetailDialog({ log, onClose }: { log: ImportLog | null; onClose: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const mono = theme.typography.caption.fontFamily
  const { data, isLoading } = useImportErrors(log?.id ?? null)

  return (
    <Dialog open={!!log} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('import.errorDetail.title')}
        {log && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {log.filename ?? 'Accurate API'} — {log.period_month}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : !data?.data?.length ? (
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
              {data.data.map(row => (
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Import Logs Table ────────────────────────────────────────────────────────

function ImportLogsTable() {
  const { t } = useTranslation()
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null)
  const { data, isLoading } = useImportLogs()
  const logs = data?.data ?? []

  const statusColor = (s: ImportLog['status']) =>
    s === 'success' ? 'success' : s === 'partial' ? 'warning' : 'error'

  return (
    <Card>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('import.logs.title')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('import.logs.subtitle')}</Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">{t('import.logs.empty')}</Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('import.logs.colDate')}</TableCell>
                <TableCell>{t('import.logs.colCompany')}</TableCell>
                <TableCell>{t('import.logs.colSource')}</TableCell>
                <TableCell>{t('import.logs.colFile')}</TableCell>
                <TableCell>{t('import.logs.colPeriod')}</TableCell>
                <TableCell>{t('import.logs.colStatus')}</TableCell>
                <TableCell align="right">{t('import.logs.colTotal')}</TableCell>
                <TableCell align="right">{t('import.logs.colSuccess')}</TableCell>
                <TableCell align="right">{t('import.logs.colErrors')}</TableCell>
                <TableCell>{t('import.logs.colBy')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="caption">{formatDate(log.created_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.company.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      label={log.source === 'file' ? 'File' : 'Accurate'}
                      color={log.source === 'file' ? 'primary' : 'info'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {log.filename ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.period_month}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <StatusIcon status={log.status} />
                      <StatusChip
                        label={t(`import.status.${log.status}`)}
                        color={statusColor(log.status)}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {log.total_invoices.toLocaleString('id-ID')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                      {log.success_invoices.toLocaleString('id-ID')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {log.error_rows > 0 ? (
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={() => setSelectedLog(log)}
                      >
                        {log.error_rows}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">0</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{log.imported_by.name}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <ErrorDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { t } = useTranslation()

  const { data: companies = [] } = useCompanies()

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('import.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('import.subtitle')}</Typography>

      <Stack spacing={3}>
        {/* Dua metode import berdampingan */}
        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <UploadFileCard companies={companies} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <AccurateApiCard companies={companies} />
          </Grid>
        </Grid>

        <ImportLogsTable />
      </Stack>
    </Box>
  )
}
