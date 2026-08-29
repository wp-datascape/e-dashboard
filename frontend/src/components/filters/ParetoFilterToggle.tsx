// frontend/src/components/filters/ParetoFilterToggle.tsx
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'

export interface ParetoFilterToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'small' | 'medium'
}

/**
 * Toggle "Customer Pareto" — persempit hasil ke customer yang ditandai
 * Pareto (prioritas, manual oleh admin — tabel `pareto_customers`, task016).
 * Diekstrak 2026-08-20 (instruksi user: filter harus komponen independen
 * reusable, bukan Switch inline yang ditulis ulang per halaman) dari
 * `onlyPareto` yang sebelumnya cuma ada inline di Analisis/index.tsx.
 *
 * Presentational murni (state di caller), mirror 1:1 pola
 * `ExcludeIntercompanyToggle` — taruh di filter bar caller bersebelahan
 * dengannya.
 *
 * CATATAN SCOPE: kalau dipasang di halaman KPI (Growth/Retention/Value),
 * toggle ini BARU UI — endpoint M1-M10 backend belum ada yang menerima
 * parameter "only Pareto customer" (beda dari Analisis, yang endpoint-nya
 * memang sudah terima `only_pareto`). Sama seperti PeriodTypeFilterFields
 * (§30) — siap dipasang, belum tentu mengubah data sampai backend KPI
 * terkait diupdate.
 */
export function ParetoFilterToggle({ checked, onChange, size = 'small' }: ParetoFilterToggleProps) {
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
      label={t('common.filters.onlyPareto')}
      sx={{ ml: 0, whiteSpace: 'nowrap' }}
    />
  )
}
