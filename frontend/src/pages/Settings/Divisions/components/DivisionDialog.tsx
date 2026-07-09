import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { useCompanies, useBranchesByCompany } from '@/hooks/useCompanies'
import type { ApiError } from '@/types/api'
import type { DivisionRow, CreateDivisionPayload, UpdateDivisionPayload, DormantBucket } from '@/types/divisions'
import { DORMANT_BUCKETS } from '@/types/divisions'

type DialogMode = 'create' | 'edit'

interface Props {
  open: boolean
  mode: DialogMode
  selected: DivisionRow | null
  isPending: boolean
  error: ApiError | null
  onClose: () => void
  onCreate: (payload: CreateDivisionPayload) => void
  onUpdate: (id: number, payload: UpdateDivisionPayload) => void
}

export function DivisionDialog({ open, mode, selected, isPending, error, onClose, onCreate, onUpdate }: Props) {
  const { t } = useTranslation()
  const { data: companies = [] } = useCompanies()

  const [companyId, setCompanyId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [dormantBucket, setDormantBucket] = useState<DormantBucket>('b2b_dc')
  const [isActive, setIsActive] = useState(true)

  const { data: branches = [] } = useBranchesByCompany(companyId === '' ? null : companyId)

  // Sync form saat dialog dibuka — "adjust state during render" (bukan useEffect),
  // sama pola dengan DivisionMappingDialog lama.
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  if (!open) {
    if (syncedKey !== null) setSyncedKey(null)
  } else {
    const currentKey = String(selected?.id ?? 'new')
    if (currentKey !== syncedKey) {
      setSyncedKey(currentKey)
      setCompanyId(selected?.company_id ?? '')
      setBranchId(selected?.branch_id ?? '')
      setCode(selected?.code ?? '')
      setName(selected?.name ?? '')
      setDormantBucket(selected?.dormant_bucket ?? 'b2b_dc')
      setIsActive(selected?.is_active ?? true)
    }
  }

  const isValid = companyId !== '' && code.trim().length > 0 && name.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    if (mode === 'create') {
      onCreate({
        company_id: companyId as number,
        branch_id: branchId === '' ? null : branchId,
        code: code.trim(),
        name: name.trim(),
        dormant_bucket: dormantBucket,
        is_active: isActive,
      })
    } else if (selected) {
      onUpdate(selected.id, {
        branch_id: branchId === '' ? null : branchId,
        code: code.trim(),
        name: name.trim(),
        dormant_bucket: dormantBucket,
        is_active: isActive,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title={mode === 'create' ? t('divisions.dialog.addTitle') : t('divisions.dialog.editTitle')}
      error={error}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <FormControl fullWidth size="small" required disabled={mode === 'edit'}>
          <InputLabel>{t('divisions.company')}</InputLabel>
          <Select
            value={companyId}
            label={t('divisions.company')}
            onChange={(e) => { setCompanyId(e.target.value as number); setBranchId('') }}
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" disabled={companyId === ''}>
          <InputLabel>{t('divisions.branch')}</InputLabel>
          <Select
            value={branchId}
            label={t('divisions.branch')}
            onChange={(e) => setBranchId(e.target.value as number | '')}
          >
            <MenuItem value="">{t('divisions.branchAll')}</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label={t('divisions.code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          fullWidth
          size="small"
          helperText={t('divisions.codeHelp')}
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />

        <TextField
          label={t('divisions.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>{t('divisions.dormantBucket')}</InputLabel>
          <Select
            value={dormantBucket}
            label={t('divisions.dormantBucket')}
            onChange={(e) => setDormantBucket(e.target.value as DormantBucket)}
          >
            {DORMANT_BUCKETS.map((bucket) => (
              <MenuItem key={bucket} value={bucket}>{t(`divisions.dormantBuckets.${bucket}`)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {mode === 'edit' && (
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label={t(isActive ? 'common.active' : 'common.inactive')}
          />
        )}
      </Box>
    </Dialog>
  )
}
