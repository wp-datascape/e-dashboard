// src/pages/Import/index.tsx
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('import.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('import.subtitle')}</Typography>

      <Stack spacing={3}>
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