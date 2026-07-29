import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card, Button, ActionMenu, Dialog } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCan } from '@/hooks/useCan'
import { useCompanies } from '@/hooks/useCompanies'
import { useDivisions, useCreateDivision, useUpdateDivision, useDeleteDivision } from '@/hooks/useDivisions'
import { DORMANT_CATEGORY_VALUES } from '@/types/divisions'
import type { DivisionRow, DormantCategory } from '@/types/divisions'
import { getApiErrorMessage } from '@/utils/apiError'

const INITIAL_FORM = {
  label: '',
  dormant_category: '' as DormantCategory | '',
}

export default function DivisionManagementSettings() {
  const { t } = useTranslation()
  const can = useCan()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const { data: companies = [] } = useCompanies()
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]))
  const [companyId, setCompanyId] = useState<number | 'all'>('all')

  const { data: divisions = [], isLoading } = useDivisions({ company_id: companyId })
  const createDivision = useCreateDivision()
  const updateDivision = useUpdateDivision()
  const deleteDivision = useDeleteDivision()

  const openAdd = () => { setForm(INITIAL_FORM); setEditingId(null); setDialogOpen(true) }
  const openEdit = (row: DivisionRow) => {
    setForm({ label: row.label, dormant_category: row.dormant_category })
    setEditingId(row.id)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    createDivision.reset()
    updateDivision.reset()
  }

  const isValid = form.label.trim().length > 0 && form.dormant_category !== ''

  const handleSave = () => {
    if (!isValid) return
    if (editingId) {
      updateDivision.mutate(
        { id: editingId, payload: { label: form.label.trim(), dormant_category: form.dormant_category as DormantCategory } },
        { onSuccess: closeDialog },
      )
    } else if (typeof companyId === 'number') {
      createDivision.mutate(
        { company_id: companyId, label: form.label.trim(), dormant_category: form.dormant_category as DormantCategory },
        { onSuccess: closeDialog },
      )
    }
  }

  const saveError = createDivision.error ?? updateDivision.error
  const deleteError = deleteDivision.error

  const columns: GridColDef<DivisionRow>[] = [
    {
      field: 'label',
      headerName: t('divisionManagement.colLabel'),
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Typography variant="body2">{row.label}</Typography>
      ),
    },
    {
      field: 'company_id',
      headerName: t('common.filters.entity'),
      flex: 1,
      minWidth: 140,
      renderCell: ({ value }) => (
        <Typography variant="body2">{companyNameById.get(value as number) ?? '—'}</Typography>
      ),
    },
    {
      field: 'dormant_category',
      headerName: t('divisionManagement.colDormantCategory'),
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Typography variant="body2">{t(`divisionManagement.dormantCategoryLabels.${value}`)}</Typography>
      ),
    },
    {
      field: 'is_active',
      headerName: t('divisionManagement.colActive'),
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Switch
            size="small"
            checked={row.is_active}
            onChange={() => updateDivision.mutate({ id: row.id, payload: { is_active: !row.is_active } })}
            disabled={!can('settings.division:update') || row.is_protected}
          />
        </Box>
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
            { label: t('common.edit'), icon: <EditIcon />, onClick: () => openEdit(row), hidden: !can('settings.division:update') },
            { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => setDeleteId(row.id), color: 'error', dividerBefore: true, hidden: !can('settings.division:delete') || row.is_protected },
          ]}
        />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="pageTitle">{t('divisionManagement.title')}</Typography>
          <Typography variant="pageSubtitle">{t('divisionManagement.subtitle')}</Typography>
        </Box>
        {can('settings.division:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disabled={companyId === 'all'} mobileIconOnly sx={{ flexShrink: 0 }}>
            {t('divisionManagement.add')}
          </Button>
        )}
      </Box>

      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel>{t('common.filters.entity')}</InputLabel>
            <Select
              value={companyId}
              label={t('common.filters.entity')}
              onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <MenuItem value="all">{t('common.filters.allEntities')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      <ResponsiveListView
        rows={divisions}
        columns={columns}
        loading={isLoading}
        mobileFields={['label', 'company_id', 'dormant_category', 'is_active']}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
        title={editingId ? t('divisionManagement.editTitle') : t('divisionManagement.addTitle')}
        error={saveError ? { message: getApiErrorMessage(saveError, t) } : null}
        actions={[
          { label: t('common.cancel'), onClick: closeDialog, variant: 'text' },
          {
            label: editingId ? t('common.save') : t('common.add'),
            onClick: handleSave,
            isLoading: createDivision.isPending || updateDivision.isPending,
            disabled: !isValid,
          },
        ]}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            size="small"
            label={t('divisionManagement.colLabel')}
            placeholder={t('divisionManagement.namePlaceholder')}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth size="small">
            <InputLabel>{t('divisionManagement.dormantCategory')}</InputLabel>
            <Select
              value={form.dormant_category}
              label={t('divisionManagement.dormantCategory')}
              onChange={(e) => setForm({ ...form, dormant_category: e.target.value as DormantCategory })}
            >
              {DORMANT_CATEGORY_VALUES.map((cat) => (
                <MenuItem key={cat} value={cat}>{t(`divisionManagement.dormantCategoryLabels.${cat}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onClose={() => { setDeleteId(null); deleteDivision.reset() }}
        maxWidth="xs"
        title={t('common.delete')}
        error={deleteError ? { message: getApiErrorMessage(deleteError, t) } : null}
        actions={[
          { label: t('common.cancel'), onClick: () => { setDeleteId(null); deleteDivision.reset() }, variant: 'text' },
          {
            label: t('common.delete'),
            onClick: () => deleteId && deleteDivision.mutate(deleteId, { onSuccess: () => setDeleteId(null) }),
            color: 'error',
            isLoading: deleteDivision.isPending,
          },
        ]}
      >
        <Typography variant="body2">{t('divisionManagement.deleteConfirm')}</Typography>
      </Dialog>
    </Box>
  )
}
