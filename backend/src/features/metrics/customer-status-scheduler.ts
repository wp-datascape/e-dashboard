/**
 * customer-status-scheduler.ts
 *
 * Precompute `customer_status_snapshot` (task040.md, EDASHBOARD-TBD) saat
 * checkpoint periode berganti - in-process, `setInterval` + cek "sudah
 * ganti hari belum", pola SAMA PERSIS `analisis/scheduler.ts` (task016,
 * TANPA dependency baru/node-cron - backend jalan sebagai proses
 * persisten di Railway/VPS, bukan serverless).
 *
 * Idempotent by design (pola sama `hasSnapshotForPeriod` analisis/
 * scheduler.ts): tiap kombinasi (company, division, periodType,
 * checkpoint_date) dicek dulu sebelum compute - checkpoint yang SUDAH ada
 * baris di-skip, jadi aman dipanggil berkali-kali/tiap hari, self-healing
 * kalau server sempat mati pas hari rollover (tidak WAJIB tepat jalan di
 * tanggal 1, akan menyusul di run berikutnya).
 *
 * BACKFILL_PERIODS (2026-09-12, ditemukan user saat verifikasi: "masih ada
 * bug yang kamu skip, timeout itu belum diperbaiki") - versi AWAL cuma
 * precompute checkpoint HARI INI (1 titik), jadi lihat periode LEBIH LAMA
 * (bulan/kuartal lalu dst) jatuh balik ke LATERAL lama yang lambat -
 * dibuktikan TIMEOUT LAGI (`Gagal mengambil expansion breakdown`, sama
 * persis bug asal) saat dites pakai checkpoint yang belum di-precompute.
 * Sekarang backfill N periode ke belakang tiap periodType (12, konsisten
 * dgn konvensi "12 titik trend" M1-M10 di seluruh app ini) - run PERTAMA
 * jadi lebih lama (idempotent check tetap jalan per kombinasi, tapi compute
 * beneran terjadi N kali lipat), run BERIKUTNYA cuma nambah 1 checkpoint
 * baru per periodType saat rollover (N-1 lainnya sudah ada, di-skip).
 */
import { db } from '@/config/db'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { companies, divisions, customer_status_snapshot } from '@/db/schema'
import { resolveSegmentParams } from './metrics.service'
import { computeCustomerStatusSnapshot } from './repository/customer-status-snapshot.repository'
import { getCurrentPeriodKey, getPeriodRange, getPreviousPeriodKey, resolveStatusCheckpointDate } from '@/features/analisis/period.util'
import { logger } from '@/utils/logger'

type SnapshotPeriodType = 'monthly' | 'quarter' | 'semester' | 'annual'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 jam - sama seperti analisis/scheduler.ts
const PERIOD_TYPES: SnapshotPeriodType[] = ['monthly', 'quarter', 'semester', 'annual']
// Konsisten dgn konvensi "12 titik trend" (buildTrailingPeriods, dipakai
// M1-M10 di seluruh app) - cakupan histori yang REALISTIS dilihat user,
// bukan seluruh histori company (itu backfill jauh lebih besar, di luar
// cakupan sesi ini, lihat task040.md "Belum dikerjakan").
// +1 (2026-09-15, susulan migrasi M8-M10) - fetchDormantTrend butuh
// prev_dormant_count utk titik PERTAMA dari 12 titik trend, yaitu
// checkpoint SATU periode SEBELUM titik pertama itu - jadi total
// checkpoint yang dibutuhkan 1 titik trend penuh = 13, bukan 12. Parameter
// tunggal (lihat komentar BACKFILL_PERIODS asli di atas soal ini),
// dinaikkan bukan didesain ulang.
const BACKFILL_PERIODS = 13
// Batasi jumlah row per statement INSERT (task030.md, pelajaran limit
// parameter Postgres 65535/statement - customer_status_snapshot py 7 kolom
// per row, 5000 row/chunk jauh di bawah batas itu).
const INSERT_CHUNK_SIZE = 5000

let lastRunDate: string | null = null

