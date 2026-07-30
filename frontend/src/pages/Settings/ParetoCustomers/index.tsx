import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card, Button, ActionMenu, StatusChip } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCompanies } from '@/hooks/useCompanies'
import {
  useParetoCustomers,
  useCreateParetoCustomer,
  useUpdateParetoCustomer,
  useDeactivateParetoCustomer,
  useDeleteParetoCustomer,
  useParetoCustomerOptions,
} from '@/hooks/useParetoCustomers'
import type { ParetoCustomerRow } from '@/types/paretoCustomers'
import { ParetoCustomerDialog } from './components/ParetoCustomerDialog'
import { useCan } from '@/hooks/useCan'

type DialogMode = 'create' | 'edit' | null

export default function ParetoCustomersSettings() {
  const { t } = useTranslation()
  const can = useCan()

  // Default 'all' — sama pola dengan halaman settings lain (High Margin,
  // Division Management): backend sudah scope lewat resolveCompanyScope.
  const [companyId, setCompanyId] = useState<number | 'all'>('all')
  const [activeOnly, setActiveOnly] = useState(false)

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<ParetoCustomerRow | null>(null)

  const singleCompanyId = typeof companyId === 'number' ? companyId : ''

  const { data: companies = [] } = useCompanies()
  const { data: rows = [], isLoading } = useParetoCustomers({
    company_id: companyId,
    active_only: activeOnly,
  })
  const { data: customerOptions = [] } = useParetoCustomerOptions(singleCompanyId)

  const { mutate: create, isPending: isCreating, error: createError, reset: resetCreate } = useCreateParetoCustomer()
  const { mutate: update, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateParetoCustomer()
  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateParetoCustomer()
  const { mutate: remove } = useDeleteParetoCustomer()

  const closeDialog = () => {
    setDialogMode(null)
    setSelected(null)
    resetCreate()
    resetUpdate()
  }

  const handleCreate = (payload: Parameters<typeof create>[0]) => {
    create(payload, { onSuccess: closeDialog })
  }

  const handleUpdate = (id: number, payload: Parameters<typeof update>[0]['payload']) => {
    update({ id, payload }, { onSuccess: closeDialog })
  }

  const handleDeactivate = (id: number) => deactivate(id)
  const handleDelete = (id: number) => remove(id)

  const today = new Date().toISOString().split('T')[0]
  const isActive = (row: ParetoCustomerRow) =>
    row.effective_from <= today && (row.effective_until === null || row.effective_until >= today)

  const columns: GridColDef<ParetoCustomerRow>[] = [
    {
      field: 'company_name',
      headerName: t('paretoCustomers.company'),
      width: 160,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">{row.company_name ?? '-'}</Typography>
      ),
    },
    {
      field: 'customer_name',
      headerName: t('paretoCustomers.customer'),
      flex: 2,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.customer_name}</Typography>
          {row.customer_code && (
            <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'effective_from',
      headerName: t('paretoCustomers.effectiveFrom'),
      width: 120,
    },
    {
      field: 'effective_until',
      headerName: t('paretoCustomers.effectiveUntil'),
      width: 120,
      renderCell: ({ row }) => row.effective_until ?? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {t('paretoCustomers.ongoing')}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 100,
      renderCell: ({ row }) => (
        <StatusChip
          label={isActive(row) ? t('common.active') : t('common.inactive')}
          color={isActive(row) ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'note',
      headerName: t('paretoCustomers.note'),
      flex: 2,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {row.note ?? '-'}
        </Typography>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <ActionMenu
          items={[
            { label: t('common.edit'), icon: <EditIcon />, onClick: () => { setSelected(row); setDialogMode('edit') }, hidden: !can('settings.pareto:update') },
            { label: t('paretoCustomers.deactivate'), icon: <BlockIcon />, onClick: () => handleDeactivate(row.id), disabled: isDeactivating || !isActive(row), hidden: !isActive(row) || !can('settings.pareto:update') },
            { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => handleDelete(row.id), color: 'error', dividerBefore: true, hidden: !can('settings.pareto:delete') },
          ]}
        />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="pageTitle">{t('paretoCustomers.title')}</Typography>
          <Typography variant="pageSubtitle">{t('paretoCustomers.subtitle')}</Typography>
        </Box>
        {can('settings.pareto:create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogMode('create')}
            disabled={companyId === 'all'}
            mobileIconOnly
          >
            {t('paretoCustomers.add')}
          </Button>
        )}
      </Box>

      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: '0 0 auto' } }}>
            <InputLabel>{t('paretoCustomers.company')}</InputLabel>
            <Select
              value={companyId}
              label={t('paretoCustomers.company')}
              onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <MenuItem value="all">{t('paretoCustomers.allCompanies')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                size="small"
              />
            }
            label={t('paretoCustomers.activeOnly')}
          />
        </Box>
      </Card>

      <Card>
        <ResponsiveListView
          rows={rows}
          columns={columns}
          loading={isLoading}
        />
      </Card>

      <ParetoCustomerDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'create'}
        selected={selected}
        companyId={singleCompanyId || 0}
        customerOptions={customerOptions}
        isPending={isCreating || isUpdating}
        error={createError ?? updateError}
        onClose={closeDialog}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </Box>
  )
}
