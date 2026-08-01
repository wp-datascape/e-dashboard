/**
 * digest.types.ts — bentuk data digest laporan alert Analisis (task016 §22-23).
 * Dipakai scheduler.ts (producer, mengisi entity_ref notifikasi), pdf.service.ts
 * (konsumen, susun tabel PDF), email.service.ts (konsumen, kirim), dan
 * resend-settings.service.ts (konsumen, preview "Kirim Contoh Laporan").
 *
 * Label trigger yang bisa tampil ke user (title notifikasi/email/PDF) pindah ke
 * ./i18n.ts (task016 §30, permintaan bahasa email/PDF ikut preferensi user) —
 * file ini murni bentuk data, tidak ada string yang ditampilkan.
 */

// 'ytd' ditambahkan task016 §29 — KHUSUS jalur laporan MANUAL (checkpoint
// 'manual'), scheduler trigger asli TETAP tidak pernah pakai 'ytd' (YTD selalu
// on-demand-only, lihat catatan period.util.ts).
export type DigestPeriodType = 'monthly' | 'quarter' | 'semester' | 'annual' | 'ytd'
// 'manual' — laporan yang di-generate LANGSUNG dari tombol "Kirim Laporan
// Manual" (task016 §29), BUKAN dari siklus trigger scheduler otomatis. User
// pilih period_type + tanggal akhir bebas (apa saja, tidak terikat siklus
// trigger), datanya real dari DB via generateAnalisis() yang sama persis
// dipakai halaman Analisis (end_date logic, task016 §26).
export type DigestCheckpoint = 'closed' | 'mid_month' | 'manual'
// SELALU 'last_year' — basis PoP ('previous_period') & YTD dihapus total dari
// trigger alert (task016 §28, revisi 2026-08-01, permintaan user: "belum YOY
// saja"). Union 1 anggota (bukan literal string biasa) SENGAJA dipertahankan
// biar kalau nanti ada basis baru lagi, tinggal extend di sini + BASIS_LABEL
// (pdf.service.ts), tidak perlu ubah semua call site satu-satu.
export type DigestBasis = 'last_year'

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
  /** Tanggal akhir eksplisit (YYYY-MM-DD) — HANYA diisi utk checkpoint 'manual'
   * (task016 §29). Trigger scheduler asli (closed/mid_month) TIDAK isi ini,
   * range-nya deterministik dari period_type+period_key+checkpoint saja (lihat
   * resolveTriggerRanges). Laporan manual butuh ini karena end date-nya BEBAS,
   * tidak bisa direkonstruksi ulang cuma dari period_key. */
  end_date?: string
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
