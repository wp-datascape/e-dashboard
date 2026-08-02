import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { useConfig, useUpdateConfig } from '@/hooks/usePageSettings'
import type { ConfigItem } from '@/types/page'
import { Card } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCan } from '@/hooks/useCan'
import { ParetoThresholdSection } from './components/ParetoThresholdSection'

function getBuLabels(t: TFunction): Record<string, string> {
  return {
    b2b_dc: t('config.buThreshold.b2bDc'),
    b2b_project: t('config.buThreshold.b2bProject'),
    b2c: t('config.buThreshold.b2c'),
    manufacturing: t('config.buThreshold.manufacturing'),
  }
}
function getBuDesc(t: TFunction): Record<string, string> {
  return {
    b2b_dc: t('config.buThreshold.b2bDcDesc'),
    b2b_project: t('config.buThreshold.b2bProjectDesc'),
    b2c: t('config.buThreshold.b2cDesc'),
    manufacturing: t('config.buThreshold.manufacturingDesc'),
  }
}
// Config "General Settings" yang sudah ada terjemahan resmi (label + notes) - selain
// ini fallback ke item.key/item.description mentah dari DB (lihat ConfigRow/BooleanConfigRow).
function getGeneralLabels(t: TFunction): Record<string, string> {
  return {
    active_window_months: t('config.generalSection.activeWindowLabel'),
    branch_division_enforcement_enabled: t('config.generalSection.enforcementLabel'),
    accurate_sync_enabled: t('config.generalSection.accurateSyncLabel'),
  }
}
function getGeneralDesc(t: TFunction): Record<string, string> {
  return {
    active_window_months: t('config.generalSection.activeWindowDesc'),
    branch_division_enforcement_enabled: t('config.generalSection.enforcementDesc'),
    accurate_sync_enabled: t('config.generalSection.accurateSyncDesc'),
  }
}
const DORMANT_PREFIX = 'dormant_threshold_months.'
const KPI_TARGET_KEYS = [
  'repeat_order_target_pct',
  'dormant_rate_alert_pct',
  'reactivation_target_low_pct',
  'reactivation_target_high_pct',
]
// network_throttle_* (business_configs) punya halaman sendiri yang benar
// (Access Control > AB Testing, lihat pages/AbTesting/index.tsx) — dikeluarkan
// dari "General Settings" di sini supaya tidak nyasar tampil dobel di halaman
// Threshold dengan label satuan yang salah (halaman ini nge-generic-kan semua
// config non-dormant/non-KPI sebagai "bulan", padahal network_throttle_*
// satuannya ms, laporan user 2026-07-29).
const EXCLUDED_PREFIXES = ['network_throttle_']
function getKpiTargetLabels(t: TFunction): Record<string, string> {
  return {
    repeat_order_target_pct:      t('config.kpiTarget.repeatOrderLabel'),
    dormant_rate_alert_pct:       t('config.kpiTarget.dormantAlertLabel'),
    reactivation_target_low_pct:  t('config.kpiTarget.reactivationMinLabel'),
    reactivation_target_high_pct: t('config.kpiTarget.reactivationIdealLabel'),
  }
}
function getKpiTargetDesc(t: TFunction): Record<string, string> {
  return {
    repeat_order_target_pct:      t('config.kpiTarget.repeatOrderDesc'),
    dormant_rate_alert_pct:       t('config.kpiTarget.dormantAlertDesc'),
    reactivation_target_low_pct:  t('config.kpiTarget.reactivationMinDesc'),
    reactivation_target_high_pct: t('config.kpiTarget.reactivationIdealDesc'),
  }
}

function EditablePctCell({ item }: { item: ConfigItem }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const { mutate, isPending } = useUpdateConfig()
  const can = useCan()
  const handleSave = () => mutate({ key: item.key, value: draft }, { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) })
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField size="small" type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus sx={{ width: 110 }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment>, inputProps: { min: 0, max: 100 } } }} />
        <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">{isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}</IconButton>
        <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip label={`${item.value}%`} size="small" color="success" variant="outlined" />
      {can('settings.threshold:update') && (
        <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
      )}
    </Box>
  )
}

