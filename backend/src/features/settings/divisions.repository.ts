import { db } from '@/config/db'
import { divisions, channel_divisions, userDivisions, company_branches } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import type { UpdateDivisionDto } from './divisions.schema'

export async function findDivisions(companyId: number | 'all') {
  const conditions = []
  if (companyId !== 'all') conditions.push(eq(divisions.company_id, companyId))

  return db
    .select()
    .from(divisions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(divisions.label)
}

/**
 * Division aktif saja, field minimal — dipakai dropdown filter (semua halaman
 * report) dan AssignmentTreePicker. TIDAK di-requirePermission di level route
 * (lihat divisions.route.ts) - siapa pun yang sudah login boleh baca daftar ini
 * buat keperluan filter, beda dari GET / (CRUD admin, permission settings.division:view).
 */
export async function findActiveDivisions(companyId: number | 'all') {
  const conditions = [eq(divisions.is_active, true)]
  if (companyId !== 'all') conditions.push(eq(divisions.company_id, companyId))

  return db
    .select({
      id: divisions.id,
      company_id: divisions.company_id,
      branch_id: divisions.branch_id,
      key: divisions.key,
      label: divisions.label,
      dormant_category: divisions.dormant_category,
    })
    .from(divisions)
    .where(and(...conditions))
    .orderBy(divisions.label)
}

export async function findDivisionById(id: number) {
  const [row] = await db.select().from(divisions).where(eq(divisions.id, id))
  return row ?? null
}

export async function findDivisionByKey(companyId: number, branchId: number | null, key: string, excludeId?: number) {
  const conditions = [eq(divisions.company_id, companyId), eq(divisions.key, key)]
  conditions.push(branchId == null ? isNull(divisions.branch_id) : eq(divisions.branch_id, branchId))
  const rows = await db.select({ id: divisions.id }).from(divisions).where(and(...conditions))
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows
}

export async function createDivision(data: {
  company_id: number
  branch_id: number | null
  key: string
  label: string
  dormant_category: string
  is_protected?: boolean
}) {
  const [result] = await db.insert(divisions).values(data).returning()
  return result
}

export async function updateDivision(id: number, data: UpdateDivisionDto) {
  const [result] = await db
    .update(divisions)
    .set({ ...data, updated_at: new Date() })
    .where(eq(divisions.id, id))
    .returning()
  return result
}

export async function deleteDivision(id: number) {
  await db.delete(divisions).where(eq(divisions.id, id))
}

/**
 * Cek apakah division (id) masih dipakai di channel_divisions atau user_divisions
 * (FK sungguhan sekarang, task012 v2) — dipakai proteksi delete.
 */
export async function isDivisionInUse(divisionId: number): Promise<boolean> {
  const [channelRow] = await db
    .select({ id: channel_divisions.id })
    .from(channel_divisions)
    .where(eq(channel_divisions.division_id, divisionId))
    .limit(1)
  if (channelRow) return true

  const [userDivisionRow] = await db
    .select({ user_id: userDivisions.user_id })
    .from(userDivisions)
    .where(eq(userDivisions.division_id, divisionId))
    .limit(1)
  return !!userDivisionRow
}

const DEFAULT_DIVISIONS = [
  { key: 'distribution', label: 'Distribution', dormant_category: 'b2b_dc' },
  { key: 'project', label: 'Project', dormant_category: 'b2b_project' },
  { key: 'e_commerce', label: 'E-Commerce', dormant_category: 'b2c' },
  { key: 'intercompany', label: 'Intercompany', dormant_category: 'b2b_project' },
  { key: 'freelancer', label: 'Freelancer', dormant_category: 'b2c' },
  { key: 'support', label: 'Support', dormant_category: 'b2b_dc' },
  { key: 'other', label: 'Lainnya', dormant_category: 'b2b_dc', is_protected: true },
] as const

/**
 * Seed 7 division default (company-wide, branch_id NULL) untuk 1 company —
 * idempotent (onConflictDoNothing). Dipanggil dari hook createCompany (company
 * baru) dan script backfill (company existing) - satu sumber kebenaran.
 */
export async function seedDefaultDivisions(companyId: number) {
  for (const d of DEFAULT_DIVISIONS) {
    await db
      .insert(divisions)
      .values({
        company_id: companyId,
        branch_id: null,
        key: d.key,
        label: d.label,
        dormant_category: d.dormant_category,
        is_protected: 'is_protected' in d ? d.is_protected : false,
      })
      .onConflictDoNothing()
  }
}

/**
 * Referensi company_branches — dipakai service layer validasi branch_id (harus
 * milik company yang sama dengan division-nya).
 */
export async function findBranchById(branchId: number) {
  const [row] = await db.select({ id: company_branches.id, company_id: company_branches.company_id }).from(company_branches).where(eq(company_branches.id, branchId))
  return row ?? null
}
