// frontend/src/components/filters/RangeFilter.tsx
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

export interface RangeFilterProps {
  value: number
  onChange: (value: number) => void
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

/**
 * Dropdown "Rentang" (lookback bulan) — sebelumnya di-duplikasi manual di 3
 * halaman (Transactions, ProductsHighMargin, Products) dengan opsi yang tidak
 * konsisten (ada yang tanpa opsi 1 bulan). Diseragamkan jadi SELALU 1/3/6/12 di
 * semua tempat (task017 §4).
 *
 * Presentational murni (state di caller), pola sama dgn ExcludeIntercompanyToggle.
 */
export function RangeFilter({ value, onChange, size = 'small', sx }: RangeFilterProps) {
  const { t } = useTranslation()

  return (
    <TextField
      select size={size} label={t('common.filters.range')}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      sx={sx ?? { width: { xs: '100%', sm: 130 } }}
    >
      <MenuItem value={1}>{t('common.filters.range1Month')}</MenuItem>
      <MenuItem value={3}>{t('common.filters.range3Months')}</MenuItem>
      <MenuItem value={6}>{t('common.filters.range6Months')}</MenuItem>
      <MenuItem value={12}>{t('common.filters.range12Months')}</MenuItem>
    </TextField>
  )
}
