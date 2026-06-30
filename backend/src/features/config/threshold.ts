/**
 * features/config/threshold.ts
 *
 * Shared utility untuk threshold config (active window + dormant).
 *
 * Sumber kebenaran tunggal untuk:
 * - Mapping business_unit / division → dormant config key
 * - Parsing raw config rows → typed ThresholdConfig
 * - loadThresholds() convenience wrapper
 *
 * Dipakai oleh:
 * - customers.repository.ts (SQL CASE + filter status)
 * - metrics.service.ts (segment params)
 * - segment.helper.ts (divisionToDormantKey)
 */

import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { findAllConfigs } from './config.repository'
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

// ─── Mapping business_unit / division → dormant config key ────────────────────

/**
 * Mapping dari nilai business_unit (customers.business_unit) / division
 * (channel_divisions.division) ke key di dormant threshold config.
 *
 * SUMBER KEBENARAN TUNGGAL — jika ada perubahan mapping, cukup edit di sini.
 * Konsumen SQL CASE expression harus menggunakan mapping yang sama.
 */
export const BU_DORMANT_KEY_MAP: Record<string, keyof ThresholdConfig['dormant']> = {
  distribution:  'b2b_dc',
  project:       'b2b_project',
  e_commerce:    'b2c',
  intercompany:  'b2b_project',
  freelancer:    'b2c',
  support:       'b2b_dc',
  manufacturing: 'manufacturing',
}

/**
 * Konversi nama division → key business_configs.
 * Contoh: 'project' → 'dormant_threshold_months.b2b_project'
 */
export function divisionToDormantKey(division: string): string {
  const key = BU_DORMANT_KEY_MAP[division] ?? 'b2b_dc'
  return `dormant_threshold_months.${key}`
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
    SELECT cd.division, COUNT(*) AS cnt
    FROM invoices i
    JOIN channel_divisions cd
      ON cd.channel_name = i.channel_name
     AND (cd.company_id = ${cid === 0 ? null : cid}::int OR cd.company_id IS NULL)
    WHERE i.deleted_at IS NULL
      AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      AND i.channel_name IS NOT NULL
    GROUP BY cd.division
    ORDER BY cnt DESC
    LIMIT 1
  `)
  const rows = result as unknown[]
  const first = rows[0] as Record<string, unknown> | undefined
  const division = first?.division != null ? String(first.division) : 'distribution'
  const dormantKey = BU_DORMANT_KEY_MAP[division] ?? 'b2b_dc'
  return dormant[dormantKey]
}

// ─── SQL CASE builder ─────────────────────────────────────────────────────────

/**
 * Build SQL CASE expression untuk mapping `business_unit` / `division` ke
 * dormant threshold value.
 *
 * Menggunakan BU_DORMANT_KEY_MAP sebagai sumber kebenaran tunggal —
 * jika mapping berubah di sini, semua konsumen SQL otomatis menyesuaikan.
 *
 * Contoh output:
 *   CASE "customers"."business_unit"
 *     WHEN 'distribution'  THEN 3::int
 *     WHEN 'project'       THEN 12::int
 *     WHEN 'e_commerce'    THEN 6::int
 *     WHEN 'intercompany'  THEN 12::int
 *     WHEN 'freelancer'    THEN 6::int
 *     WHEN 'support'       THEN 3::int
 *     WHEN 'manufacturing' THEN 6::int
 *     ELSE                      3::int
 *   END
 *
 * @param column  Kolom SQL yang berisi business_unit / division (e.g. customers.business_unit)
 * @param dormant Nilai dormant threshold dari ThresholdConfig
 */
export function buildDormantCaseSql(
  column: SQL | unknown,
  dormant: ThresholdConfig['dormant'],
): SQL {
  const whenClauses = Object.entries(BU_DORMANT_KEY_MAP).map(
    ([bu, key]) => sql`WHEN ${bu} THEN ${dormant[key]}::int`,
  )

  return sql`CASE ${column}
    ${sql.join(whenClauses, sql` `)}
    ELSE ${dormant.b2b_dc}::int
  END`
}
