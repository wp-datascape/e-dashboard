/**
 * Polaritas metrik — dipusatkan di sini (bukan hardcode di tiap komponen chart/
 * StatCard) supaya "arah baik" per metrik cuma didefinisikan 1x, dipakai ulang di
 * mana pun badge/delta warna perlu tahu apakah kenaikan itu baik atau buruk.
 *
 * Ditemukan lewat audit UX Dashboard (2026-08-07): StatCard & BarChartWidget
 * sebelumnya nge-hardcode "trend up = hijau/baik, down = merah/buruk" — benar untuk
 * 8 dari 10 metrik (Cross Selling Ratio, Avg Category, Avg Revenue, Avg Gross
 * Profit, High Margin Penetration, Repeat Order Rate, Expansion Rate, Reactivation
 * Rate — kenaikan = baik), TAPI salah untuk `dormant_rate` dan `dormant_value`
 * (kenaikan dormant = BURUK, badge seharusnya merah bukan hijau). Daftar 10
 * metric_key ini match persis `backend/src/features/dashboard/dashboard.service.ts`.
 */
export const INVERSE_POLARITY_METRIC_KEYS: ReadonlySet<string> = new Set([
  'dormant_rate',
  'dormant_value',
])

/** True kalau kenaikan (`trend === 'up'`) untuk metric_key ini justru hal buruk. */
export function isInversePolarityMetric(metricKey: string): boolean {
  return INVERSE_POLARITY_METRIC_KEYS.has(metricKey)
}

/**
 * Apakah suatu trend (arah naik/turun/stabil) tergolong "baik" untuk metric_key
 * tertentu — sudah memperhitungkan polaritas. Null untuk trend 'stable' (tidak ada
 * makna baik/buruk, netral).
 */
export function isGoodTrend(metricKey: string, trend: 'up' | 'down' | 'stable'): boolean | null {
  if (trend === 'stable') return null
  const inverse = isInversePolarityMetric(metricKey)
  return inverse ? trend === 'down' : trend === 'up'
}
