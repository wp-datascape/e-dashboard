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
  getLatestClosedPeriodKey,
  resolveTriggerRanges,
  type PeriodType,
  type TriggerRanges,
} from './period.util'
import { findParetoThresholds } from '@/features/settings/pareto-thresholds.repository'
import { DEFAULT_PARETO_DROP_PERCENT } from '@/features/settings/pareto-thresholds.service'
import { findDisabledCompanyIds } from '@/features/settings/pareto-alert-settings.repository'
import { resolveCustomerScope, resolveAlertRecipients } from './recipients'
import { createNotifications } from '@/features/notifications/notifications.repository'
import { sendDigestEmail } from '@/features/notifications/email.service'
import { parseDigestEntityRef, triggerLabel, type DigestNotificationItem, type MetricComparisonDetail } from '@/features/notifications/digest.types'
import { users } from '@/db/schema'
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
  vsYoy: { metric: 'revenue' | 'margin'; pct: number }[]
  detail: {
    last_year: MetricComparisonDetail
  }
}

/**
 * Hitung SEMUA customer yang statusnya Kritis (breach threshold PoP dan/atau
 * YoY) untuk 1 company+periode — READ-ONLY, TIDAK insert snapshot, TIDAK buat
 * notifikasi. Diekstrak dari evaluateAndNotify (yang punya side-effect itu)
 * supaya bisa dipakai preview "Kirim Contoh Laporan" (task016 §23-24) — preview
 * SEBELUMNYA baca histori tabel `notifications` yang formatnya bisa basi
 * (dibuat sebelum field `detail` ditambahkan), sekarang hitung ulang LANGSUNG
 * dari data invoice terkini, selalu akurat & selalu dapat SEMUA customer
 * Kritis, bukan cuma 10 notifikasi terakhir yang mungkin sudah stale.
 */