function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Set of "company_id:division_id:checkpoint_date" yang SUDAH ada baris,
 * utk 1 periodType (semua checkpointDates kandidat sekaligus) - 1 query,
 * BUKAN 1 query per kombinasi company x division x checkpoint (2026-09-12,
 * ditemukan user: beforeAll test timeout 5 detik gara-gara ratusan round-trip
 * sequential begitu BACKFILL_PERIODS=12 dipasang - production scheduler
 * per-jam juga ikut kena beban sama tiap tick walau idempotent no-op).
 * division_id NULL diwakili sentinel string '_' (bukan angka manapun,
 * aman krn division_id asli selalu > 0).
 */
async function loadExistingCheckpointSet(periodType: SnapshotPeriodType, checkpointDates: string[]): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({
      company_id: customer_status_snapshot.company_id,
      division_id: customer_status_snapshot.division_id,
      checkpoint_date: customer_status_snapshot.checkpoint_date,
    })
    .from(customer_status_snapshot)
    .where(and(
      eq(customer_status_snapshot.period_type, periodType),
      inArray(customer_status_snapshot.checkpoint_date, checkpointDates),
    ))
  return new Set(rows.map((r) => `${r.company_id}:${r.division_id ?? '_'}:${r.checkpoint_date}`))
}

async function computeAndStore(companyId: number, divisionId: number | null, periodType: SnapshotPeriodType, checkpointDate: string): Promise<void> {
  // Parse manual (BUKAN `new Date(checkpointDate)`) - hindari pergeseran
  // timezone dari parsing string ISO, pola sama resolveStatusCheckpointDate.
  const [cy, cm, cd] = checkpointDate.split('-').map(Number)
  const currentKey = getCurrentPeriodKey(periodType, new Date(cy!, cm! - 1, cd!))
  const bucket = getPeriodRange(periodType, currentKey)
  const prevKey = getPreviousPeriodKey(periodType, currentKey)
  const prevBucket = getPeriodRange(periodType, prevKey)

  const p = await resolveSegmentParams(companyId, checkpointDate, divisionId ?? undefined)
  const rows = await computeCustomerStatusSnapshot(p, bucket, prevBucket)

  await db.transaction(async (tx) => {
    await tx.delete(customer_status_snapshot).where(and(
      eq(customer_status_snapshot.company_id, companyId),
      divisionId === null ? isNull(customer_status_snapshot.division_id) : eq(customer_status_snapshot.division_id, divisionId),
      eq(customer_status_snapshot.period_type, periodType),
      eq(customer_status_snapshot.checkpoint_date, checkpointDate),
    ))
    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE)
      if (chunk.length === 0) continue
      await tx.insert(customer_status_snapshot).values(chunk.map((r) => ({
        company_id: companyId,
        division_id: divisionId,
        period_type: periodType,
        checkpoint_date: checkpointDate,
        customer_id: r.customer_id,
        status: r.status,
        is_relapsed: r.is_relapsed,
        last_invoice_date: r.last_invoice_date,
      })))
    }
  })
}

/**
 * N checkpoint_date berurutan MUNDUR dari checkpoint TERKINI (termasuk
 * checkpoint terkini itu sendiri) - pola sama `buildTrailingPeriods`
 * (period.util.ts), cuma dikerjakan ulang di sini krn checkpoint (bukan
 * period key biasa) yang perlu di-generate.
 */
function backfillCheckpointDates(periodType: SnapshotPeriodType, today: string, count: number): string[] {
  const currentClosedCheckpoint = resolveStatusCheckpointDate(periodType, today)
  const [ky, km, kd] = currentClosedCheckpoint.split('-').map(Number)
  let key = getCurrentPeriodKey(periodType, new Date(ky!, km! - 1, kd!))
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    dates.push(getPeriodRange(periodType, key).end)
    key = getPreviousPeriodKey(periodType, key)
  }
  return dates
}

