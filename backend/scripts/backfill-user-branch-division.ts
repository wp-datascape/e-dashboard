/**
 * scripts/backfill-user-branch-division.ts
 *
 * Task F1 (docs-v2/task/task001.md) — assign SEMUA branch + SEMUA division ke
 * user existing, berdasarkan company yang SUDAH mereka punya di user_companies.
 * Wajib dijalankan SEBELUM feature flag `branch_division_enforcement_enabled`
 * dinyalakan (Task F2/F3) — supaya tidak ada user yang mendadak kehilangan akses
 * begitu enforcement aktif (default-deny: user tanpa row user_branches/user_divisions
 * = tidak lihat apa pun, meski masih punya row user_companies).
 *
 * Termasuk role `admin` — admin TIDAK bypass di desain ini (lihat §2), jadi tetap
 * butuh row eksplisit sama seperti user lain.
 *
 * Idempotent — aman dijalankan berkali-kali (skip pasangan yang sudah ada).
 *
 * Default: DRY RUN, cuma laporan berapa user/row yang akan kena.
 * Pakai --apply untuk benar-benar insert.
 *
 * Usage:
 *   bun run backend/scripts/backfill-user-branch-division.ts            # audit saja
 *   bun run backend/scripts/backfill-user-branch-division.ts --apply    # backfill beneran
 */

import postgres from 'postgres'

const APPLY = process.argv.includes('--apply')

async function main() {
  const sql = postgres(process.env.DATABASE_URL!)

  console.log(APPLY ? '=== BACKFILL user_branches/user_divisions (APPLY) ===' : '=== AUDIT user_branches/user_divisions (DRY RUN) ===')

  // Company yang dipunyai user (user_companies) tapi belum punya SATU PUN row
  // user_branches untuk company itu — inilah yang akan kena default-deny total
  // begitu enforcement aktif, kalau tidak dibackfill dulu.
  const affected = await sql`
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      uc.company_id,
      c.name AS company_name,
      (SELECT COUNT(*) FROM company_branches cb WHERE cb.company_id = uc.company_id) AS branch_count
    FROM user_companies uc
    JOIN users u ON u.id = uc.user_id AND u.deleted_at IS NULL
    JOIN companies c ON c.id = uc.company_id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = uc.user_id AND ub.company_id = uc.company_id
    )
    ORDER BY u.id, uc.company_id
  `
  console.table(affected)

  if (affected.length === 0) {
    console.log('\nTidak ada user yang perlu di-backfill — semua company assignment sudah punya branch/division.')
    await sql.end()
    return
  }

  if (!APPLY) {
    console.log(`\n${affected.length} pasangan (user, company) akan di-backfill full-access. Jalankan ulang dengan --apply untuk eksekusi.`)
    await sql.end()
    return
  }

  let branchRowsInserted = 0
  let divisionRowsInserted = 0

  for (const row of affected) {
    const branches = await sql`SELECT id FROM company_branches WHERE company_id = ${row.company_id}`

    for (const branch of branches) {
      const insertedBranch = await sql`
        INSERT INTO user_branches (user_id, company_id, branch_id)
        VALUES (${row.user_id}, ${row.company_id}, ${branch.id})
        ON CONFLICT DO NOTHING
        RETURNING user_id
      `
      branchRowsInserted += insertedBranch.count

      // Kode divisi aktif untuk (company, branch) diambil dinamis dari katalog
      // `divisions` (company-wide + branch-specific), bukan array hardcode lagi
      // — lihat docs-v2/task/task004.md.
      const activeDivisions = await sql`
        SELECT DISTINCT code FROM divisions
        WHERE is_active = true
          AND company_id = ${row.company_id}
          AND (branch_id = ${branch.id} OR branch_id IS NULL)
      `

      for (const { code: division } of activeDivisions) {
        const insertedDivision = await sql`
          INSERT INTO user_divisions (user_id, branch_id, division)
          VALUES (${row.user_id}, ${branch.id}, ${division})
          ON CONFLICT DO NOTHING
          RETURNING user_id
        `
        divisionRowsInserted += insertedDivision.count
      }
    }
  }

  console.log(`\nBackfill selesai — ${branchRowsInserted} row user_branches, ${divisionRowsInserted} row user_divisions ditambahkan untuk ${affected.length} pasangan (user, company).`)

  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
