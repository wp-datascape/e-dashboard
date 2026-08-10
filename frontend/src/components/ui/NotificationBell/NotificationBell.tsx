import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { useTranslation } from 'react-i18next'
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import { NotificationDetailDialog } from '@/components/ui/NotificationDetailDialog'
import type { NotificationRow } from '@/types/notifications'
import { formatDateTimeDDMMYYYY } from '@/utils/date'

const RECENT_COUNT = 8

const fmtDate = formatDateTimeDDMMYYYY

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [detailNotification, setDetailNotification] = useState<NotificationRow | null>(null)
  const open = Boolean(anchorEl)

  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const { data } = useNotifications({ page: 1, per_page: RECENT_COUNT })
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead } = useMarkAllNotificationsRead()

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  // Klik notifikasi = tandai dibaca + tampilkan detail pesan lengkap di popup —
  // BUKAN langsung pindah ke /analisis generik (kehilangan konteks customer/
  // periode yang disebut di pesan). "Lihat di Analisis" jadi opsi tambahan di
  // dalam popup-nya sendiri, bukan default.
  const handleClickNotification = (n: NotificationRow) => {
    if (!n.is_read) markRead(n.id)
    handleClose()
    setDetailNotification(n)
  }

  const handleViewAll = () => {
    handleClose()
    navigate('/notifications')
  }

  const rows = data?.data ?? []

  return (
    <>
      <IconButton onClick={handleOpen} size="small" color="inherit" sx={{ ml: 0.5 }} aria-label={t('notifications.title')}>
        <Badge badgeContent={unreadCount > 99 ? '99+' : unreadCount} color="error">
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            // Ikon lonceng nempel di tepi kanan AppBar — lebar fixed (minWidth
            // 340) bikin dropdown overflow keluar layar di kiri pada mobile
            // sempit (viewport < ~370px). width responsif + anchor dari kanan
            // (bukan default kiri) jaga dropdown selalu dalam batas layar.
            sx: { width: { xs: 'calc(100vw - 32px)', sm: 340 }, maxWidth: 380 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('notifications.title')}</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => markAllRead()} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              {t('notifications.markAllRead')}
            </Button>
          )}
        </Box>

        <Divider />

        {rows.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('notifications.empty')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {rows.map((n) => (
              <MenuItem
                key={n.id}
                onClick={() => handleClickNotification(n)}
                sx={{
                  whiteSpace: 'normal',
                  alignItems: 'flex-start',
                  py: 1.25,
                  borderLeft: '3px solid',
                  borderLeftColor: n.is_read ? 'transparent' : 'primary.main',
                  bgcolor: n.is_read ? 'transparent' : 'action.hover',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: n.is_read ? 400 : 600 }}>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {n.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
                    {fmtDate(n.created_at)}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        <Divider />

        <Box sx={{ px: 1, py: 0.5 }}>
          <MenuItem onClick={handleViewAll} sx={{ justifyContent: 'center', fontSize: '0.8125rem', color: 'primary.main' }}>
            {t('notifications.viewAll')}
          </MenuItem>
        </Box>
      </Menu>

      <NotificationDetailDialog notification={detailNotification} onClose={() => setDetailNotification(null)} />
    </>
  )
}
