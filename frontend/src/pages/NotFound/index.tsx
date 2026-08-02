import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 2,
        textAlign: 'center',
        p: 3,
      }}
    >
      <SearchOffOutlinedIcon sx={{ fontSize: 64, color: 'error.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('notFound.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {t('notFound.subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          {t('notFound.back')}
        </Button>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          {t('notFound.toDashboard')}
        </Button>
      </Box>
    </Box>
  )
}
