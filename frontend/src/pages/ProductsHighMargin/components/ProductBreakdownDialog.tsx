import { useTranslation } from 'react-i18next'
import { Dialog, StatusChip } from '@/components/ui'
import { HmCustomerBreakdown } from './HmCustomerBreakdown'

export interface ProductBreakdownTarget {
  product_id: number
  product_name: string
}

interface Props {
  product: ProductBreakdownTarget | null
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodMonth: string
  activeWindow: number
  excludeIntercompany?: boolean
  onClose: () => void
}

/**
 * task017 lanjutan — drill-down langsung dari baris PRODUK di view flat
 * (default baru), tanpa lewat tabel produk kategori dulu seperti
 * CategoryProductsDialog (di sana produk baru muncul setelah pilih kategori;
 * di sini row-nya sudah level produk, jadi drill-down langsung ke breakdown).
 */
export function ProductBreakdownDialog({
  product,
  companyId,
  branchId,
  division,
  periodMonth,
  activeWindow,
  excludeIntercompany,
  onClose,
}: Props) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      maxWidth="md"
      title={
        product ? (
          <>
            {product.product_name}{' '}
            <StatusChip label={t('products.highMarginBadge')} color="info" />
          </>
        ) : '—'
      }
      showCloseButton
    >
      <HmCustomerBreakdown
        target={product ? { type: 'product', id: product.product_id } : null}
        companyId={companyId}
        branchId={branchId}
        division={division}
        periodMonth={periodMonth}
        activeWindow={activeWindow}
        excludeIntercompany={excludeIntercompany}
      />
    </Dialog>
  )
}
