/**
 * features/config/threshold.ts
 *
 * Shared utility untuk threshold config (active window + dormant).
 *
 * Sumber kebenaran tunggal untuk:
 * - Resolusi division/code → dormant bucket (dinamis, via tabel `divisions`)
 * - Parsing raw config rows → typed ThresholdConfig
 * - loadThresholds() convenience wrapper
 *
 * Dipakai oleh:
 * - customers.repository.ts (findCustomerDetail)
 * - metrics.service.ts (segment params)
 */

import { sql } from 'drizzle-orm'
import { findAllConfigs } from './config.repository'
import { findDormantBucket } from '@/features/settings/branch-divisions.repository'
import { db } from '@/config/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThresholdConfig {
  activeMonths: number
  dormant: {
    b2b_dc: number
    b2b_project: number
    b2c: number
    manufacturing: number
  }
  repeatOrderTargetPct: number
  dormantRateAlertPct: number
  reactivationTargetLow: number
  reactivationTargetHigh: number
}

const KNOWN_DORMANT_BUCKETS = new Set<keyof ThresholdConfig['dormant']>(['b2b_dc', 'b2b_project', 'b2c', 'manufacturing'])

function normalizeDormantBucket(bucket: string | null): keyof ThresholdConfig['dormant'] {
  return bucket && KNOWN_DORMANT_BUCKETS.has(bucket as keyof ThresholdConfig['dormant'])
    ? (bucket as keyof ThresholdConfig['dormant'])
    : 'b2b_dc'
}

// ─── Resolusi division/code → dormant bucket (dinamis) ────────────────────────

/**
 * Cari dormant bucket (b2b_dc|b2b_project|b2c|manufacturing) untuk 1 kode
 * divisi di scope (company, branch) — baca kolom `dormant_bucket` dari
 * katalog `divisions` (dinamis per company/branch), bukan Record hardcode
 * global lagi. Fallback 'b2b_dc' kalau kode tidak ditemukan di katalog.
 * Lihat docs-v2/task/task004.md.
 */
export async function resolveDormantBucketKey(
  companyId: number,
  branchId: number | null,
  code: string,
): Promise<keyof ThresholdConfig['dormant']> {
  const bucket = await findDormantBucket(companyId, branchId, code)
  return normalizeDormantBucket(bucket)
}

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULTS: ThresholdConfig = {
  activeMonths: 1,
  dormant: {
    b2b_dc: 3,
    b2b_project: 12,
    b2c: 6,
    manufacturing: 6,
  },
  repeatOrderTargetPct: 80,
  dormantRateAlertPct: 10,
  reactivationTargetLow: 15,
  reactivationTargetHigh: 20,
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getValue(
  configs: Array<{ key: string; value: string }>,
  key: string,
  fallback: string,
): string {
  return configs.find((c) => c.key === key)?.value ?? fallback
}

function safeParseInt(val: string, fallback: number): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? fallback : n
}

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parse array of config rows (dari findAllConfigs) menjadi ThresholdConfig
 * yang sudah typed, dengan fallback default jika key tidak ditemukan.
 */
export function parseThresholdConfigs(
  configs: Array<{ key: string; value: string }>,
): ThresholdConfig {
  return {
    activeMonths: safeParseInt(
      getValue(configs, 'active_window_months', String(DEFAULTS.activeMonths)),
      DEFAULTS.activeMonths,
    ),
    dormant: {
      b2b_dc: safeParseInt(
        getValue(configs, 'dormant_threshold_months.b2b_dc', String(DEFAULTS.dormant.b2b_dc)),
        DEFAULTS.dormant.b2b_dc,
      ),
      b2b_project: safeParseInt(
        getValue(configs, 'dormant_threshold_months.b2b_project', String(DEFAULTS.dormant.b2b_project)),
        DEFAULTS.dormant.b2b_project,
      ),
      b2c: safeParseInt(
        getValue(configs, 'dormant_threshold_months.b2c', String(DEFAULTS.dormant.b2c)),
        DEFAULTS.dormant.b2c,
      ),
      manufacturing: safeParseInt(
        getValue(configs, 'dormant_threshold_months.manufacturing', String(DEFAULTS.dormant.manufacturing)),
        DEFAULTS.dormant.manufacturing,
      ),
    },
    repeatOrderTargetPct: safeParseInt(
      getValue(configs, 'repeat_order_target_pct', String(DEFAULTS.repeatOrderTargetPct)),
      DEFAULTS.repeatOrderTargetPct,
    ),
    dormantRateAlertPct: safeParseInt(
      getValue(configs, 'dormant_rate_alert_pct', String(DEFAULTS.dormantRateAlertPct)),
      DEFAULTS.dormantRateAlertPct,
    ),
    reactivationTargetLow: safeParseInt(
      getValue(configs, 'reactivation_target_low_pct', String(DEFAULTS.reactivationTargetLow)),
      DEFAULTS.reactivationTargetLow,
    ),
    reactivationTargetHigh: safeParseInt(
      getValue(configs, 'reactivation_target_high_pct', String(DEFAULTS.reactivationTargetHigh)),
      DEFAULTS.reactivationTargetHigh,
    ),
  }
}

/**
 * Load threshold config dari database.
 * Convenience wrapper — langsung返回 ThresholdConfig tanpa manual findAllConfigs.
 */
export async function loadThresholds(): Promise<ThresholdConfig> {
  const configs = await findAllConfigs()
  return parseThresholdConfigs(configs)
}

// ─── Company-wide dormant resolver ───────────────────────────────────────────

/**
 * Cari dormant threshold berdasarkan divisi terbanyak di invoices company.
 * cid = 0 berarti semua perusahaan.
 * Dipakai Customer page DAN Metrics page agar threshold konsisten.
 */
export async function resolveDormantMonths(
  cid: number,
  dormant: ThresholdConfig['dormant'],
): Promise<number> {
  const result = await db.execute(sql`
    SELECT cd.division_id, i.company_id AS invoice_company_id, COUNT(*) AS cnt
    FROM invoices i
    JOIN division_channels cd
      ON cd.channel_name = i.channel_name
     AND (cd.company_id = ${cid === 0 ? null : cid}::int OR cd.company_id IS NULL)
     AND (cd.branch_id = i.branch_id OR cd.branch_id IS NULL)
    WHERE i.deleted_at IS NULL
      AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      AND i.channel_name IS NOT NULL
    GROUP BY cd.division_id, i.company_id
    ORDER BY cnt DESC
    LIMIT 1
  `)
  const rows = result as unknown[]
  const first = rows[0] as Record<string, unknown> | undefined
  const division = first?.division != null ? String(first.division) : null
  const winningCompanyId = first?.invoice_company_id != null ? Number(first.invoice_company_id) : null

  const dormantKey = division && winningCompanyId
    ? await resolveDormantBucketKey(winningCompanyId, null, division)
    : 'b2b_dc'
  return dormant[dormantKey]
}
