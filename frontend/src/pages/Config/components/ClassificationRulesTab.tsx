import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api as axiosInstance } from '@/api/axios'
import { Card } from '@/components/ui'
import { Button } from '@/components/ui'
import { cip } from '@components/ui'

interface Rule {
  id: number
  company_id: number | null
  match_type: string
  match_pattern: string
  item_type: string
  priority: number
  is_active: boolean
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  keyword_item_name: 'Keyword (Item Name)',
  keyword_category: 'Keyword (Category)',
  price_range: 'Price Range',
  exact_item_name: 'Exact (Item Name)',
  exact_category: 'Exact (Category)',
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

export function ClassificationRulesTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['classification-rules'],
    queryFn: () => axiosInstance.get('/classification-rules').then(r => r.data.data ?? []),
  })

  // Sort rules: exact first, then keyword by name, then category, then price
  const sortedRules = useMemo(() =>
    [...(rules as Rule[])].sort((a, b) => (MATCH_TYPE_ORDER[a.match_type] ?? 99) - (MATCH_TYPE_ORDER[b.match_type] ?? 99)),
    [rules],
  )

  const createMutation = useMutation({
    mutationFn: (data: { match_type: string; match_pattern: string; item_type: string; is_active: boolean }) =>
      axiosInstance.post('/classification-rules', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDialogOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof form> }) =>
      axiosInstance.put(`/classification-rules/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDialogOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosInstance.delete(`/classification-rules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classification-rules'] }); setDeleteId(null) },
  })

  const openAdd = () => { setForm(INITIAL_FORM); setEditingId(null); setDialogOpen(true) }
  const openEdit = (rule: Rule) => {
    setForm({
      match_type: rule.match_type,
      match_pattern: rule.match_pattern,
      item_type: rule.item_type,
      is_active: rule.is_active,
      company_id: rule.company_id,
    })
    setEditingId(rule.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (editingId) updateMutation.mutate({ id: editingId, data: form })
    else createMutation.mutate(form)
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{t('common.error')}</Alert>

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('classification_rules.title')}</Typography>
            <Tooltip title={t('classification_rules.tooltip')} arrow><InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} /></Tooltip>
          </Box>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd}>
            {t('classification_rules.add')}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('classification_rules.subtitle')}</Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colMatchType')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colPattern')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colItemType')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colPriority')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colActive')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('classification_rules.colActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRules.map((rule) => (
                <TableRow key={rule.id} hover>
                  <TableCell>
                    <Typography variant="body2">{MATCH_TYPE_LABELS[rule.match_type] ?? rule.match_type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {rule.match_pattern}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={rule.item_type} size="small" color={ITEM_TYPE_COLORS[rule.item_type] ?? 'default'} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{rule.priority}</Typography></TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={rule.is_active}
                      onChange={() => updateMutation.mutate({ id: rule.id, data: { is_active: !rule.is_active } })}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(rule)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(rule.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(rules as Rule[]).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      {t('classification_rules.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? t('classification_rules.edit') : t('classification_rules.add')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Select
              size="small"
              value={form.match_type}
              onChange={(e) => setForm({ ...form, match_type: e.target.value })}
              fullWidth
            >
              {Object.entries(MATCH_TYPE_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label={t('classification_rules.colPattern')}
              value={form.match_pattern}
              onChange={(e) => setForm({ ...form, match_pattern: e.target.value })}
              fullWidth
            />
            <Select
              size="small"
              value={form.item_type}
              onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              fullWidth
            >
              {(['unit', 'consumable', 'sparepart', 'service'] as const).map((val) => (
                <MenuItem key={val} value={val}>{val}</MenuItem>
              ))}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            {editingId ? t('common.save') : t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('classification_rules.deleteConfirm')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}