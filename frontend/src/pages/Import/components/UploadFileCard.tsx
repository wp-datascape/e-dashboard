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
import TextField from '@mui/material/TextField'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DownloadIcon from '@mui/icons-material/Download'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { Card, Button } from '@/components/ui'
import { useCan } from '@/hooks/useCan'
import { usersKeys } from '@/hooks/useUsers'
import { channelDivisionsApi } from '@/api/channelDivisions.api'
import { importClassificationRules, downloadClassificationTemplate } from '@/api/classification.api'
import { downloadFakturTemplate, previewFakturImport } from '@/api/import.api'
import { usersApi } from '@/api/users.api'
import { highMarginApi } from '@/api/highMargin.api'
import { CompanyPeriodFields } from './CompanyPeriodFields'
import { HighMarginImportReview } from './HighMarginImportReview'
import { FakturImportReview } from './FakturImportReview'
import type { Company } from '@/types/users'
import type { HighMarginImportPreviewResult } from '@/types/highMargin'
import type { FakturImportPreviewResult } from '@/types/import'

type ImportType = 'faktur' | 'divisi' | 'klasifikasi' | 'user' | 'high_margin'

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
  const [defaultPassword, setDefaultPassword] = useState('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [masterResult, setMasterResult] = useState<MasterImportResult | null>(null)
  // hmPreview (task036, 2026-08-31) — tahap preview mapping High Margin,
  // BEDA dari 3 tipe master data lain (masterResult) yang commit langsung.
  // Terisi setelah upload berhasil di-parse+validasi, TABEL REVIEW muncul
  // menggantikan dropzone+tombol submit sampai user selesai (Terapkan/Batal).
  const [hmPreview, setHmPreview] = useState<HighMarginImportPreviewResult | null>(null)
  // fakturPreview (task037/EDASHBOARD-588) — tahap preview import Faktur,
  // pola SAMA persis dgn hmPreview di atas: terisi setelah upload berhasil
  // di-parse+deteksi konflik, TABEL REVIEW (FakturImportReview) muncul
  // menggantikan dropzone+tombol submit sampai user selesai (Terapkan/Batal).
  const [fakturPreview, setFakturPreview] = useState<FakturImportPreviewResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Master data mutations ──
  const divisiMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      channelDivisionsApi.importCsv(file, companyId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['channel-divisions'] })
      setMasterResult(res)
      enqueueSnackbar(t('import.form.snackbarDivisiSuccess', { added: res.added, skipped: res.skipped }), {
        variant: res.errors.length > 0 ? 'warning' : 'success',
      })
      setFile(null)
    },
    onError: () => enqueueSnackbar(t('import.form.snackbarDivisiError'), { variant: 'error' }),
  })

  const klasifikasiMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      importClassificationRules(file, companyId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classification-rules'] })
      setMasterResult(res)
      enqueueSnackbar(t('import.form.snackbarKlasifikasiSuccess', { added: res.added, skipped: res.skipped }), {
        variant: res.errors.length > 0 ? 'warning' : 'success',
      })
      setFile(null)
    },
    onError: () => enqueueSnackbar(t('import.form.snackbarKlasifikasiError'), { variant: 'error' }),
  })

  const userMutation = useMutation({
    mutationFn: ({ file, defaultPassword }: { file: File; defaultPassword: string }) =>
      usersApi.importUsers(file, defaultPassword),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: usersKeys.all })
      setMasterResult(res)
      enqueueSnackbar(t('import.form.snackbarUserSuccess', { added: res.added, skipped: res.skipped }), {
        variant: res.errors.length > 0 ? 'warning' : 'success',
      })
      setFile(null)
      setDefaultPassword('')
    },
    onError: () => enqueueSnackbar(t('import.form.snackbarUserError'), { variant: 'error' }),
  })

  // ── High Margin import: tahap preview (task036) ──
  const hmPreviewMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      highMarginApi.previewImport(file, companyId),
    onSuccess: (res) => {
      setHmPreview(res)
      setFile(null)
    },
    onError: () => enqueueSnackbar(t('import.form.hmPreviewError'), { variant: 'error' }),
  })

  // ── Faktur import: tahap preview (task037/EDASHBOARD-588) ──
  const fakturPreviewMutation = useMutation({
    mutationFn: ({ file, companyId }: { file: File; companyId: number }) =>
      previewFakturImport(file, companyId),
    onSuccess: (res) => {
      setFakturPreview(res)
      setFile(null)
    },
    onError: () => enqueueSnackbar(t('import.form.hmPreviewError'), { variant: 'error' }),
  })

  const isPending = divisiMutation.isPending || klasifikasiMutation.isPending || userMutation.isPending || hmPreviewMutation.isPending || fakturPreviewMutation.isPending
  const isDisabled = isPending || disabled

  useEffect(() => { onPendingChange?.(isPending) }, [isPending, onPendingChange])

  // Reset when switching type
  const handleTypeChange = (type: ImportType) => {
    setImportType(type)
    setFile(null)
    setFormError(null)
    setMasterResult(null)
    setHmPreview(null)
    setFakturPreview(null)
    setDefaultPassword('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (f: File | null) => {
    if (isDisabled || !f) return
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) { setFormError(t('import.form.errorFormat')); return }
    if (f.size > 50 * 1024 * 1024) { setFormError(t('import.form.errorSize')); return }
    setFile(f)
    setFormError(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      if (importType === 'faktur') await downloadFakturTemplate()
      else if (importType === 'divisi') await channelDivisionsApi.downloadTemplate()
      else if (importType === 'user') await usersApi.downloadTemplate()
      else if (importType === 'high_margin') {
        // Template High Margin BEDA per company (sheet legend divisi ikut
        // company yang dipilih, task036.md) — TIDAK generik spt tipe lain.
        if (!companyId) { setFormError(t('import.form.errorCompany')); return }
        await highMarginApi.downloadImportTemplate(companyId as number)
      }
      else await downloadClassificationTemplate()
    } catch {
      enqueueSnackbar(t('import.form.snackbarTemplateError'), { variant: 'error' })
    }
  }

  const handleSubmit = () => {
    if (isDisabled) return
    setFormError(null)
    setMasterResult(null)

    // 'user' tidak butuh company_id tunggal — company (opsional, bisa banyak)
    // ditentukan per-baris lewat kolom company_code di template
    if (importType !== 'user' && !companyId) { setFormError(t('import.form.errorCompany')); return }

    if (importType === 'faktur') {
      if (!periodMonth) { setFormError(t('import.form.errorPeriod')); return }
      if (!file) { setFormError(t('import.form.errorFile')); return }
      fakturPreviewMutation.mutate({ file, companyId: companyId as number })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else if (importType === 'user') {
      if (!file) { setFormError(t('import.form.errorFile')); return }
      if (defaultPassword.length < 8) { setFormError(t('import.form.errorDefaultPassword')); return }
      userMutation.mutate({ file, defaultPassword })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else if (importType === 'high_margin') {
      if (!file) { setFormError(t('import.form.errorFile')); return }
      hmPreviewMutation.mutate({ file, companyId: companyId as number })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      if (!file) { setFormError(t('import.form.errorFile')); return }
      if (importType === 'divisi') divisiMutation.mutate({ file, companyId: companyId as number })
      else klasifikasiMutation.mutate({ file, companyId: companyId as number })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
            <InputLabel>{t('import.form.typeLabel')}</InputLabel>
            <Select
              value={importType}
              label={t('import.form.typeLabel')}
              disabled={isDisabled}
              onChange={(e) => handleTypeChange(e.target.value as ImportType)}
            >
              <MenuItem value="faktur">{t('import.form.typeFaktur')}</MenuItem>
              <MenuItem value="divisi">{t('import.form.typeDivisi')}</MenuItem>
              <MenuItem value="klasifikasi">{t('import.form.typeKlasifikasi')}</MenuItem>
              <MenuItem value="high_margin">{t('import.form.typeHighMargin')}</MenuItem>
              <MenuItem value="user">{t('import.form.typeUser')}</MenuItem>
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
            {t('import.form.templateButton')}
          </Button>
        </Box>

        {/* ── Company (faktur/divisi/klasifikasi) + Period (hanya faktur) + Default Password (hanya user) ── */}
        {importType === 'faktur' ? (
          <CompanyPeriodFields
            companies={companies}
            companyId={companyId}
            periodMonth={periodMonth}
            onCompany={setCompanyId}
            onPeriod={setPeriodMonth}
            disabled={isDisabled}
          />
        ) : importType === 'user' ? (
          <TextField
            size="small"
            fullWidth
            type="password"
            label={t('import.form.defaultPasswordLabel')}
            placeholder={t('import.form.defaultPasswordPlaceholder')}
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            disabled={isDisabled}
            helperText={t('import.form.defaultPasswordHelp')}
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

        {/* ── Dialog review High Margin (task036) — tahap preview, sebelum
            commit ── */}
        {importType === 'high_margin' && (
          <HighMarginImportReview
            open={!!hmPreview}
            companyId={companyId as number}
            preview={hmPreview}
            onCancel={() => setHmPreview(null)}
            onDone={() => setHmPreview(null)}
          />
        )}

        {/* ── Dialog review Faktur (task037/EDASHBOARD-588) — tahap preview
            + resolusi konflik per baris, sebelum commit ── */}
        {importType === 'faktur' && (
          <FakturImportReview
            open={!!fakturPreview}
            companyId={companyId as number}
            periodMonth={periodMonth}
            preview={fakturPreview}
            onCancel={() => setFakturPreview(null)}
            onDone={() => setFakturPreview(null)}
          />
        )}

        {/* ── Hasil master data import ── */}
        {masterResult && (
          <Alert
            severity={masterResult.errors.length > 0 ? 'warning' : 'success'}
            onClose={() => setMasterResult(null)}
          >
            {t('import.form.masterResultSummary', { added: masterResult.added, skipped: masterResult.skipped })}
            {masterResult.errors.length > 0 && (
              <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                {masterResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}><Typography variant="caption">{t('import.form.masterResultRowError', { row: e.row, message: e.message })}</Typography></li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        {formError && (
          <Alert severity="error" onClose={() => setFormError(null)}>{formError}</Alert>
        )}

        {can('config.import:import') && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isDisabled}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            {isPending ? t('import.form.loading') : importType === 'high_margin' || importType === 'faktur' ? t('import.form.hmPreviewSubmit') : t('import.file.submit')}
          </Button>
        )}
      </Stack>
    </Card>
  )
}
