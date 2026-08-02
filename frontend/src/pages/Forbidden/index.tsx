import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

export default function Forbidden() {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
      <LockOutlinedIcon sx={{ fontSize: 64, color: 'warning.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('forbidden.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {t('forbidden.subtitle')}
      </Typography>

      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        {t('forbidden.backToDashboard')}
      </Button>
    </Box>
  )
}
