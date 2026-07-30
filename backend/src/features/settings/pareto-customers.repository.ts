import { and, eq, inArray, or, isNull, lte, gte, desc, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { pareto_customers, customers, companies } from '@/db/schema'
import type { NewParetoCustomer } from '@/db/schema'

export async function createParetoCustomer(data: NewParetoCustomer) {
  const [result] = await db.insert(pareto_customers).values(data).returning()
  return result
}

export async function findParetoCustomerById(id: number) {
  const [result] = await db
    .select()
    .from(pareto_customers)
    .where(eq(pareto_customers.id, id))
  return result ?? null
}

export async function findParetoCustomers(params: {
  active_only?: boolean
}, scopeIds?: number[]) {
  const { active_only } = params

  // scopeIds undefined → superadmin + 'all' → tidak ada filter company (lihat semua)
  // scopeIds array     → company spesifik ATAU 'all' non-superadmin → filter ke company itu
  if (scopeIds && scopeIds.length === 0) return []
  const conditions = scopeIds ? [inArray(pareto_customers.company_id, scopeIds)] : []

  if (active_only) {
    const today = sql`CURRENT_DATE`
    conditions.push(lte(pareto_customers.effective_from, today))
    conditions.push(
      or(
        isNull(pareto_customers.effective_until),
        gte(pareto_customers.effective_until, today),
      )!,
    )
  }

  return db
    .select({
      id: pareto_customers.id,
      company_id: pareto_customers.company_id,
      company_name: companies.name,
      customer_id: pareto_customers.customer_id,
      customer_name: customers.customer_name,
      customer_code: customers.customer_code,
      effective_from: pareto_customers.effective_from,
      effective_until: pareto_customers.effective_until,
      note: pareto_customers.note,
      created_by: pareto_customers.created_by,
      created_at: pareto_customers.created_at,
      updated_at: pareto_customers.updated_at,
    })
    .from(pareto_customers)
    .leftJoin(companies, eq(pareto_customers.company_id, companies.id))
    .leftJoin(customers, eq(pareto_customers.customer_id, customers.id))
    .where(and(...conditions))
    .orderBy(desc(pareto_customers.effective_from))
}

export async function updateParetoCustomer(id: number, data: {
  effective_until?: string | null
  note?: string
}) {
  const [result] = await db
    .update(pareto_customers)
    .set({ ...data, updated_at: new Date() })
    .where(eq(pareto_customers.id, id))
    .returning()
  return result
}

export async function closeParetoCustomer(id: number, today: string) {
  const [result] = await db
    .update(pareto_customers)
    .set({ effective_until: today, updated_at: new Date() })
    .where(eq(pareto_customers.id, id))
    .returning()
  return result
}

export async function deleteParetoCustomer(id: number) {
  await db.delete(pareto_customers).where(eq(pareto_customers.id, id))
}

/** Daftar customer riil (bukan placeholder) untuk 1 company — dipakai Autocomplete
 * saat pilih customer yang mau di-flag Pareto (mirror pola intercompany-names). */
export async function findCustomerOptionsForPareto(companyId: number) {
  return db
    .select({ id: customers.id, customer_name: customers.customer_name, customer_code: customers.customer_code })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))
    .orderBy(customers.customer_name)
}
