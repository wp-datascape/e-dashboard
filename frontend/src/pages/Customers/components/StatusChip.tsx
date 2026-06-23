import Chip from '@mui/material/Chip'
import { useTranslation } from 'react-i18next'
import type { CustomerStatus } from '@/types/customers'

interface StatusChipProps {
  status: CustomerStatus
}

export function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation()
  const colorMap: Record<CustomerStatus, 'success' | 'error' | 'info'> = {
    active: 'success',
    dormant: 'error',
    new: 'info',
  }
  return <Chip label={t(`customers.statusLabels.${status}`)} color={colorMap[status]} size="small" />
}