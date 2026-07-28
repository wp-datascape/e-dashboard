/**
 * scripts/seed-item-types-existing-companies.ts
 *
 * Task011 — item_types sekarang per-company (§2b task011.md). Company BARU
 * otomatis dapat 4 default lewat hook di companies.service.ts (createCompany),
 * tapi company yang SUDAH ADA sebelum fix ini butuh backfill manual sekali
 * jalan — script ini yang melakukan itu.
 *
 * Idempotent (seedDefaultItemTypes pakai onConflictDoNothing) - aman dijalankan
 * berkali-kali, tidak bikin duplikat kalau sebagian company sudah ke-seed.
 *
 * Usage:
 *   bun run backend/scripts/seed-item-types-existing-companies.ts
 */

import { db } from '@/config/db'
import { companies } from '@/db/schema'
import { seedDefaultItemTypes, findItemTypes } from '@/features/settings/item-types.repository'

async function main() {
  console.log('=== SEED item_types default untuk company existing ===')

  const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies)
  console.log(`Total company: ${allCompanies.length}`)

  for (const c of allCompanies) {
    const before = await findItemTypes(c.id)
    await seedDefaultItemTypes(c.id)
    const after = await findItemTypes(c.id)
    console.log(`  ${c.name} (id ${c.id}): ${before.length} -> ${after.length} item type`)
  }

  console.log('\nSelesai.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
