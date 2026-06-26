/**
 * features/import/import.repository.ts
 *
 * Repository layer untuk import feature — semua query database terkait import.
 */
import { and, eq, desc, sql, count, or, isNull } from 'drizzle-orm'
import { db } from '@/config/db'
import {
  invoices,
  invoice_items,
  customers,
  product_categories,
  products,
  import_logs,
  import_log_errors,
  item_classification_rules,
  channel_divisions,
  companies,
  users,
} from '@/db/schema'
import type { NewInvoice } from '@/db/schema/invoices'
import type { NewInvoiceItem } from '@/db/schema/invoice_items'
import type { NewImportLog } from '@/db/schema/import_logs'
import type { NewImportLogError } from '@/db/schema/import_log_errors'
import type { NewItemClassificationRule } from '@/db/schema/item_classification_rules'

// ─── Date Helpers ────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── Import Logs ─────────────────────────────────────────────────────────────

export async function createImportLog(data: NewImportLog) {
  const [result] = await db.insert(import_logs).values(data).returning()
  return result
}

export async function updateImportLog(id: number, data: Partial<NewImportLog>) {
  const [result] = await db
    .update(import_logs)
    .set({ ...data, updated_at: new Date() })
    .where(eq(import_logs.id, id))
    .returning()
  return result
}

export async function findImportLogs(companyId?: number, page = 1, perPage = 20) {
  const offset = (page - 1) * perPage
  const whereClause = companyId ? eq(import_logs.company_id, companyId) : undefined

  const [totalResult] = await db
    .select({ total: count() })
    .from(import_logs)
    .where(whereClause)

  const rows = await db
    .select({
      id: import_logs.id,
      source: import_logs.source,
      filename: import_logs.filename,
      period_month: import_logs.period_month,
      status: import_logs.status,
      total_invoices: import_logs.total_invoices,
      total_items: import_logs.total_items,
      success_invoices: import_logs.success_invoices,
      error_rows: import_logs.error_rows,
      created_at: import_logs.created_at,
      updated_at: import_logs.updated_at,
      company: {
        id: companies.id,
        name: companies.name,
      },
      imported_by: {
        id: users.id,
        name: users.name,
      },
    })
    .from(import_logs)
    .leftJoin(companies, eq(import_logs.company_id, companies.id))
    .leftJoin(users, eq(import_logs.imported_by, users.id))
    .where(whereClause)
    .orderBy(desc(import_logs.created_at))
    .limit(perPage)
    .offset(offset)

  return { rows, total: Number(totalResult.total) }
}

export async function findImportLogById(id: number) {
  const [result] = await db.select().from(import_logs).where(eq(import_logs.id, id))
  return result
}

export async function findImportErrors(logId: number) {
  return db.select().from(import_log_errors).where(eq(import_log_errors.import_log_id, logId))
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function upsertCustomer(data: { company_id: number; customer_name: string; invoice_date: Date; channel_name?: string }) {
  const upperName = data.customer_name.trim().toUpperCase()
  const invoiceDateStr = toDateString(data.invoice_date)

  // Lookup division dari channel_divisions berdasarkan channel_name
  let division: string | null = null
  if (data.channel_name) {
    const upperCh = data.channel_name.trim().toUpperCase()
    const [divRow] = await db
      .select({ division: channel_divisions.division })
      .from(channel_divisions)
      .where(eq(channel_divisions.channel_name, upperCh))
      .limit(1)
    division = divRow?.division ?? null
  }

  // Cari existing customer by company_id + UPPER(customer_name)
  const existing = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.company_id, data.company_id),
        eq(sql`UPPER(${customers.customer_name})`, upperName),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    const existingCustomer = existing[0]
    const existingFirstDate = existingCustomer.first_invoice_date
      ? new Date(existingCustomer.first_invoice_date)
      : data.invoice_date
    const existingLastDate = existingCustomer.last_invoice_date
      ? new Date(existingCustomer.last_invoice_date)
      : data.invoice_date

    const newFirstDate = new Date(Math.min(existingFirstDate.getTime(), data.invoice_date.getTime()))
    const newLastDate = new Date(Math.max(existingLastDate.getTime(), data.invoice_date.getTime()))

    const updateData: Record<string, unknown> = {
      first_invoice_date: toDateString(newFirstDate),
      last_invoice_date: toDateString(newLastDate),
      customer_name: upperName,
      updated_at: new Date(),
    }
    // Update business_unit hanya jika invoice ini lebih baru (pakai last_invoice_date baru)
    if (division && newLastDate.getTime() === data.invoice_date.getTime()) {
      updateData.business_unit = division
    }

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, existingCustomer.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(customers)
    .values({
      company_id: data.company_id,
      customer_name: upperName,
      first_invoice_date: invoiceDateStr,
      last_invoice_date: invoiceDateStr,
      business_unit: division ?? undefined,
    })
    .returning()
  return created
}

