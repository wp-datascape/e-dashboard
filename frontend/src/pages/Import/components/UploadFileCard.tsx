import { useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { Button } from '@/components/ui'
import { useImportFile } from '@/hooks/useImport'
import { CompanyPeriodFields } from './CompanyPeriodFields'
import { ResultBanner } from './ResultBanner'
import type { Company } from '@/types/users'
import type { ImportResult } from '@/types/import'

interface UploadFileCardProps {
  companies: Company[]
}

export function UploadFileCard({ companies }: UploadFileCardProps) {
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
        onSuccess: (r: { data: ImportResult }) => { setResult(r.data); setFile(null) },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setError(msg ?? t('import.form.errorGeneric'))
        },
      },
    )
  }

  return (
    <Card sx={{ p: 3, height: '100%' }}>
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