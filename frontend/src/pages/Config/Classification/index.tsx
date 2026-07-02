import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import MuiDialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GridColDef } from '@mui/x-data-grid'
import { api as axiosInstance } from '@/api/axios'
import { Button, StatusChip, ActionMenu } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCan } from '@/hooks/useCan'

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

const ITEM_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
  unit: 'primary',
  consumable: 'success',
  sparepart: 'warning',
  service: 'info',
}

const INITIAL_FORM = {
  match_type: 'keyword_item_name',
  match_pattern: '',
  item_type: 'unit',
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
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('nav.settingsClassification')}</Typography>
            <Tooltip title={t('classification_rules.tooltip')} arrow>
              <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help', mt: 0.25 }} />
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">{t('settings.classification.subtitle')}</Typography>
        </Box>
        {can('config.classification:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} mobileIconOnly>
            {t('classification_rules.add')}
          </Button>
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
      <MuiDialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? t('classification_rules.edit') : t('classification_rules.add')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Select size="small" value={form.match_type} onChange={(e) => setForm({ ...form, match_type: e.target.value })} fullWidth>
              {Object.entries(MATCH_TYPE_LABELS).map(([val, label]) => <MenuItem key={val} value={val}>{label}</MenuItem>)}
            </Select>
            <TextField size="small" label={t('classification_rules.colPattern')} value={form.match_pattern} onChange={(e) => setForm({ ...form, match_pattern: e.target.value })} fullWidth />
            <Select size="small" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} fullWidth>
              {(['unit', 'consumable', 'sparepart', 'service'] as const).map((val) => <MenuItem key={val} value={val}>{val}</MenuItem>)}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} isLoading={createMutation.isPending || updateMutation.isPending}>
            {editingId ? t('common.save') : t('common.add')}
          </Button>
        </DialogActions>
      </MuiDialog>

      {/* Delete Confirm */}
      <MuiDialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('classification_rules.deleteConfirm')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={() => deleteId && deleteMutation.mutate(deleteId)} isLoading={deleteMutation.isPending}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </MuiDialog>
    </Box>
  )
}
