import { db } from '@/config/db'
import { channel_divisions, companies, divisions } from '@/db/schema'
import { and, eq, ilike, sql } from 'drizzle-orm'
import type { CreateChannelDivisionDto, UpdateChannelDivisionDto, ListChannelDivisionsQuery } from './channel-divisions.schema'

export async function findChannelDivisions(params: ListChannelDivisionsQuery) {
  const { division, company_id, search } = params

  const conditions = []

  if (division) conditions.push(eq(channel_divisions.division_id, division))

  // company_id sekarang WAJIB di channel_divisions (task012 v2 — tidak ada rule
  // global lagi, division company-scoped)
  if (company_id !== 'all') {
    conditions.push(eq(channel_divisions.company_id, company_id))
  }

  if (search) {
    conditions.push(ilike(channel_divisions.channel_name, `%${search}%`))
  }

  return db
    .select({
      id: channel_divisions.id,
      channel_name: channel_divisions.channel_name,
      division: divisions.label,
      division_id: channel_divisions.division_id,
      company_id: channel_divisions.company_id,
      company_name: companies.name,
      created_at: channel_divisions.created_at,
      updated_at: channel_divisions.updated_at,
    })
    .from(channel_divisions)
    .leftJoin(companies, eq(channel_divisions.company_id, companies.id))
    .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(channel_divisions.channel_name)
}

/**
 * division_id unik yang benar-benar punya mapping untuk company ini — dipakai
 * dropdown filter divisi (useDivisionOptions) yang tersebar di banyak halaman.
 * Sengaja TIDAK ikut channel_name di sini (beda dari findChannelDivisions)
 * supaya endpoint ini bisa dibuka tanpa requirePermission('settings.channel.division:view')
 * — nama channel penjualan asli tetap hanya kelihatan lewat endpoint mapping penuh
 * yang tetap terproteksi.
 */
export async function findDistinctDivisions(companyId: number | 'all'): Promise<number[]> {
  const conditions = []
  if (companyId !== 'all') {
    conditions.push(eq(channel_divisions.company_id, companyId))
  }

  const rows = await db
    .selectDistinct({ division_id: channel_divisions.division_id })
    .from(channel_divisions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(channel_divisions.division_id)

  return rows.map((r) => r.division_id)
}

export async function findChannelDivisionById(id: number) {
  const [row] = await db
    .select()
    .from(channel_divisions)
    .where(eq(channel_divisions.id, id))
  return row ?? null
}

export async function findChannelDivisionByName(channel_name: string, excludeId?: number) {
  const rows = await db
    .select({ id: channel_divisions.id })
    .from(channel_divisions)
    .where(eq(channel_divisions.channel_name, channel_name))

  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows
}

export async function findChannelDivisionByNameAndCompany(channel_name: string, companyId: number) {
  const [row] = await db
    .select({ id: channel_divisions.id })
    .from(channel_divisions)
    .where(and(
      eq(channel_divisions.channel_name, channel_name),
      eq(channel_divisions.company_id, companyId),
    ))
  return row ?? null
}

export async function createChannelDivision(data: CreateChannelDivisionDto) {
  const [result] = await db
    .insert(channel_divisions)
    .values({
      channel_name: data.channel_name,
      division_id: data.division_id,
      company_id: data.company_id,
    })
    .returning()
  return result
}

export async function updateChannelDivision(id: number, data: UpdateChannelDivisionDto) {
  const [result] = await db
    .update(channel_divisions)
    .set({ ...data, updated_at: new Date() })
    .where(eq(channel_divisions.id, id))
    .returning()
  return result
}

export async function deleteChannelDivision(id: number) {
  await db.delete(channel_divisions).where(eq(channel_divisions.id, id))
}

/**
 * Channel name riil dari invoices (hasil import) yang belum punya mapping
 * di channel_divisions — dipakai untuk opsi dropdown "Add Channel Mapping"
 * agar admin pilih dari data nyata, bukan ketik manual.
 */
export async function findUnmappedChannelNames(cid: number): Promise<string[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT i.channel_name
    FROM invoices i
    WHERE i.deleted_at IS NULL
      AND i.channel_name IS NOT NULL
      AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      AND NOT EXISTS (
        SELECT 1 FROM channel_divisions cd
        WHERE cd.channel_name = i.channel_name
          AND cd.company_id = i.company_id
      )
    ORDER BY i.channel_name
  `)
  return (rows as unknown[]).map((r) => (r as { channel_name: string }).channel_name)
}
