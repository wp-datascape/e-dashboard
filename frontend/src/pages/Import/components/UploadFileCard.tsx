import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useTranslation } from 'react-i18next'
import { Card, Button, ProgressBar } from '@/components/ui'
import { useImportFileProgress } from '@/hooks/useImport'
import { useCan } from '@/hooks/useCan'
import { CompanyPeriodFields } from './CompanyPeriodFields'
import { ResultBanner } from './ResultBanner'
import type { Company } from '@/types/users'

interface UploadFileCardProps {
  companies: Company[]
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
}

export function UploadFileCard({ companies, disabled = false, onPendingChange }: UploadFileCardProps) {
  const { t } = useTranslation()
  const can = useCan()
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { phase, progress, result, errorMessage, mutate, reset, isPending } = useImportFileProgress()

  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  const isDisabled = isPending || disabled

  const handleFile = (f: File | null) => {
    if (isDisabled) return
    if (!f) return
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) { setFormError(t('import.form.errorFormat')); return }
    if (f.size > 10 * 1024 * 1024) { setFormError(t('import.form.errorSize')); return }
    setFile(f)
    setFormError(null)
  }

  const handleSubmit = () => {
    if (isDisabled) return
    setFormError(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!companyId) { setFormError(t('import.form.errorCompany')); return }
    if (!periodMonth) { setFormError(t('import.form.errorPeriod')); return }
    if (!file) { setFormError(t('import.form.errorFile')); return }

    void mutate({ file, company_id: companyId as number, period_month: periodMonth })

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (phase === 'done') setFile(null)
  }

  const handleCloseResult = () => {
    reset()
    setFile(null)
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
        <CompanyPeriodFields
          companies={companies}
          companyId={companyId}
          periodMonth={periodMonth}
          onCompany={setCompanyId}
          onPeriod={setPeriodMonth}
          disabled={isDisabled}
        />

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

        {/* ── Progress saat upload / processing ── */}
        {(phase === 'uploading' || phase === 'processing') && (
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

        {formError && (
          <Alert severity="error" onClose={() => setFormError(null)}>{formError}</Alert>
        )}
        {phase === 'error' && errorMessage && (
          <Alert severity="error" onClose={reset}>{errorMessage}</Alert>
        )}
        {phase === 'done' && result && (
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
