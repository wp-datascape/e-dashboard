import { db } from '@/config/db'
import { channel_divisions, companies } from '@/db/schema'
import { and, eq, ilike, isNull, or } from 'drizzle-orm'
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
