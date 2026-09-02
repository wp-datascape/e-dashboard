# Task 038 (EDASHBOARD-591) — Cache Metrics: TTL + Invalidasi Multi-Trigger

> **STATUS: implementasi selesai (2026-09-02)** — 20 endpoint `metrics.service.ts`
> + `fetchDormantValueTrend` (dashboard M9) di-cache, `company_id=all` IKUT
> di-cache (sentinel `company_id=0`, koreksi user: Superadmin/Holding pakai
> 'all' sbg default view, bukan "jarang dipakai" spt asumsi awal), e2e test
> 41 skenario lolos, tsc bersih. Belum di-commit, menunggu instruksi eksplisit.

### Perbaikan susulan (2026-09-02, setelah verifikasi data production riil)

Setelah implementasi awal (20 endpoint `metrics.service.ts`), user minta
verifikasi data nyata pakai akun production sungguhan
(`production-kpi-matrix.e2e.test.ts`) — hasilnya 21/22 test lolos (1 gagal
ternyata data sisa test lama, bukan bug, lihat riwayat percakapan), TAPI
memicu 2 temuan tambahan yang diperbaiki di sesi yang sama:

1. **`company_id=all` sebelumnya SENGAJA tidak di-cache** — alasan awal
   "jarang dipakai" ternyata KELIRU dan tidak berdasar dokumentasi mana pun
   (koreksi user: "user holding dan superadmin lu kira gabutuh caching?").
   Superadmin & Holding justru pakai `company_id=all` sbg tampilan DEFAULT
   (`companies: ['all', ...]`), dan itu query PALING BERAT (18-22 detik
   diukur langsung). **Fix**: `company_id=all` sekarang disimpan di baris
   `company_id=ALL_COMPANIES_SENTINEL` (`= 0`, company asli selalu mulai id
   1) — `deleteMetricCacheByCompany()` diubah ikut menghapus baris sentinel
   itu tiap ada invalidasi PER-COMPANY MANA PUN (mutasi 1 company bisa
   mengubah hasil agregat 'all' juga). Lihat `metric-cache.repository.ts`.

2. **`fetchDormantValueTrend` (M9, dipanggil `dashboard.service.ts`) belum
   di-cache sama sekali** — hidup di `dashboard.repository.ts`, di luar
   cakupan "fungsi `getX()` di `metrics.service.ts`" yang disepakati
   sebelumnya, jadi dashboard company spesifik TETAP lambat (~750ms-3,4s)
   walau 3 fungsi lain sudah instan di call ke-2. Root cause diverifikasi
   langsung (bukan tebak): fungsi ini fan-out 12 query CTE berat paralel
   (`limit=null`, hitung SEMUA customer dormant per bucket bulan, bukan cuma
   top 20), dipanggil 2x (current + YoY) = sampai 24 query bersamaan per 1x
   load dashboard, ngantre di connection pool (max 20). Index (task030)
   tidak menolong krn masalahnya fan-out/concurrency, bukan query lambat per
   query. **Fix**: dibungkus `withMetricCache('dormant_value_trend', ...)` di
   `dashboard.service.ts` (service layer, isi fungsi tidak diubah).
   Invalidasi otomatis ikut hook per-company yang sudah ada (tidak perlu
   wiring baru — `deleteMetricCacheByCompany` hapus semua `metric_key` company
   itu sekaligus).

   **Hasil terukur** (login sama, company sama, 3x panggil `/dashboard`
   berturut-turut, cache kosong di awal):

   | Company | Call 1 (cold) | Call 2 (cached) | Call 3 (cached) |
   |---|---|---|---|
   | MKO (company 1) | 1.548ms | 30ms | 22ms |
   | KNT (company 2, 32rb customer) | 11.652ms | 76ms | 80ms |
   | `all` (Superadmin/Holding) | 13.376ms | 81ms | - |

## Context

Diagnosis performa (2026-09-01/02, EDASHBOARD-591) menemukan halaman Growth/
Retention/Value lambat loading (~6,8 detik) karena endpoint
`/metrics/customer-metrics` (M3-M7) makan ~6 detik sendirian — query
multi-CTE yang membangun ~296 ribu baris intermediate (customer × bucket)
cuma untuk 12 baris hasil akhir. Audit lanjutan (fork terpisah) memverifikasi
akar masalah lewat EXPLAIN ANALYZE tapi TIDAK menemukan cara aman memperkecil
query itu tanpa risiko menghilangkan baris customer yang dibutuhkan
`inactive_rate`/`down_rate` (M7) — kelas bug yang sama dengan 3 bug halus
yang sudah pernah ditemukan di file terkait sesi ini (M5/M7/M9 filter divisi
hilang).

