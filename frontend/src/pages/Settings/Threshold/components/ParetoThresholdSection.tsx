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
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { useCompanies } from '@/hooks/useCompanies'
import { useParetoThresholds, useUpsertParetoThreshold } from '@/hooks/useParetoThresholds'
import { useCan } from '@/hooks/useCan'
import type { ParetoPeriodType, ParetoMetric, ParetoThresholdRow } from '@/types/paretoThresholds'

const DEFAULT_DROP_PERCENT = 15
const PERIOD_TYPES: ParetoPeriodType[] = ['quarter', 'semester', 'annual']
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

export function ParetoThresholdSection() {
  const { t } = useTranslation()
  const can = useCan()
  const { data: companies = [] } = useCompanies()
  const [companyId, setCompanyId] = useState<number | ''>('')

  const { data: rows = [] } = useParetoThresholds({ company_id: companyId || 'all' })

  const findRow = (periodType: ParetoPeriodType, metric: ParetoMetric) =>
    rows.find(r => r.period_type === periodType && r.metric === metric)

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

      {companyId === '' ? (
        <Typography variant="body2" color="text.secondary">{t('paretoThreshold.selectCompanyHint')}</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('paretoThreshold.periodColumn')}</TableCell>
                {METRICS.map((m) => (
                  <TableCell key={m}>{t(`paretoThreshold.metric.${m}`)}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERIOD_TYPES.map((periodType) => (
                <TableRow key={periodType}>
                  <TableCell>{t(`paretoThreshold.period.${periodType}`)}</TableCell>
                  {METRICS.map((metric) => (
                    <TableCell key={metric}>
                      <ThresholdCell
                        companyId={companyId}
                        periodType={periodType}
                        metric={metric}
                        row={findRow(periodType, metric)}
                        canUpdate={can('settings.threshold:update')}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  )
}
