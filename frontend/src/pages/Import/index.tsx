// src/pages/Import/index.tsx
import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import { useCompanies } from '@/hooks/useImport'
import { UploadFileCard } from './components/UploadFileCard'
import { AccurateApiCard } from './components/AccurateApiCard'
import { ImportLogsTable } from './components/ImportLogsTable'

export default function ImportPage() {
  const { t } = useTranslation()
  const { data: companies = [] } = useCompanies()

  const [fileImporting, setFileImporting]         = useState(false)
  const [accurateImporting, setAccurateImporting] = useState(false)

  const onFilePending     = useCallback((v: boolean) => setFileImporting(v), [])
  const onAccuratePending = useCallback((v: boolean) => setAccurateImporting(v), [])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('import.title')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('import.subtitle')}</Typography>

      <Stack spacing={3}>
        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <UploadFileCard
              companies={companies}
              disabled={accurateImporting}
              onPendingChange={onFilePending}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <AccurateApiCard
              companies={companies}
              disabled={fileImporting}
              onPendingChange={onAccuratePending}
            />
          </Grid>
        </Grid>

        <ImportLogsTable />
      </Stack>
    </Box>
  )
}
