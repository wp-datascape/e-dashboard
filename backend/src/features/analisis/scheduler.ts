/**
 * scheduler.ts — evaluasi periode tertutup + generate notifikasi alert (task016
 * Fase B + §17-18). In-process, TANPA dependency baru (bukan node-cron) — cukup
 * `setInterval` + cek "sudah ganti hari belum" (keputusan user: sekali sehari
 * cukup). Backend jalan sebagai proses persisten di Railway (bukan serverless),
 * jadi in-process scheduler aman — lihat catatan yang sama di task016.md §3.
 *
 * DUA aturan berjalan paralel & independen (§18, sengaja dipisah biar user
 * tidak bingung mana yang "final" vs "sekadar progress"):
 *   Aturan 1 — "Report Akhir": kuartal/semester/tahunan, HANYA di akhir
 *              periode (checkpoint='closed'), seperti sejak Fase B awal.
 *   Aturan 2 — "Report/Alert Monitoring" bulanan, 2 sub-trigger:
 *     Trigger A: tanggal 14 tiap bulan (checkpoint='mid_month') — periode
 *                BELUM tutup, bandingkan tanggal 1-14 bulan ini vs tanggal
 *                1-14 bulan pembanding (apple-to-apple potongan hari sama).
 *     Trigger B: awal bulan baru (checkpoint='closed') — bulan yang BARU
 *                tutup, dievaluasi penuh. Reuse alur yang sama dgn kuartal/
 *                semester/tahunan (cuma nambah 'monthly' ke PERIOD_TYPES).
 */
import { eq, inArray, isNull, and, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { companies, customers, pareto_customers, pareto_period_snapshots } from '@/db/schema'
import { logger } from '@/utils/logger'
import {
  aggregateInvoicesByCustomer,
  type CustomerPeriodAggregate,
} from './analisis.repository'
import {
  getPeriodRange,
  getPreviousPeriodKey,
  getYoyPeriodKey,
  getLatestClosedPeriodKey,
  type PeriodType,
} from './period.util'
import { findParetoThresholds } from '@/features/settings/pareto-thresholds.repository'
import { DEFAULT_PARETO_DROP_PERCENT } from '@/features/settings/pareto-thresholds.service'
import { findDisabledCompanyIds } from '@/features/settings/pareto-alert-settings.repository'
import { resolveCustomerScope, resolveAlertRecipients } from './recipients'
import { createNotifications } from '@/features/notifications/notifications.repository'
import type { NewNotification } from '@/db/schema'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 jam — cukup sering utk pastikan "ganti hari" ke-detect
// Aturan 1 — Report Akhir. 'monthly' SENGAJA tidak ikut sini (itu Aturan 2 /
// Trigger B, dipanggil terpisah di runAnalisisAlertEvaluation supaya jelas
// dua aturan ini independen walau reuse fungsi evaluasi yang sama).
const PERIOD_TYPES: PeriodType[] = ['quarter', 'semester', 'annual']
const MID_MONTH_CHECKPOINT_DAY = 14

type Checkpoint = 'closed' | 'mid_month'

let lastRunDate: string | null = null

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null // tidak ada baseline — task016 §9, sama dgn analisis.service.ts
  return ((current - previous) / previous) * 100
}

async function hasSnapshotForPeriod(
  companyId: number,
  periodType: PeriodType,
  periodKey: string,
  checkpoint: Checkpoint,
): Promise<boolean> {
  const [row] = await db
    .select({ id: pareto_period_snapshots.id })
    .from(pareto_period_snapshots)
    .where(
      and(
        eq(pareto_period_snapshots.company_id, companyId),
        eq(pareto_period_snapshots.period_type, periodType),
        eq(pareto_period_snapshots.period_key, periodKey),
        eq(pareto_period_snapshots.checkpoint, checkpoint),
      ),
    )
    .limit(1)
  return !!row
}

