/**
 * scheduler.ts — evaluasi periode tertutup + generate notifikasi alert (task016
 * Fase B). In-process, TANPA dependency baru (bukan node-cron) — cukup
 * `setInterval` + cek "sudah ganti hari belum" (keputusan user: sekali sehari
 * cukup, kuartal/semester/tahun jarang tutup). Backend jalan sebagai proses
 * persisten di Railway (bukan serverless), jadi in-process scheduler aman —
 * lihat catatan yang sama di task016.md §3.
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
import { resolveCustomerScope, resolveAlertRecipients } from './recipients'
import { createNotifications } from '@/features/notifications/notifications.repository'
import type { NewNotification } from '@/db/schema'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 jam — cukup sering utk pastikan "ganti hari" ke-detect
const PERIOD_TYPES: PeriodType[] = ['quarter', 'semester', 'annual']

let lastRunDate: string | null = null

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null // tidak ada baseline — task016 §9, sama dgn analisis.service.ts
  return ((current - previous) / previous) * 100
}

async function hasSnapshotForPeriod(companyId: number, periodType: PeriodType, periodKey: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pareto_period_snapshots.id })
    .from(pareto_period_snapshots)
    .where(
      and(
        eq(pareto_period_snapshots.company_id, companyId),
        eq(pareto_period_snapshots.period_type, periodType),
        eq(pareto_period_snapshots.period_key, periodKey),
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

async function evaluateCompanyPeriod(companyId: number, periodType: PeriodType, periodKey: string): Promise<void> {
  const companyCustomers = await db
    .select({ id: customers.id, name: customers.customer_name })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))

  if (companyCustomers.length === 0) {
    // Tetap catat snapshot kosong-marker supaya tidak dicoba evaluasi ulang tiap hari.
    return
  }

  const customerIds = companyCustomers.map(c => c.id)
  const previousKey = getPreviousPeriodKey(periodType, periodKey)
  const yoyKey = getYoyPeriodKey(periodType, periodKey)

  const [currentAgg, previousAgg, yoyAgg, thresholdRows, paretoIds] = await Promise.all([
    aggregateInvoicesByCustomer(customerIds, getPeriodRange(periodType, periodKey)),
    aggregateInvoicesByCustomer(customerIds, getPeriodRange(periodType, previousKey)),
    aggregateInvoicesByCustomer(customerIds, getPeriodRange(periodType, yoyKey)),
    findParetoThresholds([companyId]),
    findActiveParetoCustomerIds(customerIds),
  ])

  // Simpan snapshot periode SEKARANG — penanda "sudah dievaluasi" + histori stabil
  // (task016 §14, dibuat di Fase B — beda dari Fase A yang sengaja tidak punya ini).
  const snapshotRows = companyCustomers.map((c): typeof pareto_period_snapshots.$inferInsert => {
    const agg = currentAgg.get(c.id)
    return {
      company_id: companyId,
      customer_id: c.id,
      period_type: periodType,
      period_key: periodKey,
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
    logger.info(`[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey} - 0 alert`)
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
    const body = `${parts.join(' | ')} — periode ${periodKey}.`

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
          is_pareto: alert.is_pareto,
        },
      })
    }
  }

  await createNotifications(notificationsToInsert)
  logger.info(
    `[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey} - ${alerts.length} alert, ${notificationsToInsert.length} notifikasi dikirim`,
  )
}

export async function runAnalisisAlertEvaluation(): Promise<void> {
  const allCompanies = await db.select({ id: companies.id }).from(companies)

  for (const periodType of PERIOD_TYPES) {
    const periodKey = getLatestClosedPeriodKey(periodType)
    for (const company of allCompanies) {
      try {
        const alreadyDone = await hasSnapshotForPeriod(company.id, periodType, periodKey)
        if (alreadyDone) continue
        await evaluateCompanyPeriod(company.id, periodType, periodKey)
      } catch (err) {
        logger.error(`[analisis-scheduler] gagal evaluasi company=${company.id} period=${periodType}:${periodKey}`, {
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
 * dgn initNetworkThrottleFromDb(). */
export function startAnalisisAlertScheduler(): void {
  void runIfNewDay()
  setInterval(() => { void runIfNewDay() }, CHECK_INTERVAL_MS)
}
