import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnalisis } from '@/hooks/useAnalisis'
import { ComparisonSections } from '@/components/analisis/ComparisonMetrics'
import type { NotificationRow } from '@/types/notifications'
import type { AnalisisPeriodType } from '@/types/analisis'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface AnalisisAlertEntityRef {
  customer_id: number
  company_id: number
  period_type: AnalisisPeriodType
  period_key: string
}

// `entity_ref` datang sebagai jsonb bebas-bentuk (`Record<string, unknown> |
// null`) — validasi field yang dibutuhkan sebelum dipakai query, entity_ref
// tipe notifikasi lain (di luar 'analisis_alert') bisa berbentuk lain sama sekali.
function parseAnalisisEntityRef(entityRef: Record<string, unknown> | null): AnalisisAlertEntityRef | null {
  if (!entityRef) return null
  const { customer_id, company_id, period_type, period_key } = entityRef
  if (typeof customer_id !== 'number' || typeof company_id !== 'number') return null
  if (typeof period_type !== 'string' || typeof period_key !== 'string') return null
  return { customer_id, company_id, period_type: period_type as AnalisisPeriodType, period_key }
}

export interface NotificationDetailDialogProps {
  /** null = dialog tertutup — dipakai controlled dari parent (state notif yang lagi diklik) */
  notification: NotificationRow | null
  onClose: () => void
}

/**
 * Popup detail notifikasi — dipakai NotificationBell (dropdown) & halaman
 * Notifications, biar klik notifikasi TIDAK langsung pindah ke halaman
 * generik /analisis (kehilangan konteks pesan). Untuk notifikasi tipe
 * 'analisis_alert', selain judul+isi pesan, ikut ditampilkan TABEL
 * pembanding lengkap (Pembanding/Periode/Perubahan Nilai/Perubahan %) —
 * bentuk PERSIS sama dengan halaman Analisis (`ComparisonSections`, komponen
 * yang sama, bukan reimplementasi) — untuk basis (Tahun Lalu/Periode
 * Sebelumnya) yang disebut di body pesan. Data diambil live dari `GET
 * /analisis?customer_id=...` (bukan snapshot dari body), jadi akurat kalau
 * invoice yang mendasari sempat direvisi setelah notifikasi dikirim.
 *
 * "Lihat di Analisis" navigasi dengan query param PERSIS sama dgn entity_ref
 * (company_id/period_type/period_key) + search=nama customer, supaya halaman
 * Analisis kebuka dengan data yang identik dengan yang disebut di notifikasi
 * (bukan halaman generik kosong) — lihat pages/Analisis/index.tsx yang baca
 * initial state dari URL search params.
 */
export function NotificationDetailDialog({ notification, onClose }: NotificationDetailDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const entityRef = notification ? parseAnalisisEntityRef(notification.entity_ref) : null
  // Body scheduler formatnya "vs periode sebelumnya: ... | vs tahun lalu: ..."
  // (lihat scheduler.ts) — satu notifikasi bisa kena SALAH SATU atau KEDUANYA
  // basis sekaligus, tampilkan tabel utk yang benar-benar disebut saja.
  const showLastYear = !!notification?.body.includes('tahun lalu')
  const showPreviousPeriod = !!notification?.body.includes('periode sebelumnya')

  // company_id fallback 0 (falsy) kalau belum siap/basis tidak relevan —
  // useAnalisis sudah `enabled: !!params.company_id`, jadi otomatis TIDAK
  // fetch tanpa perlu opsi enabled terpisah.
  const lastYearQuery = useAnalisis({
    company_id: entityRef && showLastYear ? entityRef.company_id : 0,
    period_type: entityRef?.period_type ?? 'quarter',
    period_key: entityRef?.period_key,
    customer_id: entityRef?.customer_id,
    comparison: 'last_year',
    page: 1,
    per_page: 1,
  })
  const previousPeriodQuery = useAnalisis({
    company_id: entityRef && showPreviousPeriod ? entityRef.company_id : 0,
    period_type: entityRef?.period_type ?? 'quarter',
    period_key: entityRef?.period_key,
    customer_id: entityRef?.customer_id,
    comparison: 'previous_period',
    page: 1,
    per_page: 1,
  })

  const lastYearRow = lastYearQuery.data?.data[0]
  const previousPeriodRow = previousPeriodQuery.data?.data[0]
  const anyRow = lastYearRow ?? previousPeriodRow

  const revLabel = t('analisis.metricRevenue')
  const gmLabel = t('analisis.metricMargin') // khusus nilai persentase
  const gpLabel = t('analisis.metricGP') // khusus nilai Rupiah
  const newBusinessLabel = t('analisis.newBusiness')

  const handleViewAnalisis = () => {
    if (!entityRef) {
      navigate('/analisis/revenue')
      onClose()
      return
    }
    const params = new URLSearchParams({
      company_id: String(entityRef.company_id),
      period_type: entityRef.period_type,
      period_key: entityRef.period_key,
      comparison: showPreviousPeriod && !showLastYear ? 'previous_period' : 'last_year',
    })
    if (anyRow) params.set('search', anyRow.customer_name)
    onClose()
    navigate(`/analisis/revenue?${params.toString()}`)
  }

  return (
    <Dialog open={!!notification} onClose={onClose} maxWidth="xs" fullWidth>
      {notification && (
        <>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{notification.title}</DialogTitle>
          <DialogContent sx={{ pt: '0 !important' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {notification.body}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                  {fmtDate(notification.created_at)}
                </Typography>
              </Box>

              {(showLastYear || showPreviousPeriod) && (
                <>
                  <Divider />
                  {showPreviousPeriod && (
                    previousPeriodQuery.isLoading ? (
                      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                    ) : previousPeriodRow ? (
                      <ComparisonSections
                        comparisonSectionLabel={t('analisis.comparisonOption.previous_period')}
                        periodSectionLabel={t('analisis.periodLabel')}
                        changeValueSectionLabel={t('analisis.changeValue')}
                        changePercentSectionLabel={t('analisis.changePercent')}
                        current={previousPeriodRow.current}
                        comparison={previousPeriodRow.comparison}
                        revenueLabel={revLabel}
                        marginLabel={gpLabel}
                        marginPercentLabel={gmLabel}
                        newBusinessLabel={newBusinessLabel}
                      />
                    ) : null
                  )}
                  {showPreviousPeriod && showLastYear && <Divider />}
                  {showLastYear && (
                    lastYearQuery.isLoading ? (
                      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                    ) : lastYearRow ? (
                      <ComparisonSections
                        comparisonSectionLabel={t('analisis.comparisonOption.last_year')}
                        periodSectionLabel={t('analisis.periodLabel')}
                        changeValueSectionLabel={t('analisis.changeValue')}
                        changePercentSectionLabel={t('analisis.changePercent')}
                        current={lastYearRow.current}
                        comparison={lastYearRow.comparison}
                        revenueLabel={revLabel}
                        marginLabel={gpLabel}
                        marginPercentLabel={gmLabel}
                        newBusinessLabel={newBusinessLabel}
                      />
                    ) : null
                  )}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            {entityRef && (
              <Button onClick={handleViewAnalisis}>{t('notifications.viewInAnalisis')}</Button>
            )}
            <Button onClick={onClose} variant="contained">{t('common.close')}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
