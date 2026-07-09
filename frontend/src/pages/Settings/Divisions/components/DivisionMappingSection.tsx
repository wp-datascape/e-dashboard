import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import { useCan } from '@/hooks/useCan'
import {
  useChannelDivisions,
  useCreateChannelDivision,
  useDeleteChannelDivision,
  useUnmappedChannels,
} from '@/hooks/useChannelDivisions'
import type { DivisionRow } from '@/types/divisions'

interface Props {
  open: boolean
  onClose: () => void
  division: DivisionRow | null
}

/**
 * Nested action "Edit Mapping" dari 1 baris Division — kelola channel_name mana
 * yang masuk divisi ini (channel_divisions), scoped ke company_id/branch_id/code
 * divisi ini (sudah fix dari parent row, tidak perlu dipilih ulang di sini).
 * Mirror pola BranchSection.tsx (nested di Companies), lihat task005.md §Session B.
 */
export function DivisionMappingSection({ open, onClose, division }: Props) {
  const { t } = useTranslation()
  const can = useCan()

  const companyId = division?.company_id ?? null
  const branchId = division?.branch_id ?? undefined
  const code = division?.code ?? null

  const { data: mappings = [], isLoading } = useChannelDivisions(
    companyId !== null && code !== null
      ? { company_id: companyId, branch_id: branchId, division: code }
      : undefined,
    open && companyId !== null && code !== null,
  )
  const { data: unmappedChannels = [] } = useUnmappedChannels(companyId ?? 'all', open)

  const { mutate: create, isPending: isCreating } = useCreateChannelDivision()
  const { mutate: remove, isPending: isDeleting } = useDeleteChannelDivision()

  const [newChannelName, setNewChannelName] = useState<string | null>(null)

  const handleAdd = () => {
    if (!newChannelName || companyId === null || code === null) return
    create(
      { channel_name: newChannelName, division: code, company_id: companyId, branch_id: division?.branch_id ?? null },
      { onSuccess: () => setNewChannelName(null) },
    )
  }

  const handleDelete = (id: number) => {
    if (window.confirm(t('divisions.mapping.deleteConfirm'))) remove(id)
  }

  if (!division) return null

  const isPending = isCreating || isDeleting

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${t('divisions.mapping.title')} — ${division.name}`}
      maxWidth="sm"
      actions={[{ label: t('common.close'), onClick: onClose, variant: 'outlined' }]}
    >
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {mappings.length === 0 && (
            <Typography variant="body2" color="text.secondary">{t('divisions.mapping.empty')}</Typography>
          )}

          {mappings.map((m) => (
            <Box
              key={m.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>{m.channel_name}</Typography>
              {can('settings.channel.division:delete') && (
                <Tooltip title={t('common.delete')}>
                  <IconButton size="small" color="error" onClick={() => handleDelete(m.id)} disabled={isPending}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}

          {can('settings.channel.division:create') && (
            <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                <Autocomplete
                  options={unmappedChannels}
                  value={newChannelName}
                  onChange={(_, val) => setNewChannelName(val)}
                  disablePortal
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField {...params} size="small" label={t('divisions.mapping.addChannel')} placeholder={t('divisions.mapping.addChannelPlaceholder')} />
                  )}
                />
                <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} disabled={!newChannelName || isPending}>
                  {t('common.add')}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  )
}