async function findActiveParetoCustomerIds(customerIds: number[]): Promise<Set<number>> {
  if (customerIds.length === 0) return new Set()
  const rows = await db
    .select({ customer_id: pareto_customers.customer_id })
    .from(pareto_customers)
    .where(
      and(
        inArray(pareto_customers.customer_id, customerIds),
        sql`${pareto_customers.effective_from} <= CURRENT_DATE`,
        sql`(${pareto_customers.effective_until} IS NULL OR ${pareto_customers.effective_until} >= CURRENT_DATE)`,
      ),
    )
  return new Set(rows.map(r => r.customer_id))
}

interface AlertHit {
  customer_id: number
  customer_name: string
  is_pareto: boolean
  vsPrevious: { metric: 'revenue' | 'margin'; pct: number }[]
  vsYoy: { metric: 'revenue' | 'margin'; pct: number }[]
}

/**
 * Inti evaluasi + generate notifikasi — dipakai Aturan 1 (kuartal/semester/
 * tahunan, checkpoint='closed') MAUPUN Aturan 2 (bulanan, checkpoint 'closed'
 * ATAU 'mid_month'). Range/key current+pembanding dihitung oleh caller
 * (beda cara buat periode tertutup penuh vs potongan tanggal 1-14 mid-month),
 * fungsi ini sendiri agnostik soal itu.
 */
async function evaluateAndNotify(params: {
  companyId: number
  periodType: PeriodType
  periodKey: string
  checkpoint: Checkpoint
  currentRange: { start: string; end: string }
  previousKey: string
  previousRange: { start: string; end: string }
  yoyKey: string
  yoyRange: { start: string; end: string }
  /** Catatan tambahan di body notifikasi, mis. "progres s.d. tanggal 14, bulan belum tutup" (Trigger A). */
  bodyNote?: string
}): Promise<void> {
  const { companyId, periodType, periodKey, checkpoint, currentRange, previousKey, previousRange, yoyKey, yoyRange, bodyNote } = params

  const companyCustomers = await db
    .select({ id: customers.id, name: customers.customer_name })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))

  if (companyCustomers.length === 0) return

  const customerIds = companyCustomers.map(c => c.id)

  const [currentAgg, previousAgg, yoyAgg, thresholdRows, paretoIds] = await Promise.all([
    aggregateInvoicesByCustomer(customerIds, currentRange),
    aggregateInvoicesByCustomer(customerIds, previousRange),
    aggregateInvoicesByCustomer(customerIds, yoyRange),
    findParetoThresholds([companyId]),
    findActiveParetoCustomerIds(customerIds),
  ])

  // Simpan snapshot — penanda "sudah dievaluasi" (per periode+checkpoint,
  // task016 §18) + histori stabil (§14, dibuat di Fase B).
  const snapshotRows = companyCustomers.map((c): typeof pareto_period_snapshots.$inferInsert => {
    const agg = currentAgg.get(c.id)
    return {
      company_id: companyId,
      customer_id: c.id,
      period_type: periodType,
      period_key: periodKey,
      checkpoint,
      revenue: String(agg?.revenue ?? 0),
      margin: String(agg?.margin ?? 0),
    }
  })
  await db.insert(pareto_period_snapshots).values(snapshotRows).onConflictDoNothing()

  const thresholdMap = new Map<string, number>()
  for (const t of thresholdRows) {
    if (!t.is_active || t.period_type !== periodType) continue
    thresholdMap.set(t.metric, Number(t.drop_percent))
  }
  const revenueThreshold = thresholdMap.get('revenue') ?? DEFAULT_PARETO_DROP_PERCENT
  const marginThreshold = thresholdMap.get('margin') ?? DEFAULT_PARETO_DROP_PERCENT

  const checkAgainst = (
    current: CustomerPeriodAggregate | undefined,
    compare: CustomerPeriodAggregate | undefined,
  ): { metric: 'revenue' | 'margin'; pct: number }[] => {
    const hits: { metric: 'revenue' | 'margin'; pct: number }[] = []
    const revPct = pctChange(current?.revenue ?? 0, compare?.revenue ?? 0)
    if (revPct !== null && revPct <= -revenueThreshold) hits.push({ metric: 'revenue', pct: revPct })
    const marginPct = pctChange(current?.margin ?? 0, compare?.margin ?? 0)
    if (marginPct !== null && marginPct <= -marginThreshold) hits.push({ metric: 'margin', pct: marginPct })
    return hits
  }

  const alerts: AlertHit[] = []
  for (const c of companyCustomers) {
    const current = currentAgg.get(c.id)
    const vsPrevious = checkAgainst(current, previousAgg.get(c.id))
    const vsYoy = checkAgainst(current, yoyAgg.get(c.id))
    if (vsPrevious.length === 0 && vsYoy.length === 0) continue
    alerts.push({ customer_id: c.id, customer_name: c.name, is_pareto: paretoIds.has(c.id), vsPrevious, vsYoy })
  }

  if (alerts.length === 0) {
    logger.info(`[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey}:${checkpoint} - 0 alert`)
    return
  }

  const notificationsToInsert: NewNotification[] = []
  for (const alert of alerts) {
    const scope = await resolveCustomerScope(alert.customer_id, companyId)
    const recipients = await resolveAlertRecipients(scope)
    if (recipients.length === 0) continue

    const describeHits = (hits: { metric: 'revenue' | 'margin'; pct: number }[]): string =>
      hits.map(h => `${h.metric === 'revenue' ? 'Revenue' : 'Margin'} ${h.pct.toFixed(1)}%`).join(', ')

    const parts: string[] = []
    if (alert.vsPrevious.length > 0) parts.push(`vs periode sebelumnya: ${describeHits(alert.vsPrevious)}`)
    if (alert.vsYoy.length > 0) parts.push(`vs tahun lalu: ${describeHits(alert.vsYoy)}`)

    const title = alert.is_pareto
      ? `[Pareto] ${alert.customer_name} turun performa`
      : `${alert.customer_name} turun performa`
    const body = bodyNote
      ? `${parts.join(' | ')} — ${bodyNote}`
      : `${parts.join(' | ')} — periode ${periodKey}.`

    for (const recipient of recipients) {
      notificationsToInsert.push({
        user_id: recipient.id,
        type: 'analisis_alert',
        title,
        body,
        entity_ref: {
          customer_id: alert.customer_id,
          company_id: companyId,
          period_type: periodType,
          period_key: periodKey,
          checkpoint,
          is_pareto: alert.is_pareto,
        },
      })
    }
  }

  await createNotifications(notificationsToInsert)
  logger.info(
    `[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey}:${checkpoint} - ${alerts.length} alert, ${notificationsToInsert.length} notifikasi dikirim`,
  )
}

