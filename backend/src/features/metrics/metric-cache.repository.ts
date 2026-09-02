/**
 * features/metrics/metric-cache.repository.ts
 *
 * Raw DB access utk cache hasil endpoint metrics (EDASHBOARD-591,
 * task038.md). Dipakai oleh metric-cache.helper.ts — JANGAN dipanggil
 * langsung dari service metrics lain, selalu lewat withMetricCache().
 */
import { and, eq, inArray, lt } from 'drizzle-orm'
import { db } from '@/config/db'
import { metric_cache } from '@/db/schema'

/**
 * `company_id` di tabel ini NOT NULL integer, tapi query `company_id=all`
 * (lintas company sekaligus — dipakai Superadmin & Holding sbg tampilan
 * DEFAULT mereka, koreksi user 2026-09-02: "user holding dan superadmin lu
 * kira gabutuh caching?") tidak punya company_id numerik asli. 0 dipakai sbg
 * sentinel (id company asli selalu mulai dari 1, serial PK) — baris ini
 * SELALU ikut kehapus tiap ada invalidasi per-company MANA PUN (lihat
 * deleteMetricCacheByCompany di bawah), krn mutasi 1 company bisa mengubah
 * hasil agregat 'all' juga.
 */
export const ALL_COMPANIES_SENTINEL = 0

export async function findMetricCache(companyId: number, metricKey: string, cacheKey: string) {
  const [row] = await db
    .select()
    .from(metric_cache)
    .where(and(
      eq(metric_cache.company_id, companyId),
      eq(metric_cache.metric_key, metricKey),
      eq(metric_cache.cache_key, cacheKey),
    ))
    .limit(1)
  // Expiry dicek di caller (metric-cache.helper.ts) — pola sama seperti
  // fungsi find lain di codebase ini, filter waktu di 1 tempat (helper),
  // repository murni ambil apa adanya.
  return row
}

export async function upsertMetricCache(companyId: number, metricKey: string, cacheKey: string, payload: unknown, expiresAt: Date) {
  await db
    .insert(metric_cache)
    .values({ company_id: companyId, metric_key: metricKey, cache_key: cacheKey, payload: payload as object, expires_at: expiresAt })
    .onConflictDoUpdate({
      target: [metric_cache.company_id, metric_cache.metric_key, metric_cache.cache_key],
      set: { payload: payload as object, expires_at: expiresAt, created_at: new Date() },
    })
}

/**
 * Invalidasi SEMUA cache metrics milik 1 company — dipanggil dari service
 * layer fitur lain (import, high-margin, channel-divisions, dst) setelah
 * mutasi sukses. Scope company (bukan per metric_key) — lebih sederhana &
 * aman drpd memilah metric mana yg benar-benar kena dampak (task038.md).
 *
 * Ikut menghapus baris ALL_COMPANIES_SENTINEL (2026-09-02) — cache
 * `company_id=all` mewakili agregat LINTAS company, jadi mutasi di company
 * MANA PUN (bukan cuma company yang sedang di-invalidasi ini) harus ikut
 * membatalkan cache 'all', supaya Superadmin/Holding tidak lihat angka basi
 * gara-gara company lain berubah.
 */
export async function deleteMetricCacheByCompany(companyId: number) {
  await db.delete(metric_cache).where(inArray(metric_cache.company_id, [companyId, ALL_COMPANIES_SENTINEL]))
}

/**
 * Invalidasi SELURUH cache metrics, semua company sekaligus — dipakai
 * KHUSUS trigger yang sifatnya GLOBAL (bukan per-company), mis. threshold
 * dormant di `business_configs` (config.service.ts) yang company_id-nya
 * `null` di audit log, berarti berlaku company mana pun (task038.md).
 */
export async function deleteAllMetricCache() {
  await db.delete(metric_cache)
}

/** Housekeeping opsional — hapus baris yang sudah lewat TTL lama (belum ada
 * scheduler yang manggil ini di v1, disediakan utk dipakai nanti kalau
 * tabel mulai membengkak). */
export async function deleteExpiredMetricCache() {
  await db.delete(metric_cache).where(lt(metric_cache.expires_at, new Date()))
}
