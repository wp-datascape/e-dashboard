import type { SegmentParams } from '@/features/metrics/segment.helper'
import { fetchDormantValueRanking } from '@/features/metrics/repository/m8m10.repository'
import type { TrailingPeriodBucket } from '@/features/analisis/period.util'
import type { MonthlyTrendPoint } from './dashboard.types'

/**
 * Tren N titik (Bulanan/Kuartalan/Semesteran/Tahunan, 2026-08-28) estimasi
 * total nilai (revenue) yang berpotensi hilang dari SELURUH customer dormant
 * per titik — bukan cuma top 20 (beda dari `fetchDormantValueRanking` yang
 * dipakai LANGSUNG di sini per titik dengan limit=null, hasilnya dijumlah).
 *
 * REWRITE (2026-08-28, task029.md §41) — 2 perubahan sekaligus:
 * 1. Granularitas: signature lama `(p)` cuma terima 1 SegmentParams,
 *    generate_series 12 BULAN kalender hardcode di SQL. Sekarang terima
 *    `buckets: TrailingPeriodBucket[]` (pola sama fetchDormantTrend,
 *    m8m10.repository.ts) — caller (dashboard.service.ts) yang tentukan
 *    lebar & jumlah titik sesuai `period_type`.
 * 2. Formula: versi lama pakai rumus SENDIRI (`total_rev / active_months
 *    all-time × (hari dormant / 30)`) — BEDA dari formula M9 yang dipakai
 *    di mana pun lagi di aplikasi (`fetchDormantValueRanking`, dipakai
 *    Retention + getDormantCustomerMetrics: `recent_12m_rev / 12 ×
 *    months_dormant KALENDER`, sudah melalui banyak koreksi presisi user
 *    §36.12/§36.24/§36.25). Ditemukan user waktu granularitas ini dikerjakan
 *    — 2 formula beda utk 1 konsep yang sama itu SALAH, keputusan user:
 *    migrasi ke formula yang sudah dikoreksi, BUKAN pertahankan yang lama.
 *    Sekarang REUSE `fetchDormantValueRanking` langsung (limit=null, existing
 *    `estimated_lost_value` per customer) per titik bucket, dijumlah di JS
 *    — BUKAN reimplementasi formula itu dalam bentuk SQL ber-bucket sendiri
 *    (formula itu sudah rumit & sudah banyak dikoreksi, reuse fungsi yang
 *    sudah teruji jauh lebih aman daripada menurunkan ulang rumusnya).
 *    Konsekuensi: angka "Nilai Pelanggan Dorman" di Overview BERUBAH dari
 *    sebelumnya (formula lama), sekarang konsisten dengan angka yang sama
 *    di halaman Retention.
 *
 * N query paralel (1 per bucket, via Promise.all) — bukan 1 query SQL
 * ber-CROSS-JOIN-bucket spt fetchDormantTrend, karena `estimated_lost_value`
 * butuh CTE chain per-customer yang rumit (established_customers, months_dormant
 * kalender, recent_12m window) yang SUDAH ada & teruji di fetchDormantValueRanking
 * — reuse fungsi apa adanya lebih aman daripada menurunkan ulang jadi bentuk
 * bucket-native.
 */
export async function fetchDormantValueTrend(p: SegmentParams, buckets: TrailingPeriodBucket[]): Promise<MonthlyTrendPoint[]> {
  const rows = await Promise.all(
    buckets.map((b) => fetchDormantValueRanking({ ...p, filterDate: b.end }, null, b.start)),
  )
  return buckets.map((b, i) => ({
    month: b.label,
    value: rows[i].reduce((sum, row) => sum + row.estimated_lost_value, 0),
  }))
}