/** Aturan 1 (kuartal/semester/tahunan) & Trigger B Aturan 2 (bulanan tertutup) — periode SUDAH tutup penuh. */
async function evaluateClosedPeriod(companyId: number, periodType: PeriodType, periodKey: string): Promise<void> {
  const previousKey = getPreviousPeriodKey(periodType, periodKey)
  const yoyKey = getYoyPeriodKey(periodType, periodKey)
  await evaluateAndNotify({
    companyId,
    periodType,
    periodKey,
    checkpoint: 'closed',
    currentRange: getPeriodRange(periodType, periodKey),
    previousKey,
    previousRange: getPeriodRange(periodType, previousKey),
    yoyKey,
    yoyRange: getPeriodRange(periodType, yoyKey),
  })
}

/** Trigger A Aturan 2 — tanggal 14, bandingkan tanggal 1-14 bulan berjalan vs 1-14 bulan pembanding. */
async function evaluateMonthlyMidpoint(companyId: number, monthKey: string): Promise<void> {
  const dayRange = (mKey: string) => ({ start: `${mKey}-01`, end: `${mKey}-${pad2(MID_MONTH_CHECKPOINT_DAY)}` })
  const previousKey = getPreviousPeriodKey('monthly', monthKey)
  const yoyKey = getYoyPeriodKey('monthly', monthKey)
  await evaluateAndNotify({
    companyId,
    periodType: 'monthly',
    periodKey: monthKey,
    checkpoint: 'mid_month',
    currentRange: dayRange(monthKey),
    previousKey,
    previousRange: dayRange(previousKey),
    yoyKey,
    yoyRange: dayRange(yoyKey),
    bodyNote: `progres s.d. tanggal ${MID_MONTH_CHECKPOINT_DAY}, periode ${monthKey} (bulan belum tutup)`,
  })
}

