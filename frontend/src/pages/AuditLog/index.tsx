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
import { useAuditLogs, useAuditActions } from '@/hooks/useAuditLogs'
import type { AuditLog, AuditLogFilters } from '@/types/audit'
import { ViewAuditLogDialog } from './components/ViewAuditLogDialog'
import { formatDateTimeDDMMYYYY } from '@/utils/date'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getActionColor = (action: string): StatusChipColor => {
  const verb = action.split('.').pop() ?? ''
  const map: Record<string, StatusChipColor> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    import: 'primary',
    assign: 'primary',
    revoke: 'warning',
    deactivate: 'warning',
  }
  return map[verb] ?? 'default'
}

const fmtDate = formatDateTimeDDMMYYYY

// ─── Column Definitions ────────────────────────────────────────────────────────

function getAuditColumns(t: TFunction): GridColDef[] {
  return [
    {
      field: 'created_at',
      headerName: t('auditLog.timestamp'),
      width: 180,
      renderCell: (params) => fmtDate(params.value as string),
    },
    {
      field: 'action',
      headerName: t('auditLog.action'),
      width: 150,
      renderCell: (params) => {
        const action = params.value as string
        return (
          <StatusChip
            label={t(`auditLog.actions.${action}`, { defaultValue: action })}
            color={getActionColor(action)}
          />
        )
      },
    },
    {
      field: 'actor',
      headerName: t('auditLog.actor'),
      width: 150,
      renderCell: (params) => {
        const actor = params.value as { id: number; name: string } | null
        return actor?.name ?? '—'
      },
    },
    {
      field: 'entity',
      headerName: t('auditLog.dialog.table'),
      width: 120,
    },
    {
      field: 'entity_key',
      headerName: t('auditLog.item'),
      width: 200,
      renderCell: (params) => params.value ?? '—',
    },
    {
      field: 'ip_address',
      headerName: t('auditLog.ipAddress'),
      width: 140,
      renderCell: (params) => (params.value as string | null) ?? '—',
    },
  ]
}

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
  const columnsWithClick = getAuditColumns(t).map((col) => {
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle" sx={{ mb: 1 }}>
          {t('auditLog.title')}
        </Typography>
        <Typography variant="pageSubtitle">
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
            <MenuItem key={action} value={action}>
              {t(`auditLog.actions.${action}`, { defaultValue: action })}
            </MenuItem>
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
        // Field pertama = judul card mobile — 'actor' (siapa) lebih informatif
        // sebagai identitas baris daripada 'created_at' (kolom pertama tabel
        // desktop, cuma timestamp mentah).
        mobileFields={['actor', 'action', 'entity', 'entity_key', 'created_at', 'ip_address']}
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