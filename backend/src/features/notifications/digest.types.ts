/**
 * digest.types.ts — bentuk data digest laporan alert Analisis (task016 §22-23).
 * Dipakai scheduler.ts (producer, mengisi entity_ref notifikasi), pdf.service.ts
 * (konsumen, susun tabel PDF), email.service.ts (konsumen, kirim), dan
 * resend-settings.service.ts (konsumen, preview "Kirim Contoh Laporan").
 */

export type DigestPeriodType = 'monthly' | 'quarter' | 'semester' | 'annual'
export type DigestCheckpoint = 'closed' | 'mid_month'
// SELALU 'last_year' — basis PoP ('previous_period') & YTD dihapus total dari
// trigger alert (task016 §28, revisi 2026-08-01, permintaan user: "belum YOY
// saja"). Union 1 anggota (bukan literal string biasa) SENGAJA dipertahankan
// biar kalau nanti ada basis baru lagi, tinggal extend di sini + BASIS_LABEL
// (pdf.service.ts), tidak perlu ubah semua call site satu-satu.
export type DigestBasis = 'last_year'

/** Label eksplisit per trigger — dipakai di title notifikasi/email DAN header
 * batch di PDF digest, supaya recipient langsung tahu ini laporan progres
 * (belum tutup) atau laporan akhir periode jenis apa, TANPA harus menebak dari
 * format period_key (mis. "2026-Q3"). Penting terutama 1 Januari, saat
 * bulanan+kuartal+semester+tahunan bisa tutup di hari yang sama dan masuk 1
 * digest email yang sama (task016 §21-23). */
export function triggerLabel(periodType: DigestPeriodType, checkpoint: DigestCheckpoint): string {
  if (checkpoint === 'mid_month') return 'Progres Bulanan'
  switch (periodType) {
    case 'monthly': return 'Laporan Bulanan'
    case 'quarter': return 'Laporan Kuartal'
    case 'semester': return 'Laporan Semester'
    case 'annual': return 'Laporan Tahunan'
  }
}

export interface MetricComparisonDetail {
  current: { revenue: number; margin: number }
  comparison: { revenue: number; margin: number }
  revenue_change_value: number
  margin_change_value: number
  /** null = tidak ada baseline (comparison = 0) — customer baru, bukan "turun" (task016 §9). */
  revenue_change_pct: number | null
  margin_change_pct: number | null
  revenue_alert: boolean
  margin_alert: boolean
}

export interface AnalisisAlertDetail {
  last_year: MetricComparisonDetail
}

export interface DigestNotificationItem {
  customer_name: string
  company_name: string
  is_pareto: boolean
  period_type: DigestPeriodType
  period_key: string
  checkpoint: DigestCheckpoint
  detail: AnalisisAlertDetail
}

/** Validasi + narrow entity_ref (jsonb bebas-bentuk) jadi DigestNotificationItem —
 * dipakai baca balik data yang disimpan scheduler.ts saat notifikasi dibuat. */
export function parseDigestEntityRef(entityRef: Record<string, unknown> | null): DigestNotificationItem | null {
  if (!entityRef) return null
  const { customer_name, company_name, is_pareto, period_type, period_key, checkpoint, detail } = entityRef
  if (typeof customer_name !== 'string' || typeof company_name !== 'string') return null
  if (typeof period_type !== 'string' || typeof period_key !== 'string' || typeof checkpoint !== 'string') return null
  if (!detail || typeof detail !== 'object') return null
  return {
    customer_name,
    company_name,
    is_pareto: !!is_pareto,
    period_type: period_type as DigestPeriodType,
    period_key,
    checkpoint: checkpoint as DigestCheckpoint,
    detail: detail as AnalisisAlertDetail,
  }
}
