import { useState, useMemo } from 'react'
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
import StarIcon from '@mui/icons-material/Star'
import CategoryIcon from '@mui/icons-material/Category'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import { Card, Button, ActionMenu, StatusChip } from '@/components/ui'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCompanies } from '@/hooks/useCompanies'
import {
  useHighMargins,
  useCreateHighMargin,
  useUpdateHighMargin,
  useDeactivateHighMargin,
  useDeleteHighMargin,
  useLocalProducts,
  useLocalCategories,
} from '@/hooks/useHighMargin'
import type { HighMarginMapping } from '@/types/highMargin'
import { HighMarginDialog } from './components/HighMarginDialog'
import { useCan } from '@/hooks/useCan'

type DialogMode = 'create' | 'edit' | null

export default function HighMarginSettings() {
  const { t } = useTranslation()
  const can = useCan()

  // ── Filter state ──
  // Default 'all' — buka halaman langsung tampilkan data sesuai company yang
  // memang boleh diakses user (di-scope backend lewat resolveCompanyScope),
  // tidak perlu pilih company dulu secara manual.
  const [companyId, setCompanyId] = useState<number | 'all'>('all')
  const [period, setPeriod] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  // ── Dialog / selection state ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<HighMarginMapping | null>(null)

  // Company spesifik saja (bukan 'all') — dipakai untuk aksi yang butuh satu
  // company pasti: dropdown produk/kategori di dialog Add, dan payload create.
  const singleCompanyId = typeof companyId === 'number' ? companyId : ''

  // ── Data ──
  const { data: companies = [] } = useCompanies()
  const { data: mappings = [], isLoading } = useHighMargins({
    company_id: companyId,
    period: period || undefined,
    active_only: activeOnly,
  })
  const { data: localProducts = [] } = useLocalProducts(singleCompanyId)
  const { data: localCategories = [] } = useLocalCategories(singleCompanyId)
  const productOptions = useMemo(
    () => [...localProducts, ...localCategories],
    [localProducts, localCategories]
  )

  // ── Mutations ──
  const { mutate: create, isPending: isCreating, error: createError, reset: resetCreate } = useCreateHighMargin()
  const { mutate: update, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateHighMargin()
  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateHighMargin()
  const { mutate: remove } = useDeleteHighMargin()

  // ── Handlers ──
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

  // ── Today check ──
  const today = new Date().toISOString().split('T')[0]
  const isActive = (row: HighMarginMapping) =>
    row.effective_from <= today && (row.effective_until === null || row.effective_until >= today)

  // ── Columns ──
  const columns: GridColDef<HighMarginMapping>[] = [
    {
      field: 'company_name',
      headerName: t('highMargin.company'),
      width: 160,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">{row.company_name ?? '-'}</Typography>
      ),
    },
    {
      field: 'target',
      headerName: t('highMargin.target'),
      flex: 2,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row.product_id
            ? <StarIcon fontSize="small" color="warning" />
            : <CategoryIcon fontSize="small" color="action" />}
          <Typography variant="body2">
            {row.product_name ?? row.category_name ?? '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: t('highMargin.type'),
      width: 110,
      renderCell: ({ row }) => (
        <StatusChip
          label={row.product_id ? t('highMargin.targetProduct') : t('highMargin.targetCategory')}
          color={row.product_id ? 'warning' : 'default'}
        />
      ),
    },
    {
      field: 'division_names',
      headerName: t('highMargin.assignedDivisions'),
      flex: 2,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', py: 0.5 }}>
          {row.division_names.map((name) => (
            <Chip key={name} size="small" label={name} variant="outlined" />
          ))}
        </Stack>
      ),
    },
    {
      field: 'effective_from',
      headerName: t('highMargin.effectiveFrom'),
      width: 120,
    },
    {
      field: 'effective_until',
      headerName: t('highMargin.effectiveUntil'),
      width: 120,
      renderCell: ({ row }) => row.effective_until ?? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {t('highMargin.ongoing')}
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
      headerName: t('highMargin.note'),
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
            { label: t('common.edit'), icon: <EditIcon />, onClick: () => { setSelected(row); setDialogMode('edit') }, hidden: !can('settings.product:update') },
            { label: t('highMargin.deactivate'), icon: <BlockIcon />, onClick: () => handleDeactivate(row.id), disabled: isDeactivating || !isActive(row), hidden: !isActive(row) || !can('settings.product:update') },
            { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => handleDelete(row.id), color: 'error', dividerBefore: true, hidden: !can('settings.product:delete') },
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
          <Typography variant="pageTitle">{t('highMargin.title')}</Typography>
          <Typography variant="pageSubtitle">{t('highMargin.subtitle')}</Typography>
        </Box>
        {can('settings.product:create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogMode('create')}
            disabled={companyId === 'all'}
            mobileIconOnly
          >
            {t('highMargin.add')}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: '0 0 auto' } }}>
            <InputLabel>{t('highMargin.company')}</InputLabel>
            <Select
              value={companyId}
              label={t('highMargin.company')}
              onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <MenuItem value="all">{t('highMargin.allCompanies')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <MonthYearPicker
            size="small"
            label={t('highMargin.filterPeriod')}
            value={period}
            onChange={setPeriod}
            sx={{ width: { xs: '100%', sm: 180 }, flex: { sm: '0 0 auto' } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                size="small"
              />
            }
            label={t('highMargin.activeOnly')}
          />
        </Box>
      </Card>

      {/* Table */}
      <Card>
        <ResponsiveListView
          rows={mappings}
          columns={columns}
          loading={isLoading}
        />
      </Card>

      {/* Dialog */}
      <HighMarginDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'create'}
        selected={selected}
        companyId={singleCompanyId || 0}
        productOptions={productOptions}
        isPending={isCreating || isUpdating}
        error={createError ?? updateError}
        onClose={closeDialog}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </Box>
  )
}
