import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'

import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { Card, DatePicker } from '@/components/ui'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import { useActivityLogs } from '@/hooks/useActivityLogs'
import type { ActivityLog, ActivityLogFilters } from '@/types/activityLog'
import { ViewActivityLogDialog } from './components/ViewActivityLogDialog'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PAGE_VIEW']

const getMethodColor = (method: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'error',
    PAGE_VIEW: 'primary',
  }
  return map[method] ?? 'default'
}

const fmtDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Column Definitions ────────────────────────────────────────────────────────

function getActivityColumns(t: TFunction): GridColDef[] {
  return [
    {
      field: 'created_at',
      headerName: t('activityLog.timestamp'),
      width: 180,
      renderCell: (params) => fmtDate(params.value as string),
    },
    {
      field: 'user',
      headerName: t('activityLog.user'),
      width: 150,
      renderCell: (params) => {
        const user = params.value as { id: number; name: string } | null
        return user?.name ?? '—'
      },
    },
    {
      field: 'method',
      headerName: t('activityLog.method'),
      width: 110,
      renderCell: (params) => {
        const method = params.value as string
        return <StatusChip label={method} color={getMethodColor(method)} />
      },
    },
    {
      field: 'module',
      headerName: t('activityLog.module'),
      width: 150,
      renderCell: (params) => (params.value as string | null) ?? '—',
    },
    {
      field: 'path',
      headerName: t('activityLog.path'),
      width: 220,
    },
    {
      field: 'status_code',
      headerName: t('activityLog.statusCode'),
      width: 110,
      renderCell: (params) => (params.value as number | null) ?? '—',
    },
    {
      field: 'duration_ms',
      headerName: t('activityLog.durationMs'),
      width: 110,
      renderCell: (params) => {
        const ms = params.value as number | null
        return ms != null ? `${ms} ms` : '—'
      },
    },
  ]
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ActivityLog() {
  const { t } = useTranslation()

  const [viewLogId, setViewLogId] = useState<number | null>(null)
  const handleView = useCallback((id: number) => setViewLogId(id), [])

  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    per_page: 50,
  })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 50,
    page: 0,
  })

  const { data, isLoading, error } = useActivityLogs(filters)

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }))
    setPaginationModel({ pageSize: 50, page: 0 })
  }

  const rows: ActivityLog[] = data?.data ?? []
  const totalRows = data?.meta?.total ?? 0
  const pageSize = filters.per_page ?? 50

  const columnsWithClick = getActivityColumns(t).map((col) => {
    if (col.field === 'path') {
      return {
        ...col,
        renderCell: (params: import('@mui/x-data-grid').GridRenderCellParams) => (
          <Box
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => handleView(params.row.id as number)}
          >
            {params.value}
          </Box>
        ),
      }
    }
    return col
  })

  const renderActivityCard = (row: Record<string, unknown>) => {
    const activity = row as unknown as ActivityLog
    return (
      <Card key={activity.id} sx={{ mb: 2, p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('activityLog.timestamp')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmtDate(activity.created_at)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {t('activityLog.method')}
              </Typography>
              <StatusChip label={activity.method} color={getMethodColor(activity.method)} />
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('activityLog.user')}
              </Typography>
              <Typography variant="body2">{activity.user?.name ?? '—'}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('activityLog.path')}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{activity.path}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Card>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle" sx={{ mb: 1 }}>
          {t('activityLog.title')}
        </Typography>
        <Typography variant="pageSubtitle">
          {t('activityLog.description')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <TextField
          label={t('activityLog.filterMethod')}
          select size="small"
          value={filters.method ?? ''}
          onChange={(e) => handleFilterChange('method', e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('activityLog.allMethods')}</MenuItem>
          {METHOD_OPTIONS.map((method) => (
            <MenuItem key={method} value={method}>
              {method}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label={t('activityLog.filterDateFrom')}
          size="small"
          value={filters.date_from ?? ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <DatePicker
          label={t('activityLog.filterDateTo')}
          size="small"
          value={filters.date_to ?? ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          sx={{ minWidth: 160 }}
        />
      </Box>

      <ResponsiveListView
        rows={rows}
        columns={columnsWithClick}
        onRowClick={(row) => handleView((row as unknown as ActivityLog).id)}
        renderCard={renderActivityCard}
        loading={isLoading}
        error={error as Error | null}
        title={t('activityLog.table')}
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

      <ViewActivityLogDialog
        open={viewLogId !== null}
        onClose={() => setViewLogId(null)}
        logId={viewLogId}
      />
    </Box>
  )
}
