import { db } from '@/config/db'
import { intercompany_customer_names, customers } from '@/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'

// scopeIds undefined → superadmin + 'all' → tidak ada filter company (lihat semua)
// scopeIds array     → company spesifik ATAU 'all' non-superadmin → filter ke company itu
export async function findIntercompanyNames(scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const condition = scopeIds ? inArray(intercompany_customer_names.company_id, scopeIds) : undefined
  return db
    .select()
    .from(intercompany_customer_names)
    .where(condition)
    .orderBy(intercompany_customer_names.customer_name)
}

/**
 * Opsi nama customer riil (bukan ketik bebas) untuk company tertentu — dipakai
 * autocomplete form tambah nama, supaya input SELALU cocok persis data DB (tidak
 * rawan typo/mismatch yang bikin sync ke division_override_id diam-diam gagal).
 */
export async function findCustomerNameOptions(companyId: number) {
  return db
    .select({ id: customers.id, customer_name: customers.customer_name })
    .from(customers)
    .where(and(eq(customers.company_id, companyId), eq(customers.is_placeholder, false)))
    .orderBy(customers.customer_name)
}

export async function findIntercompanyNameById(id: number) {
  const [row] = await db.select().from(intercompany_customer_names).where(eq(intercompany_customer_names.id, id))
  return row ?? null
}

export async function createIntercompanyName(data: { company_id: number; customer_name: string }) {
  const [result] = await db.insert(intercompany_customer_names).values(data).returning()
  return result
}

export async function updateIntercompanyName(id: number, data: { is_active: boolean }) {
  const [result] = await db
    .update(intercompany_customer_names)
    .set({ ...data, updated_at: new Date() })
    .where(eq(intercompany_customer_names.id, id))
    .returning()
  return result
}

export async function deleteIntercompanyName(id: number) {
  await db.delete(intercompany_customer_names).where(eq(intercompany_customer_names.id, id))
}

/**
 * Set/lepas division_override_id semua customer company itu yang namanya cocok
 * (UPPER-normalized, sama pola dedup upsertCustomer) — dipanggil saat alias
 * ditambah (divisionId = id division 'intercompany' company itu) atau dihapus
 * (divisionId = null). Unique index (company_id, customer_name) di
 * intercompany_customer_names menjamin tidak ada alias lain yang masih cocok nama
 * yang sama, jadi aman langsung di-clear tanpa cek alias lain saat hapus.
 */
export async function syncCustomerDivisionOverride(companyId: number, customerName: string, divisionId: number | null) {
  await db
    .update(customers)
    .set({ division_override_id: divisionId, updated_at: new Date() })
    .where(and(eq(customers.company_id, companyId), sql`UPPER(${customers.customer_name}) = ${customerName}`))
}

export interface AmbiguousChannelRow {
  company_id: number
  channel_name: string
  override_customers: number
  regular_customers: number
}

/**
 * Deteksi channel_name yang dipakai CAMPURAN — sebagian invoice-nya dari customer
 * yang punya division_override_id (representasi sister company/klasifikasi manual
 * lain), sebagian dari customer biasa (ikut mapping channel apa adanya). Ini pola
 * persis yang bikin filter exclude-intercompany bocor (task013 — channel "SALES
 * SUPPORT" dipakai 348 customer biasa + KODE NIAGA TAMA). Peringatan proaktif
 * supaya admin bisa cek/tambah alias SEBELUM ada laporan salah baca lagi, bukan
 * nunggu ketahuan manual seperti kasus ini.
 */
export async function findAmbiguousChannels(scopeIds?: number[]): Promise<AmbiguousChannelRow[]> {
  if (scopeIds && scopeIds.length === 0) return []
  const companyCond = scopeIds ? sql`AND i.company_id IN ${sql.raw(`(${scopeIds.join(',')})`)}` : sql``
  const rows = await db.execute<{
    company_id: number
    channel_name: string
    override_customers: string
    regular_customers: string
  }>(sql`
    SELECT
      i.company_id,
      i.channel_name,
      COUNT(DISTINCT CASE WHEN c.division_override_id IS NOT NULL THEN c.id END)::int AS override_customers,
      COUNT(DISTINCT CASE WHEN c.division_override_id IS NULL THEN c.id END)::int AS regular_customers
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.deleted_at IS NULL AND i.channel_name IS NOT NULL
    ${companyCond}
    GROUP BY i.company_id, i.channel_name
    HAVING COUNT(DISTINCT CASE WHEN c.division_override_id IS NOT NULL THEN c.id END) > 0
       AND COUNT(DISTINCT CASE WHEN c.division_override_id IS NULL THEN c.id END) > 0
    ORDER BY i.company_id, i.channel_name
  `)
  return (rows as unknown as AmbiguousChannelRow[]).map((r) => ({
    company_id: Number(r.company_id),
    channel_name: r.channel_name,
    override_customers: Number(r.override_customers),
    regular_customers: Number(r.regular_customers),
  }))
}
