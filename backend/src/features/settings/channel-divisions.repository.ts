import { db } from '@/config/db'
import { channel_divisions, companies, divisions } from '@/db/schema'
import { and, eq, ilike, inArray, sql } from 'drizzle-orm'
import { buildCompanyConditionRaw } from '@/utils/scope'
import type { CreateChannelDivisionDto, UpdateChannelDivisionDto } from './channel-divisions.schema'

export interface FindChannelDivisionsParams {
  division?: number
  scopeIds?: number[]
  search?: string
}

// task015 §2b — company_id dulu diterima mentah dari query (filter cuma jalan
// kalau BUKAN 'all'), TIDAK PERNAH di-scope ke akses company user — admin non-
// superadmin selalu lihat mapping SEMUA company. Sekarang scopeIds (hasil
// resolveCompanyScope di handler) jadi SATU-SATUNYA filter company.
export async function findChannelDivisions(params: FindChannelDivisionsParams) {
  const { division, scopeIds, search } = params
  if (scopeIds && scopeIds.length === 0) return []

  const conditions = []

  if (division) conditions.push(eq(channel_divisions.division_id, division))

  if (scopeIds) {
    conditions.push(inArray(channel_divisions.company_id, scopeIds))
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
// Sama pola dengan findChannelDivisions (task015 §2b) -- scopeIds (hasil
// resolveCompanyScope di handler) satu-satunya filter company, bukan companyId
// mentah dari query (celah RBAC ditemukan lewat audit lanjutan 2026-08-06,
// endpoint ini kelewat waktu fix task015 dulu).
export async function findDistinctDivisions(companyId: number | 'all', scopeIds?: number[]): Promise<number[]> {
  if (scopeIds && scopeIds.length === 0) return []

  const conditions = []
  if (companyId !== 'all') {
    conditions.push(eq(channel_divisions.company_id, companyId))
  }
  if (scopeIds) conditions.push(inArray(channel_divisions.company_id, scopeIds))

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
// Celah RBAC (audit lanjutan 2026-08-06): sebelumnya cid=0 ("Semua Perusahaan")
// scan SEMUA company TANPA cek scopeIds sama sekali -- handler juga sebelumnya
// tidak pernah panggil resolveCompanyScope(), jadi company_id=<company lain>
// eksplisit lewat query param pun tidak pernah divalidasi. Sekarang scopeIds
// (hasil resolveCompanyScope di handler) WAJIB dipakai kalau ada.
export async function findUnmappedChannelNames(cid: number, scopeIds?: number[]): Promise<string[]> {
  if (scopeIds && scopeIds.length === 0) return []
  const companyCond = buildCompanyConditionRaw('i.company_id', cid, scopeIds)
  const rows = await db.execute(sql`
    SELECT DISTINCT i.channel_name
    FROM invoices i
    WHERE i.deleted_at IS NULL
      AND i.channel_name IS NOT NULL
      AND ${companyCond}
      AND NOT EXISTS (
        SELECT 1 FROM channel_divisions cd
        WHERE cd.channel_name = i.channel_name
          AND cd.company_id = i.company_id
      )
    ORDER BY i.channel_name
  `)
  return (rows as unknown[]).map((r) => (r as { channel_name: string }).channel_name)
}
