// HighMarginImportReview.tsx (task036, 2026-08-31) — dialog review SETELAH
// upload file (tahap preview, BELUM tulis DB), sebelum tombol "Terapkan"
// (tahap commit). Beda dari 3 tipe import lain di UploadFileCard.tsx yang
// commit langsung 1 langkah — lihat docs-v2/task/task036.md §"Alur UI".
import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { Card, Dialog, StatusChip } from '@/components/ui'
import { highMarginApi } from '@/api/highMargin.api'
import { formatDateID } from '@/utils/date'
import type {
  HighMarginImportPreviewResult,
  HighMarginImportCommitRow,
  HighMarginImportCommitResult,
} from '@/types/highMargin'

interface Props {
  open: boolean
  companyId: number
  preview: HighMarginImportPreviewResult | null
  onDone: () => void
  onCancel: () => void
}

type ConflictChoice = 'keep_old' | 'use_new'

function formatRange(t: (key: string) => string, from: string, until: string | null | undefined): string {
  return until ? `${formatDateID(from)} s/d ${formatDateID(until)}` : `${formatDateID(from)} (${t('highMargin.ongoing')})`
}

export function HighMarginImportReview({ open, companyId, preview, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const qc = useQueryClient()

  // Default 'keep_old' per baris konflik (fail-safe, task036.md — tidak
  // mengubah apa pun kalau user tidak sadar/tidak sempat pilih).
  const [choices, setChoices] = useState<Record<number, ConflictChoice>>({})
  const [commitResult, setCommitResult] = useState<HighMarginImportCommitResult | null>(null)

  const getChoice = (row: number): ConflictChoice => choices[row] ?? 'keep_old'

  const commitMutation = useMutation({
    mutationFn: (rows: HighMarginImportCommitRow[]) => highMarginApi.commitImport({ company_id: companyId, rows }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['high-margins'] })
      setCommitResult(res)
      if (res.errors.length === 0) {
        enqueueSnackbar(t('import.form.highMarginCommitSuccess', { added: res.added }), { variant: 'success' })
      }
    },
    onError: () => enqueueSnackbar(t('import.form.highMarginCommitError'), { variant: 'error' }),
  })

  const committableRows = useMemo(() => {
    const rows: HighMarginImportCommitRow[] = []
    if (!preview) return rows
    for (const r of preview.rows) {
      if (r.status === 'error') continue
      if (r.status === 'conflict' && getChoice(r.row) === 'keep_old') continue
      rows.push({
        type: r.type!,
        target_id: r.target_id!,
        division_ids: r.division_ids,
        effective_from: r.effective_from,
        effective_until: r.effective_until,
        note: r.note,
        supersede_id: r.status === 'conflict' ? r.conflict!.id : undefined,
      })
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, choices])

  const handleApply = () => {
    if (committableRows.length === 0) return
    commitMutation.mutate(committableRows)
  }

  const resetState = () => {
    setChoices({})
    setCommitResult(null)
  }

  const handleCancel = () => { resetState(); onCancel() }
  const handleDone = () => { resetState(); onDone() }

  return (
    <Dialog
      open={open}
      onClose={commitResult ? handleDone : handleCancel}
      title={t('import.form.hmReviewTitle')}
      subtitle={preview && !commitResult && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.75 }}>
          <StatusChip label={t('import.form.hmStatusSuccess', { count: preview.success_count })} color="success" />
          <StatusChip label={t('import.form.hmStatusConflict', { count: preview.conflict_count })} color="warning" />
          <StatusChip label={t('import.form.hmStatusError', { count: preview.error_count })} color="error" />
        </Box>
      )}
      maxWidth="md"
      fullWidth
      actions={commitResult ? [
        { label: t('common.close'), onClick: handleDone, variant: 'text' },
      ] : [
        { label: t('common.cancel'), onClick: handleCancel, variant: 'text', disabled: commitMutation.isPending },
        {
          label: t('import.form.hmApply', { count: committableRows.length }),
          onClick: handleApply,
          isLoading: commitMutation.isPending,
          disabled: committableRows.length === 0 || commitMutation.isPending,
        },
      ]}
    >
      {commitResult ? (
        <Alert severity={commitResult.errors.length > 0 ? 'warning' : 'success'}>
          {t('import.form.highMarginCommitSummary', { added: commitResult.added, superseded: commitResult.superseded })}
          {commitResult.errors.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
              {commitResult.errors.map((e, i) => (
                <li key={i}><Typography variant="caption">{t('import.form.masterResultRowError', { row: e.row, message: e.message })}</Typography></li>
              ))}
            </Box>
          )}
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {preview?.rows.map((r) => (
            <Card key={r.row} sx={{ p: 1.5, borderColor: r.status === 'error' ? 'error.main' : r.status === 'conflict' ? 'warning.main' : 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: r.status === 'conflict' ? 1 : 0 }}>
                <Typography variant="caption" color="text.secondary">{t('import.form.hmRowLabel', { row: r.row })}</Typography>
                <StatusChip
                  label={r.status === 'success' ? t('import.form.hmStatusSuccessLabel') : r.status === 'conflict' ? t('import.form.hmStatusConflictLabel') : t('import.form.hmStatusErrorLabel')}
                  color={r.status === 'success' ? 'success' : r.status === 'conflict' ? 'warning' : 'error'}
                />
              </Box>

              {r.status === 'error' ? (
                <Typography variant="body2" color="error.main">{r.error_message}</Typography>
              ) : r.status === 'success' ? (
                <Typography variant="body2">
                  {r.type === 'product' ? t('highMargin.targetProduct') : t('highMargin.targetCategory')}: <strong>{r.name}</strong>
                  {' — '}{r.division_names.join(', ')}
                  {' — '}{formatRange(t, r.effective_from, r.effective_until)}
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('import.form.hmDataNew')}</Typography>
                    <Typography variant="body2">
                      {r.type === 'product' ? t('highMargin.targetProduct') : t('highMargin.targetCategory')}: <strong>{r.name}</strong><br />
                      {r.division_names.join(', ')}<br />
                      {formatRange(t, r.effective_from, r.effective_until)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('import.form.hmDataOld')}</Typography>
                    <Typography variant="body2">
                      {r.conflict!.division_names.join(', ')}<br />
                      {formatRange(t, r.conflict!.effective_from, r.conflict!.effective_until)}
                      {r.conflict!.note && <><br />{r.conflict!.note}</>}
                    </Typography>
                  </Grid>
                  <Grid size={12}>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={getChoice(r.row)}
                      onChange={(_, v) => { if (v) setChoices((prev) => ({ ...prev, [r.row]: v })) }}
                    >
                      <ToggleButton value="keep_old">{t('import.form.hmKeepOld')}</ToggleButton>
                      <ToggleButton value="use_new">{t('import.form.hmUseNew')}</ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                </Grid>
              )}
            </Card>
          ))}
        </Stack>
      )}
    </Dialog>
  )
}
