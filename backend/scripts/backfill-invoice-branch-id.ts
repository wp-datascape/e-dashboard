/**
 * scripts/backfill-invoice-branch-id.ts
 *
 * Task A4/A5 (docs-v2/task/task001.md §3.3) — backfill invoices.branch_id dari
 * invoices.branch_name (teks bebas hasil copy Accurate, belum tentu match persis
 * ke company_branches.name).
 *
 * Match dilakukan case-insensitive (UPPER()) DAN tetap di-scope per company_id —
 * branch cuma valid dalam company yang sama, tidak boleh match lintas company.
 *
 * Invoice dengan branch_name NULL (tidak ada info branch sama sekali dari Accurate)
 * di-assign ke branch "Lainnya" milik company itu (kalau ada) — BUKAN dibiarkan NULL.
 * Ini keputusan konkret (2026-07-06): "Lainnya" adalah row company_branches asli yang
 * bisa di-assign seperti branch lain, bukan kategori virtual/NULL — lihat §4.6 (revisi).
 * Invoice dengan branch_name TERISI tapi tidak match branch manapun (typo/data kotor)
 * tetap dibiarkan NULL — itu sinyal data quality yang perlu diaudit manual (Task E2),
 * beda dari "memang tidak ada info branch".
 *
 * Default: DRY RUN, cuma laporan % match/tidak match per company (Task A5/E1).
 * Pakai --apply untuk benar-benar menjalankan UPDATE.
 *
 * Usage:
 *   bun run backend/scripts/backfill-invoice-branch-id.ts            # audit saja
 *   bun run backend/scripts/backfill-invoice-branch-id.ts --apply    # backfill beneran
 */

import postgres from 'postgres'

const APPLY = process.argv.includes('--apply')

async function main() {
  const sql = postgres(process.env.DATABASE_URL!)

  console.log(APPLY ? '=== BACKFILL invoices.branch_id (APPLY) ===' : '=== AUDIT invoices.branch_id (DRY RUN) ===')

  const report = await sql`
    SELECT
      c.name AS company_name,
      i.company_id,
      COUNT(*) AS total_rows,
      COUNT(cb.id) AS matched_rows,
      COUNT(*) - COUNT(cb.id) AS unmatched_rows,
      ROUND(COUNT(cb.id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS matched_pct
    FROM invoices i
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN company_branches cb
      ON cb.company_id = i.company_id
      AND UPPER(TRIM(cb.name)) = UPPER(TRIM(i.branch_name))
    GROUP BY c.name, i.company_id
    ORDER BY i.company_id
  `
  console.table(report)

  const unmatchedSamples = await sql`
    SELECT i.company_id, i.branch_name, COUNT(*) AS count
    FROM invoices i
    LEFT JOIN company_branches cb
      ON cb.company_id = i.company_id
      AND UPPER(TRIM(cb.name)) = UPPER(TRIM(i.branch_name))
    WHERE cb.id IS NULL AND i.branch_name IS NOT NULL
    GROUP BY i.company_id, i.branch_name
    ORDER BY i.company_id, count DESC
  `
  if (unmatchedSamples.length > 0) {
    console.log('\nBaris branch_name yang tidak match ke company_branches manapun (bukan NULL, tapi memang tidak ketemu):')
    console.table(unmatchedSamples)
  }

  if (APPLY) {
    const matched = await sql`
      UPDATE invoices i
      SET branch_id = cb.id
      FROM company_branches cb
      WHERE cb.company_id = i.company_id
        AND UPPER(TRIM(cb.name)) = UPPER(TRIM(i.branch_name))
        AND i.branch_id IS NULL
    `
    const nullToOther = await sql`
      UPDATE invoices i
      SET branch_id = cb.id
      FROM company_branches cb
      WHERE cb.company_id = i.company_id
        AND cb.name = 'Lainnya'
        AND i.branch_name IS NULL
        AND i.branch_id IS NULL
    `
    console.log(`\nBackfill selesai — ${matched.count} baris match nama branch, ${nullToOther.count} baris tanpa branch_name di-assign ke "Lainnya".`)
  } else {
    console.log('\nDry run selesai — tidak ada perubahan data. Jalankan ulang dengan --apply untuk benar-benar backfill.')
  }

  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
