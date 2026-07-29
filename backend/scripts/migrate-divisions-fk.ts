/**
 * scripts/migrate-divisions-fk.ts
 *
 * Task012 v2 — migrasi bertahap divisions jadi FK-based (docs-v2/task/task012.md §4).
 * Dijalankan SETELAH migration 0011 (tabel `divisions` + kolom `division_id` nullable
 * di `channel_divisions`/`user_divisions` sudah ada), SEBELUM migration final yang
 * drop kolom `division` (varchar) lama + set `division_id` NOT NULL.
 *
 * Langkah:
 * 1. Seed 7 division default per company (company-wide, branch_id NULL) — dormant_category
 *    persis sama BU_DORMANT_KEY_MAP lama, supaya tidak ada regresi dormant threshold.
 * 2. Backfill channel_divisions.division_id dari (company_id, division varchar) → divisions.id
 * 3. Backfill user_divisions.division_id dari (branch_id → company_branches.company_id, division varchar) → divisions.id
 *
 * Idempotent — aman dijalankan berkali-kali (skip kalau sudah ke-backfill).
 * Dry-run default, pakai --apply utk benar-benar tulis ke DB.
 *
 * Usage:
 *   bun run backend/scripts/migrate-divisions-fk.ts          # dry-run
 *   bun run backend/scripts/migrate-divisions-fk.ts --apply   # eksekusi
 */

/**
 * Pakai raw SQL (bukan Drizzle query builder) untuk baca/tulis kolom `division`
 * (varchar) di channel_divisions/user_divisions — kolom itu SUDAH DIHAPUS dari
 * schema.ts terkini (final state, post-migration 0012). Script ini tetap perlu
 * jalan di environment (mis. production) yang baru menerapkan migration 0011
 * (additive) tapi BELUM 0012 (drop kolom lama) — raw SQL supaya tidak terikat ke
 * shape schema.ts yang sudah maju ke state akhir.
 */
import { db } from '@/config/db'
import { companies, divisions } from '@/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'

const APPLY = process.argv.includes('--apply')

const DEFAULT_DIVISIONS = [
  { key: 'distribution', label: 'Distribution', dormant_category: 'b2b_dc' },
  { key: 'project', label: 'Project', dormant_category: 'b2b_project' },
  { key: 'e_commerce', label: 'E-Commerce', dormant_category: 'b2c' },
  { key: 'intercompany', label: 'Intercompany', dormant_category: 'b2b_project' },
  { key: 'freelancer', label: 'Freelancer', dormant_category: 'b2c' },
  { key: 'support', label: 'Support', dormant_category: 'b2b_dc' },
  { key: 'other', label: 'Lainnya', dormant_category: 'b2b_dc', is_protected: true },
] as const

async function seedDefaultDivisions() {
  console.log('=== 1. Seed 7 division default per company (company-wide) ===')
  const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies)

  for (const c of allCompanies) {
    for (const d of DEFAULT_DIVISIONS) {
      const [existing] = await db
        .select({ id: divisions.id })
        .from(divisions)
        .where(and(eq(divisions.company_id, c.id), isNull(divisions.branch_id), eq(divisions.key, d.key)))
      if (existing) continue

      console.log(`  ${APPLY ? 'INSERT' : '[dry-run] would insert'} ${c.name}: ${d.key}`)
      if (APPLY) {
        await db.insert(divisions).values({
          company_id: c.id,
          branch_id: null,
          key: d.key,
          label: d.label,
          dormant_category: d.dormant_category,
          is_protected: 'is_protected' in d ? d.is_protected : false,
        })
      }
    }
  }
}

async function backfillChannelDivisions() {
  console.log('\n=== 2. Backfill channel_divisions.division_id ===')
  const result = await db.execute(sql`SELECT id, company_id, division FROM channel_divisions`)
  const rows = result as unknown as { id: number; company_id: number | null; division: string }[]

  let missing = 0
  for (const row of rows) {
    if (row.company_id == null) {
      console.error(`  ERROR: channel_divisions id=${row.id} punya company_id NULL (rule global) — tidak bisa di-backfill, harus di-set company_id dulu secara manual`)
      missing++
      continue
    }
    const [div] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(and(eq(divisions.company_id, row.company_id), isNull(divisions.branch_id), eq(divisions.key, row.division)))
    if (!div) {
      console.error(`  ERROR: channel_divisions id=${row.id} — division "${row.division}" company_id=${row.company_id} tidak ketemu di tabel divisions`)
      missing++
      continue
    }
    console.log(`  ${APPLY ? 'UPDATE' : '[dry-run] would update'} channel_divisions id=${row.id} -> division_id=${div.id}`)
    if (APPLY) {
      await db.execute(sql`UPDATE channel_divisions SET division_id = ${div.id} WHERE id = ${row.id}`)
    }
  }
  console.log(`  Total: ${rows.length} rows, ${missing} gagal resolve`)
  return missing
}

async function backfillUserDivisions() {
  console.log('\n=== 3. Backfill user_divisions.division_id ===')
  const result = await db.execute(sql`
    SELECT ud.user_id, ud.branch_id, ud.division, cb.company_id
    FROM user_divisions ud
    INNER JOIN company_branches cb ON cb.id = ud.branch_id
  `)
  const rows = result as unknown as { user_id: number; branch_id: number; division: string; company_id: number }[]

  let missing = 0
  for (const row of rows) {
    const [div] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(and(eq(divisions.company_id, row.company_id), isNull(divisions.branch_id), eq(divisions.key, row.division)))
    if (!div) {
      console.error(`  ERROR: user_divisions user_id=${row.user_id} branch_id=${row.branch_id} — division "${row.division}" company_id=${row.company_id} tidak ketemu di tabel divisions`)
      missing++
      continue
    }
    console.log(`  ${APPLY ? 'UPDATE' : '[dry-run] would update'} user_divisions user_id=${row.user_id} branch_id=${row.branch_id} division="${row.division}" -> division_id=${div.id}`)
    if (APPLY) {
      await db.execute(
        sql`UPDATE user_divisions SET division_id = ${div.id} WHERE user_id = ${row.user_id} AND branch_id = ${row.branch_id} AND division = ${row.division}`,
      )
    }
  }
  console.log(`  Total: ${rows.length} rows, ${missing} gagal resolve`)
  return missing
}

async function main() {
  console.log(`=== Migrate divisions FK (task012 v2) — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} ===\n`)

  await seedDefaultDivisions()
  const missingChannel = await backfillChannelDivisions()
  const missingUser = await backfillUserDivisions()

  if (missingChannel > 0 || missingUser > 0) {
    console.error(`\nGAGAL: ${missingChannel + missingUser} baris tidak ke-resolve. Perbaiki manual sebelum lanjut ke migration final (drop kolom lama).`)
    process.exit(1)
  }

  console.log(APPLY
    ? '\nSelesai. Lanjut jalankan migration final (drop kolom division lama, set division_id NOT NULL).'
    : '\nDry-run selesai, tidak ada perubahan ditulis. Jalankan ulang dengan --apply.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
