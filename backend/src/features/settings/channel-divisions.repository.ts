import { db } from '@/config/db'
import { channel_divisions, companies } from '@/db/schema'
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import type { CreateChannelDivisionDto, UpdateChannelDivisionDto, ListChannelDivisionsQuery } from './channel-divisions.schema'

export async function findChannelDivisions(params: ListChannelDivisionsQuery) {
  const { division, company_id, search } = params

  const conditions = []

  if (division) conditions.push(eq(channel_divisions.division, division))

  if (company_id !== 'all') {
    // tampilkan: rule milik company ini + rule global
    conditions.push(
      or(
        eq(channel_divisions.company_id, company_id),
        isNull(channel_divisions.company_id),
      )!,
    )
  }

  if (search) {
    conditions.push(ilike(channel_divisions.channel_name, `%${search}%`))
  }

  return db
    .select({
      id: channel_divisions.id,
      channel_name: channel_divisions.channel_name,
      division: channel_divisions.division,
      company_id: channel_divisions.company_id,
      company_name: companies.name,
      created_at: channel_divisions.created_at,
      updated_at: channel_divisions.updated_at,
    })
    .from(channel_divisions)
    .leftJoin(companies, eq(channel_divisions.company_id, companies.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(channel_divisions.channel_name)
}

/**
 * Nilai divisi unik yang benar-benar punya mapping untuk company ini (rule
 * company + rule global) — dipakai dropdown filter divisi (useDivisionOptions)
 * yang tersebar di banyak halaman. Sengaja TIDAK ikut channel_name di sini
 * (beda dari findChannelDivisions) supaya endpoint ini bisa dibuka tanpa
 * requirePermission('settings.channel.division:view') — nama channel penjualan
 * asli tetap hanya kelihatan lewat endpoint mapping penuh yang tetap terproteksi.
 */
export async function findDistinctDivisions(companyId: number | 'all'): Promise<string[]> {
  const conditions = []
  if (companyId !== 'all') {
    conditions.push(or(eq(channel_divisions.company_id, companyId), isNull(channel_divisions.company_id))!)
  }

  const rows = await db
    .selectDistinct({ division: channel_divisions.division })
    .from(channel_divisions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(channel_divisions.division)

  return rows.map((r) => r.division)
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
      division: data.division,
      company_id: data.company_id ?? null,
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
          AND (cd.company_id IS NULL OR cd.company_id = i.company_id)
      )
    ORDER BY i.channel_name
  `)
  return (rows as unknown[]).map((r) => (r as { channel_name: string }).channel_name)
}
