import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

export default function Projects() {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle">{t('projects.title')}</Typography>
      <Typography variant="pageSubtitle">
        {t('projects.placeholder')}
      </Typography>
    </Box>
  )
}
