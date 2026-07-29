import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui'
import { useActiveDivisions } from '@/hooks/useDivisions'
import { useUnmappedChannels } from '@/hooks/useChannelDivisions'
import type { ChannelDivisionRow, CreateChannelDivisionPayload, UpdateChannelDivisionPayload } from '@/types/channelDivisions'
import type { Company } from '@/types/companies'
import { getApiErrorMessage } from '@/utils/apiError'

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

export function DivisionMappingDialog({
  open, mode, selected, companies, isPending, error, onClose, onCreate, onUpdate,
}: Props) {
  const { t } = useTranslation()

  const [channelName, setChannelName] = useState('')
  const [division, setDivision] = useState<number | ''>('')
  const [companyId, setCompanyId] = useState<number | ''>('')

  // Dropdown Division cascading ke company yang lagi dipilih (task012 v2 — company_id
  // sekarang WAJIB di channel_divisions, tidak ada opsi "Global" lagi karena division
  // sendiri company-scoped). Kosong sampai company dipilih.
  const { data: divisionOptions = [] } = useActiveDivisions(companyId === '' ? 'all' : companyId)

  // Opsi channel_name: hanya yang riil ada di invoices dan belum punya mapping —
  // tidak ada opsi hardcode/ketik bebas, cuma pilih dari apa yang ada.
  const { data: unmappedChannels = [] } = useUnmappedChannels(
    companyId === '' ? 'all' : companyId,
    open && mode === 'create',
  )

  // Populate form saat dialog dibuka — pola "adjust state during render" (bukan
  // useEffect) supaya tidak ada setState sinkron di dalam effect. syncedKey direset
  // ke null tiap dialog tertutup, supaya buka lagi (walau record yang sama) selalu
  // sinkron ulang dari data terbaru, bukan sisa form yang belum disimpan sebelumnya.
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  if (!open) {
    if (syncedKey !== null) setSyncedKey(null)
  } else {
    const currentKey = String(selected?.id ?? 'new')
    if (currentKey !== syncedKey) {
      setSyncedKey(currentKey)
      setChannelName(selected?.channel_name ?? '')
      setDivision(selected?.division_id ?? '')
      setCompanyId(selected?.company_id ?? '')
    }
  }

  const isValid = channelName.trim().length > 0 && division !== '' && companyId !== ''

  const handleSubmit = () => {
    if (!isValid) return
    const payload = {
      channel_name: channelName.trim().toUpperCase(),
      division_id: division as number,
      company_id: companyId as number,
    }
    if (mode === 'create') {
      onCreate(payload)
    } else if (selected) {
      onUpdate(selected.id, payload)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title={mode === 'create' ? t('divisions.addMapping') : t('divisions.editMapping')}
      error={error ? { message: getApiErrorMessage(error, t) } : null}
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'outlined', disabled: isPending },
        {
          label: mode === 'create' ? t('common.add') : t('common.save'),
          onClick: handleSubmit,
          isLoading: isPending,
          disabled: !isValid,
        },
      ]}
    >
      <Stack spacing={2.5}>
        {mode === 'create' ? (
          <Autocomplete
            options={unmappedChannels}
            value={channelName || null}
            onChange={(_, val) => setChannelName(val ?? '')}
            disablePortal
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('divisions.channelName')}
                required
                size="small"
                helperText={t('divisions.channelNameHelp')}
              />
            )}
          />
        ) : (
          <TextField
            label={t('divisions.channelName')}
            value={channelName}
            disabled
            fullWidth
            size="small"
          />
        )}

        <FormControl fullWidth size="small" required>
          <InputLabel>{t('divisions.scope')}</InputLabel>
          <Select
            value={companyId}
            label={t('divisions.scope')}
            onChange={(e) => {
              setCompanyId(Number(e.target.value))
              // Reset division — daftar opsi berubah begitu company berubah (cascading)
              setDivision('')
            }}
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" required disabled={companyId === ''}>
          <InputLabel>{t('divisions.division')}</InputLabel>
          <Select
            value={division}
            label={t('divisions.division')}
            onChange={(e) => setDivision(Number(e.target.value))}
          >
            {divisionOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Dialog>
  )
}
