import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ANNOUNCEMENTS } from '@/config/announcements'
import { useDismissedBanners, useDismissBanner } from '@/hooks/useMe'

// Render semua banner di ANNOUNCEMENTS yang belum di-dismiss user ini -
// tambah banner baru (task032) cukup tambah entry di config, komponen ini
// tidak perlu diubah. Diletakkan sekali di halaman Dashboard/Overview.
export default function AnnouncementBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dismissed = useDismissedBanners()
  const { dismiss } = useDismissBanner()

  const active = ANNOUNCEMENTS.filter((a) => !dismissed.includes(a.key))
  if (active.length === 0) return null

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      {active.map((a) => (
        <Alert
          key={a.key}
          severity="info"
          action={
            // Alert MUI cuma render ikon x OTOMATIS kalau `action` kosong (lihat
            // Alert.js: "action == null && onClose") - begitu action diisi
            // tombol CTA, ikon close bawaan hilang. Jadi ikon close ditaruh
            // manual di sini, digabung 1 slot dengan tombol CTA.
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {a.ctaLabelKey && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    dismiss(a.key)
                    if (a.ctaTo) navigate(a.ctaTo)
                  }}
                >
                  {t(a.ctaLabelKey)}
                </Button>
              )}
              <IconButton size="small" color="inherit" aria-label={t('common.close')} onClick={() => dismiss(a.key)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
            {t(a.titleKey)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(a.bodyKey)}
          </Typography>
        </Alert>
      ))}
    </Stack>
  )
}
