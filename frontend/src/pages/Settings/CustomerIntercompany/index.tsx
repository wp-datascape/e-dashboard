import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card, Button, ActionMenu, Dialog } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCan } from '@/hooks/useCan'
import { useCompanies } from '@/hooks/useCompanies'
import {
  useIntercompanyNames,
  useCreateIntercompanyName,
  useUpdateIntercompanyName,
  useDeleteIntercompanyName,
  useAmbiguousChannels,
  useCustomerNameOptions,
} from '@/hooks/useIntercompanyNames'
import type { IntercompanyNameRow } from '@/types/intercompanyNames'
import { getApiErrorMessage } from '@/utils/apiError'

export default function CustomerIntercompanySettings() {
  const { t } = useTranslation()
  const can = useCan()

  const { data: companies = [] } = useCompanies()
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]))
  const [companyId, setCompanyId] = useState<number | 'all'>('all')
  const singleCompanyId = typeof companyId === 'number' ? companyId : null

  const { data: intercompanyNames = [], isLoading } = useIntercompanyNames({ company_id: companyId })
  const { data: customerNameOptions = [] } = useCustomerNameOptions(singleCompanyId)
  const { data: ambiguousChannels = [] } = useAmbiguousChannels({ company_id: companyId })

  const createIntercompanyName = useCreateIntercompanyName()
  const updateIntercompanyName = useUpdateIntercompanyName()
  const deleteIntercompanyName = useDeleteIntercompanyName()

  const alreadyAddedNames = new Set(intercompanyNames.map((n) => n.customer_name))
  const customerNameChoices = customerNameOptions
    .map((o) => o.customer_name)
    .filter((name) => !alreadyAddedNames.has(name))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const openAdd = () => { setNewName(null); createIntercompanyName.reset(); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setNewName(null) }

  const handleAdd = () => {
    if (!newName || singleCompanyId == null) return
    createIntercompanyName.mutate(
      { company_id: singleCompanyId, customer_name: newName },
      { onSuccess: closeDialog },
    )
  }

  const columns: GridColDef<IntercompanyNameRow>[] = [
    {
      field: 'customer_name',
      headerName: t('customerIntercompany.colName'),
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Typography variant="body2" color={row.is_active ? 'text.primary' : 'text.secondary'}>
          {row.customer_name}
        </Typography>
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
      field: 'is_active',
      headerName: t('customerIntercompany.colActive'),
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Switch
            size="small"
            checked={row.is_active}
            onChange={() => updateIntercompanyName.mutate({ id: row.id, payload: { is_active: !row.is_active } })}
            disabled={!can('settings.intercompany:update')}
          />
        </Box>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <ActionMenu
          items={[
            { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => setDeleteId(row.id), color: 'error', hidden: !can('settings.intercompany:delete') },
          ]}
        />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="pageTitle">{t('customerIntercompany.title')}</Typography>
          <Typography variant="pageSubtitle">{t('customerIntercompany.subtitle')}</Typography>
        </Box>
        {can('settings.intercompany:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disabled={companyId === 'all'} mobileIconOnly sx={{ flexShrink: 0 }}>
            {t('customerIntercompany.add')}
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
        rows={intercompanyNames}
        columns={columns}
        loading={isLoading}
        mobileFields={['customer_name', 'company_id', 'is_active']}
      />

      {ambiguousChannels.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('customerIntercompany.ambiguousChannelTitle')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('customerIntercompany.ambiguousChannelHint')}
          </Typography>
          <Stack spacing={0.5}>
            {ambiguousChannels.map((ch) => (
              <Typography key={ch.channel_name} variant="body2" sx={{ fontFamily: 'monospace' }}>
                {ch.channel_name} — {t('customerIntercompany.ambiguousChannelStats', {
                  override: ch.override_customers,
                  regular: ch.regular_customers,
                })}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
        title={t('customerIntercompany.addTitle')}
        error={createIntercompanyName.error ? { message: getApiErrorMessage(createIntercompanyName.error, t) } : null}
        actions={[
          { label: t('common.cancel'), onClick: closeDialog, variant: 'text' },
          {
            label: t('common.add'),
            onClick: handleAdd,
            isLoading: createIntercompanyName.isPending,
            disabled: !newName,
          },
        ]}
      >
        <Autocomplete
          size="small"
          options={customerNameChoices}
          value={newName}
          onChange={(_, val) => setNewName(val)}
          disablePortal
          renderInput={(params) => (
            <TextField {...params} placeholder={t('customerIntercompany.namePlaceholder')} />
          )}
        />
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onClose={() => { setDeleteId(null); deleteIntercompanyName.reset() }}
        maxWidth="xs"
        title={t('common.delete')}
        error={deleteIntercompanyName.error ? { message: getApiErrorMessage(deleteIntercompanyName.error, t) } : null}
        actions={[
          { label: t('common.cancel'), onClick: () => { setDeleteId(null); deleteIntercompanyName.reset() }, variant: 'text' },
          {
            label: t('common.delete'),
            onClick: () => deleteId && deleteIntercompanyName.mutate(deleteId, { onSuccess: () => setDeleteId(null) }),
            color: 'error',
            isLoading: deleteIntercompanyName.isPending,
          },
        ]}
      >
        <Typography variant="body2">{t('customerIntercompany.deleteConfirm')}</Typography>
      </Dialog>
    </Box>
  )
}
