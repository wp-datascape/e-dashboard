import { db } from '@/config/db'
import { divisions, channel_divisions, userDivisions, company_branches } from '@/db/schema'
import { and, eq, isNull, inArray } from 'drizzle-orm'
import type { UpdateDivisionDto } from './divisions.schema'

// scopeIds undefined → superadmin + 'all' → tidak ada filter company (lihat semua)
// scopeIds array     → company spesifik ATAU 'all' non-superadmin → filter ke company itu
export async function findDivisions(scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const condition = scopeIds ? inArray(divisions.company_id, scopeIds) : undefined
  return db
    .select()
    .from(divisions)
    .where(condition)
    .orderBy(divisions.label)
}

/**
 * Division aktif saja, field minimal — dipakai dropdown filter (semua halaman
 * report) dan AssignmentTreePicker. TIDAK di-requirePermission di level route
 * (lihat divisions.route.ts) - siapa pun yang sudah login boleh baca daftar ini
 * buat keperluan filter, beda dari GET / (CRUD admin, permission settings.division:view).
 */
// scopeIds opsional (hasil resolveCompanyScope di handler) -- celah RBAC ditemukan
// lewat audit lanjutan 2026-08-06, sama pola dgn findUnmappedChannelNames di
// channel-divisions.repository.ts: sebelumnya companyId='all' scan SEMUA company
// tanpa scopeIds sama sekali. 2 caller internal (channel-divisions.service.ts,
// isValidDivision) SENGAJA tidak kirim scopeIds -- companyId di situ sudah
// spesifik & tervalidasi dari body request yang lolos resolveCompanyScope di
// handler-nya masing-masing, bukan dari user-facing list endpoint.
export async function findActiveDivisions(companyId: number | 'all', scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const conditions = [eq(divisions.is_active, true)]
  if (companyId !== 'all') conditions.push(eq(divisions.company_id, companyId))
  else if (scopeIds) conditions.push(inArray(divisions.company_id, scopeIds))

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

/**
 * Struktur 7-divisi ini adalah kebutuhan bisnis SPESIFIK PT Mesin Kasir Online
 * (MKO) — BUKAN template generik untuk company mana pun (koreksi 2026-08-27,
 * lihat docs-v2/task/task029.md). Sempat dipakai sbg default utk SEMUA company
 * baru (termasuk KNT/SKI yang strukturnya beda total), hasilnya divisi sampah
 * tak terpakai nempel di company lain tiap kali seeder di-re-run. Sekarang
 * HANYA dipakai eksplisit oleh seed.ts untuk MKO (mirror pola `defaultBranches`
 * — literal per-company, bukan template lintas-company). Company BARU (lewat
 * UI atau seeder) pakai MINIMAL_DEFAULT_DIVISION di bawah, bukan ini.
 */
export const MKO_DIVISIONS_TEMPLATE = [
  { key: 'distribution', label: 'Distribution', dormant_category: 'b2b_dc' },
  { key: 'project', label: 'Project', dormant_category: 'b2b_project' },
  { key: 'e_commerce', label: 'E-Commerce', dormant_category: 'b2c' },
  { key: 'intercompany', label: 'Intercompany', dormant_category: 'b2b_project' },
  { key: 'freelancer', label: 'Freelancer', dormant_category: 'b2c' },
  { key: 'support', label: 'Support', dormant_category: 'b2b_dc' },
  { key: 'other', label: 'Lainnya', dormant_category: 'b2b_dc', is_protected: true },
] as const

/** Satu-satunya division yang genuinely universal untuk company APA PUN —
 * fallback "Lainnya"/"other" dipakai COALESCE di seluruh scope/metrics query
 * (utils/scope.ts), jadi tetap WAJIB ada di setiap company, is_protected supaya
 * tidak bisa dihapus manual dari UI. */
const MINIMAL_DEFAULT_DIVISION = { key: 'other', label: 'Lainnya', dormant_category: 'b2b_dc', is_protected: true } as const

/**
 * Seed division minimal (cuma "Lainnya", company-wide branch_id NULL) untuk 1
 * company — idempotent (onConflictDoNothing). Dipanggil dari hook createCompany
 * (company baru lewat UI) dan seed.ts (company existing yang belum punya divisi
 * sama sekali). Struktur divisi SELEBIHNYA (channel/kategori bisnis riil) dibuat
 * manual lewat halaman Settings > Division Management sesuai kebutuhan masing-
 * masing company — bukan ditebak dari template generik (lihat komentar
 * MKO_DIVISIONS_TEMPLATE di atas soal kenapa ini berubah).
 */
export async function seedDefaultDivisions(companyId: number) {
  const list: readonly { key: string; label: string; dormant_category: string; is_protected?: boolean }[] = [MINIMAL_DEFAULT_DIVISION]
  for (const d of list) {
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
