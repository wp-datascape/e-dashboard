import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card, Button, ActionMenu, StatusChip } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCompanies } from '@/hooks/useCompanies'
import {
  useDivisions,
  useCreateDivision,
  useUpdateDivision,
  useDeleteDivision,
} from '@/hooks/useDivisions'
import type { DivisionRow, CreateDivisionPayload, UpdateDivisionPayload } from '@/types/divisions'
import { useCan } from '@/hooks/useCan'
import { DivisionDialog } from './components/DivisionDialog'
import { DivisionMappingSection } from './components/DivisionMappingSection'

type DialogMode = 'create' | 'edit' | 'mapping' | null

export default function DivisionsSettings() {
  const { t } = useTranslation()
  const can = useCan()

  // ── Filter state ──
  const [companyFilter, setCompanyFilter] = useState<number | ''>('')

  // ── Dialog / selection state ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<DivisionRow | null>(null)

  // ── Data ──
  const { data: companies = [] } = useCompanies()
  const { data: rows = [], isLoading } = useDivisions({
    company_id: companyFilter === '' ? undefined : companyFilter,
  })

  // ── Mutations ──
  const { mutate: create, isPending: isCreating, error: createError, reset: resetCreate } = useCreateDivision()
  const { mutate: update, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateDivision()
  const { mutate: remove } = useDeleteDivision()

  // ── Handlers ──
  const closeDialog = () => {
    setDialogMode(null)
    setSelected(null)
    resetCreate()
    resetUpdate()
  }

  const handleCreate = (payload: CreateDivisionPayload) => {
    create(payload, { onSuccess: closeDialog })
  }

  const handleUpdate = (id: number, payload: UpdateDivisionPayload) => {
    update({ id, payload }, { onSuccess: closeDialog })
  }

  const handleDelete = (row: DivisionRow) => {
    if (window.confirm(t('divisions.deleteConfirm', { name: row.name }))) remove(row.id)
  }

  // ── Columns ──
  const columns: GridColDef<DivisionRow>[] = [
    {
      field: 'code',
      headerName: t('divisions.code'),
      width: 120,
      renderCell: ({ value }) => <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value}</Typography>,
    },
    { field: 'name', headerName: t('divisions.name'), flex: 1, minWidth: 160 },
    {
      field: 'company_name',
      headerName: t('divisions.company'),
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => value ?? '—',
    },
    {
      field: 'branch_name',
      headerName: t('divisions.branch'),
      width: 130,
      renderCell: ({ row }) => (
        <Typography variant="body2" color={row.branch_id ? 'text.primary' : 'text.secondary'}>
          {row.branch_id ? row.branch_name ?? `#${row.branch_id}` : t('divisions.branchAll')}
        </Typography>
      ),
    },
    {
      field: 'dormant_bucket',
      headerName: t('divisions.dormantBucket'),
      width: 140,
      renderCell: ({ value }) => t(`divisions.dormantBuckets.${value}`),
    },
    {
      field: 'is_active',
      headerName: t('common.status'),
      width: 110,
      renderCell: ({ value }) => (
        <StatusChip label={value ? t('common.active') : t('common.inactive')} color={value ? 'success' : 'default'} />
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 90,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <ActionMenu
          items={[
            {
              label: t('common.edit'),
              icon: <EditIcon />,
              onClick: () => { resetUpdate(); setSelected(row); setDialogMode('edit') },
              hidden: !can('settings.division:update'),
            },
            {
              label: t('divisions.manageMapping'),
              icon: <ImportExportIcon />,
              onClick: () => { setSelected(row); setDialogMode('mapping') },
              hidden: !can('settings.channel.division:view'),
            },
            {
              label: t('common.delete'),
              icon: <DeleteIcon />,
              onClick: () => handleDelete(row),
              color: 'error',
              dividerBefore: true,
              hidden: !can('settings.division:delete'),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="pageTitle">{t('divisions.title')}</Typography>
          <Typography variant="pageSubtitle">{t('divisions.subtitle')}</Typography>
        </Box>
        {can('settings.division:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetCreate(); setDialogMode('create') }} mobileIconOnly>
            {t('divisions.add')}
          </Button>
        )}
      </Box>

      {/* Filters */}
      {companies.length > 1 && (
        <Card sx={{ p: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
            <InputLabel>{t('divisions.company')}</InputLabel>
            <Select
              value={companyFilter}
              label={t('divisions.company')}
              onChange={(e) => setCompanyFilter(e.target.value as number | '')}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Card>
      )}

      <ResponsiveListView rows={rows} columns={columns} loading={isLoading} />

      <DivisionDialog
        open={dialogMode === 'create' || dialogMode === 'edit'}
        mode={dialogMode === 'edit' ? 'edit' : 'create'}
        selected={selected}
        isPending={isCreating || isUpdating}
        error={createError ?? updateError}
        onClose={closeDialog}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <DivisionMappingSection
        open={dialogMode === 'mapping'}
        onClose={closeDialog}
        division={selected}
      />
    </Box>
  )
}
