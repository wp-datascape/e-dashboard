import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import type { ChannelDivisionRow, CreateChannelDivisionPayload, UpdateChannelDivisionPayload } from '@/types/channelDivisions'
import type { Division } from '@/types/customers'
import type { Company } from '@/types/companies'

type DialogMode = 'create' | 'edit'

interface Props {
  open: boolean
  mode: DialogMode
  selected: ChannelDivisionRow | null
  companies: Company[]
  isPending: boolean
  error: Error | null
  onClose: () => void
  onCreate: (payload: CreateChannelDivisionPayload) => void
  onUpdate: (id: number, payload: UpdateChannelDivisionPayload) => void
}

const DIVISION_OPTIONS: { value: NonNullable<Division>; label: string }[] = [
  { value: 'distribution', label: 'Distribution' },
  { value: 'project', label: 'Project' },
  { value: 'e_commerce', label: 'E-Commerce' },
  { value: 'intercompany', label: 'Intercompany' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'support', label: 'Support' },
]

export function DivisionMappingDialog({
  open, mode, selected, companies, isPending, error, onClose, onCreate, onUpdate,
}: Props) {
  const { t } = useTranslation()

  const [channelName, setChannelName] = useState('')
  const [division, setDivision] = useState<NonNullable<Division> | ''>('')
  const [companyId, setCompanyId] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
      setChannelName(selected?.channel_name ?? '')
      setDivision((selected?.division ?? '') as NonNullable<Division> | '')
      setCompanyId(selected?.company_id ?? '')
    }
  }, [open, selected])

  const isValid = channelName.trim().length > 0 && division !== ''

  const handleSubmit = () => {
    if (!isValid) return
    const payload = {
      channel_name: channelName.trim().toUpperCase(),
      division: division as NonNullable<Division>,
      company_id: companyId !== '' ? companyId : null,
    }
    if (mode === 'create') {
      onCreate(payload)
    } else if (selected) {
      onUpdate(selected.id, payload)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create' ? t('divisions.addMapping') : t('divisions.editMapping')}
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {error && (
          <Alert severity="error">
            {(error as { response?: { data?: { message?: string } } }).response?.data?.message ?? error.message}
          </Alert>
        )}

        <TextField
          label={t('divisions.channelName')}
          value={channelName}
          onChange={(e) => setChannelName(e.target.value.toUpperCase())}
          required
          fullWidth
          size="small"
          helperText={t('divisions.channelNameHelp')}
          slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
        />

        <FormControl fullWidth size="small" required>
          <InputLabel>{t('divisions.division')}</InputLabel>
          <Select
            value={division}
            label={t('divisions.division')}
            onChange={(e) => setDivision(e.target.value as NonNullable<Division>)}
          >
            {DIVISION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>{t('divisions.scope')}</InputLabel>
          <Select
            value={companyId}
            label={t('divisions.scope')}
            onChange={(e) => setCompanyId(e.target.value as number | '')}
          >
            <MenuItem value="">{t('divisions.scopeGlobal')}</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          isLoading={isPending}
          disabled={!isValid}
        >
          {mode === 'create' ? t('common.add') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
