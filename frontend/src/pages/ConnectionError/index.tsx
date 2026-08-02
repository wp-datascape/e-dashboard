import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined'
import { useTranslation } from 'react-i18next'

interface ConnectionErrorProps {
  onRetry: () => Promise<unknown>
}

/**
 * Ditampilkan saat koneksi ke server gagal (network error/timeout) sebelum data
 * routing (page-settings) berhasil dimuat — BUKAN 404 (URL-nya sendiri valid, kita
 * cuma belum berhasil cek apakah halamannya ada) dan BUKAN redirect ke /login (belum
 * tentu unauthenticated, bisa jadi cuma koneksi lambat/putus). Lihat App.tsx.
 */
export default function ConnectionError({ onRetry }: ConnectionErrorProps) {
  const { t } = useTranslation()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

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
      <WifiOffOutlinedIcon sx={{ fontSize: 64, color: 'error.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('connectionError.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {t('connectionError.subtitle')}
      </Typography>

      <Button
        variant="contained"
        onClick={handleRetry}
        disabled={isRetrying}
        startIcon={isRetrying ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {isRetrying ? t('connectionError.retrying') : t('connectionError.retry')}
      </Button>
    </Box>
  )
}
