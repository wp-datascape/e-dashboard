import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'

import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { Card, DatePicker } from '@/components/ui'
import { StatusChip } from '@/components/ui/StatusChip'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import { useAuditLogs, useAuditActions } from '@/hooks/useAuditLogs'
import type { AuditLog, AuditLogFilters } from '@/types/audit'
import { ViewAuditLogDialog } from './components/ViewAuditLogDialog'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getActionColor = (action: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    'invoice.import': 'primary',
    'user.create': 'success',
    'user.update': 'info',
    'user.delete': 'error',
    'role.create': 'success',
    'role.update': 'info',
    'role.delete': 'error',
    'permission.assign': 'primary',
    'permission.revoke': 'warning',
    'user_role.assign': 'primary',
    'user_role.revoke': 'warning',
    'config.update': 'info',
    'category.update': 'info',
  }
  return map[action] ?? 'default'
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

const auditColumns: GridColDef[] = [
  {
    field: 'created_at',
    headerName: 'Waktu',
    width: 180,
    renderCell: (params) => fmtDate(params.value as string),
  },
  {
    field: 'action',
    headerName: 'Aksi',
    width: 150,
    renderCell: (params) => (
      <StatusChip label={params.value as string} color={getActionColor(params.value as string)} />
    ),
  },
  {
    field: 'actor',
    headerName: 'Pelaku',
    width: 150,
    renderCell: (params) => {
      const actor = params.value as { id: number; name: string } | null
      return actor?.name ?? '—'
    },
  },
  {
    field: 'entity',
    headerName: 'Tabel',
    width: 120,
  },
  {
    field: 'entity_key',
    headerName: 'Item',
    width: 200,
    renderCell: (params) => params.value ?? '—',
  },
  {
    field: 'ip_address',
    headerName: 'IP Address',
    width: 140,
    renderCell: (params) => (params.value as string | null) ?? '—',
  },
]

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const { t } = useTranslation()

  // ── Dialog State ──
  const [viewLogId, setViewLogId] = useState<number | null>(null)
  const handleView = useCallback((id: number) => setViewLogId(id), [])

  // ── State ──
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    per_page: 50,
  })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 50,
    page: 0,
  })

  // ── Data ──
  const { data, isLoading, error } = useAuditLogs(filters)
  const { data: actions = [] } = useAuditActions()

  // ── Handlers ──
  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }))
    setPaginationModel({ pageSize: 50, page: 0 })
  }

  const rows: AuditLog[] = data?.data ?? []
  const totalRows = data?.meta?.total ?? 0
  const pageSize = filters.per_page ?? 50

  // ── Wrap entity_key column with click handler ──
  const columnsWithClick = auditColumns.map((col) => {
    if (col.field === 'entity_key') {
      return {
        ...col,
        renderCell: (params: import('@mui/x-data-grid').GridRenderCellParams) => (
          <Box
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => handleView(params.row.id as number)}
          >
            {params.value ?? '—'}
          </Box>
        ),
      }
    }
    return col
  })

  // Custom mobile card renderer for audit logs
  const renderAuditCard = (row: Record<string, unknown>) => {
    const audit = row as unknown as AuditLog
    return (
      <Card key={audit.id} sx={{ mb: 2, p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('auditLog.timestamp')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmtDate(audit.created_at)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {t('auditLog.action')}
              </Typography>
              <StatusChip label={audit.action} color={getActionColor(audit.action)} />
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('auditLog.actor')}
              </Typography>
              <Typography variant="body2">{audit.actor?.name ?? '—'}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('auditLog.entity')}
              </Typography>
              <Typography variant="body2">{audit.entity_key}</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block',mb: 0.5 }}>
              Tabel
            </Typography>
            <Typography variant="body2">{audit.entity}</Typography>
          </Box>
            {audit.ip_address && (
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t('auditLog.ipAddress')}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {audit.ip_address}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </Card>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {t('auditLog.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auditLog.description')}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <TextField
          label={t('auditLog.filterAction')}
          select size="small"
          value={filters.action ?? ''}
          onChange={(e) => handleFilterChange('action', e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('auditLog.allActions')}</MenuItem>
          {actions.map((action) => (
            <MenuItem key={action} value={action}>{action}</MenuItem>
          ))}
        </TextField>

        <DatePicker
          label={t('auditLog.filterDateFrom')}
          size="small"
          value={filters.date_from ?? ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <DatePicker
          label={t('auditLog.filterDateTo')}
          size="small"
          value={filters.date_to ?? ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          sx={{ minWidth: 160 }}
        />
      </Box>

      {/* Table */}
      <ResponsiveListView
        rows={rows}
        columns={columnsWithClick}
        onRowClick={(row) => handleView((row as unknown as AuditLog).id)}
        renderCard={renderAuditCard}
        loading={isLoading}
        error={error as Error | null}
        title={t('auditLog.table')}
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

      {/* View Detail Dialog */}
      <ViewAuditLogDialog
        open={viewLogId !== null}
        onClose={() => setViewLogId(null)}
        logId={viewLogId}
      />
    </Box>
  )
}