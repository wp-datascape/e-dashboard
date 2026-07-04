import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import ListSubheader from '@mui/material/ListSubheader'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { HighMarginMapping, CreateHighMarginPayload, UpdateHighMarginPayload, ProductOption } from '@/types/highMargin'
import { getApiErrorMessage } from '@/utils/apiError'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  selected: HighMarginMapping | null
  companyId: number
  productOptions: ProductOption[]
  isPending: boolean
  error: Error | null
  onClose: () => void
  onCreate: (payload: CreateHighMarginPayload) => void
  onUpdate: (id: number, payload: UpdateHighMarginPayload) => void
}

export function HighMarginDialog({
  open, mode, selected, companyId, productOptions,
  isPending, error, onClose, onCreate, onUpdate,
}: Props) {
  const { t } = useTranslation()

  const [targetOption, setTargetOption] = useState<ProductOption | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveUntil, setEffectiveUntil] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && selected) {
      setEffectiveUntil(selected.effective_until ?? '')
      setNote(selected.note ?? '')
    } else {
      setTargetOption(null)
      setEffectiveFrom('')
      setEffectiveUntil('')
      setNote('')
    }
  }, [open, mode, selected])

  const handleSubmit = () => {
    if (mode === 'create') {
      if (!targetOption || !effectiveFrom) return
      const payload: CreateHighMarginPayload = {
        company_id: companyId,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil || undefined,
        note: note || undefined,
        ...(targetOption.type === 'product'
          ? { product_id: targetOption.id }
          : { product_category_id: targetOption.id }),
      }
      onCreate(payload)
    } else if (selected) {
      onUpdate(selected.id, {
        effective_until: effectiveUntil || null,
        note: note || undefined,
      })
    }
  }

  const sorted = [...productOptions].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'category' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const title = mode === 'create' ? t('highMargin.addTitle') : t('highMargin.editTitle')

  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="sm">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {error && <Alert severity="error">{getApiErrorMessage(error, t)}</Alert>}

        {mode === 'create' && (
          <>
            <Autocomplete
              options={sorted}
              value={targetOption}
              onChange={(_, val) => setTargetOption(val)}
              getOptionLabel={(opt) => opt.name}
              isOptionEqualToValue={(opt, val) => opt.id === val.id && opt.type === val.type}
              groupBy={(opt) => opt.type}
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
              renderGroup={(params) => (
                <li key={params.key}>
                  <ListSubheader sx={{ lineHeight: '32px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', bgcolor: 'grey.50' }}>
                    {params.group === 'category' ? t('highMargin.targetCategory') : t('highMargin.targetProduct')}
                  </ListSubheader>
                  <ul style={{ padding: 0 }}>{params.children}</ul>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={t('highMargin.target')}
                  placeholder={t('highMargin.targetPlaceholder')}
                />
              )}
            />

            <TextField
              size="small"
              label={t('highMargin.effectiveFrom')}
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </>
        )}

        {mode === 'edit' && selected && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('highMargin.target')}: <strong>{selected.product_name ?? selected.category_name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('highMargin.effectiveFrom')}: <strong>{selected.effective_from}</strong>
            </Typography>
          </Box>
        )}

        <TextField
          size="small"
          label={t('highMargin.effectiveUntil')}
          type="date"
          value={effectiveUntil}
          onChange={(e) => setEffectiveUntil(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          helperText={t('highMargin.effectiveUntilHint')}
        />

        <TextField
          size="small"
          label={t('highMargin.note')}
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