/** READ-ONLY trigger (dipanggil scheduler ATAU dipanggil manual/hook
 * invalidasi task038 setelah import) - hitung kombinasi company x
 * division(+null) x periodType x BACKFILL_PERIODS checkpoint terakhir yang
 * BELUM ada baris (idempotent, lihat hasSnapshot).
 *
 * `companyId` (task040.md, 2026-09-13, wiring invalidasi) — scope ke 1
 * company saja (dipanggil `invalidateCustomerStatusSnapshotForCompany`
 * setelah mutasi data company itu), default semua company (perilaku
 * scheduler harian, TIDAK berubah).
 * `forceRecompute` — lewati pengecekan idempotent (checkpoint yang SUDAH
 * ada baris TETAP dihitung ulang, bukan di-skip) - dipakai invalidasi
 * eksplisit (data historis berubah, baris LAMA yang sudah ada bisa jadi
 * salah sekarang, bukan cuma checkpoint yang belum pernah dihitung).
 * Scheduler harian biasa TIDAK pakai ini (idempotent tetap jalan, hemat).
 * `recomputePeriods` — jumlah checkpoint TERBARU (mundur dari checkpoint
 * terkini) yang di-recompute saat `forceRecompute` (default BACKFILL_PERIODS,
 * dipakai scheduler biasa). Invalidasi dari mutasi (task040.md, 2026-09-13)
 * SENGAJA kirim angka kecil (1) — diukur langsung: forceRecompute PENUH
 * (240 kombinasi utk 1 company, 4 divisi x 4 periodType x 12 checkpoint)
 * makan ~146 DETIK, terlalu berat utk jalan tiap kali ada mutasi (kontensi
 * DB nyata dgn request user bersamaan, dibuktikan test
 * `metric-cache.e2e.test.ts` timeout). Checkpoint TERBARU saja (1 per
 * periodType, ~20 kombinasi) cukup utk kasus UMUM (data baru/koreksi
 * periode berjalan). Batasan yang diterima: import data historis yang
 * HANYA mengubah checkpoint LAMA (bukan checkpoint terkini) baru
 * ke-refresh di rollover periode berikutnya, bukan seketika — sama pola
 * trade-off dgn "histori lebih dari 12 periode" (lihat komentar
 * BACKFILL_PERIODS atas), bukan desain baru.
 */
