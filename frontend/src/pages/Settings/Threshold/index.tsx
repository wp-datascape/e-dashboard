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
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useConfig, useUpdateConfig } from '@/hooks/usePageSettings'
import type { ConfigItem } from '@/types/page'
import { Card } from '@/components/ui'
import { useCan } from '@/hooks/useCan'

function getBuLabels(t: TFunction): Record<string, string> {
  return {
    b2b_dc: t('config.buThreshold.b2bDc'),
    b2b_project: t('config.buThreshold.b2bProject'),
    b2c: t('config.buThreshold.b2c'),
    manufacturing: t('config.buThreshold.manufacturing'),
  }
}
const DORMANT_PREFIX = 'dormant_threshold_months.'
const KPI_TARGET_KEYS = [
  'repeat_order_target_pct',
  'dormant_rate_alert_pct',
  'reactivation_target_low_pct',
  'reactivation_target_high_pct',
]
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

function ConfigRow({ item }: { item: ConfigItem }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const { mutate, isPending } = useUpdateConfig()
  const can = useCan()
  const handleSave = () => mutate({ key: item.key, value: draft }, { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) })
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.key}</Typography>
        {item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}
      </Box>
      <Box sx={{ flex: 1 }}>
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
  const BU_LABELS = getBuLabels(t)
  const KPI_TARGET_LABELS = getKpiTargetLabels(t)
  const KPI_TARGET_DESC = getKpiTargetDesc(t)
  const { data: configs, isLoading, error } = useConfig()
  const { mutate } = useUpdateConfig()
  const allItems: ConfigItem[] = configs ?? []
  const buDormantItems = allItems.filter((c) => c.key.startsWith(DORMANT_PREFIX))
  const kpiTargetItems = allItems.filter((c) => KPI_TARGET_KEYS.includes(c.key))
  const otherItems = allItems.filter((c) => !c.key.startsWith(DORMANT_PREFIX) && !KPI_TARGET_KEYS.includes(c.key))
  const handleSave = (key: string, value: string) => mutate({ key, value })

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.settingsThreshold')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('settings.threshold.subtitle')}</Typography>

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
              <>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: '35%' }}>{t('config.buThreshold.colBu')}</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '30%' }}>{t('config.buThreshold.colThreshold')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t('config.buThreshold.colNote')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {buDormantItems.map((item) => {
                        const buCode = item.key.replace(DORMANT_PREFIX, '')
                        return (
                          <TableRow key={item.key} hover>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{BU_LABELS[buCode] ?? buCode}</Typography></TableCell>
                            <TableCell><EditableMonthCell item={item} onSave={handleSave} /></TableCell>
                            <TableCell><Typography variant="caption" color="text.secondary">{item.description}</Typography></TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>

                <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                  {buDormantItems.map((item) => {
                    const buCode = item.key.replace(DORMANT_PREFIX, '')
                    return (
                      <Card key={item.key} sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{BU_LABELS[buCode] ?? buCode}</Typography>
                            <EditableMonthCell item={item} onSave={handleSave} />
                          </Box>
                          {item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}
                        </Stack>
                      </Card>
                    )
                  })}
                </Stack>
              </>
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
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>{t('config.kpiTarget.colKpi')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '25%' }}>{t('config.kpiTarget.colTarget')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('config.buThreshold.colNote')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpiTargetItems.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{KPI_TARGET_LABELS[item.key] ?? item.key}</Typography></TableCell>
                      <TableCell><EditablePctCell item={item} /></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{KPI_TARGET_DESC[item.key] ?? item.description}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {otherItems.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('config.generalSection.title')}</Typography>
              <Stack divider={<Divider />}>{otherItems.map((item) => <ConfigRow key={item.key} item={item} />)}</Stack>
            </Card>
          )}

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
