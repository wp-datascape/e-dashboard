/**
 * features/config/threshold.ts
 *
 * Shared utility untuk threshold config (active window + dormant).
 *
 * Sumber kebenaran tunggal untuk:
 * - Resolve division_id → dormant config key (dormant_category, kolom `divisions.dormant_category`)
 * - Parsing raw config rows → typed ThresholdConfig
 * - loadThresholds() convenience wrapper
 *
 * Dipakai oleh:
 * - customers.repository.ts (SQL CASE + filter status)
 * - metrics.service.ts (segment params)
 * - segment.helper.ts (divisionToDormantKey)
 *
 * Division sekarang FK integer (task012 v2, docs-v2/task/task012.md) — dulu
 * `BU_DORMANT_KEY_MAP` const hardcoded (mapping string division → kategori dormant),
 * sekarang lookup langsung ke kolom `divisions.dormant_category` by `division_id`
 * (LEBIH SEDERHANA dari desain v1 yang masih company+key based).
 */

import { sql, eq } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { findAllConfigs } from './config.repository'
import { db } from '@/config/db'
import { divisions } from '@/db/schema'
import { buildCompanyConditionRaw } from '@/utils/scope'

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

// ─── division_id → dormant config key ──────────────────────────────────────────

/**
 * Resolve division_id → dormant_category (b2b_dc | b2b_project | b2c | manufacturing).
 * `divisionId=null` (tidak ada channel mapping yang match) → fallback 'b2b_dc', sama
 * seperti perilaku lama.
 */
export async function resolveDormantCategory(divisionId: number | null): Promise<keyof ThresholdConfig['dormant']> {
  if (divisionId == null) return 'b2b_dc'
  const [row] = await db.select({ dormant_category: divisions.dormant_category }).from(divisions).where(eq(divisions.id, divisionId))
  return (row?.dormant_category as keyof ThresholdConfig['dormant'] | undefined) ?? 'b2b_dc'
}

/**
 * Konversi division_id → key business_configs.
 * Contoh: division_id=2 (dormant_category='b2b_project') → 'dormant_threshold_months.b2b_project'
 */
export async function divisionToDormantKey(divisionId: number | null): Promise<string> {
  const key = await resolveDormantCategory(divisionId)
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
  companyScopeIds?: number[],
): Promise<number> {
  // BUG (ditemukan lewat laporan user 2026-08-06 - M5 beda antara superadmin
  // vs mko.executive): sebelumnya kondisi cuma "cid=0 OR company_id=cid",
  // artinya user non-superadmin yang minta company_id='all' (cid jadi 0) tetap
  // scan SEMUA company lintas holding buat cari divisi paling dominan --
  // termasuk company LAIN yang bukan haknya. Company dengan volume invoice
  // jauh lebih besar (mis. KNT ~182rb vs MKO ~7rb) mendominasi hasil,
  // dormant_category yang kepilih jadi tidak relevan sama sekali buat scope
  // asli user. Reuse buildCompanyConditionRaw yang sudah benar menangani
  // cid=0+scopeIds (union) vs cid=0+tanpa scopeIds (bypass superadmin).
  const companyCond = buildCompanyConditionRaw('i.company_id', cid, companyScopeIds)
  const result = await db.execute(sql`
    SELECT cd.division_id, COUNT(*) AS cnt
    FROM invoices i
    JOIN channel_divisions cd
      ON cd.channel_name = i.channel_name
     AND cd.company_id = i.company_id
    WHERE i.deleted_at IS NULL
      AND ${companyCond}
      AND i.channel_name IS NOT NULL
    GROUP BY cd.division_id
    ORDER BY cnt DESC
    LIMIT 1
  `)
  const rows = result as unknown[]
  const first = rows[0] as Record<string, unknown> | undefined
  const divisionId = first?.division_id != null ? Number(first.division_id) : null
  const dormantKey = await resolveDormantCategory(divisionId)
  return dormant[dormantKey]
}

// ─── SQL CASE builder ─────────────────────────────────────────────────────────

/**
 * Ambil mapping division_id → dormant category, dipakai bareng buildDormantCaseSql().
 * `companyId` opsional — kalau diisi, cuma division milik company itu (+ company-wide
 * divisions company itu); kalau tidak, semua division di semua company.
 */
export async function getDormantCategoryMap(companyId?: number): Promise<Map<number, keyof ThresholdConfig['dormant']>> {
  const rows = companyId != null
    ? await db.select({ id: divisions.id, dormant_category: divisions.dormant_category }).from(divisions).where(eq(divisions.company_id, companyId))
    : await db.select({ id: divisions.id, dormant_category: divisions.dormant_category }).from(divisions)
  return new Map(rows.map((r) => [r.id, r.dormant_category as keyof ThresholdConfig['dormant']]))
}

/**
 * Build SQL CASE expression untuk mapping `division_id` ke dormant threshold value.
 *
 * @param column  Kolom SQL yang berisi division_id (e.g. channel_divisions.division_id)
 * @param dormant Nilai dormant threshold dari ThresholdConfig
 * @param mapping Mapping division_id → dormant category (dari getDormantCategoryMap())
 */
export function buildDormantCaseSql(
  column: SQL | unknown,
  dormant: ThresholdConfig['dormant'],
  mapping: Map<number, keyof ThresholdConfig['dormant']>,
): SQL {
  const whenClauses = [...mapping.entries()].map(
    ([divisionId, key]) => sql`WHEN ${divisionId} THEN ${dormant[key]}::int`,
  )

  return sql`CASE ${column}
    ${sql.join(whenClauses, sql` `)}
    ELSE ${dormant.b2b_dc}::int
  END`
}
