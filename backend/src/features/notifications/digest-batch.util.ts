/**
 * digest-batch.util.ts — kelompokkan notifikasi digest jadi "batch" (period_type
 * +period_key+checkpoint) + hitung rentang tanggal current/comparison per batch.
 * Dipakai BERSAMA oleh pdf.service.ts dan email.service.ts (task016 §30, sebelum
 * ini logic sama persis di-duplikasi di pdf.service.ts saja, email.service.ts
 * tidak punya kop per-batch sama sekali) — supaya "kop" laporan di PDF maupun
 * badan email SELALU merujuk rentang tanggal yang identik, tidak mungkin drift.
 */
import { resolveTriggerRanges, getPeriodRange, shiftDateByYears } from '@/features/analisis/period.util'
import type { DigestNotificationItem, DigestPeriodType, DigestCheckpoint } from './digest.types'

const MID_MONTH_DAY = 14 // sinkron dgn scheduler.ts MID_MONTH_CHECKPOINT_DAY

export interface DateRange {
  start: string
  end: string
}

export interface DigestBatch {
  key: string
  periodType: DigestPeriodType
  checkpoint: DigestCheckpoint
  items: DigestNotificationItem[]
  current: DateRange
  comparison: DateRange
}

function batchKey(item: DigestNotificationItem): string {
  return `${item.period_type}:${item.period_key}:${item.checkpoint}`
}

/** Grouping biasanya cuma 1 batch/hari, tapi 1 Januari bulanan+kuartal+semester+
 * tahunan bisa tutup bersamaan, jadi BISA lebih dari 1 batch dalam 1 digest
 * (masing-masing kop/rentang sendiri, BUKAN dicampur jadi 1 yang menyesatkan). */
export function groupDigestBatches(items: DigestNotificationItem[]): DigestBatch[] {
  const map = new Map<string, DigestNotificationItem[]>()
  for (const item of items) {
    const key = batchKey(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }

  const batches: DigestBatch[] = []
  for (const [key, batchItems] of map) {
    const [sample] = batchItems

    // Laporan MANUAL (task016 §29) — end date BEBAS (dipilih user via date
    // picker), tidak deterministik dari period_type+period_key+checkpoint saja
    // seperti trigger scheduler, jadi range dihitung ULANG dari sample.end_date
    // yang tersimpan di item (MIRROR PERSIS logic end_date di analisis.service.ts
    // — start selalu awal periode yang mengandung end_date, comparison SELALU
    // YoY digeser -1 tahun) — BUKAN resolveTriggerRanges (itu khusus trigger
    // scheduler otomatis, day-14 mid-month atau akhir periode natural).
    const ranges = sample.checkpoint === 'manual' && sample.end_date
      ? (() => {
          const periodStart = getPeriodRange(sample.period_type, sample.period_key).start
          return {
            current: { start: periodStart, end: sample.end_date! },
            comparison: { start: shiftDateByYears(periodStart, -1), end: shiftDateByYears(sample.end_date!, -1) },
          }
        })()
      : (() => {
          const r = resolveTriggerRanges(sample.period_type, sample.period_key, sample.checkpoint as 'closed' | 'mid_month', MID_MONTH_DAY)
          return { current: r.current, comparison: r.yoy }
        })()

    batches.push({
      key,
      periodType: sample.period_type,
      checkpoint: sample.checkpoint,
      items: batchItems,
      current: ranges.current,
      comparison: ranges.comparison,
    })
  }
  return batches
}

export function formatDateRange(start: string, end: string, monthNames: string[]): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [, em, ed] = end.split('-').map(Number)
  if (sm === em) return `${sd}–${ed} ${monthNames[sm - 1]} ${sy}`
  return `${sd} ${monthNames[sm - 1]} – ${ed} ${monthNames[em - 1]} ${sy}`
}
