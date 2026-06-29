import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card, Button, ActionMenu } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { DivisionChip } from '@/pages/Customers/components/DivisionChip'
import { useCompanies } from '@/hooks/useCompanies'
import {
  useChannelDivisions,
  useCreateChannelDivision,
  useUpdateChannelDivision,
  useDeleteChannelDivision,
} from '@/hooks/useChannelDivisions'
import type { ChannelDivisionRow, CreateChannelDivisionPayload, UpdateChannelDivisionPayload } from '@/types/channelDivisions'
import type { Division } from '@/types/customers'
import { DivisionMappingDialog } from './components/DivisionMappingDialog'
import { useCan } from '@/hooks/useCan'

type DialogMode = 'create' | 'edit' | null

const DIVISION_OPTIONS: { value: NonNullable<Division>; label: string }[] = [
  { value: 'distribution', label: 'Distribution' },
  { value: 'project', label: 'Project' },
  { value: 'e_commerce', label: 'E-Commerce' },
  { value: 'intercompany', label: 'Intercompany' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'support', label: 'Support' },
]

export default function DivisionsSettings() {
  const { t } = useTranslation()
  const can = useCan()

  // ── Filter state ──
  const [divisionFilter, setDivisionFilter] = useState<NonNullable<Division> | ''>('')
  const [search, setSearch] = useState('')

  // ── Dialog / selection state ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<ChannelDivisionRow | null>(null)

  // ── Data ──
  const { data: companies = [] } = useCompanies()
  const { data: rows = [], isLoading } = useChannelDivisions({
    division: divisionFilter || undefined,
    search: search || undefined,
  })

  // ── Mutations ──
  const { mutate: create, isPending: isCreating, error: createError, reset: resetCreate } = useCreateChannelDivision()
  const { mutate: update, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateChannelDivision()
  const { mutate: remove } = useDeleteChannelDivision()

  // ── Handlers ──
  const closeDialog = () => {
    setDialogMode(null)
    setSelected(null)
    resetCreate()
    resetUpdate()
  }

  const handleCreate = (payload: CreateChannelDivisionPayload) => {
    create(payload, { onSuccess: closeDialog })
  }

  const handleUpdate = (id: number, payload: UpdateChannelDivisionPayload) => {
    update({ id, payload }, { onSuccess: closeDialog })
  }

  const handleDelete = (id: number) => remove(id)

  // ── Columns ──
  const columns: GridColDef<ChannelDivisionRow>[] = [
    {
      field: 'channel_name',
      headerName: t('divisions.channelName'),
      flex: 1,
      minWidth: 180,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
      ),
    },
    {
      field: 'division',
      headerName: t('divisions.division'),
      width: 140,
      renderCell: ({ value }) => <DivisionChip division={value as Division} />,
    },
    {
      field: 'company_name',
      headerName: t('divisions.scope'),
      flex: 1,
      minWidth: 140,
      renderCell: ({ row }) => (
        <Typography variant="body2" color={row.company_id ? 'text.primary' : 'text.secondary'}>
          {row.company_name ?? t('divisions.scopeGlobal')}
        </Typography>
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
            {
              label: t('common.edit'),
              icon: <EditIcon />,
              onClick: () => { setSelected(row); setDialogMode('edit') },
              hidden: !can('settings.channel.division:update'),
            },
            {
              label: t('common.delete'),
              icon: <DeleteIcon />,
              onClick: () => handleDelete(row.id),
              color: 'error',
              dividerBefore: true,
              hidden: !can('settings.channel.division:delete'),
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
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('divisions.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('divisions.subtitle')}</Typography>
        </Box>
        {can('settings.channel.division:create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogMode('create')}
            mobileIconOnly
          >
            {t('divisions.add')}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel>{t('divisions.division')}</InputLabel>
            <Select
              value={divisionFilter}
              label={t('divisions.division')}
              onChange={(e) => setDivisionFilter(e.target.value as NonNullable<Division> | '')}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {DIVISION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('divisions.searchPlaceholder')}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />
        </Box>
      </Card>

      <ResponsiveListView
        rows={rows}
        columns={columns}
        loading={isLoading}
      />

      <DivisionMappingDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'create'}
        selected={selected}
        companies={companies}
        isPending={isCreating || isUpdating}
        error={createError ?? updateError}
        onClose={closeDialog}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </Box>
  )
}
