import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import { useTranslation } from 'react-i18next'
import { useCustomerDetail } from '@/hooks/useCustomers'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { ComboChartWidget } from '@/components/charts/ComboChartWidget'
import { StatusChip as GlobalStatusChip } from '@/components/ui'
import { StatusChip } from './StatusChip'
import { DivisionChip } from './DivisionChip'
import { formatIDR } from '@/utils/format'

interface Props {
  customerId: number | null
  onClose: () => void
  asOfDate?: string
}

export function CustomerDetailDialog({ customerId, onClose, asOfDate }: Props) {
  const { t } = useTranslation()
  const { data: detail, isLoading } = useCustomerDetail(customerId, asOfDate)

  return (
    <Dialog
      open={!!customerId}
      onClose={onClose}
      title={detail?.name ?? t('customers.detail.title')}
      maxWidth="md"
      showCloseButton
      contentSx={{ pt: 1 }}
    >
      {isLoading && (
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      )}

      {detail && (
        <Stack spacing={2}>
          {/* Identitas */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('customers.code')}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{detail.customer_code}</Typography>
            </Box>
            <Box sx={{ flex: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('customers.name')}</Typography>
              <Typography variant="body1">{detail.name}</Typography>
            </Box>
          </Box>

          {/* Status & Division */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{t('customers.status')}</Typography>
              <StatusChip status={detail.status} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{t('customers.detail.division')}</Typography>
              <DivisionChip division={detail.division} />
            </Box>
          </Box>

          {detail.channel && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{t('customers.detail.channel')}</Typography>
              <Typography variant="body2">{detail.channel}</Typography>
            </Box>
          )}

          <Divider />

          {/* Metrik 4 kotak */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {[
              { label: t('customers.detail.lifetimeValue'), value: formatIDR(detail.lifetime_value) },
              { label: t('customers.detail.avgMonthly'), value: formatIDR(detail.avg_monthly_revenue) },
              { label: t('customers.categories'), value: String(detail.category_count) },
              { label: t('customers.totalInvoices'), value: detail.recent_invoices.length > 0 ? `${detail.recent_invoices.length}+` : '-' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          {/* Kategori dibeli */}
          {detail.categories_bought.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('customers.detail.categoriesBought')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {detail.categories_bought.map((cat) => (
                  <GlobalStatusChip key={cat} label={cat} />
                ))}
              </Box>
            </Box>
          )}

          {/* Tren revenue */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {t('customers.detail.revenueTrend')}
            </Typography>
            <ComboChartWidget
              title=""
              data={detail.monthly_revenue_trend}
              barKey="revenue"
              barLabel={t('customers.detail.revenueShort')}
              barColor="#3B82F6"
              lineKey="gp"
              lineLabel={t('customers.detail.gpShort')}
              lineColor="#10B981"
              xKey="month"
              height={180}
              formatBar={(v: number) => formatIDR(v)}
              formatLine={(v: number) => formatIDR(v)}
            />
          </Box>

          {/* Faktur terbaru */}
          {detail.recent_invoices.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('customers.detail.recentInvoices')}
              </Typography>
              <Stack spacing={1}>
                {detail.recent_invoices.map((inv) => (
                  <Box key={inv.invoice_number} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{inv.invoice_number}</Typography>
                      <Typography variant="body2" color="text.secondary">{inv.invoice_date}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{t('customers.detail.revenueColon', { value: formatIDR(inv.total_revenue) })}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('customers.detail.gpColon', { value: formatIDR(inv.total_gp) })}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Dialog>
  )
}
