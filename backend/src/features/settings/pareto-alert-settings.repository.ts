import { and, eq, inArray, desc } from 'drizzle-orm'
import { db } from '@/config/db'
import { pareto_alert_settings, companies } from '@/db/schema'

export async function findParetoAlertSettings(scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const conditions = scopeIds ? [inArray(pareto_alert_settings.company_id, scopeIds)] : []

  return db
    .select({
      id: pareto_alert_settings.id,
      company_id: pareto_alert_settings.company_id,
      company_name: companies.name,
      scheduler_enabled: pareto_alert_settings.scheduler_enabled,
      updated_at: pareto_alert_settings.updated_at,
    })
    .from(pareto_alert_settings)
    .leftJoin(companies, eq(pareto_alert_settings.company_id, companies.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(pareto_alert_settings.company_id))
}

export async function upsertParetoAlertSetting(companyId: number, schedulerEnabled: boolean) {
  const [row] = await db
    .insert(pareto_alert_settings)
    .values({ company_id: companyId, scheduler_enabled: schedulerEnabled })
    .onConflictDoUpdate({
      target: [pareto_alert_settings.company_id],
      set: { scheduler_enabled: schedulerEnabled, updated_at: new Date() },
    })
    .returning()
  return row!
}

/**
 * Company_id yang scheduler_enabled=false — dipakai scheduler skip company
 * itu TOTAL (Aturan 1 & 2 sama-sama tidak jalan). Company yang belum pernah
 * di-set (tidak ada row) DIANGGAP enabled (default true, opt-out bukan opt-in).
 */
export async function findDisabledCompanyIds(): Promise<Set<number>> {
  const rows = await db
    .select({ company_id: pareto_alert_settings.company_id })
    .from(pareto_alert_settings)
    .where(eq(pareto_alert_settings.scheduler_enabled, false))
  return new Set(rows.map(r => r.company_id))
}
