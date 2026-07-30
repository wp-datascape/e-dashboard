import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import type { ParetoCustomerRow, CreateParetoCustomerPayload, UpdateParetoCustomerPayload, ParetoCustomerOption } from '@/types/paretoCustomers'
import { getApiErrorMessage } from '@/utils/apiError'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  selected: ParetoCustomerRow | null
  companyId: number
  customerOptions: ParetoCustomerOption[]
  isPending: boolean
  error: Error | null
  onClose: () => void
  onCreate: (payload: CreateParetoCustomerPayload) => void
  onUpdate: (id: number, payload: UpdateParetoCustomerPayload) => void
}

export function ParetoCustomerDialog({
  open, mode, selected, companyId, customerOptions,
  isPending, error, onClose, onCreate, onUpdate,
}: Props) {
  const { t } = useTranslation()

  const [customerOption, setCustomerOption] = useState<ParetoCustomerOption | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveUntil, setEffectiveUntil] = useState('')
  const [note, setNote] = useState('')

  // Populate form saat dialog dibuka — pola "adjust state during render", sama
  // seperti HighMarginDialog/DivisionMappingDialog.
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  if (!open) {
    if (syncedKey !== null) setSyncedKey(null)
  } else {
    const currentKey = `${mode}:${selected?.id ?? 'new'}`
    if (currentKey !== syncedKey) {
      setSyncedKey(currentKey)
      if (mode === 'edit' && selected) {
        setEffectiveUntil(selected.effective_until ?? '')
        setNote(selected.note ?? '')
      } else {
        setCustomerOption(null)
        setEffectiveFrom('')
        setEffectiveUntil('')
        setNote('')
      }
    }
  }

  const handleSubmit = () => {
    if (mode === 'create') {
      if (!customerOption || !effectiveFrom) return
      const payload: CreateParetoCustomerPayload = {
        company_id: companyId,
        customer_id: customerOption.id,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil || undefined,
        note: note || undefined,
      }
      onCreate(payload)
    } else if (selected) {
      onUpdate(selected.id, {
        effective_until: effectiveUntil || null,
        note: note || undefined,
      })
    }
  }

  const title = mode === 'create' ? t('paretoCustomers.addTitle') : t('paretoCustomers.editTitle')

  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="sm">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {error && <Alert severity="error">{getApiErrorMessage(error, t)}</Alert>}

        {mode === 'create' && (
          <>
            <Autocomplete
              options={customerOptions}
              value={customerOption}
              onChange={(_, val) => setCustomerOption(val)}
              getOptionLabel={(opt) => opt.customer_code ? `${opt.customer_name} (${opt.customer_code})` : opt.customer_name}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              disabled={!companyId}
              disablePortal
              slotProps={{
                listbox: { style: { maxHeight: 220, overflowY: 'auto' } },
                popper: {
                  placement: 'bottom-start',
                  modifiers: [{ name: 'flip', enabled: false }],
                  style: { zIndex: 1400, width: 'auto' },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={t('paretoCustomers.customer')}
                  placeholder={t('paretoCustomers.customerPlaceholder')}
                />
              )}
            />

            <DatePicker
              size="small"
              label={t('paretoCustomers.effectiveFrom')}
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              fullWidth
            />
          </>
        )}

        {mode === 'edit' && selected && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('paretoCustomers.customer')}: <strong>{selected.customer_name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('paretoCustomers.effectiveFrom')}: <strong>{selected.effective_from}</strong>
            </Typography>
          </Box>
        )}

        <DatePicker
          size="small"
          label={t('paretoCustomers.effectiveUntil')}
          value={effectiveUntil}
          onChange={(e) => setEffectiveUntil(e.target.value)}
          fullWidth
          helperText={t('paretoCustomers.effectiveUntilHint')}
        />

        <TextField
          size="small"
          label={t('paretoCustomers.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          rows={2}
          fullWidth
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleSubmit} loading={isPending}>
            {t('common.save')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
