import { useTranslation } from 'react-i18next'
import { StatusChip as GlobalStatusChip } from '@/components/ui'
import type { CustomerStatus } from '@/types/customers'

interface StatusChipProps {
  status: CustomerStatus
}

const colorMap: Record<CustomerStatus, 'success' | 'error' | 'info' | 'warning'> = {
  active: 'success',
  dormant: 'error',
  new: 'info',
  existing: 'warning',
}

export function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation()
  return <GlobalStatusChip label={t(`customers.statusLabels.${status}`)} color={colorMap[status]} />
}
