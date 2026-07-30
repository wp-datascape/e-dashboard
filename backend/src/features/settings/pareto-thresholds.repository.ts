import { and, eq, inArray, desc } from 'drizzle-orm'
import { db } from '@/config/db'
import { pareto_alert_thresholds, companies } from '@/db/schema'

export async function findParetoThresholdById(id: number) {
  const [result] = await db
    .select()
    .from(pareto_alert_thresholds)
    .where(eq(pareto_alert_thresholds.id, id))
  return result ?? null
}

export async function findParetoThresholds(scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const conditions = scopeIds ? [inArray(pareto_alert_thresholds.company_id, scopeIds)] : []

  return db
    .select({
      id: pareto_alert_thresholds.id,
      company_id: pareto_alert_thresholds.company_id,
      company_name: companies.name,
      period_type: pareto_alert_thresholds.period_type,
      metric: pareto_alert_thresholds.metric,
      drop_percent: pareto_alert_thresholds.drop_percent,
      is_active: pareto_alert_thresholds.is_active,
      created_at: pareto_alert_thresholds.created_at,
      updated_at: pareto_alert_thresholds.updated_at,
    })
    .from(pareto_alert_thresholds)
    .leftJoin(companies, eq(pareto_alert_thresholds.company_id, companies.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(pareto_alert_thresholds.company_id))
}

export async function upsertParetoThreshold(data: {
  company_id: number
  period_type: string
  metric: string
  drop_percent: number
  is_active: boolean
}) {
  const [row] = await db
    .insert(pareto_alert_thresholds)
    .values({
      company_id: data.company_id,
      period_type: data.period_type,
      metric: data.metric,
      drop_percent: String(data.drop_percent),
      is_active: data.is_active,
    })
    .onConflictDoUpdate({
      target: [
        pareto_alert_thresholds.company_id,
        pareto_alert_thresholds.period_type,
        pareto_alert_thresholds.metric,
      ],
      set: {
        drop_percent: String(data.drop_percent),
        is_active: data.is_active,
        updated_at: new Date(),
      },
    })
    .returning()
  return row!
}

export async function deleteParetoThreshold(id: number) {
  await db.delete(pareto_alert_thresholds).where(eq(pareto_alert_thresholds.id, id))
}
