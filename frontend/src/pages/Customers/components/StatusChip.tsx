import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import { StatusChip as GlobalStatusChip } from '@/components/ui'
import type { CustomerStatus } from '@/types/customers'

interface StatusChipProps {
  status: CustomerStatus
  // is_relapsed (task040.md "Susulan: adopsi PENUH 6 status resmi",
  // 2026-09-16) — penanda tambahan, cuma relevan saat status='dormant'
  // (sempat Reactivated, dormant lagi) - tampil sbg chip kecil terpisah,
  // pola sama M10ReactivationRate.tsx (Relapsed sbg rincian di dalam Dormant).
  isRelapsed?: boolean
}

// 5 status resmi (task040.md) — warna dipilih konsisten dgn nuansa lama
// (active=hijau, dormant=merah) + 2 baru (acquisition/reactivated=info,
// lapsed=warning, pengganti 'new'/'existing').
const colorMap: Record<CustomerStatus, 'success' | 'error' | 'info' | 'warning'> = {
  acquisition: 'info',
  active: 'success',
  reactivated: 'info',
  lapsed: 'warning',
  dormant: 'error',
}

export function StatusChip({ status, isRelapsed }: StatusChipProps) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <GlobalStatusChip label={t(`customers.statusLabels.${status}`)} color={colorMap[status]} />
      {status === 'dormant' && isRelapsed && (
        <GlobalStatusChip label={t('customers.statusLabels.relapsed')} color="error" />
      )}
    </Box>
  )
}