// ─── Product Categories ──────────────────────────────────────────────────────

export async function upsertProductCategory(data: {
  company_id: number
  name: string
  item_type: string
}) {
  const upperName = data.name.trim().toUpperCase()
  const existing = await db
    .select()
    .from(product_categories)
    .where(
      and(
        eq(product_categories.company_id, data.company_id),
        eq(sql`UPPER(${product_categories.name})`, upperName),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    return existing[0]
  }

  const [created] = await db
    .insert(product_categories)
    .values({
      company_id: data.company_id,
      name: upperName,
      item_type: data.item_type,
    })
    .returning()
  return created
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function upsertProduct(data: {
  company_id: number
  product_name: string
  product_category_id?: number | null
}) {
  const upperName = data.product_name.trim().toUpperCase()

  const existing = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.company_id, data.company_id),
        eq(sql`UPPER(${products.product_name})`, upperName),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    const current = existing[0]
    if (data.product_category_id && current.product_category_id !== data.product_category_id) {
      const [updated] = await db
        .update(products)
        .set({ product_category_id: data.product_category_id, updated_at: new Date() })
        .where(eq(products.id, current.id))
        .returning()
      return updated
    }
    return current
  }

  const [created] = await db
    .insert(products)
    .values({
      company_id: data.company_id,
      product_name: upperName,
      product_category_id: data.product_category_id ?? null,
    })
    .returning()
  return created
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function findInvoiceByNumber(companyId: number, invoiceNumber: string) {
  const [result] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.company_id, companyId),
        eq(sql`UPPER(${invoices.invoice_number})`, invoiceNumber.trim().toUpperCase()),
      ),
    )
    .limit(1)
  return result
}

export async function createInvoice(data: NewInvoice) {
  const [result] = await db.insert(invoices).values(data).returning()
  return result
}

export async function updateInvoice(id: number, data: Partial<NewInvoice>) {
  const [result] = await db
    .update(invoices)
    .set({ ...data, updated_at: new Date() })
    .where(eq(invoices.id, id))
    .returning()
  return result
}

export async function deleteInvoiceItemsByInvoiceId(invoiceId: number) {
  await db.delete(invoice_items).where(eq(invoice_items.invoice_id, invoiceId))
}

export async function updateInvoiceTotals(invoiceId: number) {
  const [aggResult] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${invoice_items.revenue}), 0)`,
      totalGp: sql<number>`COALESCE(SUM(${invoice_items.gross_profit}), 0)`,
    })
    .from(invoice_items)
    .where(eq(invoice_items.invoice_id, invoiceId))

  await db
    .update(invoices)
    .set({
      total_revenue: String(aggResult.totalRevenue),
      total_gp: String(aggResult.totalGp),
      updated_at: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
}

// ─── Invoice Items ───────────────────────────────────────────────────────────

export async function createInvoiceItem(data: NewInvoiceItem) {
  const [result] = await db.insert(invoice_items).values(data).returning()
  return result
}

// ─── Import Errors ───────────────────────────────────────────────────────────

export async function createImportErrors(errors: NewImportLogError[]) {
  if (errors.length === 0) return
  await db.insert(import_log_errors).values(errors)
}

// ─── Classification Rules ────────────────────────────────────────────────────

export async function findClassificationRules(companyId?: number) {
  const whereClause = companyId
    ? and(
        eq(item_classification_rules.is_active, true),
        or(
          eq(item_classification_rules.company_id, companyId),
          isNull(item_classification_rules.company_id),
        ),
      )
    : eq(item_classification_rules.is_active, true)

  return db
    .select()
    .from(item_classification_rules)
    .where(whereClause)
    .orderBy(desc(item_classification_rules.priority))
}

export async function createClassificationRule(data: NewItemClassificationRule) {
  const [result] = await db.insert(item_classification_rules).values(data).returning()
  return result
}

export async function updateClassificationRule(id: number, data: Partial<NewItemClassificationRule>) {
  const [result] = await db
    .update(item_classification_rules)
    .set({ ...data, updated_at: new Date() })
    .where(eq(item_classification_rules.id, id))
    .returning()
  return result
}

export async function deleteClassificationRule(id: number) {
  await db.delete(item_classification_rules).where(eq(item_classification_rules.id, id))
}