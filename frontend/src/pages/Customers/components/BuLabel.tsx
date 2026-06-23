import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { BusinessUnit } from '@/types/customers'

interface BuLabelProps {
  bu: BusinessUnit
}

export function BuLabel({ bu }: BuLabelProps) {
  const { t } = useTranslation()
  if (!bu) return <Typography variant="body2" color="text.disabled">{t('common.none')}</Typography>
  const labelMap: Record<NonNullable<BusinessUnit>, string> = {
    b2b_dc: 'B2B DC',
    b2b_project: 'B2B Project',
    b2c: 'B2C',
    manufacturing: 'Manufacturing',
  }
  return <Typography variant="body2">{labelMap[bu]}</Typography>
}