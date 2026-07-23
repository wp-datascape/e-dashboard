// frontend/src/components/filters/ExcludeIntercompanyToggle.tsx
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'

export interface ExcludeIntercompanyToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'small' | 'medium'
}

/**
 * Toggle laporan (bukan RBAC scope) — exclude division 'intercompany' dari hasil
 * metrik. Dipakai utk transaksi antar-company dalam 1 holding (mis. PT Mesin Kasir
 * Online menjual ke PT Kode Niaga Tama - customer "KODE NIAGA TAMA, PT" di company 1
 * sendiri, channel_divisions.division = 'intercompany') yang bisa mendistorsi metrik
 * performa eksternal kalau ikut terhitung.
 *
 * Presentational murni (state di caller, pola sama dgn ScopeFilterFields) - taruh di
 * filter bar caller bersebelahan dgn ScopeFilterFields. Pasangannya di backend:
 * utils/scope.ts buildExcludeIntercompanyCondition() (Drizzle) / -Raw() (raw SQL).
 *
 * Styling mirror toggle `highMarginOnly` di pages/Products/index.tsx supaya konsisten
 * dgn filter bar existing (FormControlLabel+Switch size="small", bukan TextField select
 * seperti field lain - ini boolean, bukan pilihan dari daftar).
 */
export function ExcludeIntercompanyToggle({ checked, onChange, size = 'small' }: ExcludeIntercompanyToggleProps) {
  const { t } = useTranslation()

  return (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          size={size}
        />
      }
      label={t('common.filters.excludeIntercompany')}
      sx={{ ml: 0, whiteSpace: 'nowrap' }}
    />
  )
}