Endpoint lain yang juga lambat (dampak lebih kecil): `/metrics/cross-selling`
(dipanggil 3× paralel, ~1,15 detik masing-masing) dan
`/metrics/expansion-breakdown` (~1,58 detik).

**Keputusan (2026-09-02):** daripada redesign query yang berisiko, dulukan
**caching** — query tetap dipakai apa adanya (sudah terbukti benar secara
bisnis), cuma tidak dijalankan ulang tiap buka halaman. Nol risiko terhadap
logika bisnis, karena tidak ada perhitungan yang diubah sama sekali.

## Kenapa bukan Redis

VPS produksi (dicek langsung via SSH, 2026-09-02): 6 vCPU, RAM 7,7GB
(tersedia 5,6GB), sudah menjalankan mail server + DB prod + DB dev + app
prod + app dev sekaligus. Dashboard ini dipakai segelintir user internal
(bukan traffic publik ribuan request/detik) — keunggulan utama Redis
(sub-milidetik di beban tinggi) tidak relevan di sini. Cache di Postgres
(tabel biasa, sudah ada infra & connection pool-nya) cukup: dari ~5 detik
jadi puluhan milidetik, sama-sama terasa instan buat user, tanpa menambah
service/dependency baru di VPS yang sudah padat.

## Kenapa bukan cuma trigger di import (instruksi user, 2026-09-02)

Ada 10 fitur di `backend/src/features/{settings,import}/` yang bisa
memutasi data relevan ke perhitungan metrics — bukan cuma import Faktur.
Mengandalkan SATU titik trigger (import) rapuh: gampang ada titik mutasi
lain yang kelewat sekarang, dan fitur baru di masa depan bisa diam-diam
bypass cache invalidation kalau developernya lupa update hook-nya.

**Desain 2 lapis (defense-in-depth):**

1. **TTL (jaring pengaman)** — tiap entri cache kedaluwarsa otomatis
   (default 30 menit, dikonfigurasi via env var). Ini garansi keras:
   perubahan APA PUN — yang sudah dipikirkan maupun belum, termasuk fitur
   baru nanti yang lupa di-hook — otomatis ke-refresh dalam waktu terbatas.
2. **Invalidasi berbasis event** (respons cepat, tidak perlu tunggu TTL
   habis) untuk titik mutasi yang SUDAH terkonfirmasi berdampak langsung
   ke perhitungan metrics — lihat daftar di bawah.

Invalidasi di-scope per `company_id`, BUKAN global — begitu ada mutasi utk
company X, semua cache metrik company X dihapus sekaligus (lebih sederhana
& aman drpd memilah metric_key mana yang benar-benar kena, murah karena
cache-nya kecil).

## Desain — Tabel Cache

Revive `metric_cache` yang sebelumnya cuma catatan lama tak terpakai
(`db/schema/index.ts` masih comment-out `export * from './metric_cache'`,
tabelnya sendiri tidak pernah benar-benar ada di DB):

```ts
export const metric_cache = pgTable('metric_cache', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull(), // scope invalidasi — bukan 'all', selalu company_id tunggal yang di-resolve (lihat "Cache key" di bawah)
  metric_key: varchar('metric_key', { length: 60 }).notNull(), // 'customer_metrics' | 'cross_selling' | 'expansion_breakdown' | ...
  cache_key: varchar('cache_key', { length: 128 }).notNull(), // hash SHA-256 dari seluruh param+scope query (lihat di bawah)
  payload: jsonb('payload').notNull(), // hasil JSON lengkap (bentuk sama persis dgn response API)
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueLookup: uniqueIndex('uq_metric_cache_lookup').on(table.company_id, table.metric_key, table.cache_key),
  idxExpiry: index('idx_metric_cache_expiry').on(table.expires_at), // dipakai job pembersihan baris kedaluwarsa
}))
```

## Desain — Cache key

Endpoint metrics punya BANYAK parameter (division, branch_id, period_type,
period_end, exclude_intercompany, only_pareto, apply_date_cutoff, dst) DAN
`MetricsScope` (companyScopeIds/branchScope/divisionScope — RBAC, beda user
beda scope bisa hasilkan angka beda utk `company_id: 'all'`). Cache key
WAJIB mencakup keduanya, bukan cuma query param mentah — kalau tidak, user
dgn scope RBAC terbatas bisa kebagian cache milik user dgn scope lebih luas
(BUG KEBOCORAN DATA, bukan cuma soal freshness).

