import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import type { GridColDef } from '@mui/x-data-grid'
import { Card } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useCompanies } from '@/hooks/useCompanies'
import { useParetoThresholds, useUpsertParetoThreshold } from '@/hooks/useParetoThresholds'
import { useParetoAlertSettings, useUpsertParetoAlertSetting } from '@/hooks/useParetoAlertSettings'
import { useCan } from '@/hooks/useCan'
import type { ParetoPeriodType, ParetoMetric, ParetoThresholdRow } from '@/types/paretoThresholds'

const DEFAULT_DROP_PERCENT = 15
// 'monthly' ditambah task016 §18 (Aturan 2 "Report/Alert Monitoring" bulanan)
const PERIOD_TYPES: ParetoPeriodType[] = ['monthly', 'quarter', 'semester', 'annual']
const METRICS: ParetoMetric[] = ['revenue', 'margin']

function ThresholdCell({
  companyId, periodType, metric, row, canUpdate,
}: {
  companyId: number
  periodType: ParetoPeriodType
  metric: ParetoMetric
  row: ParetoThresholdRow | undefined
  canUpdate: boolean
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const { mutate: upsert, isPending } = useUpsertParetoThreshold()

  const currentValue = row ? Number(row.drop_percent) : DEFAULT_DROP_PERCENT

  const handleEdit = () => {
    setDraft(String(currentValue))
    setEditing(true)
  }

  const handleSave = () => {
    const value = Number(draft)
    if (Number.isNaN(value) || value < 0 || value > 100) return
    upsert(
      { company_id: companyId, period_type: periodType, metric, drop_percent: value },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          size="small"
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          sx={{ width: 100 }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
        />
        <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">
          {isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={() => setEditing(false)}><CloseIcon fontSize="small" /></IconButton>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2">{currentValue}%</Typography>
      {!row && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          ({t('paretoThreshold.defaultLabel')})
        </Typography>
      )}
      {canUpdate && (
        <IconButton size="small" onClick={handleEdit}><EditIcon fontSize="small" /></IconButton>
      )}
    </Box>
  )
}

// Toggle on/off SCHEDULER alert per company (task016 §19) — TERPISAH dari
// threshold di bawahnya (angka persentase). Default enabled=true kalau
// company belum pernah di-set (row belum ada), konsisten dgn default backend.
function AlertSchedulerToggle({ companyId, canUpdate }: { companyId: number; canUpdate: boolean }) {
  const { t } = useTranslation()
  const { data: settings = [] } = useParetoAlertSettings({ company_id: companyId })
  const { mutate: upsert, isPending } = useUpsertParetoAlertSetting()

  const row = settings.find(s => s.company_id === companyId)
  const enabled = row?.scheduler_enabled ?? true

  return (
    <FormControlLabel
      sx={{ mb: 2, display: 'flex' }}
      control={
        <Switch
          checked={enabled}
          disabled={!canUpdate || isPending}
          onChange={(e) => upsert({ company_id: companyId, scheduler_enabled: e.target.checked })}
        />
      }
      label={
        <Box>
          <Typography variant="body2">{t('paretoThreshold.schedulerToggle.label')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('paretoThreshold.schedulerToggle.hint')}</Typography>
        </Box>
      }
    />
  )
}

export function ParetoThresholdSection() {
  const { t } = useTranslation()
  const can = useCan()
  const { data: companies = [] } = useCompanies()
  const [companyId, setCompanyId] = useState<number | ''>('')

  const { data: rows = [] } = useParetoThresholds({ company_id: companyId || 'all' })

  const findRow = (periodType: ParetoPeriodType, metric: ParetoMetric) =>
    rows.find(r => r.period_type === periodType && r.metric === metric)

  const periodRows = PERIOD_TYPES.map((periodType) => ({ id: periodType, periodType }))
  const periodColumns: GridColDef[] = [
    {
      field: 'periodType', headerName: t('paretoThreshold.periodColumn'), flex: 1, minWidth: 130,
      renderCell: ({ value }) => t(`paretoThreshold.period.${value as ParetoPeriodType}`),
    },
    ...METRICS.map((metric): GridColDef => ({
      field: metric, headerName: t(`paretoThreshold.metric.${metric}`), flex: 1, minWidth: 160, sortable: false,
      renderCell: ({ row }) => (
        <ThresholdCell
          companyId={companyId as number}
          periodType={row.periodType}
          metric={metric}
          row={findRow(row.periodType, metric)}
          canUpdate={can('settings.threshold:update')}
        />
      ),
    })),
  ]

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 0.5 }}>
        {t('paretoThreshold.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('paretoThreshold.subtitle')}
      </Typography>

      <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
        <InputLabel>{t('paretoThreshold.company')}</InputLabel>
        <Select<number | ''>
          value={companyId}
          label={t('paretoThreshold.company')}
          onChange={(e) => setCompanyId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          {companies.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {companyId !== '' && (
        <AlertSchedulerToggle companyId={companyId} canUpdate={can('settings.threshold:update')} />
      )}

      {companyId === '' ? (
        <Typography variant="body2" color="text.secondary">{t('paretoThreshold.selectCompanyHint')}</Typography>
      ) : (
        <ResponsiveListView
          rows={periodRows}
          columns={periodColumns}
          mobileFields={['periodType', ...METRICS]}
          height={280}
          pageSizeOptions={[10]}
        />
      )}
    </Card>
  )
}
