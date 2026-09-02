/**
 * features/metrics/metric-cache.helper.ts
 *
 * Cache generik hasil endpoint metrics (EDASHBOARD-591, task038.md) — 2
 * lapis mitigasi staleness: TTL (jaring pengaman) + invalidasi berbasis
 * event (invalidateMetricCache, dipanggil dari service fitur LAIN setelah
 * mutasi data yang berdampak — lihat task038.md utk daftar titik trigger).
 *
 * Dipasang di SERVICE layer (bukan repository — pembagian layer,
 * CRITICAL_RULES.md), membungkus fungsi compute yang SUDAH ADA tanpa
 * mengubah isinya sama sekali:
 *
 *   export async function getCustomerMetrics(params, scope) {
 *     return withMetricCache('customer_metrics', params.company_id, params, scope, async () => {
 *       // ...isi asli, tidak berubah...
 *     })
 *   }
 */
import { createHash } from 'crypto'
import { env } from '@/config/env'
import { findMetricCache, upsertMetricCache, deleteMetricCacheByCompany, deleteAllMetricCache, ALL_COMPANIES_SENTINEL } from './metric-cache.repository'
import type { MetricsScope } from './metrics.service'

/**
 * Cache key HARUS mencakup seluruh query param + scope RBAC (companyScopeIds/
 * branchScope/divisionScope) — kalau cuma param mentah, user dgn scope
 * terbatas bisa kebagian cache milik user dgn scope lebih luas (BUG
 * KEBOCORAN DATA, bukan cuma soal freshness, task038.md).
 *
 * Map (branchScope/divisionScope) dikonversi ke array entries TERURUT dulu
 * sebelum JSON.stringify — Map tidak bisa di-serialize apa adanya, dan
 * urutan insert Map tidak boleh mempengaruhi hasil hash (2 Map dgn isi sama
 * tapi urutan insert beda harus hasilkan cache key yang SAMA).
 */
function buildCacheKey(params: unknown, scope: MetricsScope): string {
  const normalized = {
    params,
    companyScopeIds: scope.companyScopeIds ? [...scope.companyScopeIds].sort((a, b) => a - b) : undefined,
    branchScope: scope.branchScope
      ? [...scope.branchScope.entries()].sort(([a], [b]) => a - b).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])
      : undefined,
    divisionScope: scope.divisionScope
      ? [...scope.divisionScope.entries()].sort(([a], [b]) => a - b).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])
      : undefined,
  }
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

/**
 * Bungkus fungsi compute metrics dgn cache — cache HIT return payload
 * tersimpan langsung (skip compute sama sekali), MISS jalankan compute lalu
 * simpan hasilnya sebelum di-return.
 *
 * `company_id: 'all'` IKUT di-cache (2026-09-02, sebelumnya sengaja di-skip
 * dgn alasan "jarang dipakai" — SALAH, ditegur user: "user holding dan
 * superadmin lu kira gabutuh caching?". Superadmin & Holding justru pakai
 * 'all' sbg tampilan DEFAULT mereka, dan itu query TERBERAT krn agregat
 * lintas company sekaligus — diverifikasi 18-22 detik tanpa cache). Disimpan
 * di baris company_id=ALL_COMPANIES_SENTINEL (bukan angka company asli), dan
 * SELALU ikut kehapus tiap invalidasi per-company mana pun (lihat
 * deleteMetricCacheByCompany, metric-cache.repository.ts) — cache_key-nya
 * sendiri tetap unik krn `params.company_id === 'all'` ikut ke-hash
 * (buildCacheKey di atas), jadi tidak numpuk dgn cache company spesifik.
 */
export async function withMetricCache<T>(
  metricKey: string,
  companyId: number | 'all',
  params: unknown,
  scope: MetricsScope,
  compute: () => Promise<T>,
): Promise<T> {
  const dbCompanyId = companyId === 'all' ? ALL_COMPANIES_SENTINEL : companyId

  const cacheKey = buildCacheKey(params, scope)
  const cached = await findMetricCache(dbCompanyId, metricKey, cacheKey)
  if (cached && cached.expires_at.getTime() > Date.now()) {
    return cached.payload as T
  }

  const result = await compute()
  const expiresAt = new Date(Date.now() + env.METRIC_CACHE_TTL_MINUTES * 60 * 1000)
  await upsertMetricCache(dbCompanyId, metricKey, cacheKey, result, expiresAt)
  return result
}

/**
 * Invalidasi SEMUA cache metrics milik 1 company — panggil dari service
 * layer fitur LAIN (import, high-margin, channel-divisions, divisions,
 * intercompany-names, pareto-customers, pareto-thresholds, classification)
 * tepat setelah operasi commit sukses. Lihat task038.md utk daftar lengkap
 * titik trigger yang WAJIB memanggil ini.
 */
export const invalidateMetricCache = deleteMetricCacheByCompany

/**
 * Invalidasi SEMUA company sekaligus — panggil dari config.service.ts
 * (business_configs, mis. threshold dormant) yang perubahannya GLOBAL,
 * bukan per-company (task038.md).
 */
export const invalidateAllMetricCache = deleteAllMetricCache