```ts
function buildCacheKey(metricKey: string, params: unknown, scope: MetricsScope): string {
  // Map (branchScope/divisionScope) tidak bisa di-JSON.stringify apa
  // adanya — dikonversi ke array [...entries()] terurut dulu supaya
  // hasil hash DETERMINISTIK (urutan insert Map tidak boleh mempengaruhi
  // cache hit/miss).
  const normalized = {
    params,
    companyScopeIds: scope.companyScopeIds?.slice().sort((a, b) => a - b),
    branchScope: scope.branchScope ? [...scope.branchScope.entries()].sort() : undefined,
    divisionScope: scope.divisionScope ? [...scope.divisionScope.entries()].sort() : undefined,
  }
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}
```

`company_id` kolom di tabel (utk invalidasi per-company) di-resolve TERPISAH
dari cache_key: kalau `params.company_id` sebuah angka, pakai itu langsung;
kalau `'all'`, TIDAK di-cache sama sekali (skip cache, langsung jalankan
query) — kombinasi banyak company sekaligus jarang dipakai (default halaman
company tunggal per docs-v2/CLAUDE.md), dan invalidasi per-company jadi
tidak bermakna kalau row-nya mewakili banyak company. Bisa direvisi nanti
kalau ternyata 'all' juga perlu di-cache.

## Desain — Wrapper generik (dipakai berkali-kali, bukan ditulis ulang tiap endpoint)

```ts
// backend/src/features/metrics/metric-cache.helper.ts
export async function withMetricCache<T>(
  metricKey: string,
  companyId: number | 'all',
  params: unknown,
  scope: MetricsScope,
  compute: () => Promise<T>,
): Promise<T> {
  if (companyId === 'all') return compute() // lihat catatan di atas
  const cacheKey = buildCacheKey(metricKey, params, scope)
  const cached = await findMetricCache(companyId, metricKey, cacheKey) // WHERE expires_at > now()
  if (cached) return cached.payload as T
  const result = await compute()
  await upsertMetricCache(companyId, metricKey, cacheKey, result, TTL_MS)
  return result
}
```

Dipakai di service layer, bukan repository (pembagian layer,
CRITICAL_RULES.md) — contoh `getCustomerMetrics`:

```ts
export async function getCustomerMetrics(params: CustomerMetricsQuery, scope: MetricsScope = {}): Promise<CustomerMetricsData> {
  return withMetricCache('customer_metrics', params.company_id, params, scope, async () => {
    // ...isi fungsi yang SUDAH ADA sekarang, tidak berubah sama sekali...
  })
}
```

## Desain — Invalidasi berbasis event

Fungsi generik `invalidateMetricCache(companyId: number)` — hapus SEMUA
baris `metric_cache` utk company itu (bukan per metric_key, lihat alasan di
atas). Dipanggil di SERVICE layer (bukan handler/route — supaya konsisten
kepanggil dari mana pun service function-nya diinvoke, termasuk dari test),
tepat setelah operasi commit sukses, di titik-titik ini (dikonfirmasi lewat
pengecekan langsung ke kode, bukan tebakan):

| Trigger | File | Fungsi |
|---|---|---|
| Import Faktur (file upload) | `import/import.service.ts` | `importFile()`, akhir sebelum return |
| Import Faktur (review-commit, task037) | `import/import.service.ts` | `commitImportFile()`, akhir sebelum return |
| Import Faktur (Accurate API) | perlu ditelusuri saat implementasi — cek apakah lewat fungsi sama atau path terpisah |
| High Margin Products mapping | `settings/high-margin.service.ts` | `addHighMargin`/`editHighMargin`/`deactivateHighMargin`/`removeHighMargin` |
| High Margin import (task036) | `settings/high-margin-import.service.ts` | `commitHighMarginImport()` |
| Channel Division mapping | `settings/channel-divisions.service.ts` | create/update/delete + import CSV |
| Customer Intercompany alias | `settings/intercompany-names.service.ts` | create/update/delete/sync |
| Divisions (CRUD divisi) | `settings/divisions.service.ts` | create/update/deactivate |
| Pareto Customer flag | `settings/pareto-customers.service.ts` | set/unset |
| Pareto Threshold | `settings/pareto-thresholds.service.ts` | update |
| Item Classification Rules | `import/classification.service.ts` (perlu verifikasi nama file persis) | create/update/delete |

Daftar ini WAJIB diverifikasi ulang satu-satu terhadap kode SEBENARNYA saat
implementasi (bukan dicopy mentah dari tabel ini) — nama fungsi/file di atas
hasil grep awal, bisa saja meleset detail kecil.

## Cakupan (scope) — DIPERLUAS 2026-09-02

Cakupan awal (v1) cuma 3 endpoint yang terbukti lambat dari diagnosis
(customer-metrics, cross-selling, expansion-breakdown). **Instruksi user
2026-09-02: "Bukankah aku bilang pakai skenario yang lengkap / Mulai dari 10
KPI, semua endpoin"** — cakupan diperluas ke **SEMUA fungsi `getX()` di
`metrics.service.ts`** (M1-M10 + seluruh drill-down/breakdown/detail-nya),
bukan cuma 3 endpoint awal.

