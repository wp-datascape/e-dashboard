import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DownloadIcon from '@mui/icons-material/Download'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { Card, Button, ProgressBar } from '@/components/ui'
import { useImportFileProgress } from '@/hooks/useImport'
import { useCan } from '@/hooks/useCan'
import { channelDivisionsApi } from '@/api/channelDivisions.api'
import { importClassificationRules, downloadClassificationTemplate } from '@/api/classification.api'
import { downloadFakturTemplate } from '@/api/import.api'
import { CompanyPeriodFields } from './CompanyPeriodFields'
import { ResultBanner } from './ResultBanner'
import type { Company } from '@/types/users'

type ImportType = 'faktur' | 'divisi' | 'klasifikasi'

interface MasterImportResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

interface UploadFileCardProps {
  companies: Company[]
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
}

export function UploadFileCard({ companies, disabled = false, onPendingChange }: UploadFileCardProps) {
  const { t } = useTranslation()
  const can = useCan()
  const { enqueueSnackbar } = useSnackbar()
  const qc = useQueryClient()

  const [importType, setImportType] = useState<ImportType>('faktur')
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [masterResult, setMasterResult] = useState<MasterImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Faktur SSE import ──
  const { phase, progress, result, errorMessage, mutate: mutateFaktur, reset, isPending: isFakturPending } = useImportFileProgress()

  // ── Master data mutations ──
  const divisiMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      channelDivisionsApi.importCsv(file, companyId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['channel-divisions'] })
      setMasterResult(res)
      enqueueSnackbar(`Import Divisi: ${res.added} ditambahkan, ${res.skipped} di-skip`, {
        variant: res.errors.length > 0 ? 'warning' : 'success',
      })
      setFile(null)
    },
    onError: () => enqueueSnackbar('Gagal import Channel Divisions', { variant: 'error' }),
  })

  const klasifikasiMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      importClassificationRules(file, companyId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classification-rules'] })
      setMasterResult(res)
      enqueueSnackbar(`Import Klasifikasi: ${res.added} ditambahkan, ${res.skipped} di-skip`, {
        variant: res.errors.length > 0 ? 'warning' : 'success',
      })
      setFile(null)
    },
    onError: () => enqueueSnackbar('Gagal import Klasifikasi', { variant: 'error' }),
  })

  const isMasterPending = divisiMutation.isPending || klasifikasiMutation.isPending
  const isPending = isFakturPending || isMasterPending
  const isDisabled = isPending || disabled

  useEffect(() => { onPendingChange?.(isPending) }, [isPending, onPendingChange])

  // Reset when switching type
  const handleTypeChange = (type: ImportType) => {
    setImportType(type)
    setFile(null)
    setFormError(null)
    setMasterResult(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (f: File | null) => {
    if (isDisabled || !f) return
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) { setFormError(t('import.form.errorFormat')); return }
    if (f.size > 10 * 1024 * 1024) { setFormError(t('import.form.errorSize')); return }
    setFile(f)
    setFormError(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      if (importType === 'faktur') await downloadFakturTemplate()
      else if (importType === 'divisi') await channelDivisionsApi.downloadTemplate()
      else await downloadClassificationTemplate()
    } catch {
      enqueueSnackbar('Gagal download template', { variant: 'error' })
    }
  }

  const handleSubmit = () => {
    if (isDisabled) return
    setFormError(null)
    setMasterResult(null)

    if (!companyId) { setFormError(t('import.form.errorCompany')); return }

    if (importType === 'faktur') {
      reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (!periodMonth) { setFormError(t('import.form.errorPeriod')); return }
      if (!file) { setFormError(t('import.form.errorFile')); return }
      void mutateFaktur({ file, company_id: companyId as number, period_month: periodMonth })
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (phase === 'done') setFile(null)
    } else {
      if (!file) { setFormError(t('import.form.errorFile')); return }
      if (importType === 'divisi') divisiMutation.mutate({ file, companyId: companyId as number })
      else klasifikasiMutation.mutate({ file, companyId: companyId as number })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCloseResult = () => { reset(); setFile(null) }

  return (
    <Card sx={{ p: 3, height: '100%', opacity: disabled && !isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
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
        {/* ── Import type + download template ── */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipe Import</InputLabel>
            <Select
              value={importType}
              label="Tipe Import"
              disabled={isDisabled}
              onChange={(e) => handleTypeChange(e.target.value as ImportType)}
            >
              <MenuItem value="faktur">Faktur Invoice</MenuItem>
              <MenuItem value="divisi">Channel Divisions</MenuItem>
              <MenuItem value="klasifikasi">Klasifikasi Item</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            disabled={isDisabled}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Template
          </Button>
        </Box>

        {/* ── Company (semua tipe) + Period (hanya faktur) ── */}
        {importType === 'faktur' ? (
          <CompanyPeriodFields
            companies={companies}
            companyId={companyId}
            periodMonth={periodMonth}
            onCompany={setCompanyId}
            onPeriod={setPeriodMonth}
            disabled={isDisabled}
          />
        ) : (
          <FormControl size="small" fullWidth>
            <InputLabel>{t('import.form.company')}</InputLabel>
            <Select
              value={companyId}
              label={t('import.form.company')}
              disabled={isDisabled}
              onChange={(e) => setCompanyId(e.target.value as number)}
            >
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* ── File dropzone ── */}
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <Box
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            onDragOver={e => { if (!isDisabled) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            sx={{
              border: '2px dashed',
              borderColor: isDisabled ? 'action.disabledBackground' : dragOver ? 'primary.main' : file ? 'success.main' : 'divider',
              bgcolor: dragOver && !isDisabled ? 'action.hover' : 'background.default',
              p: 3, textAlign: 'center',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s, background-color 0.15s',
              '&:hover': !isDisabled ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
            }}
          >
            {file ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <InsertDriveFileIcon color={isDisabled ? 'disabled' : 'success'} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: isDisabled ? 'text.disabled' : 'inherit' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({(file.size / 1024).toFixed(0)} KB)
                </Typography>
              </Box>
            ) : (
              <>
                <UploadFileIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: isDisabled ? 'text.disabled' : 'inherit' }}>
                  {t('import.form.dropzone')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('import.form.dropzoneHint')}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* ── Progress faktur ── */}
        {importType === 'faktur' && (phase === 'uploading' || phase === 'processing') && (
          <Box>
            <ProgressBar
              total={progress.total}
              success={progress.success}
              error={progress.errors}
              status={phase === 'uploading' ? 'loading' : undefined}
              size="sm"
              showLabel={false}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
              {phase === 'uploading'
                ? t('import.form.loading')
                : `${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()} baris`}
            </Typography>
          </Box>
        )}

        {/* ── Hasil master data import ── */}
        {masterResult && (
          <Alert
            severity={masterResult.errors.length > 0 ? 'warning' : 'success'}
            onClose={() => setMasterResult(null)}
          >
            {masterResult.added} data ditambahkan, {masterResult.skipped} di-skip
            {masterResult.errors.length > 0 && (
              <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                {masterResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}><Typography variant="caption">Baris {e.row}: {e.message}</Typography></li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        {formError && (
          <Alert severity="error" onClose={() => setFormError(null)}>{formError}</Alert>
        )}
        {importType === 'faktur' && phase === 'error' && errorMessage && (
          <Alert severity="error" onClose={reset}>{errorMessage}</Alert>
        )}
        {importType === 'faktur' && phase === 'done' && result && (
          <ResultBanner result={result} onClose={handleCloseResult} />
        )}

        {can('config.import:import') && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isDisabled}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            {isPending ? t('import.form.loading') : t('import.file.submit')}
          </Button>
        )}
      </Stack>
    </Card>
  )
}