function EditableMonthCell({ item, onSave }: { item: ConfigItem; onSave: (key: string, value: string) => void }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const can = useCan()
  const handleSave = () => { onSave(item.key, draft); setEditing(false) }
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField size="small" type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus sx={{ width: 100 }} slotProps={{ input: { endAdornment: <InputAdornment position="end">{t('config.buThreshold.monthsUnit')}</InputAdornment> } }} />
        <IconButton size="small" onClick={handleSave} color="primary"><CheckIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip label={t('config.buThreshold.monthsChip', { value: item.value })} size="small" color="primary" variant="outlined" />
      {can('settings.threshold:update') && (
        <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
      )}
    </Box>
  )
}

// Config yang value-nya literal 'true'/'false' (mis. feature flag) di-render sebagai
// Switch, bukan text/number field — field number generik menolak input non-numerik
// jadi 'true'/'false' tidak pernah bisa diketik ulang lewat UI itu.
function BooleanConfigRow({ item, label, desc }: { item: ConfigItem; label?: string; desc?: string }) {
  const { mutate, isPending } = useUpdateConfig()
  const can = useCan()
  const checked = item.value === 'true'
  const handleToggle = () => mutate({ key: item.key, value: checked ? 'false' : 'true' })
  const note = desc ?? item.description
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 }, py: 1.5 }}>
      <Box sx={{ flex: 2, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label ?? item.key}</Typography>
        {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
      </Box>
      <Box sx={{ flex: { sm: 1 }, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label={checked ? 'true' : 'false'} size="small" color={checked ? 'success' : 'default'} variant="outlined" />
        {isPending
          ? <CircularProgress size={20} />
          : <Switch checked={checked} onChange={handleToggle} size="small" disabled={!can('settings.threshold:update')} />}
      </Box>
      <Box sx={{ width: { sm: 40 } }} />
    </Box>
  )
}

function ConfigRow({ item, label, desc }: { item: ConfigItem; label?: string; desc?: string }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const { mutate, isPending } = useUpdateConfig()
  const can = useCan()
  const handleSave = () => mutate({ key: item.key, value: draft }, { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) })
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  if (item.value === 'true' || item.value === 'false') return <BooleanConfigRow item={item} label={label} desc={desc} />
  const note = desc ?? item.description
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 }, py: 1.5 }}>
      <Box sx={{ flex: 2, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label ?? item.key}</Typography>
        {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
      </Box>
      <Box sx={{ flex: { sm: 1 }, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
        {editing
          ? <TextField size="small" type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus fullWidth slotProps={{ input: { endAdornment: <InputAdornment position="end">{t('config.buThreshold.monthsUnit')}</InputAdornment> } }} />
          : <Chip label={t('config.buThreshold.monthsChip', { value: item.value })} size="small" variant="outlined" />}
      </Box>
      <Box>
        {editing ? (
          <>
            <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">{isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}</IconButton>
            <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
          </>
        ) : can('settings.threshold:update') ? (
          <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
        ) : null}
      </Box>
    </Box>
  )
}

export default function ThresholdSettings() {
  const { t } = useTranslation()
  const can = useCan()
  const BU_LABELS = getBuLabels(t)
  const BU_DESC = getBuDesc(t)
  const KPI_TARGET_LABELS = getKpiTargetLabels(t)
  const KPI_TARGET_DESC = getKpiTargetDesc(t)
  const GENERAL_LABELS = getGeneralLabels(t)
  const GENERAL_DESC = getGeneralDesc(t)
  const { data: configs, isLoading, error } = useConfig()
  const { mutate } = useUpdateConfig()
  const allItems: ConfigItem[] = configs ?? []
  const buDormantItems = allItems.filter((c) => c.key.startsWith(DORMANT_PREFIX))
  const kpiTargetItems = allItems.filter((c) => KPI_TARGET_KEYS.includes(c.key))
  const otherItems = allItems.filter((c) =>
    !c.key.startsWith(DORMANT_PREFIX) &&
    !KPI_TARGET_KEYS.includes(c.key) &&
    !EXCLUDED_PREFIXES.some((prefix) => c.key.startsWith(prefix)),
  )
  const handleSave = (key: string, value: string) => mutate({ key, value })

  // Baris + kolom untuk ResponsiveListView (desktop DataGrid otomatis / mobile
  // accordion otomatis dari AutoCard) — GANTI pola lama (Table desktop +
  // Stack<Card> mobile ditulis manual berdampingan, gampang divergen kalau
  // salah satu lupa di-update, lihat halaman lain sesi ini yang kena masalah
  // sama). `id` WAJIB diisi manual (ConfigItem tidak punya field id bawaan).
  const buRows = buDormantItems.map((item) => {
    const buCode = item.key.replace(DORMANT_PREFIX, '')
    return { ...item, id: item.key, label: BU_LABELS[buCode] ?? buCode, note: BU_DESC[buCode] ?? item.description ?? '' }
  })
  const buColumns: GridColDef[] = [
    { field: 'label', headerName: t('config.buThreshold.colBu'), flex: 1, minWidth: 140 },
    {
      field: 'threshold', headerName: t('config.buThreshold.colThreshold'), width: 170, sortable: false,
      renderCell: ({ row }) => <EditableMonthCell item={row as ConfigItem} onSave={handleSave} />,
    },
    { field: 'note', headerName: t('config.buThreshold.colNote'), flex: 1.5, minWidth: 200 },
  ]

  const kpiRows = kpiTargetItems.map((item) => ({
    ...item, id: item.key, label: KPI_TARGET_LABELS[item.key] ?? item.key, note: KPI_TARGET_DESC[item.key] ?? item.description ?? '',
  }))
  const kpiColumns: GridColDef[] = [
    { field: 'label', headerName: t('config.kpiTarget.colKpi'), flex: 1, minWidth: 160 },
    {
      field: 'threshold', headerName: t('config.kpiTarget.colTarget'), width: 140, sortable: false,
      renderCell: ({ row }) => <EditablePctCell item={row as ConfigItem} />,
    },
    { field: 'note', headerName: t('config.buThreshold.colNote'), flex: 1.5, minWidth: 200 },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.settingsThreshold')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('settings.threshold.subtitle')}</Typography>

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('error.generic')}</Alert>}

      {!isLoading && !error && (
        <Stack spacing={3}>
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('config.buThreshold.title')}</Typography>
              <Tooltip title={t('config.buThreshold.tooltip')} placement="right" arrow>
                <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
              </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('config.buThreshold.subtitle')}</Typography>

            {buDormantItems.length > 0 ? (
              <ResponsiveListView rows={buRows} columns={buColumns} mobileFields={['label', 'threshold', 'note']} height={280} pageSizeOptions={[10]} />
            ) : (
              <Typography variant="body2" color="text.secondary">{t('config.buThreshold.empty')}</Typography>
            )}
          </Card>

          {kpiTargetItems.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('config.kpiTarget.sectionTitle')}</Typography>
                <Tooltip title={t('config.kpiTarget.tooltip')} placement="right" arrow>
                  <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('config.kpiTarget.sectionSubtitle')}
              </Typography>
              <ResponsiveListView rows={kpiRows} columns={kpiColumns} mobileFields={['label', 'threshold', 'note']} height={280} pageSizeOptions={[10]} />
            </Card>
          )}

          {otherItems.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('config.generalSection.title')}</Typography>
              <Stack divider={<Divider />}>{otherItems.map((item) => <ConfigRow key={item.key} item={item} label={GENERAL_LABELS[item.key]} desc={GENERAL_DESC[item.key]} />)}</Stack>
            </Card>
          )}

          {can('settings.pareto:view') && <ParetoThresholdSection />}

          <Card sx={{ p: 3, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <InfoOutlinedIcon color="info" sx={{ mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{t('config.periodInfo.title')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('config.periodInfo.body')}</Typography>
              </Box>
            </Box>
          </Card>
        </Stack>
      )}
    </Box>
  )
}
