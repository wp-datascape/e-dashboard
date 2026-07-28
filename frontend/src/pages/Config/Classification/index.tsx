import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GridColDef } from '@mui/x-data-grid'
import { api as axiosInstance } from '@/api/axios'
import { Button, StatusChip, ActionMenu, Dialog } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCan } from '@/hooks/useCan'
import { useCompanies } from '@/hooks/useCompanies'
import { useItemTypes, useItemTypeValues, useCreateItemType, useUpdateItemType, useDeleteItemType } from '@/hooks/useItemTypes'
import { getApiErrorMessage } from '@/utils/apiError'

// ─── Types & Constants ────────────────────────────────────────────────────────

interface Rule {
  id: number
  company_id: number | null
  match_type: string
  match_pattern: string
  item_type: string
  priority: number
  is_active: boolean
}

function getMatchTypeLabels(t: TFunction): Record<string, string> {
  return {
    keyword_item_name: t('classification_rules.matchTypeLabels.keyword_item_name'),
    keyword_category: t('classification_rules.matchTypeLabels.keyword_category'),
    price_range: t('classification_rules.matchTypeLabels.price_range'),
    exact_item_name: t('classification_rules.matchTypeLabels.exact_item_name'),
    exact_category: t('classification_rules.matchTypeLabels.exact_category'),
  }
}

const MATCH_TYPE_ORDER: Record<string, number> = {
  exact_item_name: 1,
  exact_category: 2,
  keyword_item_name: 3,
  keyword_category: 4,
  price_range: 5,
}

// Warna cuma didefinisikan buat 4 default bawaan (task011) - item type custom
// yang ditambah user fallback ke warna default StatusChip, tidak worth effort
// bikin generator warna dinamis buat 1 chip label kecil.
const ITEM_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
  unit: 'primary',
  consumable: 'success',
  sparepart: 'warning',
  service: 'info',
}

