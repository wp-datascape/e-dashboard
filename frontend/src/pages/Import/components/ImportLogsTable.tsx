import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { Card } from '@/components/ui'
import { StatusChip } from '@/components/ui/StatusChip'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useImportLogs } from '@/hooks/useImport'
import { ErrorDetailDialog } from './ErrorDetailDialog'
import type { ImportLog } from '@/types/import'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusIcon({ status }: { status: ImportLog['status'] }) {
  if (status === 'success') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
  if (status === 'failed')  return <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />
  return <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportLogsTable() {
  const { t } = useTranslation()
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null)
  const { data, isLoading, error } = useImportLogs()
  const logs: ImportLog[] = (data?.data as ImportLog[]) ?? []
  const totalRows = (data?.meta as { total?: number })?.total ?? 0

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 50,
    page: 0,
  })

  const columns: GridColDef[] = [
    {
      field: 'created_at',
      headerName: t('import.logs.colDate'),
      width: 160,
      renderCell: (params) => formatDate(params.value as string),
    },
    {
      field: 'company',
      headerName: t('import.logs.colCompany'),
      width: 150,
      renderCell: (params) => (params.value as { name: string })?.name ?? '—',
    },
    {
      field: 'source',
      headerName: t('import.logs.colSource'),
      width: 110,
      renderCell: (params) => (
        <StatusChip
          label={params.value === 'file' ? t('import.logs.sourceFileShort') : t('import.logs.sourceAccurateShort')}
          color={params.value === 'file' ? 'primary' : 'info'}
        />
      ),
    },
    {
      field: 'filename',
      headerName: t('import.logs.colFile'),
      width: 140,
      renderCell: (params) => (params.value as string | null) ?? '—',
    },
    {
      field: 'period_month',
      headerName: t('import.logs.colPeriod'),
      width: 100,
    },
    {
      field: 'status',
      headerName: t('import.logs.colStatus'),
      width: 120,
      renderCell: (params) => {
        const status = params.value as ImportLog['status']
        const color = status === 'success' ? 'success' : status === 'partial' ? 'warning' : 'error'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <StatusIcon status={status} />
            <StatusChip label={t(`import.status.${status}`)} color={color} />
          </Box>
        )
      },
    },
    {
      field: 'total_invoices',
      headerName: t('import.logs.colTotal'),
      width: 90,
      align: 'right',
      renderCell: (params) => (params.value as number).toLocaleString('id-ID'),
    },
    {
      field: 'success_invoices',
      headerName: t('import.logs.colSuccess'),
      width: 100,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
          {(params.value as number).toLocaleString('id-ID')}
        </Typography>
      ),
    },
    {
      field: 'error_rows',
      headerName: t('import.logs.colErrors'),
      width: 80,
      align: 'right',
      renderCell: (params) => {
        const log = params.row as ImportLog
        const errors = params.value as number
        return errors > 0 ? (
          <Typography
            variant="body2"
            color="error.main"
            sx={{ fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => setSelectedLog(log)}
          >
            {errors}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">0</Typography>
        )
      },
    },
    {
      field: 'imported_by',
      headerName: t('import.logs.colBy'),
      width: 130,
      renderCell: (params) => (params.value as { name: string })?.name ?? '—',
    },
  ]

  const renderImportCard = (row: Record<string, unknown>) => {
    const log = row as unknown as ImportLog
    const statusColor = log.status === 'success' ? 'success' : log.status === 'partial' ? 'warning' : 'error'
    return (
      <Card key={log.id} sx={{ mb: 2, p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colDate')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatDate(log.created_at)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colStatus')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <StatusIcon status={log.status} />
                <StatusChip label={t(`import.status.${log.status}`)} color={statusColor} />
              </Box>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colCompany')}
              </Typography>
              <Typography variant="body2">{log.company?.name ?? '—'}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colSource')}
              </Typography>
              <StatusChip
                label={log.source === 'file' ? t('import.logs.sourceFileShort') : t('import.logs.sourceAccurateShort')}
                color={log.source === 'file' ? 'primary' : 'info'}
              />
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colPeriod')}
              </Typography>
              <Typography variant="body2">{log.period_month}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colTotal')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {log.total_invoices.toLocaleString('id-ID')}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colSuccess')}
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                {log.success_invoices.toLocaleString('id-ID')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('import.logs.colErrors')}
              </Typography>
              {log.error_rows > 0 ? (
                <Typography
                  variant="body2"
                  color="error.main"
                  sx={{ fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => setSelectedLog(log)}
                >
                  {log.error_rows}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.disabled">0</Typography>
              )}
            </Box>
          </Stack>

          {log.filename && (
            <Typography variant="caption" color="text.secondary">
              {t('import.logs.colFile')}: {log.filename}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled">
            {t('import.logs.colBy')}: {log.imported_by?.name ?? '—'}
          </Typography>
        </Stack>
      </Card>
    )
  }

  return (
    <>
      <ResponsiveListView
        rows={logs}
        columns={columns}
        renderCard={renderImportCard}
        loading={isLoading}
        error={error as Error | null}
        title={t('import.logs.title')}
        pageSize={paginationModel.pageSize}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => {
          setPaginationModel(model as GridPaginationModel)
        }}
        height={600}
      />

      <ErrorDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  )
}