import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { Card, StatusChip } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import { NotificationDetailDialog } from '@/components/ui/NotificationDetailDialog'
import type { NotificationRow } from '@/types/notifications'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { t } = useTranslation()

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })
  const [detailNotification, setDetailNotification] = useState<NotificationRow | null>(null)

  const { data, isLoading } = useNotifications({
    unread_only: unreadOnly,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
  })
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead()

  const rows = (data?.data ?? []).map((n) => ({ ...n, id: n.id }))

  // Klik baris/card = tandai dibaca + tampilkan detail pesan lengkap di popup,
  // bukan langsung pindah ke /analisis generik (lihat NotificationBell).
  const handleRowClick = (row: Record<string, unknown>) => {
    const n = row as unknown as NotificationRow
    if (!n.is_read) markRead(n.id)
    setDetailNotification(n)
  }

  const columns: GridColDef<NotificationRow>[] = [
    {
      field: 'title',
      headerName: t('notifications.colTitle'),
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      // Judul + badge unread selalu terlihat (jadi header card mobile via
      // mobileFields) + preview body — badge dipindah kesini (bukan ke kolom
      // is_read) supaya kelihatan tanpa expand card dulu.
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: row.is_read ? 400 : 600 }}>{row.title}</Typography>
            {!row.is_read && <StatusChip size="small" label={t('notifications.unread')} color="primary" />}
          </Box>
          <Typography variant="caption" color="text.secondary">{row.body}</Typography>
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: t('notifications.colDate'),
      width: 170,
      sortable: false,
      valueFormatter: (value) => fmtDate(value as string),
    },
    {
      field: 'is_read',
      headerName: t('common.status'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        row.is_read
          ? <StatusChip size="small" label={t('notifications.read')} color="default" />
          : <StatusChip size="small" label={t('notifications.unread')} color="primary" />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="pageTitle">{t('notifications.title')}</Typography>
          <Typography variant="pageSubtitle">{t('notifications.subtitle')}</Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={() => markAllRead()} disabled={isMarkingAll}>
          {t('notifications.markAllRead')}
        </Button>
      </Box>

      <Card sx={{ p: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPaginationModel((p) => ({ ...p, page: 0 }))
              }}
              size="small"
            />
          }
          label={t('notifications.unreadOnly')}
        />
      </Card>

      <Card>
        <ResponsiveListView
          rows={rows}
          columns={columns}
          mobileFields={['title', 'is_read', 'created_at']}
          onRowClick={handleRowClick}
          loading={isLoading}
          getRowHeight="auto"
          rowCount={data?.meta.total ?? 0}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
        />
      </Card>

      <NotificationDetailDialog notification={detailNotification} onClose={() => setDetailNotification(null)} />
    </Box>
  )
}