async function computeCompanyAlerts(
  companyId: number,
  periodType: PeriodType,
  ranges: TriggerRanges,
): Promise<AlertHit[]> {
  const { current: currentRange, yoy: yoyRange } = ranges

  const companyCustomers = await db
    .select({ id: customers.id, name: customers.customer_name })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))

  if (companyCustomers.length === 0) return []

  const customerIds = companyCustomers.map(c => c.id)

  const [currentAgg, yoyAgg, thresholdRows, paretoIds] = await Promise.all([
    aggregateInvoicesByCustomer(customerIds, currentRange),
    aggregateInvoicesByCustomer(customerIds, yoyRange),
    findParetoThresholds([companyId]),
    findActiveParetoCustomerIds(customerIds),
  ])

  const thresholdMap = new Map<string, number>()
  for (const t of thresholdRows) {
    if (!t.is_active || t.period_type !== periodType) continue
    thresholdMap.set(t.metric, Number(t.drop_percent))
  }
  const revenueThreshold = thresholdMap.get('revenue') ?? DEFAULT_PARETO_DROP_PERCENT
  const marginThreshold = thresholdMap.get('margin') ?? DEFAULT_PARETO_DROP_PERCENT

  const computeDetail = (
    current: CustomerPeriodAggregate | undefined,
    compare: CustomerPeriodAggregate | undefined,
    revThreshold: number,
    marThreshold: number,
  ): MetricComparisonDetail => {
    const curRevenue = current?.revenue ?? 0
    const curMargin = current?.margin ?? 0
    const cmpRevenue = compare?.revenue ?? 0
    const cmpMargin = compare?.margin ?? 0
    const revenuePct = pctChange(curRevenue, cmpRevenue)
    const marginPct = pctChange(curMargin, cmpMargin)
    return {
      current: { revenue: curRevenue, margin: curMargin },
      comparison: { revenue: cmpRevenue, margin: cmpMargin },
      revenue_change_value: curRevenue - cmpRevenue,
      margin_change_value: curMargin - cmpMargin,
      revenue_change_pct: revenuePct,
      margin_change_pct: marginPct,
      revenue_alert: revenuePct !== null && revenuePct <= -revThreshold,
      margin_alert: marginPct !== null && marginPct <= -marThreshold,
    }
  }

  const hitsFromDetail = (d: MetricComparisonDetail): { metric: 'revenue' | 'margin'; pct: number }[] => {
    const hits: { metric: 'revenue' | 'margin'; pct: number }[] = []
    if (d.revenue_alert && d.revenue_change_pct !== null) hits.push({ metric: 'revenue', pct: d.revenue_change_pct })
    if (d.margin_alert && d.margin_change_pct !== null) hits.push({ metric: 'margin', pct: d.margin_change_pct })
    return hits
  }

  const alerts: AlertHit[] = []
  for (const c of companyCustomers) {
    const current = currentAgg.get(c.id)
    const yoyDetail = computeDetail(current, yoyAgg.get(c.id), revenueThreshold, marginThreshold)
    const vsYoy = hitsFromDetail(yoyDetail)
    if (vsYoy.length === 0) continue
    alerts.push({
      customer_id: c.id,
      customer_name: c.name,
      is_pareto: paretoIds.has(c.id),
      vsYoy,
      detail: { last_year: yoyDetail },
    })
  }
  return alerts
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
  companyName: string
  periodType: PeriodType
  periodKey: string
  checkpoint: Checkpoint
  ranges: TriggerRanges
  /** Catatan tambahan di body notifikasi, mis. "progres s.d. tanggal 14, bulan belum tutup" (Trigger A). */
  bodyNote?: string
}): Promise<NewNotification[]> {
  const { companyId, companyName, periodType, periodKey, checkpoint, ranges, bodyNote } = params
  const { current: currentRange, yoy: yoyRange } = ranges

  const companyCustomers = await db
    .select({ id: customers.id, name: customers.customer_name })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))

  if (companyCustomers.length === 0) return []

  const customerIds = companyCustomers.map(c => c.id)

  const [currentAgg, yoyAgg, thresholdRows, paretoIds] = await Promise.all([
    aggregateInvoicesByCustomer(customerIds, currentRange),
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

  // Hitung perbandingan LENGKAP (bukan cuma hits yang breach threshold) — dipakai
  // baik utk keputusan trigger (revenue_alert/margin_alert) MAUPUN utk isi detail
  // tabel PDF (semua angka current/comparison/change, apa pun statusnya, task016 §23).
  const computeDetail = (
    current: CustomerPeriodAggregate | undefined,
    compare: CustomerPeriodAggregate | undefined,
    revThreshold: number,
    marThreshold: number,
  ): MetricComparisonDetail => {
    const curRevenue = current?.revenue ?? 0
    const curMargin = current?.margin ?? 0
    const cmpRevenue = compare?.revenue ?? 0
    const cmpMargin = compare?.margin ?? 0
    const revenuePct = pctChange(curRevenue, cmpRevenue)
    const marginPct = pctChange(curMargin, cmpMargin)
    return {
      current: { revenue: curRevenue, margin: curMargin },
      comparison: { revenue: cmpRevenue, margin: cmpMargin },
      revenue_change_value: curRevenue - cmpRevenue,
      margin_change_value: curMargin - cmpMargin,
      revenue_change_pct: revenuePct,
      margin_change_pct: marginPct,
      revenue_alert: revenuePct !== null && revenuePct <= -revThreshold,
      margin_alert: marginPct !== null && marginPct <= -marThreshold,
    }
  }

  const hitsFromDetail = (d: MetricComparisonDetail): { metric: 'revenue' | 'margin'; pct: number }[] => {
    const hits: { metric: 'revenue' | 'margin'; pct: number }[] = []
    if (d.revenue_alert && d.revenue_change_pct !== null) hits.push({ metric: 'revenue', pct: d.revenue_change_pct })
    if (d.margin_alert && d.margin_change_pct !== null) hits.push({ metric: 'margin', pct: d.margin_change_pct })
    return hits
  }

  const alerts: AlertHit[] = []
  for (const c of companyCustomers) {
    const current = currentAgg.get(c.id)
    const yoyDetail = computeDetail(current, yoyAgg.get(c.id), revenueThreshold, marginThreshold)
    const vsYoy = hitsFromDetail(yoyDetail)
    if (vsYoy.length === 0) continue
    alerts.push({
      customer_id: c.id,
      customer_name: c.name,
      is_pareto: paretoIds.has(c.id),
      vsYoy,
      detail: { last_year: yoyDetail },
    })
  }

  if (alerts.length === 0) {
    logger.info(`[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey}:${checkpoint} - 0 alert`)
    return []
  }

  const notificationsToInsert: NewNotification[] = []
  for (const alert of alerts) {
    const scope = await resolveCustomerScope(alert.customer_id, companyId)
    const recipients = await resolveAlertRecipients(scope)
    if (recipients.length === 0) continue

    const describeHits = (hits: { metric: 'revenue' | 'margin'; pct: number }[]): string =>
      hits.map(h => `${h.metric === 'revenue' ? 'Revenue' : 'Margin'} ${h.pct.toFixed(1)}%`).join(', ')

    // Basis SELALU YoY (task016 §28) — vsPrevious/PoP dihapus total dari trigger.
    const bodyMetrics = `vs tahun lalu: ${describeHits(alert.vsYoy)}`

    // periodType di sini tidak pernah 'ytd' secara runtime (PERIOD_TYPES cuma
    // quarter/semester/annual/monthly, lihat komentar const di atas) — cast aman.
    const label = triggerLabel(periodType as Exclude<PeriodType, 'ytd'>, checkpoint)
    const title = alert.is_pareto
      ? `[${label} · Pareto] ${alert.customer_name} turun performa`
      : `[${label}] ${alert.customer_name} turun performa`
    const body = bodyNote
      ? `${bodyMetrics} — ${bodyNote}`
      : `${bodyMetrics} — periode ${periodKey}.`

    for (const recipient of recipients) {
      notificationsToInsert.push({
        user_id: recipient.id,
        type: 'analisis_alert',
        title,
        body,
        entity_ref: {
          customer_id: alert.customer_id,
          customer_name: alert.customer_name,
          company_id: companyId,
          company_name: companyName,
          period_type: periodType,
          period_key: periodKey,
          checkpoint,
          is_pareto: alert.is_pareto,
          // Detail YoY — dipakai susun tabel PDF digest (task016 §23, disederhanakan
          // jadi YoY-only §28), disimpan di sini (bukan dihitung ulang saat kirim
          // email) supaya konsisten dengan angka yang benar-benar memicu alert saat itu.
          detail: alert.detail,
        },
      })
    }
  }

  await createNotifications(notificationsToInsert)
  logger.info(
    `[analisis-scheduler] company=${companyId} period=${periodType}:${periodKey}:${checkpoint} - ${alerts.length} alert, ${notificationsToInsert.length} notifikasi dikirim`,
  )
  return notificationsToInsert
}

/** Aturan 1 (kuartal/semester/tahunan) & Trigger B Aturan 2 (bulanan tertutup) — periode SUDAH tutup penuh. */
async function evaluateClosedPeriod(companyId: number, companyName: string, periodType: PeriodType, periodKey: string): Promise<NewNotification[]> {
  return evaluateAndNotify({
    companyId,
    companyName,
    periodType,
    periodKey,
    checkpoint: 'closed',
    ranges: resolveTriggerRanges(periodType, periodKey, 'closed', MID_MONTH_CHECKPOINT_DAY),
  })
}

/** Trigger A Aturan 2 — tanggal 14, bandingkan tanggal 1-14 bulan berjalan vs 1-14 bulan pembanding. */
async function evaluateMonthlyMidpoint(companyId: number, companyName: string, monthKey: string): Promise<NewNotification[]> {
  return evaluateAndNotify({
    companyId,
    companyName,
    periodType: 'monthly',
    periodKey: monthKey,
    checkpoint: 'mid_month',
    ranges: resolveTriggerRanges('monthly', monthKey, 'mid_month', MID_MONTH_CHECKPOINT_DAY),
    bodyNote: `progres s.d. tanggal ${MID_MONTH_CHECKPOINT_DAY}, periode ${monthKey} (bulan belum tutup)`,
  })
}

export async function runAnalisisAlertEvaluation(): Promise<void> {
  const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies)
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

  // Kumpulan SEMUA notifikasi yang dibuat sepanjang run ini, lintas company/
  // period type/checkpoint — dipakai buat digest email di akhir fungsi (task016
  // §21: "1 email berisi all notifikasi", BUKAN per-notifikasi/per-company).
  const allNewNotifications: NewNotification[] = []

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
        const created = await evaluateClosedPeriod(company.id, company.name, periodType, periodKey)
        allNewNotifications.push(...created)
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
        const created = await evaluateMonthlyMidpoint(company.id, company.name, currentMonthKey)
        allNewNotifications.push(...created)
      } catch (err) {
        logger.error(`[analisis-scheduler] gagal evaluasi mid-month company=${company.id} period=monthly:${currentMonthKey}`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  await sendDigestEmailsForRun(allNewNotifications)
}

/** Group notifikasi 1 run scheduler per recipient (user_id), lalu kirim SATU
 * digest email per recipient yang punya notification_email terisi — task016
 * §21. Dipanggil di akhir runAnalisisAlertEvaluation, SETELAH semua company/
 * period type selesai, supaya 1 admin yang pegang beberapa company tetap cuma
 * dapat 1 email (bukan 1 email per company). Gagal kirim ke 1 recipient tidak
 * boleh mengganggu recipient lain — per-recipient try/catch, sama prinsipnya
 * dgn per-company try/catch di atas (lihat juga catatan insiden startAnalisisAlertScheduler).
 */
async function sendDigestEmailsForRun(notifications: NewNotification[]): Promise<void> {
  if (notifications.length === 0) return

  const byUser = new Map<number, DigestNotificationItem[]>()
  for (const n of notifications) {
    const item = parseDigestEntityRef(n.entity_ref as Record<string, unknown> | null)
    if (!item) continue
    const list = byUser.get(n.user_id) ?? []
    list.push(item)
    byUser.set(n.user_id, list)
  }

  const userIds = [...byUser.keys()]
  const recipientRows = await db
    .select({ id: users.id, notification_email: users.notification_email })
    .from(users)
    .where(inArray(users.id, userIds))

  for (const row of recipientRows) {
    if (!row.notification_email) continue
    const items = byUser.get(row.id)
    if (!items || items.length === 0) continue
    try {
      await sendDigestEmail(row.notification_email, items)
    } catch (err) {
      logger.error(`[analisis-scheduler] gagal kirim digest email user_id=${row.id}`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export interface DigestPreviewFilter {
  /** undefined = semua period type (default, gabungan penuh seperti scheduler asli). */
  periodType?: PeriodType
  /** undefined = semua checkpoint. 'mid_month' eksplisit BYPASS gerbang tanggal 14
   * (task016 §24) — buat simulasi/test, admin boleh lihat hasilnya kapan saja,
   * beda dari jalur scheduler asli yang emang baru jalan mulai tgl 14. */
  checkpoint?: Checkpoint
}

/**
 * Preview SEMUA customer yang statusnya Kritis SEKARANG, lintas company &
 * period type — dipakai tombol "Kirim Contoh Laporan" (task016 §23-24).
 * READ-ONLY total (reuse computeCompanyAlerts, tanpa insert snapshot/
 * notifikasi, tanpa cek hasSnapshotForPeriod) — beda dari
 * runAnalisisAlertEvaluation yang PUNYA efek samping & dedup harian. Preview
 * ini SELALU hitung ulang dari data invoice terkini, jadi tidak pernah stale
 * meski scheduler asli belum jalan lagi hari ini.
 *
 * `filter` opsional — kosongkan utk gabungan semua trigger (perilaku lama),
 * atau isi buat simulasi 1 trigger spesifik saja (mis. cuma "Progres Bulanan"
 * atau cuma "Laporan Kuartal"), supaya admin bisa cek satu-satu.
 */
export async function previewCurrentDigestItems(filter?: DigestPreviewFilter): Promise<DigestNotificationItem[]> {
  const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies)
  const today = new Date()
  const currentMonthKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`
  const items: DigestNotificationItem[] = []

  const pushAlerts = (company: { id: number; name: string }, periodType: PeriodType, periodKey: string, checkpoint: Checkpoint, alerts: AlertHit[]) => {
    for (const alert of alerts) {
      items.push({
        customer_name: alert.customer_name,
        company_name: company.name,
        is_pareto: alert.is_pareto,
        period_type: periodType as Exclude<PeriodType, 'ytd'>,
        period_key: periodKey,
        checkpoint,
        detail: alert.detail,
      })
    }
  }

  if (!filter?.checkpoint || filter.checkpoint === 'closed') {
    for (const periodType of [...PERIOD_TYPES, 'monthly' as PeriodType]) {
      if (filter?.periodType && filter.periodType !== periodType) continue
      const periodKey = getLatestClosedPeriodKey(periodType)
      const ranges = resolveTriggerRanges(periodType, periodKey, 'closed', MID_MONTH_CHECKPOINT_DAY)
      for (const company of allCompanies) {
        try {
          const alerts = await computeCompanyAlerts(company.id, periodType, ranges)
          pushAlerts(company, periodType, periodKey, 'closed', alerts)
        } catch (err) {
          logger.error(`[analisis-scheduler] preview gagal company=${company.id} period=${periodType}:${periodKey}:closed`, {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }
  }

  const wantsMidMonth = !filter?.checkpoint || filter.checkpoint === 'mid_month'
  const midMonthGateOpen = filter?.checkpoint === 'mid_month' || today.getDate() >= MID_MONTH_CHECKPOINT_DAY
  if (wantsMidMonth && midMonthGateOpen && (!filter?.periodType || filter.periodType === 'monthly')) {
    const ranges = resolveTriggerRanges('monthly', currentMonthKey, 'mid_month', MID_MONTH_CHECKPOINT_DAY)
    for (const company of allCompanies) {
      try {
        const alerts = await computeCompanyAlerts(company.id, 'monthly', ranges)
        pushAlerts(company, 'monthly', currentMonthKey, 'mid_month', alerts)
      } catch (err) {
        logger.error(`[analisis-scheduler] preview mid-month gagal company=${company.id}`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return items
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
