import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'

import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { DatePicker } from '@/components/ui'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import { useLoginLogs } from '@/hooks/useLoginLogs'
import type { LoginLog, LoginLogFilters } from '@/types/loginLog'
import { ViewLoginLogDialog } from './components/ViewLoginLogDialog'
import { formatDateTimeDDMMYYYY } from '@/utils/date'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const EVENT_OPTIONS = ['login_success', 'login_failed', 'logout', 'password_changed', 'role_changed', 'account_locked']

const getEventColor = (event: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    login_success: 'success',
    login_failed: 'error',
    logout: 'info',
    password_changed: 'warning',
    role_changed: 'primary',
    account_locked: 'error',
  }
  return map[event] ?? 'default'
}

const fmtDate = formatDateTimeDDMMYYYY

// ─── Column Definitions ────────────────────────────────────────────────────────

function getLoginLogColumns(t: TFunction): GridColDef[] {
  return [
    {
      field: 'created_at',
      headerName: t('loginLog.timestamp'),
      width: 180,
      renderCell: (params) => fmtDate(params.value as string),
    },
    {
      field: 'event',
      headerName: t('loginLog.event'),
      width: 160,
      renderCell: (params) => {
        const event = params.value as string
        return <StatusChip label={t(`loginLog.events.${event}`, { defaultValue: event })} color={getEventColor(event)} />
      },
    },
    {
      field: 'user',
      headerName: t('loginLog.user'),
      width: 150,
      renderCell: (params) => {
        const user = params.value as { id: number; name: string } | null
        return user?.name ?? '—'
      },
    },
    {
      field: 'email',
      headerName: t('loginLog.email'),
      width: 200,
      renderCell: (params) => (params.value as string) || '—',
    },
    {
      field: 'reason',
      headerName: t('loginLog.reason'),
      width: 160,
      renderCell: (params) => {
        const reason = params.value as string
        return reason ? t(`loginLog.reasons.${reason}`, { defaultValue: reason }) : '—'
      },
    },
    {
      field: 'ip_address',
      headerName: t('loginLog.ipAddress'),
      width: 140,
      renderCell: (params) => (params.value as string | null) ?? '—',
    },
  ]
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LoginLog() {
  const { t } = useTranslation()

  const [viewLogId, setViewLogId] = useState<number | null>(null)
  const handleView = useCallback((id: number) => setViewLogId(id), [])

  const [filters, setFilters] = useState<LoginLogFilters>({
    page: 1,
    per_page: 50,
  })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 50,
    page: 0,
  })

  const { data, isLoading, error } = useLoginLogs(filters)

  const handleFilterChange = (key: keyof LoginLogFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }))
    setPaginationModel({ pageSize: 50, page: 0 })
  }

  const rows: LoginLog[] = data?.data ?? []
  const totalRows = data?.meta?.total ?? 0
  const pageSize = filters.per_page ?? 50

  const columnsWithClick = getLoginLogColumns(t).map((col) => {
    if (col.field === 'email') {
      return {
        ...col,
        renderCell: (params: import('@mui/x-data-grid').GridRenderCellParams) => (
          <Box
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => handleView(params.row.id as number)}
          >
            {(params.value as string) || '—'}
          </Box>
        ),
      }
    }
    return col
  })

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle" sx={{ mb: 1 }}>
          {t('loginLog.title')}
        </Typography>
        <Typography variant="pageSubtitle">
          {t('loginLog.description')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <TextField
          label={t('loginLog.filterEvent')}
          select size="small"
          value={filters.event ?? ''}
          onChange={(e) => handleFilterChange('event', e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('loginLog.allEvents')}</MenuItem>
          {EVENT_OPTIONS.map((event) => (
            <MenuItem key={event} value={event}>
              {t(`loginLog.events.${event}`, { defaultValue: event })}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label={t('loginLog.filterDateFrom')}
          size="small"
          value={filters.date_from ?? ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <DatePicker
          label={t('loginLog.filterDateTo')}
          size="small"
          value={filters.date_to ?? ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          sx={{ minWidth: 160 }}
        />
      </Box>

      <ResponsiveListView
        rows={rows}
        columns={columnsWithClick}
        onRowClick={(row) => handleView((row as unknown as LoginLog).id)}
        // Field pertama = judul card mobile — 'user' (siapa) lebih informatif
        // sebagai identitas baris daripada 'created_at' (kolom pertama tabel
        // desktop, cuma timestamp mentah).
        mobileFields={['user', 'event', 'email', 'created_at', 'reason', 'ip_address']}
        loading={isLoading}
        error={error as Error | null}
        title={t('loginLog.table')}
        pageSize={pageSize}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => {
          setPaginationModel(model)
          setFilters((prev) => ({
            ...prev,
            page: (model as GridPaginationModel).page + 1,
            per_page: (model as GridPaginationModel).pageSize,
          }))
        }}
        height={600}
      />

      <ViewLoginLogDialog
        open={viewLogId !== null}
        onClose={() => setViewLogId(null)}
        logId={viewLogId}
      />
    </Box>
  )
}
