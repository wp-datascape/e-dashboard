import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { Division } from '@/types/customers'

interface BuLabelProps {
  bu: Division
}

const labelMap: Record<NonNullable<Division>, string> = {
  distribution: 'Distribution',
  project: 'Project',
  e_commerce: 'E-Commerce',
  intercompany: 'Intercompany',
  freelancer: 'Freelancer',
  support: 'Support',
}

export function BuLabel({ bu }: BuLabelProps) {
  const { t } = useTranslation()
  if (!bu) return <Typography variant="body2" color="text.disabled">{t('common.none')}</Typography>
  return <Typography variant="body2">{labelMap[bu]}</Typography>
}