export async function runAnalisisAlertEvaluation(): Promise<void> {
  const allCompanies = await db.select({ id: companies.id }).from(companies)
  const disabledCompanyIds = await findDisabledCompanyIds()
  // Company dgn scheduler_enabled=false (task016 §19) di-skip TOTAL — Aturan 1
  // MAUPUN Aturan 2 sama-sama tidak jalan. Toggle ini TIDAK mempengaruhi
  // laporan Analisis on-demand (itu query terpisah, tetap selalu aktif).
  const activeCompanies = allCompanies.filter(c => !disabledCompanyIds.has(c.id))
  if (disabledCompanyIds.size > 0) {
    logger.info(`[analisis-scheduler] ${disabledCompanyIds.size} company di-skip (scheduler_enabled=false): ${[...disabledCompanyIds].join(', ')}`)
  }
  const today = new Date()
  const currentMonthKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`

  // Aturan 1 — Report Akhir (kuartal/semester/tahunan) + Trigger B Aturan 2
  // (bulanan, checkpoint='closed') — SATU alur yang sama, 'monthly' cuma
  // tambahan tipe periode di loop ini (getLatestClosedPeriodKey utk 'monthly'
  // otomatis mengembalikan bulan lalu selama bulan ini masih berjalan).
  for (const periodType of [...PERIOD_TYPES, 'monthly' as PeriodType]) {
    const periodKey = getLatestClosedPeriodKey(periodType)
    for (const company of activeCompanies) {
      try {
        const alreadyDone = await hasSnapshotForPeriod(company.id, periodType, periodKey, 'closed')
        if (alreadyDone) continue
        await evaluateClosedPeriod(company.id, periodType, periodKey)
      } catch (err) {
        logger.error(`[analisis-scheduler] gagal evaluasi company=${company.id} period=${periodType}:${periodKey}:closed`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  // Trigger A Aturan 2 — cuma jalan tanggal 14 ke atas (belum lewat tanggal
  // itu, "belum saatnya", BUKAN "sudah dicek tapi tidak ada data" — makanya
  // dicek eksplisit di sini, bukan cuma andalkan hasSnapshotForPeriod).
  if (today.getDate() >= MID_MONTH_CHECKPOINT_DAY) {
    for (const company of activeCompanies) {
      try {
        const alreadyDone = await hasSnapshotForPeriod(company.id, 'monthly', currentMonthKey, 'mid_month')
        if (alreadyDone) continue
        await evaluateMonthlyMidpoint(company.id, currentMonthKey)
      } catch (err) {
        logger.error(`[analisis-scheduler] gagal evaluasi mid-month company=${company.id} period=monthly:${currentMonthKey}`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
}

async function runIfNewDay(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  if (today === lastRunDate) return
  lastRunDate = today
  logger.info('[analisis-scheduler] menjalankan evaluasi harian')
  await runAnalisisAlertEvaluation()
}

/** Dipanggil sekali saat server start (index.ts), fire-and-forget — pola sama
 * dgn initNetworkThrottleFromDb().
 *
 * `.catch()` di sini WAJIB — tanpa ini, error apa pun dari `runIfNewDay()`
 * (mis. tabel baru belum ada karena migration production belum dijalankan,
 * kejadian nyata 2026-07-31: deploy code duluan sebelum migrate, scheduler
 * langsung query tabel `pareto_alert_settings` yang belum ada) jadi unhandled
 * promise rejection yang CRASH SELURUH PROSES server (bukan cuma scheduler-nya
 * yang gagal) — HTTP server ikut mati walau errornya cuma di fitur alert.
 * Loop di dalam `runAnalisisAlertEvaluation` sendiri sudah try/catch per
 * company (skip 1 company yang gagal, lanjut yang lain) — ini lapisan
 * terakhir yang jaga proses TETAP HIDUP walau seluruh evaluasi gagal total. */
export function startAnalisisAlertScheduler(): void {
  const safeRun = () => {
    runIfNewDay().catch((err) => {
      logger.error('[analisis-scheduler] evaluasi harian gagal, proses tetap jalan', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
  safeRun()
  setInterval(safeRun, CHECK_INTERVAL_MS)
}