export async function runCustomerStatusSnapshotJob(opts?: { companyId?: number; forceRecompute?: boolean; recomputePeriods?: number }): Promise<void> {
  const { companyId, forceRecompute = false, recomputePeriods = BACKFILL_PERIODS } = opts ?? {}
  const allCompanies = companyId != null
    ? [{ id: companyId }]
    : await db.select({ id: companies.id }).from(companies)
  const today = todayDate()

  for (const periodType of PERIOD_TYPES) {
    const checkpointDates = backfillCheckpointDates(periodType, today, forceRecompute ? recomputePeriods : BACKFILL_PERIODS)
    const existing = forceRecompute ? new Set<string>() : await loadExistingCheckpointSet(periodType, checkpointDates)
    for (const company of allCompanies) {
      const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, company.id))
      const divisionIds: (number | null)[] = [null, ...companyDivisions.map((d) => d.id)]
      for (const divisionId of divisionIds) {
        for (const checkpointDate of checkpointDates) {
          if (existing.has(`${company.id}:${divisionId ?? '_'}:${checkpointDate}`)) continue
          try {
            await computeAndStore(company.id, divisionId, periodType, checkpointDate)
          } catch (err) {
            logger.error(`[customer-status-scheduler] gagal compute company=${company.id} division=${divisionId} period=${periodType}:${checkpointDate}`, {
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }
    }
  }
}

/**
 * Invalidasi+recompute customer_status_snapshot milik 1 company (task040.md,
 * 2026-09-13) — dipanggil `invalidateMetricCache` (metric-cache.helper.ts)
 * setelah mutasi data yang bisa mengubah status pelanggan pada checkpoint
 * yang SUDAH pernah dihitung (import invoice historis, ubah mapping
 * channel/divisi, dst). SEBELUM fix ini, `runCustomerStatusSnapshotJob`
 * idempotent murni TIDAK PERNAH menghitung ulang checkpoint yang sudah ada
 * baris — snapshot company itu bisa diam-diam stale selamanya sampai
 * dihapus manual.
 *
 * Fire-and-forget (TIDAK di-await caller) — samakan dgn filosofi "job
 * background" scheduler (task040.md "Refinement: precompute via
 * scheduler"): request HTTP (mis. respons upload import) tidak boleh
 * menunggu recompute puluhan kombinasi ini selesai. `computeAndStore`
 * sendiri sudah transactional per kombinasi (delete+insert 1 statement),
 * jadi pembaca lain di tengah proses ini paling apes baca baris LAMA
 * (masih konsisten, bukan kosong) sampai kombinasi itu selesai di-replace.
 *
 * De-dup in-flight per company (2026-09-13, susulan setelah regresi
 * performa di atas) — kalau company yang sama dipicu invalidasi berkali-kali
 * berturut-turut (mis. import + langsung edit channel-division sesudahnya),
 * TIDAK numpuk beberapa recompute penuh paralel ke DB yang sama, cukup 1
 * yang jalan. Trigger berikutnya diabaikan (bukan diantre) — aman krn job
 * yang sedang jalan itu SENDIRI akan membaca data TERBARU pada saat masing-
 * masing kombinasi dihitung (bukan snapshot beku dari awal job), dan
 * scheduler harian + invalidasi berikutnya tetap jadi jaring pengaman kalau
 * ADA perubahan yang lolos di antara start dan selesainya job ini.
 */
const inFlightCompanyRecompute = new Set<number>()

export function invalidateCustomerStatusSnapshotForCompany(companyId: number): void {
  if (inFlightCompanyRecompute.has(companyId)) return
  inFlightCompanyRecompute.add(companyId)
  runCustomerStatusSnapshotJob({ companyId, forceRecompute: true, recomputePeriods: 1 })
    .catch((err) => {
      logger.error(`[customer-status-scheduler] recompute setelah invalidasi gagal company=${companyId}`, {
        error: err instanceof Error ? err.message : String(err),
      })
    })
    .finally(() => inFlightCompanyRecompute.delete(companyId))
}

/**
 * Invalidasi+recompute SEMUA company (task040.md, 2026-09-13) — dipanggil
 * setelah business_config GLOBAL berubah (mis. threshold dormant, yang
 * mempengaruhi SEMUA company sekaligus). Fire-and-forget + de-dup in-flight,
 * lihat alasan di `invalidateCustomerStatusSnapshotForCompany`.
 */
let allCompaniesRecomputeInFlight = false

export function invalidateAllCustomerStatusSnapshot(): void {
  if (allCompaniesRecomputeInFlight) return
  allCompaniesRecomputeInFlight = true
  runCustomerStatusSnapshotJob({ forceRecompute: true, recomputePeriods: 1 })
    .catch((err) => {
      logger.error('[customer-status-scheduler] recompute semua company setelah invalidasi global gagal', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
    .finally(() => { allCompaniesRecomputeInFlight = false })
}

async function runIfNewDay(): Promise<void> {
  const today = todayDate()
  if (today === lastRunDate) return
  lastRunDate = today
  logger.info('[customer-status-scheduler] menjalankan precompute harian')
  await runCustomerStatusSnapshotJob()
}

/** Dipanggil sekali saat server start (index.ts), fire-and-forget - pola
 * sama startAnalisisAlertScheduler(). `.catch()` WAJIB, lihat alasan yang
 * sama di analisis/scheduler.ts (unhandled rejection bisa crash SELURUH
 * proses, bukan cuma scheduler-nya). */
export function startCustomerStatusScheduler(): void {
  const safeRun = () => {
    runIfNewDay().catch((err) => {
      logger.error('[customer-status-scheduler] evaluasi harian gagal, proses tetap jalan', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
  safeRun()
  setInterval(safeRun, CHECK_INTERVAL_MS)
}