Wrapper `withMetricCache` sama persis (tidak berubah), dipasang di TIAP
fungsi export `metrics.service.ts` yang menerima `(params, scope)` dan
menghasilkan data dari query DB — nama metric_key = nama fungsi tanpa
prefix "get", snake_case (mis. `getGpBreakdown` -> `gp_breakdown`,
`getDormantCustomerMetrics` -> `dormant_customer`).

Fungsi yang TIDAK di-cache (alasan eksplisit per kasus, bukan diabaikan
tanpa alasan):
- `getProductPerformanceExport` — hasil export Excel, dipanggil sekali per
  klik unduh, bukan dipanggil berulang saat render halaman — caching di
  sini tidak menyelesaikan masalah apa pun.
- `getProductCategoryOptions`/`getCategoryProducts` — dropdown/lookup
  ringan, bukan agregasi berat, tidak masuk kategori "lambat" yang jadi
  alasan task ini ada.
- `listActiveDivisionsService`/fungsi non-`metrics.service.ts` lain — di
  luar file yang dimaksud "10 KPI, semua endpoin".

### Daftar final metric_key yang ter-cache (2026-09-02)

23 fungsi export `getX()` di `metrics.service.ts`, 20 di-cache + 3
dikecualikan (daftar di atas). Semua fungsi menerima `(params: XQuery, scope:
MetricsScope = {})` dan `params.company_id` valid sebagai key company —
tidak ada fungsi yang harus di-skip karena bentuk parameter berbeda.

Ditambah **1 fungsi di luar `metrics.service.ts`** (susulan 2026-09-02, lihat
"Perbaikan susulan" di atas): `fetchDormantValueTrend` (`dashboard.repository.ts`,
dipanggil `dashboard.service.ts`) → metric_key `dormant_value_trend`. Total
**21 metric_key** ter-cache.

| Fungsi | metric_key |
|---|---|
| `getCrossSellingMetrics` | `cross_selling` |
| `getCrossSellingSummary` | `cross_selling_summary` |
| `getCustomerMetrics` | `customer_metrics` |
| `getRevenueBreakdown` | `revenue_breakdown` |
| `getExpansionBreakdown` | `expansion_breakdown` |
| `getGpBreakdown` | `gp_breakdown` |
| `getHmBreakdown` | `hm_breakdown` |
| `getDormantCustomerMetrics` | `dormant_customer` |
| `getRorBreakdown` | `ror_breakdown` |
| `getDormantBreakdown` | `dormant_breakdown` |
| `getDormantStatusBreakdown` | `dormant_status_breakdown` |
| `getDormantValueHistory` | `dormant_value_history` |
| `getCategoryPerformance` | `category_performance` |
| `getProductPerformance` | `product_performance` |
| `getHmPenetrationDetail` | `hm_penetration_detail` |
| `getHmProductPenetrationDetail` | `hm_product_penetration_detail` |
| `getHmCustomers` | `hm_customers` |
| `getCustomerProducts` | `customer_products` |
| `getUpsellTargets` | `upsell_targets` |
| `getAvgCategoryTrend` | `avg_category_trend` |

Tidak di-cache (lihat alasan masing-masing di atas): `getProductPerformanceExport`,
`getProductCategoryOptions`, `getCategoryProducts`.

Verifikasi setelah wrapping: `bunx tsc --noEmit` bersih (0 error), suite
`bun test src/test/metric-cache.e2e.test.ts` tetap 14 pass / 0 fail.

## Non-goals

- TIDAK mengubah query `fetchCustomerMetricsTrend`/CTE lain sama sekali —
  redesign query (Opsi 1 yang dibahas sebelumnya) tetap kandidat pekerjaan
  masa depan terpisah, di luar scope task ini.
- TIDAK cache hasil `company_id: 'all'` (lihat alasan di atas).
- TIDAK bangun UI admin utk lihat/hapus cache manual — kalau perlu clear
  paksa, cukup lewat query manual ke DB (`DELETE FROM metric_cache WHERE
  company_id = ?`) atau restart TTL pendek dulu.

## Verifikasi sebelum deploy

- Response API dgn cache HIT harus byte-identik dgn tanpa cache (matikan
  cache sementara via flag, bandingkan JSON) — tidak boleh ada field hilang/
  beda tipe akibat serialisasi jsonb.
- Test: 2 user dgn RBAC scope company berbeda, filter sama — pastikan TIDAK
  saling kebagian cache satu sama lain (cache key harus benar-benar
  membedakan scope).
- Ukur waktu respons sebelum/sesudah cache HIT di endpoint yang sama.
