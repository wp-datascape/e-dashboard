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
import { useConfig, useUpdateConfig } from '@/hooks/usePageSettings'
import type { ConfigItem } from '@/types/page'
import { Card } from '@/components/ui'

const BU_LABELS: Record<string, string> = { b2b_dc: 'B2B DC', b2b_project: 'B2B Project', b2c: 'B2C', manufacturing: 'Manufacturing' }
const DORMANT_PREFIX = 'dormant_threshold_months.'

function EditableMonthCell({ item, onSave }: { item: ConfigItem; onSave: (key: string, value: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const handleSave = () => { onSave(item.key, draft); setEditing(false) }
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField size="small" type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus sx={{ width: 100 }} slotProps={{ input: { endAdornment: <InputAdornment position="end">bln</InputAdornment> } }} />
        <IconButton size="small" onClick={handleSave} color="primary"><CheckIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip label={`${item.value} bulan`} size="small" color="primary" variant="outlined" />
      <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
    </Box>
  )
}

function ConfigRow({ item }: { item: ConfigItem }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.value)
  const { mutate, isPending } = useUpdateConfig()
  const handleSave = () => mutate({ key: item.key, value: draft }, { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) })
  const handleCancel = () => { setDraft(item.value); setEditing(false) }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.key}</Typography>
        {item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}
      </Box>
      <Box sx={{ flex: 1 }}>
        {editing ? (
          <TextField size="small" type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus fullWidth slotProps={{ input: { endAdornment: <InputAdornment position="end">bln</InputAdornment> } }} />
        ) : (
          <Chip label={`${item.value} bulan`} size="small" variant="outlined" />
        )}
      </Box>
      <Box>
        {editing ? (
          <>
            <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">{isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}</IconButton>
            <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
          </>
        ) : (
          <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
        )}
      </Box>
    </Box>
  )
}

export function BusinessRulesTab() {
  const { t } = useTranslation()
  const { data: configs, isLoading, error } = useConfig()
  const { mutate } = useUpdateConfig()
  const allItems: ConfigItem[] = configs ?? []
  const buDormantItems = allItems.filter((c: ConfigItem) => c.key.startsWith(DORMANT_PREFIX))
  const otherItems = allItems.filter((c: ConfigItem) => !c.key.startsWith(DORMANT_PREFIX))

  const handleSave = (key: string, value: string) => mutate({ key, value })

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{t('error.generic')}</Alert>

  return (
    <Stack spacing={3}>
      {/* Dormant Threshold per BU */}
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('config.buThreshold.title')}</Typography>
          <Tooltip title={t('config.buThreshold.tooltip')} placement="right" arrow><InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} /></Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('config.buThreshold.subtitle')}</Typography>

        {buDormantItems.length > 0 ? (
          <>
            {/* ─── Desktop: Table ─── */}
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
                  {buDormantItems.map((item: ConfigItem) => {
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

            {/* ─── Mobile: Cards ─── */}
            <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
              {buDormantItems.map((item: ConfigItem) => {
                const buCode = item.key.replace(DORMANT_PREFIX, '')
                return (
                  <Card key={item.key} sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{BU_LABELS[buCode] ?? buCode}</Typography>
                        <EditableMonthCell item={item} onSave={handleSave} />
                      </Box>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                      )}
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

      {/* General Settings */}
      {otherItems.length > 0 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('config.generalSection.title')}</Typography>
          <Stack divider={<Divider />}>{otherItems.map((item: ConfigItem) => <ConfigRow key={item.key} item={item} />)}</Stack>
        </Card>
      )}

      {/* period_info info box */}
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
  )
}