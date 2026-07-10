import { db } from '@/config/db'
import { division_channels, companies, branch_divisions } from '@/db/schema'
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import type { CreateDivisionChannelDto, UpdateDivisionChannelDto, ListDivisionChannelsQuery } from './division-channels.schema'

export async function findDivisionChannels(params: ListDivisionChannelsQuery) {
  const { division_id, company_id, search } = params
  const conditions = []

  if (division_id) conditions.push(eq(division_channels.division_id, division_id))

  if (company_id !== 'all') {
    // company_id wajib diisi (tidak ada global rule lagi)
    conditions.push(eq(division_channels.company_id, company_id))
  }

  if (search) {
    conditions.push(ilike(division_channels.channel_name, `%${search}%`))
  }

  return db
    .select({
      id: division_channels.id,
      channel_name: division_channels.channel_name,
      division_id: division_channels.division_id,
      division_code: branch_divisions.code,
      company_id: division_channels.company_id,
      company_name: companies.name,
      created_at: division_channels.created_at,
      updated_at: division_channels.updated_at,
    })
    .from(division_channels)
    .leftJoin(companies, eq(division_channels.company_id, companies.id))
    .leftJoin(branch_divisions, eq(division_channels.division_id, branch_divisions.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(division_channels.channel_name)
}

export async function findDivisionChannelById(id: number) {
  const [row] = await db
    .select()
    .from(division_channels)
    .where(eq(division_channels.id, id))
  return row ?? null
}

export async function findDivisionChannelByName(channel_name: string, excludeId?: number) {
  const rows = await db
    .select({ id: division_channels.id })
    .from(division_channels)
    .where(eq(division_channels.channel_name, channel_name))
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows
}

export async function findDivisionChannelByNameAndCompany(channel_name: string, companyId: number) {
  const [row] = await db
    .select({ id: division_channels.id })
    .from(division_channels)
    .where(and(
      eq(division_channels.channel_name, channel_name),
      eq(division_channels.company_id, companyId),
    ))
  return row ?? null
}

export async function createDivisionChannel(data: CreateDivisionChannelDto) {
  const [result] = await db
    .insert(division_channels)
    .values({
      channel_name: data.channel_name,
      division_id: data.division_id,
      company_id: data.company_id,
    })
    .returning()
  return result
}

export async function updateDivisionChannel(id: number, data: UpdateDivisionChannelDto) {
  const [result] = await db
    .update(division_channels)
    .set({ ...data, updated_at: new Date() })
    .where(eq(division_channels.id, id))
    .returning()
  return result
}

export async function deleteDivisionChannel(id: number) {
  await db.delete(division_channels).where(eq(division_channels.id, id))
}

/**
 * Channel name riil dari invoices yang belum punya mapping.
 */
export async function findUnmappedChannelNames(cid: number): Promise<string[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT i.channel_name
    FROM invoices i
    WHERE i.deleted_at IS NULL
      AND i.channel_name IS NOT NULL
      AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      AND NOT EXISTS (
        SELECT 1 FROM division_channels dc
        WHERE dc.channel_name = i.channel_name
          AND dc.company_id = i.company_id
      )
    ORDER BY i.channel_name
  `)
  return (rows as unknown[]).map((r) => (r as { channel_name: string }).channel_name)
}

/**
 * Derive branch_id dari histori invoice riil untuk 1 channel_name.
 */
export async function findConsistentBranchIdForChannel(channelName: string, companyId: number): Promise<number | null> {
  const rows = await db.execute(sql`
    SELECT DISTINCT i.branch_id
    FROM invoices i
    WHERE i.deleted_at IS NULL
      AND i.channel_name = ${channelName}
      AND i.company_id = ${companyId}
      AND i.branch_id IS NOT NULL
  `)
  const branchIds = (rows as unknown[]).map((r) => (r as { branch_id: number }).branch_id)
  return branchIds.length === 1 ? branchIds[0] : null
}