import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import { StatusChip } from '@/components/ui'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useInvoiceDetail } from '@/hooks/useTransactions'
import type { InvoiceItem } from '@/types/transactions'
import { formatIDR } from '@/utils/format'

interface InvoiceDetailDrawerProps {
  invoiceId: number | null
  onClose: () => void
}

export function InvoiceDetailDrawer({ invoiceId, onClose }: InvoiceDetailDrawerProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { data: detail, isLoading } = useInvoiceDetail(invoiceId)
  return (
    <Drawer anchor="right" open={!!invoiceId} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('transactions.detailTitle')}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {isLoading && <Stack spacing={1.5}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />)}</Stack>}
        {detail && (
          <Stack spacing={2.5}>
            <Box><Typography variant="subtitle2" color="text.secondary">{t('transactions.invoiceNumber')}</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{detail.invoice_number}</Typography></Box>
            <Box><Typography variant="subtitle2" color="text.secondary">{t('transactions.invoiceDate')}</Typography><Typography variant="body1">{detail.invoice_date}</Typography></Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}><Typography variant="subtitle2" color="text.secondary">{t('customers.detail.company')}</Typography><Typography variant="body1">{detail.company.name}</Typography></Box>
              <Box sx={{ flex: 1 }}><Typography variant="subtitle2" color="text.secondary">{t('customers.name')}</Typography><Typography variant="body1">{detail.customer.name}</Typography></Box>
            </Box>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('transactions.lineItems')}</Typography>
            {detail.items.map((item: InvoiceItem, i: number) => (
              <Box key={item.id} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{i + 1}. {item.product_name}</Typography>
                  {item.category.is_high_margin && <StatusChip label={t('products.highMarginBadge')} color="warning" />}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{item.category.name}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary">{t('customers.detail.revenueColon', { value: formatIDR(item.revenue) })}</Typography>
                  <Typography variant="caption" color={theme.palette.success.main}>{t('customers.detail.gpColon', { value: formatIDR(item.gross_profit) })}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}