const INITIAL_FORM = {
  match_type: 'keyword_item_name',
  match_pattern: '',
  item_type: '',
  is_active: true,
  company_id: null as number | null,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassificationSettings() {
  const { t } = useTranslation()
  const MATCH_TYPE_LABELS = getMatchTypeLabels(t)
  const can = useCan()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const { data: companies = [] } = useCompanies()
  const companyNameById = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  )

  // ── Item Type management widget ──
  const [itemTypeCompanyId, setItemTypeCompanyId] = useState<number | null>(null)
  const activeItemTypeCompanyId = itemTypeCompanyId ?? companies[0]?.id ?? null
  const [newItemTypeLabel, setNewItemTypeLabel] = useState('')
  const { data: itemTypes = [] } = useItemTypes(
    activeItemTypeCompanyId ? { company_id: activeItemTypeCompanyId } : undefined,
  )
  const createItemType = useCreateItemType()
  const updateItemType = useUpdateItemType()
  const deleteItemType = useDeleteItemType()
  const itemTypeError = createItemType.error ?? updateItemType.error ?? deleteItemType.error

  const handleAddItemType = () => {
    const label = newItemTypeLabel.trim()
    if (!label || !activeItemTypeCompanyId) return
    createItemType.mutate(
      { company_id: activeItemTypeCompanyId, label },
      { onSuccess: () => setNewItemTypeLabel('') },
    )
  }

  // ── Item Type dropdown di dialog rule — cascading ke company yang dipilih
  //    di dialog itu sendiri (bukan company_id widget di atas). Rule global
  //    (company_id null) tampilkan gabungan semua entitas dalam scope user.
  const { data: formItemTypeOptionsRaw = [] } = useItemTypeValues(form.company_id ?? 'all')
  // Rule GLOBAL (Lingkup="Global") minta union item type semua company -
  // dedupe by key, tiap company biasanya punya key sama (default seed) jadi
  // tanpa ini dropdown-nya nampilin "Unit"/"Consumable"/dst berkali-kali.
  const formItemTypeOptions = useMemo(() => {
    const seen = new Set<string>()
    return formItemTypeOptionsRaw.filter((opt) => {
      if (seen.has(opt.key)) return false
      seen.add(opt.key)
      return true
    })
  }, [formItemTypeOptionsRaw])

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['classification-rules'],
    queryFn: () => axiosInstance.get('/classification-rules').then(r => r.data.data ?? []),
  })

  const sortedRules = useMemo(() =>
    [...(rules as Rule[])].sort((a, b) => (MATCH_TYPE_ORDER[a.match_type] ?? 99) - (MATCH_TYPE_ORDER[b.match_type] ?? 99)),
    [rules],
  )

  const createMutation = useMutation({
    mutationFn: (data: typeof INITIAL_FORM) => axiosInstance.post('/classification-rules', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDialogOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof INITIAL_FORM> }) =>
      axiosInstance.put(`/classification-rules/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDialogOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosInstance.delete(`/classification-rules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDeleteId(null) },
  })

  const openAdd = () => { setForm(INITIAL_FORM); setEditingId(null); setDialogOpen(true) }
  const openEdit = (rule: Rule) => {
    setForm({ match_type: rule.match_type, match_pattern: rule.match_pattern, item_type: rule.item_type, is_active: rule.is_active, company_id: rule.company_id })
    setEditingId(rule.id)
    setDialogOpen(true)
  }
  const handleSave = () => {
    if (editingId) updateMutation.mutate({ id: editingId, data: form })
    else createMutation.mutate(form)
  }

  const columns: GridColDef[] = [
    {
      field: 'match_type',
      headerName: t('classification_rules.colMatchType'),
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {MATCH_TYPE_LABELS[params.value as string] ?? params.value}
        </Typography>
      ),
    },
    {
      field: 'match_pattern',
      headerName: t('classification_rules.colPattern'),
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {params.value as string}
        </Typography>
      ),
    },
    {
      field: 'item_type',
      headerName: t('classification_rules.colItemType'),
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <StatusChip label={params.value as string} color={ITEM_TYPE_COLORS[params.value as string] ?? 'default'} />
        </Box>
      ),
    },
    {
      field: 'company_id',
      headerName: t('classification_rules.colScope'),
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Typography variant="body2" color={params.value ? 'text.primary' : 'text.secondary'}>
          {params.value ? (companyNameById.get(params.value as number) ?? params.value) : t('divisions.scopeGlobal')}
        </Typography>
      ),
    },
    {
      field: 'priority',
      headerName: t('classification_rules.colPriority'),
      width: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'is_active',
      headerName: t('classification_rules.colActive'),
      width: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Switch
            size="small"
            checked={params.value as boolean}
            onChange={() => updateMutation.mutate({ id: (params.row as Rule).id, data: { is_active: !params.value } })}
            disabled={!can('config.classification:update')}
          />
        </Box>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const rule = params.row as Rule
        return (
          <ActionMenu
            items={[
              { label: t('common.edit'), icon: <EditIcon />, onClick: () => openEdit(rule), hidden: !can('config.classification:update') },
              { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => setDeleteId(rule.id), color: 'error', dividerBefore: true, hidden: !can('config.classification:delete') },
            ]}
          />
        )
      },
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="pageTitle">{t('nav.settingsClassification')}</Typography>
            <Tooltip title={t('classification_rules.tooltip')} arrow>
              <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help', mt: 0.25 }} />
            </Tooltip>
          </Box>
          <Typography variant="pageSubtitle">{t('settings.classification.subtitle')}</Typography>
        </Box>
        {can('config.classification:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} mobileIconOnly>
            {t('classification_rules.add')}
          </Button>
        )}
      </Box>

      {/* Item Type management widget (task011) */}
      <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('classification_rules.itemTypeSectionTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('classification_rules.itemTypeSectionSubtitle')}</Typography>
          </Box>
          {companies.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('common.filters.entity')}</InputLabel>
              <Select
                value={activeItemTypeCompanyId ?? ''}
                label={t('common.filters.entity')}
                onChange={(e) => setItemTypeCompanyId(Number(e.target.value))}
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {itemTypes.length === 0 && (
            <Typography variant="body2" color="text.secondary">{t('classification_rules.itemTypeEmpty')}</Typography>
          )}
          {itemTypes.map((it) => (
            <Chip
              key={it.id}
              label={it.is_active ? it.label : `${it.label} ${t('classification_rules.itemTypeInactiveHint')}`}
              variant={it.is_active ? 'filled' : 'outlined'}
              color={it.is_active ? (ITEM_TYPE_COLORS[it.key] ?? 'default') : 'default'}
              onClick={can('config.classification:update')
                ? () => updateItemType.mutate({ id: it.id, payload: { is_active: !it.is_active } })
                : undefined}
              onDelete={can('config.classification:delete')
                ? () => deleteItemType.mutate(it.id)
                : undefined}
              size="small"
            />
          ))}
        </Stack>

        {itemTypeError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => { createItemType.reset(); updateItemType.reset(); deleteItemType.reset() }}>
            {getApiErrorMessage(itemTypeError, t)}
          </Alert>
        )}

        {can('config.classification:create') && (
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder={t('classification_rules.itemTypeAddPlaceholder')}
              value={newItemTypeLabel}
              onChange={(e) => setNewItemTypeLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddItemType() }}
              sx={{ minWidth: 220 }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddItemType}
              disabled={!newItemTypeLabel.trim() || createItemType.isPending}
            >
              {t('classification_rules.itemTypeAddLabel')}
            </Button>
          </Stack>
        )}
      </Box>

      <ResponsiveListView
        rows={sortedRules}
        columns={columns}
        loading={isLoading}
        error={error as Error | null}
        height={500}
        mobileFields={['match_type', 'match_pattern', 'item_type', 'is_active']}
      />

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        title={editingId ? t('classification_rules.edit') : t('classification_rules.add')}
        actions={[
          { label: t('common.cancel'), onClick: () => setDialogOpen(false), variant: 'text' },
          {
            label: editingId ? t('common.save') : t('common.add'),
            onClick: handleSave,
            isLoading: createMutation.isPending || updateMutation.isPending,
          },
        ]}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Select size="small" value={form.match_type} onChange={(e) => setForm({ ...form, match_type: e.target.value })} fullWidth>
            {Object.entries(MATCH_TYPE_LABELS).map(([val, label]) => <MenuItem key={val} value={val}>{label}</MenuItem>)}
          </Select>
          <TextField size="small" label={t('classification_rules.colPattern')} value={form.match_pattern} onChange={(e) => setForm({ ...form, match_pattern: e.target.value })} fullWidth />

          <FormControl fullWidth size="small">
            <InputLabel shrink>{t('divisions.scope')}</InputLabel>
            <Select
              value={form.company_id ?? ''}
              label={t('divisions.scope')}
              displayEmpty
              onChange={(e) => {
                const raw = e.target.value as number | ''
                setForm({ ...form, company_id: raw === '' ? null : raw, item_type: '' })
              }}
            >
              <MenuItem value="">{t('divisions.scopeGlobal')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel shrink>{t('classification_rules.colItemType')}</InputLabel>
            <Select
              value={form.item_type}
              label={t('classification_rules.colItemType')}
              displayEmpty
              onChange={(e) => setForm({ ...form, item_type: e.target.value })}
            >
              {formItemTypeOptions.map((opt) => (
                <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        maxWidth="xs"
        title={t('common.delete')}
        actions={[
          { label: t('common.cancel'), onClick: () => setDeleteId(null), variant: 'text' },
          {
            label: t('common.delete'),
            onClick: () => deleteId && deleteMutation.mutate(deleteId),
            color: 'error',
            isLoading: deleteMutation.isPending,
          },
        ]}
      >
        <Typography variant="body2">{t('classification_rules.deleteConfirm')}</Typography>
      </Dialog>
    </Box>
  )
}
