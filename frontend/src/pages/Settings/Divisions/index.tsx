import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
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
import { useDivisionOptions } from '@/hooks/useDivisionOptions'
import {
  useDivisions,
  useCreateDivision,
  useUpdateDivision,
  useDeleteDivision,
} from '@/hooks/useDivisions'
import {
  useIntercompanyNames,
  useCreateIntercompanyName,
  useDeleteIntercompanyName,
  useAmbiguousChannels,
  useCustomerNameOptions,
} from '@/hooks/useIntercompanyNames'
import { getApiErrorMessage } from '@/utils/apiError'
import { getDivisionColor } from '@/utils/divisionColor'
import type { ChannelDivisionRow, CreateChannelDivisionPayload, UpdateChannelDivisionPayload } from '@/types/channelDivisions'
import type { Division } from '@/types/customers'
import { DORMANT_CATEGORY_VALUES } from '@/types/divisions'
import type { DormantCategory } from '@/types/divisions'
import { DivisionMappingDialog } from './components/DivisionMappingDialog'
import { useCan } from '@/hooks/useCan'

type DialogMode = 'create' | 'edit' | null

export default function DivisionsSettings() {
  const { t } = useTranslation()
  const can = useCan()

  // ── Filter state ── (division_id sekarang numeric, task012 v2)
  const [divisionFilter, setDivisionFilter] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  // Opsi filter diambil dari katalog divisions per company (task012 v2)
  const divisionOptions = useDivisionOptions('all')

  // ── Dialog / selection state ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<ChannelDivisionRow | null>(null)

  // ── Data ──
  const { data: companies = [] } = useCompanies()
  const { data: rows = [], isLoading } = useChannelDivisions({
    division: divisionFilter || undefined,
    search: search || undefined,
  })

  // ── Mutations (Channel Division mapping) ──
  const { mutate: create, isPending: isCreating, error: createError, reset: resetCreate } = useCreateChannelDivision()
  const { mutate: update, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateChannelDivision()
  const { mutate: remove } = useDeleteChannelDivision()

  // ── Division CRUD widget (task012 v2) — permission TERPISAH (settings.division:*)
  // dari Channel Division mapping di atas (settings.channel.division:*) karena
  // division menyentuh RBAC/scope akses user lain.
  const [divisionManageCompanyId, setDivisionManageCompanyId] = useState<number | null>(null)
  const activeDivisionCompanyId = divisionManageCompanyId ?? companies[0]?.id ?? null
  const [newDivisionLabel, setNewDivisionLabel] = useState('')
  const [newDivisionDormantCategory, setNewDivisionDormantCategory] = useState<DormantCategory | ''>('')
  const { data: divisionList = [] } = useDivisions(
    activeDivisionCompanyId ? { company_id: activeDivisionCompanyId } : undefined,
  )
  const createDivision = useCreateDivision()
  const updateDivision = useUpdateDivision()
  const deleteDivision = useDeleteDivision()
  const divisionCrudError = createDivision.error ?? updateDivision.error ?? deleteDivision.error

  // ── Customer Intercompany widget (task013) — sub-section terpisah dari Division
  // CRUD di atas, sama-sama scoped ke activeDivisionCompanyId (company selector
  // dishare). Nama yang ditambah di sini otomatis sync ke customers.division_override_id
  // di backend (lihat docs-v2/task/task013.md) - tidak ada pilihan division manual di
  // sini, selalu dipetakan ke division "Intercompany" company yang bersangkutan.
  // Input WAJIB autocomplete dari nama customer riil (bukan ketik bebas) - exact
  // match ke customers.customer_name, ketik bebas rawan typo/mismatch yang bikin
  // sync diam-diam gagal (tidak ada baris yang cocok, tapi alias tetap tersimpan).
  const [newIntercompanyName, setNewIntercompanyName] = useState<string | null>(null)
  const { data: intercompanyNames = [] } = useIntercompanyNames(
    activeDivisionCompanyId ? { company_id: activeDivisionCompanyId } : undefined,
  )
  const { data: customerNameOptions = [] } = useCustomerNameOptions(activeDivisionCompanyId)
  const alreadyAddedNames = new Set(intercompanyNames.map((n) => n.customer_name))
  const customerNameChoices = customerNameOptions
    .map((o) => o.customer_name)
    .filter((name) => !alreadyAddedNames.has(name))
  const createIntercompanyName = useCreateIntercompanyName()
  const deleteIntercompanyName = useDeleteIntercompanyName()
  const intercompanyCrudError = createIntercompanyName.error ?? deleteIntercompanyName.error

  // Deteksi proaktif channel yang dipakai campuran (task013 §3g) — peringatan
  // sebelum kejadian salah lapor macam SALES SUPPORT/KODE NIAGA TAMA terulang di
  // channel/entitas lain. Di-scope company yang sama dengan widget di atas.
  const { data: ambiguousChannels = [] } = useAmbiguousChannels(
    activeDivisionCompanyId ? { company_id: activeDivisionCompanyId } : undefined,
  )

  const handleAddIntercompanyName = () => {
    if (!newIntercompanyName || !activeDivisionCompanyId) return
    createIntercompanyName.mutate(
      { company_id: activeDivisionCompanyId, customer_name: newIntercompanyName },
      { onSuccess: () => setNewIntercompanyName(null) },
    )
  }

  const handleAddDivision = () => {
    const label = newDivisionLabel.trim()
    if (!label || !activeDivisionCompanyId || !newDivisionDormantCategory) return
    createDivision.mutate(
      { company_id: activeDivisionCompanyId, label, dormant_category: newDivisionDormantCategory },
      { onSuccess: () => { setNewDivisionLabel(''); setNewDivisionDormantCategory('') } },
    )
  }

  // ── Handlers (Channel Division mapping) ──
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
        <Typography variant="body2">{row.company_name}</Typography>
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
          <Typography variant="pageTitle">{t('divisions.title')}</Typography>
          <Typography variant="pageSubtitle">{t('divisions.subtitle')}</Typography>
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

      {/* Division CRUD widget (task012 v2) */}
      {can('settings.division:view') && (
        <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('divisions.divisionSectionTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('divisions.divisionSectionSubtitle')}</Typography>
            </Box>
            {companies.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>{t('common.filters.entity')}</InputLabel>
                <Select
                  value={activeDivisionCompanyId ?? ''}
                  label={t('common.filters.entity')}
                  onChange={(e) => setDivisionManageCompanyId(Number(e.target.value))}
                >
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
            {divisionList.length === 0 && (
              <Typography variant="body2" color="text.secondary">{t('divisions.divisionEmpty')}</Typography>
            )}
            {divisionList.map((d) => {
              const labelText = d.is_protected
                ? `${d.label} ${t('divisions.divisionProtectedHint')}`
                : d.is_active ? d.label : `${d.label} ${t('divisions.divisionInactiveHint')}`
              return (
                <Chip
                  key={d.id}
                  label={labelText}
                  variant={d.is_active ? 'filled' : 'outlined'}
                  color={d.is_active ? getDivisionColor(d.key) : 'default'}
                  onClick={can('settings.division:update') && !d.is_protected
                    ? () => updateDivision.mutate({ id: d.id, payload: { is_active: !d.is_active } })
                    : undefined}
                  onDelete={can('settings.division:delete') && !d.is_protected
                    ? () => deleteDivision.mutate(d.id)
                    : undefined}
                  size="small"
                />
              )
            })}
          </Stack>

          {divisionCrudError && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => { createDivision.reset(); updateDivision.reset(); deleteDivision.reset() }}
            >
              {getApiErrorMessage(divisionCrudError, t)}
            </Alert>
          )}

          {can('settings.division:create') && (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder={t('divisions.divisionAddPlaceholder')}
                value={newDivisionLabel}
                onChange={(e) => setNewDivisionLabel(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>{t('divisions.dormantCategory')}</InputLabel>
                <Select
                  value={newDivisionDormantCategory}
                  label={t('divisions.dormantCategory')}
                  onChange={(e) => setNewDivisionDormantCategory(e.target.value as DormantCategory)}
                >
                  {DORMANT_CATEGORY_VALUES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{t(`divisions.dormantCategoryLabels.${cat}`)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddDivision}
                disabled={!newDivisionLabel.trim() || !newDivisionDormantCategory || createDivision.isPending}
              >
                {t('divisions.divisionAddLabel')}
              </Button>
            </Stack>
          )}
        </Box>
      )}

      {/* Customer Intercompany widget (task013) */}
      {can('settings.intercompany:view') && (
        <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('divisions.intercompanySectionTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('divisions.intercompanySectionSubtitle')}</Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
            {intercompanyNames.length === 0 && (
              <Typography variant="body2" color="text.secondary">{t('divisions.intercompanyEmpty')}</Typography>
            )}
            {intercompanyNames.map((n) => (
              <Chip
                key={n.id}
                label={n.customer_name}
                variant="filled"
                color="warning"
                onDelete={can('settings.intercompany:delete') ? () => deleteIntercompanyName.mutate(n.id) : undefined}
                size="small"
              />
            ))}
          </Stack>

          {intercompanyCrudError && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => { createIntercompanyName.reset(); deleteIntercompanyName.reset() }}
            >
              {getApiErrorMessage(intercompanyCrudError, t)}
            </Alert>
          )}

          {can('settings.intercompany:create') && (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Autocomplete
                size="small"
                options={customerNameChoices}
                value={newIntercompanyName}
                onChange={(_, val) => setNewIntercompanyName(val)}
                disablePortal
                sx={{ minWidth: 280 }}
                renderInput={(params) => (
                  <TextField {...params} placeholder={t('divisions.intercompanyAddPlaceholder')} />
                )}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddIntercompanyName}
                disabled={!newIntercompanyName || createIntercompanyName.isPending}
              >
                {t('divisions.intercompanyAddLabel')}
              </Button>
            </Stack>
          )}

          {ambiguousChannels.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('divisions.ambiguousChannelTitle')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('divisions.ambiguousChannelHint')}
              </Typography>
              <Stack spacing={0.5}>
                {ambiguousChannels.map((ch) => (
                  <Typography key={ch.channel_name} variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {ch.channel_name} — {t('divisions.ambiguousChannelStats', {
                      override: ch.override_customers,
                      regular: ch.regular_customers,
                    })}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel>{t('divisions.division')}</InputLabel>
            <Select
              value={divisionFilter}
              label={t('divisions.division')}
              onChange={(e) => {
                const v = String(e.target.value)
                setDivisionFilter(v === '' ? '' : Number(v))
              }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {divisionOptions.map((opt) => (
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
