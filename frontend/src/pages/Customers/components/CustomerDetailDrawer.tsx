import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useCustomerDetail } from '@/hooks/useCustomers'
import { ComboChartWidget } from '@/components/charts/ComboChartWidget'
import { StatusChip as GlobalStatusChip } from '@/components/ui'
import { StatusChip } from './StatusChip'
import { BuChip } from '@/pages/Transactions/components/BuChip'

function formatIDR(val: number) { return `Rp ${(val / 1_000_000).toFixed(1)}M` }

interface CustomerDetailDrawerProps {
  customerId: number | null
  onClose: () => void
}

export function CustomerDetailDrawer({ customerId, onClose }: CustomerDetailDrawerProps) {
  const { t } = useTranslation()
  const { data: detail, isLoading } = useCustomerDetail(customerId)
  return (
    <Drawer anchor="right" open={!!customerId} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('customers.detail.title')}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {isLoading && <Stack spacing={1.5}>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />)}</Stack>}
        {detail && (
          <Stack spacing={2}>
            <Box><Typography variant="subtitle2" color="text.secondary">{t('customers.code')}</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{detail.customer_code}</Typography></Box>
            <Box><Typography variant="subtitle2" color="text.secondary">{t('customers.name')}</Typography><Typography variant="body1">{detail.name}</Typography></Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}><Typography variant="subtitle2" color="text.secondary">{t('customers.status')}</Typography><StatusChip status={detail.status} /></Box>
              <Box sx={{ flex: 1 }}><Typography variant="subtitle2" color="text.secondary">{t('customers.detail.businessUnit')}</Typography><BuChip bu={detail.business_unit} /></Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{t('customers.detail.lifetimeValue')}</Typography><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatIDR(detail.lifetime_value)}</Typography></Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{t('customers.detail.avgMonthly')}</Typography><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatIDR(detail.avg_monthly_revenue)}</Typography></Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{t('customers.categories')}</Typography><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{detail.category_count}</Typography></Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{t('customers.totalInvoices')}</Typography><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{detail.recent_invoices.length > 0 ? `${detail.recent_invoices.length}+` : '-'}</Typography></Box>
            </Box>
            {detail.categories_bought.length > 0 && (
              <Box><Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('customers.detail.categoriesBought')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{detail.categories_bought.map((cat: string) => <GlobalStatusChip key={cat} label={cat} />)}</Box>
              </Box>
            )}
            <Box><Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('customers.detail.revenueTrend')}</Typography>
              <ComboChartWidget title="" data={detail.monthly_revenue_trend} barKey="revenue" barLabel="Revenue" barColor="#3B82F6" lineKey="gp" lineLabel="GP" lineColor="#10B981" xKey="month" height={180} formatBar={(v: number) => formatIDR(v)} formatLine={(v: number) => formatIDR(v)} />
            </Box>
            {detail.recent_invoices.length > 0 && (
              <Box><Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('customers.detail.recentInvoices')}</Typography>
                <Stack spacing={1}>{detail.recent_invoices.map((inv: { invoice_number: string; invoice_date: string; total_revenue: number; total_gp: number }) => (
                  <Box key={inv.invoice_number} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{inv.invoice_number}</Typography><Typography variant="body2" color="text.secondary">{inv.invoice_date}</Typography></Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}><Typography variant="caption" color="text.secondary">Revenue: {formatIDR(inv.total_revenue)}</Typography><Typography variant="caption" color="text.secondary">GP: {formatIDR(inv.total_gp)}</Typography></Box>
                  </Box>
                ))}</Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}