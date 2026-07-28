/**
 * scripts/push-card-item-type.ts
 *
 * One-off: push Item Type "Card" + aturan klasifikasi keyword CARD->card ke
 * database manapun yang di-target lewat DATABASE_URL. Dibuat karena data ini
 * awalnya cuma ditambahkan manual lewat UI ke database lokal saat testing
 * task011 (2026-07-29) - tidak ikut ter-deploy otomatis karena ini DATA,
 * bukan code. Script ini nyalin persis: item_types (company_id=1, key='card',
 * label='Card') + item_classification_rules (company_id=1,
 * keyword_item_name, pattern CARD, item_type card, priority 70).
 *
 * Idempotent - aman dijalankan berkali-kali (skip kalau sudah ada).
 *
 * Usage:
 *   DATABASE_URL="..." bash -c "cd backend && bun run scripts/push-card-item-type.ts"
 */

import { db } from '@/config/db'
import { item_types, item_classification_rules } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

const COMPANY_ID = 1

async function main() {
  console.log('=== PUSH Item Type "Card" + rule CARD ===')

  const existingType = await db
    .select({ id: item_types.id })
    .from(item_types)
    .where(and(eq(item_types.company_id, COMPANY_ID), eq(item_types.key, 'card')))
    .limit(1)

  if (existingType.length > 0) {
    console.log('Item Type "card" sudah ada untuk company_id=1, skip insert.')
  } else {
    await db.insert(item_types).values({ company_id: COMPANY_ID, key: 'card', label: 'Card' })
    console.log('OK - Item Type "Card" ditambahkan untuk company_id=1.')
  }

  const existingRule = await db
    .select({ id: item_classification_rules.id })
    .from(item_classification_rules)
    .where(and(
      eq(item_classification_rules.company_id, COMPANY_ID),
      eq(item_classification_rules.match_type, 'keyword_item_name'),
      eq(item_classification_rules.match_pattern, 'CARD'),
    ))
    .limit(1)

  if (existingRule.length > 0) {
    console.log('Rule keyword_item_name "CARD" sudah ada untuk company_id=1, skip insert.')
  } else {
    await db.insert(item_classification_rules).values({
      company_id: COMPANY_ID,
      match_type: 'keyword_item_name',
      match_pattern: 'CARD',
      item_type: 'card',
      priority: 70,
      is_active: true,
    })
    console.log('OK - Rule keyword_item_name CARD -> card ditambahkan untuk company_id=1.')
  }

  console.log('\nSelesai. Lanjut jalankan reclassify-product-categories.ts --apply.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
