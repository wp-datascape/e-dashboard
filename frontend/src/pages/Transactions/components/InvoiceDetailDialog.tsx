import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import { Dialog, StatusChip } from '@/components/ui'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useInvoiceDetail } from '@/hooks/useTransactions'
import type { InvoiceItem } from '@/types/transactions'
import { formatRupiah } from '@/utils/format'

interface InvoiceDetailDialogProps {
  invoiceId: number | null
  onClose: () => void
}

export function InvoiceDetailDialog({ invoiceId, onClose }: InvoiceDetailDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { data: detail, isLoading } = useInvoiceDetail(invoiceId)
  return (
    <Dialog
      open={!!invoiceId}
      onClose={onClose}
      maxWidth="sm"
      title={t('transactions.detailTitle')}
      showCloseButton
    >
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
                <Typography variant="caption" color="text.secondary">{t('customers.detail.revenueColon', { value: formatRupiah(item.revenue) })}</Typography>
                <Typography variant="caption" color={theme.palette.success.main}>{t('customers.detail.gpColon', { value: formatRupiah(item.gross_profit) })}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Dialog>
  )
}
